import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ArrowRight,
} from "lucide-react";
import { LogisticsLayout } from "../layouts/LogisticsLayout";
import { api, ApiError, rupees } from "../services/api";
import { useRealtime } from "../hooks/useRealtime";

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

type LogisticsProfile = {
  id: string;
  name: string;
  deliveryType: "BIKE" | "LARGE_TRUCK" | null;
  vehicleNumber: string | null;
};

export function LogisticsJobs() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<LogisticsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "HEAVY" | "EXPRESS">("ALL");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [jobsRes, profRes] = await Promise.all([
        api<{ jobs: Job[] }>("/api/logistics/jobs"),
        api<{ profile: LogisticsProfile }>("/api/logistics/profile"),
      ]);

      setJobs(jobsRes.jobs || []);
      setProfile(profRes.profile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRealtime(["JOB_CREATED", "LOGISTICS_STATUS_CHANGED"], () => {
    void loadData();
  });

  const availableJobs = useMemo(() => {
    return jobs
      .filter((j) => j.assignedUserId === null && !["DELIVERED", "CANCELLED"].includes(j.status))
      .filter((j) => {
        if (filterType === "HEAVY") {
          return j.quantity > 30 || j.vehicle.toLowerCase().includes("truck");
        }
        if (filterType === "EXPRESS") {
          return j.quantity <= 30 || j.vehicle.toLowerCase().includes("bike");
        }
        return true;
      })
      .filter((j) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          j.farmer?.farmName?.toLowerCase().includes(q) ||
          j.pickup?.toLowerCase().includes(q) ||
          j.order?.address?.city?.toLowerCase().includes(q)
        );
      });
  }, [jobs, filterType, search]);

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
      setError(err instanceof ApiError ? err.message : "Failed to claim job.");
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <LogisticsLayout>
        <div className="p-8 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-white border border-slate-200" />
            ))}
          </div>
        </div>
      </LogisticsLayout>
    );
  }

  return (
    <LogisticsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Available Freight Shipments</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Agricultural dispatches ready for immediate collection across Karnataka and AP.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            {availableJobs.length} Dispatches Open
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Filters & Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by farm name, origin village, or city..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Freight
            </button>
            <button
              onClick={() => setFilterType("HEAVY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === "HEAVY" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Heavy Trucks
            </button>
            <button
              onClick={() => setFilterType("EXPRESS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === "EXPRESS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Express Courier
            </button>
          </div>
        </div>

        {/* Available Jobs List */}
        {availableJobs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
            <CheckCircle2 size={36} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No open dispatches matching your criteria</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try changing your filter settings or check back soon as new harvest orders arrive.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableJobs.map((job) => {
              const isHeavy = job.quantity > 30 || job.vehicle.toLowerCase().includes("truck");
              const payoutPaise = isHeavy ? 35000 + job.quantity * 150 : 6000 + job.quantity * 200;

              return (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition shadow-xs flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        {isHeavy ? "Heavy Freight • Cold Chain" : "Standard Express Courier"}
                      </span>
                      <span className="text-base font-black text-slate-900">{rupees(payoutPaise)}</span>
                    </div>

                    <div className="mt-3 space-y-1">
                      <h4 className="text-base font-extrabold text-slate-900">
                        {job.quantity} kg Fresh Agricultural Consignment
                      </h4>
                      <p className="text-xs text-slate-600 flex items-start gap-1.5 pt-1">
                        <MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-800">Origin:</strong> {job.farmer?.farmName || "Direct Farm"}{" "}
                          ({job.pickup})
                        </span>
                      </p>
                      <p className="text-xs text-slate-600 flex items-start gap-1.5">
                        <MapPin size={14} className="text-blue-600 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-800">Drop:</strong>{" "}
                          {job.order?.address?.city || "Devanahalli Society / Retail Market"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Matched to your {profile?.deliveryType === "LARGE_TRUCK" ? "Large Truck" : "Vehicle"} • Est: <strong className="text-slate-800">{rupees(payoutPaise)}</strong>
                    </span>
                    <button
                      onClick={() => claimJob(job)}
                      disabled={claimingId === job.id}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {claimingId === job.id ? (
                        <>
                          <RotateCw size={12} className="animate-spin" />
                          <span>Claiming...</span>
                        </>
                      ) : (
                        <>
                          <span>Claim Freight</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LogisticsLayout>
  );
}
