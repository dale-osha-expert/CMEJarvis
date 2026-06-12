/**
 * Agent type definitions.
 * Each agent has a name, a system prompt (role), and a set of tool definitions
 * that can be invoked by the orchestrator via the Anthropic tool-use API.
 */
import type Anthropic from "@anthropic-ai/sdk";

export interface AgentTool {
  definition: Anthropic.Tool;
  // The actual function to call — receives the tool_input and returns a result string
  execute: (input: Record<string, unknown>) => Promise<string>;
}

export interface Agent {
  name: string;
  description: string;
  systemPrompt: string;
  tools: AgentTool[];
  available: boolean; // false = "coming soon" stub
}
