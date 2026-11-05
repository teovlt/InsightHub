import { IntegrationUser } from "../models/integrationUser.js";
import { autoSyncStats, SYNC_INTERVAL } from "../utils/stats.js";

// The scheduler wakes up more often than SYNC_INTERVAL: a tick of exactly SYNC_INTERVAL would find
// integrations synced a few seconds less than SYNC_INTERVAL ago and skip them, doubling the delay
export const SCHEDULER_TICK = 5 * 60 * 1000;
// Providers are third-party APIs: a few syncs at a time keeps their rate limits and our memory in check
export const SYNC_CONCURRENCY = 3;

let timer = null;
let running = false;

/**
 * @function runScheduledSync
 * @description Syncs every connected integration whose last sync is older than SYNC_INTERVAL.
 * autoSyncStats keeps its own throttle, emits stats:updated and checks achievements.
 * Never throws; two runs never overlap (a run started while another is in progress is skipped).
 * @param {Object} [options]
 * @param {number} [options.concurrency=SYNC_CONCURRENCY] - Syncs running at the same time.
 * @returns {Promise<{ synced: number, skipped: number, failed: number } | null>} Counts, or null if a run was already in progress.
 */
export const runScheduledSync = async ({ concurrency = SYNC_CONCURRENCY } = {}) => {
  if (running) return null;
  running = true;
  const summary = { synced: 0, skipped: 0, failed: 0 };

  try {
    const dueBefore = new Date(Date.now() - SYNC_INTERVAL);
    const queue = await IntegrationUser.find({
      connected: true,
      accessToken: { $nin: [null, ""] },
      $or: [{ lastSyncedAt: null }, { lastSyncedAt: { $lte: dueBefore } }],
    })
      .select("userId integrationId")
      .lean();

    const worker = async () => {
      while (queue.length > 0) {
        const { userId, integrationId } = queue.shift();
        try {
          const result = await autoSyncStats(userId, integrationId);
          if (result?.error) summary.failed += 1;
          else if (result?.skipped) summary.skipped += 1;
          else summary.synced += 1;
        } catch (error) {
          summary.failed += 1;
          console.error("Scheduled sync failed:", error.message);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  } catch (error) {
    console.error("Scheduled sync failed:", error.message);
  } finally {
    running = false;
  }

  return summary;
};

/**
 * @function startScheduler
 * @description Starts syncing connected integrations in the background, every SCHEDULER_TICK.
 * Does nothing if already started. The timer does not keep the process alive.
 * @param {Object} [options]
 * @param {number} [options.interval=SCHEDULER_TICK] - Delay between two runs.
 */
export const startScheduler = ({ interval = SCHEDULER_TICK } = {}) => {
  if (timer) return;
  timer = setInterval(() => {
    runScheduledSync().catch(() => {});
  }, interval);
  timer.unref?.();
  console.log(`Background sync every ${Math.round(interval / 60000)} min`);
};

/**
 * @function stopScheduler
 * @description Stops the background sync started by startScheduler.
 */
export const stopScheduler = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
