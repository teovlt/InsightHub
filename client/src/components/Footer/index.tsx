import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { Logo } from "@/components/customs/logo";
import { useAuthContext } from "@/contexts/authContext";

// A year of progress, drawn as the logo's rising bars: it wobbles, dips, and keeps climbing.
// The last bar is lime with a dot on top, like the "i" in the logo.
const BAR_HEIGHTS = [22, 30, 26, 38, 34, 30, 44, 52, 46, 40, 56, 64, 58, 70, 66, 78, 74, 86];

const ProgressSkyline = () => (
  <div aria-hidden="true" className="flex h-28 items-end gap-1.5 sm:gap-2">
    {BAR_HEIGHTS.map((h, i) => {
      const isLast = i === BAR_HEIGHTS.length - 1;
      // Older bars fade back so the eye travels to the most recent one.
      const opacity = 0.18 + (i / (BAR_HEIGHTS.length - 1)) * 0.62;
      return (
        <div key={i} className="relative flex-1" style={{ height: `${h}%` }}>
          {isLast && <span className="absolute -top-4 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-lime sm:size-3" />}
          <div
            className={isLast ? "h-full rounded-t-[4px] bg-lime" : "h-full rounded-t-[4px] bg-accent"}
            style={isLast ? undefined : { opacity }}
          />
        </div>
      );
    })}
  </div>
);

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link to={to} className="text-sm text-white/60 transition hover:text-white">
      {children}
    </Link>
  </li>
);

export const Footer = () => {
  const { t } = useTranslation();
  const { authUser } = useAuthContext();

  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Headline + skyline, standing on the baseline */}
        <div className="grid gap-10 pt-14 md:grid-cols-[1.1fr_1fr] md:items-end md:gap-16">
          <p className="max-w-md pb-2 font-display text-3xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-4xl">
            <Trans
              i18nKey="footer.headline"
              components={{
                // Lime bar under the words, like a progress bar
                hl: (
                  <span className="bg-[linear-gradient(var(--lime),var(--lime))] bg-[length:100%_0.12em] bg-bottom bg-no-repeat pb-0.5" />
                ),
              }}
            />
          </p>
          <ProgressSkyline />
        </div>
        <div className="h-px bg-white/15" />

        {/* Links */}
        <div className="flex flex-col gap-10 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs space-y-3">
            <Logo className="text-lg text-white" markClassName="size-7" />
            <p className="text-sm text-white/50">{t("footer.signoff")}</p>
          </div>

          {authUser && (
            <div className="grid grid-cols-2 gap-x-16 gap-y-8">
              <div>
                <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.14em] text-lime">{t("footer.app")}</p>
                <ul className="space-y-2">
                  <FooterLink to="/">{t("navbar.home")}</FooterLink>
                  <FooterLink to="/statistics">{t("navbar.statistics")}</FooterLink>
                  <FooterLink to="/integrations">{t("navbar.integrations")}</FooterLink>
                </ul>
              </div>
              <div>
                <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.14em] text-lime">{t("footer.account")}</p>
                <ul className="space-y-2">
                  <FooterLink to="/achievements">{t("navbar.achievements")}</FooterLink>
                  <FooterLink to="/account">{t("navbar.profile")}</FooterLink>
                  {authUser.role === "admin" && <FooterLink to="/admin">{t("navbar.admin")}</FooterLink>}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-white/10 py-5 text-xs text-white/40">
          <span>© {new Date().getFullYear()} InsightHub</span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex cursor-pointer items-center gap-1.5 transition hover:text-white"
          >
            {t("footer.backToTop")}
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
