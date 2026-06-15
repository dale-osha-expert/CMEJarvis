import { analyticsAgent } from "./analytics.agent";
import { supportAgent } from "./support.agent";
import { adsAgent } from "./ads.agent";
import { researchAgent } from "./research.agent";
import { trafficAgent } from "./traffic.agent";
import { contentAgent } from "./content.agent";
import { devAgent } from "./dev.agent";
import type { Agent } from "./types";

export const ALL_AGENTS: Agent[] = [
  analyticsAgent,
  supportAgent,
  adsAgent,
  researchAgent,
  trafficAgent,
  contentAgent,
  devAgent,
];

export const AVAILABLE_AGENTS = ALL_AGENTS.filter((a) => a.available);

export function getAgent(name: string): Agent | undefined {
  return ALL_AGENTS.find((a) => a.name === name);
}

export type { Agent };
