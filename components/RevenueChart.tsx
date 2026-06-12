"use client";

import { useEffect, useState } from "react";
import DualAxisLineChart from "./DualAxisLineChart";
import type { SeriesConfig } from "./DualAxisLineChart";

interface TimeseriesEntry {
  [key: string]: string | number | null;
  date: string;
  displayDate: string;
  priorDate: string;
  priorDisplayDate: string;
  currentRevenue: number;
  priorRevenue: number;
  adSpend: number;
}

function fmtCurrency(n: number): string {
  return n >= 1000 ? "$" + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k" : "$" + Math.round(n);
}

function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// Custom tooltip with % YoY change and prior-year date label
function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | null; payload: TimeseriesEntry }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  const cur = entry?.currentRevenue ?? 0;
  const prior = entry?.priorRevenue ?? 0;
  const spend = entry?.adSpend ?? 0;
  const pct = prior > 0 ? ((cur - prior) / prior) * 100 : null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
      <p className="text-slate-300 font-semibold mb-2">{entry?.displayDate}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-400 font-medium">Revenue</span>
          <span className="text-white font-semibold">{fmtFull(cur)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-blue-400 font-medium">Prior year</span>
          <span className="text-slate-300">
            {fmtFull(prior)}
            {pct !== null && (
              <span className={`ml-1.5 font-semibold ${pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {pct >= 0 ? "+" : ""}
                {pct.toFixed(1)}%
              </span>
            )}
          </span>
        </div>
        {entry?.priorDisplayDate && (
          <p className="text-slate-600 text-[10px]">vs {entry.priorDisplayDate}</p>
        )}
        <div className="border-t border-slate-700 my-1" />
        <div className="flex items-center justify-between gap-4">
          <span className="text-amber-400 font-medium">Ad spend</span>
          <span className="text-slate-300">{fmtFull(spend)}</span>
        </div>
      </div>
    </div>
  );
}

const SERIES: SeriesConfig[] = [
  {
    dataKey: "currentRevenue",
    label: "Revenue",
    color: "#34d399",
    yAxisId: "left",
    strokeWidth: 2,
    formatValue: (v) => (v != null ? fmtFull(v) : "—"),
  },
  {
    dataKey: "priorRevenue",
    label: "Prior year (−364 days)",
    color: "#60a5fa",
    yAxisId: "left",
    dashed: true,
    formatValue: (v) => (v != null ? fmtFull(v) : "—"),
  },
  {
    dataKey: "adSpend",
    label: "Ad spend",
    color: "#fbbf24",
    yAxisId: "right",
    formatValue: (v) => (v != null ? fmtFull(v) : "—"),
  },
];

export default function RevenueChart({ days = 7 }: { days?: number }) {
  const [data, setData] = useState<TimeseriesEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/metrics/timeseries?days=${days}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<TimeseriesEntry[]>;
      })
      .then(setData)
      .catch((err) => setError(String(err)));
  }, [days]);

  return (
    <DualAxisLineChart
      data={data}
      xKey="displayDate"
      series={SERIES}
      leftTickFmt={fmtCurrency}
      rightTickFmt={fmtCurrency}
      error={error}
      customTooltip={RevenueTooltip as never}
    />
  );
}
