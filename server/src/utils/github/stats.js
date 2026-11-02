const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const REQUEST_TIMEOUT = 15000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @function githubGraphql
 * @description Runs a query against the GitHub GraphQL API with the user's token.
 * @param {string} accessToken - The user's GitHub token.
 * @param {string} query - GraphQL query.
 * @returns {Promise<Object>} The `data` field of the response.
 */
const githubGraphql = async (accessToken, query) => {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result || result.errors || !result.data?.viewer) {
    throw new Error(`GitHub GraphQL error (${response.status}): ${JSON.stringify(result?.errors ?? result)}`);
  }

  return result.data;
};

/**
 * @function computeMaxStreak
 * @description Longest run of consecutive days with at least one contribution.
 * @param {{ date: string, contributionCount: number }[]} days - Calendar days, in any order.
 * @returns {number} The longest streak, in days.
 */
export const computeMaxStreak = (days) => {
  // Calendars of adjacent years may overlap on a week: keep one entry per date
  const counts = new Map(days.map((day) => [day.date, day.contributionCount]));
  const dates = [...counts.keys()].sort();

  let currentStreak = 0;
  let maxStreak = 0;
  let previousTime = null;

  for (const date of dates) {
    const time = Date.parse(`${date}T00:00:00Z`);
    if (counts.get(date) > 0) {
      currentStreak = previousTime !== null && time - previousTime === DAY_MS ? currentStreak + 1 : 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    previousTime = time;
  }

  return maxStreak;
};

/**
 * @function getContributionStats
 * @description Fetches, in a single request, every year of contributions since the account was created
 * (a contributionsCollection cannot span more than one year).
 * @param {string} accessToken - The user's GitHub token.
 * @param {string} createdAt - Creation date of the GitHub account.
 * @returns {Promise<{ totalCommits: number, maxStreak: number }>} All-time commits and longest streak.
 */
export const getContributionStats = async (accessToken, createdAt) => {
  const currentYear = new Date().getUTCFullYear();
  const startYear = Math.min(new Date(createdAt).getUTCFullYear() || currentYear, currentYear);

  const years = [];
  for (let year = startYear; year <= currentYear; year++) years.push(year);

  const fields = years.map(
    (year) => `
      y${year}: contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z") {
        totalCommitContributions
        contributionCalendar { weeks { contributionDays { date contributionCount } } }
      }`,
  );

  const data = await githubGraphql(accessToken, `query { viewer { ${fields.join("")} } }`);

  let totalCommits = 0;
  const days = [];
  for (const year of years) {
    const collection = data.viewer[`y${year}`];
    totalCommits += collection.totalCommitContributions;
    days.push(...collection.contributionCalendar.weeks.flatMap((week) => week.contributionDays));
  }

  return { totalCommits, maxStreak: computeMaxStreak(days) };
};

/**
 * @function getTotalStars
 * @description Sums the stars of every repository owned by the user.
 * @param {string} accessToken - The user's GitHub token.
 * @returns {Promise<number>} Total stars received.
 */
export const getTotalStars = async (accessToken) => {
  let totalStars = 0;
  let hasNextPage = true;
  let endCursor = null;

  while (hasNextPage) {
    const data = await githubGraphql(
      accessToken,
      `query {
        viewer {
          repositories(first: 100, ownerAffiliations: OWNER${endCursor ? `, after: "${endCursor}"` : ""}) {
            nodes { stargazerCount }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
    );

    const { nodes, pageInfo } = data.viewer.repositories;
    totalStars += nodes.reduce((sum, repo) => sum + repo.stargazerCount, 0);

    hasNextPage = pageInfo.hasNextPage;
    endCursor = pageInfo.endCursor;
  }

  return totalStars;
};
