import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  Bell,
  Boxes,
  Camera,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Sprout,
  Stethoscope,
  Truck,
  Wallet,
} from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppState";
import { SamruddhiSetuLogo } from "../../components/SamruddhiSetuLogo";
import { FarmerVoiceAssistant } from "../../components/FarmerVoiceAssistant";
import { useI18n, type AppLang } from "../../i18n";

const navTranslations: Record<string, Record<AppLang, string>> = {
  Home: { en: "Home", te: "హోమ్", hi: "होम", kn: "ಮುಖಪುಟ" },
  "Krishi Doctor": { en: "Krishi Doctor", te: "కృషి డాక్టర్", hi: "कृषि डॉक्टर", kn: "ಕೃಷಿ ವೈದ್ಯ" },
  "Sell Produce": { en: "Sell Produce", te: "పంట అమ్మకం", hi: "उपज बेचें", kn: "ಬೆಳೆ ಮಾರಾಟ" },
  "My products": { en: "My products", te: "నా ఉత్పత్తులు", hi: "मेरे उत्पाद", kn: "ನನ್ನ ಉತ್ಪನ್ನಗಳು" },
  Orders: { en: "Orders", te: "ఆర్డర్లు", hi: "ऑर्डर", kn: "ಆರ್ಡರ್‌ಗಳು" },
  Earnings: { en: "Earnings", te: "ఆదాయం", hi: "कमाई", kn: "ಆದಾಯ" },
  Pickup: { en: "Pickup", te: "రవాణా / పికప్", hi: "पिकअप", kn: "ಪಿಕಪ್" },
  Alerts: { en: "Alerts", te: "హెచ్చరికలు", hi: "सूचनाएं", kn: "ಎಚ್ಚರಿಕೆಗಳು" },
  Doctor: { en: "Doctor", te: "డాక్టర్", hi: "डॉक्टर", kn: "ವೈದ್ಯ" },
  Logout: { en: "Logout", te: "లాగౌట్", hi: "लॉग आउट", kn: "ಲಾಗೌಟ್" },
};

const links = [
  { to: "/farmer/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/farmer/krishi-ai", label: "Krishi Doctor", icon: Stethoscope, badge: "Doctor", highlight: true },
  { to: "/farmer/sell", label: "Sell Produce", icon: Camera },
  { to: "/farmer/produce", label: "My products", icon: Boxes },
  { to: "/farmer/orders", label: "Orders", icon: Boxes },
  { to: "/farmer/earnings", label: "Earnings", icon: Wallet },
  { to: "/farmer/logistics", label: "Pickup", icon: Truck },
  { to: "/farmer/notifications", label: "Alerts", icon: Bell },
];

export function FarmerShell() {
  const { user, logout } = useApp();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const fd = new FormData();
      fd.append("photo", file);
      const token = localStorage.getItem("token");
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

  return (
    <div className="min-h-screen bg-white text-[#1c2b22] md:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 transform border-r border-zinc-100 bg-white transition md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-zinc-100 px-4 py-4">
          <Link to="/">
            <SamruddhiSetuLogo size="sm" />
          </Link>
        </div>

        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-4">
          <label
            title="Click to add or change profile photo"
            className="group relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full overflow-hidden border-2 border-emerald-200 shadow-xs hover:border-[#1b4332] transition bg-zinc-50"
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
              <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                <RefreshCw className="h-5 w-5 animate-spin text-[#1b4332]" />
              </div>
            ) : photo ? (
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[#e8f0e3] text-[#1b4332]">
                <Sprout className="h-5 w-5" />
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </label>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-900">{profile?.name || user?.name}</p>
            <p className="truncate text-xs text-zinc-500">
              {profile?.farmer?.farmName || "Your farm"}
            </p>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer disabled:opacity-50"
            >
              <Camera className="h-3 w-3" />
              {uploadingPhoto ? "Uploading..." : photo ? "Change photo" : "Add photo"}
            </button>
          </div>
        </div>
        <nav className="space-y-0.5 p-3 text-sm">
          {links.map((l) => {
            const Icon = l.icon;
            const localizedLabel = navTranslations[l.label]?.[lang] || l.label;
            const localizedBadge = l.badge ? (navTranslations[l.badge]?.[lang] || l.badge) : null;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-3 py-2.5 transition ${
                    isActive
                      ? "bg-[#1b4332] text-white shadow-sm"
                      : l.highlight
                      ? "bg-[#eaf5ee] text-[#1b4332] font-semibold border border-emerald-300/60 hover:bg-[#dcf0e2]"
                      : "text-zinc-700 hover:bg-emerald-50/50"
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${l.highlight ? "text-[#1b4332]" : ""}`} />
                  <span>{localizedLabel}</span>
                </div>
                {localizedBadge && (
                  <span className="rounded-md bg-[#1b4332] px-2 py-0.5 text-[10px] font-bold text-emerald-100 shadow-xs">
                    {localizedBadge}
                  </span>
                )}
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-zinc-500 hover:bg-emerald-50/40 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {navTranslations.Logout?.[lang] || "Logout"}
          </button>
        </nav>
      </aside>
      <div className="flex-1 bg-[#f4f7f4]">
        <header className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 md:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <Link to="/">
            <SamruddhiSetuLogo size="sm" />
          </Link>
          <span className="w-8" />
        </header>
        {open && (
          <button className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} />
        )}
        <div className="px-4 py-6 md:px-10">
          <Outlet />
        </div>
      </div>

      {/* Floating Kisan Voice Assistant available across all farmer portal tabs */}
      <FarmerVoiceAssistant embedded={false} />
    </div>
  );
}
