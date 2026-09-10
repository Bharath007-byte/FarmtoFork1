import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { api } from "../../services/api";

type Product = {
  id: string;
  name: string;
  variety?: string | null;
  unit: string;
  pricePaise: number;
  imageUrl?: string | null;
};

type Society = {
  id: string;
  name: string;
  code: string;
  district: string;
  state: string;
  pinCode: string;
  verified: boolean;
};

type Farmer = {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    photoUrl?: string | null;
    createdAt: string;
  };
  farmName: string;
  district: string;
  state: string;
  pinCode: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  categories: string[];
  details?: string | null;
  verified: boolean;
  products: Product[];
  inventory: {
    available: number;
    reserved: number;
    sold: number;
  };
  societies: {
    membershipId: string;
    joinedAt: string;
    society: Society;
  }[];
};

type FarmersResponse = {
  farmers: Farmer[];
  total: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminFarmers() {
  const [data, setData] = useState<FarmersResponse | null>(null);
  const [search, setSearch] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadFarmers = useCallback(async (manual = false) => {
    try {
      manual ? setRefreshing(true) : setLoading(true);
      setError("");

      const result = await api<FarmersResponse>("/api/admin/farmers");
      setData(result);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load farmers.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFarmers();
  }, [loadFarmers]);

  const farmers = data?.farmers ?? [];

  const filteredFarmers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return farmers.filter((farmer) => {
      if (verifiedOnly && !farmer.verified) return false;

      if (!query) return true;

      const societyNames = farmer.societies
        .map((membership) => membership.society.name)
        .join(" ");

      const productNames = farmer.products
        .map((product) => product.name)
        .join(" ");

      const searchable = [
        farmer.user.name,
        farmer.user.email,
        farmer.farmName,
        farmer.district,
        farmer.state,
        farmer.pinCode,
        farmer.location,
        societyNames,
        productNames,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [farmers, search, verifiedOnly]);

  const verifiedCount = farmers.filter(
    (farmer) => farmer.verified,
  ).length;

  const totalProducts = farmers.reduce(
    (sum, farmer) => sum + farmer.products.length,
    0,
  );

  const totalAvailable = farmers.reduce(
    (sum, farmer) => sum + farmer.inventory.available,
    0,
  );

  const totalReserved = farmers.reduce(
    (sum, farmer) => sum + farmer.inventory.reserved,
    0,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-white"
            />
          ))}
        </div>

        <div className="h-96 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Users size={20} />
        </div>

        <h1 className="mt-4 text-lg font-extrabold text-slate-950">
          Farmers unavailable
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {error}
        </p>

        <button
          type="button"
          onClick={() => void loadFarmers(true)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
            Farmer network
          </div>

          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-950">
            Farmers
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Real farmer accounts, society memberships, products and inventory.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadFarmers(true)}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </section>

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          icon={<Users size={18} />}
          label="Total farmers"
          value={formatNumber(farmers.length)}
          iconClass="bg-blue-50 text-blue-600"
        />

        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Verified farmers"
          value={formatNumber(verifiedCount)}
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          icon={<Package size={18} />}
          label="Active products"
          value={formatNumber(totalProducts)}
          iconClass="bg-amber-50 text-amber-600"
        />

        <StatCard
          icon={<Package size={18} />}
          label="Available stock"
          value={formatNumber(totalAvailable)}
          subtitle={`${formatNumber(totalReserved)} reserved`}
          iconClass="bg-cyan-50 text-cyan-600"
        />

      </section>

      {/* Search */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">

          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search farmer, farm, society, location or product..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <button
            type="button"
            onClick={() => setVerifiedOnly((value) => !value)}
            className={[
              "h-11 rounded-xl border px-4 text-sm font-bold transition",
              verifiedOnly
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            {verifiedOnly ? "Verified only" : "All farmers"}
          </button>

        </div>

        <div className="mt-3 text-xs font-medium text-slate-400">
          Showing {formatNumber(filteredFarmers.length)} of{" "}
          {formatNumber(farmers.length)} farmers
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1100px]">

            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left">

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Farmer
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Farm
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Society
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Products
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Available
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Location
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Status
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {filteredFarmers.map((farmer) => {

                const society = farmer.societies[0]?.society;

                return (
                  <tr
                    key={farmer.id}
                    className="transition hover:bg-slate-50/60"
                  >

                    {/* Farmer */}
                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        {farmer.user.photoUrl ? (
                          <img
                            src={farmer.user.photoUrl}
                            alt=""
                            className="h-10 w-10 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <Users size={18} />
                          </div>
                        )}

                        <div>
                          <div className="text-sm font-extrabold text-slate-900">
                            {farmer.user.name}
                          </div>

                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                            <Mail size={11} />
                            {farmer.user.email}
                          </div>
                        </div>

                      </div>

                    </td>

                    {/* Farm */}
                    <td className="px-5 py-4">

                      <div className="text-sm font-bold text-slate-800">
                        {farmer.farmName}
                      </div>

                      <div className="mt-1 text-[11px] text-slate-400">
                        Joined {formatDate(farmer.user.createdAt)}
                      </div>

                    </td>

                    {/* Society */}
                    <td className="px-5 py-4">

                      {society ? (
                        <>
                          <div className="text-sm font-bold text-slate-800">
                            {society.name}
                          </div>

                          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {society.code}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          Direct farmer
                        </span>
                      )}

                    </td>

                    {/* Products */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatNumber(farmer.products.length)}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-5 py-4">

                      <div className="text-sm font-extrabold text-slate-900">
                        {formatNumber(farmer.inventory.available)}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400">
                        {formatNumber(farmer.inventory.reserved)} reserved
                      </div>

                    </td>

                    {/* Location */}
                    <td className="px-5 py-4">

                      <div className="flex max-w-[190px] items-start gap-1.5 text-xs font-semibold leading-5 text-slate-600">

                        <MapPin
                          size={13}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />

                        {farmer.location ||
                          `${farmer.district}, ${farmer.state}`}

                      </div>

                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">

                      <div className="flex flex-col items-start gap-1.5">

                        <span
                          className={[
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
                            farmer.verified
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          <CheckCircle2 size={11} />

                          {farmer.verified
                            ? "Verified"
                            : "Pending"}
                        </span>

                        {farmer.user.phone && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                            <Phone size={10} />
                            {farmer.user.phone}
                          </span>
                        )}

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

        {filteredFarmers.length === 0 && (
          <div className="p-12 text-center">

            <Users className="mx-auto h-9 w-9 text-slate-300" />

            <p className="mt-3 text-sm font-bold text-slate-500">
              No farmers match your search.
            </p>

          </div>
        )}

      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          iconClass,
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-3xl font-extrabold text-slate-950">
        {value}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-slate-400">
          {subtitle}
        </div>
      )}
    </div>
  );
}
