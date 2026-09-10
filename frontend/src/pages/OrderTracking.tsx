import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock3,
  MapPin,
  Package,
  Radio,
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
    name: string;
    imageUrl?: string | null;
  };
  qty: number;
};

type Address = {
  recipient?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  district?: string | null;
  state?: string;
  pinCode?: string;
};

type AssignedUser = {
  id: string;
  name: string;
  phone?: string | null;
  photoUrl?: string | null;
  deliveryType?: string | null;
  vehicleNumber?: string | null;
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

type Society = {
  id: string;
  name: string;
  code: string;
  address: string;
  village?: string | null;
  district: string;
  state: string;
  pinCode: string;
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
  society?: Society | null;
  assignedUser?: AssignedUser | null;
};

type Order = {
  id: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  updatedAt?: string;
  paymentMethod?: string;
  items: OrderItem[];
  address?: Address | null;
  bookings: Booking[];
};

type TimelineStep = {
  key: string;
  label: string;
  description: string;
};

const STEPS: TimelineStep[] = [
  {
    key: "CONFIRMED",
    label: "Order Confirmed",
    description: "Your order has been confirmed.",
  },
  {
    key: "PICKUP_SCHEDULED",
    label: "Pickup Scheduled",
    description: "Logistics has been scheduled for pickup.",
  },
  {
    key: "FARMER_READY",
    label: "Ready for Pickup",
    description: "The produce is ready to be collected.",
  },
  {
    key: "PICKED_UP",
    label: "Picked Up",
    description: "Your produce has been collected.",
  },
  {
    key: "IN_TRANSIT",
    label: "In Transit",
    description: "Your order is travelling to you.",
  },
  {
    key: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
    description: "The delivery agent is bringing your order.",
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    description: "Your order has been delivered.",
  },
];

function formatOrderId(id: string) {
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

function statusIndex(status: string) {
  const index = STEPS.findIndex((step) => step.key === status);

  if (index >= 0) return index;

  if (
    status === "PAID" ||
    status === "ACCEPTED" ||
    status === "PREPARING" ||
    status === "READY_FOR_PICKUP"
  ) {
    return status === "READY_FOR_PICKUP" ? 2 : 0;
  }

  return 0;
}

function statusLabel(status: string) {
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

function getPickupName(booking: Booking) {
  if (booking.society) {
    return booking.society.name;
  }

  if (booking.farmer) {
    return booking.farmer.farmName;
  }

  return booking.pickup || "Pickup location";
}

function getPickupType(booking: Booking) {
  if (booking.society) return "Cooperative Society";

  if (booking.farmer) return "Direct Farmer";

  return "Pickup";
}

function StepIcon({
  state,
}: {
  state: "complete" | "current" | "upcoming";
}) {
  if (state === "complete") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#315a78] text-white shadow-sm">
        <Check size={18} strokeWidth={3} />
      </div>
    );
  }

  if (state === "current") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#315a78] bg-white">
        <div className="h-3 w-3 rounded-full bg-[#315a78]" />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-zinc-200 bg-white">
      <div className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
    </div>
  );
}

