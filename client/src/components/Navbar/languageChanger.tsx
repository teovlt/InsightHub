import { useTranslation } from "react-i18next";
import { FR, GB } from "country-flag-icons/react/3x2";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Globe } from "lucide-react";
import { getFullNamesOfLocales, listOfLocales, saveLanguage } from "@/lib/i18n";
import { Button } from "../ui/button";
import { toast } from "sonner";

export const LanguageChanger = ({ align = "end" }: { align?: "start" | "center" | "end" }) => {
  const {
    i18n: { changeLanguage, language, t },
  } = useTranslation();

  const handleChangeLanguage = async (l: string) => {
    if (l === language) return;
    saveLanguage(l);
    await changeLanguage(l);
    toast.success(t("navbar.languageChanged"));
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer rounded-full text-muted-foreground hover:text-foreground"
          aria-label={t("navbar.language")}
        >
          <Globe className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-40">
        <DropdownMenuLabel>{t("navbar.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {listOfLocales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => handleChangeLanguage(l)}
            className={`cursor-pointer flex items-center ${language === l ? "bg-secondary" : ""}`}
          >
            {l === "fr" && <FR />}
            {l === "en" && <GB />}

            {getFullNamesOfLocales(l)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
