import { Button } from "../ui/button";
import { axiosConfig } from "@/config/axiosConfig";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/authContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";

type FirebaseModule = typeof import("@/lib/firebase");

interface OauthProps {
  message: string;
}

export function OAuth({ message }: OauthProps) {
  const navigate = useNavigate();
  const { setAuthUser } = useAuthContext();
  const { t } = useTranslation();
  const firebaseRef = useRef<FirebaseModule | null>(null);

  // Firebase is only needed for Google sign-in, so it is loaded here rather than in the main bundle.
  // Prefetching on mount lets the click open the popup right away, which popup blockers require.
  useEffect(() => {
    import("@/lib/firebase").then((m) => (firebaseRef.current = m)).catch(() => {});
  }, []);

  const handleGoogleAuth = async () => {
    try {
      const { signInWithGoogle } = firebaseRef.current ?? (await import("@/lib/firebase"));
      const googleRes = await signInWithGoogle();

      const idToken = await googleRes.user.getIdToken();
      const userData = {
        name: googleRes.user.displayName,
        email: googleRes.user.email,
        photoURL: googleRes.user.photoURL,
        idToken,
      };

      try {
        // Only the ID token is trusted by the server, which reads the email from it
        const res = await axiosConfig.post("/auth/login/google", { idToken });
        toast.success(t(res.data.message));
        setAuthUser(res.data.user);
        navigate("/");
      } catch (err: any) {
        const errorMessage = err?.response?.data?.error;
        if (errorMessage === "User not found, lets register !") {
          navigate("/register/google", { state: userData });
        } else {
          toast.error(t(errorMessage || "auth.error"));
        }
      }
    } catch (error: any) {
      toast.error(t("auth.error"));
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleGoogleAuth}
      className="w-full gap-3 text-sm font-semibold [&_svg]:size-5"
    >
      <svg aria-hidden="true" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.3H272v95.1h146.9c-6.4 34-25.2 62.8-53.6 82v68.1h86.8c50.8-46.8 81.4-115.7 81.4-194.9z"
          fill="#4285F4"
        />
        <path
          d="M272 544.3c72.6 0 133.5-24 178-65.4l-86.8-68.1c-24.1 16.1-54.8 25.6-91.2 25.6-70 0-129.2-47.2-150.4-110.5H30.2v69.6c44.3 87.5 135.5 149.8 241.8 149.8z"
          fill="#34A853"
        />
        <path d="M121.6 325.9c-10-29.7-10-61.6 0-91.3V165H30.2c-39.6 78.9-39.6 172.5 0 251.4l91.4-70.5z" fill="#FBBC05" />
        <path
          d="M272 107.7c39.4-.6 77 13.6 106.1 39.5l79.2-79.2C412.2 24.1 343.7-.2 272 0 165.7 0 74.5 62.3 30.2 149.8l91.4 70.5c21.1-63.2 80.4-110.4 150.4-112.6z"
          fill="#EA4335"
        />
      </svg>
      <span>{t(message + "_google")}</span>
    </Button>
  );
}
