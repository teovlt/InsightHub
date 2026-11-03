import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type { ActivityDay, CategoryActivity, StatTrend } from "@/interfaces/Stat";
import { dateLocale, formatNumeric } from "@/lib/stats";
import { cn } from "@/lib/utils";

// Dashboard charts. Kept in their own module so recharts loads after the rest of the home page.

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  boxShadow: "var(--card-shadow)",
  color: "var(--popover-foreground)",
  fontSize: 13,
};
const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
const dayLabel = (date: string, pattern = "d MMM") => format(parseISO(date), pattern, { locale: dateLocale() });

/* Activity: updates per day (or per week on long periods), manual and synced stacked */

export const ActivityChart = ({ days }: { days: ActivityDay[] }) => {
  const { t } = useTranslation();
  // Past 90 days, daily bars get too thin to read: group by week
  const data = useMemo(() => {
    if (days.length <= 90) return days;
    const weeks: ActivityDay[] = [];
    days.forEach((day, index) => {
      if (index % 7 === 0) weeks.push({ ...day });
      else {
        weeks[weeks.length - 1].manual += day.manual;
        weeks[weeks.length - 1].synced += day.synced;
      }
    });
    return weeks;
  }, [days]);
  const weekly = data !== days;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }} barCategoryGap="18%">
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="date" tickFormatter={(d) => dayLabel(d)} tick={axisTick} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          cursor={{ fill: "var(--secondary)", opacity: 0.6 }}
          contentStyle={tooltipStyle}
          labelFormatter={(d: string) =>
            weekly ? t("pages.dashboard.activity.week_of", { date: dayLabel(d) }) : dayLabel(d, "EEEE d MMM")
          }
          formatter={(value: number, key: string) => [value, t(`pages.dashboard.activity.${key}`)]}
        />
        <Bar
          isAnimationActive={false}
          dataKey="manual"
          stackId="a"
          fill="var(--chart-1)"
          stroke="var(--card)"
          strokeWidth={1}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          isAnimationActive={false}
          dataKey="synced"
          stackId="a"
          fill="var(--chart-synced)"
          stroke="var(--card)"
          strokeWidth={1}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

/* Category share: donut with the category's own color, total in the middle */

export const CategoryDonut = ({ categories, metric }: { categories: CategoryActivity[]; metric: "updates" | "stats" }) => {
  const { t } = useTranslation();
  const [active, setActive] = useState<number | null>(null);
  const data = categories.filter((category) => category[metric] > 0);
  const total = data.reduce((sum, category) => sum + category[metric], 0);
  const focused = active !== null ? data[active] : null;

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={metric}
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 2 : 0}
            cornerRadius={4}
            stroke="var(--card)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            onMouseEnter={(_, index) => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            {data.map((category, index) => (
              <Cell key={category._id} fill={category.color} opacity={active === null || active === index ? 1 : 0.35} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-3xl font-bold tracking-tight">{focused ? focused[metric] : total}</span>
        <span className="max-w-[60%] truncate text-xs text-muted-foreground">
          {focused ? focused.name : t(`pages.dashboard.by_category.${metric}`, { count: total })}
        </span>
      </div>
    </div>
  );
};

/* Trend of one numeric stat over the period, extended to now with its current value */

