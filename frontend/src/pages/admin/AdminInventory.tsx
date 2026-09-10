import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  Leaf,
  MapPin,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import { api } from "../../services/api";

type InventoryRow = {
  id: string;
  name: string;
  variety?: string | null;
  description?: string | null;
  unit: string;
  pricePaise: number;
  imageUrl?: string | null;
  organic: boolean;

  category: {
    id: string;
    name: string;
    slug: string;
  } | null;

  farmer: {
    id: string;
    farmName: string;
    district: string;
    state: string;
    pinCode: string;
    location: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
      photoUrl?: string | null;
    };
  };

  farmerStock: {
    available: number;
    reserved: number;
    sold: number;
  };

  societyStock: {
    available: number;
    reserved: number;
    sold: number;
  };

  totalStock: {
    available: number;
    reserved: number;
    sold: number;
  };

  societies: {
    id: string;
    available: number;
    reserved: number;
    sold: number;
    updatedAt: string;
    society: {
      id: string;
      name: string;
      code: string;
      district: string;
      state: string;
      pinCode: string;
      active: boolean;
    };
  }[];

  inventoryUpdatedAt?: string | null;
};

type InventoryResponse = {
  products: InventoryRow[];
  totals: {
    products: number;
    available: number;
    reserved: number;
    sold: number;
  };
};

