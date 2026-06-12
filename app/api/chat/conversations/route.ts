import { NextResponse } from "next/server";
import { listConversations } from "@/lib/orchestrator";

export async function GET() {
  const conversations = await listConversations();
  return NextResponse.json(conversations);
}
