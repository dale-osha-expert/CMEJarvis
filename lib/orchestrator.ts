/**
 * Jarvis Orchestrator — the top-level chat function.
 *
 * Uses the Anthropic SDK with tool-use to route user messages to the correct agent.
 * All agent tools are available to the model simultaneously.
 * Read tools execute directly; write tools create ProposedActions.
 * Conversations and messages are persisted to the DB.
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { ANTHROPIC_MODEL } from "@/lib/config";
import { AVAILABLE_AGENTS } from "@/lib/agents";
import type { Agent, AgentTool } from "@/lib/agents/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const today = new Date().toISOString().split("T")[0];

const JARVIS_SYSTEM_PROMPT = `You are Jarvis, the internal operations AI for CertifyMe.net — an online OSHA safety certification business.

## Business context
- Product: OSHA-compliant forklift and powered equipment certification, ~$59.95 per operator
- Customers: B2B (employers certifying crews of 5–50+ operators, AOV $200–$600) and B2C (individual operators, AOV ~$60)
- Funnel: paid search + social → landing page → checkout → instant digital certificate
- Peak demand: Q1 (new-hire waves, safety audits) and end-of-quarter compliance deadlines
- Primary growth lever: paid ads; organic is thin, so ROAS and blended efficiency matter a lot

## KPI benchmarks
- Orders/day: 10–25 healthy | <5 concerning | >40 exceptional
- Daily revenue: $600–$1,500 healthy | <$300 concerning
- Refund rate: <3% healthy | >7% investigate immediately
- Google Ads ROAS: ≥4x target | 2–4x acceptable | <2x underperforming
- Meta Ads ROAS: ≥3x target | 1.5–3x acceptable | <1.5x underperforming
- Blended ROAS (Google + Meta combined): ≥3x healthy | <2x concerning
- Google Search CTR: 6–10% healthy | <3% low
- Meta CTR: 1.5–3% healthy | <0.8% low
- CPA (cost per conversion): Google $15–20 target | Meta $12–18 target

## CRITICAL — conversion-tracking caveat
If a provider's ROAS is <1x while spend is significant (>$300 in the period), treat this as a LIKELY CONVERSION-TRACKING ISSUE first, not channel failure. Common causes: purchase event not firing, value not passed, cross-device attribution gap.
NEVER assert "this channel is failing" as a fact when ROAS looks implausibly low. Instead say:
  "ROAS shows X — this may reflect a tracking gap rather than true performance. Verify against the [Google/Meta] Ads UI before cutting spend."
Only treat low ROAS as confirmed waste when the platform's own UI agrees.

## Your style
- Opinionated and concise: give a recommendation, not a menu of options
- Quantify everything — use $ and %, not vague "significant" or "some"
- Flag risks proactively; don't wait to be asked "is this a problem?"
- Distinguish confidence levels: say "confident" or "this looks off — verify in the platform UI"
- For time comparisons, always state exact date ranges (e.g., "Jun 2–8 vs May 26–Jun 1")
- For write operations (budget changes, pausing creatives): use propose tools — these queue for approval, never execute immediately

## Tools available
- Analytics agent: revenue, orders, refunds, course breakdown, date-range queries
- Ads agent: get_ads_campaigns / get_ads_creatives (with date, sort, filter params), analyze_ad_performance (winners & wasters), detect_changes (what changed this period vs prior)
- Support agent: read support queue, propose replies
- Research agent: web search for market intel, regulations, competitors
- Traffic agent: get_organic_traffic (GA4 organic sessions/users, optional timeseries) and get_top_pages (Search Console top pages by clicks, with CTR and avg position)

Use analyze_ad_performance when asked "where am I wasting money", "what should I scale", or "give me a full account review."
Use detect_changes when asked "what changed", "what should I worry about", or "any surprises this week."
Use get_ads_campaigns with start_date/end_date + sort_by/min_spend/max_roas for specific campaign questions.
Use get_organic_traffic when asked "how's organic traffic", "how many sessions this week", or "is SEO improving".
Use get_top_pages when asked "what are my top pages", "which pages rank", or "find pages with low CTR I should fix".
Search Console data has a 2-3 day lag; use 28-day windows (default) for meaningful page-level volume.
Always confirm the date range your data covers.

Today: ${today}`;  // injected at server startup so the model always has the current date

// Build a flat tool registry from all available agents
function buildToolRegistry(): { tools: Anthropic.Tool[]; toolMap: Map<string, AgentTool> } {
  const tools: Anthropic.Tool[] = [];
  const toolMap = new Map<string, AgentTool>();

  for (const agent of AVAILABLE_AGENTS) {
    for (const agentTool of agent.tools) {
      tools.push(agentTool.definition);
      toolMap.set(agentTool.definition.name, agentTool);
    }
  }
  return { tools, toolMap };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResult {
  conversationId: string;
  reply: string;
}

/**
 * Send a message to Jarvis. Returns the assistant's reply.
 * If conversationId is provided, appends to that conversation; otherwise creates a new one.
 */
export async function chat(
  userMessage: string,
  conversationId?: string
): Promise<ChatResult> {
  const { tools, toolMap } = buildToolRegistry();

  // Load or create conversation
  let convo = conversationId
    ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  if (!convo) {
    convo = await prisma.conversation.create({
      data: {
        title: userMessage.slice(0, 60),
        messages: {
          create: [],
        },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  // Persist the user message
  await prisma.message.create({
    data: {
      conversationId: convo.id,
      role: "user",
      content: userMessage,
    },
  });

  // Build message history for the API call — cap at last 40 messages (20 turns) to control cost
  const MAX_HISTORY = 40;
  const rawHistory: Anthropic.MessageParam[] = convo.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const history: Anthropic.MessageParam[] = rawHistory.slice(-MAX_HISTORY);
  history.push({ role: "user", content: userMessage });

  // Agentic loop — keep calling the API until we get a stop_turn or hit a limit
  let finalReply = "";
  const MAX_ITERATIONS = 8;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: JARVIS_SYSTEM_PROMPT,
      tools,
      messages: history,
    });

    // Collect any text from this response turn
    const textBlocks = response.content.filter((b) => b.type === "text");
    if (textBlocks.length > 0) {
      finalReply = textBlocks.map((b) => (b as Anthropic.TextBlock).text).join("\n");
    }

    if (response.stop_reason === "end_turn") {
      break;
    }

    if (response.stop_reason === "tool_use") {
      // Add the assistant's turn (with tool_use blocks) to history
      history.push({ role: "assistant", content: response.content });

      // Execute each tool call and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const agentTool = toolMap.get(block.name);
        let resultContent: string;

        if (!agentTool) {
          resultContent = JSON.stringify({ error: `Unknown tool: ${block.name}` });
        } else {
          try {
            resultContent = await agentTool.execute(block.input as Record<string, unknown>);
          } catch (err) {
            resultContent = JSON.stringify({ error: String(err) });
          }
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: resultContent,
        });
      }

      // Add tool results and continue the loop
      history.push({ role: "user", content: toolResults });
      continue;
    }

    // Any other stop_reason (max_tokens, etc.) — break out
    break;
  }

  // Persist the assistant's final reply
  if (finalReply) {
    await prisma.message.create({
      data: {
        conversationId: convo.id,
        role: "assistant",
        content: finalReply,
      },
    });
  }

  return { conversationId: convo.id, reply: finalReply };
}

/** Load conversation history for display. */
export async function getConversation(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

/** List recent conversations. */
export async function listConversations(limit = 20) {
  return prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { messages: { take: 1, orderBy: { createdAt: "asc" } } },
  });
}
