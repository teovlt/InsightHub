import mongoose from "mongoose";

// One document per unlocked tier of an achievement (see achievements/catalog.js).
// The unique index makes an unlock happen only once, even when two evaluations race.
const userAchievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  achievementId: { type: String, required: true },
  tier: { type: String, enum: ["bronze", "silver", "gold"], required: true },
  unlockedAt: { type: Date, default: Date.now },
});

userAchievementSchema.index({ userId: 1, achievementId: 1, tier: 1 }, { unique: true });

export const UserAchievement = mongoose.model("UserAchievement", userAchievementSchema);
