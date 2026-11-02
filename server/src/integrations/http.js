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

// Seconds → hours with one decimal, the unit used for every "time spent" stat
export const toHours = (seconds) => (typeof seconds === "number" ? Math.round((seconds / 3600) * 10) / 10 : null);
