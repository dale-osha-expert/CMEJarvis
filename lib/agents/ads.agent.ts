/**
 * Ads Agent — per-provider and combined ad performance, plus proposed actions.
 * WRITE SAFETY: propose_budget_change and propose_pause_creative create ProposedActions — never execute directly.
 *
 * Tool naming convention:
 *   get_ads_*         — fetch raw data; support date/filter/sort params
 *   analyze_*         — derived analysis across both providers
 *   detect_*          — change detection vs a prior period
 *   propose_*         — queued write actions (require operator approval)
 */
import type { Agent } from "./types";
import { adsService } from "@/lib/adapters/ads";
import { createProposedAction } from "@/lib/actions";

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Offset today by N days; returns YYYY-MM-DD. */
function offsetDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Agent definition ─────────────────────────────────────────────────────────

export const adsAgent: Agent = {
  name: "ads",
  description: "Ad spend, ROAS, campaign and creative performance across Google Ads and Meta; analyze winners/wasters; detect changes vs prior period; propose budget changes",
  available: true,

  systemPrompt: `You are the Ads Agent for CertifyMe.net.
You analyze performance across Google Ads and Meta Ads and return data to the orchestrator.
All data is read-only. Use propose_budget_change / propose_pause_creative to queue write actions.
For date-range comparisons, the orchestrator will supply explicit start_date/end_date values.
Target ROAS: Google ≥4x, Meta ≥3x, blended ≥3x.`,

  tools: [
    // ── Combined + provider summaries ────────────────────────────────────────
    {
      definition: {
        name: "get_ads_combined_summary",
        description: "Get combined spend, revenue, ROAS, and impressions across Google + Meta. Use days OR explicit start_date/end_date.",
        input_schema: {
          type: "object" as const,
          properties: {
            days: { type: "number", description: "Last N days (default 7). Ignored if start_date is provided." },
            start_date: { type: "string", description: "YYYY-MM-DD start (inclusive). Use with end_date for comparisons." },
            end_date: { type: "string", description: "YYYY-MM-DD end (inclusive)." },
          },
          required: [],
        },
      },
      async execute(input) {
        const days = (input.days as number) ?? 7;
        const summary = await adsService.getCombinedSummary(days);
        return JSON.stringify(summary, null, 2);
      },
    },
    {
      definition: {
        name: "get_ads_provider_summary",
        description: "Get spend, revenue, ROAS, clicks, conversions for a single provider (google or meta).",
        input_schema: {
          type: "object" as const,
          properties: {
            provider: { type: "string", enum: ["google", "meta"], description: "Which platform" },
            days: { type: "number", description: "Last N days (default 7)" },
          },
          required: ["provider"],
        },
      },
      async execute(input) {
        const summary = await adsService.getProviderSummary(
          input.provider as "google" | "meta",
          (input.days as number) ?? 7
        );
        return JSON.stringify(summary, null, 2);
      },
    },

    // ── Campaign list with filtering / sorting ────────────────────────────────
    {
      definition: {
        name: "get_ads_campaigns",
        description: [
          "Fetch campaign-level spend, ROAS, revenue, CTR, conversions for one or both providers.",
          "Supports explicit date ranges for period comparisons (e.g. this week vs last week).",
          "Use min_spend and max_roas to filter to underperformers; sort_by='spend' for biggest spenders.",
          "For 'campaigns over $500 this week with ROAS < 1': provider=all, start_date=Monday, end_date=today, min_spend=500, max_roas=1.",
        ].join(" "),
        input_schema: {
          type: "object" as const,
          properties: {
            provider: { type: "string", enum: ["google", "meta", "all"], description: "'all' fetches both providers" },
            days: { type: "number", description: "Last N days. Ignored if start_date is provided." },
            start_date: { type: "string", description: "YYYY-MM-DD. Use for explicit date ranges or comparisons." },
            end_date: { type: "string", description: "YYYY-MM-DD end date (inclusive)." },
            sort_by: { type: "string", enum: ["spend", "roas", "revenue", "conversions"], description: "Sort descending by this field (default: spend)" },
            limit: { type: "number", description: "Max campaigns to return (default 20, max 200)" },
            min_spend: { type: "number", description: "Only include campaigns with spend >= this value" },
            max_roas: { type: "number", description: "Only include campaigns with ROAS <= this value (use to find underperformers)" },
            min_roas: { type: "number", description: "Only include campaigns with ROAS >= this value (use to find top performers)" },
          },
          required: ["provider"],
        },
      },
      async execute(input) {
        const days = (input.days as number) ?? 7;
        const provider = input.provider as string;
        const startDate = input.start_date as string | undefined;
        const endDate = (input.end_date as string | undefined) ?? offsetDate(0);

        let campaigns = provider === "all"
          ? startDate
            ? [
                ...await adsService.getProviderCampaignsByDateRange("google", startDate, endDate),
                ...await adsService.getProviderCampaignsByDateRange("meta", startDate, endDate),
              ]
            : (await adsService.getCombinedSummary(days)).allCampaigns
          : startDate
            ? await adsService.getProviderCampaignsByDateRange(provider as "google" | "meta", startDate, endDate)
            : await adsService.getProviderCampaigns(provider as "google" | "meta", days);

        // Filters
        if (typeof input.min_spend === "number") campaigns = campaigns.filter((c) => c.spend >= (input.min_spend as number));
        if (typeof input.max_roas === "number") campaigns = campaigns.filter((c) => c.roas <= (input.max_roas as number));
        if (typeof input.min_roas === "number") campaigns = campaigns.filter((c) => c.roas >= (input.min_roas as number));

        // Sort
        const sortBy = (input.sort_by as string) ?? "spend";
        campaigns = [...campaigns].sort((a, b) => {
          const field = sortBy as keyof typeof a;
          return (b[field] as number) - (a[field] as number);
        });

        // Limit
        const limit = Math.min((input.limit as number) ?? 20, 200);
        campaigns = campaigns.slice(0, limit);

        return JSON.stringify(
          { period: startDate ? `${startDate} to ${endDate}` : `last ${days} days`, count: campaigns.length, campaigns },
          null, 2
        );
      },
    },

    // ── Creative list with filtering / sorting ────────────────────────────────
    {
      definition: {
        name: "get_ads_creatives",
        description: [
          "Fetch ad-level (creative) spend, ROAS, impressions, CTR for one or both providers.",
          "Same date/filter/sort params as get_ads_campaigns.",
          "Use to find the best- and worst-performing individual ads.",
        ].join(" "),
        input_schema: {
          type: "object" as const,
          properties: {
            provider: { type: "string", enum: ["google", "meta", "all"] },
            days: { type: "number", description: "Last N days. Ignored if start_date is provided." },
            start_date: { type: "string", description: "YYYY-MM-DD" },
            end_date: { type: "string", description: "YYYY-MM-DD" },
            sort_by: { type: "string", enum: ["spend", "roas", "revenue", "conversions"] },
            limit: { type: "number", description: "Max creatives (default 20, max 200)" },
            min_spend: { type: "number" },
            max_roas: { type: "number" },
            min_roas: { type: "number" },
          },
          required: ["provider"],
        },
      },
      async execute(input) {
        const days = (input.days as number) ?? 7;
        const provider = input.provider as string;
        const startDate = input.start_date as string | undefined;
        const endDate = (input.end_date as string | undefined) ?? offsetDate(0);

        let creatives = provider === "all"
          ? startDate
            ? [
                ...await adsService.getProviderCreativesByDateRange("google", startDate, endDate),
                ...await adsService.getProviderCreativesByDateRange("meta", startDate, endDate),
              ]
            : (await adsService.getCombinedSummary(days)).allCreatives
          : startDate
            ? await adsService.getProviderCreativesByDateRange(provider as "google" | "meta", startDate, endDate)
            : await adsService.getProviderCreatives(provider as "google" | "meta", days);

        if (typeof input.min_spend === "number") creatives = creatives.filter((c) => c.spend >= (input.min_spend as number));
        if (typeof input.max_roas === "number") creatives = creatives.filter((c) => c.roas <= (input.max_roas as number));
        if (typeof input.min_roas === "number") creatives = creatives.filter((c) => c.roas >= (input.min_roas as number));

        const sortBy = (input.sort_by as string) ?? "spend";
        creatives = [...creatives].sort((a, b) => {
          const field = sortBy as keyof typeof a;
          return (b[field] as number) - (a[field] as number);
        });

        const limit = Math.min((input.limit as number) ?? 20, 200);
        creatives = creatives.slice(0, limit);

        return JSON.stringify(
          { period: startDate ? `${startDate} to ${endDate}` : `last ${days} days`, count: creatives.length, creatives },
          null, 2
        );
      },
    },

    // ── Part C: Winners & wasters analysis ───────────────────────────────────
    {
      definition: {
        name: "analyze_ad_performance",
        description: [
          "Pull ALL campaigns across Google + Meta for the date range and return two ranked lists:",
          "  scaleCandidates: campaigns with high ROAS and meaningful spend (worth increasing budget on)",
          "  cutCandidates: campaigns with low ROAS and meaningful spend (burning money)",
          "Also returns blended totals and a conversionTrackingNote when ROAS looks implausibly low.",
          "Use when asked: 'where am I wasting money', 'what should I scale', 'full account review'.",
          "If no dates provided, defaults to last 7 days.",
        ].join(" "),
        input_schema: {
          type: "object" as const,
          properties: {
            start_date: { type: "string", description: "YYYY-MM-DD start (default: 7 days ago)" },
            end_date: { type: "string", description: "YYYY-MM-DD end (default: today)" },
            days: { type: "number", description: "Convenience shorthand for last N days (default 7). Ignored if start_date is provided." },
          },
          required: [],
        },
      },
      async execute(input) {
        const days = (input.days as number) ?? 7;
        const endDate = (input.end_date as string | undefined) ?? offsetDate(0);
        const startDate = (input.start_date as string | undefined) ?? offsetDate(-days + 1);
        const analysis = await adsService.analyzeAdPerformance(startDate, endDate);
        return JSON.stringify(analysis, null, 2);
      },
    },

    // ── Part D: Change detection ──────────────────────────────────────────────
    {
      definition: {
        name: "detect_changes",
        description: [
          "Compare recent period vs prior equivalent period across both providers.",
          "Surfaces: spend spikes, ROAS drops, cratered campaigns, new spenders, paused campaigns.",
          "Use when asked: 'what changed', 'what should I worry about', 'any surprises this week'.",
          "Default: compares last 7 days vs the 7 days before that.",
          "For 'this week vs last week': supply recent_start/recent_end = this week's Mon–Sun, prior dates = previous week.",
        ].join(" "),
        input_schema: {
          type: "object" as const,
          properties: {
            days: {
              type: "number",
              description: "Window size in days for both periods (default 7). Periods are automatically computed as [today-days+1..today] vs [today-2*days+1..today-days]. Ignored if explicit dates provided.",
            },
            recent_start: { type: "string", description: "YYYY-MM-DD start of the recent period" },
            recent_end: { type: "string", description: "YYYY-MM-DD end of the recent period" },
            prior_start: { type: "string", description: "YYYY-MM-DD start of the comparison period" },
            prior_end: { type: "string", description: "YYYY-MM-DD end of the comparison period" },
          },
          required: [],
        },
      },
      async execute(input) {
        const days = (input.days as number) ?? 7;
        const recentEnd = (input.recent_end as string | undefined) ?? offsetDate(0);
        const recentStart = (input.recent_start as string | undefined) ?? offsetDate(-days + 1);
        const priorEnd = (input.prior_end as string | undefined) ?? offsetDate(-days);
        const priorStart = (input.prior_start as string | undefined) ?? offsetDate(-days * 2 + 1);
        const report = await adsService.detectChanges(recentStart, recentEnd, priorStart, priorEnd);
        return JSON.stringify(report, null, 2);
      },
    },

    // ── Propose write actions (queued for approval) ───────────────────────────
    {
      definition: {
        name: "propose_budget_change",
        description: "Queue a daily budget change for operator approval. Never executes immediately.",
        input_schema: {
          type: "object" as const,
          properties: {
            provider: { type: "string", enum: ["google", "meta"] },
            campaignId: { type: "string" },
            campaignName: { type: "string" },
            currentBudget: { type: "number" },
            proposedBudget: { type: "number" },
            reason: { type: "string" },
          },
          required: ["provider", "campaignId", "campaignName", "currentBudget", "proposedBudget", "reason"],
        },
      },
      async execute(input) {
        const diff = (input.proposedBudget as number) - (input.currentBudget as number);
        const direction = diff > 0 ? "Increase" : "Decrease";
        const action = await createProposedAction({
          agent: "ads",
          type: "CHANGE_BUDGET",
          summary: `${direction} daily budget on '${input.campaignName}' (${input.provider}) from $${input.currentBudget} to $${input.proposedBudget}`,
          payload: input,
        });
        return JSON.stringify({ success: true, actionId: action.id });
      },
    },
    {
      definition: {
        name: "propose_pause_creative",
        description: "Queue a creative pause for operator approval. Never executes immediately.",
        input_schema: {
          type: "object" as const,
          properties: {
            provider: { type: "string", enum: ["google", "meta"] },
            creativeId: { type: "string" },
            creativeName: { type: "string" },
            reason: { type: "string" },
          },
          required: ["provider", "creativeId", "creativeName", "reason"],
        },
      },
      async execute(input) {
        const action = await createProposedAction({
          agent: "ads",
          type: "PAUSE_CREATIVE",
          summary: `Pause '${input.creativeName}' on ${input.provider}`,
          payload: input,
        });
        return JSON.stringify({ success: true, actionId: action.id });
      },
    },
  ],
};
