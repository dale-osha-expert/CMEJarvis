import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { getSpokenBriefing } from "@/lib/spoken-briefing";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const briefing = await getSpokenBriefing(date);

  if (!briefing || briefing.status !== "ready" || !briefing.audioPath) {
    return NextResponse.json(
      { error: briefing ? `Briefing status: ${briefing.status}` : "Not found" },
      { status: briefing ? 409 : 404 }
    );
  }

  const buffer = await fs.readFile(briefing.audioPath).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "Audio file missing" }, { status: 404 });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": briefing.mimeType ?? "audio/wav",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "private, max-age=86400",
      "Accept-Ranges": "bytes",
    },
  });
}
