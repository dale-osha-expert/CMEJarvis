import { NextRequest, NextResponse } from "next/server";
import { adsService } from "@/lib/adapters/ads";

function subDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (provider !== "google" && provider !== "meta") {
    return NextResponse.json({ error: `Unknown provider "${provider}". Use google or meta.` }, { status: 400 });
  }

  const days = Math.min(30, Math.max(1, parseInt(request.nextUrl.searchParams.get("days") ?? "7")));

  const today = new Date();
  const endDate = toISO(today);
  const startDate = toISO(subDays(today, days - 1));

  const points = await adsService.getProviderDailyMetrics(provider, startDate, endDate);

  return NextResponse.json(
    points.map((pt) => ({
      date: pt.date,
      displayDate: formatDisplayDate(pt.date),
      spend: pt.spend,
      roas: pt.roas, // null = no purchases → gap in chart
    }))
  );
}
