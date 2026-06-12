/**
 * POST /api/cron/daily-briefing
 *
 * Triggers spoken briefing generation for today (or a given ?date=YYYY-MM-DD).
 * Idempotent: skips if already ready unless ?force=true.
 *
 * Auth: either a valid session cookie (for UI triggers) OR X-Cron-Secret header
 * (for external OS cron jobs/curl — no session cookie required).
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
  // Auth: X-Cron-Secret header OR valid session cookie
  const cronSecret = request.headers.get("x-cron-secret");
  const sessionCookie = request.cookies.get("jarvis_session");
  const envSecret = process.env.CRON_SECRET;

  const isCronAuthed = envSecret && cronSecret === envSecret;
  const isCookieAuthed = sessionCookie?.value === "authenticated";

  if (!isCronAuthed && !isCookieAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const result = await triggerBriefingGeneration(date, force);
  return NextResponse.json(result, { status: result.alreadyExists && !force ? 200 : 202 });
}