export function OrderTracking() {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          : "Unable to load tracking information."
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

  const booking = useMemo(
    () => order?.bookings?.[0] ?? null,
    [order]
  );

  const currentStatus = booking?.status || order?.status || "PENDING_PAYMENT";

  const currentIndex = statusIndex(currentStatus);

  const gpsAvailable =
    booking?.currentLat !== null &&
    booking?.currentLat !== undefined &&
    booking?.currentLng !== null &&
    booking?.currentLng !== undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7f9]">
        <SiteNav />

        <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-zinc-200" />

          <div className="mt-6 h-32 animate-pulse rounded-3xl bg-white" />

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="h-[550px] animate-pulse rounded-3xl bg-white" />
            <div className="h-[550px] animate-pulse rounded-3xl bg-white" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#f4f7f9]">
        <SiteNav />

        <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 pt-24">
          <div className="w-full rounded-3xl border border-rose-200 bg-white p-8 text-center">
            <XCircle
              size={46}
              className="mx-auto text-rose-500"
            />

            <h1 className="mt-4 text-2xl font-black">
              Tracking unavailable
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              {error || "This order could not be found."}
            </p>

            <Link
              to="/orders"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#315a78] px-5 py-3 text-sm font-bold text-white"
            >
              <ArrowLeft size={16} />
              Back to Orders
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const cancelled =
    order.status === "CANCELLED" ||
    order.status === "FAILED" ||
    booking?.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#17232d]">
      <SiteNav />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/orders"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#dce4ea] bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:border-[#315a78] hover:text-[#315a78]"
          >
            <ArrowLeft size={16} />
            Orders & Deliveries
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live order updates enabled
          </div>
        </div>

        {/* TOP SUMMARY */}
        <section className="rounded-3xl border border-[#dce4ea] bg-white p-6 shadow-[0_18px_55px_rgba(31,55,72,0.06)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#315a78]">
                Live delivery tracking
              </p>

              <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                {formatOrderId(order.id)}
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                Order placed {formatDate(order.createdAt)}
              </p>
            </div>

            <div
              className={[
                "inline-flex w-fit items-center rounded-full border px-4 py-2 text-sm font-black",
                cancelled
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : order.status === "DELIVERED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-blue-200 bg-blue-50 text-blue-700",
              ].join(" ")}
            >
              {statusLabel(currentStatus)}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* TIMELINE */}
          <section className="rounded-3xl border border-[#dce4ea] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#315a78]">
                Delivery journey
              </p>

              <h2 className="mt-1 text-xl font-black">
                From farm to your doorstep
              </h2>
            </div>

            {cancelled ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <div className="flex items-center gap-3">
                  <XCircle className="text-rose-600" size={24} />

                  <div>
                    <p className="font-black text-rose-700">
                      {statusLabel(currentStatus)}
                    </p>

                    <p className="mt-1 text-sm text-rose-600">
                      This delivery is no longer active.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {STEPS.map((step, index) => {
                  const state =
                    index < currentIndex
                      ? "complete"
                      : index === currentIndex
                      ? "current"
                      : "upcoming";

                  return (
                    <div
                      key={step.key}
                      className="flex gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <StepIcon state={state} />

                        {index < STEPS.length - 1 && (
                          <div
                            className={[
                              "my-1 w-[2px] flex-1 min-h-12",
                              index < currentIndex
                                ? "bg-[#315a78]"
                                : "bg-zinc-200",
                            ].join(" ")}
                          />
                        )}
                      </div>

                      <div className="pb-8 pt-1">
                        <p
                          className={[
                            "text-sm font-black",
                            state === "upcoming"
                              ? "text-zinc-400"
                              : "text-[#17232d]",
                          ].join(" ")}
                        >
                          {step.label}
                        </p>

                        <p
                          className={[
                            "mt-1 text-xs leading-5",
                            state === "upcoming"
                              ? "text-zinc-400"
                              : "text-zinc-500",
                          ].join(" ")}
                        >
                          {step.description}
                        </p>

                        {state === "current" && (
                          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                            <Radio size={11} />
                            Current status
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* DELIVERY INFORMATION */}
          <div className="space-y-6">
            {/* PICKUP */}
            <section className="rounded-3xl border border-[#dce4ea] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#315a78]">
                Pickup
              </p>

              <h2 className="mt-1 text-xl font-black">
                Where your produce starts
              </h2>

              {booking ? (
                <div className="mt-5 rounded-2xl bg-[#f5f8fa] p-4">
                  <div className="flex gap-3">
                    <MapPin
                      size={19}
                      className="mt-0.5 shrink-0 text-[#315a78]"
                    />

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                        {getPickupType(booking)}
                      </p>

                      <p className="mt-1 font-black">
                        {getPickupName(booking)}
                      </p>

                      {booking.society && (
                        <p className="mt-1 text-sm leading-5 text-zinc-500">
                          {booking.society.address},{" "}
                          {booking.society.district},{" "}
                          {booking.society.state}{" "}
                          {booking.society.pinCode}
                        </p>
                      )}

                      {booking.farmer && (
                        <p className="mt-1 text-sm text-zinc-500">
                          Farmer: {booking.farmer.user.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
                  Logistics pickup booking has not been created yet.
                </div>
              )}
            </section>

            {/* DELIVERY AGENT */}
            <section className="rounded-3xl border border-[#dce4ea] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#315a78]">
                Delivery agent
              </p>

              <h2 className="mt-1 text-xl font-black">
                Who is delivering
              </h2>

              {booking?.assignedUser ? (
                <div className="mt-5 flex items-center gap-3">
                  {booking.assignedUser.photoUrl ? (
                    <img
                      src={booking.assignedUser.photoUrl}
                      alt={booking.assignedUser.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef3f6] text-[#315a78]">
                      <UserRound size={20} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-black">
                      {booking.assignedUser.name}
                    </p>

                    <p className="text-xs text-zinc-500">
                      {booking.assignedUser.deliveryType ===
                      "LARGE_TRUCK"
                        ? "Large Transport"
                        : "Delivery Agent"}
                    </p>

                    {booking.assignedUser.vehicleNumber && (
                      <p className="mt-1 text-xs font-bold text-zinc-500">
                        Vehicle:{" "}
                        {booking.assignedUser.vehicleNumber}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-5">
                  <Truck
                    size={22}
                    className="text-zinc-400"
                  />

                  <p className="mt-3 text-sm font-bold text-zinc-600">
                    Delivery agent not assigned yet.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    This section will update automatically when
                    logistics accepts the delivery.
                  </p>
                </div>
              )}
            </section>

            {/* GPS */}
            <section className="rounded-3xl border border-[#dce4ea] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#315a78]">
                    Live location
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Delivery GPS
                  </h2>
                </div>

                <MapPin
                  size={23}
                  className={
                    gpsAvailable
                      ? "text-emerald-600"
                      : "text-zinc-300"
                  }
                />
              </div>

              {gpsAvailable ? (
                <div className="mt-5 rounded-2xl bg-emerald-50 p-5">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    GPS location available
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Latitude
                      </p>
                      <p className="mt-1 font-mono text-xs font-bold">
                        {booking?.currentLat}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Longitude
                      </p>
                      <p className="mt-1 font-mono text-xs font-bold">
                        {booking?.currentLng}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-emerald-700/70">
                    Last updated{" "}
                    {formatDate(booking?.locationUpdatedAt)}
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-zinc-50 p-5">
                  <MapPin
                    size={24}
                    className="text-zinc-400"
                  />

                  <p className="mt-3 text-sm font-black text-zinc-600">
                    GPS unavailable
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    The delivery agent has not shared a live GPS
                    location yet. No location is being simulated.
                  </p>
                </div>
              )}
            </section>

            {/* DELIVERY ADDRESS */}
            <section className="rounded-3xl border border-[#dce4ea] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#315a78]">
                Destination
              </p>

              <h2 className="mt-1 text-xl font-black">
                Your delivery address
              </h2>

              {order.address ? (
                <div className="mt-5 flex gap-3 rounded-2xl bg-[#f5f8fa] p-4">
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
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-zinc-500">
                  No delivery address is attached to this order.
                </p>
              )}
            </section>

            {/* ORDER TOTAL */}
            <section className="rounded-3xl bg-[#315a78] p-6 text-white shadow-[0_18px_50px_rgba(49,90,120,0.18)]">
              <div className="flex items-center gap-3">
                <Package size={22} />

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Order total
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {rupees(order.totalPaise)}
                  </p>
                </div>
              </div>

              <Link
                to={`/orders/${order.id}`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-[#315a78] transition hover:bg-zinc-100"
              >
                View Full Order Details
              </Link>
            </section>

            <div className="flex items-center gap-2 px-2 text-xs font-semibold text-zinc-400">
              <Clock3 size={14} />
              Tracking refreshes automatically when backend
              realtime events are received.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
