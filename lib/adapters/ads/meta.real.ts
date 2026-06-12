/**
 * MetaAdsRealProvider — live Meta Ads data via Meta Marketing API (Graph API).
 *
 * SAFETY (read-only application guarantee):
 *   Only HTTP GET requests are sent to the Graph API.
 *   No POST, PUT, or DELETE requests are ever made. No ad, campaign, or budget is modified.
 *
 * Required env vars:
 *   META_ACCESS_TOKEN    — long-lived system-user or user token with ads_read scope
 *   META_AD_ACCOUNT_ID   — numeric ad account ID (e.g. 1912758866071520) or act_ prefixed
 *
 * Optional:
 *   META_GRAPH_VERSION   — Graph API version override (default: v22.0)
 */
import type { AdCampaign, AdCreative, AdsProvider, AdsProviderSummary, DailyMetricsPoint } from "./types";

// Pinned to current stable version — override via META_GRAPH_VERSION env var
const DEFAULT_GRAPH_VERSION = "v22.0";

type MetaAction = { action_type?: string; value?: string };

function metaDatePreset(days: number): string {
  if (days <= 1) return "yesterday";
  if (days <= 7) return "last_7d";
  if (days <= 14) return "last_14d";
  return "last_30d";
}

// Extract ROAS from Meta's purchase_roas array — prefer omni_purchase, fall back to first entry
function extractRoas(roasArr: MetaAction[] | undefined): number {
  if (!roasArr?.length) return 0;
  const row =
    roasArr.find((r) => r.action_type === "omni_purchase") ??
    roasArr.find((r) => r.action_type === "purchase") ??
    roasArr[0];
  return parseFloat(row?.value ?? "0") || 0;
}

// Sum purchase revenue from action_values array
function extractRevenue(actionValues: MetaAction[] | undefined): number {
  if (!actionValues?.length) return 0;
  const purchaseTypes = new Set(["purchase", "omni_purchase", "web_in_store_purchase"]);
  return actionValues
    .filter((a) => purchaseTypes.has(a.action_type ?? ""))
    .reduce((sum, a) => sum + (parseFloat(a.value ?? "0") || 0), 0);
}

// Count purchase conversions from actions array
function extractConversions(actions: MetaAction[] | undefined): number {
  if (!actions?.length) return 0;
  const purchaseTypes = new Set(["purchase", "omni_purchase"]);
  return actions
    .filter((a) => purchaseTypes.has(a.action_type ?? ""))
    .reduce((sum, a) => sum + (parseFloat(a.value ?? "0") || 0), 0);
}

export class MetaAdsRealProvider implements AdsProvider {
  readonly providerName = "meta" as const;

  private get graphVersion() {
    return process.env.META_GRAPH_VERSION ?? DEFAULT_GRAPH_VERSION;
  }
  private get token() {
    return process.env.META_ACCESS_TOKEN!;
  }
  private get actId() {
    const id = process.env.META_AD_ACCOUNT_ID!;
    return id.startsWith("act_") ? id : `act_${id}`;
  }

