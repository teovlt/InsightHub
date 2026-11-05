export type AchievementTier = "bronze" | "silver" | "gold";

export type AchievementId = "apps_connected" | "first_sync" | "goals_reached" | "stats_created" | "days_logged" | "streak";

export interface AchievementTierState {
  tier: AchievementTier;
  threshold: number;
  unlockedAt: string | null;
}

export interface AchievementInterface {
  id: AchievementId;
  icon: string;
  progress: number;
  // Highest unlocked tier, null while locked
  tier: AchievementTier | null;
  unlockedAt: string | null;
  // Next tier to reach, null once every tier is unlocked
  next: { tier: AchievementTier; threshold: number } | null;
  tiers: AchievementTierState[];
}

// Payload of the achievement:unlocked socket event
export interface UnlockedAchievement {
  id: AchievementId;
  icon: string;
  tier: AchievementTier;
  threshold: number;
  unlockedAt: string;
}
