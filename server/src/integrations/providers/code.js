import { fetchJson, ProviderError, toHours } from "../http.js";

const LEETCODE_QUERY = `query userStats($username: String!) {
  matchedUser(username: $username) {
    username
    profile { ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
  }
  userContestRanking(username: $username) { rating }
}`;

const leetcodeQuery = (username) =>
  fetchJson("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" },
    body: JSON.stringify({ query: LEETCODE_QUERY, variables: { username } }),
  });

export const leetcode = {
  key: "leetcode",
  name: "LeetCode",
  description: "Problems solved, ranking and contest rating on LeetCode.",
  icon: "Code",
  color: "#ffa116",
  category: "Development",
  auth: "username",
  credentialLabel: "LeetCode username",
  docsUrl: "https://leetcode.com",
  statCategory: { name: "LeetCode", description: "Your progress on LeetCode", icon: "Code", color: "#ffa116" },
  stats: [
    { id: "solved_total", name: "Problems solved", description: "All accepted problems.", unit: "" },
    { id: "solved_easy", name: "Easy solved", description: "Accepted easy problems.", unit: "" },
    { id: "solved_medium", name: "Medium solved", description: "Accepted medium problems.", unit: "" },
    { id: "solved_hard", name: "Hard solved", description: "Accepted hard problems.", unit: "" },
    { id: "ranking", name: "Global ranking", description: "Your position in the global ranking.", unit: "" },
    { id: "contest_rating", name: "Contest rating", description: "Rating from weekly contests.", unit: "" },
  ],
  async verify(username) {
    const { data } = await leetcodeQuery(username);
    if (!data?.matchedUser) throw new ProviderError("No LeetCode user with this username.");
    return { account: data.matchedUser.username };
  },
  async fetchStats(username) {
    const { data } = await leetcodeQuery(username);
    const solved = Object.fromEntries((data?.matchedUser?.submitStatsGlobal?.acSubmissionNum ?? []).map((s) => [s.difficulty, s.count]));
    return {
      solved_total: solved.All ?? null,
      solved_easy: solved.Easy ?? null,
      solved_medium: solved.Medium ?? null,
      solved_hard: solved.Hard ?? null,
      ranking: data?.matchedUser?.profile?.ranking ?? null,
      contest_rating: data?.userContestRanking?.rating ? Math.round(data.userContestRanking.rating) : null,
    };
  },
};

export const codewars = {
  key: "codewars",
  name: "Codewars",
  description: "Honor, rank and katas completed on Codewars.",
  icon: "Code",
  color: "#b1361e",
  category: "Development",
  auth: "username",
  credentialLabel: "Codewars username",
  docsUrl: "https://dev.codewars.com",
  statCategory: { name: "Codewars", description: "Your katas on Codewars", icon: "Code", color: "#b1361e" },
  stats: [
    { id: "honor", name: "Honor", description: "Codewars honor points.", unit: "" },
    { id: "rank", name: "Rank", description: "Overall rank (kyu / dan).", unit: "", dataType: "string" },
    { id: "katas_completed", name: "Katas completed", description: "Code challenges completed.", unit: "" },
    { id: "leaderboard", name: "Leaderboard position", description: "Position on the overall leaderboard.", unit: "" },
  ],
  async verify(username) {
    const user = await fetchJson(
      `https://www.codewars.com/api/v1/users/${encodeURIComponent(username)}`,
      {},
      "No Codewars user with this username.",
    );
    return { account: user.username ?? username };
  },
  async fetchStats(username) {
    const user = await fetchJson(`https://www.codewars.com/api/v1/users/${encodeURIComponent(username)}`);
    return {
      honor: user.honor ?? null,
      rank: user.ranks?.overall?.name ?? null,
      katas_completed: user.codeChallenges?.totalCompleted ?? null,
      leaderboard: user.leaderboardPosition ?? null,
    };
  },
};

