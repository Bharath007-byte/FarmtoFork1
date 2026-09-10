import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Package,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { api } from "../../services/api";

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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatKg(value: number) {
  return `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(value)} kg`;
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Users;
  iconClass: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={19} strokeWidth={2} />
        </div>

        <ArrowUpRight
          size={17}
          className="text-slate-300 transition group-hover:text-slate-500"
        />
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {title}
        </div>

        <div className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-950">
          {value}
        </div>

        <div className="mt-1 text-xs font-medium text-slate-500">
          {description}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
        {value}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result = await api<AdminOverview>("/api/admin/overview");
      setData(result);
    } catch (err) {
      console.error(err);
      setError("Unable to load administration data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-slate-200" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8">
        <div className="text-lg font-bold text-slate-950">
          Dashboard unavailable
        </div>

        <p className="mt-1 text-sm text-slate-500">
          {error ?? "No administration data was returned."}
        </p>

        <button
          onClick={() => void loadDashboard(true)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">
            Operations overview
          </div>

          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-950 sm:text-[32px]">
            Command Center
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            A live view of your Farm2Fork platform operations.
          </p>
        </div>

        <button
          onClick={() => void loadDashboard(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </section>

      {/* Primary KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Farmers"
          value={formatNumber(data.users.farmers)}
          description="Registered farmer accounts"
          icon={Users}
          iconClass="bg-indigo-50 text-indigo-600"
        />

        <KpiCard
          title="Products"
          value={formatNumber(data.catalog.products)}
          description="Active marketplace products"
          icon={Package}
          iconClass="bg-violet-50 text-violet-600"
        />

        <KpiCard
          title="Orders"
          value={formatNumber(data.orders.total)}
          description="Orders recorded in database"
          icon={ClipboardList}
          iconClass="bg-orange-50 text-orange-600"
        />

        <KpiCard
          title="Active Logistics"
          value={formatNumber(data.logistics.activeJobs)}
          description="Non-cancelled, non-delivered jobs"
          icon={Truck}
          iconClass="bg-cyan-50 text-cyan-600"
        />
      </section>

      {/* Operational overview */}
      <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Building2 size={18} />
                </div>

                <h2 className="text-base font-bold text-slate-950">
                  Society Operations
                </h2>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Collection centres and supply movement from PostgreSQL.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
              Database
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Active societies"
              value={data.societies.active}
            />

            <Metric
              label="Society farmers"
              value={data.societies.activeFarmers}
            />

            <Metric
              label="Supply received"
              value={formatKg(data.supplies.receivedKg)}
            />

            <Metric
              label="Supply sold"
              value={formatKg(data.supplies.soldKg)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
              <Package size={18} />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950">
                Society Inventory
              </h2>
              <p className="text-xs text-slate-500">
                Current stock position
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Metric
              label="Available"
              value={formatKg(data.societyInventory.availableKg)}
            />

            <Metric
              label="Reserved"
              value={formatKg(data.societyInventory.reservedKg)}
            />

            <Metric
              label="Sold"
              value={formatKg(data.societyInventory.soldKg)}
            />
          </div>
        </div>
      </section>

      {/* Supply status + platform */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Package size={18} />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950">
                Supply Status
              </h2>
              <p className="text-xs text-slate-500">
                Admin action and stock lifecycle
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Awaiting action
              </div>
              <div className="mt-2 text-2xl font-extrabold text-amber-950">
                {data.supplies.pendingRecords}
              </div>
              <div className="mt-1 text-xs text-amber-700">
                Received records
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                Partially sold
              </div>
              <div className="mt-2 text-2xl font-extrabold text-indigo-950">
                {data.supplies.partiallySoldRecords}
              </div>
              <div className="mt-1 text-xs text-indigo-700">
                Records with stock remaining
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Fully sold
              </div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-950">
                {data.supplies.soldRecords}
              </div>
              <div className="mt-1 text-xs text-emerald-700">
                No remaining society stock
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <CircleDollarSign size={18} />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950">
                Platform Snapshot
              </h2>
              <p className="text-xs text-slate-500">
                Current account and transaction records
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric
              label="Consumers"
              value={formatNumber(data.users.consumers)}
            />

            <Metric
              label="Captured payments"
              value={formatNumber(data.payments.captured)}
            />

            <Metric
              label="Supply records"
              value={formatNumber(data.supplies.records)}
            />

            <Metric
              label="Society farmers"
              value={formatNumber(data.societies.activeFarmers)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
