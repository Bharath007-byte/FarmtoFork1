import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Camera,
  Package,
  Truck,
  Wallet,
  ArrowRight,
  TrendingUp,
  Sprout,
  Stethoscope,
  Layers,
  Building2,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { useApp } from "../context/AppState";
import { api, ApiError, rupees } from "../services/api";
import { useRealtime } from "../hooks/useRealtime";
import { FarmerVoiceAssistant } from "../components/FarmerVoiceAssistant";
import { MandiPriceBenchmark } from "../components/MandiPriceBenchmark";

type Stats = {
  todaySalesPaise: number;
  totalEarningsPaise: number;
  pendingEarningsPaise?: number;
  pendingOrders: number;
  completedOrders: number;
  activeProducts: number;
  availableInventory: number;
};

type RecentItem = {
  orderId: string;
  product: string;
  qty: number;
  amountPaise: number;
  status: string;
  createdAt: string;
};

export function FarmerDashboard() {
  const { user } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api<Stats>("/api/farmers/me/stats"),
      api<{ rows: RecentItem[] }>("/api/farmers/me/earnings").catch(() => ({ rows: [] })),
    ])
      .then(([s, earn]) => {
        setStats(s);
        setRecentItems(earn.rows?.slice(0, 4) || []);
        setError("");
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Unable to load dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime(
    ["ORDER_CREATED", "PAYMENT_CONFIRMED", "INVENTORY_UPDATED", "ORDER_STATUS_CHANGED"],
    load
  );

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col justify-between gap-6 rounded-3xl border border-zinc-200/70 bg-white p-6 sm:p-7 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-900">
              <Sprout className="h-3.5 w-3.5 text-zinc-800 shrink-0" />
              Verified Farmer
            </span>
            <span className="text-zinc-300 select-none">·</span>
            <span className="font-normal text-zinc-500">
              Samruddhi Setu Network
            </span>
          </div>

          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Namaste{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500">
            Welcome to your digital farm desk. Live harvest rates, consumer orders, and logistics updates.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Link
            to="/farmer/krishi-ai"
            className="flex items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-xs transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            <Stethoscope className="h-4 w-4 text-zinc-600" />
            Krishi Crop Doctor & Planner
          </Link>

          <Link
            to="/farmer/twin"
            className="flex items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-xs transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            <Activity className="h-4 w-4 text-zinc-600" />
            Farm Field Simulator
          </Link>

          <Link
            to="/farmer/sell"
            className="flex items-center gap-2 rounded-2xl bg-[#1b4332] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245e38]"
          >
            <Camera className="h-4 w-4" />
            Sell Crop
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm font-medium text-zinc-500">Loading farm numbers…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* 2. Primary Hero Card: Sell Produce with Quality Grading */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-[#1b4332] via-[#245e38] to-[#1e4a30] p-6 text-white shadow-lg sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-100 border border-emerald-400/30 backdrop-blur-md">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
            Harvest Quality & Mandi Grade Verification
          </span>

          <h2 className="mt-4 font-serif text-2xl font-bold leading-tight sm:text-3xl">
            Sell Produce & Get Fair APMC Mandi Grade A/B/C
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed text-emerald-50/90 sm:text-base">
            Upload a photo of your freshly harvested crops. Our camera scanner checks surface quality, freshness, and suggests fair APMC mandi prices before listing.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/farmer/sell"
              className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-[#1b4332] shadow-md transition hover:bg-emerald-50"
            >
              <Camera className="h-4 w-4 text-[#1b4332]" />
              Scan & Sell Now
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/farmer/cooperative"
              className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <Building2 className="h-4 w-4 text-emerald-200" />
              Pool to Society Hub (100kg+)
            </Link>

            <Link
              to="/farmer/produce"
              className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              View My Produce
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Core Numbers: 4 Clear Metric Tiles */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Today's Sales"
            value={rupees(stats.todaySalesPaise)}
            hint="Gross orders received today"
            icon={<TrendingUp className="h-5 w-5 text-[#1b4332]" />}
            color="emerald"
          />
          <MetricTile
            label="Total Earnings"
            value={rupees(stats.totalEarningsPaise)}
            hint="Net earnings settled to bank"
            icon={<Wallet className="h-5 w-5 text-amber-700" />}
            color="amber"
          />
          <MetricTile
            label="Pending Orders"
            value={String(stats.pendingOrders)}
            hint="Orders waiting for pickup"
            icon={<Package className="h-5 w-5 text-[#2d6a4f]" />}
            color="blue"
          />
          <MetricTile
            label="Active Inventory"
            value={`${stats.availableInventory} kg`}
            hint={`${stats.activeProducts} crops active in catalog`}
            icon={<Layers className="h-5 w-5 text-[#1b4332]" />}
            color="purple"
          />
        </div>
      )}

      {/* 4. Kisan Multilingual Voice Assistant (Small/Medium Toggleable) */}
      <FarmerVoiceAssistant embedded={true} initialMode="medium" />

      {/* 5. Live Orders & Packing Feed */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-zinc-900">Recent Consumer & Society Orders</h2>
            <p className="text-xs text-zinc-500">Live order items assigned to your farm</p>
          </div>
          <Link
            to="/farmer/orders"
            className="flex items-center gap-1 text-xs font-bold text-[#2f7a4a] hover:underline"
          >
            All Orders
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
              <Package className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-zinc-700">No active orders right now</p>
            <p className="mt-1 text-xs text-zinc-500">
              When consumers in Bengaluru or local cooperative societies buy your produce, orders will show up here.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-zinc-100">
            {recentItems.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#2f7a4a]">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{item.product}</p>
                    <p className="text-xs text-zinc-500">
                      Quantity: {item.qty} · Order #{item.orderId.slice(-6).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-900">{rupees(item.amountPaise)}</p>
                  <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Quick Action Navigation Hub */}
      <div>
        <h2 className="mb-4 font-serif text-xl font-bold text-zinc-900">Farm Desk Tools</h2>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <ToolCard
            to="/farmer/krishi-ai"
            icon={<Stethoscope className="h-5 w-5 text-[#1b4332]" />}
            title="Krishi Crop Doctor & Planner"
            desc="Leaf disease diagnosis, organic cures, sowing windows & 10-50 acre plan"
          />
          <ToolCard
            to="/farmer/produce"
            icon={<Package className="h-5 w-5 text-[#1b4332]" />}
            title="My Produce Catalog"
            desc="Update prices, varieties, and stock quantity"
          />
          <ToolCard
            to="/farmer/orders"
            icon={<Truck className="h-5 w-5 text-[#2d6a4f]" />}
            title="Orders & Logistics"
            desc="Track pickup trucks and delivery progress"
          />
          <ToolCard
            to="/farmer/earnings"
            icon={<Wallet className="h-5 w-5 text-amber-700" />}
            title="Earnings & Payouts"
            desc="Settled balances and payment breakdown"
          />
          <ToolCard
            to="/farmer/advisory"
            icon={<MessageSquare className="h-5 w-5 text-[#1b4332]" />}
            title="Kisan Farm Advisory"
            desc="Crop care, weather alerts, and soil nutrition"
          />
          <ToolCard
            to="/farmer/cooperative"
            icon={<Building2 className="h-5 w-5 text-[#1b4332]" />}
            title="Cooperative Society Hubs"
            desc="Devanahalli, Yelahanka, and Tirupati bulk supply"
          />
        </div>
      </div>

      {/* 7. Mandi Price Benchmark & Predictive Forecasting System */}
      <MandiPriceBenchmark />
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:border-zinc-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <p className="font-serif text-2xl font-bold tracking-tight text-zinc-900">{value}</p>
        <p className="mt-1 text-[11px] text-zinc-400">{hint}</p>
      </div>
    </div>
  );
}

function ToolCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-50 transition group-hover:bg-emerald-50">
          {icon}
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-zinc-900" />
      </div>
      <div className="mt-4">
        <p className="text-base font-bold text-zinc-900">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{desc}</p>
      </div>
    </Link>
  );
}

export function FarmerFeature({
  title,
  kicker,
  body,
}: {
  title: string;
  kicker: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2f7a4a]">{kicker}</p>
      <h1 className="mt-2 font-serif text-3xl">{title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-600">{body}</p>
    </div>
  );
}
