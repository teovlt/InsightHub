import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/authContext";
import { axiosConfig } from "@/config/axiosConfig";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RegisterForm } from "@/components/customs/registerForm";

export const Register = () => {
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setAuthUser } = useAuthContext();
  const { t } = useTranslation();

  async function register(values: object) {
    try {
      setLoading(true);
      const response = await axiosConfig.post("/auth/register", values);
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
      title={t("pages.register.title")}
      subtitle={t("pages.register.subtitle")}
      loading={loading}
      oauth
      footer={
        <>
          {t("pages.register.already_have_account")}{" "}
          <Link to="/login" className="font-semibold text-brand-strong underline-offset-4 hover:underline dark:text-accent">
            {t("pages.register.login")}
          </Link>
        </>
      }
    />
  );
};
