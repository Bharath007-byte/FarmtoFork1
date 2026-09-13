import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Package,
  Route,
  Wallet,
  Settings,
  UserRound,
  Headphones,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { api, mediaUrl } from "../services/api";
import { NotificationBell } from "../components/NotificationBell";

type LogisticsProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  role: string;
  deliveryType: "BIKE" | "LARGE_TRUCK" | null;
  vehicleNumber: string | null;
};

type VehicleDetails = {
  makeModel: string;
  vehicleNumber: string;
  vehicleType: string;
  typeLabel: string;
  payloadCapacityKg: number;
  coldChainActive: boolean;
};

type NavItem = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/logistics", icon: LayoutDashboard, end: true },
  { label: "Available Jobs", path: "/logistics/jobs", icon: Package },
  { label: "My Deliveries", path: "/logistics/deliveries", icon: Route },
  { label: "Fleet Desk", path: "/logistics/fleet", icon: Truck },
  { label: "Earnings & Hours", path: "/logistics/earnings", icon: Wallet },
  { label: "Vehicle Info", path: "/logistics/vehicle", icon: Settings },
  { label: "Driver Profile", path: "/logistics/profile", icon: UserRound },
  { label: "Dispatch & SOS", path: "/logistics/support", icon: Headphones },
];

export function LogisticsLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<LogisticsProfile | null>(null);
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const profRes = await api<{ profile: LogisticsProfile }>("/api/logistics/profile");
        if (isMounted) setProfile(profRes.profile);
      } catch {
        // Handled silently
      }

      try {
        const vehRes = await api<{ vehicle: VehicleDetails }>("/api/logistics/vehicle-details");
        if (isMounted) setVehicle(vehRes.vehicle);
      } catch {
        // Handled silently
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("f2f-token");
    localStorage.removeItem("f2f-session");
    window.location.href = "/login";
  };

  const currentTitle =
    navItems.find((n) => (n.end ? location.pathname === n.path : location.pathname.startsWith(n.path)))
      ?.label || "Logistics Desk";

  const firstName = profile?.name ? profile.name.trim().split(/\s+/)[0] : "Ramesh";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 antialiased font-sans">
      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR - Deep Slate / Charcoal Palette */}
      {/* ========================================================= */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-30 bg-[#0F172A] border-r border-slate-800 text-slate-200">
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950/40">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white uppercase">Samruddhi Setu</span>
              </div>
              <p className="text-[10px] font-medium tracking-wider text-emerald-400 font-sans uppercase">स्मृद्धी सेतु • Logistics</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isOnline ? "Online & Ready" : "Offline"}</span>
            </span>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className="text-[10px] uppercase font-semibold text-slate-300 hover:text-white transition"
            >
              {isOnline ? "Go Offline" : "Go Online"}
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Logistics Workspace
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.end
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-slate-800 text-white shadow-sm border border-slate-700/70"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={16}
                    className={isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-300"}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Driver Profile Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                {profile?.photoUrl ? (
                  <img src={mediaUrl(profile.photoUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  firstName.charAt(0)
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{profile?.name || "Ramesh Babu"}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {vehicle?.vehicleNumber || profile?.vehicleNumber || "KA01EF3456"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 transition"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MOBILE DRAWER */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0F172A] border-r border-slate-800 text-slate-200">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <Truck size={18} />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-white">SAMRUDDHI SETU</span>
                  <p className="text-[10px] text-emerald-400">Logistics Desk</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 transition"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN CONTAINER */}
      {/* ========================================================= */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top App Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Logistics</span>
                <span>/</span>
                <span className="text-slate-900 font-medium">{currentTitle}</span>
              </div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">{currentTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Duty Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{vehicle?.typeLabel || "Heavy Freight"} • {vehicle?.vehicleNumber || "KA01EF3456"}</span>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Pill */}
            <button
              onClick={() => navigate("/logistics/profile")}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                {profile?.photoUrl ? (
                  <img src={mediaUrl(profile.photoUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  firstName.charAt(0)
                )}
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline">{firstName}</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
