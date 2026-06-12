import { NextRequest, NextResponse } from "next/server";
import { supportAdapter } from "@/lib/adapters";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "open" | "pending_reply" | "resolved" | undefined;
  const messages = await supportAdapter.listMessages(status ?? undefined);
  return NextResponse.json(messages);
}
