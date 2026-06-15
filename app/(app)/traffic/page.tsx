import { Suspense } from "react";
import { ga4Adapter } from "@/lib/adapters/ga4";
import { searchConsoleAdapter, SC_DAYS } from "@/lib/adapters/search-console";
import type { OrganicTrafficSummary, OrganicTrafficPoint } from "@/lib/adapters/ga4/types";
import type { TopPage } from "@/lib/adapters/search-console/types";
import TrafficChart from "@/components/TrafficChart";

// GA4 window: last 7 days for the trend chart; same window for KPI cards
const GA4_DAYS = 7;

function offsetDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtNum(n: number) {
  return n.toLocaleString("en-US");
}
function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}
function fmtPos(n: number) {
  return n.toFixed(1);
}

// ─── Shared card components ───────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function UnavailableCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="bg-slate-800 border border-amber-700/40 rounded-xl p-4">
      <p className="text-amber-400 text-sm font-medium">{title}</p>
      <p className="text-slate-400 text-xs mt-1 font-mono leading-relaxed">{detail}</p>
      <p className="text-slate-500 text-xs mt-2">
        Check: service account has Viewer access · API is enabled · SEARCH_CONSOLE_PROPERTY_URL matches the GSC property exactly
      </p>
    </div>
  );
}

// ─── Main page data fetching ──────────────────────────────────────────────────

async function TrafficContent() {
  const ga4End = offsetDate(0);
  const ga4Start = offsetDate(-(GA4_DAYS - 1));
  const scEnd = offsetDate(-3);   // SC has ~2-3 day lag; don't request today
  const scStart = offsetDate(-(SC_DAYS + 2));

  // Fetch all three independently — one failure must not block the others
  const [summaryResult, timeseriesResult, topPagesResult] = await Promise.allSettled([
    ga4Adapter.getOrganicTraffic(ga4Start, ga4End),
    ga4Adapter.getOrganicTrafficTimeseries(ga4Start, ga4End),
    searchConsoleAdapter.getTopPages(scStart, scEnd, 10),
  ]);

  const summary: OrganicTrafficSummary | null =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const summaryError: string | null =
    summaryResult.status === "rejected" ? String(summaryResult.reason) : null;

  const timeseries: OrganicTrafficPoint[] | null =
    timeseriesResult.status === "fulfilled" ? timeseriesResult.value : null;
  const timeseriesError: string | null =
    timeseriesResult.status === "rejected" ? String(timeseriesResult.reason) : null;

  const topPages: TopPage[] | null =
    topPagesResult.status === "fulfilled" ? topPagesResult.value : null;
  const topPagesError: string | null =
    topPagesResult.status === "rejected" ? String(topPagesResult.reason) : null;

  const ga4Error = summaryError ?? timeseriesError;

  return (
    <div className="space-y-6">

      {/* ── Organic traffic KPIs ────────────────────────────────────────────── */}
      {ga4Error ? (
        <UnavailableCard
          title="GA4 Organic Traffic — unavailable"
          detail={ga4Error}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Organic Sessions"
            value={summary ? fmtNum(summary.sessions) : "—"}
            sub={`${GA4_DAYS} days`}
          />
          <KpiCard
            label="Organic Users"
            value={summary ? fmtNum(summary.users) : "—"}
            sub={`${GA4_DAYS} days`}
          />
          <KpiCard
            label="Avg Sessions/Day"
            value={summary ? fmtNum(Math.round(summary.sessions / GA4_DAYS)) : "—"}
          />
          <KpiCard
            label="Avg Users/Day"
            value={summary ? fmtNum(Math.round(summary.users / GA4_DAYS)) : "—"}
          />
        </div>
      )}

      {/* ── 7-day organic trend chart ────────────────────────────────────────── */}
      {!ga4Error && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Organic Traffic — Last {GA4_DAYS} Days
          </p>
          <TrafficChart
            data={timeseries}
            error={timeseriesError}
          />
        </div>
      )}

      {/* ── Top pages ────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline gap-3 mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Top Pages by Clicks
          </h3>
          <span className="text-slate-500 text-xs">
            {scStart} → {scEnd} · Search Console (2-3 day lag)
          </span>
        </div>

        {topPagesError ? (
          <UnavailableCard
            title="Search Console — unavailable"
            detail={topPagesError}
          />
        ) : topPages && topPages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-700">
                  <th className="pb-2 pr-4 font-medium">Page</th>
                  <th className="pb-2 pr-4 font-medium text-right">Clicks</th>
                  <th className="pb-2 pr-4 font-medium text-right">Impressions</th>
                  <th className="pb-2 pr-4 font-medium text-right">CTR</th>
                  <th className="pb-2 font-medium text-right">Avg Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {topPages.map((p, i) => {
                  const path = (() => {
                    try { return new URL(p.page).pathname || p.page; } catch { return p.page; }
                  })();
                  return (
                    <tr key={i} className="text-slate-300">
                      <td className="py-2.5 pr-4 max-w-xs">
                        <p className="text-white font-medium truncate" title={p.page}>{path}</p>
                        <p className="text-slate-500 text-xs truncate">{p.page}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-white">{fmtNum(p.clicks)}</td>
                      <td className="py-2.5 pr-4 text-right">{fmtNum(p.impressions)}</td>
                      <td className="py-2.5 pr-4 text-right">{fmtPct(p.ctr)}</td>
                      <td className="py-2.5 text-right">
                        <span className={p.position <= 3 ? "text-emerald-400 font-semibold" : p.position <= 10 ? "text-white" : "text-slate-400"}>
                          {fmtPos(p.position)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No Search Console data for this window.</p>
        )}
      </section>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrafficPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Organic Traffic</h1>
        <p className="text-slate-400 text-sm mt-1">
          GA4 organic sessions · Search Console top pages
        </p>
      </div>

      <Suspense fallback={
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 h-20 animate-pulse" />
            ))}
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 h-52 animate-pulse" />
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 h-64 animate-pulse" />
        </div>
      }>
        <TrafficContent />
      </Suspense>
    </div>
  );
}
