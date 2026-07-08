"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHALLENGES, type ChartPoint } from "@/lib/challenges";

interface Props {
  data: ChartPoint[];
}

export function PerformanceChart({ data }: Props) {
  const activeChallenges = CHALLENGES.filter((c) =>
    data.some((d) => d[c.key] !== undefined)
  );

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <p>No performance data yet.</p>
        <p className="text-xs opacity-70">Complete a challenge to see your progress here.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="attempt"
          type="number"
          domain={[1, "dataMax"]}
          tickCount={Math.min(data.length, 10)}
          tickFormatter={(v) => `#${v}`}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
          label={{ value: "Attempt", position: "insideBottomRight", offset: -4, fontSize: 11, fill: "#9ca3af" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 0,
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          labelFormatter={(v) => `Attempt #${v}`}
          formatter={(value: number, name: string) => [
            `${value}`,
            CHALLENGES.find((c) => c.key === name)?.label ?? name,
          ]}
        />
        <Legend
          formatter={(value) =>
            CHALLENGES.find((c) => c.key === value)?.label ?? value
          }
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
        />
        {CHALLENGES.map((c) => (
          <Line
            key={c.key}
            type="monotone"
            dataKey={c.key}
            stroke={c.color}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: c.color }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            /* dim lines that have no data yet */
            strokeOpacity={activeChallenges.some((a) => a.key === c.key) ? 1 : 0.15}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
