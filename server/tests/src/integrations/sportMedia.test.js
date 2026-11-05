import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";
import { User } from "../../../src/models/userModel.js";
import { Integration } from "../../../src/models/integrationModel.js";
import { IntegrationUser } from "../../../src/models/integrationUser.js";
import { Stat } from "../../../src/models/statModel.js";
import { decrypt } from "../../../src/utils/crypto.js";
import { ensureProviderIntegrations } from "../../../src/integrations/index.js";
import { getCredential, serializeTokens } from "../../../src/integrations/oauth.js";
import { startOfWeek, weekStreak } from "../../../src/integrations/http.js";
import { hevyProvider, stravaProvider } from "../../../src/integrations/providers/sport.js";
import { letterboxd, readDiaryEntries, spotifyProvider } from "../../../src/integrations/providers/media.js";
import { regularUser } from "../../fixtures/users.js";
import { authCookie } from "../../helpers.js";

const DAY = 24 * 60 * 60 * 1000;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const text = (body, status = 200) => new Response(body, { status });
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();

// Answers each URL with the first route whose pattern it contains.
// A route is a JSON body, a Response (for a status or a text body) or a function of (url, options).
const mockFetch = (routes) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
    const match = Object.entries(routes).find(([pattern]) => String(url).includes(pattern));
    if (!match) return json({}, 404);
    const route = match[1];
    if (typeof route === "function") return route(String(url), options);
    return route instanceof Response ? route.clone() : json(route);
  });

const rssItem = (watched, rating, kind = "review") =>
  `<item><guid isPermaLink="false">letterboxd-${kind}-1</guid>${watched ? `<letterboxd:watchedDate>${watched}</letterboxd:watchedDate>` : ""}<letterboxd:rewatch>No</letterboxd:rewatch>${
    rating ? `<letterboxd:memberRating>${rating}</letterboxd:memberRating>` : ""
  }</item>`;
const isoDay = (days) => daysAgo(days).slice(0, 10);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("weekStreak", () => {
  it("should count the weeks in a row up to this week", () => {
    const thisWeek = startOfWeek();
    const weeksBack = (n) => new Date(thisWeek.getTime() - n * 7 * DAY + DAY);
    expect(weekStreak([weeksBack(0), weeksBack(1), weeksBack(2), weeksBack(4)])).toBe(3);
  });

  it("should keep last week's streak alive on Monday morning", () => {
    const lastWeek = new Date(startOfWeek().getTime() - 3 * DAY);
    expect(weekStreak([lastWeek])).toBe(1);
  });

  it("should be 0 without recent entries", () => {
    expect(weekStreak([new Date(Date.now() - 60 * DAY)])).toBe(0);
    expect(weekStreak([])).toBe(0);
  });
});

describe("Strava", () => {
  it("should read the totals and the recent activities", async () => {
    mockFetch({
      "/athletes/42/stats": {
        biggest_ride_distance: 120500,
        ytd_run_totals: { distance: 250000 },
        ytd_ride_totals: { distance: 1000000 },
        all_run_totals: { count: 100, distance: 1500000, elevation_gain: 5000.4 },
        all_ride_totals: { count: 50, distance: 4000000, elevation_gain: 20000 },
        all_swim_totals: { count: 5, distance: 7500 },
      },
      "/athlete/activities": [
        { start_date: new Date().toISOString(), distance: 10000, moving_time: 3600 },
        { start_date: daysAgo(10), distance: 30000, moving_time: 5400 },
        { start_date: daysAgo(60), distance: 5000, moving_time: 1800 },
      ],
    });

    const values = await stravaProvider.fetchStats(
      "token",
      stravaProvider.stats.map((stat) => stat.id),
      { config: { athleteId: 42 } },
    );

    expect(values).toMatchObject({
      run_distance_ytd: 250,
      ride_distance_ytd: 1000,
      run_distance_total: 1500,
      ride_distance_total: 4000,
      swim_distance_total: 7.5,
      activities_total: 155,
      elevation_total: 25000,
      longest_ride: 120.5,
      activities_week: 1,
      distance_4w: 40,
      moving_time_4w: 2.5,
    });
    expect(values.week_streak).toBeGreaterThanOrEqual(1);
  });

  it("should only call the endpoints the activated stats need", async () => {
    const spy = mockFetch({ "/athletes/42/stats": { all_run_totals: { distance: 1000 } } });

    await stravaProvider.fetchStats("token", ["run_distance_total"], { config: { athleteId: 42 } });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should name the account after the athlete sent with the tokens", async () => {
    expect(await stravaProvider.connect("token", { athlete: { id: 42, username: "teo_runs" } })).toEqual({
      account: "teo_runs",
      config: { athleteId: 42 },
    });
  });
});

