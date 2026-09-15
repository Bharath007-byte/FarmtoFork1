import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Truck,
  Package,
  Clock,
  Wallet,
  MapPin,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { LogisticsLayout } from "../layouts/LogisticsLayout";
import { api, ApiError, rupees } from "../services/api";
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
      line1?: string;
    } | null;
  } | null;
};

type EarningsSummary = {
  todayPaise: number;
  weekPaise: number;
  monthPaise: number;
  totalPaise: number;
  completedCount: number;
};

type WorkingHoursData = {
  todayHours: number;
  weekHours: number;
  activeNowHours: number;
  isCurrentlyOnTrip: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Job Accepted",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  FARMER_READY: "Farmer Ready",
  PICKED_UP: "Cargo Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function LogisticsDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<LogisticsProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [hours, setHours] = useState<WorkingHoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [profRes, jobsRes, earnRes, hoursRes] = await Promise.all([
        api<{ profile: LogisticsProfile }>("/api/logistics/profile"),
        api<{ jobs: Job[] }>("/api/logistics/jobs"),
        api<{ summary: EarningsSummary }>("/api/logistics/earnings").catch(() => ({
          summary: { todayPaise: 0, weekPaise: 0, monthPaise: 0, totalPaise: 0, completedCount: 0 },
        })),
        api<WorkingHoursData>("/api/logistics/working-hours").catch(() => ({
          todayHours: 0,
          weekHours: 0,
          activeNowHours: 0,
          isCurrentlyOnTrip: false,
        })),
      ]);

      setProfile(profRes.profile);
      setJobs(jobsRes.jobs || []);
      setEarnings(earnRes.summary);
      setHours(hoursRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sync logistics data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const [bulkAlert, setBulkAlert] = useState<{
    orderId: string;
    quantity: number;
  } | null>(null);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRealtime(
    ["LOGISTICS_STATUS_CHANGED", "LOGISTICS_LOCATION_UPDATED", "ORDER_STATUS_CHANGED", "JOB_CREATED", "BULK_FREIGHT_ALERT"],
    () => {
      void loadData();
      setBulkAlert({ orderId: "BULK-ALERT", quantity: 65 });
    }
  );

  // Filter Active vs Available
  const activeJobs = useMemo(
    () =>
      jobs.filter(
        (job) => job.assignedUserId === profile?.id && !["DELIVERED", "CANCELLED"].includes(job.status)
      ),
    [jobs, profile?.id]
  );

  const availableJobs = useMemo(
    () =>
      jobs.filter((job) => {
        if (job.assignedUserId !== null || ["DELIVERED", "CANCELLED"].includes(job.status)) {
          return false;
        }

        const vLower = (job.vehicle || "").toLowerCase();
        const isBulkContainer =
          job.quantity >= 50 ||
          job.vehicle === "LARGE_TRUCK" ||
          (job.quantity >= 30 && vLower.includes("truck") && !vLower.includes("mini") && !vLower.includes("bike"));

        // If driver is heavy truck/container, strictly show bulk cargo >= 30/50 kg
        if (profile?.deliveryType === "LARGE_TRUCK") {
          return isBulkContainer;
        }

        // If driver is bike, strictly show express drops < 30 kg
        if (profile?.deliveryType === "BIKE") {
          return !isBulkContainer;
        }

        return true;
      }),
    [jobs, profile?.deliveryType]
  );

  const claimJob = async (job: Job) => {
    setClaimingId(job.id);
    setError("");

    try {
      await api(`/api/logistics/jobs/${job.id}/claim`, {
        method: "POST",
      });
      await loadData();
      navigate(`/logistics/tracker/${job.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to claim delivery job.");
    } finally {
      setClaimingId(null);
    }
  };

  const firstName = profile?.name ? profile.name.trim().split(/\s+/)[0] : "Driver";

  if (loading) {
    return (
      <LogisticsLayout>
        <div className="p-8 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200" />
            ))}
          </div>
          <div className="h-48 rounded-2xl bg-white border border-slate-200" />
        </div>
      </LogisticsLayout>
    );
  }

  return (
    <LogisticsLayout>
      <div className="space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {bulkAlert && (
          <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-lg flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                <Truck size={20} className="animate-bounce text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded">
                  High-Capacity Freight Alert
                </span>
                <p className="text-sm font-extrabold mt-0.5">
                  Bulk order placed: ~{Math.round(bulkAlert.quantity)} kg agricultural container load ready for assignment!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBulkAlert(null)}
              className="px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-xs font-bold text-white transition shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Welcome Greeting Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Samruddhi Setu Logistics Desk</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">Devanahalli - Tirupati Highway Corridor</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Namaste, {firstName}! 🚛
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              You are assigned to Heavy Truck <span className="font-mono font-bold text-slate-800">{profile?.vehicleNumber || "KA01EF3456"}</span>. Cold-chain reefer is active at +4°C.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/logistics/jobs"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs"
            >
              <Package size={15} />
              <span>Claim New Freight</span>
            </Link>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Today's Earnings</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900">{rupees(earnings?.todayPaise ?? 0)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Week total: {rupees(earnings?.weekPaise ?? 0)}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Working Hours</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900">{hours?.todayHours ?? 0} hrs</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {hours?.isCurrentlyOnTrip ? "Active trip in progress" : "Duty completed for today"}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Active Dispatches</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Truck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900">{activeJobs.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">In-transit shipments</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Available Jobs</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Package size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900">{availableJobs.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Ready for pickup</p>
            </div>
          </div>
        </div>

        {/* ACTIVE DELIVERIES SECTION */}
        {activeJobs.length > 0 && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Current Active Haul</span>
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  In-Transit Agricultural Consignment
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-200">
                SS-{activeJobs[0].id.slice(0, 8)}
              </span>
            </div>

            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-bold">
                      {job.quantity} kg Cargo
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-semibold">Pickup:</span>
                      <span>{job.farmer?.farmName || "Direct Farm Hub"} ({job.pickup})</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-semibold">Drop:</span>
                      <span>{job.order?.address?.city || "Devanahalli Society / Retail Market"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    to={`/logistics/tracker/${job.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-xs"
                  >
                    <span>Open Live Route & Milestones</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AVAILABLE JOBS / FREIGHT LIST */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Available Freight Shipments
              </h3>
              <p className="text-xs text-slate-500">
                Direct farm-gate collections waiting for pickup in your assigned region
              </p>
            </div>
            <Link
              to="/logistics/jobs"
              className="text-xs font-bold text-slate-900 hover:text-slate-600 flex items-center gap-1"
            >
              <span>View all available ({availableJobs.length})</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {availableJobs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              <CheckCircle2 size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">All local dispatches are claimed!</p>
              <p className="text-slate-500 mt-0.5">
                New bulk harvest orders will appear as soon as farmers list them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableJobs.slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        {job.quantity > 50 ? "Heavy Freight • Large Truck" : "Standard Express"}
                      </span>
                      <span className="font-black text-slate-900 text-sm">
                        {rupees(job.quantity > 50 ? 35000 + job.quantity * 150 : 6000 + job.quantity * 200)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {job.quantity} kg Fresh Farm Produce
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
                        <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                        <span>Pickup: {job.farmer?.farmName || "Farm Cluster"} • {job.pickup}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Matched to your {profile?.deliveryType === "LARGE_TRUCK" ? "Large Truck" : "Vehicle"}
                    </span>
                    <button
                      onClick={() => claimJob(job)}
                      disabled={claimingId === job.id}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {claimingId === job.id ? (
                        <>
                          <RotateCw size={12} className="animate-spin" />
                          <span>Claiming...</span>
                        </>
                      ) : (
                        <span>Claim Freight</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </LogisticsLayout>
  );
}
