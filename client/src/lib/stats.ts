import type { GoalDirection, StatHistoryPoint, StatInterface, StatType } from "@/interfaces/Stat";
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

// Same rule as the server's inferGoalDirection: a target below the current value means "lower is better".
export const inferGoalDirection = (current: number | null | undefined, target: number): GoalDirection =>
  current !== null && current !== undefined && target < current ? "decrease" : "increase";

export function isGoalReached(stat: Pick<StatInterface, "numericValue" | "goal">) {
  const { goal, numericValue } = stat;
  if (!goal || numericValue === null || numericValue === undefined) return false;
  return goal.direction === "decrease" ? numericValue <= goal.target : numericValue >= goal.target;
}

// "increase": share of the target reached. "decrease": share of the way from the starting value down to the target.
export function goalProgress(stat: Pick<StatInterface, "numericValue" | "goal">) {
  const { goal, numericValue } = stat;
  if (!goal || numericValue === null || numericValue === undefined) return 0;
  if (isGoalReached(stat)) return 100;
  let progress: number;
  if (goal.direction === "decrease") {
    const start = goal.start ?? numericValue;
    progress = start > goal.target ? ((start - numericValue) / (start - goal.target)) * 100 : 0;
  } else {
    progress = goal.target ? (numericValue / goal.target) * 100 : 0;
  }
  return Math.max(0, Math.min(99, progress));
}

// What is left before the goal, always positive, or null once reached.
export function goalRemaining(stat: Pick<StatInterface, "numericValue" | "goal">) {
  if (!stat.goal || stat.numericValue === null || stat.numericValue === undefined || isGoalReached(stat)) return null;
  return Math.abs(stat.goal.target - stat.numericValue);
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
