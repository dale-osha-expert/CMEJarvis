/**
 * AdsService — aggregates multiple AdsProvider instances into combined views.
 * Uses Promise.allSettled so one provider failing never takes down the other.
 */

/**
 * Unwrap the full Google Ads API error structure.
 * The google-ads-api package attaches an `errors` array with failure codes and messages.
 * Standard Error.message alone is not enough to diagnose most API errors.
 *
 * Common Google Ads failure codes to look for in logs:
 *   DEVELOPER_TOKEN_ACCESS_LEVEL_WITH_WRONG_CUSTOMER — test-account token used against a real account
 *   USER_PERMISSION_DENIED — wrong login_customer_id or user lacks access to this customer
 *   CUSTOMER_NOT_FOUND — bad customer_id (check cleanCustomerId strips dashes correctly)
 *   invalid_grant — refresh token revoked; user must re-consent via OAuth flow
 */
function extractErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const e = err as Error & {
    errors?: Array<{ errorCode?: Record<string, string>; message?: string }>;
    requestId?: string;
  };
  if (!e.errors?.length) return e.message;
  const details = e.errors
    .map((er) => {
      const codes = Object.entries(er.errorCode ?? {})
        .filter(([, v]) => v && v !== "UNSPECIFIED" && v !== "UNKNOWN")
        .map(([k, v]) => `${k}:${v}`)
        .join(", ");
      return codes ? `[${codes}] ${er.message ?? ""}` : (er.message ?? "");
    })
    .join(" | ");
  const reqId = e.requestId ? ` (requestId=${e.requestId})` : "";
  return `${e.message} — ${details}${reqId}`;
}

import type {
  AdsProvider,
  AdsProviderName,
  AdsProviderSummary,
  AdCampaign,
  AdCreative,
  CombinedAdsSummary,
  SpendTimeseriesPoint,
  DailyMetricsPoint,
} from "./types";

export class AdsService {
  constructor(private readonly providers: AdsProvider[]) {}

  getProvider(name: AdsProviderName): AdsProvider | undefined {
    return this.providers.find((p) => p.providerName === name);
  }

  async getProviderSummary(name: AdsProviderName, days: number): Promise<AdsProviderSummary | null> {
    try {
      return (await this.getProvider(name)?.getSummary(days)) ?? null;
    } catch (err) {
      console.error(`[ADS] ${name} getSummary error: ${extractErrorMessage(err)}`);
      return null;
    }
  }

  async getProviderCampaigns(name: AdsProviderName, days: number): Promise<AdCampaign[]> {
    try {
      return (await this.getProvider(name)?.getCampaigns(days)) ?? [];
    } catch (err) {
      console.error(`[ADS] ${name} getCampaigns error: ${extractErrorMessage(err)}`);
      return [];
    }
  }

  async getProviderCampaignsByDateRange(
    name: AdsProviderName,
    startDate: string,
    endDate: string
  ): Promise<AdCampaign[]> {
    try {
      return (await this.getProvider(name)?.getCampaignsByDateRange(startDate, endDate)) ?? [];
    } catch (err) {
      console.error(`[ADS] ${name} getCampaignsByDateRange error: ${extractErrorMessage(err)}`);
      return [];
    }
  }

  async getProviderCreatives(name: AdsProviderName, days: number): Promise<AdCreative[]> {
    try {
      return (await this.getProvider(name)?.getCreatives(days)) ?? [];
    } catch (err) {
      console.error(`[ADS] ${name} getCreatives error: ${extractErrorMessage(err)}`);
      return [];
    }
  }

  async getProviderCreativesByDateRange(
    name: AdsProviderName,
    startDate: string,
    endDate: string
  ): Promise<AdCreative[]> {
    try {
      return (await this.getProvider(name)?.getCreativesByDateRange(startDate, endDate)) ?? [];
    } catch (err) {
      console.error(`[ADS] ${name} getCreativesByDateRange error: ${extractErrorMessage(err)}`);
      return [];
    }
  }

  /** Per-provider daily spend + ROAS for a date range. Returns [] and logs on error. */
  async getProviderDailyMetrics(
    name: AdsProviderName,
    startDate: string,
    endDate: string
  ): Promise<DailyMetricsPoint[]> {
    try {
      return (await this.getProvider(name)?.getDailyMetrics(startDate, endDate)) ?? [];
    } catch (err) {
      console.error(`[ADS] ${name} getDailyMetrics error: ${extractErrorMessage(err)}`);
      return [];
    }
  }

