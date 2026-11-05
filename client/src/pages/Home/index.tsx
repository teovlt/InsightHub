"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  Flame,
  Link2,
  NotebookPen,
  Pin,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Page } from "@/components/customs/page";
import { Sparkline } from "@/components/customs/sparkline";
import { QuickUpdateDialog } from "@/components/customs/quickUpdateDialog";
import { AchievementMedal, TierPill } from "@/components/customs/achievementBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosConfig } from "@/config/axiosConfig";
import { useAuthContext } from "@/contexts/authContext";
import { useSocketContext } from "@/contexts/socketContext";
import { CategoryInterface } from "@/interfaces/Category";
import { ActivityDay, StatsOverview, StatType, WeekChange } from "@/interfaces/Stat";
import { dateLocale, formatNumeric, goalProgress, goalRemaining } from "@/lib/stats";
import { cn } from "@/lib/utils";

// The heatmap is only needed once the data is there: load it in its own chunk
const ActivityHeatmap = lazy(async () => ({ default: (await import("./charts")).ActivityHeatmap }));

const EMPTY_OVERVIEW: StatsOverview = {
  week: { values: 0, activeDays: 0, streak: { current: 0, best: 0, today: false } },
  highlights: [],
  pinned: [],
  goals: [],
  toLog: [],
  moments: [],
  nextBadge: null,
  onboarding: { connectedApps: 0, stats: 0, goals: 0, done: true },
};

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const withUnit = (value: string, unit?: string) => (unit ? `${value} ${unit}` : value);
// Numbers in the viewer's format ("79,4" in French), text values as typed
const display = (stat: { value: string; type?: StatType; numericValue?: number | null }) =>
  (stat.type === "number" || stat.type === "duration") && typeof stat.numericValue === "number"
    ? formatNumeric(stat.numericValue, stat.type)
    : stat.value;

