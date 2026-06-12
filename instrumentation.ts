/**
 * Next.js instrumentation hook — runs once at server startup.
 * Schedules the daily spoken briefing via node-cron.
 *
 * The cron job runs daily at 01:00 in BRIEFING_TIMEZONE (default: America/New_York).
 *
 * Alternatively, skip this and use an OS-level crontab hitting the API endpoint:
 *   0 1 * * * curl -s -X POST "https://your-server/api/cron/daily-briefing" \
 *     -H "X-Cron-Secret: $CRON_SECRET"
 */

export async function register() {
  // Only run in the Node.js runtime (not Edge), and not during build
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { default: cron } = await import("node-cron");
  const { triggerBriefingGeneration } = await import("@/lib/spoken-briefing");

  const timezone = process.env.BRIEFING_TIMEZONE ?? "America/New_York";

  cron.schedule(
    "0 1 * * *",
    async () => {
      const today = new Date().toISOString().split("T")[0];
      console.log(`[cron] Generating daily spoken briefing for ${today}…`);
      try {
        await triggerBriefingGeneration(today, false);
        console.log(`[cron] Briefing generation triggered for ${today}`);
      } catch (err) {
        console.error(`[cron] Failed to trigger briefing:`, err);
      }
    },
    { timezone }
  );

  console.log(`[instrumentation] Daily briefing cron scheduled at 01:00 ${timezone}`);
}
