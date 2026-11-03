"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Flame,
  Layers,
  PieChart,
  Pin,
  Plus,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Page } from "@/components/customs/page";
import { Sparkline } from "@/components/customs/sparkline";
import { QuickUpdateDialog } from "@/components/customs/quickUpdateDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosConfig } from "@/config/axiosConfig";
import { useAuthContext } from "@/contexts/authContext";
import { useSocketContext } from "@/contexts/socketContext";
import { CategoryInterface } from "@/interfaces/Category";
import { DashboardPeriod, StatsAnalytics, StatsOverview, StatTrend, StatWithCategory } from "@/interfaces/Stat";
import { getIcon } from "@/lib/icons";
import { dateLocale, formatNumeric, goalProgress, goalRemaining, isGoalReached, lastDelta, numericPoints } from "@/lib/stats";
import { cn } from "@/lib/utils";

// recharts is only needed once the data is there: load it in its own chunk
const lazyChart = <K extends keyof typeof import("./charts")>(name: K) =>
  lazy(async () => ({ default: (await import("./charts"))[name] as React.ComponentType<any> }));
const ActivityChart = lazyChart("ActivityChart");
const CategoryDonut = lazyChart("CategoryDonut");
const TrendChart = lazyChart("TrendChart");
const MoversChart = lazyChart("MoversChart");
const ActivityHeatmap = lazyChart("ActivityHeatmap");

const PERIODS: { key: DashboardPeriod; days: number }[] = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "1y", days: 365 },
];
const PERIOD_STORAGE_KEY = "dashboard-period";
const MAX_MOVERS = 8;

const readStoredPeriod = (): DashboardPeriod => {
  try {
    const stored = localStorage.getItem(PERIOD_STORAGE_KEY);
    return PERIODS.some((p) => p.key === stored) ? (stored as DashboardPeriod) : "30d";
  } catch {
    return "30d";
  }
};

