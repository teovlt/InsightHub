import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/authContext";
import { useTranslation } from "react-i18next";
import { axiosConfig } from "@/config/axiosConfig";
import { toast } from "sonner";
import { RegisterForm } from "@/components/customs/registerForm";

export const RegisterGoogleForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthUser } = useAuthContext();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const userData = location.state;

  useEffect(() => {
    if (!userData) {
      navigate("/login", { replace: true });
    }
  }, [userData, navigate]);

  if (!userData) return null;

  const { name, email, idToken } = userData;
  const displayName: string = name ?? "";

  const defaultValues = {
    name: displayName.split(" ").slice(1).join(" ") || "",
    forename: displayName.split(" ")[0] || "",
    username: displayName.replace(/\s+/g, "").toLowerCase(),
    email: email,
  };

  async function register(values: object) {
    try {
      setLoading(true);
      // No password: the server verifies the Google ID token and only accepts it for the email it was issued for
      const response = await axiosConfig.post("/auth/register", { ...values, email, idToken });
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
    <RegisterForm
      onSubmit={register}
      title={t("pages.register.google_title")}
      subtitle={t("pages.register.google_subtitle")}
      defaultValues={defaultValues}
      disabledFields={["email"]}
      loading={loading}
      withPassword={false}
      footer={
        <Link to="/login" className="font-semibold text-brand-strong underline-offset-4 hover:underline dark:text-accent">
          {t("pages.register.back_to_login")}
        </Link>
      }
    />
  );
};
