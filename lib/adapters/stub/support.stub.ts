/**
 * Stub SupportAdapter — returns realistic fake support messages.
 * REAL INTEGRATION: Replace with Gmail API adapter (or Helpscout/Zendesk).
 *   - Gmail: googleapis.com/gmail/v1/users/me/messages
 *   - Filter by label "support" or specific inbox
 *   - Parse from/subject/body from message parts
 */
import type { SupportAdapter, SupportMessage, SupportStatus } from "../types";

const STUB_MESSAGES: SupportMessage[] = [
  {
    id: "msg_001",
    from: "john.smith@example.com",
    fromName: "John Smith",
    subject: "Certificate not received",
    body: "Hi, I completed my forklift certification course 3 days ago and still haven't received my certificate. Order #10482. Can you help?",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: "open",
    tags: ["certificate", "urgent"],
  },
  {
    id: "msg_002",
    from: "sarah.jones@example.com",
    fromName: "Sarah Jones",
    subject: "Discount code SAVE20 not working",
    body: "I'm trying to use the code SAVE20 at checkout for the scissor lift course and it says it's invalid. Please help!",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    status: "open",
    tags: ["billing", "discount"],
  },
  {
    id: "msg_003",
    from: "mike.r@constructionco.com",
    fromName: "Mike Rodriguez",
    subject: "Bulk purchase for 12 employees",
    body: "We need to certify 12 employees for forklift operation. Do you offer group pricing? We'd need certificates within 2 weeks.",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    status: "open",
    tags: ["bulk", "b2b", "opportunity"],
  },
  {
    id: "msg_004",
    from: "linda.k@warehouse.net",
    fromName: "Linda Kim",
    subject: "Re: Your reply",
    body: "Thank you, that resolved my issue. The certificate downloaded fine. Much appreciated!",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: "resolved",
    tags: [],
  },
  {
    id: "msg_005",
    from: "tom.b@logistics.com",
    fromName: "Tom Briggs",
    subject: "OSHA compliance question",
    body: "Does your forklift certification satisfy OSHA 29 CFR 1910.178(l) requirements? We're getting audited next month.",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: "pending_reply",
    tags: ["compliance", "osha"],
  },
];

export const stubSupportAdapter: SupportAdapter = {
  async listMessages(status?: SupportStatus): Promise<SupportMessage[]> {
    if (!status) return STUB_MESSAGES;
    return STUB_MESSAGES.filter((m) => m.status === status);
  },

  async getMessage(id: string): Promise<SupportMessage | null> {
    return STUB_MESSAGES.find((m) => m.id === id) ?? null;
  },

  async getOpenCount(): Promise<number> {
    return STUB_MESSAGES.filter((m) => m.status === "open").length;
  },
};
