import { Button } from "../ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../providers/theme-provider";

export const ThemeChanger = () => {
  const { setTheme, theme } = useTheme();
  return (
    <Button variant="outline" className="text-primary" size="sm" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
};
