/**
 * @function parseStatValue
 * @description Reads the numeric meaning of a stat value so it can be charted and compared.
 * - "4 210", "12,5", "-3" → number
 * - "5:12" (min:sec) or "1:05:12" (h:min:sec) → duration, stored in seconds
 * - anything else → text, with no numeric value
 * @param {string|number} value - The raw value as entered or synced.
 * @returns {{ type: "number"|"duration"|"text", numericValue: number|null }}
 */
export const parseStatValue = (value) => {
  // Drop spaces used as thousands separators (regular, non-breaking and narrow no-break spaces)
  const raw = String(value ?? "")
    .trim()
    .replace(/[\s  ]/g, "");

  const duration = raw.match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/);
  if (duration) {
    const [, a, b, c] = duration;
    const seconds = c === undefined ? Number(a) * 60 + Number(b) : Number(a) * 3600 + Number(b) * 60 + Number(c);
    return { type: "duration", numericValue: seconds };
  }

  if (/^[-+]?\d+([.,]\d+)?$/.test(raw)) {
    return { type: "number", numericValue: Number(raw.replace(",", ".")) };
  }

  return { type: "text", numericValue: null };
};
