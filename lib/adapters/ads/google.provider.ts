/**
 * Google Ads Provider — stub returning realistic campaign and creative data.
 *
 * REAL INTEGRATION:
 *   Service: Google Ads API  https://developers.google.com/google-ads/api/docs/start
 *   Library: google-ads-api (npm) or REST via oauth2 tokens
 *   Required env vars (see .env.example):
 *     GOOGLE_ADS_DEVELOPER_TOKEN   — from Google Ads API Center
 *     GOOGLE_ADS_CLIENT_ID         — OAuth 2.0 client ID
 *     GOOGLE_ADS_CLIENT_SECRET     — OAuth 2.0 client secret
 *     GOOGLE_ADS_REFRESH_TOKEN     — long-lived refresh token
 *     GOOGLE_ADS_CUSTOMER_ID       — 10-digit account ID (no dashes)
 *   Replace this file with lib/adapters/ads/google.real.ts implementing AdsProvider.
 *   Set USE_STUBS=false in .env.local to activate it.
 */
import type { AdCampaign, AdCreative, AdsProvider, AdsProviderSummary, DailyMetricsPoint } from "./types";
import { dateRange, stubDailySpend, hashSeed } from "../timeseries-utils";

const GOOGLE_CAMPAIGNS: AdCampaign[] = [
  {
    id: "g_camp_001",
    provider: "google",
    name: "Forklift Certification | Exact Match",
    type: "Search",
    status: "active",
    dailyBudget: 80,
    spend: 380,
    revenue: 3230,
    roas: 8.5,
    impressions: 12400,
    clicks: 868,
    ctr: 0.07,
    conversions: 26,
  },
  {
    id: "g_camp_002",
    provider: "google",
    name: "OSHA Compliance Training",
    type: "Search",
    status: "active",
    dailyBudget: 60,
    spend: 220,
    revenue: 1364,
    roas: 6.2,
    impressions: 8100,
    clicks: 486,
    ctr: 0.06,
    conversions: 12,
  },
  {
    id: "g_camp_003",
    provider: "google",
    name: "Equipment Safety — Performance Max",
    type: "PMax",
    status: "active",
    dailyBudget: 70,
    spend: 280,
    revenue: 1344,
    roas: 4.8,
    impressions: 31000,
    clicks: 744,
    ctr: 0.024,
    conversions: 11,
  },
];

const GOOGLE_CREATIVES: AdCreative[] = [
  {
    id: "g_cr_001",
    provider: "google",
    campaignId: "g_camp_001",
    campaignName: "Forklift Certification | Exact Match",
    name: "Get OSHA Forklift Certified Today",
    format: "responsive",
    spend: 200,
    revenue: 1820,
    roas: 9.1,
    impressions: 6200,
    clicks: 447,
    ctr: 0.072,
    conversions: 14,
  },
  {
    id: "g_cr_002",
    provider: "google",
    campaignId: "g_camp_001",
    campaignName: "Forklift Certification | Exact Match",
    name: "Official Forklift Operator Certificate",
    format: "responsive",
    spend: 180,
    revenue: 1332,
    roas: 7.4,
    impressions: 6200,
    clicks: 421,
    ctr: 0.068,
    conversions: 12,
  },
  {
    id: "g_cr_003",
    provider: "google",
    campaignId: "g_camp_002",
    campaignName: "OSHA Compliance Training",
    name: "OSHA Training — Same Day Certificate",
    format: "text",
    spend: 220,
    revenue: 1364,
    roas: 6.2,
    impressions: 8100,
    clicks: 486,
    ctr: 0.06,
    conversions: 12,
  },
  {
    id: "g_cr_004",
    provider: "google",
    campaignId: "g_camp_003",
    campaignName: "Equipment Safety — Performance Max",
    name: "Safety Training — Start Now",
    format: "responsive",
    spend: 280,
    revenue: 1344,
    roas: 4.8,
    impressions: 31000,
    clicks: 744,
    ctr: 0.024,
    conversions: 11,
  },
];

export class GoogleAdsProvider implements AdsProvider {
  readonly providerName = "google" as const;

  async getSummary(_days: number): Promise<AdsProviderSummary> {
    const spend = GOOGLE_CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
    const revenue = GOOGLE_CAMPAIGNS.reduce((s, c) => s + c.revenue, 0);
    return {
      provider: "google",
      spend,
      revenue,
      roas: revenue / spend,
      impressions: GOOGLE_CAMPAIGNS.reduce((s, c) => s + c.impressions, 0),
      clicks: GOOGLE_CAMPAIGNS.reduce((s, c) => s + c.clicks, 0),
      conversions: GOOGLE_CAMPAIGNS.reduce((s, c) => s + c.conversions, 0),
      activeCampaigns: GOOGLE_CAMPAIGNS.filter((c) => c.status === "active").length,
    };
  }

  async getCampaigns(_days: number): Promise<AdCampaign[]> {
    return GOOGLE_CAMPAIGNS;
  }

  async getCreatives(_days: number): Promise<AdCreative[]> {
    return GOOGLE_CREATIVES;
  }

  async getDailyMetrics(startDate: string, endDate: string): Promise<DailyMetricsPoint[]> {
    return dateRange(startDate, endDate).map((date) => ({
      date,
      spend: stubDailySpend(date + ":google"),
      roas: 4 + hashSeed(date + ":google:roas") * 8,
    }));
  }

  async getCampaignsByDateRange(_startDate: string, _endDate: string): Promise<AdCampaign[]> {
    return GOOGLE_CAMPAIGNS;
  }

  async getCreativesByDateRange(_startDate: string, _endDate: string): Promise<AdCreative[]> {
    return GOOGLE_CREATIVES;
  }
}
