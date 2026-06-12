/**
 * Stub AnalyticsAdapter — returns realistic fake data.
 * REAL INTEGRATION: Replace with Shopify + Google Analytics 4 adapter.
 *   - Orders/revenue: Shopify Admin REST API (`/admin/api/orders.json`)
 *   - Traffic/sessions: GA4 Data API (analyticsdata.googleapis.com)
 *   - Refunds: Shopify `/admin/api/refunds.json`
 */
import type {
  AnalyticsAdapter,
  AnalyticsSummary,
  CourseBreakdown,
  DailyMetric,
  RevenueTimeseriesPoint,
} from "../types";
import { dateRange, stubDailyRevenue } from "../timeseries-utils";

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function generateDailyMetrics(days: number): DailyMetric[] {
  const metrics: DailyMetric[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0];
    const orders = randomBetween(8, 22);
    const refunds = randomBetween(0, 2);
    const avgPrice = randomBetween(99, 149);
    const sessions = randomBetween(120, 400);
    metrics.push({
      date,
      revenue: orders * avgPrice,
      orders,
      refunds,
      refundAmount: refunds * avgPrice,
      sessions,
      checkoutConversions: orders,
    });
  }
  return metrics;
}

export const stubAnalyticsAdapter: AnalyticsAdapter = {
  async getDailySummary(days: number): Promise<AnalyticsSummary> {
    const dailyMetrics = generateDailyMetrics(days);
    const totalRevenue = dailyMetrics.reduce((s, d) => s + d.revenue, 0);
    const totalOrders = dailyMetrics.reduce((s, d) => s + d.orders, 0);
    const totalSessions = dailyMetrics.reduce((s, d) => s + d.sessions, 0);
    const courseBreakdown = await this.getCourseBreakdown(days);
    return {
      dailyMetrics,
      courseBreakdown,
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      overallConversionRate: totalSessions > 0 ? totalOrders / totalSessions : 0,
    };
  },

  async getMetricsByDateRange(from: string, to: string): Promise<DailyMetric[]> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
    return generateDailyMetrics(days);
  },

  async getRevenueTimeseries(startDate: string, endDate: string): Promise<RevenueTimeseriesPoint[]> {
    return dateRange(startDate, endDate).map((date) => ({
      date,
      revenue: stubDailyRevenue(date),
    }));
  },

  async getCourseBreakdown(days: number): Promise<CourseBreakdown[]> {
    void days;
    return [
      { courseType: "Forklift Operator", orders: randomBetween(40, 70), revenue: randomBetween(5000, 9000) },
      { courseType: "Scissor Lift", orders: randomBetween(15, 30), revenue: randomBetween(2000, 4000) },
      { courseType: "Aerial Work Platform", orders: randomBetween(8, 18), revenue: randomBetween(1000, 2500) },
      { courseType: "Pallet Jack", orders: randomBetween(5, 12), revenue: randomBetween(500, 1200) },
      { courseType: "Boom Lift", orders: randomBetween(3, 9), revenue: randomBetween(400, 1000) },
    ];
  },
};
