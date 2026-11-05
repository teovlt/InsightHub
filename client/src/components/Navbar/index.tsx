import { Link, NavLink, useNavigate } from "react-router-dom";
import { ThemeChanger } from "./themeChanger";
import { LanguageChanger } from "./languageChanger";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  Link2,
  LogIn,
  LogOut,
  Menu,
  Trophy,
  User,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/authContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useLogout } from "@/hooks/useLogout";
import { AvatarWithStatusCell } from "@/components/customs/avatarStatusCell";
import { Logo } from "@/components/customs/logo";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Desktop links: the active one gets a lime bar rising from the bottom edge of the bar,
// the same bar as in the logo. Hovering shows a faint version of it.
const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "relative inline-flex h-full items-center px-3 font-display text-[15px] font-medium tracking-tight transition-colors",
    "after:absolute after:inset-x-3 after:bottom-0 after:rounded-t-[3px] after:transition-all after:duration-300",
    isActive ? "text-white after:h-1 after:bg-lime" : "text-white/60 hover:text-white after:h-0 after:bg-white/25 hover:after:h-0.5",
  );

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  const navigate = useNavigate();
  const { t } = useTranslation();
  const { logout, loading } = useLogout();

  const { authUser } = useAuthContext();

  const items: NavItem[] = [
    { to: "/", label: t("navbar.home"), icon: LayoutDashboard },
    { to: "/statistics", label: t("navbar.statistics"), icon: BarChart3 },
    { to: "/integrations", label: t("navbar.integrations"), icon: Link2 },
    { to: "/achievements", label: t("navbar.achievements"), icon: Trophy },
    { to: "/account", label: t("navbar.profile"), icon: User },
  ];
  const isAdmin = authUser?.role === "admin";

  // Close the mobile menu on navigation, and lock the page scroll while it is open.
  useEffect(() => setIsOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-ink text-white shadow-[0_1px_0_rgb(255_255_255/0.06)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime">
            <Logo className="text-xl text-white" />
          </Link>

          {/* Desktop navigation */}
          {authUser && (
            <nav className="hidden h-full items-stretch lg:flex">
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === "/"} className={desktopLinkClass}>
                  {item.label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink to="/admin" className={desktopLinkClass}>
                  <span className="rounded-md border border-white/20 px-1.5 py-0.5 text-xs uppercase tracking-wider">
                    {t("navbar.admin")}
                  </span>
                </NavLink>
              )}
            </nav>
          )}

          <div className="ml-auto hidden items-center gap-1 lg:flex">
            <LanguageChanger />
            <ThemeChanger />
            {authUser ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="ml-2 flex cursor-pointer items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-lime">
                    <AvatarWithStatusCell user={authUser} size="sm" ringClassName="border-ink" />
                    <span className="max-w-28 truncate text-sm font-medium">{authUser.forename}</span>
                    <ChevronDown className="size-3.5 text-white/50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="font-display font-semibold">
                      {authUser.forename} {authUser.name}
                    </p>
                    <p className="text-xs text-muted-foreground">@{authUser.username}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/account")}>
                      {t("navbar.profile")}
                      <DropdownMenuShortcut>
                        <User className="w-4 h-4" />
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/admin")}>
                        {t("navbar.admin")}
                        <DropdownMenuShortcut>
                          <Wrench className="w-4 h-4" />
                        </DropdownMenuShortcut>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => logout()} disabled={loading}>
                    {t("navbar.logout")}
                    <DropdownMenuShortcut>
                      <LogOut className="w-4 h-4" />
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="ml-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] bg-lime px-4 font-display text-sm font-semibold text-ink transition hover:brightness-105"
              >
                {t("navbar.login")}
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="ml-auto inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setIsOpen(true)}
            aria-label="Menu"
            aria-expanded={isOpen}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {/* Mobile menu: full-screen ink panel */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-ink text-white transition-[opacity,transform] duration-300 ease-out lg:hidden",
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0",
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
          <Logo className="text-xl text-white" />
          <button
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pt-6 sm:px-6">
          {authUser ? (
            [...items, ...(isAdmin ? [{ to: "/admin", label: t("navbar.admin"), icon: Wrench }] : [])].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-4 rounded-2xl py-3 pl-4 pr-3 font-display text-2xl font-semibold tracking-tight transition-colors",
                    isActive ? "bg-white/[0.06] text-white" : "text-white/55 hover:text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn("h-7 w-1 rounded-full transition-colors", isActive ? "bg-lime" : "bg-white/10 group-hover:bg-white/25")}
                    />
                    <span className="flex-1">{item.label}</span>
                    <item.icon className={cn("size-5", isActive ? "text-lime" : "text-white/30")} />
                  </>
                )}
              </NavLink>
            ))
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-lime font-display font-semibold text-ink"
            >
              <LogIn className="size-4" />
              {t("navbar.login")}
            </button>
          )}
        </nav>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:px-6">
          {authUser ? (
            <div className="flex min-w-0 items-center gap-3">
              <AvatarWithStatusCell user={authUser} ringClassName="border-ink" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {authUser.forename} {authUser.name}
                </p>
                <button
                  onClick={() => logout()}
                  disabled={loading}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-white/55 transition hover:text-white"
                >
                  <LogOut className="size-3" />
                  {t("navbar.logout")}
                </button>
              </div>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            <LanguageChanger align="end" side="top" />
            <ThemeChanger />
          </div>
        </div>
      </div>
    </>
  );
};
