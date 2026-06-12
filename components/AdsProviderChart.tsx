"use client";

import { useEffect, useState } from "react";
import DualAxisLineChart from "./DualAxisLineChart";
import type { SeriesConfig } from "./DualAxisLineChart";

interface ProviderPoint {
  [key: string]: string | number | null;
  date: string;
  displayDate: string;
  spend: number;
  roas: number | null;
}

function fmtCurrency(n: number): string {
  return n >= 1000 ? "$" + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k" : "$" + Math.round(n);
}

function fmtRoasTick(v: number): string {
  return v.toFixed(1) + "x";
}

const SERIES_GOOGLE: SeriesConfig[] = [
  {
    dataKey: "spend",
    label: "Spend",
    color: "#60a5fa",
    yAxisId: "left",
    strokeWidth: 2,
    formatValue: (v) =>
      v != null
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
        : "—",
  },
  {
    dataKey: "roas",
    label: "ROAS",
    color: "#34d399",
    yAxisId: "right",
    connectNulls: false, // show gap on days with no purchases
    formatValue: (v) => (v != null ? v.toFixed(1) + "x" : "—"),
  },
];

const SERIES_META: SeriesConfig[] = [
  {
    dataKey: "spend",
    label: "Spend",
    color: "#a78bfa",
    yAxisId: "left",
    strokeWidth: 2,
    formatValue: (v) =>
      v != null
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
        : "—",
  },
  {
    dataKey: "roas",
    label: "ROAS",
    color: "#fb923c",
    yAxisId: "right",
    connectNulls: false,
    formatValue: (v) => (v != null ? v.toFixed(1) + "x" : "—"),
  },
];

export default function AdsProviderChart({
  provider,
  days = 7,
  isStub = false,
}: {
  provider: "google" | "meta";
  days?: number;
  isStub?: boolean;
}) {
  const [data, setData] = useState<ProviderPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ads/${provider}/timeseries?days=${days}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ProviderPoint[]>;
      })
      .then(setData)
      .catch((err) => setError(String(err)));
  }, [provider, days]);

  const series = provider === "google" ? SERIES_GOOGLE : SERIES_META;

  return (
    <div>
      <DualAxisLineChart
        data={data}
        xKey="displayDate"
        series={series}
        leftTickFmt={fmtCurrency}
        rightTickFmt={fmtRoasTick}
        error={error}
        height={200}
      />
      {isStub && data && !error && (
        <p className="text-center text-slate-600 text-[10px] mt-1">stub data — add credentials to load live chart</p>
      )}
    </div>
  );
}
