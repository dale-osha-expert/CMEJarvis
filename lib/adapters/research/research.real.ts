/**
 * Real ResearchAdapter — live web search via Anthropic's built-in web_search_20250305 tool.
 *
 * SAFETY: Read-only. Makes API calls to Anthropic only — no external search credentials needed.
 * Anthropic executes the search server-side; this file handles the agentic loop.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { ResearchAdapter, ResearchResult } from "../types";
import { ANTHROPIC_MODEL } from "@/lib/config";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// web_search_20250305 is a server-side Anthropic tool — cast since SDK 0.36.x lacks the type
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
} as unknown as Anthropic.Tool;

const SYSTEM = `You are a research assistant for CertifyMe.net, an OSHA safety certification company.
Search the web for the user's query and return ONLY a JSON array — no other text, no markdown fences.
Format: [{"title":"...","url":"...","snippet":"...","publishedAt":"YYYY-MM-DD"}]
Include 4-8 results. Omit publishedAt when unknown. Focus on recent, authoritative sources.`;

export const realResearchAdapter: ResearchAdapter = {
  async search(query: string): Promise<ResearchResult[]> {
    try {
      const messages: Anthropic.MessageParam[] = [
        { role: "user", content: query },
      ];

      let text = "";
      for (let i = 0; i < 6; i++) {
        const response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 2000,
          system: SYSTEM,
          tools: [WEB_SEARCH_TOOL],
          messages,
        });

        // Collect text from this turn
        const textBlocks = response.content.filter((b) => b.type === "text");
        if (textBlocks.length > 0) {
          text = textBlocks.map((b) => (b as Anthropic.TextBlock).text).join("\n");
        }

        if (response.stop_reason === "end_turn") break;

        if (response.stop_reason === "tool_use") {
          // Append assistant turn (Anthropic has already executed the search server-side)
          messages.push({ role: "assistant", content: response.content });

          // Acknowledge tool_use blocks so the API allows the conversation to continue
          const toolResults: Anthropic.ToolResultBlockParam[] = response.content
            .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
            .map((b) => ({
              type: "tool_result" as const,
              tool_use_id: b.id,
              content: "",
            }));

          if (toolResults.length > 0) {
            messages.push({ role: "user", content: toolResults });
          }
        }
      }

      if (!text.trim()) return [];

      // Extract the JSON array from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ResearchResult[];
      }
      return [];
    } catch (err) {
      console.error("[Research] web search failed:", err);
      return [];
    }
  },
};
