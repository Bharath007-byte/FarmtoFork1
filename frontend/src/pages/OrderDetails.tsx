import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Copy,
  CreditCard,
  MapPin,
  Package,
  Phone,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { api, ApiError, rupees } from "../services/api";
import { useRealtime } from "../hooks/useRealtime";

type OrderItem = {
  id: string;
  product: {
    id?: string;
    name: string;
    imageUrl?: string | null;
    unit?: string;
    pricePaise?: number;
  };
  qty: number;
  unitPaise?: number;
  linePaise?: number;
};

type Address = {
  id?: string;
  label?: string | null;
  recipient?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  district?: string | null;
  state?: string;
  pinCode?: string;
  phone?: string | null;
};

type Payment = {
  id: string;
  provider: string;
  providerOrder?: string | null;
  providerPayId?: string | null;
  amountPaise: number;
  currency: string;
  method?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

type FarmerUser = {
  id: string;
  name: string;
  phone?: string | null;
  photoUrl?: string | null;
};

type Farmer = {
  id: string;
  farmName: string;
  district?: string;
  state?: string;
  location?: string;
  user: FarmerUser;
};

type AssignedUser = {
  id: string;
  name: string;
  phone?: string | null;
  photoUrl?: string | null;
  deliveryType?: string | null;
  vehicleNumber?: string | null;
};

type Society = {
  id: string;
  name: string;
  code: string;
  address: string;
  village?: string | null;
  district: string;
  state: string;
  pinCode: string;
  phone?: string | null;
  email?: string | null;
};

type DeliverySlot = {
  id: string;
  date?: string;
  startTime?: string;
  endTime?: string;
};

type Booking = {
  id: string;
  status: string;
  pickup: string;
  quantity: number;
  vehicle: string;
  currentLat: number | null;
  currentLng: number | null;
  locationUpdatedAt: string | null;
  acceptedAt?: string | null;
  farmerReadyAt?: string | null;
  pickedUpAt?: string | null;
  inTransitAt?: string | null;
  deliveredAt?: string | null;
  farmer?: Farmer | null;
  assignedUser?: AssignedUser | null;
  society?: Society | null;
  slot?: DeliverySlot | null;
};

type Order = {
  id: string;
  status: string;
  totalPaise: number;
  platformFeePaise?: number;
  logisticsPaise?: number;
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  items: OrderItem[];
  payments: Payment[];
  address?: Address | null;
  bookings: Booking[];
};

function formatOrderId(id: string) {
  if (id.startsWith("#")) return id;

  return `#F2F-${id.slice(-8).toUpperCase()}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function getStatusClasses(status: string) {
  if (status === "DELIVERED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "CANCELLED" || status === "FAILED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "PENDING_PAYMENT") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function getPaymentLabel(order: Order) {
  if (order.paymentMethod === "COD" || order.status === "COD_PENDING") {
    return "Cash on Delivery";
  }

  return "Online Payment";
}

function getPaymentStatus(order: Order) {
  const latest = [...order.payments]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )[0];

  if (!latest) {
    if (order.paymentMethod === "COD") {
      return "Pay on delivery";
    }

    return order.status === "PENDING_PAYMENT"
      ? "Payment pending"
      : "No payment record";
  }

  switch (latest.status) {
    case "CAPTURED":
      return "Payment captured";
    case "AUTHORIZED":
      return "Payment authorized";
    case "CREATED":
      return "Payment created";
    case "FAILED":
      return "Payment failed";
    case "REFUNDED":
      return "Payment refunded";
    default:
      return latest.status;
  }
}

function getPickupLabel(booking: Booking) {
  if (booking.society) {
    return booking.society.name;
  }

  if (booking.farmer) {
    return booking.farmer.farmName;
  }

  return booking.pickup || "Pickup location not available";
}

function getBookingType(booking: Booking) {
  if (booking.society) {
    return "Cooperative Society";
  }

  if (booking.farmer) {
    return "Direct Farmer";
  }

  return "Pickup";
}

function ProductImage({ item }: { item: OrderItem }) {
  if (item.product.imageUrl) {
    return (
      <img
        src={item.product.imageUrl}
        alt={item.product.name}
        className="h-20 w-20 rounded-2xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#eef4f8] text-[#315a78]">
      <Package size={28} />
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f8] text-[#315a78]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
          {label}
        </p>

        <div className="mt-1 text-sm font-semibold text-[#17232d]">
          {value}
        </div>
      </div>
    </div>
  );
}

export function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) {
      setError("Order ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await api<{ order: Order }>(
        `/api/orders/${encodeURIComponent(id)}`
      );

      setOrder(data.order);
      setError("");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Unable to load this order."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useRealtime(
    [
      "ORDER_STATUS_CHANGED",
      "PAYMENT_CONFIRMED",
      "LOGISTICS_STATUS_CHANGED",
      "LOGISTICS_LOCATION_UPDATED",
    ],
    loadOrder
  );

  const copyOrderId = async () => {
    if (!order) return;

    try {
      await navigator.clipboard.writeText(order.id);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f9] text-[#17232d]">
        <SiteNav />

        <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-200" />

          <div className="mt-6 h-48 animate-pulse rounded-3xl bg-white" />

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="h-96 animate-pulse rounded-3xl bg-white" />
            <div className="h-96 animate-pulse rounded-3xl bg-white" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#f4f7f9] text-[#17232d]">
        <SiteNav />

        <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 pt-24">
          <div className="w-full rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <XCircle className="mx-auto text-rose-500" size={44} />

            <h1 className="mt-4 text-2xl font-black">
              Unable to load order
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              {error || "This order could not be found."}
            </p>

            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#315a78] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#264963]"
            >
              <ArrowLeft size={16} />
              Back to Orders
            </button>
          </div>
        </main>
      </div>
    );
  }

  const latestPayment = [...order.payments].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  )[0];

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#17232d]">
      <SiteNav />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#dce4ea] bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:border-[#315a78] hover:text-[#315a78]"
          >
            <ArrowLeft size={16} />
            Orders & Deliveries
          </button>

          <button
            type="button"
            onClick={() => void loadOrder()}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#dce4ea] bg-white px-4 py-2.5 text-xs font-bold text-zinc-600 transition hover:text-[#315a78]"
          >
            Refresh order
          </button>
        </div>

        {/* ORDER SUMMARY */}
        <section className="overflow-hidden rounded-3xl border border-[#dce4ea] bg-white shadow-[0_18px_55px_rgba(31,55,72,0.06)]">
          <div className="flex flex-col gap-5 border-b border-[#e7edf1] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#315a78]">
                Order Details
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  {formatOrderId(order.id)}
                </h1>

                <button
                  type="button"
                  onClick={() => void copyOrderId()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1f5f8] px-2.5 py-1.5 text-[11px] font-bold text-zinc-600 transition hover:bg-[#e7edf2]"
                >
                  <Copy size={12} />
                  {copied ? "Copied" : "Copy ID"}
                </button>
              </div>

              <p className="mt-2 text-sm text-zinc-500">
                Placed {formatDate(order.createdAt)}
              </p>
            </div>

            <div
              className={`inline-flex w-fit items-center rounded-full border px-4 py-2 text-sm font-black ${getStatusClasses(
                order.status
              )}`}
            >
              {getStatusLabel(order.status)}
            </div>
          </div>

          {/* QUICK STATUS */}
          <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
            <InfoRow
              icon={<Package size={17} />}
              label="Order status"
              value={getStatusLabel(order.status)}
            />

            <InfoRow
              icon={<CreditCard size={17} />}
              label="Payment"
              value={getPaymentLabel(order)}
            />

            <InfoRow
              icon={<Clock3 size={17} />}
              label="Payment status"
              value={getPaymentStatus(order)}
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* PRODUCTS */}
            <section className="rounded-3xl border border-[#dce4ea] bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#315a78]">
                    Items
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Your farm-fresh produce
                  </h2>
                </div>

                <span className="rounded-full bg-[#f1f5f8] px-3 py-1.5 text-xs font-bold text-zinc-600">
                  {order.items.length}{" "}
                  {order.items.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="divide-y divide-[#edf1f4]">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <ProductImage item={item} />

                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-[#17232d]">
                        {item.product.name}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        {item.qty} ×{" "}
                        {item.product.unit || "unit"}
                      </p>

                      {typeof item.unitPaise === "number" && (
                        <p className="mt-1 text-xs font-medium text-zinc-400">
                          {rupees(item.unitPaise)} per unit
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-black">
                        {typeof item.linePaise === "number"
                          ? rupees(item.linePaise)
                          : typeof item.unitPaise === "number"
                          ? rupees(item.unitPaise * item.qty)
                          : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FULFILLMENT */}
            <section className="rounded-3xl border border-[#dce4ea] bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#315a78]">
                  Fulfillment
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Pickup & delivery
                </h2>
              </div>

              {order.bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d6dfe6] bg-[#f8fafb] p-5 text-sm text-zinc-500">
                  <Truck className="mb-3 text-zinc-400" size={22} />

                  Logistics booking has not been created yet.
                  The page will update automatically when a real
                  booking is created.
                </div>
              ) : (
                <div className="space-y-4">
                  {order.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-[#e1e8ed] bg-[#fafcfd] p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusClasses(
                                booking.status
                              )}`}
                            >
                              {getStatusLabel(booking.status)}
                            </span>

                            <span className="rounded-full bg-[#eef3f6] px-3 py-1 text-[11px] font-bold text-zinc-600">
                              {getBookingType(booking)}
                            </span>
                          </div>

                          <h3 className="mt-3 text-base font-black">
                            {getPickupLabel(booking)}
                          </h3>

                          <p className="mt-1 text-sm text-zinc-500">
                            {booking.pickup || "Pickup location recorded in logistics booking"}
                          </p>
                        </div>

                        <Link
                          to={`/orders/${order.id}/track`}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#315a78] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#264963]"
                        >
                          <MapPin size={14} />
                          Track
                        </Link>
                      </div>

                      <div className="mt-5 grid gap-4 border-t border-[#e5ebef] pt-5 sm:grid-cols-2">
                        <InfoRow
                          icon={<Package size={16} />}
                          label="Quantity"
                          value={`${booking.quantity}`}
                        />

                        <InfoRow
                          icon={<Truck size={16} />}
                          label="Vehicle"
                          value={booking.vehicle || "Not assigned"}
                        />

                        <InfoRow
                          icon={<MapPin size={16} />}
                          label="Pickup"
                          value={getPickupLabel(booking)}
                        />

                        <InfoRow
                          icon={<Clock3 size={16} />}
                          label="Last location update"
                          value={formatDate(
                            booking.locationUpdatedAt
                          )}
                        />
                      </div>

                      {/* FARMER / SOCIETY */}
                      {booking.society && (
                        <div className="mt-5 rounded-2xl bg-[#f4f7f9] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                            Collection Centre
                          </p>

                          <p className="mt-1 font-black">
                            {booking.society.name}
                          </p>

                          <p className="mt-1 text-sm text-zinc-500">
                            {booking.society.address},{" "}
                            {booking.society.district},{" "}
                            {booking.society.state}{" "}
                            {booking.society.pinCode}
                          </p>
                        </div>
                      )}

                      {booking.farmer && (
                        <div className="mt-5 rounded-2xl bg-[#f4f7f9] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                            Farmer
                          </p>

                          <div className="mt-2 flex items-center gap-3">
                            {booking.farmer.user.photoUrl ? (
                              <img
                                src={booking.farmer.user.photoUrl}
                                alt={booking.farmer.user.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#315a78]">
                                <UserRound size={18} />
                              </div>
                            )}

                            <div>
                              <p className="font-black">
                                {booking.farmer.farmName}
                              </p>

                              <p className="text-xs text-zinc-500">
                                {booking.farmer.user.name}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* LOGISTICS WORKER */}
                      {booking.assignedUser && (
                        <div className="mt-5 rounded-2xl border border-[#e1e8ed] bg-white p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                            Delivery Agent
                          </p>

                          <div className="mt-3 flex items-center gap-3">
                            {booking.assignedUser.photoUrl ? (
                              <img
                                src={booking.assignedUser.photoUrl}
                                alt={booking.assignedUser.name}
                                className="h-11 w-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef3f6] text-[#315a78]">
                                <UserRound size={19} />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-black">
                                {booking.assignedUser.name}
                              </p>

                              {booking.assignedUser.deliveryType && (
                                <p className="text-xs text-zinc-500">
                                  {booking.assignedUser.deliveryType ===
                                  "LARGE_TRUCK"
                                    ? "Large Transport"
                                    : "Delivery Agent"}
                                </p>
                              )}

                              {booking.assignedUser.vehicleNumber && (
                                <p className="text-xs font-bold text-zinc-500">
                                  Vehicle:{" "}
                                  {booking.assignedUser.vehicleNumber}
                                </p>
                              )}
                            </div>

                            {booking.assignedUser.phone && (
                              <a
                                href={`tel:${booking.assignedUser.phone}`}
                                className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3f6] text-[#315a78] transition hover:bg-[#e3ebf0]"
                                aria-label="Call delivery agent"
                              >
                                <Phone size={15} />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* ADDRESS */}
            <section className="rounded-3xl border border-[#dce4ea] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#315a78]">
                Delivery address
              </p>

              <h2 className="mt-1 text-xl font-black">
                Where we're delivering
              </h2>

              {order.address ? (
                <div className="mt-5 rounded-2xl bg-[#f6f8fa] p-4">
                  <div className="flex gap-3">
                    <MapPin
                      size={19}
                      className="mt-0.5 shrink-0 text-[#315a78]"
                    />

                    <div className="text-sm leading-6">
                      {order.address.recipient && (
                        <p className="font-black">
                          {order.address.recipient}
                        </p>
                      )}

                      {order.address.line1 && (
                        <p>{order.address.line1}</p>
                      )}

                      {order.address.line2 && (
                        <p>{order.address.line2}</p>
                      )}

                      <p>
                        {[
                          order.address.city,
                          order.address.district,
                          order.address.state,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>

                      {order.address.pinCode && (
                        <p className="font-bold">
                          PIN {order.address.pinCode}
                        </p>
                      )}

                      {order.address.phone && (
                        <p className="mt-2 text-xs font-semibold text-zinc-500">
                          Phone: {order.address.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-5 rounded-2xl bg-[#f6f8fa] p-4 text-sm text-zinc-500">
                  No delivery address is attached to this order.
                </p>
              )}
            </section>

            {/* PAYMENT */}
            <section className="rounded-3xl border border-[#dce4ea] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#315a78]">
                Payment
              </p>

              <h2 className="mt-1 text-xl font-black">
                Payment summary
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">
                    Payment method
                  </span>

                  <span className="font-bold">
                    {getPaymentLabel(order)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">
                    Payment status
                  </span>

                  <span className="font-bold">
                    {getPaymentStatus(order)}
                  </span>
                </div>

                {typeof order.platformFeePaise === "number" && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">
                      Platform fee
                    </span>

                    <span className="font-semibold">
                      {rupees(order.platformFeePaise)}
                    </span>
                  </div>
                )}

                {typeof order.logisticsPaise === "number" && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">
                      Logistics
                    </span>

                    <span className="font-semibold">
                      {rupees(order.logisticsPaise)}
                    </span>
                  </div>
                )}

                <div className="border-t border-[#e5ebef] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-black">
                      Total
                    </span>

                    <span className="text-2xl font-black text-[#17232d]">
                      {rupees(order.totalPaise)}
                    </span>
                  </div>
                </div>
              </div>

              {latestPayment?.providerOrder && (
                <div className="mt-5 rounded-2xl bg-[#f6f8fa] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
                    Payment reference
                  </p>

                  <p className="mt-1 break-all font-mono text-xs text-zinc-600">
                    {latestPayment.providerOrder}
                  </p>
                </div>
              )}
            </section>

            {/* TRACKING CTA */}
            {order.bookings.length > 0 &&
              order.status !== "CANCELLED" &&
              order.status !== "FAILED" && (
                <section className="rounded-3xl bg-[#315a78] p-6 text-white shadow-[0_18px_50px_rgba(49,90,120,0.2)]">
                  <Truck size={25} />

                  <h2 className="mt-4 text-xl font-black">
                    Track this delivery
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/75">
                    Follow the real logistics status and GPS
                    location when the delivery agent has shared
                    one.
                  </p>

                  <Link
                    to={`/orders/${order.id}/track`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-[#315a78] transition hover:bg-zinc-100"
                  >
                    <MapPin size={16} />
                    Open Live Tracking
                  </Link>
                </section>
              )}

            {/* REALTIME INDICATOR */}
            <div className="flex items-center gap-2 px-2 text-xs font-semibold text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Order details update automatically when backend
              events are received.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