function number(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function AdminInventory() {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "farmer" | "society" | "low"
  >("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadInventory = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api<InventoryResponse>(
        "/api/admin/inventory",
      );

      setData(response);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load inventory.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const products = data?.products ?? [];

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const hasFarmerStock =
        product.farmerStock.available > 0 ||
        product.farmerStock.reserved > 0 ||
        product.farmerStock.sold > 0;

      const hasSocietyStock =
        product.societyStock.available > 0 ||
        product.societyStock.reserved > 0 ||
        product.societyStock.sold > 0;

      const isLowStock =
        product.totalStock.available > 0 &&
        product.totalStock.available < 10;

      if (filter === "farmer" && !hasFarmerStock) {
        return false;
      }

      if (filter === "society" && !hasSocietyStock) {
        return false;
      }

      if (filter === "low" && !isLowStock) {
        return false;
      }

      if (!query) {
        return true;
      }

      const societyNames = product.societies
        .map((item) => item.society.name)
        .join(" ");

      const searchable = [
        product.name,
        product.variety,
        product.category?.name,
        product.farmer.user.name,
        product.farmer.farmName,
        product.farmer.district,
        product.farmer.state,
        societyNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [products, search, filter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-200" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-white"
            />
          ))}
        </div>

        <div className="h-[500px] animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Boxes size={20} />
        </div>

        <h1 className="mt-4 text-lg font-extrabold text-slate-950">
          Inventory unavailable
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {error}
        </p>

        <button
          type="button"
          onClick={() => void loadInventory(true)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
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
            Stock control
          </div>

          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-950">
            Products & Inventory
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor farmer stock, society stock, reservations and sales.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadInventory(true)}
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

        <Summary
          icon={<Package size={18} />}
          label="Active products"
          value={number(data?.totals.products ?? 0)}
          iconClass="bg-blue-50 text-blue-600"
        />

        <Summary
          icon={<Boxes size={18} />}
          label="Available stock"
          value={number(data?.totals.available ?? 0)}
          iconClass="bg-cyan-50 text-cyan-600"
        />

        <Summary
          icon={<Package size={18} />}
          label="Reserved stock"
          value={number(data?.totals.reserved ?? 0)}
          iconClass="bg-amber-50 text-amber-600"
        />

        <Summary
          icon={<CheckCircle2 size={18} />}
          label="Sold stock"
          value={number(data?.totals.sold ?? 0)}
          iconClass="bg-emerald-50 text-emerald-600"
        />

      </section>

      {/* Search and filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-3 xl:flex-row">

          <div className="relative flex-1">

            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product, farmer, farm, society or district..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />

          </div>

          <div className="flex flex-wrap gap-2">

            {[
              ["all", "All"],
              ["farmer", "Farmer stock"],
              ["society", "Society stock"],
              ["low", "Low stock"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFilter(
                    value as "all" | "farmer" | "society" | "low",
                  )
                }
                className={[
                  "h-11 rounded-xl border px-4 text-sm font-bold transition",
                  filter === value
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {label}
              </button>
            ))}

          </div>

        </div>

        <div className="mt-3 text-xs font-medium text-slate-400">
          Showing {number(filteredProducts.length)} of{" "}
          {number(products.length)} products
        </div>

      </section>

      {/* Product table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1200px]">

            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left">

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Product
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Farmer
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Farmer stock
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Society stock
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total available
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Price
                </th>

                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Location
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {filteredProducts.map((product) => {

                const isLow =
                  product.totalStock.available > 0 &&
                  product.totalStock.available < 10;

                return (
                  <tr
                    key={product.id}
                    className="transition hover:bg-slate-50/60"
                  >

                    {/* Product */}
                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="h-11 w-11 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                            <Package size={19} />
                          </div>
                        )}

                        <div>

                          <div className="flex items-center gap-2">

                            <span className="text-sm font-extrabold text-slate-900">
                              {product.name}
                            </span>

                            {product.organic && (
                              <Leaf
                                size={14}
                                className="text-emerald-600"
                              />
                            )}

                          </div>

                          <div className="mt-1 text-[11px] text-slate-400">
                            {product.variety ||
                              product.category?.name ||
                              "Product"}
                          </div>

                        </div>

                      </div>

                    </td>

                    {/* Farmer */}
                    <td className="px-5 py-4">

                      <div className="text-sm font-bold text-slate-800">
                        {product.farmer.user.name}
                      </div>

                      <div className="mt-1 text-[11px] text-slate-400">
                        {product.farmer.farmName}
                      </div>

                    </td>

                    {/* Farmer stock */}
                    <td className="px-5 py-4">

                      <div className="text-sm font-extrabold text-slate-900">
                        {number(product.farmerStock.available)}{" "}
                        {product.unit}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400">
                        {number(product.farmerStock.reserved)} reserved
                        {" · "}
                        {number(product.farmerStock.sold)} sold
                      </div>

                    </td>

                    {/* Society stock */}
                    <td className="px-5 py-4">

                      {product.societies.length > 0 ? (
                        <div>

                          <div className="text-sm font-extrabold text-slate-900">
                            {number(
                              product.societyStock.available,
                            )}{" "}
                            {product.unit}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-400">
                            {product.societies.length} centre
                            {product.societies.length !== 1
                              ? "s"
                              : ""}
                          </div>

                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          No society stock
                        </span>
                      )}

                    </td>

                    {/* Total */}
                    <td className="px-5 py-4">

                      <div
                        className={[
                          "text-sm font-extrabold",
                          isLow
                            ? "text-amber-600"
                            : "text-slate-900",
                        ].join(" ")}
                      >
                        {number(
                          product.totalStock.available,
                        )}{" "}
                        {product.unit}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400">
                        {number(product.totalStock.reserved)}
                        {" reserved · "}
                        {number(product.totalStock.sold)}
                        {" sold"}
                      </div>

                    </td>

                    {/* Price */}
                    <td className="px-5 py-4">

                      <div className="text-sm font-extrabold text-slate-900">
                        {money(product.pricePaise)}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400">
                        per {product.unit}
                      </div>

                    </td>

                    {/* Location */}
                    <td className="px-5 py-4">

                      <div className="flex max-w-[190px] items-start gap-1.5 text-xs font-semibold leading-5 text-slate-600">

                        <MapPin
                          size={13}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />

                        {product.farmer.location ||
                          `${product.farmer.district}, ${product.farmer.state}`}

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <Boxes className="mx-auto h-9 w-9 text-slate-300" />

            <p className="mt-3 text-sm font-bold text-slate-500">
              No products match the selected filters.
            </p>
          </div>
        )}

      </section>
    </div>
  );
}

function Summary({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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

    </div>
  );
}
