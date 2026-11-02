import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import type { StatType } from "@/interfaces/Stat";
import { dateLocale, formatNumeric } from "@/lib/stats";

interface StatChartProps {
  points: { date: number; value: number }[];
  color: string;
  type?: StatType;
  unit?: string;
  goal?: number;
}

// Evolution of one stat over time. Kept in its own module so recharts only loads on the Statistics page.
export default function StatChart({ points, color, type, unit, goal }: StatChartProps) {
  const spanDays = points.length > 1 ? (points[points.length - 1].date - points[0].date) / 86_400_000 : 0;
  const tickFormat = spanDays > 300 ? "MMM yy" : "d MMM";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="stat-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(value) => format(new Date(value), tickFormat, { locale: dateLocale() })}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          width={56}
          tickFormatter={(value) => formatNumeric(value, type)}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "var(--card-shadow)",
            color: "var(--popover-foreground)",
          }}
          labelFormatter={(value) => format(new Date(value), "d MMM yyyy, HH:mm", { locale: dateLocale() })}
          formatter={(value: number) => [`${formatNumeric(value, type)}${unit ? ` ${unit}` : ""}`, ""]}
          separator=""
        />
        {goal !== undefined && <ReferenceLine y={goal} stroke="#b8f34a" strokeWidth={2} strokeDasharray="6 4" />}
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill="url(#stat-area)"
          dot={points.length < 40 ? { r: 3, fill: color, strokeWidth: 0 } : false}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
