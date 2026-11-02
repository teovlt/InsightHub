import { useTranslation } from "react-i18next";
import { LogoMark } from "@/components/customs/logo";

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="mt-16 border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="w-5 h-5" />
          <span>© {new Date().getFullYear()} InsightHub</span>
        </div>
        <p>{t("footer.tagline")}</p>
      </div>
    </footer>
  );
};
