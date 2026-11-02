import { Log } from "../models/logModel.js";

/**
 * @function runMigrations
 * @description Fixes data written by older versions. Every step is idempotent, so it runs on each start.
 */
export const runMigrations = async () => {
  // A failed migration is reported but must not keep the API down
  try {
    // Log.level used to be declared as an array type, so levels were stored as ["info"]
    const { modifiedCount } = await Log.collection.updateMany({ level: { $type: "array" } }, [
      { $set: { level: { $arrayElemAt: ["$level", 0] } } },
    ]);
    if (modifiedCount > 0) console.log(`Migrated the level of ${modifiedCount} logs`);
  } catch (err) {
    console.error("Migration failed:", err);
  }
};
