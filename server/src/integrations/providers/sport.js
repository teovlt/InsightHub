import { fetchJson, ProviderError, startOfWeek, toHours, toKm, weekStreak } from "../http.js";

const DAY = 24 * 60 * 60 * 1000;

/* Strava: OAuth, tokens expire after 6 hours and are refreshed (see integrations/oauth.js) */

const strava = async (path, accessToken) => {
  try {
    return await fetchJson(`https://www.strava.com/api/v3${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch (err) {
    // 401/403: a revoked access, or a permission unticked on the consent page
    if (err instanceof ProviderError) {
      console.error(`strava ${path.split("?")[0]} answered ${err.status}: ${err.detail}`);
      throw new ProviderError("Strava refused access: reconnect Strava and keep every permission ticked.");
    }
    throw err;
  }
};

// Every activity since the date, newest pages first; 200 is the largest page Strava allows
const stravaActivitiesSince = async (accessToken, since) => {
  const activities = [];
  const after = Math.floor(since.getTime() / 1000);
  for (let page = 1; page <= 5; page++) {
    const batch = await strava(`/athlete/activities?after=${after}&per_page=200&page=${page}`, accessToken);
    activities.push(...batch);
    if (batch.length < 200) break;
  }
  return activities;
};

export const stravaProvider = {
  key: "strava",
  name: "Strava",
  description: "Running, cycling and swimming: distances, time and weekly streak from your Strava activities.",
  icon: "Activity",
  color: "#fc4c02",
  category: "Sport",
  auth: "oauth",
  authUrl: "auth/oauth/strava",
  docsUrl: "https://developers.strava.com/docs/reference/",
  requiresEnv: ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET"],
  oauth: {
    authorizeUrl: "https://www.strava.com/oauth/authorize",
    tokenUrl: "https://www.strava.com/oauth/token",
    // activity:read_all includes "Only you" activities in the recent stats
    scope: "read,activity:read_all",
    clientIdEnv: "STRAVA_CLIENT_ID",
    clientSecretEnv: "STRAVA_CLIENT_SECRET",
    tokenAuth: "body",
    authorizeParams: { approval_prompt: "auto" },
  },
  statCategory: { name: "Strava", description: "Your sport activities", icon: "Activity", color: "#fc4c02" },
  stats: [
    { id: "activities_week", name: "Activities this week", description: "Activities since Monday.", unit: "activities" },
    { id: "week_streak", name: "Weekly streak", description: "Weeks in a row with at least one activity.", unit: "weeks" },
    { id: "distance_4w", name: "Distance (4 weeks)", description: "All sports, last 28 days.", unit: "km" },
    { id: "moving_time_4w", name: "Moving time (4 weeks)", description: "All sports, last 28 days.", unit: "h" },
    { id: "run_distance_ytd", name: "Running this year", description: "Distance run since January 1st.", unit: "km" },
    { id: "ride_distance_ytd", name: "Cycling this year", description: "Distance ridden since January 1st.", unit: "km" },
    { id: "run_distance_total", name: "Total running", description: "Distance run since you joined Strava.", unit: "km" },
    { id: "ride_distance_total", name: "Total cycling", description: "Distance ridden since you joined Strava.", unit: "km" },
    { id: "swim_distance_total", name: "Total swimming", description: "Distance swum since you joined Strava.", unit: "km" },
    { id: "activities_total", name: "Activities", description: "Runs, rides and swims since you joined Strava.", unit: "activities" },
    { id: "elevation_total", name: "Elevation gain", description: "Climbed running and riding since you joined.", unit: "m" },
    { id: "longest_ride", name: "Longest ride", description: "Your longest ride ever.", unit: "km" },
  ],
  // Called once after the OAuth exchange: Strava sends the athlete with the tokens
  // grantedScope: Strava lets the user untick permissions on its consent page, and sends back what was granted
  async connect(accessToken, raw, { grantedScope } = {}) {
    const athlete = raw.athlete ?? (await strava("/athlete", accessToken));
    const name = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ");
    return {
      account: athlete.username || name || `#${athlete.id}`,
      config: { athleteId: athlete.id, ...(grantedScope && { scope: grantedScope }) },
    };
  },
  async fetchStats(accessToken, keys, connection) {
    const athleteId = connection.config?.athleteId ?? (await strava("/athlete", accessToken)).id;
    const wants = (...ids) => ids.some((id) => keys.includes(id));
    const values = {};
    const sections = [];

    // Totals: one call. Strava only counts activities visible to "Everyone" in them.
    if (
      wants(
        "run_distance_ytd",
        "ride_distance_ytd",
        "run_distance_total",
        "ride_distance_total",
        "swim_distance_total",
        "activities_total",
        "elevation_total",
        "longest_ride",
      )
    ) {
      sections.push(async () => {
        const totals = await strava(`/athletes/${athleteId}/stats`, accessToken);
        const all = [totals.all_run_totals, totals.all_ride_totals, totals.all_swim_totals];
        Object.assign(values, {
          run_distance_ytd: toKm(totals.ytd_run_totals?.distance),
          ride_distance_ytd: toKm(totals.ytd_ride_totals?.distance),
          run_distance_total: toKm(totals.all_run_totals?.distance),
          ride_distance_total: toKm(totals.all_ride_totals?.distance),
          swim_distance_total: toKm(totals.all_swim_totals?.distance),
          activities_total: all.reduce((sum, total) => sum + (total?.count ?? 0), 0),
          elevation_total: Math.round((totals.all_run_totals?.elevation_gain ?? 0) + (totals.all_ride_totals?.elevation_gain ?? 0)),
          longest_ride: toKm(totals.biggest_ride_distance),
        });
      });
    }

    // Recent figures: the activities themselves, private ones included. A year covers any realistic weekly streak.
    // Without the activity permission (unticked on the consent page) Strava refuses the list: skip it instead of failing
    const canReadActivities = !connection.config?.scope || connection.config.scope.includes("activity:read");
    if (canReadActivities && wants("activities_week", "week_streak", "distance_4w", "moving_time_4w")) {
      sections.push(async () => {
        const since = wants("week_streak")
          ? new Date(Date.now() - 365 * DAY)
          : new Date(Math.min(startOfWeek().getTime(), Date.now() - 28 * DAY));
        const activities = await stravaActivitiesSince(accessToken, since);
        const dates = activities.map((activity) => new Date(activity.start_date));
        const recent = activities.filter((activity) => new Date(activity.start_date).getTime() >= Date.now() - 28 * DAY);
        Object.assign(values, {
          activities_week: dates.filter((date) => date >= startOfWeek()).length,
          week_streak: weekStreak(dates),
          distance_4w: toKm(recent.reduce((sum, activity) => sum + (activity.distance ?? 0), 0)),
          moving_time_4w: toHours(recent.reduce((sum, activity) => sum + (activity.moving_time ?? 0), 0)),
        });
      });
    }

    // One failing call keeps the other stats; the sync only fails when nothing could be read
    const results = await Promise.allSettled(sections.map((section) => section()));
    const failures = results.filter((result) => result.status === "rejected").map((result) => result.reason);
    failures.forEach((reason) => console.error("strava:", reason.message));
    if (failures.length > 0 && failures.length === results.length) throw failures[0];

    return values;
  },
};