export const Home = () => {
  const [categories, setCategories] = useState<CategoryInterface[]>([]);
  const [overview, setOverview] = useState<StatsOverview>(EMPTY_OVERVIEW);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { authUser } = useAuthContext();
  const { socket } = useSocketContext();
  const navigate = useNavigate();

  // /categories also runs the throttled integration sync: when it changes values, the server emits stats:updated
  const fetchDashboard = useCallback(async () => {
    try {
      const [categoriesResponse, overviewResponse, analyticsResponse] = await Promise.all([
        axiosConfig.get("/categories", { params: { page: 0, size: 50 } }),
        axiosConfig.get("/stats/overview", { params: { tz: timeZone() } }),
        axiosConfig.get("/stats/analytics", { params: { period: "7d", tz: timeZone() } }),
      ]);
      setCategories(categoriesResponse.data.categories);
      setOverview(overviewResponse.data);
      setActivity(analyticsResponse.data.activity);
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Live refresh: a sync, a new badge or an edit in another tab changed something
  useEffect(() => {
    if (!socket) return;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(fetchDashboard, 400);
    };
    socket.on("stats:updated", refresh);
    socket.on("achievement:unlocked", refresh);
    return () => {
      clearTimeout(timer);
      socket.off("stats:updated", refresh);
      socket.off("achievement:unlocked", refresh);
    };
  }, [socket, fetchDashboard]);

  // Coming back to the tab gives integrations a chance to sync again
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && fetchDashboard();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchDashboard]);

  const openStat = (id: string) => navigate(`/statistics?stat=${id}`);
  const hasActivity = activity.some((day) => day.manual + day.synced > 0);

  return (
    <Page>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium capitalize text-muted-foreground">
            {format(new Date(), "EEEE d MMMM", { locale: dateLocale() })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("pages.dashboard.greeting", { name: authUser?.forename ?? "" })}
          </h1>
          <p className="text-muted-foreground">{t("pages.dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/statistics")}>
            <BarChart3 />
            {t("navbar.statistics")}
          </Button>
          <QuickUpdateDialog
            categories={categories}
            onUpdated={fetchDashboard}
            trigger={
              <Button>
                <Plus />
                {t("pages.dashboard.log_value")}
              </Button>
            }
          />
        </div>
      </div>

      {!loading && !overview.onboarding.done && <Onboarding onboarding={overview.onboarding} />}

      {/* This week + next badge */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {loading ? (
          <>
            <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-48 rounded-2xl" />
          </>
        ) : (
          <>
            <WeekCard week={overview.week} activity={activity} />
            <NextBadgeCard badge={overview.nextBadge} />
          </>
        )}
      </section>

      {/* What moved this week */}
      <section className="space-y-4">
        <SectionHeading icon={<TrendingUp className="h-4 w-4" />} title={t("pages.dashboard.highlights.title")} />
        {loading ? (
          <CardsSkeleton />
        ) : overview.highlights.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {overview.highlights.map((stat) => (
              <HighlightCard key={stat._id} stat={stat} onClick={() => openStat(stat._id)} />
            ))}
          </div>
        ) : (
          <EmptyHint text={t("pages.dashboard.highlights.empty")} />
        )}
      </section>

      {/* Pinned stats */}
      <section className="space-y-4">
        <SectionHeading icon={<Pin className="h-4 w-4" />} title={t("pages.dashboard.pinned.title")} />
        {loading ? (
          <CardsSkeleton />
        ) : overview.pinned.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {overview.pinned.map((stat) => (
              <PinnedStatCard key={stat._id} stat={stat} onClick={() => openStat(stat._id)} />
            ))}
          </div>
        ) : (
          <EmptyHint text={t("pages.dashboard.pinned.empty")} action={t("pages.dashboard.pinned.empty_action")} to="/statistics" />
        )}
      </section>

      {/* Goals | To log + moments */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-5 sm:p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <SectionHeading icon={<Target className="h-4 w-4" />} title={t("pages.dashboard.goals.title")} />
            <SeeAll to="/statistics" />
          </div>
          <div className="mt-5 space-y-5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
            ) : overview.goals.length > 0 ? (
              overview.goals.map((stat) => <GoalRow key={stat._id} stat={stat} onClick={() => openStat(stat._id)} />)
            ) : (
              <p className="text-sm text-muted-foreground">{t("pages.dashboard.goals.empty")}</p>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-2">
          {!loading && overview.toLog.length > 0 && (
            <Card className="p-5 sm:p-6">
              <SectionHeading icon={<NotebookPen className="h-4 w-4" />} title={t("pages.dashboard.to_log.title")} />
              <p className="mt-1 text-sm text-muted-foreground">{t("pages.dashboard.to_log.description")}</p>
              <div className="mt-4 space-y-2">
                {overview.toLog.map((stat) => (
                  <div key={stat._id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{stat.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t("pages.dashboard.to_log.last", {
                          value: stat.hided ? "••••" : withUnit(display(stat), stat.unit),
                          count: stat.daysAgo,
                        })}
                      </p>
                    </div>
                    <QuickUpdateDialog
                      categories={categories}
                      onUpdated={fetchDashboard}
                      defaultStatId={stat._id}
                      trigger={
                        <Button size="sm" variant="outline" className="shrink-0">
                          <Plus />
                          {t("pages.dashboard.to_log.action")}
                        </Button>
                      }
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="flex-1 p-5 sm:p-6">
            <SectionHeading icon={<Sparkles className="h-4 w-4" />} title={t("pages.dashboard.moments.title")} />
            <div className="mt-4 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
              ) : overview.moments.length > 0 ? (
                overview.moments.map((moment, i) => <MomentRow key={i} moment={moment} onOpenStat={openStat} />)
              ) : (
                <p className="text-sm text-muted-foreground">{t("pages.dashboard.moments.empty")}</p>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Regularity */}
      <Card className="p-5 sm:p-6">
        <SectionHeading icon={<CalendarDays className="h-4 w-4" />} title={t("pages.dashboard.heatmap.title")} />
        <div className="mt-5">
          {loading ? (
            <Skeleton className="h-36 w-full rounded-xl" />
          ) : hasActivity ? (
            <Suspense fallback={<Skeleton className="h-36 w-full rounded-xl" />}>
              <ActivityHeatmap days={activity} />
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground">{t("pages.dashboard.heatmap.empty")}</p>
          )}
        </div>
      </Card>
    </Page>
  );
};

/* ---------- Sections ---------- */

const Onboarding = ({ onboarding }: { onboarding: StatsOverview["onboarding"] }) => {
  const { t } = useTranslation();
  const steps = [
    { key: "connect", done: onboarding.connectedApps > 0, to: "/integrations", icon: Link2 },
    { key: "stat", done: onboarding.stats > 0, to: "/statistics", icon: BarChart3 },
    { key: "goal", done: onboarding.goals > 0, to: "/statistics", icon: Target },
  ];
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <Card className="overflow-hidden border-accent/30 bg-accent/5 p-5 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{t("pages.dashboard.onboarding.title")}</h2>
        <p className="text-sm font-medium text-muted-foreground">
          {t("pages.dashboard.onboarding.progress", { done: doneCount, total: steps.length })}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("pages.dashboard.onboarding.description")}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {steps.map(({ key, done, to, icon: Icon }) => (
          <Link
            key={key}
            to={to}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors",
              done ? "border-lime/60" : "hover:border-accent/50",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                done ? "bg-lime text-[#0f172a]" : "bg-accent/10 text-accent",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-sm font-semibold", done && "text-muted-foreground line-through")}>
                {t(`pages.dashboard.onboarding.steps.${key}.title`)}
              </span>
              <span className="block text-xs text-muted-foreground">{t(`pages.dashboard.onboarding.steps.${key}.description`)}</span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
};

const WeekCard = ({ week, activity }: { week: StatsOverview["week"]; activity: ActivityDay[] }) => {
  const { t } = useTranslation();
  const { current, best, today } = week.streak;
  const last7 = activity.slice(-7);
  const message =
    current >= 2 && today
      ? t("pages.dashboard.week.streak_going", { count: current })
      : current >= 1 && !today
        ? t("pages.dashboard.week.streak_keep")
        : current === 1
          ? t("pages.dashboard.week.streak_started")
          : t("pages.dashboard.week.streak_none");

  return (
    <Card className="p-5 sm:p-6 lg:col-span-2">
      <SectionHeading icon={<CalendarDays className="h-4 w-4" />} title={t("pages.dashboard.week.title")} />
      <div className="mt-5 grid grid-cols-3 gap-4">
        <BigNumber label={t("pages.dashboard.week.values", { count: week.values })} value={week.values} />
        <BigNumber label={t("pages.dashboard.week.active_days")} value={`${week.activeDays}/7`} />
        <BigNumber
          label={t("pages.dashboard.week.streak", { count: current })}
          value={
            <span className="inline-flex items-center gap-1">
              {current}
              <Flame className={cn("h-6 w-6", current > 0 ? "text-orange-500" : "text-muted-foreground/40")} />
            </span>
          }
        />
      </div>
      {last7.length > 0 && (
        <div className="mt-5 flex gap-1.5" aria-hidden>
          {last7.map((day) => {
            const active = day.manual + day.synced > 0;
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <div className={cn("h-2 w-full rounded-full", active ? "bg-lime" : "bg-secondary")} />
                <span className="text-[10px] uppercase text-muted-foreground">
                  {format(new Date(`${day.date}T12:00:00`), "EEEEE", { locale: dateLocale() })}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-sm font-medium">
        {message}
        {best > current && <span className="font-normal text-muted-foreground"> · {t("pages.dashboard.week.best", { count: best })}</span>}
      </p>
    </Card>
  );
};

const NextBadgeCard = ({ badge }: { badge: StatsOverview["nextBadge"] }) => {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <SectionHeading icon={<Trophy className="h-4 w-4" />} title={t("pages.dashboard.next_badge.title")} />
        <SeeAll to="/achievements" />
      </div>
      {badge ? (
        <div className="mt-5 flex flex-1 flex-col justify-between gap-4">
          <div className="flex items-center gap-4">
            <AchievementMedal icon={badge.icon} tier={null} />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{t(`pages.achievements.items.${badge.id}.name`)}</p>
                <TierPill tier={badge.next.tier} />
              </div>
              <p className="text-sm text-muted-foreground">{t(`pages.achievements.items.${badge.id}.description`)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {t(`pages.achievements.items.${badge.id}.progress`, {
                value: Math.min(badge.progress, badge.next.threshold),
                target: badge.next.threshold,
              })}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.max(4, Math.min(100, (badge.progress / badge.next.threshold) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">{t("pages.achievements.all_tiers")}</p>
      )}
    </Card>
  );
};

/* ---------- Stat cards ---------- */

const ChangePill = ({ change, type }: { change: WeekChange; type?: StatType }) => {
  const Arrow = change.delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        change.better ? "bg-lime/30 text-[#3f6212] dark:text-lime" : "bg-secondary text-muted-foreground",
      )}
    >
      <Arrow className="h-3 w-3" />
      {change.percent !== null ? `${Math.abs(change.percent).toFixed(0)}%` : formatNumeric(Math.abs(change.delta), type)}
    </span>
  );
};

const HighlightCard = ({ stat, onClick }: { stat: StatsOverview["highlights"][number]; onClick: () => void }) => {
  const { t } = useTranslation();
  const color = stat.categoryId?.color ?? "var(--accent)";

  return (
    <Card
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-muted-foreground">{stat.name}</p>
        <ChangePill change={stat.week} type={stat.type} />
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="truncate font-display text-3xl font-bold tracking-tight">{display(stat)}</span>
        {stat.unit && <span className="text-sm font-medium text-muted-foreground">{stat.unit}</span>}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {t("pages.dashboard.highlights.from", { value: withUnit(formatNumeric(stat.week.from, stat.type), stat.unit) })}
      </p>
    </Card>
  );
};

const PinnedStatCard = ({ stat, onClick }: { stat: StatsOverview["pinned"][number]; onClick: () => void }) => {
  const { t } = useTranslation();
  const color = stat.categoryId?.color ?? "var(--accent)";
  const values = stat.history.filter((point) => typeof point.numericValue === "number").map((point) => point.numericValue as number);
  const progress = stat.goal ? goalProgress(stat) : null;

  return (
    <Card
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-muted-foreground">{stat.name}</p>
        {!stat.hided && stat.week && stat.week.delta !== 0 && <ChangePill change={stat.week} type={stat.type} />}
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="truncate font-display text-3xl font-bold tracking-tight">{stat.hided ? "••••••" : display(stat)}</span>
        {stat.unit && <span className="text-sm font-medium text-muted-foreground">{stat.unit}</span>}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {!stat.hided && stat.best !== null
          ? t("pages.dashboard.pinned.best", { value: withUnit(formatNumeric(stat.best, stat.type), stat.unit) })
          : stat.categoryId?.name}
      </p>
      {!stat.hided && <Sparkline values={values} color={color} className="mt-3 h-10 w-full" />}
      {progress !== null && !stat.hided && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
          title={t("pages.dashboard.pinned.goal", { percent: progress.toFixed(0) })}
        >
          <div
            className={cn("h-full rounded-full", progress >= 100 ? "bg-lime" : "bg-accent")}
            style={{ width: `${Math.max(progress, 3)}%` }}
          />
        </div>
      )}
    </Card>
  );
};

const PACE_STYLES: Record<string, string> = {
  reached: "bg-lime/30 text-[#3f6212] dark:text-lime",
  on_track: "bg-accent/10 text-accent",
  behind: "bg-amber-400/20 text-amber-700 dark:text-amber-300",
  no_deadline: "bg-secondary text-muted-foreground",
  stalled: "bg-secondary text-muted-foreground",
};

const GoalRow = ({ stat, onClick }: { stat: StatsOverview["goals"][number]; onClick: () => void }) => {
  const { t } = useTranslation();
  const progress = goalProgress(stat);
  const remaining = goalRemaining(stat);
  const { status, eta } = stat.pace;
  const done = status === "reached";
  const shortDate = (date: string) => format(new Date(date), "d MMM yyyy", { locale: dateLocale() });

  return (
    <button onClick={onClick} className="block w-full cursor-pointer text-left">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">
          {stat.name}
          <span className="text-muted-foreground"> · {stat.categoryId?.name}</span>
        </p>
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", PACE_STYLES[status])}>
          {status === "no_deadline" && eta
            ? t("pages.dashboard.goals.pace.eta", { date: shortDate(eta) })
            : t(`pages.dashboard.goals.pace.${status}`)}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all", done ? "bg-lime" : "bg-accent")}
          style={{ width: `${Math.max(progress, 3)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {stat.hided ? "••••" : withUnit(display(stat), stat.unit)} /{" "}
        {stat.goal ? withUnit(formatNumeric(stat.goal.target, stat.type), stat.unit) : ""}
        {!done &&
          remaining !== null &&
          ` · ${t("pages.statistics.goal.remaining", { value: withUnit(formatNumeric(remaining, stat.type), stat.unit) })}`}
        {stat.goal?.deadline && ` · ${t("pages.dashboard.goals.deadline", { date: shortDate(stat.goal.deadline) })}`}
      </p>
    </button>
  );
};

const MomentRow = ({ moment, onOpenStat }: { moment: StatsOverview["moments"][number]; onOpenStat: (id: string) => void }) => {
  const { t } = useTranslation();
  const when = formatDistanceToNow(new Date(moment.at), { addSuffix: true, locale: dateLocale() });

  if (moment.kind === "badge" && moment.tier) {
    return (
      <Link to="/achievements" className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-secondary/60">
        <AchievementMedal icon={moment.icon ?? "Trophy"} tier={moment.tier} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {t("pages.dashboard.moments.badge", { name: t(`pages.achievements.items.${moment.achievementId}.name`) })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(`pages.achievements.tiers.${moment.tier}`)} · {when}
          </p>
        </div>
      </Link>
    );
  }

  const stat = moment.stat!;
  return (
    <button
      onClick={() => onOpenStat(stat._id)}
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-secondary/60"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-300">
        <Trophy className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t("pages.dashboard.moments.record", { name: stat.name })}</p>
        <p className="truncate text-xs text-muted-foreground">
          {withUnit(formatNumeric(moment.value!, stat.type), stat.unit)}
          {` (${t("pages.dashboard.moments.before", { value: formatNumeric(moment.previous!, stat.type) })})`} · {when}
        </p>
      </div>
    </button>
  );
};

/* ---------- Small pieces ---------- */

const SectionHeading = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
    {icon && <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</span>}
    {title}
  </h2>
);

const SeeAll = ({ to }: { to: string }) => {
  const { t } = useTranslation();
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:underline">
      {t("pages.dashboard.see_all")}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
};

const BigNumber = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0">
    <p className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{value}</p>
    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</p>
  </div>
);

const CardsSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-36 rounded-2xl" />
    ))}
  </div>
);

const EmptyHint = ({ text, action, to }: { text: string; action?: string; to?: string }) => (
  <div className="flex flex-col items-start gap-2 rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted-foreground">{text}</p>
    {action && to && (
      <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
        {action}
        <ArrowRight className="h-4 w-4" />
      </Link>
    )}
  </div>
);
