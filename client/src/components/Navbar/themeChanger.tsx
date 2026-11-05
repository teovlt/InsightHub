import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../providers/theme-provider";

// Sits on the ink navbar in both themes.
export const ThemeChanger = () => {
  const { setTheme, theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === "dark" || (theme === "system" && document.documentElement.classList.contains("dark"));

  return (
    <button
      className="relative inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-lime"
      aria-label={t("navbar.theme")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className="size-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
};
