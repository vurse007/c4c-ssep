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
  ReferenceLine,
} from "recharts";

export type TrendSeries = { key: string; label: string; color: string };

// One row per study day; `n` (runs that day) is shown in the tooltip so a
// thin late-day average isn't mistaken for a real trend.
export type TrendPoint = { day: number; n: number } & Record<
  string,
  number | null
>;

export function TrendChart({
  data,
  series,
  yDomain,
  zeroLine = false,
}: {
  data: TrendPoint[];
  series: TrendSeries[];
  yDomain?: [number | "auto", number | "auto"];
  zeroLine?: boolean;
}) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No completed runs yet for this group.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="day"
          type="number"
          domain={[1, "dataMax"]}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
          label={{
            value: "Participation day",
            position: "insideBottomRight",
            offset: -4,
            fontSize: 11,
            fill: "#9ca3af",
          }}
        />
        <YAxis
          domain={yDomain ?? ["auto", "auto"]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        {zeroLine && <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />}
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 0,
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          labelFormatter={(day, payload) => {
            const n = payload?.[0]?.payload?.n;
            return `Day ${day}${typeof n === "number" ? ` · n = ${n}` : ""}`;
          }}
        />
        {series.length > 1 && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: s.color }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
