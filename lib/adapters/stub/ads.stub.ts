/**
 * Stub AdsAdapter — returns realistic fake ad performance data.
 * REAL INTEGRATION: Replace with Facebook Marketing API + Google Ads API adapter.
 *   - Facebook: graph.facebook.com/v19.0/act_{account_id}/insights
 *   - Google Ads: googleads.googleapis.com — reports via GAQL
 */
import type { AdsAdapter, AdSetPerformance, AdsSummary, CreativePerformance } from "../types";

const STUB_CREATIVES: CreativePerformance[] = [
  {
    id: "creative_001",
    name: "Safety First - Forklift",
    platform: "facebook",
    spend: 320,
    impressions: 42000,
    clicks: 1890,
    ctr: 0.045,
    conversions: 28,
    revenue: 3640,
    roas: 11.375,
  },
  {
    id: "creative_002",
    name: "OSHA Compliance 2025",
    platform: "facebook",
    spend: 180,
    impressions: 28000,
    clicks: 980,
    ctr: 0.035,
    conversions: 14,
    revenue: 1820,
    roas: 10.11,
  },
  {
    id: "creative_003",
    name: "Forklift Spring Push",
    platform: "facebook",
    spend: 250,
    impressions: 35000,
    clicks: 1400,
    ctr: 0.04,
    conversions: 20,
    revenue: 2600,
    roas: 10.4,
  },
  {
    id: "creative_004",
    name: "Generic Warehouse V2",
    platform: "facebook",
    spend: 150,
    impressions: 31000,
    clicks: 620,
    ctr: 0.02,
    conversions: 5,
    revenue: 650,
    roas: 4.33,
  },
  {
    id: "creative_005",
    name: "Scissor Lift - B2B",
    platform: "google",
    spend: 200,
    impressions: 15000,
    clicks: 450,
    ctr: 0.03,
    conversions: 11,
    revenue: 1430,
    roas: 7.15,
  },
];

const STUB_AD_SETS: AdSetPerformance[] = [
  {
    id: "adset_001",
    name: "Forklift - Lookalike 1%",
    platform: "facebook",
    dailyBudget: 75,
    spend: 500,
    roas: 10.8,
    creatives: [STUB_CREATIVES[0], STUB_CREATIVES[1]],
  },
  {
    id: "adset_002",
    name: "Forklift Spring Push",
    platform: "facebook",
    dailyBudget: 50,
    spend: 400,
    roas: 7.5,
    creatives: [STUB_CREATIVES[2], STUB_CREATIVES[3]],
  },
  {
    id: "adset_003",
    name: "B2B Decision Makers",
    platform: "google",
    dailyBudget: 60,
    spend: 200,
    roas: 7.15,
    creatives: [STUB_CREATIVES[4]],
  },
];

export const stubAdsAdapter: AdsAdapter = {
  async getSummary(_days: number): Promise<AdsSummary> {
    const totalSpend = STUB_CREATIVES.reduce((s, c) => s + c.spend, 0);
    const totalRevenue = STUB_CREATIVES.reduce((s, c) => s + c.revenue, 0);
    const sorted = [...STUB_CREATIVES].sort((a, b) => b.roas - a.roas);
    return {
      totalSpend,
      totalRevenue,
      overallRoas: totalRevenue / totalSpend,
      adSets: STUB_AD_SETS,
      bestCreative: sorted[0],
      worstCreative: sorted[sorted.length - 1],
    };
  },

  async getAdSetPerformance(_days: number): Promise<AdSetPerformance[]> {
    return STUB_AD_SETS;
  },

  async getCreativePerformance(_days: number): Promise<CreativePerformance[]> {
    return STUB_CREATIVES;
  },
};
