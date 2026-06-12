/**
 * Ads provider abstraction.
 * Both Google Ads and Meta Ads implement AdsProvider behind the same interface.
 * AdsService aggregates them for combined views.
 */

export type AdsProviderName = "google" | "meta";

export interface AdsProviderSummary {
  provider: AdsProviderName;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  conversions: number;
  activeCampaigns: number;
  /** ISO 4217 currency code (e.g. "USD"). Populated by real providers; undefined for stubs. */
  currency?: string;
}

/** Google = Campaign/Ad Group/Ad. Meta = Campaign/Ad Set/Ad.
 *  Both are flattened here to a shared Campaign shape. */
export interface AdCampaign {
  id: string;
  provider: AdsProviderName;
  name: string;
  type: string;         // e.g. "Search" | "PMax" | "Display" (Google), "Lookalike" | "Interest" (Meta)
  status: "active" | "paused";
  dailyBudget: number;
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
}

export interface AdCreative {
  id: string;
  provider: AdsProviderName;
  campaignId: string;
  campaignName: string;
  name: string;
  format: string;       // "text" | "responsive" | "image" | "video" | "carousel"
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
}

/** For getSpendTimeseries (combined spend across providers, used by dashboard chart) */
export interface SpendTimeseriesPoint {
  date: string;  // YYYY-MM-DD
  spend: number; // USD
}

/** Per-day spend + ROAS for a single provider. roas is null when there are no purchases. */
export interface DailyMetricsPoint {
  date: string;       // YYYY-MM-DD
  spend: number;      // USD
  roas: number | null; // null → no purchases that day (renders as a gap in the chart line)
}

export interface AdsProvider {
  readonly providerName: AdsProviderName;
  getSummary(days: number): Promise<AdsProviderSummary>;
  getCampaigns(days: number): Promise<AdCampaign[]>;
  getCreatives(days: number): Promise<AdCreative[]>;
  /** Return one {date, spend, roas} point per day for [startDate, endDate] inclusive. */
  getDailyMetrics(startDate: string, endDate: string): Promise<DailyMetricsPoint[]>;
  /**
   * Same as getCampaigns but uses an explicit YYYY-MM-DD date range instead of a GAQL
   * date constant. Required for comparison queries (e.g. "this week vs last week").
   */
  getCampaignsByDateRange(startDate: string, endDate: string): Promise<AdCampaign[]>;
  /** Same as getCreatives but with an explicit date range. */
  getCreativesByDateRange(startDate: string, endDate: string): Promise<AdCreative[]>;
}

export interface CombinedAdsSummary {
  totalSpend: number;
  totalRevenue: number;
  blendedRoas: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  byProvider: Partial<Record<AdsProviderName, AdsProviderSummary>>;
  allCampaigns: AdCampaign[];   // both providers, roas desc
  allCreatives: AdCreative[];   // both providers, roas desc
  topCreatives: AdCreative[];   // top 3
  worstCreative: AdCreative | null;
  /** Errors from providers that failed — populated when real credentials are configured but the API call errored */
  providerErrors: Partial<Record<AdsProviderName, string>>;
}
