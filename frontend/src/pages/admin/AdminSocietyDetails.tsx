import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import { api, ApiError } from "../../services/api";

type FarmerProduct = {
  id: string;
  name: string;
  variety?: string | null;
  unit: string;
  pricePaise: number;
  imageUrl?: string | null;
  active: boolean;
};

type SocietyFarmer = {
  id: string;
  societyId: string;
  farmerId: string;
  joinedAt: string;
  active: boolean;
  farmer: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
      photoUrl?: string | null;
    };
    farmName: string;
    district: string;
    state: string;
    pinCode: string;
    location: string;
    lat?: number | null;
    lng?: number | null;
    verified: boolean;
    products: FarmerProduct[];
  };
};

type SocietyInventory = {
  id: string;
  societyId: string;
  productId: string;
  available: number;
  reserved: number;
  sold: number;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    variety?: string | null;
    unit: string;
    pricePaise: number;
    imageUrl?: string | null;
    farmerId: string;
  };
};

type SocietySupply = {
  id: string;
  societyId: string;
  farmerId: string;
  productId: string;
  quantity: number;
  soldQty: number;
  status: "RECEIVED" | "PARTIALLY_SOLD" | "SOLD";
  receivedAt: string;
  updatedAt: string;
  farmer: {
    id: string;
    user: {
      id: string;
      name: string;
    };
  };
  product: {
    id: string;
    name: string;
    variety?: string | null;
    unit: string;
  };
};

type SocietyDetails = {
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
  farmers: SocietyFarmer[];
  inventory: SocietyInventory[];
  supplies: SocietySupply[];
  _count: {
    farmers: number;
    inventory: number;
    supplies: number;
    bookings: number;
  };
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatQuantity(value: number, unit = "kg") {
  return `${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value)} ${unit}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatPrice(pricePaise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(pricePaise / 100);
}

function statusLabel(status: SocietySupply["status"]) {
  if (status === "PARTIALLY_SOLD") return "Partially sold";
  if (status === "SOLD") return "Sold";
  return "Received";
}

function statusClass(status: SocietySupply["status"]) {
  if (status === "PARTIALLY_SOLD") {
    return "bg-indigo-50 text-indigo-700";
  }

  if (status === "SOLD") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-amber-50 text-amber-700";
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  className,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  description: string;
  className: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${className}`}
      >
        <Icon size={19} />
      </div>

      <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
        {value}
      </div>

      <div className="mt-1 text-xs font-medium text-slate-500">
        {description}
      </div>
    </div>
  );
}

