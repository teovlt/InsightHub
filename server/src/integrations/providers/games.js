import { fetchJson, ProviderError, toHours } from "../http.js";

const sumRecord = (record) => (record ? (record.win ?? 0) + (record.loss ?? 0) + (record.draw ?? 0) : 0);

export const chesscom = {
  key: "chesscom",
  name: "Chess.com",
  description: "Your ratings and games on Chess.com.",
  icon: "Crown",
  color: "#7fa650",
  category: "Games",
  auth: "username",
  credentialLabel: "Chess.com username",
  docsUrl: "https://www.chess.com/news/view/published-data-api",
  statCategory: { name: "Chess.com", description: "Your games on Chess.com", icon: "Crown", color: "#7fa650" },
  stats: [
    { id: "rapid_rating", name: "Rapid rating", description: "Current rapid rating.", unit: "" },
    { id: "blitz_rating", name: "Blitz rating", description: "Current blitz rating.", unit: "" },
    { id: "bullet_rating", name: "Bullet rating", description: "Current bullet rating.", unit: "" },
    { id: "puzzle_rating", name: "Best puzzle rating", description: "Highest tactics rating.", unit: "" },
    { id: "games_played", name: "Games played", description: "Rapid, blitz, bullet and daily games.", unit: "games" },
  ],
  async verify(username) {
    const player = await fetchJson(
      `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}`,
      {},
      "No Chess.com player with this username.",
    );
    return { account: player.username ?? username };
  },
  async fetchStats(username) {
    const stats = await fetchJson(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/stats`);
    const modes = ["chess_rapid", "chess_blitz", "chess_bullet", "chess_daily"];
    return {
      rapid_rating: stats.chess_rapid?.last?.rating ?? null,
      blitz_rating: stats.chess_blitz?.last?.rating ?? null,
      bullet_rating: stats.chess_bullet?.last?.rating ?? null,
      puzzle_rating: stats.tactics?.highest?.rating ?? null,
      games_played: modes.reduce((sum, mode) => sum + sumRecord(stats[mode]?.record), 0),
    };
  },
};

export const lichess = {
  key: "lichess",
  name: "Lichess",
  description: "Your ratings, games and play time on Lichess.",
  icon: "Crown",
  color: "#262421",
  category: "Games",
  auth: "username",
  credentialLabel: "Lichess username",
  docsUrl: "https://lichess.org/api",
  statCategory: { name: "Lichess", description: "Your games on Lichess", icon: "Crown", color: "#8a6a3f" },
  stats: [
    { id: "blitz_rating", name: "Blitz rating", description: "Current blitz rating.", unit: "" },
    { id: "rapid_rating", name: "Rapid rating", description: "Current rapid rating.", unit: "" },
    { id: "puzzle_rating", name: "Puzzle rating", description: "Current puzzle rating.", unit: "" },
    { id: "games_played", name: "Games played", description: "All rated and casual games.", unit: "games" },
    { id: "play_time", name: "Time played", description: "Total time spent playing.", unit: "h" },
  ],
  async verify(username) {
    const user = await fetchJson(
      `https://lichess.org/api/user/${encodeURIComponent(username)}`,
      {},
      "No Lichess player with this username.",
    );
    if (user.disabled) throw new ProviderError("This Lichess account is closed.");
    return { account: user.username ?? username };
  },
  async fetchStats(username) {
    const user = await fetchJson(`https://lichess.org/api/user/${encodeURIComponent(username)}`);
    return {
      blitz_rating: user.perfs?.blitz?.rating ?? null,
      rapid_rating: user.perfs?.rapid?.rating ?? null,
      puzzle_rating: user.perfs?.puzzle?.rating ?? null,
      games_played: user.count?.all ?? null,
      play_time: toHours(user.playTime?.total),
    };
  },
};

export const steam = {
  key: "steam",
  name: "Steam",
  description: "Your library and play time on Steam (public profile required).",
  icon: "Gamepad2",
  color: "#1b2838",
  category: "Games",
  auth: "username",
  credentialLabel: "Steam profile name or SteamID64",
  docsUrl: "https://steamcommunity.com/dev",
  requiresEnv: ["STEAM_API_KEY"],
  statCategory: { name: "Steam", description: "Your games on Steam", icon: "Gamepad2", color: "#2a475e" },
  stats: [
    { id: "games_owned", name: "Games owned", description: "Games in your library.", unit: "games" },
    { id: "total_playtime", name: "Total play time", description: "Time played across all games.", unit: "h" },
    { id: "recent_playtime", name: "Play time (2 weeks)", description: "Time played in the last two weeks.", unit: "h" },
  ],
  async resolveId(input) {
    if (/^\d{17}$/.test(input)) return input;
    const key = process.env.STEAM_API_KEY;
    const data = await fetchJson(
      `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(input)}`,
    );
    if (data.response?.success !== 1) throw new ProviderError("No Steam profile with this name.");
    return data.response.steamid;
  },
  async verify(input) {
    const steamId = await this.resolveId(input);
    const data = await fetchJson(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}`,
    );
    if (data.response?.game_count === undefined) throw new ProviderError("This Steam profile or its game details are private.");
    return { account: input, credential: steamId };
  },
  async fetchStats(steamId) {
    const key = process.env.STEAM_API_KEY;
    const [owned, recent] = await Promise.all([
      fetchJson(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${steamId}`),
      fetchJson(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${key}&steamid=${steamId}`),
    ]);
    const minutes = (games, field) => (games ?? []).reduce((sum, game) => sum + (game[field] ?? 0), 0);
    return {
      games_owned: owned.response?.game_count ?? null,
      total_playtime: toHours(minutes(owned.response?.games, "playtime_forever") * 60),
      recent_playtime: toHours(minutes(recent.response?.games, "playtime_2weeks") * 60),
    };
  },
};
