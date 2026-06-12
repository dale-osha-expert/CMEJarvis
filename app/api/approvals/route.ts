import { NextRequest, NextResponse } from "next/server";
import { listProposedActions } from "@/lib/actions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const actions = await listProposedActions(status);
  return NextResponse.json(actions);
}
