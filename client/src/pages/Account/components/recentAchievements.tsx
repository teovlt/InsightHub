import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AchievementMedal, TierPill } from "@/components/customs/achievementBadge";
import { axiosConfig } from "@/config/axiosConfig";
import { dateLocale } from "@/lib/stats";
import { recentUnlocks } from "@/lib/achievements";
import type { AchievementInterface } from "@/interfaces/Achievement";

export const RecentAchievements = () => {
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState<AchievementInterface[]>([]);

  useEffect(() => {
    axiosConfig
      .get("/achievements")
      .then((response) => setAchievements(response.data.achievements))
      // The profile works without its badges
      .catch(() => {});
  }, []);

  const recent = recentUnlocks(achievements, 4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle className="text-lg">{t("pages.achievements.recent_title")}</CardTitle>
          <CardDescription>
            {recent.length ? t("pages.achievements.recent_description") : t("pages.achievements.recent_empty")}
          </CardDescription>
        </div>
        <Link to="/achievements" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:underline">
          {t("pages.achievements.see_all")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      {recent.length > 0 && (
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recent.map(({ achievement, tier, unlockedAt }) => (
            <div key={`${achievement.id}:${tier}`} className="flex items-center gap-3 rounded-xl border p-3">
              <AchievementMedal icon={achievement.icon} tier={tier} size="sm" />
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{t(`pages.achievements.items.${achievement.id}.name`)}</p>
                  <TierPill tier={tier} />
                </div>
                <p className="text-xs text-muted-foreground">{format(new Date(unlockedAt), "PP", { locale: dateLocale() })}</p>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
};
