import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/orchestrator";

export async function POST(request: NextRequest) {
  const { message, conversationId } = await request.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const result = await chat(message, conversationId);
  return NextResponse.json(result);
}
