import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FolderTree, LayoutDashboard, Link2, NotebookText, Users } from "lucide-react";
import { Page, PageHeader } from "@/components/customs/page";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { to: "/admin/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/admin/users", key: "users", icon: Users },
  { to: "/admin/integrations", key: "integrations", icon: Link2 },
  { to: "/admin/categories", key: "categories", icon: FolderTree },
  { to: "/admin/logs", key: "logs", icon: NotebookText },
];

// Admin shell: same navbar, width and page header as the rest of the app, with one tab per section
export const Index = () => {
  const { t } = useTranslation();

  return (
    <Page className="space-y-8">
      <PageHeader eyebrow={t("pages.admin.eyebrow")} title={t("pages.admin.title")} description={t("pages.admin.description")} />

      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={t("pages.admin.title")}>
        <div className="inline-flex gap-1 rounded-xl bg-secondary p-1">
          {SECTIONS.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={key}
              to={to}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {t(`pages.admin.sections.${key}`)}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Sections are lazy-loaded: keep the header and tabs while one loads */}
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <Outlet />
      </Suspense>
    </Page>
  );
};
