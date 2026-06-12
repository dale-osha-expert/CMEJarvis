import { NextRequest, NextResponse } from "next/server";
import { getDailyBriefing, refreshDailyBriefing } from "@/lib/briefing";

export async function GET() {
  const briefing = await getDailyBriefing();
  return NextResponse.json(briefing);
}

export async function POST(request: NextRequest) {
  const { refresh } = await request.json().catch(() => ({ refresh: false }));
  const briefing = refresh ? await refreshDailyBriefing() : await getDailyBriefing();
  return NextResponse.json(briefing);
}
