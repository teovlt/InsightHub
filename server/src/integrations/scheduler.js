import { Integration } from "../models/integrationModel.js";
import { IntegrationUser } from "../models/integrationUser.js";
import { autoSyncStats } from "../utils/stats.js";

const HOUR = 60 * 60 * 1000;

// How old a connection's data may get before the background job refreshes it (AUTO_SYNC_INTERVAL_HOURS overrides)
export const getBackgroundSyncInterval = () => (Number(process.env.AUTO_SYNC_INTERVAL_HOURS) || 6) * HOUR;
// A connection whose sync failed is retried after this delay, not on every tick
export const RETRY_DELAY = HOUR;
// How often the job looks for stale connections
export const TICK_INTERVAL = 10 * 60 * 1000;
// Connections synced per tick, one after the other, to stay far below the services' rate limits
export const BATCH_SIZE = 50;

let running = false;
let timer = null;

/**
 * @function findDueConnections
 * @description Connected integrations whose data is older than the background interval and that were not attempted recently.
 * Never synced first, then the oldest. Integrations an admin disabled are left out.
 * @param {Date} [now]
 * @returns {Promise<Object[]>} IntegrationUser documents (lean, userId and integrationId only).
 */
export const findDueConnections = async (now = new Date()) => {
  const available = await Integration.find({ status: "available" }).select("_id").lean();
  if (available.length === 0) return [];

  const staleBefore = new Date(now.getTime() - getBackgroundSyncInterval());
  const retryBefore = new Date(now.getTime() - RETRY_DELAY);

  return IntegrationUser.find({
    connected: true,
    accessToken: { $exists: true, $ne: null },
    integrationId: { $in: available.map((integration) => integration._id) },
    $and: [
      { $or: [{ lastSyncedAt: { $exists: false } }, { lastSyncedAt: null }, { lastSyncedAt: { $lt: staleBefore } }] },
      { $or: [{ lastSyncAttemptAt: { $exists: false } }, { lastSyncAttemptAt: null }, { lastSyncAttemptAt: { $lt: retryBefore } }] },
    ],
  })
    .sort({ lastSyncedAt: 1 })
    .limit(BATCH_SIZE)
    .select("userId integrationId")
    .lean();
};

/**
 * @function runBackgroundSync
 * @description Refreshes every due connection. Overlapping runs are skipped.
 * Open dashboards are told about new values by autoSyncStats (socket "stats:updated").
 * @returns {Promise<{ synced: number, failed: number, skipped?: boolean }>}
 */
export const runBackgroundSync = async () => {
  if (running) return { synced: 0, failed: 0, skipped: true };
  running = true;

  let synced = 0;
  let failed = 0;
  try {
    const due = await findDueConnections();
    for (const connection of due) {
      // Recorded first, so a failing service is not called again before RETRY_DELAY
      await IntegrationUser.updateOne({ _id: connection._id }, { lastSyncAttemptAt: new Date() });
      const result = await autoSyncStats(connection.userId, connection.integrationId, { force: true });
      if (result.error) failed += 1;
      else synced += 1;
    }
    if (synced + failed > 0) console.log(`Background sync: ${synced} synced, ${failed} failed`);
  } catch (error) {
    console.error("Background sync:", error.message);
  } finally {
    running = false;
  }
  return { synced, failed };
};

/**
 * @function startSyncScheduler
 * @description Runs the background sync shortly after start, then every TICK_INTERVAL.
 * Disabled in tests and when AUTO_SYNC=false.
 */
export const startSyncScheduler = () => {
  if (timer || process.env.NODE_ENV === "test" || process.env.AUTO_SYNC === "false") return;

  const tick = () => runBackgroundSync();
  // The timers must not keep the process alive on shutdown
  setTimeout(tick, 60 * 1000).unref();
  timer = setInterval(tick, TICK_INTERVAL);
  timer.unref();
};

export const stopSyncScheduler = () => {
  clearInterval(timer);
  timer = null;
};
