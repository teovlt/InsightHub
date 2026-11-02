"use client";

import { CategorySection } from "@/components/customs/category-section";
import { Page } from "@/components/customs/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { axiosConfig } from "@/config/axiosConfig";
import { useAuthContext } from "@/contexts/authContext";
import { CategoryInterface } from "@/interfaces/Category";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Link2, Sparkles } from "lucide-react";

export const Home = () => {
  const [categories, setCategories] = useState<CategoryInterface[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslation();
  const { authUser } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllCategories();
  }, []);

  async function fetchAllCategories(page: number = 0, size: number = 10) {
    setLoading(true);
    try {
      const response = await axiosConfig.get("/categories", {
        params: { page, size },
      });
      setCategories(response.data.categories);
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  }

  const stats = categories.flatMap((category) => category.stats);
  const summary = [
    { label: t("pages.home.summary.categories"), value: categories.length },
    { label: t("pages.home.summary.stats"), value: stats.length },
    { label: t("pages.home.summary.automatic"), value: stats.filter((stat) => stat.integrationId).length },
  ];

  return (
    <Page>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-brand-strong p-6 text-white shadow-card sm:p-10">
        <HeroBars />
        <div className="relative max-w-2xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
            <Sparkles className="w-4 h-4 text-lime" />
            {t("pages.home.greeting", { name: authUser?.forename ?? "" })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{t("pages.home.title")}</h1>
          <p className="text-base text-white/80 sm:text-lg">{t("pages.home.subtitle")}</p>
        </div>

        <dl className="relative mt-8 grid grid-cols-3 gap-3 sm:max-w-xl sm:gap-4">
          {summary.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white/10 p-3 backdrop-blur sm:p-4">
              <dd className="font-display text-2xl font-bold sm:text-3xl">{loading ? "–" : item.value}</dd>
              <dt className="text-xs text-white/75 sm:text-sm">{item.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Content */}
      {loading ? (
        <div className="space-y-10">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : categories.length > 0 ? (
        <div className="space-y-12">
          {categories.map((category) => (
            <CategorySection key={category._id} category={category} refresh={fetchAllCategories} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Sparkles className="!size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">{t("pages.home.empty_title")}</p>
            <p className="text-sm text-muted-foreground">{t("pages.home.empty_description")}</p>
          </div>
          <Button onClick={() => navigate("/integrations")}>
            <Link2 />
            {t("pages.home.connect_app")}
          </Button>
        </div>
      )}
    </Page>
  );
};

// Decorative rising bars echoing the logo, drawn on the right of the hero.
const HeroBars = () => {
  const bars = [38, 52, 46, 64, 58, 78, 92];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-4 bottom-0 hidden h-full items-end gap-3 pr-10 opacity-90 md:flex"
    >
      {bars.map((height, index) => (
        <div
          key={index}
          className={index === bars.length - 1 ? "w-8 rounded-t-xl bg-lime" : "w-8 rounded-t-xl bg-white/15"}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
};
