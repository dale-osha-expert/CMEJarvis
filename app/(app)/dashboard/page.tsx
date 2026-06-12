import { getDailyBriefing } from "@/lib/briefing";
import { adsService } from "@/lib/adapters/ads";
import Link from "next/link";
import JarvisSummary from "@/components/JarvisSummary";
import RevenueChart from "@/components/RevenueChart";

// PARKED: support and approvals widgets are removed from the dashboard.
// The underlying code (lib/adapters/support, lib/agents/support, lib/actions,
// ProposedAction table) is intact — restore when write-actions are re-enabled.

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function RoasBadge({ roas }: { roas: number }) {
  const color =
    roas >= 6 ? "text-emerald-400" : roas >= 4 ? "text-green-400" : roas >= 2.5 ? "text-yellow-400" : "text-red-400";
  return <span className={`font-bold tabular-nums ${color}`}>{roas.toFixed(1)}x</span>;
}

export default async function DashboardPage() {
  const [briefing, adsCombined] = await Promise.all([
    getDailyBriefing(),
    adsService.getCombinedSummary(7),
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Good morning</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Link
          href="/chat"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Ask Jarvis
        </Link>
      </div>

      {/* Jarvis Summary button */}
      <JarvisSummary />

      {/* Revenue + Spend chart */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Revenue vs Prior Year · Ad Spend — Last 7 Days
        </h2>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <RevenueChart days={7} />
        </div>
      </section>

      {/* Top recommendation */}
      {briefing.topRecommendation && (
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-1">
            Today&apos;s Recommendation
          </p>
          <p className="text-white">{briefing.topRecommendation}</p>
        </div>
      )}

      {/* Revenue KPIs */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Revenue — Last 7 Days
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="7-Day Revenue" value={fmt(briefing.revenue7d)} />
          <KpiCard label="7-Day Orders" value={briefing.orders7d.toString()} />
          <KpiCard label="Yesterday Revenue" value={fmt(briefing.yesterdayRevenue)} />
          <KpiCard label="Yesterday Orders" value={briefing.yesterdayOrders.toString()} />
        </div>
      </section>

      {/* Ads Snapshot */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Ads Snapshot — Last 7 Days
          </h2>
          <Link href="/ads" className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
            Full breakdown →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <KpiCard label="Total Spend" value={fmt(adsCombined.totalSpend)} />
          <KpiCard label="Total Revenue" value={fmt(adsCombined.totalRevenue)} />
          <KpiCard label="Blended ROAS" value={`${adsCombined.blendedRoas.toFixed(1)}x`} />
          <KpiCard label="Conversions" value={adsCombined.totalConversions.toString()} />
        </div>

        {/* Top / bottom creative row */}
        <div className="grid md:grid-cols-2 gap-3">
          {adsCombined.topCreatives[0] && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">
                Best Creative
              </p>
              <p className="text-white font-medium text-sm">{adsCombined.topCreatives[0].name}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {adsCombined.topCreatives[0].provider} ·{" "}
                <RoasBadge roas={adsCombined.topCreatives[0].roas} /> ROAS ·{" "}
                {fmt(adsCombined.topCreatives[0].spend)} spend
              </p>
            </div>
          )}
          {adsCombined.worstCreative && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">
                Weakest Creative
              </p>
              <p className="text-white font-medium text-sm">{adsCombined.worstCreative.name}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {adsCombined.worstCreative.provider} ·{" "}
                <RoasBadge roas={adsCombined.worstCreative.roas} /> ROAS ·{" "}
                {fmt(adsCombined.worstCreative.spend)} spend
              </p>
            </div>
          )}
        </div>

        {/* All campaigns mini-table */}
        <div className="mt-3 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-700">
                <th className="px-4 py-2 font-medium">Campaign</th>
                <th className="px-4 py-2 font-medium">Platform</th>
                <th className="px-4 py-2 font-medium text-right">Spend</th>
                <th className="px-4 py-2 font-medium text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {adsCombined.allCampaigns.map((c) => (
                <tr key={c.id} className="text-slate-300">
                  <td className="px-4 py-2.5 text-white text-sm">{c.name}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium uppercase ${
                        c.provider === "google"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-indigo-500/20 text-indigo-300"
                      }`}
                    >
                      {c.provider}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">{fmt(c.spend)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <RoasBadge roas={c.roas} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
