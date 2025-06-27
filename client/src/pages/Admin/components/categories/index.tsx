import { axiosConfig } from "@/config/axiosConfig";
import { useState } from "react";
import { toast } from "sonner";
import { getColumns } from "./columns";
import { DataTable } from "@/components/customs/dataTable";

export const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesCount, setCategoriesCount] = useState(0);

  async function fetchAllCategories(page: number = 0, size: number = 10) {
    setLoading(true);
    try {
      const response = await axiosConfig.get("/categories?page=" + page + "&size=" + size);
      setCategories(response.data.categories);
      setCategoriesCount(response.data.count);
    } catch (error: any) {
      toast.error(error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCategory(categoryId: string) {
    try {
      const response = await axiosConfig.delete(`/categories/${categoryId}`);
      toast.success(response.data.message);
      fetchAllCategories();
    } catch (error: any) {
      toast.error(error.response);
    }
  }

  async function deleteAllCategories() {
    try {
      const response = await axiosConfig.delete(`/categories`);
      toast.success(response.data.message);
      fetchAllCategories();
    } catch (error: any) {
      toast.error(error.response);
    }
  }

  function callback(action: string, data: any) {
    switch (action) {
      case "deleteAll":
        deleteAllCategories();
      default:
        break;
    }
  }

  return (
    <div>
      <div className="container px-4 mx-auto">
        <DataTable
          columns={getColumns(deleteCategory)}
          data={categories}
          dataCount={categoriesCount}
          fetchData={fetchAllCategories}
          isLoading={loading}
          callback={callback}
          searchElement="name"
          searchPlaceholder="Filter by name"
          actions={["deleteAll"]}
        />
      </div>
    </div>
  );
};
