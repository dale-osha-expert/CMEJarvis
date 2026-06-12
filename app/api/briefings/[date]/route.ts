import { NextRequest, NextResponse } from "next/server";
import { getSpokenBriefing } from "@/lib/spoken-briefing";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const briefing = await getSpokenBriefing(date);
  if (!briefing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Don't expose fs path to client
  const { audioPath: _path, ...safe } = briefing;
  void _path;
  return NextResponse.json(safe);
}
