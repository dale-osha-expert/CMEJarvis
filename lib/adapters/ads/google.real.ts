/**
 * GoogleAdsRealProvider — live Google Ads data via google-ads-api package.
 *
 * SAFETY (read-only application guarantee):
 *   Only customer.query() is used — raw GAQL SELECT statements.
 *   customer.mutateResources() is NEVER called. No campaign, ad group, ad, or budget is modified.
 *
 * Required env vars:
 *   GOOGLE_ADS_DEVELOPER_TOKEN  — from Google Ads API Center
 *   GOOGLE_ADS_CLIENT_ID        — OAuth 2.0 client ID
 *   GOOGLE_ADS_CLIENT_SECRET    — OAuth 2.0 client secret
 *   GOOGLE_ADS_REFRESH_TOKEN    — long-lived refresh token
 *   GOOGLE_ADS_CUSTOMER_ID      — 10-digit account ID (dashes OK, e.g. 737-524-1350)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID — (optional) MCC / manager account ID
 */
import type { AdCampaign, AdCreative, AdsProvider, AdsProviderSummary, DailyMetricsPoint } from "./types";
import { dateRange } from "../timeseries-utils";

function channelLabel(ct: unknown): string {
  const map: Record<string, string> = {
    SEARCH: "Search",
    DISPLAY: "Display",
    SHOPPING: "Shopping",
    VIDEO: "Video",
    PERFORMANCE_MAX: "PMax",
    MULTI_CHANNEL: "Discovery",
    LOCAL: "Local",
    SMART: "Smart",
  };
  return typeof ct === "string" ? (map[ct] ?? ct) : "Unknown";
}

function adTypeToFormat(t: unknown): string {
  const s = String(t ?? "").toUpperCase();
  if (s.includes("VIDEO")) return "video";
  if (s.includes("IMAGE")) return "image";
  if (s.includes("RESPONSIVE")) return "responsive";
  return "text";
}

function gaqlDateConst(days: number): string {
  if (days <= 1) return "YESTERDAY";
  if (days <= 7) return "LAST_7_DAYS";
  if (days <= 14) return "LAST_14_DAYS";
  return "LAST_30_DAYS";
}

function cleanCustomerId(id: string): string {
  return id.replace(/-/g, "");
}

export class GoogleAdsRealProvider implements AdsProvider {
  readonly providerName = "google" as const;
  private _currency: string | undefined;

  private getCustomer() {
    // require() inside method: google-ads-api is not imported at module scope so the
    // file can be imported even if the package is removed later.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleAdsApi } = require("google-ads-api") as {
      GoogleAdsApi: new (opts: object) => { Customer: (opts: object) => { query: (gaql: string) => Promise<unknown[]> } };
    };

