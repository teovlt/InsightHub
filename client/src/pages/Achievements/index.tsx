import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Page, PageHeader, SectionTitle } from "@/components/customs/page";
import { AchievementCard } from "@/components/customs/achievementBadge";
import { axiosConfig } from "@/config/axiosConfig";
import { useSocketContext } from "@/contexts/socketContext";
import type { AchievementInterface } from "@/interfaces/Achievement";

export const Achievements = () => {
  const { t } = useTranslation();
  const { socket } = useSocketContext();
  const [achievements, setAchievements] = useState<AchievementInterface[] | null>(null);

  const fetchAchievements = useCallback(async () => {
    try {
      const response = await axiosConfig.get("/achievements");
      setAchievements(response.data.achievements);
    } catch (error: any) {
      toast.error(t(error.response?.data?.error ?? "server.global.errors.internal"));
    }
  }, [t]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // A badge unlocked in another tab, or by a background sync, shows up right away
  useEffect(() => {
    if (!socket) return;
    socket.on("achievement:unlocked", fetchAchievements);
    return () => {
      socket.off("achievement:unlocked", fetchAchievements);
    };
  }, [socket, fetchAchievements]);

  const unlockedTiers = achievements?.reduce((sum, a) => sum + a.tiers.filter((tier) => tier.unlockedAt).length, 0) ?? 0;
  const totalTiers = achievements?.reduce((sum, a) => sum + a.tiers.length, 0) ?? 0;
  const unlocked = achievements?.filter((a) => a.tier) ?? [];
  const locked = achievements?.filter((a) => !a.tier) ?? [];

  const grid = (list: AchievementInterface[]) => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((achievement) => (
        <AchievementCard key={achievement.id} achievement={achievement} />
      ))}
    </div>
  );

  return (
    <Page>
      <PageHeader
        eyebrow={t("navbar.achievements")}
        title={t("pages.achievements.title")}
        description={t("pages.achievements.description")}
      />

      {achievements === null ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <Card className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-3xl font-bold leading-none">
                {unlockedTiers}
                <span className="text-lg text-muted-foreground">/{totalTiers}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {unlockedTiers === 0 ? t("pages.achievements.summary_empty") : t("pages.achievements.summary")}
              </p>
            </div>
          </Card>

          {unlocked.length > 0 && (
            <section className="space-y-4">
              <SectionTitle count={unlocked.length}>{t("pages.achievements.unlocked")}</SectionTitle>
              {grid(unlocked)}
            </section>
          )}

          {locked.length > 0 && (
            <section className="space-y-4">
              <SectionTitle count={locked.length}>{t("pages.achievements.locked")}</SectionTitle>
              {grid(locked)}
            </section>
          )}
        </>
      )}
    </Page>
  );
};
