/**
 * Support Agent — reads support messages and proposes replies.
 * WRITE SAFETY: "send_reply" creates a ProposedAction (never sends directly).
 */
import type { Agent } from "./types";
import { supportAdapter } from "@/lib/adapters";
import { createProposedAction } from "@/lib/actions";

export const supportAgent: Agent = {
  name: "support",
  description: "Read and triage support messages; propose replies for operator approval",
  available: true,

  systemPrompt: `You are the Support Agent for CertifyMe.net.
You can read incoming support messages and suggest draft replies.
CRITICAL: You can NEVER send an email or reply directly.
When you want to reply, use the propose_reply tool — this queues the reply for operator approval.
Be empathetic, concise, and professional. Reference order numbers when available.
Escalate URGENT issues (e.g., angry customers, legal threats, bulk orders) clearly.`,

  tools: [
    {
      definition: {
        name: "list_support_messages",
        description: "List support messages, optionally filtered by status (open, pending_reply, resolved)",
        input_schema: {
          type: "object" as const,
          properties: {
            status: {
              type: "string",
              enum: ["open", "pending_reply", "resolved"],
              description: "Filter by status. Omit for all messages.",
            },
          },
          required: [],
        },
      },
      async execute(input) {
        const status = input.status as "open" | "pending_reply" | "resolved" | undefined;
        const messages = await supportAdapter.listMessages(status);
        return JSON.stringify(messages, null, 2);
      },
    },
    {
      definition: {
        name: "get_support_message",
        description: "Get the full content of a specific support message by ID",
        input_schema: {
          type: "object" as const,
          properties: {
            id: { type: "string", description: "Message ID" },
          },
          required: ["id"],
        },
      },
      async execute(input) {
        const message = await supportAdapter.getMessage(input.id as string);
        if (!message) return JSON.stringify({ error: "Message not found" });
        return JSON.stringify(message, null, 2);
      },
    },
    {
      definition: {
        name: "propose_reply",
        description:
          "Queue a draft reply to a support message for operator review. Does NOT send the reply — it must be approved first.",
        input_schema: {
          type: "object" as const,
          properties: {
            messageId: { type: "string", description: "ID of the message being replied to" },
            to: { type: "string", description: "Recipient email address" },
            subject: { type: "string", description: "Email subject" },
            body: { type: "string", description: "Full reply body" },
            summary: {
              type: "string",
              description: "One-sentence summary of what this reply does (shown in approvals list)",
            },
          },
          required: ["messageId", "to", "subject", "body", "summary"],
        },
      },
      async execute(input) {
        const action = await createProposedAction({
          agent: "support",
          type: "SEND_REPLY",
          summary: input.summary as string,
          payload: {
            messageId: input.messageId,
            to: input.to,
            subject: input.subject,
            body: input.body,
          },
        });
        return JSON.stringify({
          success: true,
          message: "Reply queued for operator approval.",
          actionId: action.id,
        });
      },
    },
  ],
};
