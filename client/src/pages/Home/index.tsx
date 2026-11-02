"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Pin, Plus, Target, Zap } from "lucide-react";
import { Page } from "@/components/customs/page";
import { Sparkline } from "@/components/customs/sparkline";
import { QuickUpdateDialog } from "@/components/customs/quickUpdateDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosConfig } from "@/config/axiosConfig";
import { useAuthContext } from "@/contexts/authContext";
import { CategoryInterface } from "@/interfaces/Category";
import { StatsOverview, StatWithCategory } from "@/interfaces/Stat";
import { getIcon } from "@/lib/icons";
import { dateLocale, formatNumeric, goalProgress, lastDelta, numericPoints } from "@/lib/stats";
import { cn } from "@/lib/utils";

export const Home = () => {
  const [categories, setCategories] = useState<CategoryInterface[]>([]);
  const [overview, setOverview] = useState<StatsOverview>({ pinned: [], goals: [], recent: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { t } = useTranslation();
  const { authUser } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const [categoriesResponse, overviewResponse] = await Promise.all([
        axiosConfig.get("/categories", { params: { page: 0, size: 50 } }),
        axiosConfig.get("/stats/overview"),
      ]);
      setCategories(categoriesResponse.data.categories);
      setOverview(overviewResponse.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  }

  const filledCategories = categories.filter((category) => category.stats.length > 0);
  const shownCategories = filledCategories.filter((category) => activeCategory === "all" || category._id === activeCategory);
  const openStat = (id: string) => navigate(`/statistics?stat=${id}`);

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
        <div className="flex gap-2">
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

      {/* Goals + activity */}
      <div className="grid gap-6 lg:grid-cols-5">
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
  const done = progress >= 100;

  return (
    <button onClick={onClick} className="block w-full cursor-pointer text-left">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium">
          {stat.name}
          <span className="text-muted-foreground"> · {stat.categoryId?.name}</span>
        </p>
        <p className="shrink-0 text-sm font-semibold">
          {stat.value}
          <span className="font-normal text-muted-foreground">
            {" "}
            / {stat.goal ? formatNumeric(stat.goal.target, stat.type) : ""} {stat.unit}
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
        {done ? t("pages.dashboard.goals.done") : `${progress.toFixed(0)}%`}
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
