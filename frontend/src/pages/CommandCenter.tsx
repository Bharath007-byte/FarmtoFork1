import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Bell,
  Box,
  Building2,
  ChevronRight,
  CircleDollarSign,
  Database,
  Factory,
  LayoutDashboard,
  Loader2,
  MapPinned,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { api } from "../services/api";

type AdminOverview = {
  users: {
    farmers: number;
    consumers: number;
  };
  catalog: {
    products: number;
  };
  societies: {
    active: number;
    activeFarmers: number;
  };
  supplies: {
    records: number;
    receivedKg: number;
    soldKg: number;
    pendingRecords: number;
    partiallySoldRecords: number;
    soldRecords: number;
  };
  societyInventory: {
    availableKg: number;
    reservedKg: number;
    soldKg: number;
  };
  orders: {
    total: number;
  };
  payments: {
    captured: number;
  };
  logistics: {
    activeJobs: number;
  };
};

const number = new Intl.NumberFormat("en-IN");
const kg = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  onClick,
  iconClass,
}: {
  icon: typeof Users;
  title: string;
  value: string;
  subtitle: string;
  onClick?: () => void;
  iconClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof PackageCheck;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function CommandCenter() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await api<AdminOverview>("/api/admin/overview");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f8f5] p-6">
        <div className="mx-auto flex min-h-[70vh] max-w-[1500px] items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-600 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            Loading Farm2Fork database...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f5f8f5] p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <Database className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-black text-slate-900">
            Admin data could not be loaded
          </h1>
          <p className="mt-2 text-sm text-slate-500">{error || "Unknown error"}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8f5] text-slate-900">
      <div className="flex min-h-screen">
        {/* Admin sidebar */}
        <aside className="hidden w-[235px] shrink-0 border-r border-emerald-950/20 bg-[#0d2118] text-white lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black tracking-wide">FARM2FORK</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                Admin Control
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <button
              type="button"
              onClick={() => scrollTo("top")}
              className="flex w-full items-center gap-3 rounded-xl bg-emerald-700 px-4 py-3 text-left text-sm font-black"
            >
              <LayoutDashboard className="h-4 w-4" />
              Command Center
            </button>

            {[
              ["societies", Building2, "Societies"],
              ["farmers", Users, "Farmers"],
              ["inventory", Box, "Products & Inventory"],
              ["orders", ShoppingCart, "Orders"],
              ["logistics", Truck, "Logistics"],
              ["payments", WalletCards, "Payments"],
            ].map(([id, Icon, label]) => (
              <button
                key={String(id)}
                type="button"
                onClick={() => scrollTo(String(id))}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {String(label)}
              </button>
            ))}
          </nav>

          <div className="m-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-black">DATABASE CONNECTED</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">
              Dashboard values are loaded from the Farm2Fork PostgreSQL API.
            </p>
          </div>
        </aside>

        <main id="top" className="min-w-0 flex-1">
          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f5f8f5]/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                    Farm2Fork Administration
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                    PostgreSQL
                  </span>
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  Command Center
                </h1>
                <p className="mt-1 hidden text-xs font-medium text-slate-500 sm:block">
                  Monitor farmers, societies, inventory, orders, logistics and payments.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void load(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-emerald-200 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-700 text-xs font-black text-white">
                    A
                  </div>
                  <span className="text-xs font-black">Admin</span>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 sm:px-8">
            {/* KPI grid */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <StatCard
                icon={Users}
                title="Farmers"
                value={number.format(data.users.farmers)}
                subtitle="Registered farmer accounts"
                onClick={() => scrollTo("farmers")}
                iconClass="bg-emerald-50 text-emerald-700"
              />
              <StatCard
                icon={Users}
                title="Consumers"
                value={number.format(data.users.consumers)}
                subtitle="Registered consumer accounts"
                iconClass="bg-blue-50 text-blue-700"
              />
              <StatCard
                icon={PackageCheck}
                title="Products"
                value={number.format(data.catalog.products)}
                subtitle="Active catalog products"
                onClick={() => scrollTo("inventory")}
                iconClass="bg-amber-50 text-amber-700"
              />
              <StatCard
                icon={ShoppingCart}
                title="Orders"
                value={number.format(data.orders.total)}
                subtitle="Orders recorded in database"
                onClick={() => scrollTo("orders")}
                iconClass="bg-rose-50 text-rose-700"
              />
              <StatCard
                icon={Building2}
                title="Societies"
                value={number.format(data.societies.active)}
                subtitle={`${number.format(data.societies.activeFarmers)} active society farmers`}
                onClick={() => scrollTo("societies")}
                iconClass="bg-violet-50 text-violet-700"
              />
              <StatCard
                icon={Truck}
                title="Active Logistics"
                value={number.format(data.logistics.activeJobs)}
                subtitle="Non-cancelled, non-delivered jobs"
                onClick={() => scrollTo("logistics")}
                iconClass="bg-cyan-50 text-cyan-700"
              />
            </section>

            {/* Supply + inventory */}
            <section
              id="inventory"
              className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <SectionHeader
                icon={PackageCheck}
                title="Supply & Inventory"
                description="Real society supply and inventory aggregates"
                action={
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Database data
                  </span>
                }
              />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Supply received", `${kg.format(data.supplies.receivedKg)} kg`],
                  ["Supply sold", `${kg.format(data.supplies.soldKg)} kg`],
                  ["Available stock", `${kg.format(data.societyInventory.availableKg)} kg`],
                  ["Reserved stock", `${kg.format(data.societyInventory.reservedKg)} kg`],
                  ["Society sold", `${kg.format(data.societyInventory.soldKg)} kg`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs font-black text-amber-800">Awaiting admin action</p>
                  <p className="mt-1 text-2xl font-black text-amber-900">
                    {number.format(data.supplies.pendingRecords)}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">
                    Supply records currently marked RECEIVED
                  </p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-black text-blue-800">Partially sold</p>
                  <p className="mt-1 text-2xl font-black text-blue-900">
                    {number.format(data.supplies.partiallySoldRecords)}
                  </p>
                  <p className="mt-1 text-[11px] text-blue-700">
                    Supply records with remaining stock
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-black text-emerald-800">Fully sold</p>
                  <p className="mt-1 text-2xl font-black text-emerald-900">
                    {number.format(data.supplies.soldRecords)}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Supply records with no remaining society stock
                  </p>
                </div>
              </div>
            </section>

            {/* Network */}
            <section className="grid gap-6 xl:grid-cols-2">
              <div
                id="societies"
                className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <SectionHeader
                  icon={Building2}
                  title="Society Network"
                  description="Collection centres and connected farmers"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#0d2118] p-5 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                      Active centres
                    </p>
                    <p className="mt-2 text-4xl font-black">
                      {number.format(data.societies.active)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                      Active farmer memberships
                    </p>
                    <p className="mt-2 text-4xl font-black text-emerald-950">
                      {number.format(data.societies.activeFarmers)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => scrollTo("societies")}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-black text-emerald-700"
                >
                  Society details will use the same database source
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div
                id="logistics"
                className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <SectionHeader
                  icon={Truck}
                  title="Logistics Pulse"
                  description="Current non-cancelled and non-delivered bookings"
                />
                <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-5">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-100 text-cyan-700">
                    <MapPinned className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-3xl font-black">{number.format(data.logistics.activeJobs)}</p>
                    <p className="text-xs font-bold text-slate-500">
                      Active logistics jobs
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  GPS, agent identity, pickup, delivery and six-step status tracking will be
                  pulled from LogisticsBooking records in the next drill-down screen. No simulated
                  vehicle movement is shown here.
                </p>
              </div>
            </section>

            {/* Finance + orders */}
            <section className="grid gap-6 xl:grid-cols-2">
              <div
                id="payments"
                className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <SectionHeader
                  icon={CircleDollarSign}
                  title="Financial Overview"
                  description="Payment records currently captured by the platform"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Captured payment records
                    </p>
                    <p className="mt-2 text-3xl font-black">
                      {number.format(data.payments.captured)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Count of CAPTURED Payment rows
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                      Farmer payment ledger
                    </p>
                    <p className="mt-2 text-sm font-black text-amber-900">
                      Separate ledger required
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      Customer payment capture is not treated as money already paid to farmers.
                    </p>
                  </div>
                </div>
              </div>

              <div
                id="orders"
                className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <SectionHeader
                  icon={ShoppingCart}
                  title="Orders"
                  description="Order volume currently recorded in PostgreSQL"
                />
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-6">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Total orders
                  </p>
                  <p className="mt-2 text-4xl font-black">{number.format(data.orders.total)}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    The next Admin Orders screen will show consumer, fulfillment channel,
                    farmer/society source, order items, amount and delivery status per order.
                  </p>
                </div>
              </div>
            </section>

            {/* Farmers */}
            <section
              id="farmers"
              className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <SectionHeader
                icon={Users}
                title="Farmer Network"
                description="Registered farmer accounts from the database"
              />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                  <Users className="h-5 w-5 text-emerald-700" />
                  <p className="mt-4 text-3xl font-black text-emerald-950">
                    {number.format(data.users.farmers)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-emerald-700">Registered farmers</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                  <Building2 className="h-5 w-5 text-slate-600" />
                  <p className="mt-4 text-3xl font-black">{number.format(data.societies.activeFarmers)}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Active society memberships
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                  <PackageCheck className="h-5 w-5 text-slate-600" />
                  <p className="mt-4 text-3xl font-black">{number.format(data.catalog.products)}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">Active farmer products</p>
                </div>
              </div>
            </section>

            <footer className="flex flex-wrap items-center justify-between gap-3 pb-8 text-[11px] font-medium text-slate-400">
              <span>Farm2Fork Admin • Data-first operations</span>
              <span className="inline-flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                Values shown above are API/database values, not demo KPIs.
              </span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

