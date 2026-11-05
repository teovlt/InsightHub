const REQUEST_TIMEOUT = 15000;
// Several public APIs (Chess.com, Lichess) ask clients to identify themselves
const USER_AGENT = "InsightHub/1.0 (+https://www.insighthub.teovillet.fr)";

/**
 * @class ProviderError
 * @description An error the user can act on (unknown username, invalid key, private profile...).
 * Its message is shown as is, unlike unexpected failures.
 */
export class ProviderError extends Error {}

/**
 * @function fetchJson
 * @description GETs (or POSTs) a third-party JSON API with a timeout.
 * @param {string} url - The URL to call.
 * @param {Object} [options] - fetch options; headers are merged with the default ones.
 * @param {string} [notFoundMessage] - Message of the ProviderError thrown on 404.
 * @returns {Promise<any>} The parsed body.
 */
export const fetchJson = async (url, options = {}, notFoundMessage) => {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", "User-Agent": USER_AGENT, ...options.headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (response.status === 404 && notFoundMessage) throw new ProviderError(notFoundMessage);
  if (response.status === 401 || response.status === 403) {
    throw new ProviderError("Access refused by the service: check that your key is valid or that your profile is public.");
  }
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);

  return response.json();
};

/**
 * @function fetchText
 * @description GETs a page (HTML, RSS) of a service without a JSON API, with a timeout.
 * @param {string} url - The URL to call.
 * @param {string} [notFoundMessage] - Message of the ProviderError thrown on 404.
 * @returns {Promise<string>} The body.
 */
export const fetchText = async (url, notFoundMessage) => {
  const response = await fetch(url, {
    headers: { Accept: "text/html,application/xhtml+xml,application/rss+xml", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  if (response.status === 404 && notFoundMessage) throw new ProviderError(notFoundMessage);
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);
  return response.text();
};

// Meters → kilometers with one decimal
export const toKm = (meters) => (typeof meters === "number" ? Math.round(meters / 100) / 10 : null);

// Monday 00:00 (server time) of the week holding the date
export const startOfWeek = (date = new Date()) => {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
};

/**
 * @function weekStreak
 * @description Consecutive weeks with at least one dated entry, ending this week
 * (or last week, so a streak is not lost on Monday morning).
 * @param {Date[]} dates - Dates of the entries.
 * @returns {number} The number of weeks.
 */
export const weekStreak = (dates) => {
  const weeks = new Set(dates.map((date) => startOfWeek(date).getTime()));
  // Half a week back always lands in the previous week, whatever daylight saving does
  const previous = (monday) => startOfWeek(new Date(monday.getTime() - 3.5 * 24 * 60 * 60 * 1000));
  let cursor = startOfWeek();
  if (!weeks.has(cursor.getTime())) cursor = previous(cursor);
  let streak = 0;
  while (weeks.has(cursor.getTime())) {
    streak++;
    cursor = previous(cursor);
  }
  return streak;
};

// Seconds → hours with one decimal, the unit used for every "time spent" stat
export const toHours = (seconds) => (typeof seconds === "number" ? Math.round((seconds / 3600) * 10) / 10 : null);
