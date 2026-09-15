import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Circle,
  MapPin,
  AlertCircle,
  Navigation,
  Camera,
  UploadCloud,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { LogisticsLayout } from "../layouts/LogisticsLayout";
import { api, ApiError, rupees } from "../services/api";
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
      line1?: string;
    } | null;
  } | null;
};

const STEPS = [
  { status: "CONFIRMED", label: "Job Accepted" },
  { status: "PICKUP_SCHEDULED", label: "Pickup Scheduled" },
  { status: "PICKED_UP", label: "Cargo Picked Up" },
  { status: "IN_TRANSIT", label: "In Transit" },
  { status: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { status: "DELIVERED", label: "Delivered to Society" },
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

function getStepState(stepStatus: string, currentStatus: string): "complete" | "current" | "upcoming" {
  const stepRank = STATUS_RANK[stepStatus] ?? 0;
  const currentRank = STATUS_RANK[currentStatus] ?? 0;

  if (stepRank < currentRank) return "complete";
  if (stepRank === currentRank) return "current";
  return "upcoming";
}

export function LogisticsTracker() {
  const { jobId } = useParams();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [gpsMessage, setGpsMessage] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (jobId) {
      const saved = localStorage.getItem(`pod-${jobId}`);
      if (saved) setDeliveryPhoto(saved);
    }
  }, [jobId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setDeliveryPhoto(dataUrl);
      if (jobId) {
        localStorage.setItem(`pod-${jobId}`, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setDeliveryPhoto(null);
    if (jobId) {
      localStorage.removeItem(`pod-${jobId}`);
    }
  };

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
      setError(err instanceof ApiError ? err.message : "Unable to load this delivery job.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJob();
  }, [jobId]);

  useRealtime(
    ["LOGISTICS_BOOKED", "LOGISTICS_STATUS_CHANGED", "LOGISTICS_LOCATION_UPDATED", "ORDER_STATUS_CHANGED"],
    () => {
      void loadJob();
    }
  );

  const nextStatus = useMemo(() => (job ? NEXT_STATUS[job.status] : null), [job]);

  const updateStatus = async () => {
    if (!job || !nextStatus) return;

    setSavingStatus(true);
    setActionError("");

    try {
      await api(`/api/logistics/jobs/${job.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadJob();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Unable to update delivery status.");
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
          setGpsMessage("GPS location stored & broadcasted to admin hub.");
          await loadJob();
        } catch (err) {
          setGpsMessage(err instanceof ApiError ? err.message : "Unable to broadcast GPS location.");
        }
      },
      () => {
        setGpsMessage("Location permission was denied. GPS was not stored.");
      }
    );
  };

  if (loading) {
    return (
      <LogisticsLayout>
        <div className="p-8 animate-pulse space-y-4">
          <div className="h-6 w-40 bg-slate-200 rounded" />
          <div className="h-64 bg-white rounded-2xl border border-slate-200" />
        </div>
      </LogisticsLayout>
    );
  }

  if (error || !job) {
    return (
      <LogisticsLayout>
        <div className="space-y-4">
          <Link
            to="/logistics/deliveries"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft size={14} />
            <span>Back to deliveries</span>
          </Link>
          <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
            <AlertCircle size={32} className="mx-auto text-rose-500 mb-2" />
            <h3 className="text-sm font-bold text-slate-900">{error || "Delivery consignment unavailable"}</h3>
          </div>
        </div>
      </LogisticsLayout>
    );
  }

  const isDelivered = job.status === "DELIVERED";
  const isHeavy = job.quantity > 30 || job.vehicle.toLowerCase().includes("truck");
  const payoutPaise = isHeavy ? 35000 + job.quantity * 150 : 6000 + job.quantity * 200;

  return (
    <LogisticsLayout>
      <div className="space-y-6">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/logistics/deliveries"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft size={14} />
            <span>Back to deliveries</span>
          </Link>
          <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-lg">
            Shipment ID: SS-{job.id.slice(0, 8)}
          </span>
        </div>

        {/* Primary Route Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                  {job.quantity} kg Fresh Cargo
                </span>
                <span className="text-xs font-bold text-slate-500">• {job.vehicle} • {isDelivered ? "Delivered" : "In Progress"}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {job.farmer?.farmName || "Farm Hub"} ➔ {job.order?.address?.city || "Retail Society"}
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Driver Payout</span>
              <p className="text-xl font-black text-slate-900">{rupees(payoutPaise)}</p>
            </div>
          </div>

          {/* Pin-to-Pin Route */}
          <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Pickup Location</span>
                <h4 className="text-xs font-bold text-slate-900 mt-0.5">{job.pickup || job.farmer.farmName}</h4>
                <p className="text-xs text-slate-500">Contact: {job.farmer.user.name}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase">Drop Destination</span>
                <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                  {job.order?.address ? `${job.order.address.city}, ${job.order.address.state}` : "Consumer Address"}
                </h4>
                <p className="text-xs text-slate-500">Verified Consumer Society</p>
              </div>
            </div>
          </div>

          {/* External Map Navigation Link */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-600">
              {job.currentLat && job.currentLng ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>GPS Broadcast Active ({job.currentLat.toFixed(4)}, {job.currentLng.toFixed(4)})</span>
                </span>
              ) : (
                <span className="text-slate-400">GPS ready · Tap 'Broadcast GPS Position' below to stream coordinates</span>
              )}
            </div>

            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                job.pickup
              )}&destination=${encodeURIComponent(
                job.order?.address ? `${job.order.address.city}, ${job.order.address.state}` : "Devanahalli, Bengaluru"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-slate-600 transition"
            >
              <span>Launch Turn-by-Turn Navigation</span>
              <Navigation size={13} />
            </a>
          </div>
        </div>

        {/* Consignment & Delivery Photo Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Camera size={16} className="text-emerald-600" />
                <span>Consignment & Delivery Photo</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Attach cargo loading or proof-of-delivery picture for verified society handover.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs self-start sm:self-auto"
            >
              <Camera size={14} />
              <span>{deliveryPhoto ? "Change Photo" : "Add Delivery Photo"}</span>
            </button>
          </div>

          {deliveryPhoto ? (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src={deliveryPhoto}
                  alt="Delivery Proof"
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs"
                />
                <div>
                  <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 size={13} />
                    <span>Photo Verified & Attached</span>
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Consignment SS-{job.id.slice(0, 8)} • Saved with delivery audit trail
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removePhoto}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 p-2 hover:bg-rose-50 rounded-lg transition"
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20"
            >
              <UploadCloud size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700">Tap to upload delivery proof photo</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Supports JPG, PNG, WEBP from camera or gallery</p>
            </div>
          )}
        </div>

        {/* Milestone Stepper & Actions */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide mb-6">
            Consignment Milestones & Status Progression
          </h3>

          <div className="space-y-4">
            {STEPS.map((step, index) => {
              const state = getStepState(step.status, job.status);
              const completed = state === "complete" || state === "current";
              const isCurrent =
                step.status === job.status ||
                (step.status === "PICKED_UP" && job.status === "FARMER_READY");

              return (
                <div key={step.status} className="relative flex items-center gap-4">
                  {index < STEPS.length - 1 && (
                    <div
                      className={`absolute left-[13px] top-7 h-8 w-0.5 ${
                        completed ? "bg-slate-900" : "bg-slate-200"
                      }`}
                    />
                  )}

                  <div
                    className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition ${
                      completed
                        ? "bg-slate-900 text-white"
                        : "bg-white border-2 border-slate-200 text-slate-400"
                    }`}
                  >
                    {completed ? <Check size={14} /> : <Circle size={8} />}
                  </div>

                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          completed || isCurrent ? "text-slate-900" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold text-emerald-600">Active milestone</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {actionError && (
            <div className="mt-6 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {actionError}
            </div>
          )}

          {gpsMessage && (
            <div className="mt-6 p-3 rounded-xl bg-slate-50 text-slate-700 text-xs border border-slate-200">
              {gpsMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            {nextStatus && (
              <button
                type="button"
                disabled={savingStatus}
                onClick={updateStatus}
                className="flex-1 py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Check size={15} />
                <span>
                  {savingStatus
                    ? "Updating Milestone..."
                    : `Confirm: Advance to ${nextStatus.replaceAll("_", " ")}`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={sendGps}
              className="py-3 px-5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <MapPin size={15} />
              <span>Broadcast GPS Position</span>
            </button>
          </div>
        </div>
      </div>
    </LogisticsLayout>
  );
}
