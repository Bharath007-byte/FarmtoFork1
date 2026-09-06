import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Bell,
  Bike,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Edit3,
  FileText,
  Headphones,
  LogOut,
  MapPin,
  Package,
  Settings,
  Truck,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { SiteNav } from "../components/SiteNav";
import { useApp } from "../context/AppState";
import { api, ApiError, mediaUrl } from "../services/api";
import { useRealtime } from "../hooks/useRealtime";

type DeliveryType = "BIKE" | "LARGE_TRUCK";

type LogisticsProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  role: string;
  deliveryType: DeliveryType | null;
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

  farmer: {
    farmName: string;
    user: {
      name: string;
    };
  };

  order?: {
    address?: {
      city: string;
      state: string;
    } | null;
  } | null;
};

const DELIVERY_LABELS: Record<DeliveryType, string> = {
  BIKE: "Bike / Scooter",
  LARGE_TRUCK: "Large Truck / Cold Chain",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Job Accepted",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  FARMER_READY: "Farmer Ready",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};


function statusLabel(status: string) {
  return (
    STATUS_LABELS[status] ||
    status.replaceAll("_", " ").toLowerCase()
  );
}

function jobMatchesType(
  job: Job,
  deliveryType: DeliveryType | null
) {
  if (!deliveryType) return true;

  const vehicle = String(job.vehicle || "").toLowerCase();

  if (deliveryType === "BIKE") {
    return (
      vehicle.includes("bike") ||
      vehicle.includes("scooter") ||
      vehicle.includes("two")
    );
  }

  return (
    vehicle.includes("truck") ||
    vehicle.includes("van") ||
    vehicle.includes("large") ||
    vehicle.includes("cold")
  );
}

function formatDistance(job: Job) {
  if (
    job.currentLat == null ||
    job.currentLng == null
  ) {
    return "Route distance unavailable";
  }

  return "GPS location available";
}

export function LogisticsDashboard() {
  const navigate = useNavigate();
  const { user } = useApp();

  const [profile, setProfile] =
    useState<LogisticsProfile | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);

  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);

  const [error, setError] = useState("");
  const [jobsError, setJobsError] = useState("");

  const [claimingId, setClaimingId] =
    useState<string | null>(null);

  const [activeNav, setActiveNav] =
    useState("dashboard");

  const loadProfile = useCallback(async () => {
    try {
      const data = await api<{
        profile: LogisticsProfile;
      }>("/api/logistics/profile");

      setProfile(data.profile);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load logistics profile."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const data = await api<{
        jobs: Job[];
      }>("/api/logistics/jobs");

      setJobs(data.jobs || []);
      setJobsError("");
    } catch (err) {
      setJobsError(
        err instanceof ApiError
          ? err.message
          : "Unable to load delivery jobs."
      );
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadJobs();
  }, [loadProfile, loadJobs]);

  useRealtime(
    [
      "LOGISTICS_STATUS_CHANGED",
      "LOGISTICS_LOCATION_UPDATED",
      "ORDER_STATUS_CHANGED",
      "JOB_CREATED",
    ],
    () => {
      void loadJobs();
    }
  );

  const activeJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.assignedUserId === profile?.id &&
          !["DELIVERED", "CANCELLED"].includes(
            job.status
          )
      ),
    [jobs, profile?.id]
  );

  const availableJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.assignedUserId === null &&
          !["DELIVERED", "CANCELLED"].includes(
            job.status
          ) &&
          jobMatchesType(
            job,
            profile?.deliveryType || null
          )
      ),
    [jobs, profile?.deliveryType]
  );

  const completedJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.assignedUserId === profile?.id &&
          job.status === "DELIVERED"
      ),
    [jobs, profile?.id]
  );

  const deliveryTypeLabel = profile?.deliveryType
    ? DELIVERY_LABELS[profile.deliveryType]
    : "Delivery partner";

  const claimJob = async (job: Job) => {
    setClaimingId(job.id);
    setError("");

    try {
      await api(
        `/api/logistics/jobs/${job.id}/claim`,
        {
          method: "POST",
        }
      );

      await loadJobs();

      navigate(`/logistics/tracker/${job.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to claim this delivery job."
      );
    } finally {
      setClaimingId(null);
    }
  };

  const logout = () => {
    localStorage.removeItem("f2f-token");
    localStorage.removeItem("f2f-session");

    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f8f2]">
        <SiteNav />

        <main className="mx-auto max-w-7xl px-5 pb-16 pt-28">
          <div className="animate-pulse">
            <div className="h-10 w-64 rounded-xl bg-white" />
            <div className="mt-4 h-5 w-96 rounded-xl bg-white" />

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-36 rounded-3xl bg-white"
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f8f2] text-[#16271e]">
      <SiteNav />

      <div className="mx-auto flex max-w-[1500px] gap-5 px-4 pb-10 pt-24 lg:px-6">
        {/* SIDEBAR */}

        <aside className="hidden w-[235px] shrink-0 lg:block">
          <div className="sticky top-24 rounded-[28px] border border-[#dcebdd] bg-white p-4 shadow-[0_15px_50px_rgba(38,86,52,0.07)]">
            {/* Brand */}

            <div className="px-3 pb-5 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e4f5e7] text-[#16823f]">
                  <Truck size={23} />
                </div>

                <div>
                  <p className="text-lg font-extrabold tracking-tight">
                    Farm2Fork
                  </p>

                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6d7d74]">
                    Logistics
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}

            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveNav("dashboard")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                  activeNav === "dashboard"
                    ? "bg-[#16823f] text-white shadow-lg shadow-green-900/10"
                    : "text-[#526158] hover:bg-[#f1f7f1]"
                }`}
              >
                <Package size={18} />
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => setActiveNav("fleet")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                  activeNav === "fleet"
                    ? "bg-[#16823f] text-white"
                    : "text-[#526158] hover:bg-[#f1f7f1]"
                }`}
              >
                <Truck size={18} />
                Fleet Desk
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveNav("deliveries");

                  if (activeJobs.length) {
                    navigate(
                      `/logistics/tracker/${activeJobs[0].id}`
                    );
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                  activeNav === "deliveries"
                    ? "bg-[#16823f] text-white"
                    : "text-[#526158] hover:bg-[#f1f7f1]"
                }`}
              >
                <Package size={18} />
                My Deliveries
              </button>

              <button
                type="button"
                onClick={() => setActiveNav("earnings")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                  activeNav === "earnings"
                    ? "bg-[#16823f] text-white"
                    : "text-[#526158] hover:bg-[#f1f7f1]"
                }`}
              >
                <Wallet size={18} />
                Earnings
              </button>
            </nav>

            <div className="my-5 border-t border-[#edf1ed]" />

            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveNav("profile")}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#526158] transition hover:bg-[#f1f7f1]"
              >
                <UserRound size={18} />
                Profile
              </button>

              <button
                type="button"
                onClick={() => setActiveNav("vehicle")}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#526158] transition hover:bg-[#f1f7f1]"
              >
                <Settings size={18} />
                Vehicle Info
              </button>

              <button
                type="button"
                onClick={() => setActiveNav("support")}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#526158] transition hover:bg-[#f1f7f1]"
              >
                <Headphones size={18} />
                Support
              </button>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#a13c3c] transition hover:bg-red-50"
              >
                <LogOut size={18} />
                Logout
              </button>
            </nav>

            {/* Bottom brand card */}

            <div className="mt-8 rounded-3xl bg-[#edf7ed] p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#16823f]">
                <Truck size={20} />
              </div>

              <p className="text-sm font-extrabold text-[#1b6c3a]">
                Delivering fresh
              </p>

              <p className="mt-1 text-xs leading-5 text-[#64766a]">
                Moving produce from farms to families.
              </p>
            </div>
          </div>
        </aside>

        {/* MAIN */}

        <main className="min-w-0 flex-1">
          {/* TOP BAR */}

          <div className="mb-5 flex items-center justify-between rounded-[25px] border border-[#dcebdd] bg-white px-5 py-3 shadow-[0_10px_40px_rgba(38,86,52,0.05)]">
            <div className="hidden sm:block">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b7c70]">
                Logistics Control Centre
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f7f3] text-[#3f5548] transition hover:bg-[#e8f3e9]"
              >
                <Bell size={19} />

                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>

              <div className="hidden items-center gap-3 border-l border-[#e5ebe5] pl-4 sm:flex">
                {profile?.photoUrl ? (
                  <img
                    src={mediaUrl(profile.photoUrl)}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dff2e3] text-[#16823f]">
                    <CircleUserRound size={22} />
                  </div>
                )}

                <div>
                  <p className="text-sm font-extrabold">
                    {profile?.name || user?.name || "Logistics Partner"}
                  </p>

                  <p className="text-[11px] font-semibold text-[#718078]">
                    {deliveryTypeLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <XCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* HERO */}

          <section className="overflow-hidden rounded-[30px] border border-[#dcebdd] bg-white shadow-[0_15px_60px_rgba(38,86,52,0.07)]">
            <div className="relative p-6 md:p-8">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#eaf7e9] blur-3xl" />

              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  {profile?.photoUrl ? (
                    <img
                      src={mediaUrl(profile.photoUrl)}
                      alt=""
                      className="h-20 w-20 rounded-[25px] object-cover ring-4 ring-[#edf7ed]"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-[25px] bg-[#e5f4e6] text-[#16823f] ring-4 ring-[#f2f8f2]">
                      <CircleUserRound size={42} />
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-semibold text-[#718078]">
                      Good day,
                    </p>

                    <h1 className="mt-0.5 text-3xl font-black tracking-tight md:text-4xl">
                      {profile?.name || user?.name || "Partner"}{" "}
                      <span className="inline-block">��</span>
                    </h1>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#68766e]">
                      Keep fresh produce moving from farm gate
                      to customer.
                    </p>

                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#e5f7e8] px-3 py-1.5 text-xs font-extrabold text-[#19743d]">
                      <span className="h-2 w-2 rounded-full bg-[#20a653]" />
                      Available for jobs
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveNav("profile")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#cbdacb] bg-white px-5 py-3 text-sm font-extrabold text-[#263a2e] shadow-sm transition hover:border-[#16823f] hover:text-[#16823f]"
                >
                  <Edit3 size={17} />
                  Edit Profile
                </button>
              </div>
            </div>
          </section>

          {/* STAT CARDS */}

          <section className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[25px] border border-[#dcebdd] bg-white p-5 shadow-[0_10px_40px_rgba(38,86,52,0.05)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-[#68766e]">
                    Completed deliveries
                  </p>

                  <p className="mt-3 text-4xl font-black">
                    {completedJobs.length}
                  </p>

                  <p className="mt-2 text-xs font-bold text-[#258048]">
                    Based on recorded delivery jobs
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f7e9] text-[#16823f]">
                  <CheckCircle2 size={23} />
                </div>
              </div>
            </div>

            <div className="rounded-[25px] border border-[#dcebdd] bg-white p-5 shadow-[0_10px_40px_rgba(38,86,52,0.05)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-[#68766e]">
                    Active jobs
                  </p>

                  <p className="mt-3 text-4xl font-black">
                    {activeJobs.length}
                  </p>

                  <p className="mt-2 text-xs font-bold text-[#426a8e]">
                    Currently assigned
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f3fa] text-[#3d7ba9]">
                  <Package size={23} />
                </div>
              </div>
            </div>

            <div className="rounded-[25px] border border-[#dcebdd] bg-white p-5 shadow-[0_10px_40px_rgba(38,86,52,0.05)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-[#68766e]">
                    Earnings
                  </p>

                  <p className="mt-3 text-3xl font-black">
                    —
                  </p>

                  <p className="mt-2 text-xs font-bold text-[#8b6b24]">
                    Earnings ledger not connected yet
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4d8] text-[#b48116]">
                  <Wallet size={23} />
                </div>
              </div>
            </div>
          </section>

          {/* ACTIVE JOB */}

          {activeJobs.length > 0 && (
            <section className="mt-5 rounded-[28px] border border-[#cfe4d2] bg-[#f7fcf7] p-5 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16823f]">
                    Current delivery
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    {activeJobs[0].farmer.farmName}
                  </h2>
                </div>

                <span className="inline-flex w-fit rounded-full bg-[#dff4e3] px-3 py-1.5 text-xs font-black text-[#16743c]">
                  {statusLabel(activeJobs[0].status)}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white p-4">
                  <div className="flex items-center gap-2 text-[#617067]">
                    <MapPin size={17} />
                    <span className="text-xs font-bold">
                      Pickup
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-extrabold">
                    {activeJobs[0].pickup || "Pickup location"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <div className="flex items-center gap-2 text-[#617067]">
                    <MapPin size={17} />
                    <span className="text-xs font-bold">
                      Destination
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-extrabold">
                    {activeJobs[0].order?.address?.city ||
                      "Destination"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <div className="flex items-center gap-2 text-[#617067]">
                    <Truck size={17} />
                    <span className="text-xs font-bold">
                      Vehicle
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-extrabold">
                    {activeJobs[0].vehicle || deliveryTypeLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/logistics/tracker/${activeJobs[0].id}`
                  )
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16823f] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-green-900/10 transition hover:bg-[#116d35]"
              >
                Open delivery tracker
                <ChevronRight size={18} />
              </button>
            </section>
          )}

          {/* AVAILABLE JOBS */}

          <section className="mt-5 rounded-[28px] border border-[#dcebdd] bg-white shadow-[0_10px_45px_rgba(38,86,52,0.05)]">
            <div className="flex items-center justify-between border-b border-[#edf1ed] px-5 py-5 md:px-6">
              <div>
                <h2 className="text-xl font-black">
                  Available Delivery Jobs
                </h2>

                <p className="mt-1 text-xs font-semibold text-[#748078]">
                  Jobs available for your registered vehicle type
                </p>
              </div>

              <span className="rounded-full bg-[#e8f5e9] px-3 py-1.5 text-xs font-black text-[#17723b]">
                {availableJobs.length} available
              </span>
            </div>

            {jobsError && (
              <div className="m-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {jobsError}
              </div>
            )}

            {jobsLoading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-2xl bg-[#f2f6f2]"
                  />
                ))}
              </div>
            ) : availableJobs.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#edf6ee] text-[#16823f]">
                  <Package size={27} />
                </div>

                <h3 className="mt-4 text-lg font-black">
                  No delivery jobs available
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718078]">
                  New jobs will appear here when they are
                  available for your logistics profile.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#edf1ed]">
                {availableJobs
                  .slice(0, 5)
                  .map((job) => (
                    <div
                      key={job.id}
                      className="p-5 transition hover:bg-[#fbfdfb] md:px-6"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        {/* Image placeholder / produce visual */}

                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#eaf5e8] text-[#16823f]">
                          <Package size={28} />
                        </div>

                        {/* Job information */}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black">
                              {job.farmer.farmName}
                            </h3>

                            <span className="rounded-full bg-[#e7f5e8] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#19733c]">
                              {job.status}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#68776e]">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={14} />
                              {job.pickup ||
                                "Pickup location unavailable"}
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <Package size={14} />
                              {job.quantity} crates
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <Truck size={14} />
                              {job.vehicle ||
                                deliveryTypeLabel}
                            </span>
                          </div>

                          <p className="mt-2 text-xs font-semibold text-[#8a958e]">
                            {formatDistance(job)}
                          </p>
                        </div>

                        {/* Claim */}

                        <button
                          type="button"
                          disabled={
                            claimingId === job.id
                          }
                          onClick={() => claimJob(job)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16823f] px-6 py-3 text-sm font-black text-white shadow-lg shadow-green-900/10 transition hover:bg-[#116d35] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {claimingId === job.id
                            ? "Claiming..."
                            : "Claim Job"}

                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* PROFILE / VEHICLE INFORMATION */}

          <section className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="rounded-[28px] border border-[#dcebdd] bg-white p-6 shadow-[0_10px_45px_rgba(38,86,52,0.05)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16823f]">
                    Your Profile
                  </p>

                  <h2 className="mt-2 text-xl font-black">
                    Partner information
                  </h2>
                </div>

                <UserRound
                  size={22}
                  className="text-[#16823f]"
                />
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-[#f5f8f5] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#859188]">
                    Name
                  </p>

                  <p className="mt-1 text-sm font-extrabold">
                    {profile?.name || "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f5f8f5] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#859188]">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm font-extrabold">
                    {profile?.email || "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f5f8f5] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#859188]">
                    Phone
                  </p>

                  <p className="mt-1 text-sm font-extrabold">
                    {profile?.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#dcebdd] bg-white p-6 shadow-[0_10px_45px_rgba(38,86,52,0.05)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16823f]">
                    Vehicle
                  </p>

                  <h2 className="mt-2 text-xl font-black">
                    Registered vehicle
                  </h2>
                </div>

                {profile?.deliveryType ===
                "LARGE_TRUCK" ? (
                  <Truck
                    size={23}
                    className="text-[#16823f]"
                  />
                ) : (
                  <Bike
                    size={23}
                    className="text-[#16823f]"
                  />
                )}
              </div>

              <div className="mt-5 rounded-3xl bg-[#f3f8f3] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#16823f] shadow-sm">
                    {profile?.deliveryType ===
                    "LARGE_TRUCK" ? (
                      <Truck size={27} />
                    ) : (
                      <Bike size={27} />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-black">
                      {profile?.deliveryType
                        ? DELIVERY_LABELS[
                            profile.deliveryType
                          ]
                        : "Vehicle type not configured"}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-[#718078]">
                      {profile?.vehicleNumber ||
                        "Vehicle number not provided"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#dcebdd] p-4">
                <FileText
                  size={19}
                  className="text-[#16823f]"
                />

                <div>
                  <p className="text-sm font-extrabold">
                    Verification
                  </p>

                  <p className="text-xs font-semibold text-[#718078]">
                    Document verification module
                    will be connected to backend storage.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* QUICK ACTIONS */}

          <section className="mt-5 grid gap-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setActiveNav("profile")}
              className="group rounded-[25px] border border-[#dcebdd] bg-white p-5 text-left shadow-[0_10px_40px_rgba(38,86,52,0.04)] transition hover:-translate-y-0.5 hover:border-[#b8d7bc]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f5e9] text-[#16823f]">
                <UserRound size={20} />
              </div>

              <p className="mt-4 text-sm font-black">
                Profile
              </p>

              <p className="mt-1 text-xs text-[#718078]">
                Manage your logistics account.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("vehicle")}
              className="group rounded-[25px] border border-[#dcebdd] bg-white p-5 text-left shadow-[0_10px_40px_rgba(38,86,52,0.04)] transition hover:-translate-y-0.5 hover:border-[#b8d7bc]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f3fa] text-[#3d7ba9]">
                <Settings size={20} />
              </div>

              <p className="mt-4 text-sm font-black">
                Vehicle Info
              </p>

              <p className="mt-1 text-xs text-[#718078]">
                Update your registered vehicle.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveNav("support")}
              className="group rounded-[25px] border border-[#dcebdd] bg-white p-5 text-left shadow-[0_10px_40px_rgba(38,86,52,0.04)] transition hover:-translate-y-0.5 hover:border-[#b8d7bc]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4d8] text-[#a87916]">
                <Headphones size={20} />
              </div>

              <p className="mt-4 text-sm font-black">
                Support
              </p>

              <p className="mt-1 text-xs text-[#718078]">
                Get help with a delivery.
              </p>
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