export function AdminSocietyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [society, setSociety] = useState<SocietyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [supplyFarmerId, setSupplyFarmerId] = useState("");
  const [supplyProductId, setSupplyProductId] = useState("");
  const [supplyQuantity, setSupplyQuantity] = useState("");
  const [supplyBusy, setSupplyBusy] = useState(false);
  const [supplyError, setSupplyError] = useState("");
  const [supplySuccess, setSupplySuccess] = useState("");

  const loadSociety = useCallback(
    async (manual = false) => {
      if (!id) {
        setError("Society ID is missing.");
        setLoading(false);
        return;
      }

      try {
        if (manual) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const result = await api<SocietyDetails>(
          `/api/societies/${id}`,
        );

        setSociety(result);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load society details.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void loadSociety();
  }, [loadSociety]);

  const farmerById = useMemo(() => {
    const map = new Map<string, SocietyFarmer["farmer"]>();

    society?.farmers.forEach((member) => {
      map.set(member.farmerId, member.farmer);
    });

    return map;
  }, [society]);

  const selectedSupplyFarmer = supplyFarmerId
    ? farmerById.get(supplyFarmerId) ?? null
    : null;

  const supplyProducts = useMemo(() => {
    if (!selectedSupplyFarmer) return [];

    return selectedSupplyFarmer.products.filter(
      (product) => product.active && product.unit.toLowerCase() === "kg",
    );
  }, [selectedSupplyFarmer]);

  useEffect(() => {
    if (
      supplyProductId &&
      !supplyProducts.some((product) => product.id === supplyProductId)
    ) {
      setSupplyProductId("");
    }
  }, [supplyProductId, supplyProducts]);

  const receiveSupply = async (event: FormEvent) => {
    event.preventDefault();

    if (!id) {
      setSupplyError("Society ID is missing.");
      return;
    }

    const quantity = Number(supplyQuantity);

    if (!supplyFarmerId) {
      setSupplyError("Select a farmer who belongs to this society.");
      return;
    }

    if (!supplyProductId) {
      setSupplyError("Select a product belonging to the farmer.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setSupplyError("Quantity must be a number greater than 0.");
      return;
    }

    setSupplyBusy(true);
    setSupplyError("");
    setSupplySuccess("");

    try {
      const result = await api<{
        supply: SocietySupply;
        inventory: SocietyInventory;
      }>(`/api/societies/${id}/supplies`, {
        method: "POST",
        body: JSON.stringify({
          farmerId: supplyFarmerId,
          productId: supplyProductId,
          quantity,
        }),
      });

      setSupplySuccess(
        `Received ${formatQuantity(
          result.supply.quantity,
          result.supply.product.unit,
        )} of ${result.supply.product.name}. Society available is now ${formatQuantity(
          result.inventory.available,
          result.inventory.product.unit,
        )}.`,
      );
      setSupplyQuantity("");
      await loadSociety(true);
    } catch (err) {
      setSupplyError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to receive farmer supply.",
      );
    } finally {
      setSupplyBusy(false);
    }
  };

  const inventoryTotals = useMemo(() => {
    if (!society) {
      return {
        available: 0,
        reserved: 0,
        sold: 0,
      };
    }

    return society.inventory.reduce(
      (totals, row) => ({
        available: totals.available + row.available,
        reserved: totals.reserved + row.reserved,
        sold: totals.sold + row.sold,
      }),
      {
        available: 0,
        reserved: 0,
        sold: 0,
      },
    );
  }, [society]);

  const supplyTotals = useMemo(() => {
    if (!society) {
      return {
        received: 0,
        sold: 0,
        remaining: 0,
      };
    }

    return society.supplies.reduce(
      (totals, row) => ({
        received: totals.received + row.quantity,
        sold: totals.sold + row.soldQty,
        remaining: totals.remaining + Math.max(row.quantity - row.soldQty, 0),
      }),
      {
        received: 0,
        sold: 0,
        remaining: 0,
      },
    );
  }, [society]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />

        <div className="h-44 animate-pulse rounded-2xl bg-white" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl bg-white"
            />
          ))}
        </div>

        <div className="h-80 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  if (error || !society) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8">
        <h1 className="text-lg font-extrabold text-slate-950">
          Society unavailable
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {error || "The requested society could not be found."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadSociety(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            <RefreshCw size={16} />
            Try again
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/societies")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to societies
          </button>
        </div>
      </div>
    );
  }

  const location = [
    society.village,
    society.district,
    society.state,
    society.pinCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        to="/admin/societies"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-indigo-600"
      >
        <ArrowLeft size={16} />
        Back to societies
      </Link>

      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm">
                <Building2 size={25} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-[28px]">
                    {society.name}
                  </h1>

                  {society.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 size={12} />
                      Verified
                    </span>
                  )}
                </div>

                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                  {society.code}
                </div>

                {society.description && (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                    {society.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void loadSociety(true)}
                disabled={refreshing}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-start gap-2">
              <MapPin
                size={16}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Location
                </div>

                <div className="mt-1 text-xs font-semibold leading-5 text-slate-700">
                  {society.address}
                  <br />
                  {location}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Phone
                size={16}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Phone
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-700">
                  {society.phone || "Not provided"}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Mail
                size={16}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Email
                </div>

                <div className="mt-1 break-all text-xs font-semibold text-slate-700">
                  {society.email || "Not provided"}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin
                size={16}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Coordinates
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-700">
                  {society.lat != null && society.lng != null
                    ? `${society.lat.toFixed(5)}, ${society.lng.toFixed(5)}`
                    : "Not available"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main statistics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Connected farmers"
          value={formatNumber(society._count.farmers)}
          description="Active society memberships"
          className="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          icon={Package}
          label="Inventory records"
          value={formatNumber(society._count.inventory)}
          description={formatQuantity(inventoryTotals.available)}
          className="bg-violet-50 text-violet-600"
        />

        <StatCard
          icon={Truck}
          label="Logistics bookings"
          value={formatNumber(society._count.bookings)}
          description="Bookings linked to this centre"
          className="bg-cyan-50 text-cyan-600"
        />

        <StatCard
          icon={Clock3}
          label="Supply records"
          value={formatNumber(society._count.supplies)}
          description={formatQuantity(supplyTotals.received)}
          className="bg-orange-50 text-orange-600"
        />
      </section>

      {/* Farmers */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-extrabold text-slate-950">
              Connected Farmers
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Farmers currently connected to this collection centre.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">
            {formatNumber(society.farmers.length)} members
          </span>
        </div>

        {society.farmers.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              No active farmers are connected to this society.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {society.farmers.map((member) => {
              const farmer = member.farmer;

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50/60 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {farmer.user.photoUrl ? (
                      <img
                        src={farmer.user.photoUrl}
                        alt=""
                        className="h-11 w-11 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <UserRound size={19} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-extrabold text-slate-950">
                          {farmer.user.name}
                        </div>

                        {farmer.verified && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                            Verified farmer
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {farmer.farmName}
                      </div>

                      <div className="mt-1 text-[11px] text-slate-400">
                        {farmer.location || `${farmer.district}, ${farmer.state}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-5 lg:justify-end">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Products
                      </div>

                      <div className="mt-1 text-sm font-extrabold text-slate-900">
                        {formatNumber(farmer.products.length)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Joined
                      </div>

                      <div className="mt-1 text-xs font-bold text-slate-700">
                        {formatDate(member.joinedAt)}
                      </div>
                    </div>

                    <ChevronRight
                      size={18}
                      className="hidden text-slate-300 lg:block"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Inventory */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-extrabold text-slate-950">
                Society Inventory
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Current available, reserved and sold quantities.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500">
                Available {formatQuantity(inventoryTotals.available)}
              </span>

              <span className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500">
                Reserved {formatQuantity(inventoryTotals.reserved)}
              </span>

              <span className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500">
                Sold {formatQuantity(inventoryTotals.sold)}
              </span>
            </div>
          </div>
        </div>

        {society.inventory.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="mx-auto h-9 w-9 text-slate-300" />

            <p className="mt-3 text-sm font-semibold text-slate-500">
              No society inventory has been recorded yet.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              This is database state; no stock is being simulated.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:px-6">
                    Product
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Farmer
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Available
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Reserved
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sold
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Price
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {society.inventory.map((row) => {
                  const farmer = farmerById.get(row.product.farmerId);

                  return (
                    <tr
                      key={row.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <div className="font-bold text-sm text-slate-900">
                          {row.product.name}
                        </div>

                        {row.product.variety && (
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {row.product.variety}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                        {farmer?.user.name || "Farmer not in society list"}
                      </td>

                      <td className="px-5 py-4 text-sm font-extrabold text-slate-950">
                        {formatQuantity(row.available, row.product.unit)}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-600">
                        {formatQuantity(row.reserved, row.product.unit)}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-600">
                        {formatQuantity(row.sold, row.product.unit)}
                      </td>

                      <td className="px-5 py-4 text-xs font-bold text-slate-700">
                        {formatPrice(row.product.pricePaise)}
                        <span className="ml-1 font-medium text-slate-400">
                          / {row.product.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Receive farmer supply */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="text-base font-extrabold text-slate-950">
            Receive Farmer Supply
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Record real produce received from an active society member into
            society inventory.
          </p>
        </div>

        <form
          onSubmit={(event) => void receiveSupply(event)}
          className="space-y-4 px-5 py-5 sm:px-6"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Farmer
              </span>

              <select
                value={supplyFarmerId}
                onChange={(event) => {
                  setSupplyFarmerId(event.target.value);
                  setSupplyProductId("");
                  setSupplyError("");
                  setSupplySuccess("");
                }}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              >
                <option value="">Select society farmer</option>

                {society.farmers.map((member) => (
                  <option key={member.farmerId} value={member.farmerId}>
                    {member.farmer.user.name} · {member.farmer.farmName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Product
              </span>

              <select
                value={supplyProductId}
                onChange={(event) => {
                  setSupplyProductId(event.target.value);
                  setSupplyError("");
                  setSupplySuccess("");
                }}
                disabled={!supplyFarmerId}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {supplyFarmerId
                    ? "Select farmer product"
                    : "Select a farmer first"}
                </option>

                {supplyProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {product.variety ? ` · ${product.variety}` : ""} ·{" "}
                    {product.unit}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quantity (kg)
              </span>

              <input
                type="number"
                min="0.01"
                step="any"
                value={supplyQuantity}
                onChange={(event) => {
                  setSupplyQuantity(event.target.value);
                  setSupplyError("");
                  setSupplySuccess("");
                }}
                placeholder="e.g. 10"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              />
            </label>
          </div>

          {supplyError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {supplyError}
            </div>
          )}

          {supplySuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {supplySuccess}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={
                supplyBusy ||
                !supplyFarmerId ||
                !supplyProductId ||
                !supplyQuantity
              }
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {supplyBusy ? "Receiving…" : "Receive supply"}
            </button>

            {society.farmers.length === 0 && (
              <p className="text-xs font-medium text-slate-500">
                Add an active society farmer before receiving supply.
              </p>
            )}
          </div>
        </form>
      </section>

      {/* Supplies */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-extrabold text-slate-950">
                Farmer Supplies
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Produce received by this society and its current sales state.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-700">
                Received {formatQuantity(supplyTotals.received)}
              </span>

              <span className="rounded-lg bg-indigo-50 px-3 py-2 text-[10px] font-bold text-indigo-700">
                Sold {formatQuantity(supplyTotals.sold)}
              </span>

              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">
                Remaining {formatQuantity(supplyTotals.remaining)}
              </span>
            </div>
          </div>
        </div>

        {society.supplies.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="mx-auto h-9 w-9 text-slate-300" />

            <p className="mt-3 text-sm font-semibold text-slate-500">
              No farmer supply records have been received yet.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Use Receive Farmer Supply above to add real society stock.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:px-6">
                    Farmer
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Product
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Received
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sold
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Remaining
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Received on
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {society.supplies.map((supply) => (
                  <tr
                    key={supply.id}
                    className="transition hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-4 sm:px-6">
                      <div className="text-sm font-bold text-slate-900">
                        {supply.farmer.user.name}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-sm font-bold text-slate-800">
                        {supply.product.name}
                      </div>

                      {supply.product.variety && (
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {supply.product.variety}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm font-extrabold text-slate-900">
                      {formatQuantity(
                        supply.quantity,
                        supply.product.unit,
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-slate-600">
                      {formatQuantity(
                        supply.soldQty,
                        supply.product.unit,
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-slate-700">
                      {formatQuantity(
                        Math.max(
                          supply.quantity - supply.soldQty,
                          0,
                        ),
                        supply.product.unit,
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(
                          supply.status,
                        )}`}
                      >
                        {statusLabel(supply.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                      {formatDate(supply.receivedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Farmer products */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="text-base font-extrabold text-slate-950">
            Farmer Product Catalog
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Active products belonging to farmers connected to this society.
          </p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
          {society.farmers.flatMap((member) =>
            member.farmer.products.map((product) => (
              <div
                key={`${member.farmerId}-${product.id}`}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Package size={18} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-slate-900">
                      {product.name}
                    </div>

                    <div className="mt-1 text-[11px] font-semibold text-slate-400">
                      {member.farmer.user.name}
                    </div>

                    <div className="mt-2 text-xs font-bold text-indigo-600">
                      {formatPrice(product.pricePaise)} / {product.unit}
                    </div>
                  </div>
                </div>
              </div>
            )),
          )}
        </div>

        {society.farmers.every(
          (member) => member.farmer.products.length === 0,
        ) && (
          <div className="px-6 pb-8 text-center text-sm font-semibold text-slate-500">
            No active farmer products are currently linked to these members.
          </div>
        )}
      </section>
    </div>
  );
}
