"use client";

import { CategorySection } from "@/components/customs/category-section";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosConfig } from "@/config/axiosConfig";
import { CategoryInterface } from "@/interfaces/Category";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Home = () => {
  const [categories, setCategories] = useState<CategoryInterface[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAllCategories();
  }, []);

  async function fetchAllCategories(page: number = 0, size: number = 10) {
    setLoading(true);
    try {
      const response = await axiosConfig.get("/categories");
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
          <h1 className="text-4xl font-bold tracking-tight">Take Control of Your Habits and Goals</h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Your personal dashboard to track habits, measure progress, and stay accountable. Organize your life with clear categories and
            celebrate your growth, one step at a time.
          </p>
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
                <p className="text-lg">No categories yet!</p>
                <p className="text-sm">Create your first category to start tracking your life metrics.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
