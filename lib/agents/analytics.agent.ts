/**
 * Analytics Agent — read-only access to revenue, orders, traffic, and course data.
 * All tools are read operations; no proposed actions are generated here.
 */
import type { Agent } from "./types";
import { analyticsAdapter } from "@/lib/adapters";

export const analyticsAgent: Agent = {
  name: "analytics",
  description: "Revenue, orders, traffic, refunds, and course performance data",
  available: true,

  systemPrompt: `You are the Analytics Agent for CertifyMe.net, an online OSHA certification business.
You have access to sales data, traffic metrics, course performance, and refund information.
Report numbers clearly. Highlight trends, anomalies, and opportunities.
Always specify the time period for any metric you report.
You can ONLY read data — you cannot modify anything.`,

  tools: [
    {
      definition: {
        name: "get_analytics_summary",
        description: "Get a summary of revenue, orders, refunds, traffic, and conversion rate for the last N days",
        input_schema: {
          type: "object" as const,
          properties: {
            days: {
              type: "number",
              description: "Number of days to include (default 7)",
            },
          },
          required: [],
        },
      },
      async execute(input) {
        const days = (input.days as number) ?? 7;
        const summary = await analyticsAdapter.getDailySummary(days);
        return JSON.stringify(summary, null, 2);
      },
    },
    {
      definition: {
        name: "get_course_breakdown",
        description: "Get orders and revenue broken down by course type",
        input_schema: {
          type: "object" as const,
          properties: {
            days: {
              type: "number",
              description: "Number of days to include (default 7)",
            },
          },
          required: [],
        },
      },
      async execute(input) {
        const days = (input.days as number) ?? 7;
        const breakdown = await analyticsAdapter.getCourseBreakdown(days);
        return JSON.stringify(breakdown, null, 2);
      },
    },
    {
      definition: {
        name: "get_metrics_by_date_range",
        description: "Get daily metrics for a specific date range",
        input_schema: {
          type: "object" as const,
          properties: {
            from: { type: "string", description: "Start date YYYY-MM-DD" },
            to: { type: "string", description: "End date YYYY-MM-DD" },
          },
          required: ["from", "to"],
        },
      },
      async execute(input) {
        const metrics = await analyticsAdapter.getMetricsByDateRange(
          input.from as string,
          input.to as string
        );
        return JSON.stringify(metrics, null, 2);
      },
    },
  ],
};