  /**
   * Merge per-day spend across ALL providers for [startDate, endDate] inclusive.
   * Providers that fail contribute 0 for their dates — never crashes.
   * Used by the dashboard timeseries route (combined spend series).
   */
  async getSpendTimeseries(startDate: string, endDate: string): Promise<SpendTimeseriesPoint[]> {
    const results = await Promise.allSettled(
      this.providers.map((p) => p.getDailyMetrics(startDate, endDate))
    );

    const byDate = new Map<string, number>();
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        for (const pt of r.value) byDate.set(pt.date, (byDate.get(pt.date) ?? 0) + pt.spend);
      } else {
        console.error(`[ADS] ${this.providers[i].providerName} getDailyMetrics failed: ${extractErrorMessage(r.reason)}`);
      }
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, spend]) => ({ date, spend }));
  }

  async getCombinedSummary(days: number): Promise<CombinedAdsSummary> {
    const [summaryResults, campaignResults, creativeResults] = await Promise.all([
      Promise.allSettled(this.providers.map((p) => p.getSummary(days))),
      Promise.allSettled(this.providers.map((p) => p.getCampaigns(days))),
      Promise.allSettled(this.providers.map((p) => p.getCreatives(days))),
    ]);

    const providerErrors: Partial<Record<AdsProviderName, string>> = {};
    const summaries: AdsProviderSummary[] = [];

    for (let i = 0; i < this.providers.length; i++) {
      const result = summaryResults[i];
      if (result.status === "fulfilled") {
        summaries.push(result.value);
      } else {
        const provider = this.providers[i];
        const msg = extractErrorMessage(result.reason);
        providerErrors[provider.providerName] = msg;
        console.error(`[ADS] ${provider.providerName} failed: ${msg}`);
      }
    }

    const allCampaigns: AdCampaign[] = campaignResults
      .filter((r): r is PromiseFulfilledResult<AdCampaign[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    const allCreatives: AdCreative[] = creativeResults
      .filter((r): r is PromiseFulfilledResult<AdCreative[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    const totalSpend = summaries.reduce((s, p) => s + p.spend, 0);
    const totalRevenue = summaries.reduce((s, p) => s + p.revenue, 0);

    const byProvider: Partial<Record<AdsProviderName, AdsProviderSummary>> = {};
    for (const summary of summaries) byProvider[summary.provider] = summary;

    const sortedCreatives = [...allCreatives].sort((a, b) => b.roas - a.roas);
    const sortedCampaigns = [...allCampaigns].sort((a, b) => b.roas - a.roas);

    return {
      totalSpend,
      totalRevenue,
      blendedRoas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      totalImpressions: summaries.reduce((s, p) => s + p.impressions, 0),
      totalClicks: summaries.reduce((s, p) => s + p.clicks, 0),
      totalConversions: summaries.reduce((s, p) => s + p.conversions, 0),
      byProvider,
      allCampaigns: sortedCampaigns,
      allCreatives: sortedCreatives,
      topCreatives: sortedCreatives.slice(0, 3),
      worstCreative: sortedCreatives[sortedCreatives.length - 1] ?? null,
      providerErrors,
    };
  }

  // ─── Analysis: winners & wasters ──────────────────────────────────────────

  /**
   * Pull every campaign across both providers for the date range and return:
   *   scaleCandidates — high ROAS, meaningful spend (worth increasing budget on)
   *   cutCandidates   — low ROAS, meaningful spend (burning money)
   *   conversionTrackingNote — populated when a provider's blended ROAS looks implausibly low
   */
  async analyzeAdPerformance(startDate: string, endDate: string): Promise<AdAnalysis> {
    const [googleCampaigns, metaCampaigns] = await Promise.all([
      this.getProviderCampaignsByDateRange("google", startDate, endDate),
      this.getProviderCampaignsByDateRange("meta", startDate, endDate),
    ]);

    const allCampaigns = [...googleCampaigns, ...metaCampaigns];
    const totalSpend = allCampaigns.reduce((s, c) => s + c.spend, 0);
    const totalRevenue = allCampaigns.reduce((s, c) => s + c.revenue, 0);
    const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    const googleSpend = googleCampaigns.reduce((s, c) => s + c.spend, 0);
    const googleRevenue = googleCampaigns.reduce((s, c) => s + c.revenue, 0);
    const metaSpend = metaCampaigns.reduce((s, c) => s + c.spend, 0);
    const metaRevenue = metaCampaigns.reduce((s, c) => s + c.revenue, 0);

    // Meaningful-spend threshold: at least $50 or 1% of total, whichever is larger
    const meaningfulSpend = Math.max(50, totalSpend * 0.01);

    // Scale candidates: ROAS ≥ 4x (certifyme target), spend ≥ threshold
    const scaleCandidates: PerformanceCandidate[] = allCampaigns
      .filter((c) => c.roas >= 4.0 && c.spend >= meaningfulSpend)
      .sort((a, b) => b.roas * b.spend - a.roas * a.spend) // highest revenue impact first
      .map((c) => ({
        provider: c.provider,
        id: c.id,
        name: c.name,
        spend: c.spend,
        revenue: c.revenue,
        roas: c.roas,
        conversions: c.conversions,
        rationale: `ROAS ${c.roas.toFixed(1)}x on $${c.spend.toFixed(0)} spend — at or above target. Increasing budget ~20% could add ~$${(c.revenue * 0.2).toFixed(0)} revenue.`,
      }));

    // Cut candidates: ROAS < 2x (underperforming), spend ≥ $100 (meaningful waste)
    const cutCandidates: PerformanceCandidate[] = allCampaigns
      .filter((c) => c.roas < 2.0 && c.spend >= 100)
      .sort((a, b) => b.spend - a.spend) // biggest waste first
      .map((c) => {
        const breakEvenSpend = c.spend * 2; // spend needed for 2x ROAS
        const waste = c.spend - c.revenue / 2; // dollars burned above 2x breakeven
        const trackingCaveat =
          c.roas < 0.5 ? " (ROAS this low suggests conversion tracking may be broken — verify in platform UI before cutting)" : "";
        return {
          provider: c.provider,
          id: c.id,
          name: c.name,
          spend: c.spend,
          revenue: c.revenue,
          roas: c.roas,
          conversions: c.conversions,
          rationale: `ROAS ${c.roas.toFixed(2)}x on $${c.spend.toFixed(0)} spend — ~$${Math.max(0, waste).toFixed(0)} above 2x breakeven.${trackingCaveat}`,
        };
      });

    // Conversion tracking warning: any provider with blended ROAS < 0.5x and > $300 spend
    let conversionTrackingNote: string | undefined;
    const trackingWarnings: string[] = [];
    if (googleSpend > 300 && googleSpend > 0 && googleRevenue / googleSpend < 0.5) {
      trackingWarnings.push(`Google ROAS is ${(googleRevenue / googleSpend).toFixed(2)}x — likely a conversion-tracking gap, not channel failure. Verify purchase event firing in Google Tag Manager.`);
    }
    if (metaSpend > 300 && metaSpend > 0 && metaRevenue / metaSpend < 0.5) {
      trackingWarnings.push(`Meta ROAS is ${(metaRevenue / metaSpend).toFixed(2)}x — verify pixel events in Meta Events Manager.`);
    }
    if (trackingWarnings.length) conversionTrackingNote = trackingWarnings.join(" | ");

    return {
      dateRange: { startDate, endDate },
      campaignCount: { google: googleCampaigns.length, meta: metaCampaigns.length, total: allCampaigns.length },
      totals: {
        spend: totalSpend,
        revenue: totalRevenue,
        blendedRoas,
        byProvider: {
          google: { spend: googleSpend, revenue: googleRevenue, roas: googleSpend > 0 ? googleRevenue / googleSpend : 0 },
          meta: { spend: metaSpend, revenue: metaRevenue, roas: metaSpend > 0 ? metaRevenue / metaSpend : 0 },
        },
      },
      scaleCandidates,
      cutCandidates,
      conversionTrackingNote,
    };
  }

  // ─── Analysis: change detection ───────────────────────────────────────────

  /**
   * Compare recentStart–recentEnd vs priorStart–priorEnd across both providers.
   * Surfaces spend spikes, ROAS drops, cratered campaigns, and new/vanished spenders.
   */
  async detectChanges(
    recentStart: string,
    recentEnd: string,
    priorStart: string,
    priorEnd: string
  ): Promise<ChangesReport> {
    const [recentGoogle, recentMeta, priorGoogle, priorMeta] = await Promise.all([
      this.getProviderCampaignsByDateRange("google", recentStart, recentEnd),
      this.getProviderCampaignsByDateRange("meta", recentStart, recentEnd),
      this.getProviderCampaignsByDateRange("google", priorStart, priorEnd),
      this.getProviderCampaignsByDateRange("meta", priorStart, priorEnd),
    ]);

    const recentAll = [...recentGoogle, ...recentMeta];
    const priorAll = [...priorGoogle, ...priorMeta];

    const recentSpend = recentAll.reduce((s, c) => s + c.spend, 0);
    const priorSpend = priorAll.reduce((s, c) => s + c.spend, 0);
    const recentRevenue = recentAll.reduce((s, c) => s + c.revenue, 0);
    const priorRevenue = priorAll.reduce((s, c) => s + c.revenue, 0);

    const events: ChangeEvent[] = [];

    // Overall revenue dip
    if (priorRevenue > 100 && recentRevenue < priorRevenue * 0.8) {
      const pct = ((recentRevenue - priorRevenue) / priorRevenue) * 100;
      events.push({
        type: "revenue_dip",
        provider: "google", // combined — provider field used loosely
        name: "Combined revenue",
        metric: "revenue",
        recentValue: recentRevenue,
        priorValue: priorRevenue,
        changePct: pct,
        severity: "critical",
        note: `Revenue down ${Math.abs(pct).toFixed(0)}% ($${priorRevenue.toFixed(0)} → $${recentRevenue.toFixed(0)}). Check for tracking issues, landing page problems, or seasonality.`,
      });
    }

    // Per-campaign changes (match by name across providers)
    const priorByKey = new Map<string, AdCampaign>();
    for (const c of priorAll) priorByKey.set(`${c.provider}:${c.name}`, c);

    const recentByKey = new Map<string, AdCampaign>();
    for (const c of recentAll) recentByKey.set(`${c.provider}:${c.name}`, c);

    for (const [key, recent] of recentByKey) {
      const prior = priorByKey.get(key);

      if (!prior || prior.spend < 50) {
        // New or newly significant spender
        if (recent.spend >= 100) {
          events.push({
            type: "new_spender",
            provider: recent.provider,
            name: recent.name,
            metric: "spend",
            recentValue: recent.spend,
            priorValue: prior?.spend ?? 0,
            changePct: 100,
            severity: "info",
            note: `New/scaled campaign: $${recent.spend.toFixed(0)} spend this period (ROAS ${recent.roas.toFixed(1)}x).`,
          });
        }
        continue;
      }

      const spendChangePct = ((recent.spend - prior.spend) / prior.spend) * 100;
      const roasChangePct = prior.roas > 0.1
        ? ((recent.roas - prior.roas) / prior.roas) * 100
        : 0;

      // Spend spike: up >30% AND > $200 absolute increase
      if (spendChangePct > 30 && recent.spend - prior.spend > 200) {
        events.push({
          type: "spend_spike",
          provider: recent.provider,
          name: recent.name,
          metric: "spend",
          recentValue: recent.spend,
          priorValue: prior.spend,
          changePct: spendChangePct,
          severity: spendChangePct > 80 ? "critical" : "warning",
          note: `Spend up ${spendChangePct.toFixed(0)}% ($${prior.spend.toFixed(0)} → $${recent.spend.toFixed(0)}). ROAS ${recent.roas.toFixed(1)}x.`,
        });
      }

      // Campaign cratered: ROAS was above 2x, now below 1x, meaningful spend continues
      if (prior.roas >= 2.0 && recent.roas < 1.0 && recent.spend >= 100) {
        events.push({
          type: "campaign_cratered",
          provider: recent.provider,
          name: recent.name,
          metric: "roas",
          recentValue: recent.roas,
          priorValue: prior.roas,
          changePct: roasChangePct,
          severity: "critical",
          note: `ROAS cratered from ${prior.roas.toFixed(1)}x to ${recent.roas.toFixed(2)}x on $${recent.spend.toFixed(0)} spend. Verify conversion tracking before pausing.`,
        });
      } else if (roasChangePct < -25 && prior.roas >= 1.5 && recent.spend >= 100) {
        // Significant ROAS degradation (not cratered but material)
        events.push({
          type: "roas_drop",
          provider: recent.provider,
          name: recent.name,
          metric: "roas",
          recentValue: recent.roas,
          priorValue: prior.roas,
          changePct: roasChangePct,
          severity: "warning",
          note: `ROAS down ${Math.abs(roasChangePct).toFixed(0)}% (${prior.roas.toFixed(1)}x → ${recent.roas.toFixed(1)}x) on $${recent.spend.toFixed(0)} spend.`,
        });
      }
    }

    // Campaigns that effectively paused (prior spend > $100, recent < $20)
    for (const [key, prior] of priorByKey) {
      const recent = recentByKey.get(key);
      if (prior.spend >= 100 && (!recent || recent.spend < 20)) {
        events.push({
          type: "campaign_paused",
          provider: prior.provider,
          name: prior.name,
          metric: "spend",
          recentValue: recent?.spend ?? 0,
          priorValue: prior.spend,
          changePct: -100,
          severity: "info",
          note: `Campaign effectively stopped ($${prior.spend.toFixed(0)} → $${(recent?.spend ?? 0).toFixed(0)}). Budget exhausted or manually paused.`,
        });
      }
    }

    // Sort by severity (critical first) then by absolute spend impact
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    events.sort((a, b) => {
      const sd = severityOrder[a.severity] - severityOrder[b.severity];
      if (sd !== 0) return sd;
      return Math.abs(b.recentValue) - Math.abs(a.recentValue);
    });

    const spendChangePct = priorSpend > 0 ? ((recentSpend - priorSpend) / priorSpend) * 100 : 0;
    const revenueChangePct = priorRevenue > 0 ? ((recentRevenue - priorRevenue) / priorRevenue) * 100 : 0;

    const criticalCount = events.filter((e) => e.severity === "critical").length;
    const warnCount = events.filter((e) => e.severity === "warning").length;
    const summary =
      events.length === 0
        ? "No material changes detected between the two periods."
        : `${criticalCount} critical, ${warnCount} warnings, ${events.length - criticalCount - warnCount} informational changes. Spend ${spendChangePct >= 0 ? "+" : ""}${spendChangePct.toFixed(0)}%, revenue ${revenueChangePct >= 0 ? "+" : ""}${revenueChangePct.toFixed(0)}%.`;

    return {
      recentPeriod: { startDate: recentStart, endDate: recentEnd },
      priorPeriod: { startDate: priorStart, endDate: priorEnd },
      totals: { recentSpend, priorSpend, spendChangePct, recentRevenue, priorRevenue, revenueChangePct },
      events,
      summary,
    };
  }
}

// ─── Exported result types ─────────────────────────────────────────────────

export interface PerformanceCandidate {
  provider: AdsProviderName;
  id: string;
  name: string;
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  rationale: string;
}

export interface AdAnalysis {
  dateRange: { startDate: string; endDate: string };
  campaignCount: { google: number; meta: number; total: number };
  totals: {
    spend: number;
    revenue: number;
    blendedRoas: number;
    byProvider: Partial<Record<AdsProviderName, { spend: number; revenue: number; roas: number }>>;
  };
  scaleCandidates: PerformanceCandidate[];
  cutCandidates: PerformanceCandidate[];
  conversionTrackingNote?: string;
}

export interface ChangeEvent {
  type: "spend_spike" | "roas_drop" | "revenue_dip" | "campaign_cratered" | "new_spender" | "campaign_paused";
  provider: AdsProviderName;
  name: string;
  metric: string;
  recentValue: number;
  priorValue: number;
  changePct: number;
  severity: "info" | "warning" | "critical";
  note: string;
}

export interface ChangesReport {
  recentPeriod: { startDate: string; endDate: string };
  priorPeriod: { startDate: string; endDate: string };
  totals: {
    recentSpend: number;
    priorSpend: number;
    spendChangePct: number;
    recentRevenue: number;
    priorRevenue: number;
    revenueChangePct: number;
  };
  events: ChangeEvent[];
  summary: string;
}
