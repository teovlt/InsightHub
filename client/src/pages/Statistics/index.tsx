import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRight, Edit, Eye, EyeOff, Pin, PinOff, Plus, RotateCcw, Search, Target, Trash2, Zap } from "lucide-react";
import { Page, PageHeader } from "@/components/customs/page";
import { AddStatDialog } from "@/components/customs/addStatDialog";
import { EditStatDialog } from "@/components/customs/editStatDialog";
import { RollbackStatDialog } from "@/components/customs/rollbackDialog";
import { DeleteConfirmationDialog } from "@/components/customs/deleteConfirmationDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosConfig } from "@/config/axiosConfig";
import { CategoryInterface } from "@/interfaces/Category";
import { StatHistoryPoint, StatInterface } from "@/interfaces/Stat";
import { getIcon } from "@/lib/icons";
import { dateLocale, formatNumeric, goalProgress, goalRemaining, isGoalReached, isNumeric, numericPoints } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { GoalDialog } from "./goalDialog";

const StatChart = lazy(() => import("./statChart"));

const PERIODS = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "1y", days: 365 },
  { key: "all", days: Infinity },
] as const;

export const Statistics = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<CategoryInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");

  const selectedId = searchParams.get("stat");
  const allStats = useMemo(() => categories.flatMap((category) => category.stats.map((stat) => ({ stat, category }))), [categories]);
  const selected = allStats.find((entry) => entry.stat._id === selectedId) ?? null;

  const fetchCategories = async (keep?: { categoryId: string; name: string }) => {
    try {
      const response = await axiosConfig.get("/categories", { params: { page: 0, size: 50 } });
      const next: CategoryInterface[] = response.data.categories;
      setCategories(next);

      // A new value creates a new version with a new id: follow the stat by category and name
      const stats = next.flatMap((category) => category.stats);
      const current = stats.find((stat) => stat._id === searchParams.get("stat"));
      const followed = keep && stats.find((stat) => stat.categoryId === keep.categoryId && stat.name === keep.name);
      const target = current ?? followed ?? (window.innerWidth >= 1024 ? stats[0] : undefined);
      if (target) setSearchParams({ stat: target._id }, { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Categories are shared by everyone (integrations create theirs): only show those this user has stats in
  const filledCategories = categories.filter((category) => category.stats.length > 0);
  const hasSyncedStat = allStats.some((entry) => entry.stat.integrationId);

  const filtered = filledCategories
    .filter((category) => activeCategory === "all" || category._id === activeCategory)
    .map((category) => ({
      ...category,
      stats: category.stats.filter((stat) => stat.name.toLowerCase().includes(query.trim().toLowerCase())),
    }))
    .filter((category) => category.stats.length > 0);

  return (
    <Page>
      <PageHeader
        eyebrow={t("navbar.statistics")}
        title={t("pages.statistics.title")}
        description={t("pages.statistics.description")}
        actions={
          <AddStatDialog
            categories={categories}
            refrechStats={() => fetchCategories()}
            trigger={
              <Button>
                <Plus />
                {t("pages.statistics.new_stat")}
              </Button>
            }
          />
        }
      />

      {!loading && filledCategories.length === 0 ? (
        <Card className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime text-[#0f172a]">
            <Zap className="h-7 w-7" />
          </div>
          <div className="max-w-xl space-y-2">
            <h2 className="text-xl font-bold tracking-tight">{t("pages.statistics.empty.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("pages.statistics.empty.description")}</p>
          </div>
          <div className="grid w-full max-w-2xl gap-3 text-left sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Zap className="h-4 w-4 text-accent" />
                {t("pages.statistics.empty.auto_title")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t("pages.statistics.empty.auto_description")}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Plus className="h-4 w-4 text-accent" />
                {t("pages.statistics.empty.manual_title")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t("pages.statistics.empty.manual_description")}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/integrations">
                <Zap />
                {t("pages.statistics.empty.connect")}
              </Link>
            </Button>
            <AddStatDialog
              categories={categories}
              refrechStats={() => fetchCategories()}
              trigger={
                <Button variant="outline">
                  <Plus />
                  {t("pages.statistics.empty.create")}
                </Button>
              }
            />
          </div>
        </Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
          {/* Stat list */}
          <Card className="overflow-hidden lg:sticky lg:top-24">
            <div className="space-y-3 border-b p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("pages.statistics.search")}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>
                  {t("pages.dashboard.categories.all")}
                </FilterChip>
                {filledCategories.map((category) => (
                  <FilterChip key={category._id} active={activeCategory === category._id} onClick={() => setActiveCategory(category._id)}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                    {category.name}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2 lg:max-h-[calc(100dvh-20rem)]">
              {loading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((category) => (
                  <div key={category._id} className="mb-2">
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category.name}</p>
                    {category.stats.map((stat) => (
                      <button
                        key={stat._id}
                        onClick={() => setSearchParams({ stat: stat._id })}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          stat._id === selectedId ? "bg-accent/10" : "hover:bg-secondary",
                        )}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className={cn("min-w-0 flex-1 truncate text-sm", stat._id === selectedId && "font-semibold text-accent")}>
                          {stat.name}
                        </span>
                        {stat.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        {stat.integrationId && <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        <span className="max-w-[40%] shrink-0 truncate text-sm font-semibold">
                          {stat.hided ? "••••" : stat.value}
                          {stat.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{stat.unit}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">{t("pages.statistics.no_stats")}</p>
              )}
            </div>
            {!loading && !hasSyncedStat && (
              <Link
                to="/integrations"
                className="flex items-start gap-3 border-t bg-secondary/40 p-4 text-left transition-colors hover:bg-secondary"
              >
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{t("pages.statistics.auto_hint.title")}</span>
                  <span className="block text-muted-foreground">{t("pages.statistics.auto_hint.description")}</span>
                </span>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )}
          </Card>

          {/* Detail */}
          {selected ? (
            <StatDetail
              key={selected.stat._id}
              stat={selected.stat}
              category={selected.category}
              onChanged={() => fetchCategories({ categoryId: selected.stat.categoryId, name: selected.stat.name })}
              onDeleted={() => {
                setSearchParams({}, { replace: true });
                fetchCategories();
              }}
            />
          ) : (
            !loading && (
              <Card className="hidden flex-col items-center justify-center gap-2 p-12 text-center lg:flex">
                <p className="font-semibold">{t("pages.statistics.pick_title")}</p>
                <p className="text-sm text-muted-foreground">{t("pages.statistics.pick_description")}</p>
              </Card>
            )
          )}
        </div>
      )}
    </Page>
  );
};

const FilterChip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
      active ? "border-accent bg-accent text-white" : "border-border text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

interface StatDetailProps {
  stat: StatInterface;
  category: CategoryInterface;
  onChanged: () => void;
  onDeleted: () => void;
}

const StatDetail = ({ stat, category, onChanged, onDeleted }: StatDetailProps) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<StatHistoryPoint[]>([]);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("all");
  const [dialog, setDialog] = useState<"edit" | "goal" | "rollback" | "delete" | null>(null);
  const Icon = getIcon(category.icon);
  const numeric = isNumeric(stat);
  const synced = Boolean(stat.integrationId);

  useEffect(() => {
    axiosConfig
      .get(`/stats/${stat._id}/history`)
      .then((response) => setHistory(response.data.history))
      .catch((error) => toast.error(error.response?.data?.error));
  }, [stat._id]);

  const days = PERIODS.find((p) => p.key === period)!.days;
  const points = numericPoints(history).filter((point) => days === Infinity || point.date >= Date.now() - days * 86_400_000);
  const values = points.map((point) => point.value);
  const fmt = (value: number) => `${formatNumeric(value, stat.type)}${stat.unit ? ` ${stat.unit}` : ""}`;
  const change = values.length > 1 ? values[values.length - 1] - values[0] : null;
  const progress = goalProgress(stat);
  const goalReached = isGoalReached(stat);
  const remaining = goalRemaining(stat);

  const patch = async (url: string, body: object) => {
    try {
      const response = await axiosConfig.patch(url, body);
      toast.success(response.data.message);
      onChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    }
  };

  const toggleHidden = async () => {
    try {
      const response = await axiosConfig.put(`/stats/${stat._id}`, { value: stat.value, hided: !stat.hided });
      toast.success(response.data.message);
      onChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await axiosConfig.delete(`/stats/${stat._id}`);
      toast.success(response.data.message);
      setDialog(null);
      onDeleted();
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: category.color }} />
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: `${category.color}1f`, color: category.color }}
              >
                <Icon className="h-3.5 w-3.5" />
                {category.name}
              </span>
              {synced && (
                <Badge className="border-transparent bg-lime text-[#0f172a]">
                  <Zap />
                  {t("pages.statistics.synced")}
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{stat.name}</h2>
            <p className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold tracking-tight">{stat.hided ? "••••••" : stat.value}</span>
              {stat.unit && <span className="text-lg font-medium text-muted-foreground">{stat.unit}</span>}
            </p>
            {stat.description && <p className="text-sm text-muted-foreground">{stat.description}</p>}
          </div>

          <div className="flex flex-wrap gap-2 md:max-w-[260px] md:justify-end">
            <Button
              variant={stat.pinned ? "secondary" : "outline"}
              size="sm"
              onClick={() => patch(`/stats/${stat._id}/pin`, { pinned: !stat.pinned })}
            >
              {stat.pinned ? <PinOff /> : <Pin />}
              {stat.pinned ? t("pages.statistics.actions.unpin") : t("pages.statistics.actions.pin")}
            </Button>
            {numeric && (
              <Button variant="outline" size="sm" onClick={() => setDialog("goal")}>
                <Target />
                {t("pages.statistics.actions.goal")}
              </Button>
            )}
            {!synced && (
              <>
                <Button variant="outline" size="sm" onClick={() => setDialog("edit")}>
                  <Edit />
                  {t("pages.statistics.actions.edit")}
                </Button>
                <Button variant="outline" size="sm" onClick={toggleHidden}>
                  {stat.hided ? <Eye /> : <EyeOff />}
                  {stat.hided ? t("pages.statistics.actions.show") : t("pages.statistics.actions.hide")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDialog("rollback")} disabled={history.length < 2}>
                  <RotateCcw />
                  {t("pages.statistics.actions.rollback")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDialog("delete")}
                >
                  <Trash2 />
                  {t("pages.statistics.actions.delete")}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold">{t("pages.statistics.evolution")}</h3>
          {numeric && (
            <div className="inline-flex rounded-xl bg-secondary p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition-colors",
                    period === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`pages.statistics.periods.${p.key}`)}
                </button>
              ))}
            </div>
          )}
        </div>

        {!numeric ? (
          <p className="mt-6 rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">{t("pages.statistics.text_stat")}</p>
        ) : stat.hided ? (
          <p className="mt-6 rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">{t("pages.statistics.hidden_stat")}</p>
        ) : points.length < 2 ? (
          <p className="mt-6 rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">{t("pages.statistics.not_enough")}</p>
        ) : (
          <>
            <div className="mt-6 h-72">
              <Suspense fallback={<Skeleton className="h-full w-full rounded-xl" />}>
                <StatChart points={points} color={category.color} type={stat.type} unit={stat.unit} goal={stat.goal?.target} />
              </Suspense>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure
                label={t("pages.statistics.figures.change")}
                value={change === null ? "–" : `${change > 0 ? "+" : ""}${fmt(change)}`}
              />
              <Figure label={t("pages.statistics.figures.min")} value={fmt(Math.min(...values))} />
              <Figure label={t("pages.statistics.figures.max")} value={fmt(Math.max(...values))} />
              <Figure label={t("pages.statistics.figures.entries")} value={String(points.length)} />
            </dl>
          </>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Goal */}
        <Card className="p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{t("pages.statistics.goal.title")}</h3>
            {numeric && (
              <Button variant="ghost" size="sm" onClick={() => setDialog("goal")}>
                {stat.goal ? t("pages.statistics.actions.edit") : t("pages.statistics.goal.set")}
              </Button>
            )}
          </div>
          {stat.goal ? (
            <div className="mt-4">
              <p className="text-sm">
                <span className="font-display text-2xl font-bold">{progress.toFixed(0)}%</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {stat.goal.direction === "decrease" ? "↓" : "↑"} {fmt(stat.goal.target)}
                </span>
              </p>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full", goalReached ? "bg-lime" : "bg-accent")}
                  style={{ width: `${Math.max(progress, 3)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {goalReached
                  ? t("pages.statistics.goal.reached")
                  : remaining !== null && t("pages.statistics.goal.remaining", { value: fmt(remaining) })}
              </p>
              {stat.goal.deadline && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("pages.dashboard.goals.deadline", {
                    date: format(new Date(stat.goal.deadline), "d MMM yyyy", { locale: dateLocale() }),
                  })}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {numeric ? t("pages.statistics.goal.none") : t("pages.statistics.goal.text_only")}
            </p>
          )}
        </Card>

        {/* History */}
        <Card className="p-6">
          <h3 className="font-semibold">{t("pages.statistics.history")}</h3>
          <ol className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
            {[...history].reverse().map((point, index) => (
              <li key={point._id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(point.createdAt), "d MMM yyyy, HH:mm", { locale: dateLocale() })}
                </span>
                <span className={cn("font-semibold", index === 0 && "text-accent")}>
                  {stat.hided ? "••••" : point.value} {stat.unit}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <EditStatDialog stat={stat} open={dialog === "edit"} onOpenChange={(open) => setDialog(open ? "edit" : null)} refresh={onChanged} />
      <RollbackStatDialog
        stat={stat}
        open={dialog === "rollback"}
        onOpenChange={(open) => setDialog(open ? "rollback" : null)}
        refresh={onChanged}
      />
      <GoalDialog stat={stat} open={dialog === "goal"} onOpenChange={(open) => setDialog(open ? "goal" : null)} onSaved={onChanged} />
      <DeleteConfirmationDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        onConfirm={handleDelete}
        title={t("pages.statistics.delete_title")}
        description={t("pages.statistics.delete_description", { name: stat.name })}
      />
    </div>
  );
};

const Figure = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-secondary/60 p-3">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 truncate font-display text-lg font-bold">{value}</dd>
  </div>
);