const wakatimeHeaders = (apiKey) => ({ Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}` });

export const wakatime = {
  key: "wakatime",
  name: "WakaTime",
  description: "Time spent coding, tracked by your editor plugin.",
  icon: "Timer",
  color: "#000000",
  category: "Development",
  auth: "apiKey",
  credentialLabel: "WakaTime secret API key",
  credentialHelp: "https://wakatime.com/settings/api-key",
  docsUrl: "https://wakatime.com/developers",
  statCategory: { name: "WakaTime", description: "Your coding time", icon: "Timer", color: "#3b82f6" },
  stats: [
    { id: "total_time", name: "Total coding time", description: "All time, since you installed WakaTime.", unit: "h" },
    { id: "week_time", name: "Coding time (7 days)", description: "Time coded over the last 7 days.", unit: "h" },
    { id: "daily_average", name: "Daily average (7 days)", description: "Average coding time per day this week.", unit: "h" },
  ],
  async verify(apiKey) {
    const { data } = await fetchJson("https://wakatime.com/api/v1/users/current", { headers: wakatimeHeaders(apiKey) });
    return { account: data?.username ?? data?.display_name ?? "WakaTime" };
  },
  async fetchStats(apiKey) {
    const headers = wakatimeHeaders(apiKey);
    const [allTime, week] = await Promise.all([
      fetchJson("https://wakatime.com/api/v1/users/current/all_time_since_today", { headers }),
      fetchJson("https://wakatime.com/api/v1/users/current/stats/last_7_days", { headers }),
    ]);
    return {
      total_time: toHours(allTime.data?.total_seconds),
      week_time: toHours(week.data?.total_seconds),
      daily_average: toHours(week.data?.daily_average),
    };
  },
};

const monkeytypeHeaders = (apeKey) => ({ Authorization: `ApeKey ${apeKey}` });

export const monkeytype = {
  key: "monkeytype",
  name: "Monkeytype",
  description: "Typing speed records and practice time on Monkeytype.",
  icon: "Keyboard",
  color: "#e2b714",
  category: "Skills",
  auth: "apiKey",
  credentialLabel: "Monkeytype ApeKey",
  credentialHelp: "https://monkeytype.com/account-settings?tab=apeKeys",
  docsUrl: "https://api.monkeytype.com/docs",
  statCategory: { name: "Monkeytype", description: "Your typing practice", icon: "Keyboard", color: "#e2b714" },
  stats: [
    { id: "best_wpm_60", name: "Best WPM (60s)", description: "Personal best on the 60 seconds test.", unit: "wpm" },
    { id: "best_wpm_15", name: "Best WPM (15s)", description: "Personal best on the 15 seconds test.", unit: "wpm" },
    { id: "tests_completed", name: "Tests completed", description: "Typing tests completed.", unit: "" },
    { id: "time_typing", name: "Time typing", description: "Total time spent typing.", unit: "h" },
  ],
  async verify(apeKey) {
    // Monkeytype answers 400 (not 401) to a malformed ApeKey
    const response = await fetch("https://api.monkeytype.com/users/stats", {
      headers: monkeytypeHeaders(apeKey),
      signal: AbortSignal.timeout(15000),
    });
    if ([400, 401, 403].includes(response.status))
      throw new ProviderError("Monkeytype refused this ApeKey: check it is copied and active.");
    if (!response.ok) throw new Error(`api.monkeytype.com answered ${response.status}`);
    return { account: "Monkeytype" };
  },
  async fetchStats(apeKey) {
    const headers = monkeytypeHeaders(apeKey);
    const best = async (mode2) => {
      const { data } = await fetchJson(`https://api.monkeytype.com/users/personalBests?mode=time&mode2=${mode2}`, { headers });
      const wpm = (Array.isArray(data) ? data : []).map((pb) => pb.wpm).filter((v) => typeof v === "number");
      return wpm.length ? Math.round(Math.max(...wpm)) : null;
    };
    const [stats, wpm60, wpm15] = await Promise.all([fetchJson("https://api.monkeytype.com/users/stats", { headers }), best(60), best(15)]);
    return {
      best_wpm_60: wpm60,
      best_wpm_15: wpm15,
      tests_completed: stats.data?.completedTests ?? null,
      time_typing: toHours(stats.data?.timeTyping),
    };
  },
};
