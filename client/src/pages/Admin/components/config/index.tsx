import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { axiosConfig } from "@/config/axiosConfig";
import { toast } from "sonner";
import { useConfigContext } from "@/contexts/configContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ColorInput } from "@/components/customs/colorInput";

const configurationFormSchema = z.object({
  APP_NAME: z.string().trim(),
  ACCENT_COLOR: z.string().trim(),
});

type ConfigurationFormValues = z.infer<typeof configurationFormSchema>;

export const Config = () => {
  const { configValues, getConfigValue, updateConfigValues } = useConfigContext();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const form = useForm<ConfigurationFormValues>({
    resolver: zodResolver(configurationFormSchema),
    defaultValues: configValues,
    mode: "onChange",
  });

  useEffect(() => {
    const fetchConfigValues = async () => {
      const values = await getConfigValue(["APP_NAME", "ACCENT_COLOR"]);
      form.reset(values);
      setIsLoading(false);
    };

    fetchConfigValues();
  }, [getConfigValue, form]);

  const onSubmit = async (values: ConfigurationFormValues) => {
    const keys = Object.keys(values);
    const config = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));

    try {
      const response = await axiosConfig.put("/config", { keys, config });
      updateConfigValues(config);
      form.reset({ ...configValues, ...config });
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response.data.message);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="container px-4 mx-auto">
        <Card className="p-6 rounded-lg shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold">Configuration</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="APP_NAME"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'application</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'application" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ACCENT_COLOR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couleur d'accentutation</FormLabel>
                    <FormControl>
                      <ColorInput {...field} placeholder="Couleur d'accentuation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Enregistrer</Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};