export const Home = () => {
  const [categories, setCategories] = useState<CategoryInterface[]>([]);
  const [overview, setOverview] = useState<StatsOverview>({ pinned: [], goals: [], recent: [] });
  const [analytics, setAnalytics] = useState<StatsAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<DashboardPeriod>(readStoredPeriod);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { t } = useTranslation();
  const { authUser } = useAuthContext();
  const { socket, isOnline } = useSocketContext();
  const navigate = useNavigate();
  const periodRef = useRef(period);
  periodRef.current = period;

  const fetchAnalytics = useCallback(async () => {
    const response = await axiosConfig.get("/stats/analytics", {
      params: { period: periodRef.current, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
    });
    setAnalytics(response.data);
  }, []);

  // /categories also runs the throttled integration sync: when it changes values, the server emits stats:updated
  const fetchDashboard = useCallback(async () => {
    try {
      const [categoriesResponse, overviewResponse] = await Promise.all([
        axiosConfig.get("/categories", { params: { page: 0, size: 50 } }),
        axiosConfig.get("/stats/overview"),
        fetchAnalytics(),
      ]);
      setCategories(categoriesResponse.data.categories);
      setOverview(overviewResponse.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    try {
      localStorage.setItem(PERIOD_STORAGE_KEY, period);
    } catch {
      // Storage unavailable (private mode): the period just isn't remembered
    }
    if (!loading) fetchAnalytics().catch((error) => toast.error(error.response?.data?.error));
  }, [period]);

  // Live refresh: a sync or an edit in another tab changed values
  useEffect(() => {
    if (!socket) return;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(fetchDashboard, 400);
    };
    socket.on("stats:updated", refresh);
    return () => {
      clearTimeout(timer);
      socket.off("stats:updated", refresh);
    };
  }, [socket, fetchDashboard]);

  // Coming back to the tab gives integrations a chance to sync again
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && fetchDashboard();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchDashboard]);

  const filledCategories = categories.filter((category) => category.stats.length > 0);
  const shownCategories = filledCategories.filter((category) => activeCategory === "all" || category._id === activeCategory);
  const openStat = (id: string) => navigate(`/statistics?stat=${id}`);

  const days = PERIODS.find((p) => p.key === period)!.days;
  const kpis = analytics?.kpis;
  const periodActivity = analytics?.activity.slice(-days) ?? [];
  const hasActivity = periodActivity.some((day) => day.manual + day.synced > 0);
  const updatesDelta = kpis && kpis.previousUpdates > 0 ? ((kpis.updates - kpis.previousUpdates) / kpis.previousUpdates) * 100 : null;
  const categoryMetric = analytics?.categories.some((category) => category.updates > 0) ? "updates" : "stats";
  const movers = (analytics?.trends ?? [])
    .filter((trend) => trend.change.percent !== null && trend.change.value !== 0)
    .sort((a, b) => Math.abs(b.change.percent!) - Math.abs(a.change.percent!))
    .slice(0, MAX_MOVERS);
  const chartFallback = <Skeleton className="h-full w-full rounded-xl" />;

  return (
    <Page>
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium capitalize text-muted-foreground">
            {format(new Date(), "EEEE d MMMM", { locale: dateLocale() })}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold normal-case",
                isOnline ? "bg-lime/25 text-[#3f6212] dark:text-lime" : "bg-secondary text-muted-foreground",
              )}
              title={t(isOnline ? "pages.dashboard.live.on_hint" : "pages.dashboard.live.off_hint")}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "animate-pulse bg-[#65a30d] dark:bg-lime" : "bg-muted-foreground")}
              />
              {t(isOnline ? "pages.dashboard.live.on" : "pages.dashboard.live.off")}
            </span>
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("pages.dashboard.greeting", { name: authUser?.forename ?? "" })}
          </h1>
          <p className="text-muted-foreground">{t("pages.dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-secondary p-1" role="tablist" aria-label={t("pages.dashboard.period")}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                role="tab"
                aria-selected={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  period === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`pages.statistics.periods.${p.key}`)}
              </button>
            ))}
          </div>
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

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {!kpis ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
        ) : (
          <>
            <KpiTile
              icon={<Activity className="h-4 w-4" />}
              label={t("pages.dashboard.kpis.updates")}
              value={kpis.updates}
              badge={updatesDelta}
              hint={t("pages.dashboard.kpis.updates_hint", { manual: kpis.manualUpdates, synced: kpis.syncedUpdates })}
            >
              <Sparkline values={periodActivity.map((day) => day.manual + day.synced)} color="var(--accent)" className="mt-3 h-8 w-full" />
            </KpiTile>
            <KpiTile
              icon={<Layers className="h-4 w-4" />}
              label={t("pages.dashboard.kpis.tracked")}
              value={kpis.trackedStats}
              hint={t("pages.dashboard.kpis.tracked_hint", { synced: kpis.syncedStats, numeric: kpis.numericStats })}
            >
              <SplitBar
                parts={[
                  { value: kpis.trackedStats - kpis.syncedStats, color: "var(--chart-1)", label: t("pages.dashboard.activity.manual") },
                  { value: kpis.syncedStats, color: "var(--chart-synced)", label: t("pages.dashboard.activity.synced") },
                ]}
              />
            </KpiTile>
            <KpiTile
              icon={<Target className="h-4 w-4" />}
              label={t("pages.dashboard.kpis.goals")}
              value={kpis.goalsTotal > 0 ? `${kpis.goalsReached}/${kpis.goalsTotal}` : "–"}
              hint={
                kpis.goalsTotal > 0
                  ? t("pages.dashboard.kpis.goals_hint", { count: kpis.goalsTotal - kpis.goalsReached })
                  : t("pages.dashboard.kpis.goals_none")
              }
              aside={kpis.goalsTotal > 0 && <ProgressRing percent={(kpis.goalsReached / kpis.goalsTotal) * 100} />}
            />
            <KpiTile
              icon={<Flame className="h-4 w-4" />}
              label={t("pages.dashboard.kpis.streak")}
              value={t("pages.dashboard.kpis.days", { count: kpis.streak })}
              hint={t("pages.dashboard.kpis.active_days", { count: kpis.activeDays, total: days })}
            >
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(kpis.activeDays / days) * 100}%` }} />
              </div>
            </KpiTile>
          </>
        )}
      </section>

      {/* Pinned stats */}
      <section className="space-y-4">
        <SectionHeading icon={<Pin className="h-4 w-4" />} title={t("pages.dashboard.pinned.title")} />
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
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

      {/* Activity + categories */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading icon={<BarChart3 className="h-4 w-4" />} title={t("pages.dashboard.activity.title")} />
            <Legend
              items={[
                { color: "var(--chart-1)", label: t("pages.dashboard.activity.manual") },
                { color: "var(--chart-synced)", label: t("pages.dashboard.activity.synced") },
              ]}
            />
          </div>
          <div className="mt-5 h-64">
            {!analytics ? (
              chartFallback
            ) : hasActivity ? (
              <Suspense fallback={chartFallback}>
                <ActivityChart days={periodActivity} />
              </Suspense>
            ) : (
              <ChartEmpty text={t("pages.dashboard.activity.empty")} />
            )}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <SectionHeading icon={<PieChart className="h-4 w-4" />} title={t("pages.dashboard.by_category.title")} />
          {!analytics ? (
            <Skeleton className="mt-5 h-64 rounded-xl" />
          ) : analytics.categories.length > 0 ? (
            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
              <div className="h-44 w-44 shrink-0">
                <Suspense fallback={<Skeleton className="h-full w-full rounded-full" />}>
                  <CategoryDonut categories={analytics.categories} metric={categoryMetric} />
                </Suspense>
              </div>
              <ul className="w-full min-w-0 space-y-2">
                {analytics.categories.slice(0, 6).map((category) => {
                  const total = analytics.categories.reduce((sum, c) => sum + c[categoryMetric], 0) || 1;
                  return (
                    <li key={category._id} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: category.color }} />
                      <span className="min-w-0 flex-1 truncate">{category.name}</span>
                      <span className="font-semibold tabular-nums">{category[categoryMetric]}</span>
                      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                        {Math.round((category[categoryMetric] / total) * 100)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <ChartEmpty text={t("pages.dashboard.by_category.empty")} className="mt-5 h-64" />
          )}
        </Card>
      </div>

      {/* Trends: one small chart per numeric stat */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading icon={<TrendingUp className="h-4 w-4" />} title={t("pages.dashboard.trends.title")} />
          <Link to="/statistics" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            {t("pages.dashboard.trends.see_all")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {!analytics ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : analytics.trends.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.trends.map((trend) => (
              <TrendCard key={trend._id} trend={trend} onClick={() => openStat(trend._id)} fallback={chartFallback} />
            ))}
          </div>
        ) : (
          <EmptyHint text={t("pages.dashboard.trends.empty")} action={t("pages.dashboard.categories.empty_action")} to="/statistics" />
        )}
      </section>

      {/* Movers + goals */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-2">
          <SectionHeading icon={<ArrowUpRight className="h-4 w-4" />} title={t("pages.dashboard.movers.title")} />
          <div className="mt-5" style={{ height: Math.max(160, movers.length * 36) }}>
            {!analytics ? (
              chartFallback
            ) : movers.length > 0 ? (
              <Suspense fallback={chartFallback}>
                <MoversChart trends={movers} onOpen={openStat} />
              </Suspense>
            ) : (
              <ChartEmpty text={t("pages.dashboard.movers.empty")} />
            )}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-3">
          <SectionHeading icon={<Target className="h-4 w-4" />} title={t("pages.dashboard.goals.title")} />
          <div className="mt-5 space-y-5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)
            ) : overview.goals.length > 0 ? (
              overview.goals.map((stat) => <GoalRow key={stat._id} stat={stat} onClick={() => openStat(stat._id)} />)
            ) : (
              <p className="text-sm text-muted-foreground">{t("pages.dashboard.goals.empty")}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Heatmap + recent activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="min-w-0 p-6 lg:col-span-3">
          <SectionHeading icon={<CalendarDays className="h-4 w-4" />} title={t("pages.dashboard.heatmap.title")} />
          <div className="mt-5">
            {!analytics ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : (
              <Suspense fallback={<Skeleton className="h-32 rounded-xl" />}>
                <ActivityHeatmap days={analytics.activity.slice(-182)} />
              </Suspense>
            )}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <SectionHeading icon={<Zap className="h-4 w-4" />} title={t("pages.dashboard.recent.title")} />
          <ol className="mt-5 space-y-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)
            ) : overview.recent.length > 0 ? (
              overview.recent.slice(0, 7).map((entry) => (
                <li key={entry._id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.categoryId?.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{entry.name}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span className="font-semibold">{entry.hided ? "••••" : entry.value}</span>
                      {entry.unit && <span className="text-muted-foreground"> {entry.unit}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: dateLocale() })}
                      {entry.integrationId && ` · ${t("pages.dashboard.recent.synced")}`}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("pages.dashboard.recent.empty")}</p>
            )}
          </ol>
        </Card>
      </div>

      {/* All categories */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading title={t("pages.dashboard.categories.title")} />
          <div className="flex flex-wrap gap-2">
            <Chip active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>
              {t("pages.dashboard.categories.all")}
            </Chip>
            {filledCategories.map((category) => (
              <Chip key={category._id} active={activeCategory === category._id} onClick={() => setActiveCategory(category._id)}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                {category.name}
              </Chip>
            ))}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : shownCategories.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {shownCategories.map((category) => (
              <CategoryCard key={category._id} category={category} onOpenStat={openStat} />
            ))}
          </div>
        ) : (
          <EmptyHint text={t("pages.dashboard.categories.empty")} action={t("pages.dashboard.categories.empty_action")} to="/statistics" />
        )}
      </section>
    </Page>
  );
};

const KpiTile = ({
  icon,
  label,
  value,
  hint,
  badge,
  aside,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
  badge?: number | null;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <Card className="flex flex-col p-5">
    <div className="flex items-center justify-between gap-2">
      <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent sm:flex">{icon}</span>
        <span className="truncate">{label}</span>
      </p>
      {badge !== undefined && badge !== null && Math.round(badge) !== 0 && <DeltaBadge value={badge} percent />}
    </div>
    <div className="mt-3 flex items-center justify-between gap-2">
      <p className="truncate font-display text-3xl font-bold tracking-tight">{value}</p>
      {aside}
    </div>
    <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    <div className="mt-auto">{children}</div>
  </Card>
);

const DeltaBadge = ({ value, percent }: { value: number; percent?: boolean }) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
      value > 0 ? "bg-lime/30 text-[#3f6212] dark:text-lime" : "bg-secondary text-muted-foreground",
    )}
  >
    {value > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
    {percent ? `${Math.abs(value).toFixed(0)}%` : formatNumeric(Math.abs(value), "number")}
  </span>
);

const ProgressRing = ({ percent }: { percent: number }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke={percent >= 100 ? "var(--chart-synced)" : "var(--accent)"}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(Math.min(percent, 100) / 100) * circumference} ${circumference}`}
        className="transition-all duration-700"
      />
    </svg>
  );
};

