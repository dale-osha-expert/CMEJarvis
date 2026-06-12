/**
 * Research Agent — read-only web search for competitive intelligence, OSHA regs, market data.
 */
import type { Agent } from "./types";
import { researchAdapter } from "@/lib/adapters";

export const researchAgent: Agent = {
  name: "research",
  description: "Search for market intelligence, OSHA regulations, competitors, and industry trends",
  available: true,

  systemPrompt: `You are the Research Agent for CertifyMe.net.
You can search the web for information about:
- OSHA regulations and compliance requirements
- Forklift/equipment certification market trends
- Competitor pricing and positioning
- Industry news and opportunities
Synthesize search results clearly. Cite sources when possible.
You are STRICTLY read-only — you cannot take any actions.`,

  tools: [
    {
      definition: {
        name: "web_search",
        description: "Search the web for information relevant to CertifyMe.net operations",
        input_schema: {
          type: "object" as const,
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
      async execute(input) {
        const results = await researchAdapter.search(input.query as string);
        return JSON.stringify(results, null, 2);
      },
    },
  ],
};
