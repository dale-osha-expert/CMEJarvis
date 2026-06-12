/**
 * Daily Briefing — assembles a morning report from analytics and ads adapters.
 * Result is cached in the DB for the day (re-generated on first access each day).
 *
 * PARKED: supportAdapter removed — see lib/adapters/stub/support.stub.ts if re-enabling.
 */
import { analyticsAdapter } from "@/lib/adapters";
import { adsService } from "@/lib/adapters/ads";
import { prisma } from "@/lib/prisma";

export interface BriefingData {
  date: string;
  revenue7d: number;
  orders7d: number;
  yesterdayRevenue: number;
  yesterdayOrders: number;
  adSpendYesterday: number;
  roasYesterday: number;
  bestCreative: { name: string; roas: number };
  worstCreative: { name: string; roas: number };
  topRecommendation: string;
  generatedAt: string;
}

async function generateBriefing(date: string): Promise<BriefingData> {
  const [summary7d, adsCombined] = await Promise.all([
    analyticsAdapter.getDailySummary(7),
    adsService.getCombinedSummary(1),
  ]);

  const yesterday = summary7d.dailyMetrics[summary7d.dailyMetrics.length - 1];
  const bestCreative = adsCombined.topCreatives[0] ?? { name: "N/A", roas: 0 };
  const worstCreative = adsCombined.worstCreative ?? { name: "N/A", roas: 0 };

  let topRecommendation = "No specific recommendation today.";
  if (bestCreative.roas > 5) {
    topRecommendation = `Scale '${bestCreative.name}' creative — ROAS ${bestCreative.roas.toFixed(1)}x. Consider increasing budget.`;
  } else if (worstCreative.roas < 2 && worstCreative.name !== "N/A") {
    topRecommendation = `Pause '${worstCreative.name}' creative — ROAS ${worstCreative.roas.toFixed(1)}x is below break-even.`;
  }

  return {
    date,
    revenue7d: summary7d.totalRevenue,
    orders7d: summary7d.totalOrders,
    yesterdayRevenue: yesterday?.revenue ?? 0,
    yesterdayOrders: yesterday?.orders ?? 0,
    adSpendYesterday: adsCombined.totalSpend,
    roasYesterday: adsCombined.blendedRoas,
    bestCreative: { name: bestCreative.name, roas: bestCreative.roas },
    worstCreative: { name: worstCreative.name, roas: worstCreative.roas },
    topRecommendation,
    generatedAt: new Date().toISOString(),
  };
}

/** Get today's briefing, generating and caching if needed. */
export async function getDailyBriefing(): Promise<BriefingData> {
  const today = new Date().toISOString().split("T")[0];

  const cached = await prisma.dailyBriefing.findUnique({ where: { date: today } });
  if (cached) {
    return JSON.parse(cached.content) as BriefingData;
  }

  const briefing = await generateBriefing(today);

  await prisma.dailyBriefing.upsert({
    where: { date: today },
    create: { date: today, content: JSON.stringify(briefing) },
    update: { content: JSON.stringify(briefing), generatedAt: new Date() },
  });

  return briefing;
}

/** Force-refresh today's briefing (bypasses cache). */
export async function refreshDailyBriefing(): Promise<BriefingData> {
  const today = new Date().toISOString().split("T")[0];
  const briefing = await generateBriefing(today);
  await prisma.dailyBriefing.upsert({
    where: { date: today },
    create: { date: today, content: JSON.stringify(briefing) },
    update: { content: JSON.stringify(briefing), generatedAt: new Date() },
  });
  return briefing;
}
