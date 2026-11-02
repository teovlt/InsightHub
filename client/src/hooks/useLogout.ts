import { useState } from "react";
import { axiosConfig } from "../config/axiosConfig";
import { useAuthContext } from "../contexts/authContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const useLogout = () => {
  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuthUser } = useAuthContext();

  const logout = async () => {
    setLoading(true);
    try {
      const response = await axiosConfig.post("/auth/logout");
      setAuthUser(null);
      toast.success(t(response.data.message));
      navigate("/login");
    } catch (error: any) {
      toast.error(t(error.response?.data?.error ?? "server.global.errors.internal"));
    } finally {
      setLoading(false);
    }
  };
  return { loading, logout };
};
