import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getLoginSchema } from "@/lib/zod/schemas/auth/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuthContext } from "@/contexts/authContext";
import { axiosConfig } from "@/config/axiosConfig";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OAuth } from "@/components/customs/oauth";
import { AuthDivider, AuthLayout } from "@/components/customs/authLayout";
import { Loader2 } from "lucide-react";

export const Login = () => {
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setAuthUser } = useAuthContext();

  const loginSchema = getLoginSchema(t);
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginName: "",
      password: "",
    },
  });

  async function login(values: z.infer<typeof loginSchema>) {
    try {
      setLoading(true);

      const isEmail = /\S+@\S+\.\S+/.test(values.loginName);
      const payload = {
        password: values.password,
        ...(isEmail ? { email: values.loginName } : { username: values.loginName }),
      };
      const response = await axiosConfig.post("/auth/login", payload);

      toast.success(t(response.data.message));
      setAuthUser(response.data.user);
      navigate("/");
    } catch (error: any) {
      toast.error(t(error.response?.data?.error ?? "server.global.errors.internal"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={t("pages.login.welcome_back")}
      subtitle={t("pages.login.subtitle")}
      footer={
        <>
          {t("pages.login.no_account")}{" "}
          <Link to="/register" className="font-semibold text-brand-strong underline-offset-4 hover:underline dark:text-accent">
            {t("pages.login.sign_up")}
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        {import.meta.env.VITE_FIREBASE_API_KEY && (
          <>
            <OAuth message="pages.login.login_button" />
            <AuthDivider label={t("pages.login.or_with_email")} />
          </>
        )}

        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(login)} className="space-y-4">
            <FormField
              control={loginForm.control}
              name="loginName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("pages.login.field")}</FormLabel>
                  <FormControl>
                    <Input autoComplete="username" autoCapitalize="none" placeholder={t("pages.login.field_placeholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("pages.login.password")}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {t("pages.login.login_button")}
            </Button>
          </form>
        </Form>
      </div>
    </AuthLayout>
  );
};
