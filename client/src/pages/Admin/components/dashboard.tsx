import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Radio, UserPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosConfig } from "@/config/axiosConfig";
import { useSocketContext } from "@/contexts/socketContext";
import { getIcon } from "@/lib/icons";
import { dateLocale } from "@/lib/stats";
import { cn } from "@/lib/utils";

interface AdminOverview {
  users: { total: number; newWeek: number; newMonth: number; activeWeek: number; byAuth: { type: string; count: number }[] };
  signups: { date: string; count: number }[];
  content: { stats: number; valuesWeek: number; goals: number; badges: number };
  integrations: { _id: string; name: string; icon: string; color: string; status: string; connections: number; failing: number }[];
  logs: { problemsWeek: number; latest: { _id: string; message: string; level: string; createdAt: string }[] };
}

const AUTH_COLORS: Record<string, string> = { local: "bg-accent", google: "bg-lime" };

export const Dashboard = () => {
  const { t } = useTranslation();
  const { onlineUsers } = useSocketContext();
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  useEffect(() => {
    axiosConfig
      .get("/admin/overview")
      .then((response) => setOverview(response.data))
      .catch((error) => toast.error(error.response?.data?.error));
  }, []);

  if (!overview) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const { users, signups, content, integrations, logs } = overview;
  const maxSignups = Math.max(1, ...signups.map((day) => day.count));
  const activeShare = users.total ? Math.round((users.activeWeek / users.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label={t("pages.admin.dashboard.users")}
          value={users.total}
          hint={t("pages.admin.dashboard.new_month", { count: users.newMonth })}
        />
        <Kpi icon={<UserPlus className="h-4 w-4" />} label={t("pages.admin.dashboard.new_week")} value={users.newWeek} />
        <Kpi
          icon={<Activity className="h-4 w-4" />}
          label={t("pages.admin.dashboard.active_week")}
          value={users.activeWeek}
          hint={t("pages.admin.dashboard.active_share", { percent: activeShare })}
        />
        <Kpi
          icon={<Radio className="h-4 w-4" />}
          label={t("pages.admin.dashboard.online")}
          value={
            <span className="inline-flex items-center gap-2">
              {onlineUsers.length}
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-lime" />
            </span>
          }
        />
      </div>

      {/* Signups + sign-in methods */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <Heading
            title={t("pages.admin.dashboard.signups_title")}
            hint={t("pages.admin.dashboard.signups_hint", { count: users.newMonth })}
          />
          <div className="mt-6 flex h-40 items-end gap-1" role="img" aria-label={t("pages.admin.dashboard.signups_title")}>
            {signups.map((day) => (
              <div key={day.date} className="group relative flex h-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-colors",
                    day.count > 0 ? "bg-accent group-hover:bg-accent/80" : "bg-secondary",
                  )}
                  style={{ height: `${day.count > 0 ? Math.max(8, (day.count / maxSignups) * 100) : 4}%` }}
                />
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs shadow-card group-hover:block">
                  {format(parseISO(day.date), "d MMM", { locale: dateLocale() })} · {day.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{format(parseISO(signups[0].date), "d MMM", { locale: dateLocale() })}</span>
            <span>{t("pages.admin.dashboard.today")}</span>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <Heading title={t("pages.admin.dashboard.auth_title")} />
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-secondary">
            {users.byAuth.map((auth) => (
              <div
                key={auth.type}
                className={AUTH_COLORS[auth.type] ?? "bg-muted-foreground"}
                style={{ width: `${users.total ? (auth.count / users.total) * 100 : 0}%` }}
              />
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {users.byAuth.map((auth) => (
              <div key={auth.type} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className={cn("h-2.5 w-2.5 rounded-full", AUTH_COLORS[auth.type] ?? "bg-muted-foreground")} />
                  {t(`pages.admin.dashboard.auth.${auth.type}`, { defaultValue: auth.type })}
                </span>
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{auth.count}</strong> ·{" "}
                  {users.total ? Math.round((auth.count / users.total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Content created by users */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi small label={t("pages.admin.dashboard.content.stats")} value={content.stats} />
        <Kpi small label={t("pages.admin.dashboard.content.values_week")} value={content.valuesWeek} />
        <Kpi small label={t("pages.admin.dashboard.content.goals")} value={content.goals} />
        <Kpi small label={t("pages.admin.dashboard.content.badges")} value={content.badges} />
      </div>

      {/* Integrations health + latest problems */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <Heading title={t("pages.admin.dashboard.integrations_title")} to="/admin/integrations" />
          <div className="mt-4 divide-y divide-border/70">
            {integrations.map((integration) => {
              const Icon = getIcon(integration.icon);
              return (
                <div key={integration._id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white [&_svg]:size-4"
                    style={{ backgroundColor: integration.color || "var(--accent)" }}
                  >
                    <Icon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{integration.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("pages.admin.dashboard.connections", { count: integration.connections })}
                    </p>
                  </div>
                  {integration.status !== "available" ? (
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {t(`pages.admin.dashboard.status.${integration.status}`, { defaultValue: integration.status })}
                    </span>
                  ) : integration.failing > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      {t("pages.admin.dashboard.failing", { count: integration.failing })}
                    </span>
                  ) : integration.connections > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-[#65a30d] dark:text-lime" aria-label={t("pages.admin.dashboard.healthy")} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <Heading
            title={t("pages.admin.dashboard.problems_title")}
            hint={t("pages.admin.dashboard.problems_week", { count: logs.problemsWeek })}
            to="/admin/logs"
          />
          <div className="mt-4 space-y-2">
            {logs.latest.length > 0 ? (
              logs.latest.map((log) => (
                <div key={log._id} className="flex items-start gap-3 rounded-xl bg-secondary/60 px-3 py-2.5">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", log.level === "error" ? "bg-red-500" : "bg-amber-400")} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm">{log.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: dateLocale() })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-[#65a30d] dark:text-lime" />
                {t("pages.admin.dashboard.no_problems")}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Kpi = ({
  icon,
  label,
  value,
  hint,
  small,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  small?: boolean;
}) => (
  <Card className={cn("p-5", small && "bg-card/60 shadow-none")}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium leading-snug text-muted-foreground">{label}</p>
      {icon && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</span>}
    </div>
    <p className={cn("mt-2 font-display font-bold tracking-tight", small ? "text-2xl" : "text-3xl sm:text-4xl")}>{value}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </Card>
);

const Heading = ({ title, hint, to }: { title: string; hint?: string; to?: string }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {to && (
        <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:underline">
          {t("pages.dashboard.see_all")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
};
