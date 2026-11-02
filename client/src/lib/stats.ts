import type { StatHistoryPoint, StatInterface, StatType } from "@/interfaces/Stat";
import { fr, enUS } from "date-fns/locale";
import i18n from "i18next";

export const dateLocale = () => (i18n.language === "fr" ? fr : enUS);

// Formats a numeric value back into what the user would type: "5:12" for durations, "4 210" for numbers.
export function formatNumeric(value: number, type: StatType | undefined): string {
  if (type === "duration") {
    const total = Math.round(Math.abs(value));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${value < 0 ? "-" : ""}${h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`}`;
  }
  return new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(value);
}

export const isNumeric = (stat: Pick<StatInterface, "type">) => stat.type === "number" || stat.type === "duration";

// Numeric points of a history, oldest first, ready to chart.
export function numericPoints(history: StatHistoryPoint[]) {
  return history
    .filter((point) => point.numericValue !== null && point.numericValue !== undefined)
    .map((point) => ({ date: new Date(point.createdAt).getTime(), value: point.numericValue as number }));
}

// Change between the last two numeric values, or null when there is nothing to compare.
export function lastDelta(history: StatHistoryPoint[]) {
  const points = numericPoints(history);
  if (points.length < 2) return null;
  const previous = points[points.length - 2].value;
  const current = points[points.length - 1].value;
  return {
    value: current - previous,
    percent: previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null,
  };
}

export function goalProgress(stat: Pick<StatInterface, "numericValue" | "goal">) {
  if (!stat.goal?.target || stat.numericValue === null || stat.numericValue === undefined) return 0;
  return Math.max(0, Math.min(100, (stat.numericValue / stat.goal.target) * 100));
}

// Same rules as the server's parseStatValue: "4 210", "12,5", "5:12" (min:sec) or "1:05:12" (h:min:sec).
export function parseNumericInput(input: string): number | null {
  const raw = input.trim().replace(/[\s  ]/g, "");
  const duration = raw.match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/);
  if (duration) {
    const [, a, b, c] = duration;
    return c === undefined ? Number(a) * 60 + Number(b) : Number(a) * 3600 + Number(b) * 60 + Number(c);
  }
  return /^[-+]?\d+([.,]\d+)?$/.test(raw) ? Number(raw.replace(",", ".")) : null;
}
