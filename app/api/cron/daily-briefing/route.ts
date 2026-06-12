/**
 * POST /api/cron/daily-briefing
 *
 * Triggers spoken briefing generation for today (or a given ?date=YYYY-MM-DD).
 * Idempotent: skips if already ready unless ?force=true.
 *
 * Auth: X-Cron-Secret header only. This is the sole application-level gate
 * remaining after login was removed — it prevents unauthenticated external
 * callers from triggering paid TTS generation.
 *
 * Example cron job (Linux/Mac, runs at 1 AM ET):
 *   0 1 * * * curl -s -X POST "https://your-server/api/cron/daily-briefing" \
 *     -H "X-Cron-Secret: $CRON_SECRET"
 *
 * Manual trigger:
 *   curl -X POST "http://localhost:3000/api/cron/daily-briefing?force=true" \
 *     -H "X-Cron-Secret: YOUR_CRON_SECRET"
 */
import { NextRequest, NextResponse } from "next/server";
import { triggerBriefingGeneration } from "@/lib/spoken-briefing";

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  const envSecret = process.env.CRON_SECRET;

  if (!envSecret || cronSecret !== envSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const result = await triggerBriefingGeneration(date, force);
  return NextResponse.json(result, { status: result.alreadyExists && !force ? 200 : 202 });
}
