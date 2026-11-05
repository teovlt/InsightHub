import { BarChart3, CalendarCheck, Flame, Link2, RefreshCw, Target, Trophy, type LucideIcon } from "lucide-react";
import type { AchievementInterface, AchievementTier } from "@/interfaces/Achievement";

const ICONS: Record<string, LucideIcon> = { BarChart3, CalendarCheck, Flame, Link2, RefreshCw, Target };

export const achievementIcon = (name: string): LucideIcon => ICONS[name] ?? Trophy;

// Medal colors: the badge background and icon, the tier pill, the ring around an unlocked card
export const TIER_STYLES: Record<AchievementTier, { medal: string; pill: string; ring: string }> = {
  bronze: {
    medal: "bg-gradient-to-br from-[#e2a36b] to-[#a8612a] text-white",
    pill: "bg-[#c47a3a]/15 text-[#9a5a24] dark:text-[#e2a36b]",
    ring: "ring-[#c47a3a]/40",
  },
  silver: {
    medal: "bg-gradient-to-br from-[#e2e8f0] to-[#94a3b8] text-slate-800",
    pill: "bg-slate-400/20 text-slate-600 dark:text-slate-300",
    ring: "ring-slate-400/50",
  },
  gold: {
    medal: "bg-gradient-to-br from-[#fde047] to-[#ca8a04] text-amber-950",
    pill: "bg-amber-400/20 text-amber-700 dark:text-amber-300",
    ring: "ring-amber-400/50",
  },
};

// Target shown on the progress bar: the next tier, or the last one once everything is unlocked
export const progressTarget = (achievement: AchievementInterface) =>
  achievement.next?.threshold ?? achievement.tiers[achievement.tiers.length - 1].threshold;

// Unlocked tiers of every achievement, most recent first
export const recentUnlocks = (achievements: AchievementInterface[], limit: number) =>
  achievements
    .flatMap((achievement) =>
      achievement.tiers.filter((t) => t.unlockedAt).map((t) => ({ achievement, tier: t.tier, unlockedAt: t.unlockedAt as string })),
    )
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
    .slice(0, limit);
