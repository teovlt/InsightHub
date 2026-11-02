"use client";

import { CategorySection } from "@/components/customs/category-section";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosConfig } from "@/config/axiosConfig";
import { CategoryInterface } from "@/interfaces/Category";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const Home = () => {
  const [categories, setCategories] = useState<CategoryInterface[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslation();

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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6 space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t("pages.home.title")}</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">{t("pages.home.subtitle")}</p>
        </header>

        {/* Content */}
        <div className="space-y-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:mt-32">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="space-y-4">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : categories.length > 0 ? (
            <>
              {categories.map((category) => (
                <CategorySection key={category._id} category={category} refresh={fetchAllCategories} />
              ))}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground space-y-2">
                <p className="text-lg">{t("pages.home.empty_title")}</p>
                <p className="text-sm">{t("pages.home.empty_description")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