describe("Hevy", () => {
  it("should refuse a key Hevy does not accept", async () => {
    mockFetch({ "/workouts/count": json({ error: "Unauthorized" }, 401) });
    await expect(hevyProvider.verify("bad-key")).rejects.toThrow("Hevy refused this API key");
  });

  it("should keep the key and connect even without the user endpoint", async () => {
    mockFetch({ "/workouts/count": { workout_count: 12 } });
    expect(await hevyProvider.verify("  key  ")).toEqual({ account: "Hevy", credential: "key" });
  });

  it("should compute counts, volume and time, warm-up sets excluded", async () => {
    const workout = (start, minutes) => ({
      start_time: start,
      end_time: new Date(new Date(start).getTime() + minutes * 60000).toISOString(),
      exercises: [
        {
          sets: [
            { type: "warmup", weight_kg: 20, reps: 10 },
            { type: "normal", weight_kg: 100, reps: 5 },
            { type: "failure", weight_kg: 80, reps: 8 },
          ],
        },
      ],
    });
    mockFetch({
      "/workouts/count": { workout_count: 321 },
      "/workouts?page=1": {
        page: 1,
        page_count: 1,
        workouts: [workout(new Date().toISOString(), 60), workout(daysAgo(20), 90), workout(daysAgo(400), 60)],
      },
    });

    const values = await hevyProvider.fetchStats(
      "key",
      hevyProvider.stats.map((stat) => stat.id),
    );

    expect(values).toMatchObject({
      workouts_total: 321,
      workouts_week: 1,
      workouts_30d: 2,
      volume_30d: 2280,
      sets_30d: 4,
      training_time_30d: 2.5,
    });
    expect(values.week_streak).toBeGreaterThanOrEqual(1);
  });

  it("should stop paging once it reaches old workouts", async () => {
    const spy = mockFetch({
      "/workouts?page=1": { page_count: 50, workouts: Array.from({ length: 10 }, (_, i) => ({ start_time: daysAgo(i === 9 ? 45 : i) })) },
    });

    await hevyProvider.fetchStats("key", ["workouts_30d"]);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("Spotify", () => {
  it("should read the library totals and the plays of the last 24 hours", async () => {
    mockFetch({
      "/me/tracks": { total: 1500 },
      "/me/albums": { total: 80 },
      "/me/playlists": { total: 25 },
      "/me/shows": { total: 4 },
      "/me/following": { artists: { total: 60 } },
      "/me/player/recently-played": {
        items: [
          { played_at: new Date().toISOString(), track: { duration_ms: 180000, artists: [{ id: "a" }] } },
          { played_at: daysAgo(0.5), track: { duration_ms: 240000, artists: [{ id: "a" }, { id: "b" }] } },
          { played_at: daysAgo(2), track: { duration_ms: 200000, artists: [{ id: "c" }] } },
        ],
      },
      "/v1/me": { followers: { total: 9 } },
    });

    const values = await spotifyProvider.fetchStats(
      "token",
      spotifyProvider.stats.map((stat) => stat.id),
    );

    expect(values).toEqual({
      liked_tracks: 1500,
      saved_albums: 80,
      playlists: 25,
      saved_shows: 4,
      followed_artists: 60,
      followers: 9,
      listening_today: 7,
      tracks_today: 2,
      artists_today: 2,
    });
  });
});

describe("Letterboxd", () => {
  it("should keep diary entries only", () => {
    const entries = readDiaryEntries(rssItem("2026-11-01", "4.5") + rssItem(null, null, "list") + rssItem("2026-10-01", null, "watch"));
    expect(entries).toHaveLength(2);
    expect(entries[0].rating).toBe(4.5);
    expect(entries[1].rating).toBe(null);
  });

  it("should accept a profile link and refuse an unknown member", async () => {
    mockFetch({ "letterboxd.com/teo/rss/": text("<rss></rss>") });
    expect(await letterboxd.verify("https://letterboxd.com/Teo/films/")).toEqual({ account: "teo", credential: "teo" });

    vi.restoreAllMocks();
    mockFetch({});
    await expect(letterboxd.verify("nobody")).rejects.toThrow("No Letterboxd member");
  });

  it("should count recent films, rewatches and the average rating", async () => {
    const rewatch = rssItem(isoDay(3), "5.0").replace("<letterboxd:rewatch>No", "<letterboxd:rewatch>Yes");
    mockFetch({
      "/teo/rss/": text(`<rss>${rssItem(isoDay(2), "4.0")}${rewatch}${rssItem(isoDay(10), "3.0")}${rssItem(isoDay(90), null)}</rss>`),
    });

    expect(await letterboxd.fetchStats("teo")).toEqual({ films_7d: 2, films_30d: 3, average_rating: 4, rewatches_30d: 1 });
  });
});

describe("Generic OAuth", () => {
  let user;

  beforeEach(async () => {
    vi.stubEnv("STRAVA_CLIENT_ID", "strava-id");
    vi.stubEnv("STRAVA_CLIENT_SECRET", "strava-secret");
    vi.stubEnv("SPOTIFY_CLIENT_ID", "spotify-id");
    vi.stubEnv("SPOTIFY_CLIENT_SECRET", "spotify-secret");
    user = await User.create(regularUser);
    await ensureProviderIntegrations();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should create the four integrations, OAuth ones only when their keys are set", async () => {
    const byKey = Object.fromEntries(
      (await Integration.find({ provider: { $in: ["strava", "spotify", "hevy", "letterboxd"] } }).lean()).map((i) => [i.provider, i]),
    );

    expect(byKey.strava.status).toBe("available");
    expect(byKey.strava.config.authUrl).toBe("auth/oauth/strava");
    expect(byKey.spotify.authType).toBe("oauth");
    expect(byKey.hevy.authType).toBe("apiKey");
    expect(byKey.letterboxd.authType).toBe("username");
  });

  it("should redirect to Strava with a state and the read scopes", async () => {
    const integration = await Integration.findOne({ provider: "strava" });

    const response = await request(app)
      .get(`/api/integrations/auth/oauth/strava?integrationId=${integration._id}`)
      .set("Cookie", authCookie(user));

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.origin + location.pathname).toBe("https://www.strava.com/oauth/authorize");
    expect(location.searchParams.get("client_id")).toBe("strava-id");
    expect(location.searchParams.get("scope")).toBe("read,activity:read_all");
    expect(location.searchParams.get("redirect_uri")).toMatch(/\/api\/integrations\/auth\/oauth\/strava\/callback$/);
    expect(location.searchParams.get("state")).toMatch(/^[0-9a-f]{32}$/);
  });

  it("should reject a callback whose state does not match", async () => {
    const response = await request(app).get("/api/integrations/auth/oauth/strava/callback?code=abc&state=forged");
    expect(response.status).toBe(400);
  });

  it("should connect Strava end to end: tokens stored encrypted, stats created", async () => {
    const integration = await Integration.findOne({ provider: "strava" });
    const agent = request.agent(app);
    const redirect = await agent
      .get(`/api/integrations/auth/oauth/strava?integrationId=${integration._id}`)
      .set("Cookie", authCookie(user));
    const state = new URL(redirect.headers.location).searchParams.get("state");

    mockFetch({
      "strava.com/oauth/token": {
        access_token: "access-1",
        refresh_token: "refresh-1",
        expires_at: Math.floor(Date.now() / 1000) + 21600,
        athlete: { id: 42, firstname: "Teo" },
      },
      "/athletes/42/stats": { all_run_totals: { count: 3, distance: 21000 } },
      "/athlete/activities": [],
    });
    const callback = await agent.get(`/api/integrations/auth/oauth/strava/callback?code=the-code&state=${state}`);

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toMatch(/\/integrations$/);
    const connection = await IntegrationUser.findOne({ userId: user._id, integrationId: integration._id }).lean();
    expect(connection.config).toMatchObject({ account: "Teo", athleteId: 42 });
    expect(JSON.parse(decrypt(connection.accessToken))).toMatchObject({ accessToken: "access-1", refreshToken: "refresh-1" });
    const run = await Stat.findOne({ userId: user._id, name: "Total running", current: true }).lean();
    expect(run.value).toBe("21");
  });

  it("should send the user back with error=denied when they cancel", async () => {
    const integration = await Integration.findOne({ provider: "strava" });
    const agent = request.agent(app);
    const redirect = await agent
      .get(`/api/integrations/auth/oauth/strava?integrationId=${integration._id}`)
      .set("Cookie", authCookie(user));
    const state = new URL(redirect.headers.location).searchParams.get("state");

    const callback = await agent.get(`/api/integrations/auth/oauth/strava/callback?error=access_denied&state=${state}`);

    expect(callback.headers.location).toMatch(/\/integrations\?error=denied$/);
  });

  it("should refresh an expired Spotify token with Basic auth and keep the refresh token", async () => {
    const connection = await IntegrationUser.create({
      userId: user._id,
      integrationId: (await Integration.findOne({ provider: "spotify" }))._id,
      accessToken: serializeTokens({ accessToken: "old", refreshToken: "refresh", expiresAt: Date.now() - 1000 }),
    });
    const spy = mockFetch({ "accounts.spotify.com/api/token": { access_token: "new", expires_in: 3600 } });

    expect(await getCredential(connection.toObject(), spotifyProvider)).toBe("new");

    const [, options] = spy.mock.calls[0];
    expect(options.headers.Authorization).toBe(`Basic ${Buffer.from("spotify-id:spotify-secret").toString("base64")}`);
    expect(options.body.get("grant_type")).toBe("refresh_token");
    const stored = JSON.parse(decrypt((await IntegrationUser.findById(connection._id).lean()).accessToken));
    expect(stored).toMatchObject({ accessToken: "new", refreshToken: "refresh" });
  });

  it("should not refresh a token that is still valid", async () => {
    const connection = { accessToken: serializeTokens({ accessToken: "valid", refreshToken: "r", expiresAt: Date.now() + 3600 * 1000 }) };
    const spy = mockFetch({});

    expect(await getCredential(connection, stravaProvider)).toBe("valid");
    expect(spy).not.toHaveBeenCalled();
  });
});
