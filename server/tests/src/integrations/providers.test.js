import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { User } from "../../../src/models/userModel.js";
import { Integration } from "../../../src/models/integrationModel.js";
import { IntegrationUser } from "../../../src/models/integrationUser.js";
import { Stat } from "../../../src/models/statModel.js";
import { decrypt } from "../../../src/utils/crypto.js";
import { ensureProviderIntegrations, PROVIDERS } from "../../../src/integrations/index.js";
import { chesscom, lichess, steam } from "../../../src/integrations/providers/games.js";
import { codewars, leetcode, monkeytype, wakatime } from "../../../src/integrations/providers/code.js";
import { duolingo, openlibrary } from "../../../src/integrations/providers/life.js";
import { regularUser } from "../../fixtures/users.js";
import { authCookie } from "../../helpers.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

// Answers each URL with the first route whose pattern it contains
const mockFetch = (routes) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const match = Object.entries(routes).find(([pattern]) => String(url).includes(pattern));
    return match ? json(...[match[1]].flat()) : json({}, 404);
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Providers", () => {
  it("should read Chess.com ratings and count games", async () => {
    mockFetch({
      "/stats": {
        chess_rapid: { last: { rating: 1200 }, record: { win: 10, loss: 5, draw: 1 } },
        chess_blitz: { last: { rating: 1100 }, record: { win: 2, loss: 2, draw: 0 } },
        tactics: { highest: { rating: 1800 } },
      },
    });

    expect(await chesscom.fetchStats("Hikaru")).toEqual({
      rapid_rating: 1200,
      blitz_rating: 1100,
      bullet_rating: null,
      puzzle_rating: 1800,
      games_played: 20,
    });
  });

  it("should refuse an unknown Chess.com username", async () => {
    mockFetch({});
    await expect(chesscom.verify("nobody")).rejects.toThrow("No Chess.com player");
  });

  it("should find a Steam profile from its link, custom URL name or SteamID64", async () => {
    const spy = mockFetch({ "ResolveVanityURL/v1/?key=test&vanityurl=teo": { response: { success: 1, steamid: "76561198000000001" } } });
    process.env.STEAM_API_KEY = "test";

    expect(await steam.resolveId("https://steamcommunity.com/profiles/76561198000000002/")).toBe("76561198000000002");
    expect(await steam.resolveId(" 76561198000000003 ")).toBe("76561198000000003");
    expect(await steam.resolveId("https://steamcommunity.com/profiles/76561199141783393/")).toBe("76561199141783393");
    expect(await steam.resolveId("steamcommunity.com/profiles/76561199141783393")).toBe("76561199141783393");
    expect(spy).not.toHaveBeenCalled();
    expect(await steam.resolveId("https://steamcommunity.com/id/teo/")).toBe("76561198000000001");
    expect(await steam.resolveId("teo")).toBe("76561198000000001");
  });

  it("should explain that a Steam display name is not enough", async () => {
    mockFetch({ ResolveVanityURL: { response: { success: 42 } } });
    await expect(steam.resolveId("Teo le boss")).rejects.toThrow("Your display name does not work");
  });

  it("should read Lichess ratings and play time in hours", async () => {
    mockFetch({
      "lichess.org/api/user": {
        perfs: { blitz: { rating: 1500 }, puzzle: { rating: 2000 } },
        count: { all: 300 },
        playTime: { total: 36000 },
      },
    });

    expect(await lichess.fetchStats("thibault")).toMatchObject({
      blitz_rating: 1500,
      puzzle_rating: 2000,
      games_played: 300,
      play_time: 10,
    });
  });

  it("should read LeetCode solved problems by difficulty", async () => {
    mockFetch({
      "leetcode.com/graphql": {
        data: {
          matchedUser: {
            username: "u",
            profile: { ranking: 12345 },
            submitStatsGlobal: {
              acSubmissionNum: [
                { difficulty: "All", count: 120 },
                { difficulty: "Easy", count: 60 },
                { difficulty: "Medium", count: 50 },
                { difficulty: "Hard", count: 10 },
              ],
            },
          },
          userContestRanking: { rating: 1650.7 },
        },
      },
    });

    expect(await leetcode.fetchStats("u")).toEqual({
      solved_total: 120,
      solved_easy: 60,
      solved_medium: 50,
      solved_hard: 10,
      ranking: 12345,
      contest_rating: 1651,
    });
  });

  it("should refuse an unknown LeetCode username", async () => {
    mockFetch({ "leetcode.com/graphql": { data: { matchedUser: null } } });
    await expect(leetcode.verify("nobody")).rejects.toThrow("No LeetCode user");
  });

  it("should read Codewars honor, rank and katas", async () => {
    mockFetch({
      "codewars.com": {
        username: "u",
        honor: 540,
        leaderboardPosition: 9000,
        ranks: { overall: { name: "5 kyu" } },
        codeChallenges: { totalCompleted: 80 },
      },
    });

    expect(await codewars.fetchStats("u")).toEqual({ honor: 540, rank: "5 kyu", katas_completed: 80, leaderboard: 9000 });
  });

  it("should send the WakaTime key as basic auth and convert seconds to hours", async () => {
    const spy = mockFetch({
      all_time_since_today: { data: { total_seconds: 720000 } },
      last_7_days: { data: { total_seconds: 54000, daily_average: 7714 } },
    });

    expect(await wakatime.fetchStats("waka_key")).toEqual({ total_time: 200, week_time: 15, daily_average: 2.1 });
    expect(spy.mock.calls[0][1].headers.Authorization).toBe(`Basic ${Buffer.from("waka_key").toString("base64")}`);
  });

  it("should reject a refused WakaTime key", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({}, 401));
    await expect(wakatime.verify("bad")).rejects.toThrow("Access refused");
  });

  it("should keep the best Monkeytype WPM across languages", async () => {
    mockFetch({
      "mode2=60": { data: [{ wpm: 92.4 }, { wpm: 101.6 }] },
      "mode2=15": { data: [] },
      "users/stats": { data: { completedTests: 400, timeTyping: 18000 } },
    });

    expect(await monkeytype.fetchStats("ape")).toEqual({ best_wpm_60: 102, best_wpm_15: null, tests_completed: 400, time_typing: 5 });
  });

  it("should read the Duolingo streak and XP", async () => {
    mockFetch({ "duolingo.com": { users: [{ username: "u", streak: 42, totalXp: 9000, courses: [{}, {}] }] } });

    expect(await duolingo.fetchStats("u")).toEqual({ streak: 42, total_xp: 9000, courses: 2 });
  });

  it("should count Open Library shelves", async () => {
    mockFetch({
      "already-read": { numFound: 14, reading_log_entries: [] },
      "currently-reading": { numFound: 2, reading_log_entries: [] },
      "want-to-read": { numFound: 30, reading_log_entries: [] },
    });

    expect(await openlibrary.fetchStats("u")).toEqual({ books_read: 14, reading: 2, want_to_read: 30 });
  });
});

