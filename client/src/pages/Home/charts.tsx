import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type { ActivityDay } from "@/interfaces/Stat";
import { dateLocale } from "@/lib/stats";
import { cn } from "@/lib/utils";

// Dashboard activity heatmap, loaded in its own chunk after the rest of the home page.

const dayLabel = (date: string, pattern = "d MMM") => format(parseISO(date), pattern, { locale: dateLocale() });

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
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0 space-y-3">
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
    <div className="flex flex-col border-t pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <p className="text-sm text-muted-foreground">
        {t("pages.dashboard.heatmap.busiest")} <span className="font-semibold capitalize text-foreground">{weekday(busiest, "EEEE")}</span>
      </p>
      <div className="mt-3 flex h-16 flex-1 items-end gap-2 lg:min-h-28">
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
