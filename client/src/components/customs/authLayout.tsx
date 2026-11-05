import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flame, Plug, Share2, Target } from "lucide-react";
import { Logo } from "@/components/customs/logo";
import { ThemeChanger } from "@/components/Navbar/themeChanger";
import { LanguageChanger } from "@/components/Navbar/languageChanger";
import { cn } from "@/lib/utils";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  // The register form has two columns of fields, so its card is wider
  wide?: boolean;
};

// Bars of the sample progress chart in the brand panel, as a share of its height
const PREVIEW_BARS = [32, 44, 38, 56, 62, 74, 88];

/**
 * Shared frame of the login and register pages: a brand panel on large screens,
 * and the form in a centered card that is the whole page on phones.
 */
export const AuthLayout = ({ title, subtitle, children, footer, wide = false }: AuthLayoutProps) => {
  const { t } = useTranslation();

  const points = [
    { icon: Plug, label: t("pages.auth.points.integrations") },
    { icon: Target, label: t("pages.auth.points.goals") },
    { icon: Share2, label: t("pages.auth.points.share") },
  ];

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#1489e0] via-[#0f6fb8] to-[#0b3d6b] p-10 text-white lg:flex lg:flex-col xl:p-14">
        {/* Soft shapes so the panel is not a flat block of blue */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[#b8f34a]/15 blur-3xl" />

        <Link
          to="/"
          className="relative w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <Logo className="text-2xl text-white" markClassName="w-9 h-9 ring-1 ring-white/30 rounded-lg" />
        </Link>

        <div className="relative my-auto max-w-lg py-12">
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">{t("footer.tagline")}</h2>
          <p className="mt-4 text-lg text-white/80">{t("pages.auth.subtitle")}</p>

          <div className="mt-10 rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/70">{t("pages.auth.preview.label")}</p>
                <p className="font-display text-3xl font-bold">{t("pages.auth.preview.value")}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#b8f34a] px-3 py-1 text-sm font-semibold text-[#0f172a]">
                <Flame className="h-4 w-4" />
                {t("pages.auth.preview.streak")}
              </span>
            </div>
            <div aria-hidden className="mt-5 flex h-24 items-end gap-2">
              {PREVIEW_BARS.map((height, i) => (
                <div
                  key={i}
                  className={cn("flex-1 rounded-md", i === PREVIEW_BARS.length - 1 ? "bg-[#b8f34a]" : "bg-white/35")}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <ul className="mt-10 space-y-4">
            {points.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-white/90">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} InsightHub</p>
      </aside>

      <main className="flex min-w-0 flex-col px-4 py-4 sm:px-8">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="rounded-lg lg:invisible" aria-label="InsightHub">
            <Logo className="text-xl sm:hidden" markClassName="w-8 h-8" />
            <Logo className="hidden text-2xl sm:inline-flex" markClassName="w-9 h-9" />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageChanger />
            <ThemeChanger />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className={cn("w-full", wide ? "max-w-xl" : "max-w-md")}>
            <div className="rounded-2xl border border-border/70 bg-card p-6 text-card-foreground shadow-card sm:p-8">
              <div className="mb-6 space-y-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
              </div>
              {children}
            </div>
            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
};

/** "Or continue with" separator between the form and the Google button. */
export const AuthDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
    <span className="h-px flex-1 bg-border" />
    {label}
    <span className="h-px flex-1 bg-border" />
  </div>
);
