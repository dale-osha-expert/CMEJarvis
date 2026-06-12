"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { FC } from "react";

// ─── Public types ──────────────────────────────────────────────────────────────

export interface SeriesConfig {
  dataKey: string;
  label: string;
  color: string;
  yAxisId: "left" | "right";
  dashed?: boolean;
  strokeWidth?: number;
  /** When false (default) the line shows a gap on null values. */
  connectNulls?: boolean;
  /** Formats the value shown in the tooltip. Receives null when the data point is absent. */
  formatValue: (v: number | null | undefined) => string;
}

export interface DualAxisLineChartProps {
  /** Null = loading (shows skeleton). */
  data: Record<string, number | string | null>[] | null;
  xKey: string;
  series: SeriesConfig[];
  leftTickFmt: (v: number) => string;
  rightTickFmt: (v: number) => string;
  error?: string | null;
  /** Override the built-in generic tooltip with a custom component. */
  customTooltip?: FC<{
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number | null; payload: Record<string, number | string | null> }>;
    label?: string;
  }>;
  height?: number;
}

// ─── Default generic tooltip ──────────────────────────────────────────────────

function GenericTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | null }>;
  label?: string;
  series: SeriesConfig[];
}) {
  if (!active) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-xs">
      <p className="text-slate-300 font-semibold mb-2">{label}</p>
      <div className="space-y-1.5">
        {series.map((s) => {
          const entry = payload?.find((p) => p.dataKey === s.dataKey);
          const value = entry?.value ?? null;
          return (
            <div key={s.dataKey} className="flex items-center justify-between gap-4">
              <span style={{ color: s.color }} className="font-medium">
                {s.label}
              </span>
              <span className="text-white">{s.formatValue(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ height }: { height: number }) {
  return (
    <div style={{ height }} className="flex items-center justify-center">
      <div className="flex gap-1.5 items-end">
        {[3, 5, 4, 6, 5, 7, 4].map((h, i) => (
          <div
            key={i}
            className="w-8 rounded-sm bg-slate-700 animate-pulse"
            style={{ height: `${h * 8}px`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export default function DualAxisLineChart({
  data,
  xKey,
  series,
  leftTickFmt,
  rightTickFmt,
  error,
  customTooltip: CustomTooltip,
  height = 224,
}: DualAxisLineChartProps) {
  if (error) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-slate-500 text-sm">
        Chart unavailable — {error}
      </div>
    );
  }

  if (data === null) return <Skeleton height={height} />;

  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-slate-500 text-sm">
        No data for this period
      </div>
    );
  }

  const tooltipContent = CustomTooltip
    ? (props: Parameters<typeof CustomTooltip>[0]) => <CustomTooltip {...props} />
    : (props: { active?: boolean; payload?: Array<{ dataKey: string; value: number | null }>; label?: string }) => (
        <GenericTooltip {...props} series={series} />
      );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          tickFormatter={leftTickFmt}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={rightTickFmt}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          content={tooltipContent as never}
          cursor={{ stroke: "#334155", strokeWidth: 1 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
          iconType="circle"
          iconSize={8}
          formatter={(value) => series.find((s) => s.dataKey === value)?.label ?? value}
        />
        {series.map((s) => (
          <Line
            key={s.dataKey}
            yAxisId={s.yAxisId}
            type="monotone"
            dataKey={s.dataKey}
            stroke={s.color}
            strokeWidth={s.strokeWidth ?? 1.5}
            strokeDasharray={s.dashed ? "4 3" : undefined}
            connectNulls={s.connectNulls ?? false}
            dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
