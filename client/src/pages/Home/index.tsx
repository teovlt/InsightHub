"use client";

import { axiosConfig } from "@/config/axiosConfig";
import { CategoryInterface } from "@/interfaces/Category";
import { useEffect, useState } from "react";
import { toast } from "sonner";
// import { CategorySection } from "../components/category-section";

export const Home = () => {
  const [categories, setCategories] = useState<CategoryInterface[]>([]);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen ">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-center space-y-4 flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r bg-accent bg-clip-text text-transparent">Life Dashboard</h1>
            <p className="text-muted-foreground text-lg">Track your progress, celebrate your wins, optimize your life</p>
          </div>
        </div>

        <div className="space-y-8">
          {categories.map((category) => (
            // <CategorySection key={category.id} category={category} onAddStat={handleAddStat} />
            <div key={category._id} className="p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
              <p className="text-muted-foreground mb-4">{category.description}</p>
            </div>
          ))}

          {categories.length === 0 && (
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
