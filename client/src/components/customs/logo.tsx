import { cn } from "@/lib/utils";

// Brand symbol (see BRAND.md): three rising bars, the last one lime with a dot forming the "i" of InsightHub.
// Keep in sync with public/favicon.svg.
export const LogoMark = ({ className }: { className?: string }) => {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={cn("w-8 h-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="#1489E0" />
      <rect x="6.5" y="17" width="4.5" height="9" rx="1.5" fill="#FFFFFF" />
      <rect x="13.75" y="13" width="4.5" height="13" rx="1.5" fill="#FFFFFF" />
      <rect x="21" y="12" width="4.5" height="14" rx="1.5" fill="#B8F34A" />
      <circle cx="23.25" cy="7.5" r="2.5" fill="#B8F34A" />
    </svg>
  );
};

// Splits "InsightHub" into a bold "Insight" and a regular "Hub"; any other name renders in bold.
export const Logo = ({ name, className, markClassName }: { name?: string; className?: string; markClassName?: string }) => {
  const appName = name && name !== "__NOT_FOUND__" ? name : "InsightHub";
  const split = appName.search(/[A-Z][^A-Z]*$/);
  const head = split > 0 ? appName.slice(0, split) : appName;
  const tail = split > 0 ? appName.slice(split) : "";

  return (
    <span className={cn("inline-flex items-center gap-2 font-display tracking-tight text-foreground", className)}>
      <LogoMark className={markClassName} />
      <span>
        <span className="font-bold">{head}</span>
        <span className="font-normal">{tail}</span>
      </span>
    </span>
  );
};
