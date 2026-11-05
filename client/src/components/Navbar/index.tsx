import { Link, NavLink, useNavigate } from "react-router-dom";
import { ThemeChanger } from "./themeChanger";
import { LanguageChanger } from "./languageChanger";
import { useTranslation } from "react-i18next";
import { Separator } from "../ui/separator";
import { BarChart3, LayoutDashboard, Link2, LogIn, LogOut, Menu, Trophy, User, Wrench, X, type LucideIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
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

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
  );

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

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
    ...(authUser?.role === "admin" ? [{ to: "/admin", label: t("navbar.admin"), icon: Wrench }] : []),
  ];

  useEffect(() => {
    const handleClickOutside = (event: { target: any }) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function closeDialogAndNavigate(link: string) {
    setIsOpen(false);
    navigate(link);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="shrink-0">
            <Logo className="text-xl" />
          </Link>

          {/* Desktop navigation */}
          {authUser && (
            <nav className="hidden items-center gap-1 md:flex">
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-1">
              <LanguageChanger />
              <ThemeChanger />
            </div>
            {authUser ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer rounded-full ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-accent/40">
                    <AvatarWithStatusCell user={authUser} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="font-normal">
                    <p className="font-semibold">
                      {authUser.forename} {authUser.name}
                    </p>
                    <p className="text-xs text-muted-foreground">@{authUser.username}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {items.map((item) => (
                      <DropdownMenuItem key={item.to} className="cursor-pointer" onClick={() => navigate(item.to)}>
                        {item.label}
                        <DropdownMenuShortcut>
                          <item.icon className="w-4 h-4" />
                        </DropdownMenuShortcut>
                      </DropdownMenuItem>
                    ))}
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
              <Button onClick={() => navigate("/login")}>{t("navbar.login")}</Button>
            )}
          </div>

          {/* Mobile menu button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(!isOpen)} aria-label="Menu">
            <Menu className="!size-5" />
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm transition-opacity md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={menuRef}
        className={cn(
          "fixed top-0 right-0 z-50 flex h-dvh w-4/5 max-w-sm flex-col border-l bg-card shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Logo className="text-lg" />
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Close">
            <X className="!size-5" />
          </Button>
        </div>
        <Separator />
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {authUser ? (
            items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setIsOpen(false)}
                className={(state) => cn(navLinkClass(state), "rounded-xl py-3")}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))
          ) : (
            <Button onClick={() => closeDialogAndNavigate("/login")} className="justify-start">
              <LogIn className="w-4 h-4" />
              {t("navbar.login")}
            </Button>
          )}
        </nav>
        <Separator />
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-1">
            <LanguageChanger align="start" />
            <ThemeChanger />
          </div>
          {authUser && (
            <Button variant="ghost" onClick={() => logout()} disabled={loading}>
              <LogOut className="w-4 h-4" />
              {t("navbar.logout")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
