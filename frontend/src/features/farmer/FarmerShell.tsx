import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Bell,
  Boxes,
  Camera,
  LayoutDashboard,
  LogOut,
  Menu,
  Sprout,
  Truck,
  Wallet,
} from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppState";

const links = [
  { to: "/farmer/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/farmer/sell", label: "Sell", icon: Camera },
  { to: "/farmer/produce", label: "My products", icon: Boxes },
  { to: "/farmer/orders", label: "Orders", icon: Boxes },
  { to: "/farmer/earnings", label: "Earnings", icon: Wallet },
  { to: "/farmer/logistics", label: "Pickup", icon: Truck },
  { to: "/farmer/notifications", label: "Alerts", icon: Bell },
];

export function FarmerShell() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
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
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-5">
          {photo ? (
            <img src={photo} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f0e3] text-[#2f7a4a]">
              <Sprout className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{profile?.name || user?.name}</p>
            <p className="truncate text-xs text-zinc-500">
              {profile?.farmer?.farmName || "Your farm"}
            </p>
          </div>
        </div>
        <nav className="space-y-0.5 p-3 text-sm">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2.5 ${
                    isActive ? "bg-[#2f7a4a] text-white" : "text-zinc-700 hover:bg-zinc-50"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-zinc-500 hover:bg-zinc-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </aside>
      <div className="flex-1 bg-[#f7faf7]">
        <header className="flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3 md:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <Link to="/" className="text-sm font-bold">
            farm2fork
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
    </div>
  );
}
