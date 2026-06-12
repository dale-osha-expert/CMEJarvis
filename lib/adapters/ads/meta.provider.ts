/**
 * Meta Ads Provider — stub returning realistic Facebook/Instagram campaign data.
 *
 * REAL INTEGRATION:
 *   Service: Meta Marketing API  https://developers.facebook.com/docs/marketing-apis
 *   Endpoints:
 *     Insights: GET /act_{AD_ACCOUNT_ID}/insights?fields=spend,impressions,...
 *     Campaigns: GET /act_{AD_ACCOUNT_ID}/campaigns
 *     Ad sets:  GET /act_{AD_ACCOUNT_ID}/adsets
 *     Ads:      GET /act_{AD_ACCOUNT_ID}/ads
 *   Required env vars (see .env.example):
 *     META_APP_ID              — from Meta for Developers
 *     META_APP_SECRET          — app secret
 *     META_ACCESS_TOKEN        — long-lived page/system-user access token
 *     META_AD_ACCOUNT_ID       — act_{numeric id}
 *   Replace this file with lib/adapters/ads/meta.real.ts implementing AdsProvider.
 *   Set USE_STUBS=false in .env.local to activate it.
 */
import type { AdCampaign, AdCreative, AdsProvider, AdsProviderSummary, DailyMetricsPoint } from "./types";
import { dateRange, stubDailySpend, hashSeed } from "../timeseries-utils";

// Meta uses "Ad Sets" — mapped to AdCampaign for unified display
const META_CAMPAIGNS: AdCampaign[] = [
  {
    id: "m_adset_001",
    provider: "meta",
    name: "Forklift Operators — Lookalike 1%",
    type: "Lookalike",
    status: "active",
    dailyBudget: 75,
    spend: 340,
    revenue: 3876,
    roas: 11.4,
    impressions: 42000,
    clicks: 1890,
    ctr: 0.045,
    conversions: 29,
  },
  {
    id: "m_adset_002",
    provider: "meta",
    name: "Safety Managers — Interest",
    type: "Interest",
    status: "active",
    dailyBudget: 60,
    spend: 260,
    revenue: 2548,
    roas: 9.8,
    impressions: 31000,
    clicks: 1240,
    ctr: 0.04,
    conversions: 19,
  },
  {
    id: "m_adset_003",
    provider: "meta",
    name: "Warehouse Workers — Broad",
    type: "Broad",
    status: "active",
    dailyBudget: 50,
    spend: 180,
    revenue: 774,
    roas: 4.3,
    impressions: 28000,
    clicks: 560,
    ctr: 0.02,
    conversions: 6,
  },
];

const META_CREATIVES: AdCreative[] = [
  {
    id: "m_cr_001",
    provider: "meta",
    campaignId: "m_adset_001",
    campaignName: "Forklift Operators — Lookalike 1%",
    name: "Safety First — Forklift",
    format: "video",
    spend: 210,
    revenue: 2394,
    roas: 11.4,
    impressions: 26000,
    clicks: 1170,
    ctr: 0.045,
    conversions: 18,
  },
  {
    id: "m_cr_002",
    provider: "meta",
    campaignId: "m_adset_001",
    campaignName: "Forklift Operators — Lookalike 1%",
    name: "OSHA 2025 Compliance Update",
    format: "carousel",
    spend: 130,
    revenue: 1313,
    roas: 10.1,
    impressions: 16000,
    clicks: 720,
    ctr: 0.045,
    conversions: 11,
  },
  {
    id: "m_cr_003",
    provider: "meta",
    campaignId: "m_adset_002",
    campaignName: "Safety Managers — Interest",
    name: "B2B Certification Program",
    format: "image",
    spend: 260,
    revenue: 2548,
    roas: 9.8,
    impressions: 31000,
    clicks: 1240,
    ctr: 0.04,
    conversions: 19,
  },
  {
    id: "m_cr_004",
    provider: "meta",
    campaignId: "m_adset_003",
    campaignName: "Warehouse Workers — Broad",
    name: "Generic Warehouse V2",
    format: "image",
    spend: 180,
    revenue: 774,
    roas: 4.3,
    impressions: 28000,
    clicks: 560,
    ctr: 0.02,
    conversions: 6,
  },
];

export class MetaAdsProvider implements AdsProvider {
  readonly providerName = "meta" as const;

  async getSummary(_days: number): Promise<AdsProviderSummary> {
    const spend = META_CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
    const revenue = META_CAMPAIGNS.reduce((s, c) => s + c.revenue, 0);
    return {
      provider: "meta",
      spend,
      revenue,
      roas: revenue / spend,
      impressions: META_CAMPAIGNS.reduce((s, c) => s + c.impressions, 0),
      clicks: META_CAMPAIGNS.reduce((s, c) => s + c.clicks, 0),
      conversions: META_CAMPAIGNS.reduce((s, c) => s + c.conversions, 0),
      activeCampaigns: META_CAMPAIGNS.filter((c) => c.status === "active").length,
    };
  }

  async getCampaigns(_days: number): Promise<AdCampaign[]> {
    return META_CAMPAIGNS;
  }

  async getCreatives(_days: number): Promise<AdCreative[]> {
    return META_CREATIVES;
  }

  async getDailyMetrics(startDate: string, endDate: string): Promise<DailyMetricsPoint[]> {
    return dateRange(startDate, endDate).map((date) => ({
      date,
      spend: stubDailySpend(date + ":meta"),
      roas: 6 + hashSeed(date + ":meta:roas") * 8,
    }));
  }

  async getCampaignsByDateRange(_startDate: string, _endDate: string): Promise<AdCampaign[]> {
    return META_CAMPAIGNS;
  }

  async getCreativesByDateRange(_startDate: string, _endDate: string): Promise<AdCreative[]> {
    return META_CREATIVES;
  }
}
