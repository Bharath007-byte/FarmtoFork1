import {
  ArrowLeft,
  Check,
  Circle,
  MapPin,
  Package,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../services/api";
import { useRealtime } from "../hooks/useRealtime";

type JobStatus =
  | "CONFIRMED"
  | "PICKUP_SCHEDULED"
  | "FARMER_READY"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

type Job = {
  id: string;
  status: JobStatus;
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

const STEPS = [
  {
    status: "CONFIRMED",
    label: "Job Accepted",
  },
  {
    status: "PICKUP_SCHEDULED",
    label: "Pickup Scheduled",
  },
  {
    status: "PICKED_UP",
    label: "Picked Up",
  },
  {
    status: "IN_TRANSIT",
    label: "In Transit",
  },
  {
    status: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
  },
  {
    status: "DELIVERED",
    label: "Delivered",
  },
] as const;

const STATUS_RANK: Record<string, number> = {
  CONFIRMED: 0,
  PICKUP_SCHEDULED: 1,
  FARMER_READY: 2,
  PICKED_UP: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
};

const NEXT_STATUS: Record<string, string | null> = {
  CONFIRMED: "PICKUP_SCHEDULED",
  PICKUP_SCHEDULED: "FARMER_READY",
  FARMER_READY: "PICKED_UP",
  PICKED_UP: "IN_TRANSIT",
  IN_TRANSIT: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
  DELIVERED: null,
};

function getStepState(
  stepStatus: string,
  currentStatus: string
): "complete" | "current" | "upcoming" {
  const stepRank = STATUS_RANK[stepStatus] ?? 0;
  const currentRank = STATUS_RANK[currentStatus] ?? 0;

  if (stepRank < currentRank) return "complete";
  if (stepRank === currentRank) return "current";

  return "upcoming";
}

export function LogisticsTracker() {
  const navigate = useNavigate();
  const { jobId } = useParams();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [gpsMessage, setGpsMessage] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const loadJob = async () => {
    if (!jobId) {
      setError("Delivery job was not specified.");
      setLoading(false);
      return;
    }

    try {
      setError("");

      const data = await api<{ jobs: Job[] }>("/api/logistics/jobs");

      const found = data.jobs.find((item) => item.id === jobId);

      if (!found) {
        setError("This delivery job could not be found.");
        setJob(null);
        return;
      }

      setJob(found);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load this delivery job."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [jobId]);

  useRealtime(
    [
      "LOGISTICS_BOOKED",
      "LOGISTICS_STATUS_CHANGED",
      "LOGISTICS_LOCATION_UPDATED",
      "ORDER_STATUS_CHANGED",
    ],
    loadJob
  );

  const nextStatus = useMemo(
    () => (job ? NEXT_STATUS[job.status] : null),
    [job]
  );

  const updateStatus = async () => {
    if (!job || !nextStatus) return;

    setSavingStatus(true);
    setActionError("");

    try {
      await api(`/api/logistics/jobs/${job.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      await loadJob();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Unable to update delivery status."
      );
    } finally {
      setSavingStatus(false);
    }
  };

  const sendGps = () => {
    if (!job) return;

    setGpsMessage("");

    if (!navigator.geolocation) {
      setGpsMessage("This browser does not support GPS.");
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

          setGpsMessage("GPS location stored from this device.");
          await loadJob();
        } catch (err) {
          setGpsMessage(
            err instanceof ApiError
              ? err.message
              : "Unable to store GPS location."
          );
        }
      },
      () => {
        setGpsMessage(
          "Location permission was denied. GPS was not stored."
        );
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f4ec] px-5 py-10">
        <div className="mx-auto max-w-3xl animate-pulse">
          <div className="h-5 w-28 rounded bg-zinc-200" />
          <div className="mt-8 h-8 w-64 rounded bg-zinc-200" />
          <div className="mt-8 h-96 rounded-[2rem] bg-white" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#f7f4ec] px-5 py-10 text-[#1c2b22]">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => navigate("/logistics/jobs")}
            className="flex items-center gap-2 text-sm font-semibold text-[#2f7a4a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to jobs
          </button>

          <div className="mt-10 rounded-[2rem] bg-white p-8 shadow-sm">
            <h1 className="font-serif text-3xl">
              Delivery job unavailable
            </h1>

            <p className="mt-3 text-sm text-zinc-500">
              {error || "This job is no longer available."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/logistics/jobs")}
          className="flex items-center gap-2 text-sm font-semibold text-[#2f7a4a] transition hover:text-[#205c38]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </button>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2f7a4a]">
            Delivery tracker
          </p>

          <h1 className="mt-2 font-serif text-4xl">
            Current delivery
          </h1>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e8f3e8]">
                  <Package className="h-7 w-7 text-[#2f7a4a]" />
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    {job.farmer.farmName}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {job.order?.address
                      ? `${job.order.address.city}, ${job.order.address.state}`
                      : "Customer address available in order"}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {job.quantity} • Pickup from {job.pickup}
                  </p>
                </div>
              </div>

              <span className="w-fit rounded-full bg-[#e7f6ea] px-3 py-1.5 text-xs font-bold text-[#2f7a4a]">
                {job.status.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-bold">
              Delivery progress
            </h2>

            <div className="mt-7">
              {STEPS.map((step, index) => {
                const state = getStepState(step.status, job.status);

                const completed =
                  state === "complete" || state === "current";

                const isCurrent =
                  step.status === job.status ||
                  (step.status === "PICKED_UP" &&
                    job.status === "FARMER_READY");

                return (
                  <div
                    key={step.status}
                    className="relative flex min-h-[76px] gap-4"
                  >
                    {index < STEPS.length - 1 && (
                      <div
                        className={`absolute left-[11px] top-7 h-[76px] w-0.5 ${
                          completed
                            ? "bg-[#2f7a4a]"
                            : "bg-zinc-200"
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                        completed
                          ? "border-[#2f7a4a] bg-[#2f7a4a] text-white"
                          : "border-zinc-300 bg-white text-zinc-300"
                      }`}
                    >
                      {completed ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Circle className="h-2 w-2 fill-current" />
                      )}
                    </div>

                    <div className="pt-0.5">
                      <p
                        className={`text-sm font-semibold ${
                          completed || isCurrent
                            ? "text-[#1c2b22]"
                            : "text-zinc-400"
                        }`}
                      >
                        {step.label}
                      </p>

                      {isCurrent && (
                        <p className="mt-1 text-xs font-medium text-[#2f7a4a]">
                          Current step
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {actionError && (
              <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </div>
            )}

            {gpsMessage && (
              <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                {gpsMessage}
              </div>
            )}

            <div className="mt-4 grid gap-3">
              {nextStatus && (
                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={updateStatus}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#16804a] px-5 text-sm font-bold text-white transition hover:bg-[#116a3e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  {savingStatus
                    ? "Updating..."
                    : `Mark as ${nextStatus
                        .replaceAll("_", " ")
                        .toLowerCase()}`}
                </button>
              )}

              {job.status === "OUT_FOR_DELIVERY" && (
                <button
                  type="button"
                  onClick={() => {
                    setActionError(
                      "Not Delivered requires a reason. The delivery outcome form will be added next."
                    );
                  }}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-white px-5 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                >
                  <X className="h-4 w-4" />
                  Not Delivered
                </button>
              )}

              <button
                type="button"
                onClick={sendGps}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                <MapPin className="h-4 w-4" />
                Send My GPS Location
              </button>
            </div>

            <p className="mt-5 text-center text-xs text-zinc-400">
              GPS uses this device's real browser location. No
              coordinates are generated by the application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
