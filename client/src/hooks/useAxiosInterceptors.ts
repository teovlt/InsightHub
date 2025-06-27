import { axiosConfig } from "@/config/axiosConfig";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const useAxiosInterceptor = (isAuthLoading: boolean) => {
  const { t } = useTranslation();

  useEffect(() => {
    const interceptor = axiosConfig.interceptors.response.use(
      (response) => response,
      (error) => {
        const isNotAuth = error.response && error.response.status === 401 && error.response.data?.error === "Not Authenticated";
        const isNotOnAuthPage = !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register");

        if (isNotAuth && isNotOnAuthPage && !isAuthLoading) {
          toast(t("global.session_expired"));
          window.location.href = "/login";
        }

        return Promise.reject(error);
      },
    );

    return () => {
      axiosConfig.interceptors.response.eject(interceptor);
    };
  }, [t, isAuthLoading]);
};
