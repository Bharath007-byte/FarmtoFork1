import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, Sprout, X } from "lucide-react";
import { useApp } from "../context/AppState";
import { TopAccess } from "./TopAccess";
import { LanguageSwitch } from "./LanguageSwitch";
import { AccountMenu } from "./AccountMenu";
import { useI18n } from "../i18n";

export function SiteNav({
  transparent = false,
}: {
  transparent?: boolean;
}) {
  const { user } = useApp();
  const { t } = useI18n();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overVideo = transparent && !scrolled && !open;
  const onHome = location.pathname === "/";
  const farmerTo =
    user?.role === "farmer" ? "/farmer/dashboard" : "/login?next=/farmer/dashboard";
  const logisticsTo =
    user?.role === "logistics" ? "/logistics" : "/login?next=/logistics";

  const links = [
    { to: "/", label: "Home" },
    { to: "/#about", label: "About" },
    { to: "/shop", label: "Shop" },
    { to: "/#family", label: "Services" },
    { to: farmerTo, label: "Farmer" },
    { to: logisticsTo, label: "Logistics" },
    { to: "/map", label: "Map" },
  ];

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition ${
          overVideo
            ? "bg-transparent"
            : "border-b border-zinc-100 bg-white/95 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-auto min-h-16 max-w-6xl items-center justify-between gap-6 px-5 py-2">
          <div className="flex min-w-0 flex-col items-start gap-1">
            <Link
              to="/"
              className={`flex shrink-0 items-center gap-2 ${overVideo ? "text-white" : "text-[#1c2b22]"}`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2f7a4a] text-white">
                <Sprout className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight">farm2fork</span>
            </Link>
            <TopAccess light={overVideo} />
          </div>

          <nav
            className={`hidden min-w-0 flex-1 items-center justify-end gap-5 text-sm font-medium xl:flex ${
              overVideo ? "text-white/90" : "text-[#1c2b22]/75"
            }`}
          >
            {links.map((link) => {
              const hashLink = link.to.startsWith("/#");
              if (hashLink && onHome) {
                return (
                  <a key={link.label} href={link.to.slice(1)} className="hover:text-[#2f7a4a]">
                    {link.label}
                  </a>
                );
              }
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`hover:text-[#2f7a4a] ${
                    !hashLink &&
                    !link.to.includes("login") &&
                    location.pathname === link.to.split("?")[0]
                      ? "text-[#2f7a4a]"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <LanguageSwitch light={overVideo} />
            {user?.role === "admin" && (
              <Link
                to="/admin"
                className={`text-sm font-semibold ${overVideo ? "text-white" : "text-[#2f7a4a]"}`}
              >
                {t("admin")}
              </Link>
            )}
            <AccountMenu light={overVideo} />
          </div>

          <button
            className={`rounded-lg p-2 xl:hidden ${overVideo ? "text-white" : "text-[#1c2b22]"}`}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <div className="space-y-3 border-t border-zinc-100 bg-white px-5 py-4 xl:hidden">
            {links.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setOpen(false)}
                className="block text-sm text-[#1c2b22]"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <AccountMenu />
            </div>
          </div>
        )}
      </header>
    </>
  );
}
