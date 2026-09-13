import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useApp } from "../context/AppState";
import { TopAccess } from "./TopAccess";
import { LanguageSwitch } from "./LanguageSwitch";
import { AccountMenu } from "./AccountMenu";
import { NotificationBell } from "./NotificationBell";
import { SamruddhiSetuLogo } from "./SamruddhiSetuLogo";
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
    user?.role === "logistics" ? "/logistics" : "/logistics/portal";

  const links = [
    { to: "/", label: t("home") },
    { to: "/#about", label: t("about") },
    { to: "/shop", label: t("shop") },
    { to: "/#family", label: t("services") },
    { to: farmerTo, label: t("farmer") },
    { to: logisticsTo, label: t("logistics") },
    { to: "/map", label: t("map") },
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
        <div className="mx-auto flex h-auto min-h-16 max-w-7xl items-center justify-between gap-6 px-5 py-2">
          {/* Top Left: Logo with Language Switcher & Location underneath */}
          <div className="flex shrink-0 flex-col items-start gap-1.5 py-1">
            <Link to="/" className="flex shrink-0 items-center">
              <SamruddhiSetuLogo light={overVideo} />
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitch light={overVideo} />
              <TopAccess light={overVideo} />
            </div>
          </div>

          <nav
            className={`hidden min-w-0 flex-1 items-center justify-end gap-6 text-[15px] font-semibold xl:flex ${
              overVideo ? "text-white/90" : "text-[#1c2b22]/85"
            }`}
          >
            {links.map((link) => {
              const hashLink = link.to.startsWith("/#");
              if (hashLink && onHome) {
                return (
                  <a
                    key={link.label}
                    href={link.to.slice(1)}
                    className="transition hover:text-[#2f7a4a]"
                  >
                    {link.label}
                  </a>
                );
              }
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`transition hover:text-[#2f7a4a] ${
                    !hashLink &&
                    !link.to.includes("login") &&
                    location.pathname === link.to.split("?")[0]
                      ? "text-[#2f7a4a] font-bold"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-3.5 md:flex">
            {user?.role === "admin" ? (
              <Link
                to="/admin"
                className={`rounded-full px-4 py-2 text-sm font-bold shadow-sm transition ${
                  overVideo
                    ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur"
                    : "bg-[#2f7a4a] text-white hover:bg-[#25633c]"
                }`}
              >
                {t("admin")}
              </Link>
            ) : (
              <Link
                to="/login?next=/admin"
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-sm transition border ${
                  overVideo
                    ? "bg-black/30 border-white/30 text-white hover:bg-black/50"
                    : "bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100 hover:text-black"
                }`}
              >
                Admin Portal
              </Link>
            )}

            {user && <NotificationBell light={overVideo} />}
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
            {user?.role === "admin" ? (
  <Link
    to="/admin"
    onClick={() => setOpen(false)}
    className="block rounded-xl bg-[#e8f0e3] px-4 py-3 text-sm font-semibold text-[#2f7a4a]"
  >
    Admin Dashboard
  </Link>
) : (
  <Link
    to="/login?next=/admin"
    onClick={() => setOpen(false)}
    className="block rounded-xl bg-[#f2f5ef] px-4 py-3 text-sm font-semibold text-[#2f7a4a]"
  >
    Admin Portal
  </Link>
)}
            <div className="flex items-center justify-between pt-2">
              <AccountMenu />
              {user && <NotificationBell />}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
