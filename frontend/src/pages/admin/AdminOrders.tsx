import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Package,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { api } from "../../services/api";

type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "COD_PENDING"
  | "PAID"
  | "ACCEPTED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

type Order = {
  id: string;
  status: OrderStatus;
  paymentMethod: string;
  totalPaise: number;
  platformFeePaise: number;
  logisticsPaise: number;
  createdAt: string;
  updatedAt: string;

  consumer: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    photoUrl?: string | null;
  };

  items: {
    id: string;
    qty: number;
    unitPaise: number;
    linePaise: number;
    fulfillmentChannel: "SOCIETY" | "DIRECT_FARMER";

    product: {
      id: string;
      name: string;
      variety?: string | null;
      unit: string;
      imageUrl?: string | null;
      pricePaise: number;

      farmer: {
        id: string;
        farmName: string;
        district: string;
        state: string;

        user: {
          id: string;
          name: string;
          email: string;
        };
      };
    };

    society?: {
      id: string;
      name: string;
      code: string;
      district: string;
      state: string;
    } | null;
  }[];

  payments: {
    id: string;
    provider: string;
    providerOrder?: string | null;
    providerPayId?: string | null;
    amountPaise: number;
    currency: string;
    method?: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  }[];

  bookings: {
    id: string;
    status: string;
    fulfillmentChannel: "SOCIETY" | "DIRECT_FARMER";
    pickup: string;
    quantity: number;
    vehicle: string;
    assignedUser?: {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
    } | null;

    farmer: {
      id: string;
      farmName: string;
      district: string;
      state: string;
      user: {
        id: string;
        name: string;
      };
    };

    society?: {
      id: string;
      name: string;
      code: string;
      district: string;
      state: string;
    } | null;

    acceptedAt?: string | null;
    farmerReadyAt?: string | null;
    pickedUpAt?: string | null;
    inTransitAt?: string | null;
    deliveredAt?: string | null;

    currentLat?: number | null;
    currentLng?: number | null;
    locationUpdatedAt?: string | null;

    createdAt: string;
    updatedAt: string;
  }[];
};

type Response = {
  orders: Order[];

  summary: {
    total: number;
    pendingPayment: number;
    paid: number;
    preparing: number;
    readyForPickup: number;
    pickedUp: number;
    inTransit: number;
    outForDelivery: number;
    delivered: number;
    cancelled: number;
    failed: number;
    capturedPayments: number;
    orderValuePaise: number;
  };
};

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-100",
    PAID: "bg-blue-50 text-blue-700 border-blue-100",
    ACCEPTED: "bg-blue-50 text-blue-700 border-blue-100",
    PREPARING: "bg-amber-50 text-amber-700 border-amber-100",
    READY_FOR_PICKUP: "bg-cyan-50 text-cyan-700 border-cyan-100",
    PICKED_UP: "bg-indigo-50 text-indigo-700 border-indigo-100",
    IN_TRANSIT: "bg-violet-50 text-violet-700 border-violet-100",
    OUT_FOR_DELIVERY: "bg-orange-50 text-orange-700 border-orange-100",
    CANCELLED: "bg-red-50 text-red-700 border-red-100",
    FAILED: "bg-red-50 text-red-700 border-red-100",
    PENDING_PAYMENT: "bg-slate-100 text-slate-600 border-slate-200",
    COD_PENDING: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold",
        styles[status] ??
          "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {statusLabel(status)}
    </span>
  );
}

