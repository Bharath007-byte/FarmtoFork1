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
  ArrowUpRight,
  Clock3,
  Route,
  ShieldCheck,
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

function statusTone(status: string) {
  if (status === "DELIVERED") {
    return {
      badge: "bg-[#e7f6e9] text-[#23743d]",
      dot: "bg-[#31934d]",
    };
  }

  if (
    status === "IN_TRANSIT" ||
    status === "OUT_FOR_DELIVERY" ||
    status === "PICKED_UP"
  ) {
    return {
      badge: "bg-[#e8f1ff] text-[#376a9e]",
      dot: "bg-[#4a83bd]",
    };
  }

  return {
    badge: "bg-[#fff5df] text-[#8d6a24]",
    dot: "bg-[#c39531]",
  };
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

  const firstName =
    profile?.name?.trim().split(/\s+/)[0] ||
    user?.name?.trim().split(/\s+/)[0] ||
    "Partner";

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
      <div className="min-h-screen bg-[#f4f7ef] text-[#18321f]">
        <SiteNav />

        <main className="mx-auto max-w-[1500px] px-4 pb-16 pt-28 lg:px-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 rounded-xl bg-white" />
            <div className="mt-3 h-5 w-80 rounded-xl bg-white" />

            <div className="mt-8 h-[300px] rounded-[30px] bg-white" />

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 rounded-[24px] bg-white"
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7ef] text-[#18321f]">
      <SiteNav />

      <div className="mx-auto flex max-w-[1500px] gap-5 px-4 pb-12 pt-24 lg:px-6">
        {/* ===================================================== */}
        {/* SIDEBAR */}
        {/* ===================================================== */}

        <aside className="hidden w-[248px] shrink-0 lg:block">
          <div className="sticky top-24 overflow-hidden rounded-[30px] border border-[#dce7d8] bg-white shadow-[0_18px_60px_rgba(39,72,45,0.07)]">
            <div className="px-5 pb-5 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#1f6337] text-white shadow-[0_8px_20px_rgba(31,99,55,0.18)]">
                  <Truck size={21} />
                </div>

                <div>
                  <p className="text-[17px] font-black tracking-[-0.02em] text-[#19351f]">
                    Farm2Fork
                  </p>

                  <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#829080]">
                    Logistics Desk
                  </p>
                </div>
              </div>
            </div>

            <div className="px-3">
              <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#9aa59b]">
                Workspace
              </p>

              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    setActiveNav("dashboard")
                  }
                  className={`flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[13px] font-bold transition ${
                    activeNav === "dashboard"
                      ? "bg-[#1f6337] text-white shadow-[0_8px_20px_rgba(31,99,55,0.14)]"
                      : "text-[#5c6c60] hover:bg-[#f1f6ee]"
                  }`}
                >
                  <Package size={17} />
                  Dashboard
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveNav("fleet")
                  }
                  className={`flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[13px] font-bold transition ${
                    activeNav === "fleet"
                      ? "bg-[#1f6337] text-white"
                      : "text-[#5c6c60] hover:bg-[#f1f6ee]"
                  }`}
                >
                  <Truck size={17} />
                  Fleet Desk
                </button>

                <button
                  type="button"
                  onClick={() => {
  setActiveNav("deliveries");
  navigate("/logistics/deliveries");
}}
                  className={`flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[13px] font-bold transition ${
                    activeNav === "deliveries"
                      ? "bg-[#1f6337] text-white"
                      : "text-[#5c6c60] hover:bg-[#f1f6ee]"
                  }`}
                >
                  <Route size={17} />
                  My Deliveries
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveNav("earnings")
                  }
                  className={`flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[13px] font-bold transition ${
                    activeNav === "earnings"
                      ? "bg-[#1f6337] text-white"
                      : "text-[#5c6c60] hover:bg-[#f1f6ee]"
                  }`}
                >
                  <Wallet size={17} />
                  Earnings
                </button>
              </nav>

              <div className="my-5 border-t border-[#edf1ea]" />

              <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#9aa59b]">
                Account
              </p>

              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    setActiveNav("profile")
                  }
                  className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[13px] font-bold text-[#5c6c60] transition hover:bg-[#f1f6ee]"
                >
                  <UserRound size={17} />
                  Profile
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveNav("vehicle")
                  }
                  className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[13px] font-bold text-[#5c6c60] transition hover:bg-[#f1f6ee]"
                >
                  <Settings size={17} />
                  Vehicle Info
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveNav("support")
                  }
                  className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[13px] font-bold text-[#5c6c60] transition hover:bg-[#f1f6ee]"
                >
                  <Headphones size={17} />
                  Support
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[13px] font-bold text-[#a14a45] transition hover:bg-[#fff3f2]"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </nav>
            </div>

            <div className="m-4 mt-6 overflow-hidden rounded-[22px] bg-[#edf5e8]">
              <div className="relative h-32 overflow-hidden">
                <img
                  src="/images/logistics/logistics-scooter.png"
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain object-right"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-[#edf5e8] via-[#edf5e8]/75 to-transparent" />

                <div className="relative z-10 p-4">
                  <p className="max-w-[105px] text-[12px] font-black leading-5 text-[#275a36]">
                    Fresh from farms.
                    <br />
                    Delivered with care.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ===================================================== */}
        {/* MAIN */}
        {/* ===================================================== */}

        <main className="min-w-0 flex-1">
          {/* TOP BAR */}

          <header className="mb-5 flex items-center justify-between rounded-[24px] border border-[#dce7d8] bg-white px-4 py-3 shadow-[0_10px_35px_rgba(39,72,45,0.045)] md:px-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#849182]">
                Farm2Fork / Logistics
              </p>

              <p className="mt-1 text-sm font-black text-[#243b2a]">
                Control Centre
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f2f6ef] text-[#49614e] transition hover:bg-[#e7f0e3]"
                aria-label="Notifications"
              >
                <Bell size={18} />

                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#d45b50]" />
              </button>

              <div className="hidden h-8 w-px bg-[#e7ece4] sm:block" />

              <div className="flex items-center gap-2.5">
                {profile?.photoUrl ? (
                  <img
                    src={mediaUrl(profile.photoUrl)}
                    alt=""
                    className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4f1df] text-[#28613a]">
                    <CircleUserRound size={21} />
                  </div>
                )}

                <div className="hidden sm:block">
                  <p className="text-xs font-black text-[#263c2c]">
                    {profile?.name ||
                      user?.name ||
                      "Logistics Partner"}
                  </p>

                  <p className="mt-0.5 text-[10px] font-semibold text-[#829080]">
                    {deliveryTypeLabel}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* GLOBAL ERROR */}

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <XCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {/* ===================================================== */}
          {/* HERO */}
          {/* ===================================================== */}

          <section className="relative min-h-[360px] overflow-hidden rounded-[32px] border border-[#d5e3d0] bg-[#eaf3e4] shadow-[0_20px_70px_rgba(39,72,45,0.09)]">
            <img
              src="/images/logistics/farm-to-home-route.png"
              alt="Farm to home logistics"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-[#eaf3e4] via-[#eaf3e4]/95 via-45% to-transparent" />

            <div className="absolute inset-0 bg-gradient-to-t from-[#173b23]/15 via-transparent to-transparent" />

            <div className="relative z-10 flex min-h-[360px] flex-col justify-between p-6 md:p-8 lg:p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#c9ddc3] bg-white/85 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-[#3c6b45] backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#39824b]" />
                  Logistics Partner
                </div>

                <h1 className="mt-5 max-w-[570px] text-4xl font-black tracking-[-0.045em] text-[#18321f] md:text-5xl lg:text-[54px] lg:leading-[1.03]">
                  Move fresh.
                  <br />
                  Deliver better.
                </h1>

                <p className="mt-5 max-w-[490px] text-sm font-medium leading-6 text-[#56685a] md:text-base">
                  Welcome back,{" "}
                  <span className="font-black text-[#315b38]">
                    {firstName}
                  </span>
                  . Manage your delivery jobs and keep fresh produce
                  moving from farms to families.
                </p>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#cddfc8] bg-white/90 px-3.5 py-2 text-xs font-bold text-[#425b48] backdrop-blur">
                    {profile?.deliveryType ===
                    "LARGE_TRUCK" ? (
                      <Truck
                        size={14}
                        className="text-[#2f7140]"
                      />
                    ) : (
                      <Bike
                        size={14}
                        className="text-[#2f7140]"
                      />
                    )}

                    {deliveryTypeLabel}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-[#cddfc8] bg-white/90 px-3.5 py-2 text-xs font-bold text-[#425b48] backdrop-blur">
                    <span className="text-[#397348]">
                      ID
                    </span>

                    {profile?.vehicleNumber ||
                      "Vehicle not configured"}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setActiveNav("vehicle")
                  }
                  className="inline-flex items-center gap-2 rounded-[15px] border border-[#bfd3b9] bg-white/90 px-4 py-3 text-xs font-black text-[#294630] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <Settings size={15} />
                  Manage vehicle
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
                  className="inline-flex items-center gap-2 rounded-[15px] bg-[#245c35] px-4 py-3 text-xs font-black text-white shadow-[0_10px_25px_rgba(36,92,53,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1c4d2c]"
                >
                  <Route size={15} />
                  View deliveries
                </button>
              </div>
            </div>
          </section>

          {/* ===================================================== */}
          {/* KPI */}
          {/* ===================================================== */}

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="group rounded-[22px] border border-[#dfe8db] bg-white p-5 shadow-[0_10px_35px_rgba(39,72,45,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(39,72,45,0.07)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#879489]">
                    Completed
                  </p>

                  <p className="mt-2 text-3xl font-black tracking-tight text-[#19351f]">
                    {completedJobs.length}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#e9f5e7] text-[#337343] transition group-hover:scale-105">
                  <CheckCircle2 size={19} />
                </div>
              </div>

              <p className="mt-3 text-[11px] font-semibold text-[#819087]">
                Successfully delivered
              </p>
            </div>

            <div className="group rounded-[22px] border border-[#dfe8db] bg-white p-5 shadow-[0_10px_35px_rgba(39,72,45,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(39,72,45,0.07)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#879489]">
                    Active jobs
                  </p>

                  <p className="mt-2 text-3xl font-black tracking-tight text-[#19351f]">
                    {activeJobs.length}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#e8f1fa] text-[#477ca5] transition group-hover:scale-105">
                  <Route size={19} />
                </div>
              </div>

              <p className="mt-3 text-[11px] font-semibold text-[#819087]">
                Currently assigned to you
              </p>
            </div>

            <div className="group rounded-[22px] border border-[#dfe8db] bg-white p-5 shadow-[0_10px_35px_rgba(39,72,45,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(39,72,45,0.07)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#879489]">
                    Available
                  </p>

                  <p className="mt-2 text-3xl font-black tracking-tight text-[#19351f]">
                    {availableJobs.length}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#fff4dc] text-[#a87a23] transition group-hover:scale-105">
                  <Package size={19} />
                </div>
              </div>

              <p className="mt-3 text-[11px] font-semibold text-[#819087]">
                Matching your vehicle type
              </p>
            </div>

            <div className="group rounded-[22px] border border-[#dfe8db] bg-white p-5 shadow-[0_10px_35px_rgba(39,72,45,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(39,72,45,0.07)]">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#879489]">
                    Vehicle
                  </p>

                  <p className="mt-2 truncate text-base font-black text-[#19351f]">
                    {deliveryTypeLabel}
                  </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#edf4e9] text-[#4a6c4f] transition group-hover:scale-105">
                  {profile?.deliveryType ===
                  "LARGE_TRUCK" ? (
                    <Truck size={19} />
                  ) : (
                    <Bike size={19} />
                  )}
                </div>
              </div>

              <p className="mt-3 truncate text-[11px] font-semibold text-[#819087]">
                {profile?.vehicleNumber ||
                  "Vehicle number not added"}
              </p>
            </div>
          </section>

          {/* ===================================================== */}
          {/* MAIN CONTENT GRID */}
          {/* ===================================================== */}

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
            {/* ACTIVE DELIVERY */}

            <section className="overflow-hidden rounded-[28px] border border-[#dce7d8] bg-white shadow-[0_12px_45px_rgba(39,72,45,0.055)]">
              <div className="flex items-center justify-between border-b border-[#edf1ea] px-5 py-5 md:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#4c9859]" />

                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#54705a]">
                      Live assignment
                    </p>
                  </div>

                  <h2 className="mt-1.5 text-xl font-black tracking-tight text-[#19351f]">
                    Active delivery
                  </h2>
                </div>

                {activeJobs.length > 0 && (
                  <span className="rounded-full bg-[#e8f5e8] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#327344]">
                    {statusLabel(
                      activeJobs[0].status
                    )}
                  </span>
                )}
              </div>

              {activeJobs.length === 0 ? (
                <div className="relative overflow-hidden px-6 py-12">
                  <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[#edf5e8] blur-3xl" />

                  <div className="relative flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#edf5e8] text-[#397348]">
                      <Route size={27} />
                    </div>

                    <h3 className="mt-4 text-lg font-black text-[#263d2c]">
                      No active delivery
                    </h3>

                    <p className="mt-2 max-w-md text-sm leading-6 text-[#7a887d]">
                      You don't have an assigned delivery right now.
                      Available jobs matching your vehicle will appear
                      below.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 md:p-6">
                  {(() => {
                    const job = activeJobs[0];
                    const tone = statusTone(
                      job.status
                    );

                    return (
                      <>
                        <div className="relative overflow-hidden rounded-[24px] bg-[#edf5e9] p-5 md:p-6">
                          <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[#dcebd6] blur-2xl" />

                          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#70816f]">
                                Pickup farm
                              </p>

                              <h3 className="mt-1 truncate text-2xl font-black tracking-tight text-[#1d3924]">
                                {job.farmer.farmName}
                              </h3>

                              <p className="mt-1 text-xs font-semibold text-[#6d7d70]">
                                Delivery job #
                                {job.id.slice(-8)}
                              </p>
                            </div>

                            <div className="hidden shrink-0 md:block">
                              {profile?.deliveryType ===
                              "LARGE_TRUCK" ? (
                                <img
                                  src="/images/logistics/large-transport-truck.png"
                                  alt=""
                                  className="h-24 w-32 object-contain"
                                />
                              ) : (
                                <img
                                  src="/images/logistics/logistics-scooter.png"
                                  alt=""
                                  className="h-24 w-32 object-contain"
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-[20px] border border-[#e7ede4] bg-[#fafcf9] p-4">
                            <div className="flex items-center gap-2 text-[#7a897d]">
                              <MapPin
                                size={15}
                                className="text-[#3f7b4b]"
                              />

                              <span className="text-[10px] font-black uppercase tracking-wide">
                                Pickup
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-black text-[#2a402f]">
                              {job.pickup ||
                                "Pickup location"}
                            </p>
                          </div>

                          <div className="rounded-[20px] border border-[#e7ede4] bg-[#fafcf9] p-4">
                            <div className="flex items-center gap-2 text-[#7a897d]">
                              <MapPin
                                size={15}
                                className="text-[#3f7b4b]"
                              />

                              <span className="text-[10px] font-black uppercase tracking-wide">
                                Destination
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-black text-[#2a402f]">
                              {job.order?.address?.city ||
                                "Destination unavailable"}
                            </p>

                            {job.order?.address?.state && (
                              <p className="mt-0.5 text-[11px] font-semibold text-[#849086]">
                                {job.order.address.state}
                              </p>
                            )}
                          </div>

                          <div className="rounded-[20px] border border-[#e7ede4] bg-[#fafcf9] p-4">
                            <div className="flex items-center gap-2 text-[#7a897d]">
                              <Package
                                size={15}
                                className="text-[#3f7b4b]"
                              />

                              <span className="text-[10px] font-black uppercase tracking-wide">
                                Load
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-black text-[#2a402f]">
                              {job.quantity} crates
                            </p>

                            <p className="mt-0.5 text-[11px] font-semibold text-[#849086]">
                              {job.vehicle ||
                                deliveryTypeLabel}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-[#e4ebe1] p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#edf4e9] text-[#3d7147]">
                              <MapPin size={18} />
                            </div>

                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wide text-[#89958c]">
                                Location status
                              </p>

                              <p className="mt-0.5 text-xs font-bold text-[#3d5143]">
                                {formatDistance(job)}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-[10px] font-black ${tone.badge}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${tone.dot}`}
                            />

                            {statusLabel(job.status)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/logistics/tracker/${job.id}`
                            )
                          }
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[17px] bg-[#245c35] px-5 py-3.5 text-xs font-black text-white shadow-[0_10px_25px_rgba(36,92,53,0.16)] transition hover:-translate-y-0.5 hover:bg-[#1c4d2c]"
                        >
                          Open delivery tracker
                          <ArrowUpRight size={16} />
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </section>

            {/* DRIVER / VEHICLE PANEL */}

            <section className="overflow-hidden rounded-[28px] border border-[#dce7d8] bg-white shadow-[0_12px_45px_rgba(39,72,45,0.055)]">
              <div className="relative h-40 overflow-hidden bg-[#edf5e8]">
                <img
                  src={
                    profile?.deliveryType ===
                    "LARGE_TRUCK"
                      ? "/images/logistics/large-transport-truck.png"
                      : "/images/logistics/logistics-scooter.png"
                  }
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain object-right"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-[#edf5e8] via-[#edf5e8]/65 to-transparent" />

                <div className="relative z-10 p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#58705b]">
                    Your vehicle
                  </p>

                  <h2 className="mt-1 text-lg font-black text-[#213c29]">
                    Fleet identity
                  </h2>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-3">
                  {profile?.photoUrl ? (
                    <img
                      src={mediaUrl(profile.photoUrl)}
                      alt=""
                      className="h-14 w-14 rounded-[18px] object-cover ring-4 ring-[#edf5e8]"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#e6f2e2] text-[#397348] ring-4 ring-[#f2f7f0]">
                      <CircleUserRound size={27} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#263d2d]">
                      {profile?.name ||
                        user?.name ||
                        "Logistics Partner"}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] font-semibold text-[#839087]">
                      {profile?.email ||
                        "Email unavailable"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[19px] border border-[#e4ebe1] bg-[#fafcf9] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wide text-[#8b978e]">
                      Vehicle type
                    </span>

                    {profile?.deliveryType ===
                    "LARGE_TRUCK" ? (
                      <Truck
                        size={17}
                        className="text-[#397348]"
                      />
                    ) : (
                      <Bike
                        size={17}
                        className="text-[#397348]"
                      />
                    )}
                  </div>

                  <p className="mt-2 text-sm font-black text-[#29402f]">
                    {deliveryTypeLabel}
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-[#7e8b82]">
                    {profile?.vehicleNumber ||
                      "Vehicle number not configured"}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] bg-[#f4f7f1] p-3.5">
                    <ShieldCheck
                      size={17}
                      className="text-[#47774f]"
                    />

                    <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-[#8a968c]">
                      Profile
                    </p>

                    <p className="mt-1 text-xs font-black text-[#304634]">
                      Active
                    </p>
                  </div>

                  <div className="rounded-[18px] bg-[#f4f7f1] p-3.5">
                    <Clock3
                      size={17}
                      className="text-[#47774f]"
                    />

                    <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-[#8a968c]">
                      Earnings
                    </p>

                    <p className="mt-1 text-xs font-black text-[#304634]">
                      Not connected
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveNav("profile")
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[15px] border border-[#d4e1d1] bg-white px-4 py-3 text-xs font-black text-[#315b38] transition hover:bg-[#f3f7f0]"
                >
                  <Edit3 size={14} />
                  Manage profile
                </button>
              </div>
            </section>
          </div>

          {/* ===================================================== */}
          {/* AVAILABLE JOBS */}
          {/* ===================================================== */}

          <section className="mt-5 overflow-hidden rounded-[28px] border border-[#dce7d8] bg-white shadow-[0_12px_45px_rgba(39,72,45,0.055)]">
            <div className="flex flex-col gap-3 border-b border-[#edf1ea] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#c39531]" />

                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#738176]">
                    Dispatch board
                  </p>
                </div>

                <h2 className="mt-1.5 text-xl font-black tracking-tight text-[#19351f]">
                  Available delivery jobs
                </h2>

                <p className="mt-1 text-xs font-semibold text-[#7d897f]">
                  Jobs matching your registered vehicle type.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#edf5e8] px-3 py-1.5 text-[10px] font-black text-[#397348]">
                  {availableJobs.length} available
                </span>
              </div>
            </div>

            {jobsError && (
              <div className="m-5 rounded-[17px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {jobsError}
              </div>
            )}

            {jobsLoading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-[21px] bg-[#f2f6f0]"
                  />
                ))}
              </div>
            ) : availableJobs.length === 0 ? (
              <div className="relative overflow-hidden px-6 py-14 text-center">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#edf5e8] blur-3xl" />

                <div className="relative">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#edf5e8] text-[#397348]">
                    <Package size={27} />
                  </div>

                  <h3 className="mt-4 text-lg font-black text-[#29402f]">
                    No jobs available right now
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7a887d]">
                    New delivery jobs will appear here when they
                    match your logistics profile and vehicle type.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#edf1ea]">
                {availableJobs
                  .slice(0, 5)
                  .map((job) => {
                    const tone = statusTone(
                      job.status
                    );

                    const isTruck =
                      job.vehicle
                        ?.toLowerCase()
                        .includes("truck") ||
                      profile?.deliveryType ===
                        "LARGE_TRUCK";

                    return (
                      <article
                        key={job.id}
                        className="group p-5 transition hover:bg-[#fbfdf9] md:px-6"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                          {/* IMAGE */}

                          <div className="relative flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-[21px] bg-[#edf5e8] sm:w-32">
                            <img
                              src={
                                isTruck
                                  ? "/images/logistics/large-transport-truck.png"
                                  : "/images/logistics/logistics-scooter.png"
                              }
                              alt=""
                              className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                            />
                          </div>

                          {/* DETAILS */}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-black text-[#213a28]">
                                {job.farmer.farmName}
                              </h3>

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${tone.badge}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${tone.dot}`}
                                />

                                {statusLabel(
                                  job.status
                                )}
                              </span>
                            </div>

                            <p className="mt-1 text-[10px] font-bold text-[#919c93]">
                              Delivery job #
                              {job.id.slice(-8)}
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-[#7b887f]">
                                  <MapPin
                                    size={14}
                                    className="shrink-0 text-[#397348]"
                                  />

                                  <span className="text-[9px] font-black uppercase tracking-wide">
                                    Pickup
                                  </span>
                                </div>

                                <p className="mt-1 truncate text-xs font-black text-[#405344]">
                                  {job.pickup ||
                                    "Location unavailable"}
                                </p>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 text-[#7b887f]">
                                  <Package
                                    size={14}
                                    className="shrink-0 text-[#397348]"
                                  />

                                  <span className="text-[9px] font-black uppercase tracking-wide">
                                    Load
                                  </span>
                                </div>

                                <p className="mt-1 text-xs font-black text-[#405344]">
                                  {job.quantity} crates
                                </p>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 text-[#7b887f]">
                                  <Truck
                                    size={14}
                                    className="shrink-0 text-[#397348]"
                                  />

                                  <span className="text-[9px] font-black uppercase tracking-wide">
                                    Vehicle
                                  </span>
                                </div>

                                <p className="mt-1 truncate text-xs font-black text-[#405344]">
                                  {job.vehicle ||
                                    deliveryTypeLabel}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#8a968d]">
                                <MapPin size={12} />
                                {formatDistance(job)}
                              </span>

                              {job.order?.address
                                ?.city && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#8a968d]">
                                  <ArrowUpRight
                                    size={12}
                                  />
                                  {job.order.address.city},{" "}
                                  {
                                    job.order.address
                                      .state
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          {/* CLAIM */}

                          <button
                            type="button"
                            disabled={
                              claimingId === job.id
                            }
                            onClick={() =>
                              claimJob(job)
                            }
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[16px] bg-[#245c35] px-5 py-3.5 text-xs font-black text-white shadow-[0_9px_22px_rgba(36,92,53,0.15)] transition hover:-translate-y-0.5 hover:bg-[#1c4d2c] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {claimingId === job.id
                              ? "Claiming..."
                              : "Claim Job"}

                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>
            )}
          </section>

          {/* ===================================================== */}
          {/* LOWER INFORMATION */}
          {/* ===================================================== */}

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
            {/* PROFILE */}

            <section className="rounded-[28px] border border-[#dce7d8] bg-white p-5 shadow-[0_12px_45px_rgba(39,72,45,0.05)] md:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#68806d]">
                    Partner profile
                  </p>

                  <h2 className="mt-1.5 text-xl font-black tracking-tight text-[#213b28]">
                    Your information
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#edf5e8] text-[#397348]">
                  <UserRound size={18} />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-[18px] bg-[#f7f9f5] p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#929d94]">
                    Name
                  </p>

                  <p className="mt-1 text-sm font-black text-[#334a38]">
                    {profile?.name ||
                      "Not available"}
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#f7f9f5] p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#929d94]">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm font-black text-[#334a38]">
                    {profile?.email ||
                      "Not available"}
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#f7f9f5] p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#929d94]">
                    Phone
                  </p>

                  <p className="mt-1 text-sm font-black text-[#334a38]">
                    {profile?.phone ||
                      "Not provided"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveNav("profile")
                }
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[15px] border border-[#d6e2d3] px-4 py-3 text-xs font-black text-[#315b38] transition hover:bg-[#f4f8f2]"
              >
                <Edit3 size={14} />
                Edit profile
              </button>
            </section>

            {/* VEHICLE */}

            <section className="overflow-hidden rounded-[28px] border border-[#dce7d8] bg-white shadow-[0_12px_45px_rgba(39,72,45,0.05)]">
              <div className="relative h-32 overflow-hidden bg-[#edf5e8]">
                <img
                  src={
                    profile?.deliveryType ===
                    "LARGE_TRUCK"
                      ? "/images/logistics/large-transport-truck.png"
                      : "/images/logistics/logistics-scooter.png"
                  }
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain object-right"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-[#edf5e8] via-[#edf5e8]/70 to-transparent" />

                <div className="relative z-10 p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#68806d]">
                    Fleet
                  </p>

                  <h2 className="mt-1 text-xl font-black text-[#213b28]">
                    Registered vehicle
                  </h2>
                </div>
              </div>

              <div className="p-5 md:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#edf5e8] text-[#397348]">
                    {profile?.deliveryType ===
                    "LARGE_TRUCK" ? (
                      <Truck size={27} />
                    ) : (
                      <Bike size={27} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#2c4432]">
                      {profile?.deliveryType
                        ? DELIVERY_LABELS[
                            profile.deliveryType
                          ]
                        : "Vehicle type not configured"}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-[#7f8c82]">
                      {profile?.vehicleNumber ||
                        "Vehicle number not provided"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-[18px] border border-[#e2e9df] bg-[#fafcf9] p-4">
                  <FileText
                    size={18}
                    className="mt-0.5 shrink-0 text-[#397348]"
                  />

                  <div>
                    <p className="text-xs font-black text-[#344b39]">
                      Verification
                    </p>

                    <p className="mt-1 text-[11px] leading-5 font-semibold text-[#7e8b82]">
                      Document verification is not yet connected
                      to backend storage.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveNav("vehicle")
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[15px] bg-[#245c35] px-4 py-3 text-xs font-black text-white transition hover:bg-[#1c4d2c]"
                >
                  <Settings size={14} />
                  Vehicle information
                </button>
              </div>
            </section>
          </div>

          {/* ===================================================== */}
          {/* QUICK ACTIONS */}
          {/* ===================================================== */}

          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                setActiveNav("profile")
              }
              className="group rounded-[22px] border border-[#dce7d8] bg-white p-5 text-left shadow-[0_10px_35px_rgba(39,72,45,0.04)] transition hover:-translate-y-0.5 hover:border-[#c5d8c1] hover:shadow-[0_15px_40px_rgba(39,72,45,0.07)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#edf5e8] text-[#397348] transition group-hover:scale-105">
                <UserRound size={18} />
              </div>

              <p className="mt-4 text-sm font-black text-[#29402f]">
                Profile
              </p>

              <p className="mt-1 text-[11px] font-semibold leading-5 text-[#7d897f]">
                Manage your logistics account.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveNav("vehicle")
              }
              className="group rounded-[22px] border border-[#dce7d8] bg-white p-5 text-left shadow-[0_10px_35px_rgba(39,72,45,0.04)] transition hover:-translate-y-0.5 hover:border-[#c5d8c1] hover:shadow-[0_15px_40px_rgba(39,72,45,0.07)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#eaf1f8] text-[#477ca5] transition group-hover:scale-105">
                <Settings size={18} />
              </div>

              <p className="mt-4 text-sm font-black text-[#29402f]">
                Vehicle Info
              </p>

              <p className="mt-1 text-[11px] font-semibold leading-5 text-[#7d897f]">
                Update your registered vehicle.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveNav("support")
              }
              className="group rounded-[22px] border border-[#dce7d8] bg-white p-5 text-left shadow-[0_10px_35px_rgba(39,72,45,0.04)] transition hover:-translate-y-0.5 hover:border-[#c5d8c1] hover:shadow-[0_15px_40px_rgba(39,72,45,0.07)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#fff3dc] text-[#a8781e] transition group-hover:scale-105">
                <Headphones size={18} />
              </div>

              <p className="mt-4 text-sm font-black text-[#29402f]">
                Support
              </p>

              <p className="mt-1 text-[11px] font-semibold leading-5 text-[#7d897f]">
                Get help with a delivery.
              </p>
            </button>
          </section>

          {/* ===================================================== */}
          {/* FOOTER NOTE */}
          {/* ===================================================== */}

          <div className="mt-6 flex flex-col gap-2 border-t border-[#dce7d8] pt-5 text-[10px] font-semibold text-[#8a968d] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Farm2Fork Logistics Control Centre
            </span>

            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} />
              Real delivery data • No simulated GPS
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
