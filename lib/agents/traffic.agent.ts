/**
 * Traffic Agent — read-only organic traffic and Search Console data.
 * SAFETY: all tools query GA4 and Search Console; no data is modified.
 */
import type { Agent } from "./types";
import { ga4Adapter } from "@/lib/adapters/ga4";
import { searchConsoleAdapter, SC_DAYS } from "@/lib/adapters/search-console";

function offsetDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export const trafficAgent: Agent = {
  name: "traffic",
  description: "Organic traffic from GA4 (sessions, users, trend) and top pages from Google Search Console",
  available: true,

  systemPrompt: `You are the Traffic Agent for CertifyMe.net.
You have access to GA4 organic traffic data and Search Console top-pages data.
Organic traffic = sessionDefaultChannelGroup = "Organic Search" in GA4.
Search Console data has a 2-3 day lag; use 28-day windows for meaningful volume.
Report exact date ranges for every metric. Flag opportunities (high impressions, low CTR = improve title/meta).
You are STRICTLY read-only — no data is modified.`,

  tools: [
    {
      definition: {
        name: "get_organic_traffic",
        description: "Get total organic sessions and users from GA4 for a date range. Use days or explicit start_date/end_date.",
        input_schema: {
          type: "object" as const,
          properties: {
            days: { type: "number", description: "Last N days (default 7). Ignored if start_date is provided." },
            start_date: { type: "string", description: "YYYY-MM-DD start" },
            end_date: { type: "string", description: "YYYY-MM-DD end (default: today)" },
            include_timeseries: { type: "boolean", description: "Also return per-day breakdown (default false)" },
          },
          required: [],
        },
      },
      async execute(input) {
        const days = (input.days as number) ?? 7;
        const endDate = (input.end_date as string | undefined) ?? offsetDate(0);
        const startDate = (input.start_date as string | undefined) ?? offsetDate(-(days - 1));
        const includeTimeseries = (input.include_timeseries as boolean) ?? false;

        const [summary, timeseries] = await Promise.all([
          ga4Adapter.getOrganicTraffic(startDate, endDate),
          includeTimeseries ? ga4Adapter.getOrganicTrafficTimeseries(startDate, endDate) : Promise.resolve(null),
        ]);

        return JSON.stringify({ summary, ...(timeseries ? { timeseries } : {}) }, null, 2);
      },
    },
    {
      definition: {
        name: "get_top_pages",
        description: `Get top pages by organic clicks from Google Search Console. Default window: last ${SC_DAYS} days (SC has 2-3 day lag). Use to answer "what are my top pages", "which pages get the most organic clicks", or "find pages with high impressions but low CTR".`,
        input_schema: {
          type: "object" as const,
          properties: {
            days: { type: "number", description: `Last N days (default ${SC_DAYS}). Ignored if start_date is provided.` },
            start_date: { type: "string", description: "YYYY-MM-DD start" },
            end_date: { type: "string", description: "YYYY-MM-DD end (default: 3 days ago to avoid SC lag)" },
            limit: { type: "number", description: "Max pages to return (default 10, max 25)" },
          },
          required: [],
        },
      },
      async execute(input) {
        const days = (input.days as number) ?? SC_DAYS;
        const endDate = (input.end_date as string | undefined) ?? offsetDate(-3);
        const startDate = (input.start_date as string | undefined) ?? offsetDate(-(days + 2));
        const limit = Math.min((input.limit as number) ?? 10, 25);
        const pages = await searchConsoleAdapter.getTopPages(startDate, endDate, limit);
        return JSON.stringify({ period: `${startDate} to ${endDate}`, count: pages.length, pages }, null, 2);
      },
    },
  ],
};
