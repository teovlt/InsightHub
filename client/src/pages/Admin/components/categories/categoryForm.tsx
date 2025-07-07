import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { axiosConfig } from "@/config/axiosConfig";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createCategorySchema, deleteInfoSchema, updateCategorySchema } from "@/lib/zod/schemas/admin/zod";
import { CategoryInterface } from "@/interfaces/Category";
import ColorPicker from "@/components/customs/colorPicker";

interface CategoryFormProps {
  dialog: (isOpen: boolean) => void;
  refresh: () => void;
  action: string;
  category?: CategoryInterface;
}

export const CategoryForm = ({ dialog, refresh, action, category }: CategoryFormProps) => {
  const [loading, setLoading] = useState(false);

  const iconOptions = [
    { value: "DollarSign", label: "💰 Money" },
    { value: "Activity", label: "🏃 Fitness" },
    { value: "Heart", label: "❤️ Health" },
    { value: "BookOpen", label: "📚 Learning" },
    { value: "Briefcase", label: "💼 Career" },
    { value: "Home", label: "🏠 Home" },
    { value: "Car", label: "🚗 Transport" },
    { value: "Gamepad2", label: "🎮 Hobbies" },
    { value: "Users", label: "👥 Social" },
    { value: "Target", label: "🎯 Goals" },
    { value: "CookingPot", label: "🍳 Cooking" },
  ];

  const createForm = useForm<z.infer<typeof createCategorySchema>>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      color: "#000000",
    },
  });

  const updateForm = useForm<z.infer<typeof updateCategorySchema>>({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: {
      name: category?.name,
      description: category?.description,
      icon: category?.icon,
      color: category?.color,
    },
  });

  const deleteForm = useForm<z.infer<typeof deleteInfoSchema>>({
    resolver: zodResolver(deleteInfoSchema),
    defaultValues: {
      confirmDelete: "",
    },
  });

  const onCreateSubmit: SubmitHandler<z.infer<typeof createCategorySchema>> = async (values) => {
    try {
      setLoading(true);
      const response = await axiosConfig.post("/categories", values);
      toast.success(response.data.message);
      dialog(false);
      refresh();
      createForm.reset();
    } catch (error: any) {
      toast.error(error.response.data.error);
    } finally {
      setLoading(false);
    }
  };

  const onUpdateSubmit: SubmitHandler<z.infer<typeof updateCategorySchema>> = async (values) => {
    try {
      setLoading(true);
      const response = await axiosConfig.put(`/categories/${category?._id}`, values);
      toast.success(response.data.message);
      dialog(false);
      refresh();
      updateForm.reset();
    } catch (error: any) {
      toast.error(error.response.data.error);
    } finally {
      setLoading(false);
    }
  };

  const onDeleteSubmit: SubmitHandler<z.infer<typeof deleteInfoSchema>> = async (values) => {
    if (values.confirmDelete.toLowerCase() === "delete") {
      try {
        setLoading(true);
        const response = await axiosConfig.delete(`/categories/${category?._id}`);
        toast.success(response.data.message);
        dialog(false);
        refresh();
      } catch (error: any) {
        toast.error(error.response.data.error);
      } finally {
        setLoading(false);
      }
    } else {
      toast.error("Confirmation text is incorrect");
    }
  };

  if (action === "create") {
    return (
      <Form {...createForm}>
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-8">
          <div className="flex items-center justify-center gap-6">
            <FormField
              control={createForm.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Fitness and health" {...field} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={createForm.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Monitor your physical health and fitness progress" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={createForm.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Icon</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <ColorPicker {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading}>
            Save
          </Button>
        </form>
      </Form>
    );
  }

  if (action === "update") {
    return (
      <Form {...updateForm}>
        <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-8">
          <div className="flex items-center justify-center gap-6">
            <FormField
              control={updateForm.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Fitness and health" {...field} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={updateForm.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Monitor your physical health and fitness progress" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={updateForm.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Icon</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={updateForm.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <ColorPicker {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading}>
            Update
          </Button>
        </form>
      </Form>
    );
  }

  if (action === "delete") {
    return (
      <Form {...deleteForm}>
        <form onSubmit={deleteForm.handleSubmit(onDeleteSubmit)} className="space-y-8">
          <FormField
            control={deleteForm.control}
            name="confirmDelete"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type "DELETE" to confirm</FormLabel>
                <FormControl>
                  <Input placeholder="DELETE" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading}>
            Delete
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <>
      <p>Invalid action</p>
    </>
  );
};
