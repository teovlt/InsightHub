import { fetchJson, fetchText, ProviderError } from "../http.js";

const DAY = 24 * 60 * 60 * 1000;

/* Spotify: OAuth, tokens expire after one hour and are refreshed (see integrations/oauth.js) */

const spotify = (path, accessToken) =>
  fetchJson(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });

// Size of a saved collection: one item is enough to get the total
const spotifyTotal = async (path, accessToken) =>
  (await spotify(`${path}${path.includes("?") ? "&" : "?"}limit=1`, accessToken)).total ?? null;

export const spotifyProvider = {
  key: "spotify",
  name: "Spotify",
  description: "Liked songs, playlists, followed artists and what you listened to today on Spotify.",
  icon: "Music",
  color: "#1db954",
  category: "Music",
  auth: "oauth",
  authUrl: "auth/oauth/spotify",
  docsUrl: "https://developer.spotify.com/documentation/web-api",
  requiresEnv: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
  oauth: {
    authorizeUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    // Read-only scopes: InsightHub never changes anything in the user's library
    scope: "user-read-private user-library-read user-follow-read playlist-read-private user-read-recently-played",
    clientIdEnv: "SPOTIFY_CLIENT_ID",
    clientSecretEnv: "SPOTIFY_CLIENT_SECRET",
    tokenAuth: "basic",
  },
  statCategory: { name: "Spotify", description: "Your music on Spotify", icon: "Music", color: "#1db954" },
  stats: [
    {
      id: "listening_today",
      name: "Listening (24 h)",
      description: "Minutes listened in the last 24 hours (from your last 50 plays).",
      unit: "min",
    },
    { id: "tracks_today", name: "Tracks played (24 h)", description: "Tracks played in the last 24 hours (up to 50).", unit: "tracks" },
    {
      id: "artists_today",
      name: "Artists played (24 h)",
      description: "Different artists in your plays of the last 24 hours.",
      unit: "artists",
    },
    { id: "liked_tracks", name: "Liked songs", description: "Songs in your Liked Songs.", unit: "songs" },
    { id: "saved_albums", name: "Saved albums", description: "Albums saved in your library.", unit: "albums" },
    { id: "playlists", name: "Playlists", description: "Playlists you created or follow.", unit: "playlists" },
    { id: "followed_artists", name: "Followed artists", description: "Artists you follow.", unit: "artists" },
    { id: "saved_shows", name: "Podcasts", description: "Podcasts saved in your library.", unit: "shows" },
    { id: "followers", name: "Followers", description: "People following your Spotify profile.", unit: "" },
  ],
  async connect(accessToken) {
    const me = await spotify("/me", accessToken);
    return { account: me.display_name || me.id, config: { spotifyId: me.id } };
  },
  async fetchStats(accessToken, keys) {
    const wants = (...ids) => ids.some((id) => keys.includes(id));
    const tasks = {};

    if (wants("liked_tracks")) tasks.liked_tracks = spotifyTotal("/me/tracks", accessToken);
    if (wants("saved_albums")) tasks.saved_albums = spotifyTotal("/me/albums", accessToken);
    if (wants("playlists")) tasks.playlists = spotifyTotal("/me/playlists", accessToken);
    if (wants("saved_shows")) tasks.saved_shows = spotifyTotal("/me/shows", accessToken);
    if (wants("followed_artists")) {
      tasks.followed_artists = spotify("/me/following?type=artist&limit=1", accessToken).then((data) => data.artists?.total ?? null);
    }
    if (wants("followers")) tasks.followers = spotify("/me", accessToken).then((me) => me.followers?.total ?? null);
    if (wants("listening_today", "tracks_today", "artists_today")) {
      // Spotify only exposes the last 50 plays: a heavy listener's day is capped there
      tasks.recent = spotify(`/me/player/recently-played?limit=50&after=${Date.now() - DAY}`, accessToken).then((data) => {
        const plays = (data.items ?? []).filter((item) => new Date(item.played_at).getTime() >= Date.now() - DAY);
        return {
          listening_today: Math.round(plays.reduce((sum, item) => sum + (item.track?.duration_ms ?? 0), 0) / 60000),
          tracks_today: plays.length,
          artists_today: new Set(plays.flatMap((item) => (item.track?.artists ?? []).map((artist) => artist.id))).size,
        };
      });
    }

    const entries = await Promise.all(Object.entries(tasks).map(async ([key, task]) => [key, await task]));
    const { recent, ...values } = Object.fromEntries(entries);
    return { ...values, ...recent };
  },
};

