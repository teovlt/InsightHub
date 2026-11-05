import { useTranslation } from "react-i18next";
import { FR, GB } from "country-flag-icons/react/3x2";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { getFullNamesOfLocales, listOfLocales, saveLanguage } from "@/lib/i18n";
import { toast } from "sonner";

// Sits on the ink navbar: shows the current language code instead of a globe icon.
export const LanguageChanger = ({ align = "end", side = "bottom" }: { align?: "start" | "center" | "end"; side?: "top" | "bottom" }) => {
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
        <button
          className="inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-full px-2 font-display text-[13px] font-semibold uppercase tracking-wider text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-lime"
          aria-label={t("navbar.language")}
        >
          {language.slice(0, 2)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-44">
        <DropdownMenuLabel>{t("navbar.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {listOfLocales.map((l) => (
          <DropdownMenuItem key={l} onClick={() => handleChangeLanguage(l)} className="flex cursor-pointer items-center">
            {l === "fr" && <FR className="w-4 rounded-[2px]" />}
            {l === "en" && <GB className="w-4 rounded-[2px]" />}
            <span className="flex-1">{getFullNamesOfLocales(l)}</span>
            {language === l && <Check className="size-4 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
