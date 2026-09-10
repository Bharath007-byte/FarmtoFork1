import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Route,
  Truck,
} from "lucide-react";
import { api, ApiError } from "../services/api";

type LogisticsProfile = {
  id: string;
  name: string;
  deliveryType: "BIKE" | "LARGE_TRUCK" | null;
  vehicleNumber: string | null;
};

type Job = {
  id: string;
  status: string;
  quantity: number;
  pickup: string;
  vehicle: string;
  assignedUserId: string | null;
  currentLat: number | null;
  currentLng: number | null;
  locationUpdatedAt: string | null;
  orderId: string | null;
  fulfillmentChannel?: "SOCIETY" | "DIRECT_FARMER";
  society?: {
    id: string;
    name: string;
    code: string;
    address: string;
    village: string | null;
    district: string;
    state: string;
    pinCode: string;
    lat: number | null;
    lng: number | null;
  } | null;
  farmer: {
    farmName: string;
    user: {
      name: string;
    };
  };
  order?: {
    address?: {
      recipient?: string | null;
      line1: string;
      district: string;
      city: string;
      state: string;
      pinCode: string;
      latitude: number | null;
      longitude: number | null;
      phone?: string | null;
    } | null;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PICKUP_SCHEDULED: "Pickup scheduled",
  FARMER_READY: "Ready for pickup",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] || status.replaceAll("_", " ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function destination(job: Job) {
  const address = job.order?.address;

  if (!address) {
    return "Customer address unavailable";
  }

  return [address.line1, address.city, address.district, address.state, address.pinCode]
    .filter(Boolean)
    .join(", ");
}

function pickupLabel(job: Job) {
  if (job.fulfillmentChannel === "SOCIETY" && job.society) {
    return job.society.name;
  }

  return job.farmer?.farmName || job.pickup || "Pickup location unavailable";
}

function locationAvailable(job: Job) {
  const lat = job.order?.address?.latitude;
  const lng = job.order?.address?.longitude;

  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

export function LogisticsDeliveries() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<LogisticsProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const [profileResponse, jobsResponse] = await Promise.all([
        api<{ profile: LogisticsProfile }>("/api/logistics/profile"),
        api<{ jobs: Job[] }>("/api/logistics/jobs"),
      ]);

      setProfile(profileResponse.profile);
      setJobs(jobsResponse.jobs);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load your deliveries."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const myJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.assignedUserId === profile?.id &&
          job.status !== "CANCELLED"
      ),
    [jobs, profile?.id]
  );

  const activeJobs = useMemo(
    () =>
      myJobs.filter(
        (job) => job.status !== "DELIVERED"
      ),
    [myJobs]
  );

  const completedJobs = useMemo(
    () =>
      myJobs.filter(
        (job) => job.status === "DELIVERED"
      ),
    [myJobs]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] text-[#182230]">
        <main className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-56 rounded-lg bg-white" />
            <div className="mt-3 h-4 w-80 rounded-lg bg-white" />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 rounded-2xl bg-white"
                />
              ))}
            </div>

            <div className="mt-6 h-80 rounded-2xl bg-white" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#182230]">
      <main className="mx-auto max-w-[1400px] px-5 pb-16 pt-8 lg:px-8">
        <header className="flex flex-col justify-between gap-5 border-b border-[#e4e8ee] pb-6 md:flex-row md:items-end">
                  <button
            type="button"
            onClick={() => navigate("/logistics")}
            className="mb-4 inline-flex w-fit items-center gap-2 rounded-xl border border-[#dce2e9] bg-white px-4 py-2.5 text-sm font-bold text-[#354255] shadow-sm transition hover:border-[#bfc8d4] hover:bg-[#fafbfc] md:absolute md:top-8"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#657184]">
              Logistics workspace
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight">
              My Deliveries
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium text-[#687487]">
              Manage deliveries assigned to you and open the live tracker for
              active jobs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce2e9] bg-white px-4 py-2.5 text-sm font-bold text-[#354255] shadow-sm transition hover:border-[#bfc8d4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e3e8ef] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7b8797]">
                  Active
                </p>

                <p className="mt-2 text-3xl font-black">
                  {activeJobs.length}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef5ff] text-[#3269a8]">
                <Route size={19} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e3e8ef] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7b8797]">
                  Completed
                </p>

                <p className="mt-2 text-3xl font-black">
                  {completedJobs.length}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf8f0] text-[#32834c]">
                <CheckCircle2 size={19} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e3e8ef] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7b8797]">
                  Vehicle
                </p>

                <p className="mt-2 text-lg font-black">
                  {profile?.vehicleNumber || "Not registered"}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff5e9] text-[#bd741f]">
                <Truck size={19} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#7b8797]">
              In progress
            </p>

            <h2 className="mt-1 text-xl font-black">
              Active deliveries
            </h2>
          </div>

          {activeJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfd7e2] bg-white px-6 py-12 text-center">
              <Package
                size={28}
                className="mx-auto text-[#8a95a5]"
              />

              <h3 className="mt-3 text-base font-black">
                No active deliveries
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm font-medium text-[#737f90]">
                You currently have no assigned delivery in progress.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-2xl border border-[#e1e6ed] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#3269a8]">
                          {statusLabel(job.status)}
                        </span>

                        <span className="rounded-full bg-[#f2f4f7] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#657184]">
                          {job.fulfillmentChannel === "SOCIETY"
                            ? "Society"
                            : "Direct farmer"}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black">
                        {pickupLabel(job)}
                      </h3>

                      <div className="mt-3 grid gap-2 text-sm font-medium text-[#697586] md:grid-cols-2">
                        <div className="flex items-start gap-2">
                          <MapPin
                            size={16}
                            className="mt-0.5 shrink-0 text-[#657184]"
                          />
                          <span>
                            <strong className="font-bold text-[#354255]">
                              Pickup:
                            </strong>{" "}
                            {job.pickup || pickupLabel(job)}
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <Package
                            size={16}
                            className="mt-0.5 shrink-0 text-[#657184]"
                          />
                          <span>
                            <strong className="font-bold text-[#354255]">
                              Quantity:
                            </strong>{" "}
                            {job.quantity} kg
                          </span>
                        </div>

                        <div className="flex items-start gap-2 md:col-span-2">
                          <MapPin
                            size={16}
                            className="mt-0.5 shrink-0 text-[#657184]"
                          />
                          <span>
                            <strong className="font-bold text-[#354255]">
                              Customer:
                            </strong>{" "}
                            {destination(job)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/logistics/tracker/${job.id}`)
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#245ea8] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#1d4f8f]"
                    >
                      Open Live Tracker
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-9">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#7b8797]">
              Delivery history
            </p>

            <h2 className="mt-1 text-xl font-black">
              Completed deliveries
            </h2>
          </div>

          {completedJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfd7e2] bg-white px-6 py-12 text-center">
              <Clock3
                size={28}
                className="mx-auto text-[#8a95a5]"
              />

              <h3 className="mt-3 text-base font-black">
                No completed deliveries yet
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm font-medium text-[#737f90]">
                Delivered jobs will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#e1e6ed] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="border-b border-[#e8ecf1] bg-[#fafbfc]">
                    <tr className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7b8797]">
                      <th className="px-5 py-4">Delivery</th>
                      <th className="px-5 py-4">Pickup</th>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Quantity</th>
                      <th className="px-5 py-4">Delivered</th>
                      <th className="px-5 py-4" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#edf0f4]">
                    {completedJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="transition hover:bg-[#fafbfc]"
                      >
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf8f0] text-[#32834c]">
                              <CheckCircle2 size={17} />
                            </div>

                            <div>
                              <p className="text-sm font-black">
                                #{job.id.slice(-8).toUpperCase()}
                              </p>

                              <p className="mt-0.5 text-xs font-medium text-[#7a8594]">
                                Delivered
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5 text-sm font-semibold text-[#4e5a6b]">
                          {pickupLabel(job)}
                        </td>

                        <td className="max-w-[260px] px-5 py-5">
                          <p className="text-sm font-semibold text-[#4e5a6b]">
                            {job.order?.address?.recipient ||
                              "Customer"}
                          </p>

                          <p className="mt-1 text-xs font-medium leading-5 text-[#7a8594]">
                            {destination(job)}
                          </p>

                          {locationAvailable(job) ? (
                            <p className="mt-1 text-[10px] font-bold text-[#32834c]">
                              Customer GPS available
                            </p>
                          ) : (
                            <p className="mt-1 text-[10px] font-bold text-[#9a6d28]">
                              Customer map location unavailable
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-5 text-sm font-bold text-[#354255]">
                          {job.quantity} kg
                        </td>

                        <td className="px-5 py-5 text-sm font-semibold text-[#687487]">
                          {formatDate(
                            (job as Job & {
                              deliveredAt?: string | null;
                            }).deliveredAt
                          )}
                        </td>

                        <td className="px-5 py-5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/logistics/tracker/${job.id}`
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-black text-[#245ea8] hover:underline"
                          >
                            View
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