    const api = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    const opts: Record<string, string> = {
      customer_id: cleanCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID!),
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    };
    const loginId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
    if (loginId) opts.login_customer_id = cleanCustomerId(loginId);

    return api.Customer(opts);
  }

  /** Fetch and cache the account's ISO 4217 currency code (e.g. "USD"). */
  private async getCurrencyCode(): Promise<string> {
    if (this._currency) return this._currency;
    const rows = await this.getCustomer().query(
      "SELECT customer.currency_code FROM customer LIMIT 1"
    );
    this._currency = String(
      (rows as Record<string, Record<string, unknown>>[])[0]?.customer?.currency_code ?? "USD"
    );
    return this._currency;
  }

  // READ-ONLY: raw GAQL helper — SELECT only, no mutate
  private async fetchCampaignRows(whereDate: string): Promise<AdCampaign[]> {
    const rows = await this.getCustomer().query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date ${whereDate}
        AND campaign.status IN (ENABLED, PAUSED)
      ORDER BY metrics.cost_micros DESC
      LIMIT 2000
    `);
    return (rows as Record<string, Record<string, unknown>>[]).map((row): AdCampaign => {
      const spend = (Number(row.metrics?.cost_micros) || 0) / 1e6;
      const revenue = Number(row.metrics?.conversions_value) || 0;
      const clicks = Number(row.metrics?.clicks) || 0;
      const impressions = Number(row.metrics?.impressions) || 0;
      const statusRaw = row.campaign?.status;
      const status: "active" | "paused" =
        statusRaw === "ENABLED" || statusRaw === 2 ? "active" : "paused";
      return {
        id: String(row.campaign?.id ?? ""),
        provider: "google",
        name: String(row.campaign?.name ?? "Unknown Campaign"),
        type: channelLabel(row.campaign?.advertising_channel_type),
        status,
        dailyBudget: (Number(row.campaign_budget?.amount_micros) || 0) / 1e6,
        spend,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        impressions,
        clicks,
        ctr: impressions > 0 ? clicks / impressions : 0,
        conversions: Number(row.metrics?.conversions) || 0,
      };
    });
  }

  private async fetchCreativeRows(whereDate: string): Promise<AdCreative[]> {
    const rows = await this.getCustomer().query(`
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.ad.type,
        campaign.id,
        campaign.name,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value
      FROM ad_group_ad
      WHERE segments.date ${whereDate}
        AND ad_group_ad.status = ENABLED
        AND campaign.status = ENABLED
      ORDER BY metrics.cost_micros DESC
      LIMIT 5000
    `);
    return (rows as Record<string, Record<string, unknown>>[])
      .filter((row) => (Number(row.metrics?.cost_micros) || 0) > 0)
      .map((row): AdCreative => {
        const spend = (Number(row.metrics?.cost_micros) || 0) / 1e6;
        const revenue = Number(row.metrics?.conversions_value) || 0;
        const clicks = Number(row.metrics?.clicks) || 0;
        const impressions = Number(row.metrics?.impressions) || 0;
        const adId = String((row.ad_group_ad as Record<string, Record<string, unknown>>)?.ad?.id ?? "");
        const adNameRaw = String((row.ad_group_ad as Record<string, Record<string, unknown>>)?.ad?.name ?? "").trim();
        return {
          id: adId,
          provider: "google",
          campaignId: String(row.campaign?.id ?? ""),
          campaignName: String(row.campaign?.name ?? "Unknown Campaign"),
          name: adNameRaw || `Ad ${adId}`,
          format: adTypeToFormat((row.ad_group_ad as Record<string, Record<string, unknown>>)?.ad?.type),
          spend,
          revenue,
          roas: spend > 0 ? revenue / spend : 0,
          impressions,
          clicks,
          ctr: impressions > 0 ? clicks / impressions : 0,
          conversions: Number(row.metrics?.conversions) || 0,
        };
      });
  }

  async getCampaigns(days: number): Promise<AdCampaign[]> {
    return this.fetchCampaignRows(`DURING ${gaqlDateConst(days)}`);
  }

  async getCreatives(days: number): Promise<AdCreative[]> {
    return this.fetchCreativeRows(`DURING ${gaqlDateConst(days)}`);
  }

  async getCampaignsByDateRange(startDate: string, endDate: string): Promise<AdCampaign[]> {
    return this.fetchCampaignRows(`BETWEEN '${startDate}' AND '${endDate}'`);
  }

  async getCreativesByDateRange(startDate: string, endDate: string): Promise<AdCreative[]> {
    return this.fetchCreativeRows(`BETWEEN '${startDate}' AND '${endDate}'`);
  }

  async getDailyMetrics(startDate: string, endDate: string): Promise<DailyMetricsPoint[]> {
    // READ-ONLY: SELECT only — no INSERT/UPDATE/REMOVE
    const rows = await this.getCustomer().query(`
      SELECT segments.date, metrics.cost_micros, metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status IN (ENABLED, PAUSED)
      ORDER BY segments.date
    `);

    // Sum across all campaigns per date (GAQL returns one row per campaign×date).
    const byDate = new Map<string, { spend: number; revenue: number }>();
    for (const row of rows as Record<string, Record<string, unknown>>[]) {
      const date = String(row.segments?.date ?? "");
      if (!date) continue;
      const spend = (Number(row.metrics?.cost_micros) || 0) / 1e6;
      const revenue = Number(row.metrics?.conversions_value) || 0;
      const prev = byDate.get(date) ?? { spend: 0, revenue: 0 };
      byDate.set(date, { spend: prev.spend + spend, revenue: prev.revenue + revenue });
    }

    // Google omits rows for zero-activity dates; fill them so the chart is fully aligned.
    for (const date of dateRange(startDate, endDate)) {
      if (!byDate.has(date)) byDate.set(date, { spend: 0, revenue: 0 });
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { spend, revenue }]) => ({
        date,
        spend,
        // null on days with zero conversions → gap in chart line, matching Meta behavior
        roas: spend > 0 && revenue > 0 ? revenue / spend : null,
      }));
  }

  async getSummary(days: number): Promise<AdsProviderSummary> {
    const [campaigns, currency] = await Promise.all([
      this.getCampaigns(days),
      this.getCurrencyCode(),
    ]);
    const spend = campaigns.reduce((s, c) => s + c.spend, 0);
    const revenue = campaigns.reduce((s, c) => s + c.revenue, 0);
    console.log(`[Google Ads] currency=${currency}  campaigns=${campaigns.length}  spend=${spend.toFixed(2)}  revenue=${revenue.toFixed(2)}`);
    return {
      provider: "google",
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      impressions: campaigns.reduce((s, c) => s + c.impressions, 0),
      clicks: campaigns.reduce((s, c) => s + c.clicks, 0),
      conversions: campaigns.reduce((s, c) => s + c.conversions, 0),
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
      currency,
    };
  }
}
