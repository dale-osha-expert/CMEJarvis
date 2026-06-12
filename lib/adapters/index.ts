/**
 * Adapter registry — selects stub vs real based on USE_STUBS env flag.
 * Set USE_STUBS=true to force stubs. Default: real adapters when credentials present.
 */
import type { AnalyticsAdapter, SupportAdapter, ResearchAdapter } from "./types";
import { stubAnalyticsAdapter } from "./stub/analytics.stub";
import { stubSupportAdapter } from "./stub/support.stub";
import { stubResearchAdapter } from "./stub/research.stub";
import { realResearchAdapter } from "./research/research.real";

const useStubs = process.env.USE_STUBS === "true";

function resolveAdapter<T>(stub: T, real: T | null = null): T {
  if (useStubs || !real) return stub;
  return real;
}

export const analyticsAdapter: AnalyticsAdapter = resolveAdapter(stubAnalyticsAdapter);
export const supportAdapter: SupportAdapter = resolveAdapter(stubSupportAdapter);
// Research uses the same ANTHROPIC_API_KEY as the orchestrator — always use real when key is present
export const researchAdapter: ResearchAdapter =
  process.env.ANTHROPIC_API_KEY ? realResearchAdapter : stubResearchAdapter;

// Ads now uses provider pattern — import directly from lib/adapters/ads
export { adsService } from "./ads";

export type { AnalyticsAdapter, SupportAdapter, ResearchAdapter };