/* Hevy: personal API key, available to Hevy Pro members */

const hevy = (path, apiKey) => fetchJson(`https://api.hevyapp.com/v1${path}`, { headers: { "api-key": apiKey } });

// Workouts since the date. Pages hold 10 workouts at most: stop once a page reaches older ones.
const hevyWorkoutsSince = async (apiKey, since) => {
  const workouts = [];
  for (let page = 1; page <= 60; page++) {
    const data = await hevy(`/workouts?page=${page}&pageSize=10`, apiKey);
    const batch = data.workouts ?? [];
    workouts.push(...batch.filter((workout) => new Date(workout.start_time) >= since));
    if (batch.length < 10 || page >= (data.page_count ?? page) || batch.some((workout) => new Date(workout.start_time) < since)) break;
  }
  return workouts;
};

// Warm-up sets are not training volume
const workingSets = (workout) =>
  (workout.exercises ?? []).flatMap((exercise) => exercise.sets ?? []).filter((set) => set.type !== "warmup");

export const hevyProvider = {
  key: "hevy",
  name: "Hevy",
  description: "Workouts, lifted volume and weekly streak from your Hevy training log.",
  icon: "Dumbbell",
  color: "#2f80ed",
  category: "Sport",
  auth: "apiKey",
  credentialLabel: "Hevy API key",
  credentialPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  credentialHelp: "https://hevy.com/settings?developer",
  credentialSteps: [
    "The Hevy API is part of Hevy Pro: you need an active Pro subscription.",
    "Open hevy.com/settings?developer on the web (sign in with your Hevy account).",
    'Click "Generate API key", then copy the key and paste it here.',
  ],
  docsUrl: "https://api.hevyapp.com/docs/",
  statCategory: { name: "Hevy", description: "Your strength training", icon: "Dumbbell", color: "#2f80ed" },
  stats: [
    { id: "workouts_total", name: "Workouts", description: "Workouts logged since you joined Hevy.", unit: "workouts" },
    { id: "workouts_week", name: "Workouts this week", description: "Workouts since Monday.", unit: "workouts" },
    { id: "week_streak", name: "Weekly streak", description: "Weeks in a row with at least one workout.", unit: "weeks" },
    { id: "workouts_30d", name: "Workouts (30 days)", description: "Workouts in the last 30 days.", unit: "workouts" },
    { id: "volume_30d", name: "Volume (30 days)", description: "Weight × reps of your working sets, last 30 days.", unit: "kg" },
    { id: "sets_30d", name: "Sets (30 days)", description: "Working sets in the last 30 days.", unit: "sets" },
    { id: "training_time_30d", name: "Training time (30 days)", description: "Time spent training in the last 30 days.", unit: "h" },
  ],
  async verify(apiKey) {
    const key = apiKey.trim();
    let data;
    try {
      data = await hevy("/workouts/count", key);
    } catch (err) {
      if (err instanceof ProviderError)
        throw new ProviderError("Hevy refused this API key. Check it, and that your Hevy Pro subscription is active.");
      throw err;
    }
    if (typeof data.workout_count !== "number") throw new ProviderError("Hevy refused this API key.");
    // Newer endpoint: a missing one must not block the connection
    const user = await hevy("/user/info", key).catch(() => null);
    return { account: user?.data?.username || user?.data?.name || "Hevy", credential: key };
  },
  async fetchStats(apiKey, keys) {
    const values = {};
    if (keys.includes("workouts_total")) {
      values.workouts_total = (await hevy("/workouts/count", apiKey)).workout_count ?? null;
    }
    if (keys.some((key) => key !== "workouts_total")) {
      const monthAgo = new Date(Date.now() - 30 * DAY);
      const since = keys.includes("week_streak")
        ? new Date(Date.now() - 365 * DAY)
        : new Date(Math.min(monthAgo.getTime(), startOfWeek().getTime()));
      const workouts = await hevyWorkoutsSince(apiKey, since);
      const month = workouts.filter((workout) => new Date(workout.start_time) >= monthAgo);
      const sets = month.flatMap(workingSets);
      const seconds = month.reduce((sum, workout) => {
        const duration = (new Date(workout.end_time) - new Date(workout.start_time)) / 1000;
        return sum + (duration > 0 ? duration : 0);
      }, 0);
      Object.assign(values, {
        workouts_week: workouts.filter((workout) => new Date(workout.start_time) >= startOfWeek()).length,
        week_streak: weekStreak(workouts.map((workout) => new Date(workout.start_time))),
        workouts_30d: month.length,
        volume_30d: Math.round(sets.reduce((sum, set) => sum + (set.weight_kg ?? 0) * (set.reps ?? 0), 0)),
        sets_30d: sets.length,
        training_time_30d: toHours(seconds),
      });
    }
    return values;
  },
};