export function AdminOrders() {
  const [data, setData] = useState<Response | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (manual = false) => {
      try {
        setError("");

        if (manual) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const query = new URLSearchParams();

        if (status) {
          query.set("status", status);
        }

        if (search.trim()) {
          query.set("search", search.trim());
        }

        const suffix = query.toString()
          ? `?${query.toString()}`
          : "";

        const response = await api<Response>(
          `/api/admin/orders${suffix}`,
        );

        setData(response);

        setSelected((current) => {
          if (!current) return null;

          return (
            response.orders.find(
              (order) => order.id === current.id,
            ) ?? null
          );
        });
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load orders.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, status],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [load]);

  const summary = data?.summary;

  const cards = useMemo(
    () => [
      {
        label: "Total orders",
        value: summary?.total ?? 0,
        icon: ClipboardList,
        className: "bg-blue-50 text-blue-600",
      },
      {
        label: "Awaiting payment",
        value: summary?.pendingPayment ?? 0,
        icon: Clock3,
        className: "bg-amber-50 text-amber-600",
      },
      {
        label: "In fulfilment",
        value:
          (summary?.preparing ?? 0) +
          (summary?.readyForPickup ?? 0) +
          (summary?.pickedUp ?? 0) +
          (summary?.inTransit ?? 0) +
          (summary?.outForDelivery ?? 0),
        icon: Truck,
        className: "bg-cyan-50 text-cyan-600",
      },
      {
        label: "Delivered",
        value: summary?.delivered ?? 0,
        icon: CheckCircle2,
        className: "bg-emerald-50 text-emerald-600",
      },
    ],
    [summary],
  );

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-56 animate-pulse rounded-lg bg-slate-200" />

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

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <XCircle size={20} />
        </div>

        <h1 className="mt-4 text-lg font-extrabold">
          Orders unavailable
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {error}
        </p>

        <button
          type="button"
          onClick={() => void load(true)}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">

        {/* Header */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
              Commerce operations
            </div>

            <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-950">
              Orders
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track real consumer orders from payment through delivery.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
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
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    card.className,
                  ].join(" ")}
                >
                  <Icon size={18} />
                </div>

                <div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {card.label}
                </div>

                <div className="mt-1 text-3xl font-extrabold text-slate-950">
                  {card.value}
                </div>
              </div>
            );
          })}
        </section>

        {/* Actual value */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Order value
            </div>

            <div className="mt-2 text-2xl font-extrabold text-slate-950">
              {money(summary?.orderValuePaise ?? 0)}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Sum of orders currently returned by the database query.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Captured payments
            </div>

            <div className="mt-2 text-2xl font-extrabold text-slate-950">
              {money(summary?.capturedPayments ?? 0)}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Only payments recorded as CAPTURED.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row">

            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search order ID, consumer or product..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="">All statuses</option>
              <option value="PENDING_PAYMENT">
                Pending payment
              </option>
              <option value="PAID">Paid</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PREPARING">Preparing</option>
              <option value="READY_FOR_PICKUP">
                Ready for pickup
              </option>
              <option value="PICKED_UP">Picked up</option>
              <option value="IN_TRANSIT">In transit</option>
              <option value="OUT_FOR_DELIVERY">
                Out for delivery
              </option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </section>

        {/* Orders */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">
            <div className="text-sm font-extrabold text-slate-950">
              Order ledger
            </div>

            <div className="mt-1 text-xs text-slate-400">
              {data?.orders.length ?? 0} orders returned
            </div>
          </div>

          <div className="divide-y divide-slate-100">

            {data?.orders.map((order) => {

              const firstItem = order.items[0];

              const itemCount = order.items.reduce(
                (sum, item) => sum + item.qty,
                0,
              );

              return (
                <button
                  type="button"
                  key={order.id}
                  onClick={() => setSelected(order)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                >

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Package size={19} />
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>

                      <StatusBadge status={order.status} />
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {order.consumer.name}
                      {" · "}
                      {firstItem?.product.name ??
                        "No product"}
                      {order.items.length > 1
                        ? ` + ${order.items.length - 1} more`
                        : ""}
                    </div>

                  </div>

                  <div className="hidden text-right sm:block">
                    <div className="text-sm font-extrabold text-slate-900">
                      {money(order.totalPaise)}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-400">
                      {itemCount} item
                      {itemCount !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="hidden text-right md:block">
                    <div className="text-xs font-semibold text-slate-600">
                      {date(order.createdAt)}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-400">
                      {order.paymentMethod}
                    </div>
                  </div>

                  <ArrowRight
                    size={17}
                    className="shrink-0 text-slate-300"
                  />

                </button>
              );
            })}

            {data?.orders.length === 0 && (
              <div className="p-14 text-center">
                <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />

                <p className="mt-3 text-sm font-bold text-slate-500">
                  No orders found.
                </p>
              </div>
            )}

          </div>
        </section>

      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-[80]">

          <button
            type="button"
            aria-label="Close order details"
            onClick={() => setSelected(null)}
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-[620px] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">

            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-xl">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Order details
                  </div>

                  <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                    #{selected.id.slice(-8).toUpperCase()}
                  </h2>

                  <div className="mt-2">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Close
                </button>

              </div>

            </div>

            <div className="space-y-6 p-6">

              {/* Consumer */}
              <DetailSection title="Consumer">

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm font-extrabold text-slate-900">
                    {selected.consumer.name}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {selected.consumer.email}
                  </div>

                  {selected.consumer.phone && (
                    <div className="mt-1 text-xs text-slate-500">
                      {selected.consumer.phone}
                    </div>
                  )}
                </div>

              </DetailSection>

              {/* Products */}
              <DetailSection title="Products">

                <div className="space-y-3">

                  {selected.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >

                      <div className="flex justify-between gap-4">

                        <div>
                          <div className="text-sm font-extrabold text-slate-900">
                            {item.product.name}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {item.product.variety ||
                              item.product.unit}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-slate-900">
                            {money(item.linePaise)}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-400">
                            {item.qty} {item.product.unit}
                          </div>
                        </div>

                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          {item.fulfillmentChannel ===
                          "SOCIETY"
                            ? "Society"
                            : "Direct farmer"}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          Farmer:{" "}
                          {item.product.farmer.user.name}
                        </span>

                        {item.society && (
                          <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700">
                            {item.society.name}
                          </span>
                        )}

                      </div>

                    </div>
                  ))}

                </div>

              </DetailSection>

              {/* Logistics */}
              <DetailSection title="Logistics">

                {selected.bookings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs font-semibold text-slate-400">
                    No logistics booking recorded for this order.
                  </div>
                ) : (
                  <div className="space-y-3">

                    {selected.bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >

                        <div className="flex items-center justify-between gap-3">

                          <div>
                            <div className="text-sm font-extrabold text-slate-900">
                              {booking.pickup}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {booking.vehicle}
                            </div>
                          </div>

                          <StatusBadge status={booking.status} />

                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">

                          <Info
                            label="Route"
                            value={
                              booking.fulfillmentChannel ===
                              "SOCIETY"
                                ? booking.society?.name ??
                                  "Society"
                                : booking.farmer.farmName
                            }
                          />

                          <Info
                            label="Quantity"
                            value={String(booking.quantity)}
                          />

                          <Info
                            label="Agent"
                            value={
                              booking.assignedUser?.name ??
                              "Unassigned"
                            }
                          />

                          <Info
                            label="GPS"
                            value={
                              booking.currentLat != null &&
                              booking.currentLng != null
                                ? `${booking.currentLat.toFixed(
                                    5,
                                  )}, ${booking.currentLng.toFixed(
                                    5,
                                  )}`
                                : "Unavailable"
                            }
                          />

                        </div>

                      </div>
                    ))}

                  </div>
                )}

              </DetailSection>

              {/* Payments */}
              <DetailSection title="Payments">

                {selected.payments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs font-semibold text-slate-400">
                    No payment record attached.
                  </div>
                ) : (
                  <div className="space-y-3">

                    {selected.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >

                        <div className="flex items-center justify-between">

                          <div>
                            <div className="text-sm font-extrabold text-slate-900">
                              {money(payment.amountPaise)}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {payment.provider}
                              {" · "}
                              {payment.method ||
                                "Payment method unavailable"}
                            </div>
                          </div>

                          <StatusBadge
                            status={payment.status}
                          />

                        </div>

                      </div>
                    ))}

                  </div>
                )}

              </DetailSection>

              {/* Timeline */}
              <DetailSection title="Order timeline">

                <div className="space-y-3">

                  <Info
                    label="Created"
                    value={date(selected.createdAt)}
                  />

                  <Info
                    label="Last updated"
                    value={date(selected.updatedAt)}
                  />

                </div>

              </DetailSection>

            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
        {title}
      </h3>

      {children}
    </section>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-xs font-bold text-slate-700">
        {value}
      </div>
    </div>
  );
}