describe("Provider integrations", () => {
  let user;

  beforeEach(async () => {
    user = await User.create(regularUser);
    await ensureProviderIntegrations();
  });

  it("should create one integration per provider, and be idempotent", async () => {
    await ensureProviderIntegrations();

    expect(await Integration.countDocuments()).toBe(PROVIDERS.length);
    const chess = await Integration.findOne({ provider: "chesscom" });
    expect(chess.authType).toBe("username");
    expect(chess.availableStats.map((s) => s.id)).toEqual(chesscom.stats.map((s) => s.id));
  });

  it("should disable a provider whose server key is missing, then enable it once configured", async () => {
    expect((await Integration.findOne({ provider: "lastfm" })).status).toBe("disabled");

    process.env.LASTFM_API_KEY = "key";
    await ensureProviderIntegrations();
    delete process.env.LASTFM_API_KEY;

    expect((await Integration.findOne({ provider: "lastfm" })).status).toBe("available");
  });

  it("should adopt a GitHub integration created by hand", async () => {
    await Integration.deleteMany({});
    const legacy = await Integration.create({ name: "GitHub", status: "available", config: { authUrl: "auth/github" } });

    await ensureProviderIntegrations();

    expect((await Integration.findById(legacy._id)).provider).toBe("github");
    expect(await Integration.countDocuments({ name: "GitHub" })).toBe(1);
  });

  it("should connect with a username, store it encrypted and sync the stats", async () => {
    mockFetch({
      "/stats": { chess_rapid: { last: { rating: 1200 }, record: { win: 1, loss: 0, draw: 0 } } },
      "api.chess.com/pub/player/": { username: "magnus" },
    });
    const chess = await Integration.findOne({ provider: "chesscom" });

    const response = await request(app)
      .post(`/api/integrations/${chess._id}/connection`)
      .set("Cookie", authCookie(user))
      .send({ credential: "Magnus" });

    expect(response.status).toBe(200);
    const connection = await IntegrationUser.findOne({ userId: user._id, integrationId: chess._id });
    expect(decrypt(connection.accessToken)).toBe("Magnus");
    expect(connection.activedStat).toHaveLength(chesscom.stats.length);
    const rapid = await Stat.findOne({ userId: user._id, name: "Rapid rating", current: true });
    expect(rapid.value).toBe("1200");
    expect(rapid.numericValue).toBe(1200);
  });

  it("should answer 400 with the service's reason for an unknown username", async () => {
    mockFetch({});
    const chess = await Integration.findOne({ provider: "chesscom" });

    const response = await request(app)
      .post(`/api/integrations/${chess._id}/connection`)
      .set("Cookie", authCookie(user))
      .send({ credential: "nobody" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch("No Chess.com player");
    expect(await IntegrationUser.countDocuments()).toBe(0);
  });

  it("should refuse a credential connection for an OAuth integration", async () => {
    const github = await Integration.findOne({ provider: "github" });

    const response = await request(app)
      .post(`/api/integrations/${github._id}/connection`)
      .set("Cookie", authCookie(user))
      .send({ credential: "token" });

    expect(response.status).toBe(400);
  });

  it("should not expose the stored credential", async () => {
    mockFetch({ "/stats": {}, "api.chess.com/pub/player/": { username: "magnus" } });
    const chess = await Integration.findOne({ provider: "chesscom" });
    await request(app).post(`/api/integrations/${chess._id}/connection`).set("Cookie", authCookie(user)).send({ credential: "Magnus" });

    const response = await request(app).get("/api/integrations/enabled").set("Cookie", authCookie(user));

    expect(JSON.stringify(response.body)).not.toContain("accessToken");
    expect(response.body.find((i) => i.provider === "chesscom").integrationUser.config.account).toBe("magnus");
  });
});
