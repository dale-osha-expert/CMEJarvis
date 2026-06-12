/**
 * Action / Approval model.
 * Agents call createProposedAction() to queue write operations.
 * The operator approves/rejects via the /approvals UI.
 * In this pass, "execute" just marks the action as executed (no real side effects).
 * REAL INTEGRATION: executeAction() will dispatch to actual services.
 */
import { prisma } from "@/lib/prisma";

export interface CreateActionInput {
  agent: string;
  type: string;
  summary: string;
  payload: Record<string, unknown>;
}

export async function createProposedAction(input: CreateActionInput) {
  return prisma.proposedAction.create({
    data: {
      agent: input.agent,
      type: input.type,
      summary: input.summary,
      payload: JSON.stringify(input.payload),
    },
  });
}

export async function listProposedActions(status?: string) {
  return prisma.proposedAction.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function getProposedAction(id: string) {
  return prisma.proposedAction.findUnique({ where: { id } });
}

export async function approveAction(id: string, notes?: string) {
  return prisma.proposedAction.update({
    where: { id },
    data: { status: "approved", notes: notes ?? null, updatedAt: new Date() },
  });
}

export async function rejectAction(id: string, notes?: string) {
  return prisma.proposedAction.update({
    where: { id },
    data: { status: "rejected", notes: notes ?? null, updatedAt: new Date() },
  });
}

/**
 * Execute an approved action.
 * Currently just marks it as executed.
 * REAL INTEGRATION: dispatch based on action.type to real services:
 *   SEND_REPLY    → Gmail API send
 *   CHANGE_BUDGET → Facebook/Google Ads API
 *   PAUSE_CREATIVE → Facebook/Google Ads API
 */
export async function executeAction(id: string) {
  const action = await prisma.proposedAction.findUnique({ where: { id } });
  if (!action) throw new Error(`Action ${id} not found`);
  if (action.status !== "approved") throw new Error(`Action ${id} is not approved (status: ${action.status})`);

  // TODO: dispatch action.type to real services
  // switch (action.type) {
  //   case "SEND_REPLY": await gmailSend(JSON.parse(action.payload)); break;
  //   case "CHANGE_BUDGET": await facebookApi.updateBudget(...); break;
  // }

  return prisma.proposedAction.update({
    where: { id },
    data: { status: "executed", updatedAt: new Date() },
  });
}
