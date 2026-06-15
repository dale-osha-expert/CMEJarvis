"use client";

import DualAxisLineChart from "@/components/DualAxisLineChart";
import type { OrganicTrafficPoint } from "@/lib/adapters/ga4/types";

interface Props {
  data: OrganicTrafficPoint[] | null;
  error?: string | null;
}

export default function TrafficChart({ data, error }: Props) {
  const chartData =
    data?.map((p) => ({
      date: p.date.slice(5), // "MM-DD" for x-axis labels
      sessions: p.sessions,
      users: p.users,
    })) ?? null;

  return (
    <DualAxisLineChart
      data={chartData}
      xKey="date"
      series={[
        {
          dataKey: "sessions",
          label: "Sessions",
          color: "#3b82f6",
          yAxisId: "left",
          strokeWidth: 2,
          formatValue: (v) => (v != null ? v.toLocaleString() : "—"),
        },
        {
          dataKey: "users",
          label: "Users",
          color: "#a78bfa",
          yAxisId: "right",
          dashed: true,
          formatValue: (v) => (v != null ? v.toLocaleString() : "—"),
        },
      ]}
      leftTickFmt={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
      rightTickFmt={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
      error={error ?? undefined}
      height={220}
    />
  );
}
