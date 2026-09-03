import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Camera, Package, Truck, Wallet } from "lucide-react";
import { useApp } from "../context/AppState";
import { api, ApiError, rupees } from "../services/api";
import { useRealtime } from "../hooks/useRealtime";

type Stats = {
  todaySalesPaise: number;
  totalEarningsPaise: number;
  pendingOrders: number;
  completedOrders: number;
  activeProducts: number;
  availableInventory: number;
};

export function FarmerDashboard() {
  const { user } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api<Stats>("/api/farmers/me/stats")
      .then((d) => {
        setStats(d);
        setError("");
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Unable to load dashboard");
        setStats(null);
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
    <div className="mx-auto max-w-4xl">
      <h1 className="font-serif text-3xl">
        Hello{user?.name ? `, ${user.name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">Your farm desk — numbers update when orders come in.</p>

      {loading && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}
      {error && <p className="mt-6 text-sm text-rose-600">{error}</p>}

      {stats && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Mini label="Today" value={rupees(stats.todaySalesPaise)} />
          <Mini label="Earnings" value={rupees(stats.totalEarningsPaise)} />
          <Mini label="Pending orders" value={String(stats.pendingOrders)} />
          <Mini label="Completed" value={String(stats.completedOrders)} />
          <Mini label="Products" value={String(stats.activeProducts)} />
          <Mini label="Stock" value={String(stats.availableInventory)} />
        </div>
      )}

      <Link
        to="/farmer/sell"
        className="mt-8 flex items-center justify-between rounded-2xl bg-[#2f7a4a] px-6 py-5 text-white shadow-sm"
      >
        <span>
          <span className="block text-lg font-bold">Sell produce</span>
          <span className="text-sm text-white/80">Add a crop, price, and quantity</span>
        </span>
        <Camera className="h-6 w-6" />
      </Link>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Quick to="/farmer/produce" icon={Package} title="My products" />
        <Quick to="/farmer/orders" icon={Truck} title="Orders" />
        <Quick to="/farmer/earnings" icon={Wallet} title="Earnings" />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function Quick({
  to,
  icon: Icon,
  title,
}: {
  to: string;
  icon: typeof Package;
  title: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white px-4 py-4">
      <Icon className="h-4 w-4 text-[#2f7a4a]" />
      <span className="text-sm font-semibold">{title}</span>
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
