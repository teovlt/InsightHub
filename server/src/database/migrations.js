import { Log } from "../models/logModel.js";
import { Stat } from "../models/statModel.js";
import { parseStatValue } from "../utils/statValue.js";
import { inferGoalDirection } from "../utils/goals.js";

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

    // Stats created before typed values: derive type and numericValue from the stored string
    const untyped = await Stat.collection.find({ type: { $exists: false } }, { projection: { value: 1 } }).toArray();
    if (untyped.length > 0) {
      await Stat.collection.bulkWrite(
        untyped.map((stat) => ({ updateOne: { filter: { _id: stat._id }, update: { $set: parseStatValue(stat.value) } } })),
      );
      console.log(`Typed the value of ${untyped.length} stats`);
    }

    // Goals saved before directions existed: compare the target with the stat's first value
    const undirected = await Stat.collection
      .find({ current: true, "goal.target": { $type: "number" }, "goal.direction": { $exists: false } })
      .project({ userId: 1, categoryId: 1, name: 1, numericValue: 1, goal: 1 })
      .toArray();
    for (const stat of undirected) {
      const first = await Stat.collection.findOne(
        { userId: stat.userId, categoryId: stat.categoryId, name: stat.name, numericValue: { $type: "number" } },
        { sort: { createdAt: 1 }, projection: { numericValue: 1 } },
      );
      const start = first?.numericValue ?? stat.numericValue;
      const direction = inferGoalDirection(start, stat.goal.target);
      await Stat.collection.updateMany(
        { userId: stat.userId, categoryId: stat.categoryId, name: stat.name },
        { $set: { "goal.direction": direction, ...(typeof start === "number" && { "goal.start": start }) } },
      );
    }
    if (undirected.length > 0) console.log(`Gave a direction to ${undirected.length} goals`);
  } catch (err) {
    console.error("Migration failed:", err);
  }
};