  // READ-ONLY: All Graph API calls use HTTP GET only
  private async graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`https://graph.facebook.com/${this.graphVersion}/${path}`);
    url.searchParams.set("access_token", this.token);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`Meta Graph API ${res.status} on /${path}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  private insightFields(level: "campaign" | "ad"): string {
    return level === "campaign"
      ? "campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,purchase_roas"
      : "ad_id,ad_name,campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,purchase_roas";
  }

  // Fetch insights using a GAQL-style date preset (last_7d, yesterday, etc.)
  private async getInsights(level: "campaign" | "ad", days: number): Promise<Record<string, unknown>[]> {
    const data = await this.graphGet<{ data?: Record<string, unknown>[] }>(
      `${this.actId}/insights`,
      { level, fields: this.insightFields(level), date_preset: metaDatePreset(days), limit: "500" }
    );
    return data.data ?? [];
  }

  // Fetch insights for an explicit date range — used for comparison queries
  private async getInsightsByRange(
    level: "campaign" | "ad",
    startDate: string,
    endDate: string
  ): Promise<Record<string, unknown>[]> {
    const data = await this.graphGet<{ data?: Record<string, unknown>[] }>(
      `${this.actId}/insights`,
      {
        level,
        fields: this.insightFields(level),
        time_range: JSON.stringify({ since: startDate, until: endDate }),
        limit: "500",
      }
    );
    return data.data ?? [];
  }

  private async getCampaignList(): Promise<Record<string, unknown>[]> {
    const data = await this.graphGet<{ data?: Record<string, unknown>[] }>(
      `${this.actId}/campaigns`,
      { fields: "id,name,status,daily_budget,objective", limit: "500" }
    );
    return data.data ?? [];
  }

  private mapCampaignInsights(
    insights: Record<string, unknown>[],
    campaignList: Record<string, unknown>[]
  ): AdCampaign[] {
    // Status + daily_budget lookup by campaign ID
    const metaMap = new Map<string, { status: string; dailyBudget: number }>();
    for (const c of campaignList) {
      // daily_budget from Meta API is in smallest currency unit (cents for USD) → divide by 100
      metaMap.set(String(c.id), {
        status: String(c.status ?? "ACTIVE").toUpperCase(),
        dailyBudget: (parseInt(String(c.daily_budget ?? "0"), 10) || 0) / 100,
      });
    }
    return insights
      .filter((row) => parseFloat(String(row.spend ?? "0")) > 0)
      .map((row): AdCampaign => {
        const spend = parseFloat(String(row.spend ?? "0")) || 0;
        const actions = row.actions as MetaAction[] | undefined;
        const actionValues = row.action_values as MetaAction[] | undefined;
        const purchaseRoas = row.purchase_roas as MetaAction[] | undefined;
        const revenue = extractRevenue(actionValues);
        const platformRoas = extractRoas(purchaseRoas);
        const roas = platformRoas > 0 ? platformRoas : spend > 0 ? revenue / spend : 0;
        const clicks = parseInt(String(row.clicks ?? "0"), 10) || 0;
        const impressions = parseInt(String(row.impressions ?? "0"), 10) || 0;
        const meta = metaMap.get(String(row.campaign_id)) ?? { status: "ACTIVE", dailyBudget: 0 };
        return {
          id: String(row.campaign_id ?? ""),
          provider: "meta",
          name: String(row.campaign_name ?? "Unknown Campaign"),
          type: "Campaign",
          status: meta.status === "PAUSED" ? "paused" : "active",
          dailyBudget: meta.dailyBudget,
          spend,
          revenue,
          roas,
          impressions,
          clicks,
          ctr: impressions > 0 ? clicks / impressions : 0,
          conversions: extractConversions(actions),
        };
      });
  }

  private mapCreativeInsights(insights: Record<string, unknown>[]): AdCreative[] {
    return insights
      .filter((row) => parseFloat(String(row.spend ?? "0")) > 0)
      .map((row): AdCreative => {
        const spend = parseFloat(String(row.spend ?? "0")) || 0;
        const actions = row.actions as MetaAction[] | undefined;
        const actionValues = row.action_values as MetaAction[] | undefined;
        const purchaseRoas = row.purchase_roas as MetaAction[] | undefined;
        const revenue = extractRevenue(actionValues);
        const platformRoas = extractRoas(purchaseRoas);
        const roas = platformRoas > 0 ? platformRoas : spend > 0 ? revenue / spend : 0;
        const clicks = parseInt(String(row.clicks ?? "0"), 10) || 0;
        const impressions = parseInt(String(row.impressions ?? "0"), 10) || 0;
        return {
          id: String(row.ad_id ?? ""),
          provider: "meta",
          campaignId: String(row.campaign_id ?? ""),
          campaignName: String(row.campaign_name ?? "Unknown"),
          name: String(row.ad_name ?? row.ad_id ?? "Unknown Ad"),
          format: "image",
          spend,
          revenue,
          roas,
          impressions,
          clicks,
          ctr: impressions > 0 ? clicks / impressions : 0,
          conversions: extractConversions(actions),
        };
      });
  }

  async getCampaigns(days: number): Promise<AdCampaign[]> {
    const [insights, campaignList] = await Promise.all([
      this.getInsights("campaign", days),
      this.getCampaignList(),
    ]);
    return this.mapCampaignInsights(insights, campaignList);
  }

  async getCreatives(days: number): Promise<AdCreative[]> {
    const insights = await this.getInsights("ad", days);
    return this.mapCreativeInsights(insights);
  }

  async getCampaignsByDateRange(startDate: string, endDate: string): Promise<AdCampaign[]> {
    const [insights, campaignList] = await Promise.all([
      this.getInsightsByRange("campaign", startDate, endDate),
      this.getCampaignList(),
    ]);
    return this.mapCampaignInsights(insights, campaignList);
  }

  async getCreativesByDateRange(startDate: string, endDate: string): Promise<AdCreative[]> {
    const insights = await this.getInsightsByRange("ad", startDate, endDate);
    return this.mapCreativeInsights(insights);
  }

  async getDailyMetrics(startDate: string, endDate: string): Promise<DailyMetricsPoint[]> {
    // READ-ONLY: HTTP GET with time_increment=1 — one row per day at account level.
    // Pulls spend, purchase_roas, and action_values in a single request (no extra round-trip).
    type DailyRow = {
      spend?: string;
      date_start?: string;
      purchase_roas?: MetaAction[];
      action_values?: MetaAction[];
    };
    const data = await this.graphGet<{ data?: DailyRow[] }>(
      this.actId + "/insights",
      {
        fields: "spend,purchase_roas,action_values",
        time_range: JSON.stringify({ since: startDate, until: endDate }),
        time_increment: "1",
        limit: "100",
      }
    );
    return (data.data ?? [])
      .filter((row) => !!row.date_start)
      .map((row) => {
        const spend = parseFloat(row.spend ?? "0") || 0;
        const platformRoas = extractRoas(row.purchase_roas);
        const revenue = extractRevenue(row.action_values);
        // roas: prefer platform-calculated value; else calculate from revenue/spend;
        // null when there are no purchases that day (renders as a gap in the chart line)
        const roas =
          platformRoas > 0 ? platformRoas
          : spend > 0 && revenue > 0 ? revenue / spend
          : null;
        return { date: row.date_start!, spend, roas };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSummary(days: number): Promise<AdsProviderSummary> {
    const campaigns = await this.getCampaigns(days);
    const spend = campaigns.reduce((s, c) => s + c.spend, 0);
    const revenue = campaigns.reduce((s, c) => s + c.revenue, 0);
    return {
      provider: "meta",
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      impressions: campaigns.reduce((s, c) => s + c.impressions, 0),
      clicks: campaigns.reduce((s, c) => s + c.clicks, 0),
      conversions: campaigns.reduce((s, c) => s + c.conversions, 0),
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    };
  }
}
