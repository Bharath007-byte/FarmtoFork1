import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  Bell,
  ChevronDown,
  Globe,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Sprout,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppState";
import { SamruddhiSetuLogo } from "../../components/SamruddhiSetuLogo";
import { FarmerVoiceAssistant } from "../../components/FarmerVoiceAssistant";
import { useI18n, SUPPORTED_LANGUAGES, type AppLang } from "../../i18n";

const navTranslations: Record<string, Record<AppLang, string>> = {
  Dashboard: { en: "Dashboard", te: "డాష్‌బోర్డ్", hi: "डैशबोर्ड", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್" },
  "My Produce": { en: "My Produce", te: "నా ఉత్పత్తులు", hi: "मेरी उपज", kn: "ನನ್ನ ಬೆಳೆಗಳು" },
  "Earnings & Payments": { en: "Earnings & Payments", te: "ఆదాయం & చెల్లింపులు", hi: "कमाई और भुगतान", kn: "ಆದಾಯ & ಪಾವತಿಗಳು" },
  "Insights & Advisory": { en: "Insights & Advisory", te: "సలహా & మార్గదర్శకాలు", hi: "सलाह और इनसाइट्स", kn: "ಸಲಹೆ & ಮಾರ್ಗದರ್ಶನ" },
  "Community & Support": { en: "Community & Support", te: "కమ్యూనిటీ & మద్దతు", hi: "समुदाय और सहायता", kn: "ಸಮುದಾಯ & ಬೆಂಬಲ" },
  Profile: { en: "Profile", te: "ప్రొఫైల్", hi: "प्रोफ़ाइल", kn: "ಪ್ರೊಫೈಲ್" },
  Logout: { en: "Log Out", te: "లాగౌట్", hi: "लॉग आउट", kn: "ಲಾಗೌಟ್" },
};

const navItems = [
  { to: "/farmer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/farmer/produce", label: "My Produce", icon: Sprout },
  { to: "/farmer/earnings", label: "Earnings & Payments", icon: Wallet },
  { to: "/farmer/advisory", label: "Insights & Advisory", icon: Lightbulb },
  { to: "/farmer/community", label: "Community & Support", icon: Users },
  { to: "/farmer/profile", label: "Profile", icon: User },
];

export function FarmerShell() {
  const { user, logout } = useApp();
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<{
    name: string;
    photoUrl?: string | null;
    farmer?: { farmName: string; state: string; location: string };
  } | null>(null);

  useEffect(() => {
    api<{ user: typeof profile }>("/api/farmers/me")
      .then((d) => setProfile(d.user))
      .catch(() => setProfile(null));
  }, []);

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const fd = new FormData();
      fd.append("photo", file);
      const token = localStorage.getItem("f2f-token") || localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/farmers/me/photo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      const data = await res.json();
      if (data.photoUrl) {
        setProfile((prev) => (prev ? { ...prev, photoUrl: data.photoUrl } : prev));
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      alert("Unable to upload photo. Please choose a JPG or PNG file under 5MB.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const photo = profile?.photoUrl
    ? `${import.meta.env.VITE_API_URL || ""}${profile.photoUrl}`
    : null;

  const displayName = profile?.name || user?.name || "Bhargav";
  const currentLangLabel = SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.label || "English";

  return (
    <div className="min-h-screen bg-[#f8faf8] md:flex">
      {/* 1. Left Sidebar Matching media_1789452175964.png */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between bg-[#0c1e17] transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <Link to="/farmer/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 p-1.5 shadow-xs">
                <SamruddhiSetuLogo size="sm" />
              </div>
              <div className="min-w-0">
                <span className="block text-base font-extrabold tracking-tight text-white leading-tight">
                  Samruddhi Setu
                </span>
                <span className="block text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                  DIRECT FARM NETWORK
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Role Pill Badge */}
          <div className="px-6 py-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-[#132c22] px-3.5 py-1.5 text-[11px] font-bold tracking-wider text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>FARMER ACCOUNT</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-4 space-y-1.5 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const localizedLabel = navTranslations[item.label]?.[lang] || item.label;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[#d1e7dd] text-[#0c1e17] font-extrabold shadow-sm"
                        : "text-[#a5b4ac] hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{localizedLabel}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Log Out */}
        <div className="p-4 border-t border-white/5">
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#a5b4ac] hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <LogOut className="h-5 w-5 text-[#a5b4ac]" />
            <span>{navTranslations.Logout?.[lang] || "Log Out"}</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8faf8]">
        {/* Top Header Bar Matching Screenshot */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-zinc-200/80 bg-white/95 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Sidebar Mobile Toggle */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Global Search Bar */}
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search forums, guides..."
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/70 py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* Right Header Controls: Language, Notification, User Chip */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Language Selector Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition shadow-2xs"
              >
                <Globe className="h-3.5 w-3.5 text-zinc-500" />
                <span>{currentLangLabel}</span>
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-zinc-200 bg-white py-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLang(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3.5 py-2 text-xs font-semibold transition ${
                        lang === l.code
                          ? "bg-emerald-50 text-emerald-800 font-bold"
                          : "text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <span>{l.label}</span>
                      <span className="text-[11px] text-zinc-400">{l.native}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <Link
              to="/farmer/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition shadow-2xs"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500" />
            </Link>

            {/* Farmer User Chip */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white pl-2 pr-3.5 py-1.5 shadow-2xs">
              <label
                title="Click to change photo"
                className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full overflow-hidden bg-sky-100 text-sky-700 font-bold text-xs"
              >
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={handlePhotoUpload}
                />
                {uploadingPhoto ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                ) : photo ? (
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{displayName.slice(0, 1).toUpperCase()}</span>
                )}
              </label>

              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-zinc-900 leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] font-black tracking-wider text-amber-600 uppercase">
                  FARMER
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Overlay */}
        {open && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
        )}

        {/* Page Content Outlet */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>

      {/* Floating Voice Assistant */}
      <FarmerVoiceAssistant embedded={false} />
    </div>
  );
}
