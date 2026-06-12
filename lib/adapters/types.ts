/**
 * Shared types for all Jarvis data adapters.
 * Each adapter has a TypeScript interface here + a stub + (later) a real implementation.
 */

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface DailyMetric {
  date: string;           // YYYY-MM-DD
  revenue: number;        // USD
  orders: number;
  refunds: number;
  refundAmount: number;   // USD
  sessions: number;
  checkoutConversions: number; // sessions that completed purchase
}

export interface CourseBreakdown {
  courseType: string;     // e.g. "Forklift", "Scissor Lift", "Aerial Work Platform"
  orders: number;
  revenue: number;
}

export interface AnalyticsSummary {
  dailyMetrics: DailyMetric[];
  courseBreakdown: CourseBreakdown[];
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  overallConversionRate: number; // 0–1
}

export interface RevenueTimeseriesPoint {
  date: string;    // YYYY-MM-DD
  revenue: number; // USD
}

export interface AnalyticsAdapter {
  getDailySummary(days: number): Promise<AnalyticsSummary>;
  getMetricsByDateRange(from: string, to: string): Promise<DailyMetric[]>;
  getCourseBreakdown(days: number): Promise<CourseBreakdown[]>;
  /** Return one {date, revenue} point per day for [startDate, endDate] inclusive. */
  getRevenueTimeseries(startDate: string, endDate: string): Promise<RevenueTimeseriesPoint[]>;
}

// ─── Ads ─────────────────────────────────────────────────────────────────────

export interface CreativePerformance {
  id: string;
  name: string;
  platform: string;       // "facebook" | "google"
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;            // clicks / impressions
  conversions: number;
  revenue: number;
  roas: number;           // revenue / spend
}

export interface AdSetPerformance {
  id: string;
  name: string;
  platform: string;
  dailyBudget: number;
  spend: number;
  roas: number;
  creatives: CreativePerformance[];
}

export interface AdsSummary {
  totalSpend: number;
  totalRevenue: number;
  overallRoas: number;
  adSets: AdSetPerformance[];
  bestCreative: CreativePerformance;
  worstCreative: CreativePerformance;
}

export interface AdsAdapter {
  getSummary(days: number): Promise<AdsSummary>;
  getAdSetPerformance(days: number): Promise<AdSetPerformance[]>;
  getCreativePerformance(days: number): Promise<CreativePerformance[]>;
}

// ─── Support ─────────────────────────────────────────────────────────────────

export type SupportStatus = "open" | "pending_reply" | "resolved";

export interface SupportMessage {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
  receivedAt: string;     // ISO timestamp
  status: SupportStatus;
  tags: string[];         // e.g. ["refund", "urgent"]
}

export interface SupportAdapter {
  listMessages(status?: SupportStatus): Promise<SupportMessage[]>;
  getMessage(id: string): Promise<SupportMessage | null>;
  getOpenCount(): Promise<number>;
}

// ─── Research ─────────────────────────────────────────────────────────────────

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface ResearchAdapter {
  search(query: string): Promise<ResearchResult[]>;
}
