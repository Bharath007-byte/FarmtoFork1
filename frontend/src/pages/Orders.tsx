import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  MapPin,
  PackageCheck,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { api, ApiError, rupees } from "../services/api";
import { useRealtime } from "../hooks/useRealtime";

type OrderStatus =
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
  | "FAILED"
  | string;

type OrderItem = {
  product: {
    name: string;
    imageUrl?: string | null;
  };
  qty: number;
};

type Booking = {
  id: string;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  locationUpdatedAt: string | null;
};

type Address = {
  line1?: string;
  line2?: string | null;
  city?: string;
  district?: string | null;
  state?: string;
  pinCode?: string;
};

type Order = {
  id: string;
  status: OrderStatus;
  totalPaise: number;
  createdAt: string;
  paymentMethod?: string;
  items: OrderItem[];
  bookings?: Booking[];
  address?: Address | null;
};

type Tab = "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED";

const PRIMARY_STEPS = [
  {
    key: "PLACED",
    label: "Order Placed",
  },
  {
    key: "PREPARING",
    label: "Preparing",
  },
  {
    key: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
  },
  {
    key: "DELIVERED",
    label: "Delivered",
  },
];

const PAYMENT_STEPS = [
  {
    key: "PAYMENT",
    label: "Payment",
  },
  {
    key: "CONFIRMED",
    label: "Order Confirmed",
  },
  {
    key: "PREPARING",
    label: "Preparing",
  },
  {
    key: "DELIVERED",
    label: "Delivered",
  },
];

function isCompleted(status: string) {
  return status === "DELIVERED";
}

function isCancelled(status: string) {
  return status === "CANCELLED" || status === "FAILED";
}

function isPendingPayment(status: string) {
  return status === "PENDING_PAYMENT";
}

function isActive(status: string) {
  return (
    !isCompleted(status) &&
    !isCancelled(status) &&
    !isPendingPayment(status)
  );
}

function getOrderProgress(status: string) {
  if (status === "PENDING_PAYMENT") return 0;
  if (status === "COD_PENDING") return 0;
  if (status === "PAID") return 0;
  if (status === "ACCEPTED") return 0;
  if (status === "PREPARING") return 1;
  if (status === "READY_FOR_PICKUP") return 1;
  if (status === "PICKED_UP") return 2;
  if (status === "IN_TRANSIT") return 2;
  if (status === "OUT_FOR_DELIVERY") return 2;
  if (status === "DELIVERED") return 3;

  return 0;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Pending Payment";
    case "COD_PENDING":
      return "COD Pending";
    case "PAID":
      return "Order Confirmed";
    case "ACCEPTED":
      return "Accepted";
    case "PREPARING":
      return "Preparing";
    case "READY_FOR_PICKUP":
      return "Ready for Pickup";
    case "PICKED_UP":
      return "Picked Up";
    case "IN_TRANSIT":
      return "In Transit";
    case "OUT_FOR_DELIVERY":
      return "Out for Delivery";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    case "FAILED":
      return "Payment Failed";
    default:
      return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

function getStatusTone(status: string) {
  if (status === "PENDING_PAYMENT" || status === "FAILED") {
    return "bg-rose-50 text-rose-600 border-rose-100";
  }

  if (status === "CANCELLED") {
    return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }

  if (status === "DELIVERED") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  return "bg-amber-50 text-amber-700 border-amber-100";
}

function getProgressMessage(status: string) {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Complete payment to confirm your order.";
    case "COD_PENDING":
      return "Farmer will prepare your order soon.";
    case "PAID":
    case "ACCEPTED":
      return "Your order has been confirmed and will be prepared soon.";
    case "PREPARING":
      return "The farmer is preparing your fresh produce.";
    case "READY_FOR_PICKUP":
      return "Your order is ready for pickup.";
    case "PICKED_UP":
      return "Your produce has been picked up.";
    case "IN_TRANSIT":
      return "Your order is on the way to you.";
    case "OUT_FOR_DELIVERY":
      return "Your order is out for delivery.";
    case "DELIVERED":
      return "Your order was delivered successfully.";
    case "CANCELLED":
      return "This order was cancelled.";
    case "FAILED":
      return "The payment for this order failed.";
    default:
      return "Your order is being processed.";
  }
}

