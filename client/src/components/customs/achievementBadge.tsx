import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { dateLocale } from "@/lib/stats";
import { achievementIcon, progressTarget, TIER_STYLES } from "@/lib/achievements";
import type { AchievementInterface, AchievementTier } from "@/interfaces/Achievement";

export const AchievementMedal = ({ icon, tier, size = "md" }: { icon: string; tier: AchievementTier | null; size?: "sm" | "md" }) => {
  const Icon = achievementIcon(icon);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full shadow-sm",
        size === "md" ? "h-16 w-16" : "h-11 w-11",
        tier ? TIER_STYLES[tier].medal : "bg-secondary text-muted-foreground/60",
      )}
    >
      {tier ? <Icon className={size === "md" ? "h-7 w-7" : "h-5 w-5"} /> : <Lock className={size === "md" ? "h-6 w-6" : "h-4 w-4"} />}
    </div>
  );
};

export const TierPill = ({ tier }: { tier: AchievementTier }) => {
  const { t } = useTranslation();
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", TIER_STYLES[tier].pill)}>
      {t(`pages.achievements.tiers.${tier}`)}
    </span>
  );
};

export const AchievementCard = ({ achievement }: { achievement: AchievementInterface }) => {
  const { t } = useTranslation();
  const target = progressTarget(achievement);
  const value = Math.min(achievement.progress, target);
  const percent = Math.round((value / target) * 100);
  const tier = achievement.tier;

  return (
    <Card className={cn("flex flex-col gap-4 p-5 transition", tier ? cn("ring-1", TIER_STYLES[tier].ring) : "opacity-80")}>
      <div className="flex items-start gap-4">
        <AchievementMedal icon={achievement.icon} tier={tier} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("font-semibold leading-tight", !tier && "text-muted-foreground")}>
              {t(`pages.achievements.items.${achievement.id}.name`)}
            </h3>
            {tier && <TierPill tier={tier} />}
          </div>
          <p className="text-sm text-muted-foreground">{t(`pages.achievements.items.${achievement.id}.description`)}</p>
        </div>
      </div>

      {achievement.next ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{t(`pages.achievements.items.${achievement.id}.progress`, { value, target })}</span>
            <span className="shrink-0">{t(`pages.achievements.tiers.${achievement.next.tier}`)}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={value}
          >
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-xs font-medium text-accent">{t("pages.achievements.all_tiers")}</p>
      )}

      {achievement.unlockedAt && (
        <p className="text-xs text-muted-foreground">
          {t("pages.achievements.unlocked_on", { date: format(new Date(achievement.unlockedAt), "PPP", { locale: dateLocale() }) })}
        </p>
      )}
    </Card>
  );
};