export const TrendChart = ({ trend }: { trend: StatTrend }) => {
  const color = trend.categoryId?.color ?? "var(--accent)";
  const gradientId = `trend-${trend._id}`;
  const points = useMemo(() => {
    const list = trend.history.map((point) => ({ date: new Date(point.createdAt).getTime(), value: point.numericValue as number }));
    if (list.length > 0) list.push({ date: Date.now(), value: list[list.length - 1].value });
    return list;
  }, [trend.history]);
  const unit = trend.unit ? ` ${trend.unit}` : "";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 6, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" type="number" scale="time" domain={["dataMin", "dataMax"]} hide />
        <YAxis domain={["auto", "auto"]} hide />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={tooltipStyle}
          labelFormatter={(value: number) => format(new Date(value), "d MMM yyyy, HH:mm", { locale: dateLocale() })}
          formatter={(value: number) => [`${formatNumeric(value, trend.type)}${unit}`, ""]}
          separator=""
        />
        {trend.goal?.target !== undefined && (
          <ReferenceLine y={trend.goal.target} stroke="var(--chart-synced)" strokeDasharray="4 4" ifOverflow="extendDomain" />
        )}
        <Area
          // Synced values are counters read at sync time: they hold until the next sync
          type={trend.integrationId ? "stepAfter" : "monotone"}
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/* Biggest moves: change over the period, in percent, as diverging bars around 0 */

export const MoversChart = ({ trends, onOpen }: { trends: StatTrend[]; onOpen: (id: string) => void }) => {
  const data = trends.map((trend) => ({ id: trend._id, name: trend.name, percent: Math.round(trend.change.percent ?? 0), trend }));
  const extent = Math.max(10, ...data.map((d) => Math.abs(d.percent)));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }} barCategoryGap="28%">
        <XAxis type="number" domain={[-extent, extent]} hide />
        <YAxis type="category" dataKey="name" width={110} tick={axisTick} axisLine={false} tickLine={false} interval={0} />
        <ReferenceLine x={0} stroke="var(--border)" />
        <Tooltip
          cursor={{ fill: "var(--secondary)", opacity: 0.6 }}
          contentStyle={tooltipStyle}
          formatter={(_: number, __: string, item: { payload?: (typeof data)[number] }) => {
            const trend = item.payload!.trend;
            const unit = trend.unit ? ` ${trend.unit}` : "";
            return [`${formatNumeric(trend.change.from ?? 0, trend.type)} → ${formatNumeric(trend.change.to, trend.type)}${unit}`, ""];
          }}
          separator=""
        />
        <Bar
          dataKey="percent"
          radius={4}
          cursor="pointer"
          onClick={(entry: { id: string }) => onOpen(entry.id)}
          label={{
            position: "right",
            fill: "var(--muted-foreground)",
            fontSize: 12,
            formatter: (value: number) => `${value > 0 ? "+" : ""}${value}%`,
          }}
        >
          {data.map((d) => (
            <Cell key={d.id} fill={d.percent >= 0 ? "var(--chart-up)" : "var(--chart-down)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/* Heatmap of the last weeks, one cell per day, Monday first */

export const ActivityHeatmap = ({ days }: { days: ActivityDay[] }) => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<ActivityDay | null>(null);

  const { weeks, max } = useMemo(() => {
    const byDate = new Map(days.map((day) => [day.date, day]));
    const first = days.length ? startOfWeek(parseISO(days[0].date), { weekStartsOn: 1 }) : new Date();
    const last = days.length ? days[days.length - 1].date : "";
    const weeks: (ActivityDay | null)[][] = [];
    for (let cursor = first; format(cursor, "yyyy-MM-dd") <= last; cursor = addDays(cursor, 7)) {
      weeks.push(Array.from({ length: 7 }, (_, i) => byDate.get(format(addDays(cursor, i), "yyyy-MM-dd")) ?? null));
    }
    return { weeks, max: Math.max(1, ...days.map((day) => day.manual + day.synced)) };
  }, [days]);

  // Five steps of the brand blue, empty days on the neutral surface
  const level = (count: number) => (count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4)));
  const shades = [
    "var(--secondary)",
    "color-mix(in srgb, var(--accent) 30%, var(--card))",
    "color-mix(in srgb, var(--accent) 55%, var(--card))",
    "color-mix(in srgb, var(--accent) 78%, var(--card))",
    "var(--accent)",
  ];
  const total = (day: ActivityDay) => day.manual + day.synced;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="flex w-full min-w-[520px] gap-[3px]" onMouseLeave={() => setHovered(null)}>
          {weeks.map((week, w) => (
            <div key={w} className="flex min-w-0 flex-1 flex-col gap-[3px]">
              {/* Month label on the first week of each month */}
              <span className="h-4 overflow-visible whitespace-nowrap text-[10px] leading-4 text-muted-foreground">
                {week[0] && (w === 0 || parseISO(week[0].date).getDate() <= 7) ? dayLabel(week[0].date, "MMM") : ""}
              </span>
              {week.map((day, d) =>
                day ? (
                  <button
                    key={d}
                    type="button"
                    aria-label={`${dayLabel(day.date, "d MMM yyyy")}: ${t("pages.dashboard.heatmap.updates", { count: total(day) })}`}
                    onMouseEnter={() => setHovered(day)}
                    onFocus={() => setHovered(day)}
                    className={cn(
                      "aspect-square w-full cursor-default rounded-[3px] transition-transform hover:scale-110",
                      hovered === day && "ring-2 ring-foreground/40",
                    )}
                    style={{ backgroundColor: shades[level(total(day))] }}
                  />
                ) : (
                  <span key={d} className="aspect-square w-full" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="min-h-4">
          {hovered
            ? `${dayLabel(hovered.date, "EEEE d MMM")} · ${t("pages.dashboard.heatmap.updates", { count: total(hovered) })}${
                total(hovered) > 0
                  ? ` (${hovered.manual} ${t("pages.dashboard.activity.manual").toLowerCase()}, ${hovered.synced} ${t("pages.dashboard.activity.synced").toLowerCase()})`
                  : ""
              }`
            : t("pages.dashboard.heatmap.hint")}
        </span>
        <span className="flex items-center gap-1">
          {t("pages.dashboard.heatmap.less")}
          {shades.map((shade) => (
            <span key={shade} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: shade }} />
          ))}
          {t("pages.dashboard.heatmap.more")}
        </span>
      </div>
      <WeekdayBars days={days} />
    </div>
  );
};

// Share of updates per weekday, Monday first, the busiest one highlighted
const WeekdayBars = ({ days }: { days: ActivityDay[] }) => {
  const { t } = useTranslation();
  const totals = Array.from({ length: 7 }, () => 0);
  days.forEach((day) => {
    totals[(parseISO(day.date).getDay() + 6) % 7] += day.manual + day.synced;
  });
  const max = Math.max(...totals);
  if (max === 0) return null;
  const busiest = totals.indexOf(max);
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekday = (i: number, pattern: string) => format(addDays(monday, i), pattern, { locale: dateLocale() });

  return (
    <div className="border-t pt-4">
      <p className="text-sm text-muted-foreground">
        {t("pages.dashboard.heatmap.busiest")} <span className="font-semibold capitalize text-foreground">{weekday(busiest, "EEEE")}</span>
      </p>
      <div className="mt-3 flex h-16 items-end gap-2">
        {totals.map((count, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${weekday(i, "EEEE")}: ${count}`}>
            <div
              className={cn("w-full rounded-t-[4px]", i === busiest ? "bg-accent" : "bg-accent/30")}
              style={{ height: `${Math.max(4, (count / max) * 100)}%` }}
            />
            <span className="text-[10px] uppercase text-muted-foreground">{weekday(i, "EEEEE")}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
