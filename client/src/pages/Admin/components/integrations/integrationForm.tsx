import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { axiosConfig } from "@/config/axiosConfig";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { IntegrationInterface } from "@/interfaces/Integration";
import { createIntegrationSchema, deleteInfoSchema } from "@/lib/zod/schemas/admin/zod";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Github,
  Slack,
  Zap,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Mail,
  Phone,
  Calendar,
  Cloud,
  Code,
  Settings,
  User,
  Users,
  Lock,
  Star,
  Heart,
  ShoppingCart,
  CreditCard,
  MapPin,
  Video,
  Music,
  Bookmark,
  Footprints,
} from "lucide-react";
import ColorPicker from "@/components/customs/colorPicker";

const icons = [
  { name: "Github", Icon: Github },
  { name: "Slack", Icon: Slack },
  { name: "Zap", Icon: Zap },
  { name: "Twitter", Icon: Twitter },
  { name: "Facebook", Icon: Facebook },
  { name: "Linkedin", Icon: Linkedin },
  { name: "Instagram", Icon: Instagram },
  { name: "Youtube", Icon: Youtube },
  { name: "Mail", Icon: Mail },
  { name: "Phone", Icon: Phone },
  { name: "Calendar", Icon: Calendar },
  { name: "Cloud", Icon: Cloud },
  { name: "Code", Icon: Code },
  { name: "Settings", Icon: Settings },
  { name: "User", Icon: User },
  { name: "Users", Icon: Users },
  { name: "Lock", Icon: Lock },
  { name: "Star", Icon: Star },
  { name: "Heart", Icon: Heart },
  { name: "ShoppingCart", Icon: ShoppingCart },
  { name: "CreditCard", Icon: CreditCard },
  { name: "MapPin", Icon: MapPin },
  { name: "Video", Icon: Video },
  { name: "Music", Icon: Music },
  { name: "Bookmark", Icon: Bookmark },
  { name: "Footprints", Icon: Footprints },
];

interface IntegrationFormProps {
  dialog: (isOpen: boolean) => void;
  refresh: () => void;
  action: string;
  integration?: IntegrationInterface;
}

export const IntegrationForm = ({ dialog, refresh, action, integration }: IntegrationFormProps) => {
  const [loading, setLoading] = useState(false);

  const createForm = useForm<z.infer<typeof createIntegrationSchema>>({
    resolver: zodResolver(createIntegrationSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      color: "",
      category: "",
      status: "available",
      availableStats: [],
      config: {
        authUrl: "",
        docsUrl: "",
      },
    },
  });

  // const updateForm = useForm<z.infer<typeof updatePlayerSchema>>({
  //   resolver: zodResolver(updatePlayerSchema),
  //   defaultValues: {
  //     name: user?.name,
  //     forename: user?.forename,
  //     username: user?.username,
  //     email: user?.email,
  //     role: user?.role,
  //     password: user?.password ?? "",
  //   },
  // });

  const deleteForm = useForm<z.infer<typeof deleteInfoSchema>>({
    resolver: zodResolver(deleteInfoSchema),
    defaultValues: {
      confirmDelete: "",
    },
  });

  const onCreateSubmit: SubmitHandler<z.infer<typeof createIntegrationSchema>> = async (values) => {
    try {
      setLoading(true);
      const response = await axiosConfig.post("/integrations", values);
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

  // const onUpdateSubmit: SubmitHandler<z.infer<typeof updatePlayerSchema>> = async (values) => {
  //   try {
  //     setLoading(true);
  //     const response = await axiosConfig.put(`/users/${user?._id}`, values);
  //     toast.success(response.data.message);
  //     dialog(false);
  //     refresh();
  //     updateForm.reset();
  //   } catch (error: any) {
  //     toast.error(error.response.data.error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const onDeleteSubmit: SubmitHandler<z.infer<typeof deleteInfoSchema>> = async (values) => {
    if (values.confirmDelete.toLowerCase() === "delete") {
      try {
        setLoading(true);
        const response = await axiosConfig.delete(`/integrations/${integration?._id}`);
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
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
          {/* --- GENERAL INFO --- */}
          <Separator className="by-6" />
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">1 - General Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={createForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Github, Google..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createForm.control}
              name="icon"
              render={({ field }) => {
                const selectedIcon = icons.find((i) => i.name === field.value);

                return (
                  <FormItem>
                    <FormLabel>Choose an Icon</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <SelectTrigger className="w-full flex items-center justify-between">
                          {selectedIcon ? (
                            <div className="flex items-center gap-2">
                              <selectedIcon.Icon className="w-4 h-4 text-gray-600" />
                              <span className="text-sm text-gray-800">{selectedIcon.name}</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Select an icon" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {icons.map(({ name, Icon }) => (
                            <SelectItem key={name} value={name} className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-gray-600" />
                                <span className="text-sm">{name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={createForm.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <ColorPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createForm.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="DevOps | Marketing | Social ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createForm.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="deprecated">Deprecated</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={createForm.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      placeholder="Describe what this integration does..."
                      className="w-full border rounded-md p-2"
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Separator general / config */}
          <Separator className="my-6" />
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">2 - Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={createForm.control}
              name="config.authUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auth URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://auth.url" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={createForm.control}
              name="config.docsUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Docs URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://docs.url" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Separator config / availableStats */}
          <Separator className="my-6" />
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">3 - Available stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <span className="text-destructive"> Not available for the moment</span>
          </div>

          <Button type="submit" disabled={loading}>
            Save Integration
          </Button>
        </form>
      </Form>
    );
  }

  // if (action === "update") {
  //   return (
  //     <Form {...updateForm}>
  //       <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-8">
  //         <FormField
  //           control={updateForm.control}
  //           name="name"
  //           render={({ field }) => (
  //             <FormItem className="flex-1">
  //               <FormLabel>Name</FormLabel>
  //               <FormControl>
  //                 <Input placeholder="Google | Github ..." {...field} className="w-full" />
  //               </FormControl>
  //               <FormMessage />
  //             </FormItem>
  //           )}
  //         />
  //         <Button type="submit" disabled={loading}>
  //           Update
  //         </Button>
  //       </form>
  //     </Form>
  //   );
  // }

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