const SplitBar = ({ parts }: { parts: { value: number; color: string; label: string }[] }) => {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total === 0) return null;
  return (
    <div
      className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full"
      role="img"
      aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}
    >
      {parts
        .filter((part) => part.value > 0)
        .map((part) => (
          <div
            key={part.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(part.value / total) * 100}%`, backgroundColor: part.color }}
          />
        ))}
    </div>
  );
};

const Legend = ({ items }: { items: { color: string; label: string }[] }) => (
  <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
        {item.label}
      </span>
    ))}
  </div>
);

const ChartEmpty = ({ text, className }: { text: string; className?: string }) => (
  <div
    className={cn(
      "flex h-full items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground",
      className,
    )}
  >
    {text}
  </div>
);

const TrendCard = ({ trend, onClick, fallback }: { trend: StatTrend; onClick: () => void; fallback: React.ReactNode }) => {
  const { t } = useTranslation();
  const { change } = trend;
  const goalPercent = trend.goal?.target ? goalProgress({ numericValue: change.to, goal: trend.goal }) : null;

  return (
    <Card onClick={onClick} className="group cursor-pointer p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-muted-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: trend.categoryId?.color }} />
            <span className="truncate">{trend.name}</span>
            {trend.integrationId && (
              <span className="rounded-full bg-lime/25 px-1.5 text-[10px] font-semibold uppercase text-[#3f6212] dark:text-lime">
                {t("pages.dashboard.trends.auto")}
              </span>
            )}
          </p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="truncate font-display text-2xl font-bold tracking-tight">{formatNumeric(change.to, trend.type)}</span>
            {trend.unit && <span className="text-sm font-medium text-muted-foreground">{trend.unit}</span>}
          </p>
        </div>
        {change.value !== null && change.value !== 0 && (
          <div className="flex flex-col items-end gap-0.5">
            <DeltaBadge value={change.percent ?? change.value} percent={change.percent !== null} />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {change.value > 0 ? "+" : "−"}
              {formatNumeric(Math.abs(change.value), trend.type)}
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 h-20">
        {trend.history.length > 0 ? (
          <Suspense fallback={fallback}>
            <TrendChart trend={trend} />
          </Suspense>
        ) : null}
      </div>
      <p className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("pages.dashboard.trends.points", { count: trend.updates })}</span>
        {goalPercent !== null && <span>{t("pages.dashboard.trends.goal", { percent: goalPercent.toFixed(0) })}</span>}
      </p>
    </Card>
  );
};

const SectionHeading = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
    {icon && <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</span>}
    {title}
  </h2>
);

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
      active ? "border-accent bg-accent text-white" : "border-border bg-card text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const EmptyHint = ({ text, action, to }: { text: string; action: string; to: string }) => (
  <div className="flex flex-col items-start gap-2 rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted-foreground">{text}</p>
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
      {action}
      <ArrowRight className="h-4 w-4" />
    </Link>
  </div>
);

const PinnedStatCard = ({ stat, onClick }: { stat: StatsOverview["pinned"][number]; onClick: () => void }) => {
  const color = stat.categoryId?.color ?? "var(--accent)";
  const delta = lastDelta(stat.history);
  const values = numericPoints(stat.history).map((point) => point.value);

  return (
    <Card
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-muted-foreground">{stat.name}</p>
        {delta && delta.value !== 0 && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              delta.value > 0 ? "bg-lime/30 text-[#3f6212] dark:text-lime" : "bg-secondary text-muted-foreground",
            )}
          >
            {delta.value > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta.percent !== null ? `${Math.abs(delta.percent).toFixed(0)}%` : Math.abs(delta.value)}
          </span>
        )}
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="truncate font-display text-3xl font-bold tracking-tight">{stat.hided ? "••••••" : stat.value}</span>
        {stat.unit && <span className="text-sm font-medium text-muted-foreground">{stat.unit}</span>}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{stat.categoryId?.name}</p>
      <Sparkline values={values} color={color} className="mt-3 h-10 w-full" />
    </Card>
  );
};

const GoalRow = ({ stat, onClick }: { stat: StatWithCategory; onClick: () => void }) => {
  const { t } = useTranslation();
  const progress = goalProgress(stat);
  const done = isGoalReached(stat);
  const remaining = goalRemaining(stat);
  const DirectionIcon = stat.goal?.direction === "decrease" ? ArrowDownRight : ArrowUpRight;

  return (
    <button onClick={onClick} className="block w-full cursor-pointer text-left">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium">
          {stat.name}
          <span className="text-muted-foreground"> · {stat.categoryId?.name}</span>
        </p>
        <p className="shrink-0 text-sm font-semibold">
          {stat.value}
          <span className="inline-flex items-baseline gap-0.5 font-normal text-muted-foreground">
            <DirectionIcon
              className="mx-0.5 h-3.5 w-3.5 self-center"
              aria-label={t(`pages.statistics.goal.${stat.goal?.direction ?? "increase"}`)}
            />
            {stat.goal ? formatNumeric(stat.goal.target, stat.type) : ""} {stat.unit}
          </span>
        </p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all", done ? "bg-lime" : "bg-accent")}
          style={{ width: `${Math.max(progress, 3)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {done
          ? t("pages.dashboard.goals.done")
          : `${progress.toFixed(0)}%${remaining !== null ? ` · ${t("pages.statistics.goal.remaining", { value: `${formatNumeric(remaining, stat.type)}${stat.unit ? ` ${stat.unit}` : ""}` })}` : ""}`}
        {stat.goal?.deadline &&
          ` · ${t("pages.dashboard.goals.deadline", { date: format(new Date(stat.goal.deadline), "d MMM yyyy", { locale: dateLocale() }) })}`}
      </p>
    </button>
  );
};

const CategoryCard = ({ category, onOpenStat }: { category: CategoryInterface; onOpenStat: (id: string) => void }) => {
  const Icon = getIcon(category.icon);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${category.color}1f`, color: category.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{category.name}</h3>
          {category.description && <p className="truncate text-xs text-muted-foreground">{category.description}</p>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {category.stats.map((stat) => (
          <button
            key={stat._id}
            onClick={() => onOpenStat(stat._id)}
            className="cursor-pointer rounded-xl bg-secondary/60 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
          >
            <p className="truncate text-xs text-muted-foreground">{stat.name}</p>
            <p className="truncate font-display text-lg font-bold">
              {stat.hided ? "••••" : stat.value}
              {stat.unit && <span className="ml-1 text-xs font-medium text-muted-foreground">{stat.unit}</span>}
            </p>
          </button>
        ))}
      </div>
    </Card>
  );
};
