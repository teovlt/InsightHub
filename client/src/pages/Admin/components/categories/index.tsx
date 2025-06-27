import { axiosConfig } from "@/config/axiosConfig";
import { useState } from "react";
import { toast } from "sonner";
import { getColumns } from "./columns";
import { DataTable } from "@/components/customs/dataTable";
import { Dialog, DialogHeader, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CategoryForm } from "./categoryForm";
import { CategoryInterface } from "@/interfaces/Category";

export const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [action, setAction] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryInterface>();

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
    setSelectedCategory(undefined);
    switch (action) {
      case "deleteAll":
        deleteAllCategories();
      case "create":
        setAction("create");
        setOpenDialog(true);
        break;
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
          actions={["deleteAll", "create"]}
        />
      </div>
      <div>
        {openDialog && (
          <Dialog open={openDialog} onOpenChange={() => setOpenDialog(false)}>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>{action.charAt(0).toUpperCase() + action.slice(1)} a user</DialogTitle>
                {action === "create" && <DialogDescription>Here you can give life to a new user</DialogDescription>}
              </DialogHeader>
              <CategoryForm dialog={setOpenDialog} refresh={fetchAllCategories} action={action} category={selectedCategory} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};
