import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Settings,
  Truck,
  Users,
  X,
} from "lucide-react";
type AdminNavItem = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
};
const navigation: AdminNavItem[] = [
  {
    label: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Societies",
    path: "/admin/societies",
    icon: Building2,
  },
  {
    label: "Farmers",
    path: "/admin/farmers",
    icon: Users,
  },
  {
    label: "Products & Inventory",
    path: "/admin/inventory",
    icon: Boxes,
  },
  {
    label: "Orders",
    path: "/admin/orders",
    icon: ClipboardList,
  },
  {
    label: "Logistics",
    path: "/admin/logistics",
    icon: Truck,
  },
  {
    label: "Payments",
    path: "/admin/payments",
    icon: CircleDollarSign,
  },
  {
    label: "Reports",
    path: "/admin/reports",
    icon: BarChart3,
  },
];

const bottomNavigation: AdminNavItem[] = [
  {
    label: "Settings",
    path: "/admin/settings",
    icon: Settings,
  },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentPage =
    [...navigation, ...bottomNavigation].find((item) =>
      item.end
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path),
    )?.label ?? "Administration";

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#111827]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300",
          collapsed ? "w-[78px]" : "w-[258px]",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex h-[78px] items-center border-b border-slate-200 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
              <PackageSearch size={21} strokeWidth={2.2} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[15px] font-extrabold tracking-tight text-slate-950">
                  FARM2FORK
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Admin Portal
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <div
            className={[
              "mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400",
              collapsed ? "text-center" : "",
            ].join(" ")}
          >
            {!collapsed && "Workspace"}
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    [
                      "group flex h-11 items-center rounded-xl px-3 text-[13px] font-semibold transition-all duration-200",
                      collapsed ? "justify-center" : "gap-3",
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    ].join(" ")
                  }
                >
                  <Icon size={19} strokeWidth={2} className="shrink-0" />

                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="my-6 border-t border-slate-100" />

          <div
            className={[
              "mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400",
              collapsed ? "text-center" : "",
            ].join(" ")}
          >
            {!collapsed && "System"}
          </div>

          <nav className="space-y-1">
            {bottomNavigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    [
                      "group flex h-11 items-center rounded-xl px-3 text-[13px] font-semibold transition-all duration-200",
                      collapsed ? "justify-center" : "gap-3",
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    ].join(" ")
                  }
                >
                  <Icon size={19} strokeWidth={2} className="shrink-0" />

                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Collapse */}
        <div className="hidden border-t border-slate-200 p-3 lg:block">
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="flex h-10 w-full items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span className="ml-2 text-xs font-semibold">
                  Collapse menu
                </span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div
        className={[
          "min-h-screen transition-all duration-300",
          collapsed ? "lg:pl-[78px]" : "lg:pl-[258px]",
        ].join(" ")}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[78px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <div className="truncate text-[17px] font-bold tracking-tight text-slate-950">
                {currentPage}
              </div>
              <div className="hidden text-[11px] font-medium text-slate-400 sm:block">
                Farm2Fork administration
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              aria-label="Notifications"
            >
              <Bell size={18} />

              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-500" />
            </button>

            <div className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-[11px] font-bold text-white">
                A
              </div>

              <div>
                <div className="text-xs font-bold text-slate-900">
                  Admin
                </div>
                <div className="text-[10px] text-slate-400">
                  Administrator
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
