import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  Bike,
  CheckCircle2,
  CircleUserRound,
  MapPin,
  Save,
  Truck,
  UserRound,
  Wallet,
  PackageCheck,
  Pencil,
} from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { useApp } from "../context/AppState";
import { api, ApiError } from "../services/api";
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

const NEXT: Record<string, string | null> = {
  CONFIRMED: "PICKUP_SCHEDULED",
  PICKUP_SCHEDULED: "FARMER_READY",
  FARMER_READY: "PICKED_UP",
  PICKED_UP: "IN_TRANSIT",
  IN_TRANSIT: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

const DELIVERY_LABELS: Record<DeliveryType, string> = {
  BIKE: "Bike / Scooter",
  LARGE_TRUCK: "Large Truck / Cold Chain",
};

function deliveryTypeMatchesJob(type: DeliveryType | null, job: Job) {
  if (!type) return true;

  const vehicle = String(job.vehicle || "").toLowerCase();

  if (type === "BIKE") {
    return (
      vehicle.includes("bike") ||
      vehicle.includes("scooter") ||
      vehicle.includes("two") ||
      vehicle.includes("2")
    );
  }

  return (
    vehicle.includes("truck") ||
    vehicle.includes("van") ||
    vehicle.includes("cold") ||
    vehicle.includes("large") ||
    vehicle.includes("mini")
  );
}

function formatQuantity(quantity: number) {
  if (Number.isInteger(quantity)) return String(quantity);
  return quantity.toFixed(2).replace(/\.?0+$/, "");
}

export function LogisticsDashboard() {
  const { user, loginWithPassword } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [profile, setProfile] = useState<LogisticsProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user || user.role !== "logistics") return;

    setLoadingProfile(true);
    setProfileError("");

    try {
      const data = await api<{ profile: LogisticsProfile }>(
        "/api/logistics/profile"
      );

      setProfile(data.profile);
      setDeliveryType(data.profile.deliveryType);
      setVehicleNumber(data.profile.vehicleNumber || "");
    } catch (error) {
      setProfileError(
        error instanceof ApiError
          ? error.message
          : "Unable to load logistics profile."
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");

    const error = await loginWithPassword(email, password);

    if (error) {
      setLoginError(error);
    }
  };

  const saveProfile = async () => {
    setSaveError("");

    if (!deliveryType) {
      setSaveError("Select a delivery type.");
      return;
    }

    if (vehicleNumber.trim().length < 3) {
      setSaveError("Enter a valid vehicle number.");
      return;
    }

    setSavingProfile(true);

    try {
      const data = await api<{ profile: LogisticsProfile }>(
        "/api/logistics/profile",
        {
          method: "PATCH",
          body: JSON.stringify({
            deliveryType,
            vehicleNumber: vehicleNumber.trim().toUpperCase(),
          }),
        }
      );

      setProfile(data.profile);
      setDeliveryType(data.profile.deliveryType);
      setVehicleNumber(data.profile.vehicleNumber || "");
      setEditing(false);
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : "Unable to save your delivery profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user || user.role !== "logistics") {
    return (
      <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
        <SiteNav />

        <div className="mx-auto max-w-md px-5 pb-16 pt-28">
          <div className="rounded-[2rem] bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f3e8]">
              <Truck className="h-6 w-6 text-[#2f7a4a]" />
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-[#2f7a4a]">
              Farm2Fork Logistics
            </p>

            <h1 className="mt-2 font-serif text-4xl">
              Fleet desk login
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Sign in with your logistics worker account to manage delivery
              jobs and your fleet profile.
            </p>

            <form onSubmit={onLogin} className="mt-8 space-y-3">
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                className="w-full rounded-2xl border border-zinc-200 bg-[#fafaf7] px-4 py-3.5 text-sm outline-none transition focus:border-[#2f7a4a]"
              />

              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="w-full rounded-2xl border border-zinc-200 bg-[#fafaf7] px-4 py-3.5 text-sm outline-none transition focus:border-[#2f7a4a]"
              />

              {loginError && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#2f7a4a] py-3.5 text-sm font-bold text-white transition hover:bg-[#25643c]"
              >
                Sign in to logistics
              </button>
            </form>

            <p className="mt-5 text-sm text-zinc-500">
              Need a fleet account?{" "}
              <Link
                to="/register/logistics"
                className="font-semibold text-[#2f7a4a]"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#f7f4ec]">
        <SiteNav />
        <div className="mx-auto max-w-5xl px-5 pb-16 pt-32">
          <div className="animate-pulse">
            <div className="h-4 w-28 rounded bg-zinc-200" />
            <div className="mt-4 h-12 w-80 rounded bg-zinc-200" />
            <div className="mt-8 h-48 rounded-[2rem] bg-white" />
          </div>
        </div>
      </div>
    );
  }

  const needsSetup = !profile?.deliveryType || !profile?.vehicleNumber;

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <SiteNav />

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-28">
        {needsSetup || editing ? (
          <WorkerSetup
            user={user}
            deliveryType={deliveryType}
            setDeliveryType={setDeliveryType}
            vehicleNumber={vehicleNumber}
            setVehicleNumber={setVehicleNumber}
            saving={savingProfile}
            error={saveError || profileError}
            onSave={saveProfile}
            editing={editing}
            onCancel={() => {
              setEditing(false);
              setDeliveryType(profile?.deliveryType || null);
              setVehicleNumber(profile?.vehicleNumber || "");
              setSaveError("");
            }}
          />
        ) : (
          <WorkerHome
            profile={profile}
            onEdit={() => setEditing(true)}
          />
        )}
      </main>
    </div>
  );
}

function WorkerSetup({
  user,
  deliveryType,
  setDeliveryType,
  vehicleNumber,
  setVehicleNumber,
  saving,
  error,
  onSave,
  editing,
  onCancel,
}: {
  user: { name: string };
  deliveryType: DeliveryType | null;
  setDeliveryType: (value: DeliveryType) => void;
  vehicleNumber: string;
  setVehicleNumber: (value: string) => void;
  saving: boolean;
  error: string;
  onSave: () => void;
  editing: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/"
        className="text-sm font-semibold text-[#2f7a4a]"
      >
        ← Farm2Fork
      </Link>

      <div className="mt-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dfeee0]">
          <CircleUserRound className="h-7 w-7 text-[#2f7a4a]" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-[#2f7a4a]">
          Worker profile
        </p>

        <h1 className="mt-2 font-serif text-4xl md:text-5xl">
          {editing ? "Update your delivery setup" : `Welcome, ${user.name}`}
        </h1>

        <p className="mt-3 max-w-2xl text-zinc-600">
          Choose the type of vehicle operation you use so Farm2Fork can show
          you the right delivery work.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <DeliveryChoice
          selected={deliveryType === "BIKE"}
          icon={<Bike className="h-8 w-8" />}
          title="Bike / Scooter"
          description="For smaller orders, short-radius and same-day deliveries."
          points={["Small produce orders", "Short delivery radius", "Fast local deliveries"]}
          onClick={() => setDeliveryType("BIKE")}
        />

        <DeliveryChoice
          selected={deliveryType === "LARGE_TRUCK"}
          icon={<Truck className="h-8 w-8" />}
          title="Large Truck / Cold Chain"
          description="For bulk produce, larger loads and temperature-sensitive transport."
          points={["Bulk orders", "Long-distance transport", "Cold-chain capable loads"]}
          onClick={() => setDeliveryType("LARGE_TRUCK")}
        />
      </div>

      <div className="mt-7 rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <label className="text-sm font-bold">
          Vehicle registration number
        </label>

        <p className="mt-1 text-sm text-zinc-500">
          Enter the vehicle you will use for Farm2Fork deliveries.
        </p>

        <input
          value={vehicleNumber}
          onChange={(event) =>
            setVehicleNumber(event.target.value.toUpperCase())
          }
          placeholder="AP XX XX XXXX"
          className="mt-5 w-full rounded-2xl border border-zinc-200 bg-[#fafaf7] px-4 py-4 text-sm font-semibold uppercase outline-none transition focus:border-[#2f7a4a]"
        />

        {error && (
          <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-full bg-[#2f7a4a] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#25643c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save & Continue"}
          </button>

          {editing && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-bold"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveryChoice({
  selected,
  icon,
  title,
  description,
  points,
  onClick,
}: {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  points: string[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative rounded-[2rem] border p-7 text-left transition ${
        selected
          ? "border-[#2f7a4a] bg-[#eef7ee] shadow-[0_12px_35px_rgba(47,122,74,0.12)]"
          : "border-white bg-white shadow-sm hover:-translate-y-1 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
            selected
              ? "bg-[#2f7a4a] text-white"
              : "bg-[#e8f3e8] text-[#2f7a4a]"
          }`}
        >
          {icon}
        </div>

        {selected && (
          <CheckCircle2 className="h-6 w-6 text-[#2f7a4a]" />
        )}
      </div>

      <h2 className="mt-6 text-xl font-bold">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {description}
      </p>

      <div className="mt-5 space-y-2">
        {points.map((point) => (
          <div key={point} className="flex items-center gap-2 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2f7a4a]" />
            {point}
          </div>
        ))}
      </div>

      <div
        className={`mt-6 text-xs font-bold uppercase tracking-[0.16em] ${
          selected ? "text-[#2f7a4a]" : "text-zinc-400"
        }`}
      >
        {selected ? "Selected" : "Select operation"}
      </div>
    </button>
  );
}

function WorkerHome({
  profile,
  onEdit,
}: {
  profile: LogisticsProfile;
  onEdit: () => void;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobError, setJobError] = useState("");

  const loadJobs = useCallback(() => {
    return api<{ jobs: Job[] }>("/api/logistics/jobs")
      .then((data) => {
        setJobs(data.jobs);
        setJobError("");
      })
      .catch((error) => {
        setJobError(
          error instanceof ApiError
            ? error.message
            : "Unable to load delivery jobs."
        );
      });
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useRealtime(
    [
      "LOGISTICS_BOOKED",
      "LOGISTICS_STATUS_CHANGED",
      "LOGISTICS_LOCATION_UPDATED",
    ],
    loadJobs
  );

  const mine = useMemo(
    () => jobs.filter((job) => job.assignedUserId === profile.id),
    [jobs, profile.id]
  );

  const completed = useMemo(
    () => mine.filter((job) => job.status === "DELIVERED"),
    [mine]
  );

  const active = useMemo(
    () =>
      mine.filter(
        (job) =>
          job.status !== "DELIVERED" && job.status !== "CANCELLED"
      ),
    [mine]
  );

  const available = useMemo(
    () =>
      jobs.filter(
        (job) =>
          !job.assignedUserId &&
          job.status !== "CANCELLED" &&
          deliveryTypeMatchesJob(profile.deliveryType, job)
      ),
    [jobs, profile.deliveryType]
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#2f7a4a]">
            Logistics control centre
          </p>

          <h1 className="mt-2 font-serif text-4xl md:text-5xl">
            Good day, {profile.name} 👋
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-600">
            Keep fresh produce moving from farm gate to customer.
          </p>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold"
        >
          <Pencil className="h-4 w-4" />
          Edit vehicle
        </button>
      </div>

      <section className="mt-8 overflow-hidden rounded-[2rem] bg-[#20382a] p-6 text-white md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-7">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/10">
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-9 w-9 text-white/80" />
              )}
            </div>

            <div>
              <p className="text-sm text-white/60">Delivery worker</p>
              <h2 className="mt-1 text-2xl font-bold">
                {profile.name}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
                <span>
                  {profile.deliveryType
                    ? DELIVERY_LABELS[profile.deliveryType]
                    : "Delivery worker"}
                </span>
                <span>•</span>
                <span>{profile.vehicleNumber}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8fd49a]" />
              Available for jobs
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<PackageCheck className="h-5 w-5" />}
          label="Completed"
          value={completed.length}
          description="Successful deliveries"
        />

        <StatCard
          icon={<MapPin className="h-5 w-5" />}
          label="Active jobs"
          value={active.length}
          description="Currently assigned"
        />

        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Earnings"
          value="₹0"
          description="Earnings module coming next"
        />
      </section>

      {jobError && (
        <div className="mt-6 rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {jobError}
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
              Available now
            </p>
            <h2 className="mt-1 font-serif text-3xl">
              Delivery jobs
            </h2>
          </div>

          <Link
            to="/logistics/jobs"
            className="text-sm font-bold text-[#2f7a4a]"
          >
            Open fleet desk →
          </Link>
        </div>

        {available.length === 0 ? (
          <div className="mt-5 rounded-[2rem] border border-dashed border-zinc-300 bg-white/50 p-8 text-center">
            <PackageCheck className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 font-semibold text-zinc-600">
              No matching unassigned jobs right now.
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              New logistics bookings will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {available.slice(0, 3).map((job) => (
              <JobPreview
                key={job.id}
                job={job}
                onClaim={async () => {
                  await api(`/api/logistics/jobs/${job.id}/claim`, {
                    method: "POST",
                  });
                  await loadJobs();
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
            My work
          </p>
          <h2 className="mt-1 font-serif text-3xl">
            Active deliveries
          </h2>
        </div>

        {active.length === 0 ? (
          <div className="mt-5 rounded-[2rem] bg-white p-7 text-sm text-zinc-500 shadow-sm">
            You have no active delivery jobs.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {active.slice(0, 3).map((job) => (
              <ActiveJob key={job.id} job={job} onReload={loadJobs} />
            ))}
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
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-[1.7rem] bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3e8] text-[#2f7a4a]">
        {icon}
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-400">
        {label}
      </p>

      <p className="mt-1 text-3xl font-bold">{value}</p>

      <p className="mt-1 text-xs text-zinc-400">{description}</p>
    </div>
  );
}

function JobPreview({
  job,
  onClaim,
}: {
  job: Job;
  onClaim: () => Promise<void>;
}) {
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="rounded-[1.8rem] bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="rounded-full bg-[#e8f3e8] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#2f7a4a]">
            {job.status.replaceAll("_", " ")}
          </span>

          <h3 className="mt-3 text-lg font-bold">
            {job.farmer.farmName}
          </h3>

          <p className="mt-1 text-sm text-zinc-500">
            {formatQuantity(job.quantity)} • Pickup {job.pickup}
          </p>

          {job.order?.address && (
            <p className="mt-1 text-sm text-zinc-400">
              Deliver to {job.order.address.city},{" "}
              {job.order.address.state}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={claiming}
          onClick={async () => {
            setClaiming(true);
            setError("");

            try {
              await onClaim();
            } catch (err) {
              setError(
                err instanceof ApiError
                  ? err.message
                  : "Unable to claim this job."
              );
            } finally {
              setClaiming(false);
            }
          }}
          className="rounded-full bg-[#2f7a4a] px-5 py-3 text-xs font-bold text-white disabled:opacity-60"
        >
          {claiming ? "Claiming..." : "Claim job"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
}

function ActiveJob({
  job,
  onReload,
}: {
  job: Job;
  onReload: () => Promise<void>;
}) {
  const next = NEXT[job.status];
  const [working, setWorking] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");
  const [error, setError] = useState("");

  const updateStatus = async (status: string) => {
    setWorking(true);
    setError("");

    try {
      await api(`/api/logistics/jobs/${job.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      await onReload();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to update delivery status."
      );
    } finally {
      setWorking(false);
    }
  };

  const sendGps = () => {
    setGpsMessage("");
    setError("");

    if (!navigator.geolocation) {
      setGpsMessage("This browser does not support geolocation.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api(`/api/logistics/jobs/${job.id}/location`, {
            method: "PATCH",
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });

          setGpsMessage("Current GPS location stored.");
          await onReload();
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to store GPS location."
          );
        }
      },
      () => {
        setGpsMessage(
          "Location permission was unavailable. No fake location was stored."
        );
      }
    );
  };

  return (
    <div className="rounded-[1.8rem] bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="rounded-full bg-[#fff4dc] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#9a6a13]">
            {job.status.replaceAll("_", " ")}
          </span>

          <h3 className="mt-3 text-lg font-bold">
            {job.farmer.farmName}
          </h3>

          <p className="mt-1 text-sm text-zinc-500">
            {formatQuantity(job.quantity)} • {job.pickup}
          </p>

          {job.order?.address && (
            <p className="mt-1 text-sm text-zinc-400">
              Customer: {job.order.address.city},{" "}
              {job.order.address.state}
            </p>
          )}
        </div>

        {next && (
          <button
            type="button"
            disabled={working}
            onClick={() => updateStatus(next)}
            className="rounded-full bg-[#2f7a4a] px-5 py-3 text-xs font-bold text-white disabled:opacity-60"
          >
            {working
              ? "Updating..."
              : `Mark ${next.replaceAll("_", " ").toLowerCase()}`}
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={sendGps}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2.5 text-xs font-bold"
        >
          <MapPin className="h-4 w-4" />
          Send my GPS
        </button>
      </div>

      {job.currentLat != null && job.currentLng != null && (
        <p className="mt-3 text-xs text-zinc-400">
          Last GPS: {job.currentLat.toFixed(5)},{" "}
          {job.currentLng.toFixed(5)}
          {job.locationUpdatedAt
            ? ` • ${new Date(job.locationUpdatedAt).toLocaleString(
                "en-IN"
              )}`
            : ""}
        </p>
      )}

      {gpsMessage && (
        <p className="mt-3 text-sm text-zinc-500">{gpsMessage}</p>
      )}

      {error && (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
}

export function LogisticsJobs() {
  const { user } = useApp();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [gpsMsg, setGpsMsg] = useState("");

  const load = useCallback(() => {
    api<{ jobs: Job[] }>("/api/logistics/jobs")
      .then((data) => {
        setJobs(data.jobs);
        setError("");
      })
      .catch((error) =>
        setError(
          error instanceof ApiError
            ? error.message
            : "Unable to load jobs"
        )
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime(
    [
      "LOGISTICS_BOOKED",
      "LOGISTICS_STATUS_CHANGED",
      "LOGISTICS_LOCATION_UPDATED",
    ],
    load
  );

  const mine = jobs.filter(
    (job) => job.assignedUserId === user?.id
  );

  const open = jobs.filter((job) => !job.assignedUserId);

  return (
    <div className="min-h-screen bg-[#f7f4ec]">
      <SiteNav />

      <div className="mx-auto max-w-5xl px-5 pb-16 pt-28">
        <Link
          to="/logistics"
          className="text-sm font-semibold text-[#2f7a4a]"
        >
          ← Logistics home
        </Link>

        <h1 className="mt-4 font-serif text-4xl">Fleet desk</h1>

        <p className="mt-2 text-sm text-zinc-500">
          Jobs come from paid or COD orders in PostgreSQL.
        </p>

        {error && (
          <p className="mt-4 text-sm text-rose-600">{error}</p>
        )}

        {gpsMsg && (
          <p className="mt-2 text-sm text-zinc-500">{gpsMsg}</p>
        )}

        <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-zinc-400">
          Available
        </h2>

        {open.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            No unassigned jobs.
          </p>
        )}

        <ul className="mt-3 space-y-3">
          {open.map((job) => (
            <li
              key={job.id}
              className="rounded-2xl bg-white p-5"
            >
              <p className="text-xs font-bold text-[#2f7a4a]">
                {job.status}
              </p>

              <p className="mt-1 font-bold">
                {job.farmer.farmName}
              </p>

              <p className="text-sm text-zinc-500">
                {job.quantity} • pickup {job.pickup}
                {job.order?.address
                  ? ` • ${job.order.address.city}, ${job.order.address.state}`
                  : ""}
              </p>

              <button
                type="button"
                className="mt-3 rounded-full bg-[#2f7a4a] px-4 py-2 text-xs font-bold text-white"
                onClick={() =>
                  api(`/api/logistics/jobs/${job.id}/claim`, {
                    method: "POST",
                  }).then(load)
                }
              >
                Claim job
              </button>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-zinc-400">
          My jobs
        </h2>

        {mine.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            No assigned jobs yet.
          </p>
        )}

        <ul className="mt-3 space-y-3">
          {mine.map((job) => {
            const next = NEXT[job.status];

            return (
              <li
                key={job.id}
                className="rounded-2xl bg-white p-5"
              >
                <p className="text-xs font-bold text-[#2f7a4a]">
                  {job.status}
                </p>

                <p className="mt-1 font-bold">
                  {job.farmer.farmName}
                </p>

                <p className="text-sm text-zinc-500">
                  {job.quantity} from {job.pickup}
                </p>

                {job.currentLat != null &&
                  job.currentLng != null && (
                    <p className="text-xs text-zinc-400">
                      Last GPS {job.currentLat.toFixed(5)},{" "}
                      {job.currentLng.toFixed(5)}
                      {job.locationUpdatedAt
                        ? ` • ${new Date(
                            job.locationUpdatedAt
                          ).toLocaleString("en-IN")}`
                        : ""}
                    </p>
                  )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {next && (
                    <button
                      type="button"
                      className="rounded-full bg-[#2f7a4a] px-4 py-2 text-xs font-bold text-white"
                      onClick={() =>
                        api(
                          `/api/logistics/jobs/${job.id}/status`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({
                              status: next,
                            }),
                          }
                        ).then(load)
                      }
                    >
                      Mark{" "}
                      {next.replaceAll("_", " ").toLowerCase()}
                    </button>
                  )}

                  <button
                    type="button"
                    className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-bold"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        setGpsMsg(
                          "This browser does not support geolocation."
                        );
                        return;
                      }

                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          api(
                            `/api/logistics/jobs/${job.id}/location`,
                            {
                              method: "PATCH",
                              body: JSON.stringify({
                                latitude:
                                  position.coords.latitude,
                                longitude:
                                  position.coords.longitude,
                              }),
                            }
                          ).then(() => {
                            setGpsMsg(
                              "GPS stored from this device."
                            );
                            load();
                          });
                        },
                        () =>
                          setGpsMsg(
                            "Location permission was denied. GPS was not stored."
                          )
                      );
                    }}
                  >
                    Send my GPS
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