function getPaymentLabel(order: Order) {
  if (order.paymentMethod === "COD" || order.status === "COD_PENDING") {
    return "Cash on Delivery";
  }

  return "Online Payment";
}

function getFirstProduct(order: Order) {
  return order.items[0]?.product?.name || "Farm produce";
}

function getItemsSummary(order: Order) {
  const first = order.items[0];

  if (!first) return "Farm produce";

  const extra = order.items.length - 1;

  if (extra > 0) {
    return `${first.product.name} + ${extra} more`;
  }

  return first.product.name;
}

function getImage(order: Order) {
  return order.items[0]?.product?.imageUrl || "";
}

function formatOrderId(id: string) {
  if (id.startsWith("#")) return id;

  return `#F2F-${id.slice(-8).toUpperCase()}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStepState(
  order: Order,
  index: number
): "complete" | "current" | "upcoming" {
  if (order.status === "PENDING_PAYMENT") {
    if (index === 0) return "current";
    return "upcoming";
  }

  if (order.status === "CANCELLED" || order.status === "FAILED") {
    if (index === 0) return "current";
    return "upcoming";
  }

  const progress = getOrderProgress(order.status);

  if (index < progress) return "complete";
  if (index === progress) return "current";

  return "upcoming";
}

function StepIcon({
  state,
}: {
  state: "complete" | "current" | "upcoming";
}) {
  if (state === "complete") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16823f] text-white shadow-sm">
        <Check size={14} strokeWidth={3} />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-[#16823f] bg-white">
        <span className="h-2.5 w-2.5 rounded-full bg-[#16823f]" />
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-300 bg-white">
      <span className="h-2 w-2 rounded-full bg-zinc-300" />
    </span>
  );
}

function OrderProgress({ order }: { order: Order }) {
  const steps =
    order.status === "PENDING_PAYMENT"
      ? PAYMENT_STEPS
      : PRIMARY_STEPS;

  if (order.status === "CANCELLED" || order.status === "FAILED") {
    return (
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white">
          <X size={14} strokeWidth={3} />
        </span>
        <span className="text-xs font-semibold text-rose-600">
          {order.status === "FAILED" ? "Payment Failed" : "Order Cancelled"}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const state = getStepState(order, index);

          return (
            <div
              key={step.key}
              className="flex min-w-0 flex-1 items-center"
            >
              <div className="flex min-w-0 flex-col items-center">
                <StepIcon state={state} />

                <span
                  className={[
                    "mt-2 whitespace-nowrap text-[10px] font-semibold sm:text-[11px]",
                    state === "complete" || state === "current"
                      ? "text-[#16823f]"
                      : "text-zinc-400",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={[
                    "mx-1 mt-[-20px] h-[2px] flex-1",
                    state === "complete"
                      ? "bg-[#16823f]"
                      : "bg-zinc-200",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductThumbnail({ order }: { order: Order }) {
  const image = getImage(order);

  if (image) {
    return (
      <img
        src={image}
        alt={getFirstProduct(order)}
        className="h-[88px] w-[88px] rounded-2xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-2xl bg-[#eef7ed] text-[#16823f]">
      <ShoppingBag size={32} />
    </div>
  );
}

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      setLoading(true);

      const data = await api<{ orders: Order[] }>("/api/orders");

      setOrders(data.orders);
      setError("");

      setSelectedId((current) => {
        if (current && data.orders.some((order) => order.id === current)) {
          return current;
        }

        return data.orders[0]?.id || null;
      });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Unable to load your orders."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useRealtime(
    [
      "ORDER_STATUS_CHANGED",
      "PAYMENT_CONFIRMED",
      "LOGISTICS_STATUS_CHANGED",
      "LOGISTICS_LOCATION_UPDATED",
    ],
    load
  );

  const counts = useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter((order) => isActive(order.status)).length,
      completed: orders.filter((order) => isCompleted(order.status)).length,
      cancelled: orders.filter((order) => isCancelled(order.status)).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const tabMatch =
        tab === "ALL" ||
        (tab === "ACTIVE" && isActive(order.status)) ||
        (tab === "COMPLETED" && isCompleted(order.status)) ||
        (tab === "CANCELLED" && isCancelled(order.status));

      if (!tabMatch) return false;

      if (!query) return true;

      const searchable = [
        order.id,
        order.status,
        ...order.items.map((item) => item.product.name),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [orders, tab, search]);

  const selectedOrder =
    orders.find((order) => order.id === selectedId) ||
    filteredOrders[0] ||
    null;

  const cancelOrder = async (order: Order) => {
    if (cancellingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmed) return;

    try {
      setCancellingId(order.id);
      setError("");

      await api(`/api/orders/${order.id}/cancel`, {
        method: "POST",
      });

      await load();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Unable to cancel this order."
      );
    } finally {
      setCancellingId(null);
    }
  };

  const copyOrderId = async () => {
    if (!selectedOrder) return;

    try {
      await navigator.clipboard.writeText(selectedOrder.id);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  const tabs: {
    key: Tab;
    label: string;
    count: number;
  }[] = [
    {
      key: "ALL",
      label: "All Orders",
      count: counts.all,
    },
    {
      key: "ACTIVE",
      label: "Active",
      count: counts.active,
    },
    {
      key: "COMPLETED",
      label: "Completed",
      count: counts.completed,
    },
    {
      key: "CANCELLED",
      label: "Cancelled",
      count: counts.cancelled,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f8f2] text-[#17251e]">
      <SiteNav />

      <div className="mx-auto flex max-w-[1500px] gap-0 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        {/* LEFT NAVIGATION */}
        <aside className="hidden w-[215px] shrink-0 lg:block">
          <div className="sticky top-24 rounded-3xl border border-[#dce9dd] bg-white/80 p-3 shadow-[0_15px_50px_rgba(28,75,40,0.05)] backdrop-blur">
            <div className="mb-4 px-3 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e2f3df] text-[#16823f]">
                  <span className="text-xl">🌿</span>
                </div>

                <div>
                  <p className="text-lg font-black tracking-tight text-[#17251e]">
                    Farm<span className="text-[#16823f]">2</span>Fork
                  </p>
                  <p className="text-[9px] font-semibold text-zinc-500">
                    From Our Farms To Your Table
                  </p>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              <Link
                to="/"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-[#edf7eb] hover:text-[#16823f]"
              >
                <ShoppingBag size={18} />
                Home
              </Link>

              <Link
                to="/shop"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-[#edf7eb] hover:text-[#16823f]"
              >
                <ShoppingBag size={18} />
                Shop
              </Link>

              <Link
                to="/shop"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-[#edf7eb] hover:text-[#16823f]"
              >
                <PackageCheck size={18} />
                Categories
              </Link>

              <div className="flex items-center gap-3 rounded-xl bg-[#e6f5e4] px-3 py-3 text-sm font-bold text-[#16823f]">
                <Truck size={18} />
                Orders & Deliveries
              </div>

              <Link
                to="/checkout"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-[#edf7eb] hover:text-[#16823f]"
              >
                <MapPin size={18} />
                Address Book
              </Link>
            </nav>

            <div className="mt-10 rounded-2xl bg-[#edf7eb] p-4">
              <div className="mb-3 text-2xl">🌱</div>

              <p className="text-sm font-bold text-[#176b38]">
                Fresh Food
                <br />
                Stronger Bharat
              </p>

              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Support our farmers and choose direct farm-to-home produce.
              </p>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="min-w-0 flex-1 lg:pl-7">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_365px]">
            {/* ORDERS COLUMN */}
            <section className="min-w-0">
              <div className="mb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-[#16823f]">
                      Farm to doorstep
                    </p>

                    <h1 className="text-4xl font-black tracking-[-0.04em] text-[#17251e] sm:text-5xl">
                      Orders & Deliveries
                    </h1>

                    <p className="mt-2 text-sm text-zinc-500 sm:text-base">
                      Track your farm-fresh orders from farm to doorstep.
                    </p>
                  </div>

                  <Link
                    to="/shop"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16823f] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-[#116d34]"
                  >
                    Shop fresh produce
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>

              {/* SEARCH */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search orders, products or order ID..."
                    className="h-12 w-full rounded-2xl border border-[#dce8dd] bg-white pl-11 pr-4 text-sm font-medium outline-none transition placeholder:text-zinc-400 focus:border-[#16823f] focus:ring-4 focus:ring-[#16823f]/10"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void load()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dce8dd] bg-white px-5 text-sm font-bold text-zinc-600 transition hover:border-[#16823f] hover:text-[#16823f]"
                >
                  <RotateCcw size={16} />
                  Refresh
                </button>
              </div>

              {/* TABS */}
              <div className="mb-5 flex gap-2 overflow-x-auto border-b border-[#dce8dd] pb-0">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={[
                      "relative whitespace-nowrap px-3 py-3 text-sm font-bold transition",
                      tab === item.key
                        ? "text-[#16823f]"
                        : "text-zinc-500 hover:text-zinc-800",
                    ].join(" ")}
                  >
                    {item.label}{" "}
                    <span
                      className={
                        tab === item.key
                          ? "text-[#16823f]"
                          : "text-zinc-400"
                      }
                    >
                      ({item.count})
                    </span>

                    {tab === item.key && (
                      <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] rounded-full bg-[#16823f]" />
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-600">
                  {error}
                </div>
              )}

              {/* LOADING */}
              {loading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-[220px] animate-pulse rounded-3xl border border-[#dce8dd] bg-white"
                    />
                  ))}
                </div>
              )}

              {/* EMPTY */}
              {!loading && filteredOrders.length === 0 && (
                <div className="rounded-3xl border border-[#dce8dd] bg-white px-6 py-16 text-center shadow-[0_15px_45px_rgba(28,75,40,0.04)]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf7eb] text-[#16823f]">
                    <ShoppingBag size={28} />
                  </div>

                  <h2 className="mt-5 text-xl font-black">
                    No orders here yet
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                    {tab === "ALL"
                      ? "Your farm-fresh orders will appear here after checkout."
                      : `You don't have any ${tab.toLowerCase()} orders right now.`}
                  </p>

                  <Link
                    to="/shop"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#16823f] px-5 py-3 text-sm font-bold text-white"
                  >
                    Explore fresh produce
                    <ChevronRight size={16} />
                  </Link>
                </div>
              )}

              {/* ORDER CARDS */}
              {!loading && filteredOrders.length > 0 && (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const pendingPayment = isPendingPayment(order.status);
                    const cancelled = isCancelled(order.status);
                    const delivered = isCompleted(order.status);

                    return (
                      <article
                        key={order.id}
                        onClick={() => setSelectedId(order.id)}
                        className={[
                          "group cursor-pointer rounded-3xl border bg-white p-4 shadow-[0_12px_45px_rgba(28,75,40,0.05)] transition duration-200 sm:p-5",
                          selectedOrder?.id === order.id
                            ? "border-[#16823f] ring-2 ring-[#16823f]/10"
                            : "border-[#dce8dd] hover:-translate-y-0.5 hover:border-[#a9d0ad]",
                        ].join(" ")}
                      >
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                          {/* PRODUCT */}
                          <div className="flex gap-4">
                            <ProductThumbnail order={order} />

                            <div className="min-w-0">
                              <div className="flex items-start justify-between gap-2 lg:block">
                                <p className="text-xs font-black text-[#26362d]">
                                  {formatOrderId(order.id)}
                                </p>

                                <span
                                  className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black lg:mt-3 ${getStatusTone(
                                    order.status
                                  )}`}
                                >
                                  {getStatusLabel(order.status)}
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-zinc-400">
                                {shortDate(order.createdAt)}
                              </p>

                              <h2 className="mt-4 text-base font-black text-[#17251e]">
                                {getItemsSummary(order)}
                              </h2>

                              <p className="mt-1 text-xs font-medium text-zinc-500">
                                {order.items.length === 1
                                  ? `${order.items[0].qty} × ${
                                      order.items[0].product.name
                                    }`
                                  : `${order.items.length} products`}
                              </p>

                              <p className="mt-3 text-xl font-black text-[#17251e]">
                                {rupees(order.totalPaise)}
                              </p>
                            </div>
                          </div>

                          {/* STATUS + ACTIONS */}
                          <div className="min-w-0">
                            <div className="mb-5">
                              <OrderProgress order={order} />
                            </div>

                            <div
                              className={[
                                "mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold",
                                pendingPayment
                                  ? "bg-rose-50 text-rose-600"
                                  : cancelled
                                  ? "bg-zinc-100 text-zinc-500"
                                  : delivered
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-[#edf7eb] text-[#277542]",
                              ].join(" ")}
                            >
                              {pendingPayment ? (
                                <Bell size={15} className="mt-0.5 shrink-0" />
                              ) : cancelled ? (
                                <X size={15} className="mt-0.5 shrink-0" />
                              ) : delivered ? (
                                <Check
                                  size={15}
                                  className="mt-0.5 shrink-0"
                                />
                              ) : (
                                <Truck
                                  size={15}
                                  className="mt-0.5 shrink-0"
                                />
                              )}

                              <span>
                                {getProgressMessage(order.status)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Link
  to={`/orders/${order.id}`}
  onClick={(event) => {
    event.stopPropagation();
  }}
  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#b8d5bd] bg-white px-4 py-2.5 text-xs font-bold text-[#176b38] transition hover:bg-[#f1f8ef]"
>
  View Details
</Link>

                              {!cancelled && !delivered && (
                                <Link
  to={`/orders/${order.id}/track`}
  onClick={(event) => {
    event.stopPropagation();
  }}
                                  className={[
                                    "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition",
                                    order.bookings?.[0]
                                      ? "bg-[#16823f] hover:bg-[#116d34]"
                                      : "pointer-events-none bg-zinc-300",
                                  ].join(" ")}
                                >
                                  Track Order
                                  <ChevronRight size={14} />
                                </Link>
                              )}

                              {pendingPayment && (
                                <span className="inline-flex items-center rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">
                                  Payment required
                                </span>
                              )}

                              {delivered && (
                                <Link
                                  to="/shop"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                  }}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#16823f] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#116d34]"
                                >
                                  Buy Again
                                </Link>
                              )}

                              {!cancelled &&
                                !delivered &&
                                [
                                  "PENDING_PAYMENT",
                                  "COD_PENDING",
                                  "PAID",
                                  "ACCEPTED",
                                  "PREPARING",
                                ].includes(order.status) && (
                                  <button
                                    type="button"
                                    disabled={cancellingId === order.id}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void cancelOrder(order);
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                                  >
                                    {cancellingId === order.id
                                      ? "Cancelling..."
                                      : "Cancel Order"}
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* RIGHT DETAILS PANEL */}
            <aside className="hidden xl:block">
              <div className="sticky top-24">
                {selectedOrder ? (
                  <div className="overflow-hidden rounded-3xl border border-[#dce8dd] bg-white shadow-[0_15px_55px_rgba(28,75,40,0.07)]">
                    {/* DETAILS HEADER */}
                    <div className="border-b border-[#e5eee5] px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf7eb] text-[#16823f]">
                          <ArrowLeft size={17} />
                        </span>

                        <h2 className="text-lg font-black">
                          Order Details
                        </h2>
                      </div>
                    </div>

                    {/* PRODUCT */}
                    <div className="border-b border-[#e5eee5] px-6 py-5">
                      <div className="flex items-center gap-4">
                        <ProductThumbnail order={selectedOrder} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black">
                                {getFirstProduct(selectedOrder)}
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {selectedOrder.items[0]?.qty || 0} ×{" "}
                                {selectedOrder.items[0]?.product.name || "Item"}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${getStatusTone(
                                selectedOrder.status
                              )}`}
                            >
                              {getStatusLabel(selectedOrder.status)}
                            </span>
                          </div>

                          <p className="mt-3 text-lg font-black text-[#17251e]">
                            {rupees(selectedOrder.totalPaise)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ORDER INFO */}
                    <div className="border-b border-[#e5eee5] px-6 py-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-medium text-zinc-500">
                            Order ID
                          </span>

                          <button
                            type="button"
                            onClick={() => void copyOrderId()}
                            className="inline-flex max-w-[210px] items-center gap-1 text-right text-xs font-bold text-[#17251e]"
                            title="Copy order ID"
                          >
                            <span className="truncate">
                              {formatOrderId(selectedOrder.id)}
                            </span>

                            {copied ? (
                              <Check
                                size={13}
                                className="shrink-0 text-[#16823f]"
                              />
                            ) : (
                              <Copy
                                size={13}
                                className="shrink-0 text-zinc-400"
                              />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-medium text-zinc-500">
                            Order Date
                          </span>

                          <span className="text-right text-xs font-bold">
                            {formatDate(selectedOrder.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-medium text-zinc-500">
                            Payment Method
                          </span>

                          <span className="text-right text-xs font-bold">
                            {getPaymentLabel(selectedOrder)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-medium text-zinc-500">
                            Total Amount
                          </span>

                          <span className="text-sm font-black text-[#17251e]">
                            {rupees(selectedOrder.totalPaise)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ADDRESS */}
                    <div className="border-b border-[#e5eee5] px-6 py-5">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-black">
                          Delivery Address
                        </h3>

                        <Link
                          to="/checkout"
                          className="text-xs font-bold text-[#16823f] hover:underline"
                        >
                          Change
                        </Link>
                      </div>

                      <div className="flex gap-3 rounded-2xl bg-[#f3f8f1] p-4">
                        <MapPin
                          size={18}
                          className="mt-0.5 shrink-0 text-[#16823f]"
                        />

                        <div className="text-xs leading-5 text-zinc-600">
                          {selectedOrder.address ? (
                            <>
                              <p className="font-bold text-[#17251e]">
                                {selectedOrder.address.city ||
                                  "Delivery location"}
                              </p>

                              <p>
                                {[
                                  selectedOrder.address.line1,
                                  selectedOrder.address.line2,
                                  selectedOrder.address.city,
                                  selectedOrder.address.state,
                                  selectedOrder.address.pinCode,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-[#17251e]">
                                Saved delivery address
                              </p>
                              <p>
                                Your selected checkout address is attached to
                                this order.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* FARMER MESSAGE */}
                    <div className="border-b border-[#e5eee5] px-6 py-5">
                      <div className="flex gap-3 rounded-2xl bg-[#eaf7e8] p-4">
                        <Truck
                          size={20}
                          className="mt-0.5 shrink-0 text-[#16823f]"
                        />

                        <div>
                          <p className="text-xs font-black text-[#176b38]">
                            {getProgressMessage(selectedOrder.status)}
                          </p>

                          <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                            You will be notified as your order moves through
                            each delivery stage.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TRACKING */}
                    <div className="px-6 py-5">
                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-sm font-black">
                          Order Tracking
                        </h3>

                        {selectedOrder.bookings?.some(
                          (booking) =>
                            booking.currentLat != null &&
                            booking.currentLng != null
                        ) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16823f]">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-[#16823f]" />
                            GPS available
                          </span>
                        )}
                      </div>

                      <div className="space-y-0">
                        {[
                          {
                            title: "Order Placed",
                            text: "Your order has been placed successfully.",
                            active: true,
                          },
                          {
                            title: "Preparing",
                            text: "Farmer is preparing your order.",
                            active:
                              selectedOrder.status === "PREPARING" ||
                              selectedOrder.status === "READY_FOR_PICKUP" ||
                              selectedOrder.status === "PICKED_UP" ||
                              selectedOrder.status === "IN_TRANSIT" ||
                              selectedOrder.status === "OUT_FOR_DELIVERY" ||
                              selectedOrder.status === "DELIVERED",
                          },
                          {
                            title: "Out for Delivery",
                            text:
                              selectedOrder.status === "OUT_FOR_DELIVERY"
                                ? "Your order is on the way."
                                : "Your order will be out for delivery after pickup.",
                            active:
                              selectedOrder.status === "OUT_FOR_DELIVERY" ||
                              selectedOrder.status === "DELIVERED",
                          },
                          {
                            title: "Delivered",
                            text:
                              selectedOrder.status === "DELIVERED"
                                ? "Order delivered successfully."
                                : "Order will be marked delivered after successful delivery.",
                            active: selectedOrder.status === "DELIVERED",
                          },
                        ].map((step, index, all) => (
                          <div
                            key={step.title}
                            className="relative flex gap-4"
                          >
                            <div className="relative flex w-5 justify-center">
                              <span
                                className={[
                                  "relative z-10 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-[3px]",
                                  step.active
                                    ? "border-[#16823f] bg-white"
                                    : "border-zinc-300 bg-white",
                                ].join(" ")}
                              >
                                {step.active && (
                                  <span className="h-2 w-2 rounded-full bg-[#16823f]" />
                                )}
                              </span>

                              {index < all.length - 1 && (
                                <span
                                  className={[
                                    "absolute left-1/2 top-5 h-[58px] w-[2px] -translate-x-1/2",
                                    all[index + 1].active
                                      ? "bg-[#16823f]"
                                      : "bg-zinc-200",
                                  ].join(" ")}
                                />
                              )}
                            </div>

                            <div className="pb-7">
                              <p
                                className={[
                                  "text-xs font-black",
                                  step.active
                                    ? "text-[#176b38]"
                                    : "text-zinc-400",
                                ].join(" ")}
                              >
                                {step.title}
                              </p>

                              <p className="mt-1 max-w-[250px] text-[11px] leading-5 text-zinc-500">
                                {step.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedOrder.status === "PENDING_PAYMENT" && (
                        <div className="mt-1 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                          <div className="flex gap-3">
                            <Clock3
                              size={18}
                              className="mt-0.5 shrink-0 text-rose-500"
                            />

                            <div>
                              <p className="text-xs font-black text-rose-600">
                                Payment is still pending
                              </p>

                              <p className="mt-1 text-[11px] leading-5 text-rose-500">
                                This order has not been confirmed yet. Complete
                                the online payment before another online order
                                can be placed.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SUPPORT */}
                    <div className="mx-5 mb-5 rounded-2xl bg-[#f1f8ef] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#16823f] shadow-sm">
                          <CircleHelp size={19} />
                        </div>

                        <div className="flex-1">
                          <p className="text-xs font-black text-[#176b38]">
                            Need help with this order?
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-500">
                            Contact Farm2Fork support.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            window.alert(
                              "Farm2Fork support will be connected here."
                            )
                          }
                          className="rounded-xl border border-[#9bc6a2] bg-white px-3 py-2 text-[10px] font-black text-[#176b38] transition hover:bg-[#eaf7e8]"
                        >
                          Get Help
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-[#dce8dd] bg-white p-8 text-center">
                    <ShoppingBag
                      size={30}
                      className="mx-auto text-[#16823f]"
                    />
                    <p className="mt-4 text-sm font-bold">
                      Select an order
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Order details will appear here.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* MOBILE SELECTED ORDER */}
      {selectedOrder && (
        <div className="mx-4 mb-10 xl:hidden">
          <div className="overflow-hidden rounded-3xl border border-[#dce8dd] bg-white shadow-[0_15px_55px_rgba(28,75,40,0.06)]">
            <div className="border-b border-[#e5eee5] px-5 py-4">
              <h2 className="text-lg font-black">Order Details</h2>
            </div>

            <div className="p-5">
              <div className="flex gap-4">
                <ProductThumbnail order={selectedOrder} />

                <div className="flex-1">
                  <p className="text-sm font-black">
                    {getFirstProduct(selectedOrder)}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {formatOrderId(selectedOrder.id)}
                  </p>

                  <p className="mt-2 text-lg font-black">
                    {rupees(selectedOrder.totalPaise)}
                  </p>
                </div>

                <span
                  className={`h-fit rounded-full border px-2.5 py-1 text-[10px] font-black ${getStatusTone(
                    selectedOrder.status
                  )}`}
                >
                  {getStatusLabel(selectedOrder.status)}
                </span>
              </div>

              <div className="mt-6 rounded-2xl bg-[#f3f8f1] p-4">
                <p className="text-xs font-black text-[#176b38]">
                  Order Tracking
                </p>

                <div className="mt-4">
                  <OrderProgress order={selectedOrder} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Payment
                  </p>
                  <p className="mt-1 text-xs font-black">
                    {getPaymentLabel(selectedOrder)}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Order Date
                  </p>
                  <p className="mt-1 text-xs font-black">
                    {shortDate(selectedOrder.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
