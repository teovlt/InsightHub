import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSocketContext } from "@/contexts/socketContext";
import { AchievementMedal } from "@/components/customs/achievementBadge";
import type { UnlockedAchievement } from "@/interfaces/Achievement";

// Shows a small celebration toast whenever the server unlocks a badge, on any page
export const AchievementListener = () => {
  const { socket } = useSocketContext();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;
    const onUnlocked = (achievement: UnlockedAchievement) => {
      toast(t("pages.achievements.toast.title", { name: t(`pages.achievements.items.${achievement.id}.name`) }), {
        description: t("pages.achievements.toast.description", { tier: t(`pages.achievements.tiers.${achievement.tier}`) }),
        icon: (
          <span className="animate-achievement-pop relative inline-flex">
            <span className="animate-achievement-burst absolute inset-0 rounded-full" />
            <AchievementMedal icon={achievement.icon} tier={achievement.tier} size="sm" />
          </span>
        ),
        classNames: { icon: "!h-11 !w-11 !mr-2" },
        duration: 6000,
        action: { label: t("pages.achievements.toast.action"), onClick: () => navigate("/achievements") },
      });
    };
    socket.on("achievement:unlocked", onUnlocked);
    return () => {
      socket.off("achievement:unlocked", onUnlocked);
    };
  }, [socket, t, navigate]);

  return null;
};
