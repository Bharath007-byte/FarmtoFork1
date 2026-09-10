import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  MapPin,
  Package,
  RefreshCw,
  Users,
} from "lucide-react";
import { api } from "../../services/api";

type Society = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  address: string;
  village?: string | null;
  district: string;
  state: string;
  pinCode: string;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  verified: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    farmers: number;
    inventory: number;
    supplies: number;
    bookings: number;
    orderItems: number;
  };
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function SocietyCard({
  society,
  onOpen,
}: {
  society: Society;
  onOpen: () => void;
}) {
  const location = [
    society.village,
    society.district,
    society.state,
    society.pinCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_10px_35px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Building2 size={20} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-extrabold tracking-tight text-slate-950">
              {society.name}
            </h2>

            <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {society.code}
            </div>
          </div>
        </div>

        <ArrowUpRight
          size={18}
          className="shrink-0 text-slate-300 transition group-hover:text-indigo-600"
        />
      </div>

      <div className="mt-5 flex items-start gap-2 text-xs font-medium text-slate-500">
        <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />

        <span className="leading-5">
          {society.address}

          {location && (
            <>
              <br />
              {location}
            </>
          )}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Farmers
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
            <Users size={14} className="text-indigo-500" />
            {formatNumber(society._count?.farmers ?? 0)}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Inventory
          </div>

          <div className="mt-1 text-sm font-extrabold text-slate-900">
            {formatNumber(society._count?.inventory ?? 0)}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Supplies
          </div>

          <div className="mt-1 text-sm font-extrabold text-slate-900">
            {formatNumber(society._count?.supplies ?? 0)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
            society.verified
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700",
          ].join(" ")}
        >
          <CheckCircle2 size={12} />
          {society.verified ? "Verified" : "Verification pending"}
        </span>

        <span className="text-xs font-bold text-indigo-600">
          View society →
        </span>
      </div>
    </button>
  );
}

export function AdminSocieties() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSocieties = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const result = await api<Society[]>("/api/societies");

      setSocieties(result);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load societies.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSocieties();
  }, [loadSocieties]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200" />

          <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
          <div className="h-64 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8">
        <h1 className="text-lg font-extrabold text-slate-950">
          Societies unavailable
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {error}
        </p>

        <button
          type="button"
          onClick={() => void loadSocieties(true)}
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
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">
            Collection network
          </div>

          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-950">
            Societies
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage collection centres, connected farmers and society operations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSocieties(true)}
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

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Building2 size={18} />
          </div>

          <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active societies
          </div>

          <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
            {formatNumber(
              societies.filter((item) => item.active).length,
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users size={18} />
          </div>

          <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Connected farmers
          </div>

          <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
            {formatNumber(
              societies.reduce(
                (sum, society) =>
                  sum + (society._count?.farmers ?? 0),
                0,
              ),
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <Package size={18} />
          </div>

          <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Supply records
          </div>

          <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
            {formatNumber(
              societies.reduce(
                (sum, society) =>
                  sum + (society._count?.supplies ?? 0),
                0,
              ),
            )}
          </div>
        </div>
      </section>

      {/* Society list */}
      {societies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 text-lg font-bold text-slate-950">
            No societies found
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            There are currently no society records available to this Admin.
          </p>
        </div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {societies.map((society) => (
            <SocietyCard
              key={society.id}
              society={society}
              onOpen={() => {
                window.location.href = `/admin/societies/${society.id}`;
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}
