/*
 * Pure helpers behind the dashboard: weekly changes, records, streaks and goal pace.
 * They work on plain version lists (oldest first) so they are easy to test.
 */

export const DAY = 24 * 60 * 60 * 1000;
export const WEEK = 7 * DAY;
// A manual stat not updated for this long is suggested in "To log"
export const STALE_AFTER = 7 * DAY;

/**
 * @function safeTimeZone
 * @param {string} tz - IANA time zone sent by the browser.
 * @returns {string} The time zone, or "UTC" when unknown.
 */
export const safeTimeZone = (tz) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
};

/**
 * @function dayNumber
 * @description Day number (days since epoch) of a date in the viewer's time zone, so a value logged
 * at 23:30 counts for the right day.
 * @param {Date|string|number} date
 * @param {string} timeZone
 * @returns {number}
 */
export const dayNumber = (date, timeZone = "UTC") => {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(date))
    .split("-")
    .map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY);
};

/**
 * @function streaks
 * @description Current and best run of consecutive days with at least one value.
 * The current streak survives until the end of today: a run that ended yesterday still counts.
 * @param {number[]} days - Day numbers (any order, duplicates allowed).
 * @param {number} today - Today's day number.
 * @returns {{ current: number, best: number, today: boolean }} today: something was logged today.
 */
export const streaks = (days, today) => {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  sorted.forEach((day, i) => {
    run = i > 0 && day - sorted[i - 1] === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });

  const last = sorted.at(-1);
  const current = last === today || last === today - 1 ? run : 0;
  return { current, best, today: last === today };
};

/**
 * @function isBetter
 * @description Whether going from a to b is progress: lower is better for "decrease" goals (weight, a run time).
 */
const isBetter = (from, to, direction) => (direction === "decrease" ? to < from : to > from);

/**
 * @function weekChange
 * @description Change of a stat over the last 7 days: the current value against the last value
 * logged at least a week ago, or against its first value when the stat is newer than that.
 * @param {{ numericValue: number|null, createdAt: Date }[]} versions - Oldest first.
 * @param {"increase"|"decrease"} [direction]
 * @param {number} [now]
 * @returns {{ from: number, to: number, delta: number, percent: number|null, better: boolean }|null} null without two numeric values.
 */
export const weekChange = (versions, direction = "increase", now = Date.now()) => {
  const numeric = versions.filter((v) => typeof v.numericValue === "number");
  if (numeric.length < 2) return null;

  const weekAgo = now - WEEK;
  const before = numeric.filter((v) => new Date(v.createdAt).getTime() <= weekAgo).at(-1);
  const base = before ?? numeric[0];
  const last = numeric.at(-1);
  if (base === last) return null;

  const delta = last.numericValue - base.numericValue;
  return {
    from: base.numericValue,
    to: last.numericValue,
    delta,
    percent: base.numericValue !== 0 ? (delta / Math.abs(base.numericValue)) * 100 : null,
    better: delta !== 0 && isBetter(base.numericValue, last.numericValue, direction),
  };
};

/**
 * @function findRecords
 * @description Versions that beat every value before them (personal bests). The first value is never a record.
 * @param {{ numericValue: number|null, createdAt: Date }[]} versions - Oldest first.
 * @param {"increase"|"decrease"} [direction]
 * @returns {{ value: number, previous: number, createdAt: Date }[]}
 */
export const findRecords = (versions, direction = "increase") => {
  const records = [];
  let best = null;
  for (const version of versions) {
    if (typeof version.numericValue !== "number") continue;
    if (best !== null && isBetter(best, version.numericValue, direction)) {
      records.push({ value: version.numericValue, previous: best, createdAt: version.createdAt });
    }
    if (best === null || isBetter(best, version.numericValue, direction)) best = version.numericValue;
  }
  return records;
};

/**
 * @function bestValue
 * @param {{ numericValue: number|null }[]} versions
 * @param {"increase"|"decrease"} [direction]
 * @returns {number|null} The personal best.
 */
export const bestValue = (versions, direction = "increase") => {
  const values = versions.map((v) => v.numericValue).filter((v) => typeof v === "number");
  if (values.length === 0) return null;
  return direction === "decrease" ? Math.min(...values) : Math.max(...values);
};

/**
 * @function goalPace
 * @description Where a goal is heading, from the trend of the last 30 days (or the stat's whole history when shorter).
 * - reached: the target is met
 * - on_track / behind: at this rate, the target is met before / after the deadline
 * - no_deadline: the trend moves toward the target, with an estimated date
 * - stalled: no progress toward the target lately
 * @param {{ numericValue: number|null, createdAt: Date }[]} versions - Oldest first.
 * @param {{ target: number, deadline?: Date, direction?: string }} goal
 * @param {number} [now]
 * @returns {{ status: string, eta: Date|null }}
 */
export const goalPace = (versions, goal, now = Date.now()) => {
  const direction = goal.direction === "decrease" ? "decrease" : "increase";
  const numeric = versions.filter((v) => typeof v.numericValue === "number");
  const last = numeric.at(-1);
  if (!last) return { status: "stalled", eta: null };

  const reached = direction === "decrease" ? last.numericValue <= goal.target : last.numericValue >= goal.target;
  if (reached) return { status: "reached", eta: null };

  const since = now - 30 * DAY;
  const base = numeric.filter((v) => new Date(v.createdAt).getTime() <= since).at(-1) ?? numeric[0];
  const elapsed = new Date(last.createdAt).getTime() - new Date(base.createdAt).getTime();
  const gained = direction === "decrease" ? base.numericValue - last.numericValue : last.numericValue - base.numericValue;

  if (base === last || elapsed <= 0 || gained <= 0) return { status: "stalled", eta: null };

  const remaining = Math.abs(goal.target - last.numericValue);
  const eta = new Date(now + (remaining / gained) * elapsed);
  if (!goal.deadline) return { status: "no_deadline", eta };
  return { status: eta.getTime() <= new Date(goal.deadline).getTime() ? "on_track" : "behind", eta };
};
