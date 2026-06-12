/**
 * Shared utilities for stub timeseries generation.
 * Provides deterministic (date-seeded) values so the same date always produces the
 * same revenue/spend — essential for prior-year comparisons to look realistic.
 */

// FNV-1a 32-bit hash → normalized 0.0-1.0
export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h / 4294967295;
}

/** Generate all dates (YYYY-MM-DD) from startDate to endDate inclusive. */
export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cur = new Date(startDate + "T12:00:00Z");
  const end = new Date(endDate + "T12:00:00Z");
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Stub daily revenue — seeded per date.
 * Weekdays ~$1,100-$2,000 | Weekends ~$700-$1,300.
 * Day-of-week variation mirrors real ecommerce patterns.
 */
export function stubDailyRevenue(dateStr: string): number {
  const dow = new Date(dateStr + "T12:00:00Z").getUTCDay();
  const isWeekend = dow === 0 || dow === 6;
  const base = isWeekend ? 700 : 1100;
  const range = isWeekend ? 600 : 900;
  return Math.round(base + hashSeed(dateStr) * range);
}

/**
 * Stub daily ad spend — seeded per date.
 * ":spend" salt ensures different values from revenue for the same date.
 * Range: ~$100-$250/day.
 */
export function stubDailySpend(dateStr: string): number {
  return Math.round(100 + hashSeed(dateStr + ":spend") * 150);
}
