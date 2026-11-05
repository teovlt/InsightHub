import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getGoogleRegisterSchema, getRegisterSchema } from "@/lib/zod/schemas/auth/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { OAuth } from "./oauth";
import { AuthDivider, AuthLayout } from "./authLayout";

type RegisterValues = z.infer<ReturnType<typeof getRegisterSchema>>;
type FieldName = keyof RegisterValues;

type RegisterFormProps = {
  onSubmit: (values: Partial<RegisterValues>) => Promise<void>;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  defaultValues?: Partial<RegisterValues>;
  disabledFields?: FieldName[];
  loading?: boolean;
  oauth?: boolean;
  // A Google sign-up signs in with Google, so it never asks for a password
  withPassword?: boolean;
};

const AUTOCOMPLETE: Record<FieldName, string> = {
  forename: "given-name",
  name: "family-name",
  username: "username",
  email: "email",
  password: "new-password",
  confirmPassword: "new-password",
};

export const RegisterForm = ({
  onSubmit,
  title,
  subtitle,
  footer,
  defaultValues = {},
  disabledFields = [],
  loading = false,
  oauth = false,
  withPassword = true,
}: RegisterFormProps) => {
  const { t } = useTranslation();

  const registerSchema = withPassword ? getRegisterSchema(t) : getGoogleRegisterSchema(t);

  const form = useForm<RegisterValues>({
    // The Google schema is the same minus the password fields
    resolver: zodResolver(registerSchema as ReturnType<typeof getRegisterSchema>),
    defaultValues: {
      name: "",
      forename: "",
      username: "",
      email: "",
      ...(withPassword ? { password: "", confirmPassword: "" } : {}),
      ...defaultValues,
    },
  });

  const renderField = (fieldName: FieldName, description?: string) => (
    <FormField
      key={fieldName}
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>{t(`pages.register.${fieldName}`)}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type={fieldName.toLowerCase().includes("password") ? "password" : fieldName === "email" ? "email" : "text"}
              autoComplete={AUTOCOMPLETE[fieldName]}
              autoCapitalize={fieldName === "username" || fieldName === "email" ? "none" : undefined}
              disabled={disabledFields.includes(fieldName)}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <AuthLayout title={title} subtitle={subtitle} footer={footer} wide>
      <div className="space-y-6">
        {import.meta.env.VITE_FIREBASE_API_KEY && oauth && (
          <>
            <OAuth message="pages.register.register" />
            <AuthDivider label={t("pages.login.or_with_email")} />
          </>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {renderField("forename")}
              {renderField("name")}
            </div>
            {renderField("username", t("pages.register.username_description"))}
            {renderField("email", disabledFields.includes("email") ? t("pages.register.email_from_google") : undefined)}

            {withPassword && (
              <div className="grid gap-4 sm:grid-cols-2">
                {renderField("password")}
                {renderField("confirmPassword")}
                <p className="text-[0.8rem] text-muted-foreground sm:col-span-2">{t("pages.register.password_description")}</p>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {t("pages.register.register")}
            </Button>
          </form>
        </Form>
      </div>
    </AuthLayout>
  );
};
