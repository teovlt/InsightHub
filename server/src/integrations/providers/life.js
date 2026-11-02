import { fetchJson, ProviderError } from "../http.js";

// Unofficial endpoint used by the Duolingo website; public profiles only
const duolingoUser = async (username) => {
  const data = await fetchJson(`https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}&fields=users`);
  const user = data.users?.[0];
  if (!user) throw new ProviderError("No Duolingo user with this username.");
  return user;
};

export const duolingo = {
  key: "duolingo",
  name: "Duolingo",
  description: "Your streak, XP and languages on Duolingo.",
  icon: "Languages",
  color: "#58cc02",
  category: "Learning",
  auth: "username",
  credentialLabel: "Duolingo username",
  docsUrl: "https://www.duolingo.com",
  statCategory: { name: "Duolingo", description: "Your language learning", icon: "Languages", color: "#58cc02" },
  stats: [
    { id: "streak", name: "Streak", description: "Days in a row with a lesson.", unit: "days" },
    { id: "total_xp", name: "Total XP", description: "Experience earned across all courses.", unit: "XP" },
    { id: "courses", name: "Languages", description: "Courses started.", unit: "" },
  ],
  async verify(username) {
    const user = await duolingoUser(username);
    return { account: user.username ?? username };
  },
  async fetchStats(username) {
    const user = await duolingoUser(username);
    return {
      streak: user.streak ?? null,
      total_xp: user.totalXp ?? null,
      courses: Array.isArray(user.courses) ? user.courses.length : null,
    };
  },
};

const lastfm = (method, username) =>
  fetchJson(
    `https://ws.audioscrobbler.com/2.0/?method=${method}&user=${encodeURIComponent(username)}&api_key=${process.env.LASTFM_API_KEY}&format=json`,
  );

export const lastfmProvider = {
  key: "lastfm",
  name: "Last.fm",
  description: "Your listening history from Last.fm (works with Spotify scrobbling).",
  icon: "Music",
  color: "#d51007",
  category: "Music",
  auth: "username",
  credentialLabel: "Last.fm username",
  docsUrl: "https://www.last.fm/api",
  requiresEnv: ["LASTFM_API_KEY"],
  statCategory: { name: "Last.fm", description: "Your music listening", icon: "Music", color: "#d51007" },
  stats: [
    { id: "scrobbles", name: "Scrobbles", description: "Tracks listened to.", unit: "plays" },
    { id: "artists", name: "Artists", description: "Different artists listened to.", unit: "" },
    { id: "tracks", name: "Tracks", description: "Different tracks listened to.", unit: "" },
    { id: "albums", name: "Albums", description: "Different albums listened to.", unit: "" },
  ],
  async verify(username) {
    const data = await lastfm("user.getinfo", username);
    if (data.error || !data.user) throw new ProviderError("No Last.fm user with this username.");
    return { account: data.user.name ?? username };
  },
  async fetchStats(username) {
    const { user } = await lastfm("user.getinfo", username);
    const n = (value) => (value === undefined ? null : Number(value));
    return { scrobbles: n(user?.playcount), artists: n(user?.artist_count), tracks: n(user?.track_count), albums: n(user?.album_count) };
  },
};

// Size of a shelf of a public Open Library reading log. One entry is enough to get numFound
// (full pages are slow to build); if numFound is ever missing, the shelf is counted page by page.
const countShelf = async (username, shelf) => {
  const base = `https://openlibrary.org/people/${encodeURIComponent(username)}/books/${shelf}.json`;
  const first = await fetchJson(`${base}?limit=1`, {}, "No public Open Library reading log for this username.");
  if (typeof first.numFound === "number") return first.numFound;

  let count = 0;
  let length = 100;
  for (let page = 1; length === 100 && page <= 20; page++) {
    const next = await fetchJson(`${base}?page=${page}`);
    length = next.reading_log_entries?.length ?? 0;
    count += length;
  }
  return count;
};

export const openlibrary = {
  key: "openlibrary",
  name: "Open Library",
  description: "Books read, in progress and on your list, from your public Open Library reading log.",
  icon: "BookOpen",
  color: "#e1a325",
  category: "Reading",
  auth: "username",
  credentialLabel: "Open Library username",
  docsUrl: "https://openlibrary.org/developers/api",
  statCategory: { name: "Open Library", description: "Your reading", icon: "BookOpen", color: "#c08423" },
  stats: [
    { id: "books_read", name: "Books read", description: "Books on your “Already read” shelf.", unit: "books" },
    { id: "reading", name: "Currently reading", description: "Books on your “Currently reading” shelf.", unit: "books" },
    { id: "want_to_read", name: "Want to read", description: "Books on your “Want to read” shelf.", unit: "books" },
  ],
  async verify(username) {
    await countShelf(username, "already-read");
    return { account: username };
  },
  async fetchStats(username) {
    const [read, reading, want] = await Promise.all([
      countShelf(username, "already-read"),
      countShelf(username, "currently-reading"),
      countShelf(username, "want-to-read"),
    ]);
    return { books_read: read, reading, want_to_read: want };
  },
};