/* Letterboxd: no public API, so the public profile page and its RSS feed are read */

const letterboxdUser = (username) =>
  username
    .trim()
    .replace(/^https?:\/\/(www\.)?letterboxd\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .toLowerCase();

/**
 * @function readDiaryEntries
 * @description Diary entries of a Letterboxd RSS feed (reviews and logs; lists are skipped).
 * @param {string} xml - The RSS feed.
 * @returns {{ watchedDate: Date, rating: number|null, rewatch: boolean }[]} The entries.
 */
export const readDiaryEntries = (xml) =>
  [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => {
      const tag = (name) => item.match(new RegExp(`<letterboxd:${name}>([^<]*)</letterboxd:${name}>`))?.[1];
      const watched = tag("watchedDate");
      if (!watched) return null;
      const rating = Number(tag("memberRating"));
      return {
        watchedDate: new Date(`${watched}T12:00:00`),
        rating: Number.isFinite(rating) && tag("memberRating") ? rating : null,
        rewatch: tag("rewatch") === "Yes",
      };
    })
    .filter(Boolean);

// Letterboxd has no public API and its pages refuse server requests: only the RSS feed it offers is read.
// The feed holds the member's 50 latest activities (diary entries and lists).
const letterboxdFeed = async (username) =>
  readDiaryEntries(
    await fetchText(`https://letterboxd.com/${encodeURIComponent(username)}/rss/`, `No Letterboxd member named "${username}".`),
  );

export const letterboxd = {
  key: "letterboxd",
  name: "Letterboxd",
  description: "Films you log and how you rate them, from your public Letterboxd diary.",
  icon: "Clapperboard",
  color: "#202830",
  category: "Movies",
  auth: "username",
  credentialLabel: "Letterboxd username",
  credentialPlaceholder: "yourname or letterboxd.com/yourname",
  credentialSteps: [
    "Open your Letterboxd profile: the username is the end of its link, letterboxd.com/yourname.",
    "Paste the username or the whole link here. Your profile must be public.",
    "Log films in your diary (with a watched date) so they count here.",
  ],
  docsUrl: "https://letterboxd.com",
  statCategory: { name: "Letterboxd", description: "Your films", icon: "Clapperboard", color: "#40bcf4" },
  stats: [
    { id: "films_7d", name: "Films this week", description: "Films logged in your diary in the last 7 days.", unit: "films" },
    { id: "films_30d", name: "Films (30 days)", description: "Films logged in your diary in the last 30 days.", unit: "films" },
    { id: "average_rating", name: "Average rating", description: "Average of your ratings in your latest diary entries.", unit: "★" },
    { id: "rewatches_30d", name: "Rewatches (30 days)", description: "Films you watched again in the last 30 days.", unit: "films" },
  ],
  async verify(input) {
    const username = letterboxdUser(input);
    if (!username) throw new ProviderError("Enter your Letterboxd username.");
    await letterboxdFeed(username);
    return { account: username, credential: username };
  },
  async fetchStats(username) {
    const entries = await letterboxdFeed(username);
    const since = (days) => entries.filter((entry) => entry.watchedDate.getTime() >= Date.now() - days * DAY);
    const ratings = entries.map((entry) => entry.rating).filter((rating) => rating !== null);

    return {
      films_7d: since(7).length,
      films_30d: since(30).length,
      average_rating: ratings.length ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 100) / 100 : null,
      rewatches_30d: since(30).filter((entry) => entry.rewatch).length,
    };
  },
};
