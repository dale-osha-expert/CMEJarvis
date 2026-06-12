import { NextRequest, NextResponse } from "next/server";
import { analyticsAdapter } from "@/lib/adapters";
import { adsService } from "@/lib/adapters/ads";

// COMPARISON_OFFSET: 364 days = 52 weeks — preserves day-of-week for ecommerce/ads analysis.
// Change to 365 for exact same calendar date regardless of day-of-week alignment.
const COMPARISON_OFFSET = 364;

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatPriorDisplayDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export async function GET(request: NextRequest) {
  const days = Math.min(30, Math.max(1, parseInt(request.nextUrl.searchParams.get("days") ?? "7")));

  const today = new Date();
  const endDate = toISO(today);
  const startDate = toISO(subDays(today, days - 1));
  const priorEndDate = toISO(subDays(today, COMPARISON_OFFSET));
  const priorStartDate = toISO(subDays(today, COMPARISON_OFFSET + days - 1));

  const [currentRevSeries, priorRevSeries, adSpendSeries] = await Promise.all([
    analyticsAdapter.getRevenueTimeseries(startDate, endDate),
    analyticsAdapter.getRevenueTimeseries(priorStartDate, priorEndDate),
    adsService.getSpendTimeseries(startDate, endDate),
  ]);

  // Build a spend lookup by date for O(1) access
  const spendByDate = new Map(adSpendSeries.map((p) => [p.date, p.spend]));

  // Align revenue series by index (index 0 = earliest day, index days-1 = today)
  const entries = currentRevSeries.map((cur, i) => {
    const prior = priorRevSeries[i] ?? { date: "", revenue: 0 };
    return {
      date: cur.date,
      displayDate: formatDisplayDate(cur.date),
      priorDate: prior.date,
      priorDisplayDate: prior.date ? formatPriorDisplayDate(prior.date) : "",
      currentRevenue: cur.revenue,
      priorRevenue: prior.revenue,
      adSpend: spendByDate.get(cur.date) ?? 0,
    };
  });

  return NextResponse.json(entries);
}
