import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  MapPin,
  Package,
  RotateCw,
  Search,
  Truck,
} from "lucide-react";
import { LogisticsLayout } from "../layouts/LogisticsLayout";
import { api, rupees } from "../services/api";

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
    name: string;
    city: string;
  } | null;
  farmer: {
    farmName: string;
    user: {
      name: string;
    };
  };
  order?: {
    address?: {
      line1: string;
      district: string;
      city: string;
      state: string;
      pinCode: string;
    } | null;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Job Accepted",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  FARMER_READY: "Ready for Pickup",
  PICKED_UP: "Cargo Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function LogisticsDeliveries() {
  const [profile, setProfile] = useState<LogisticsProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [profRes, jobsRes] = await Promise.all([
        api<{ profile: LogisticsProfile }>("/api/logistics/profile"),
        api<{ jobs: Job[] }>("/api/logistics/jobs"),
      ]);

      setProfile(profRes.profile);
      setJobs(jobsRes.jobs || []);
    } catch (err) {
      console.error("Failed to load deliveries:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const myJobs = useMemo(() => {
    return jobs.filter((j) => j.assignedUserId === profile?.id && j.status !== "CANCELLED");
  }, [jobs, profile?.id]);

  const displayedJobs = useMemo(() => {
    return myJobs
      .filter((j) => (tab === "ACTIVE" ? j.status !== "DELIVERED" : j.status === "DELIVERED"))
      .filter((j) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          j.farmer?.farmName?.toLowerCase().includes(q) ||
          j.pickup?.toLowerCase().includes(q) ||
          j.order?.address?.city?.toLowerCase().includes(q)
        );
      });
  }, [myJobs, tab, search]);

  if (loading) {
    return (
      <LogisticsLayout>
        <div className="p-8 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white border border-slate-200" />
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
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">My Assigned Deliveries</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status, transit milestones, and historical delivery records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <Link
              to="/logistics/jobs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <Package size={14} />
              <span>Claim New Freight</span>
            </Link>
          </div>
        </div>

        {/* Tab Selection & Search */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTab("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                tab === "ACTIVE" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active Shipments ({myJobs.filter((j) => j.status !== "DELIVERED").length})
            </button>
            <button
              onClick={() => setTab("COMPLETED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                tab === "COMPLETED" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Completed ({myJobs.filter((j) => j.status === "DELIVERED").length})
            </button>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by farm or city..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-800"
            />
          </div>
        </div>

        {/* Deliveries List */}
        {displayedJobs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
            <Truck size={36} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">
              {tab === "ACTIVE" ? "No deliveries currently in progress" : "No completed deliveries found"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {tab === "ACTIVE"
                ? "Visit the Available Jobs tab to claim open shipments from nearby farms."
                : "Completed delivery records will appear here once delivered."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedJobs.map((job) => {
              const isDelivered = job.status === "DELIVERED";
              const isHeavy = job.quantity > 30 || job.vehicle.toLowerCase().includes("truck");
              const payoutPaise = isHeavy ? 35000 + job.quantity * 150 : 6000 + job.quantity * 200;

              return (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        SS-{job.id.slice(0, 8)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isDelivered
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {STATUS_LABELS[job.status] || job.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        • {job.quantity} kg Cargo
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                      <div className="flex items-start gap-1.5">
                        <MapPin size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Origin:</strong> {job.farmer?.farmName || "Farm"} ({job.pickup})
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin size={13} className="text-blue-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Drop:</strong> {job.order?.address?.city || "Retail Hub / Society"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-medium">Payout</span>
                      <p className="font-black text-slate-900 text-sm">{rupees(payoutPaise)}</p>
                    </div>

                    <Link
                      to={`/logistics/tracker/${job.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
                    >
                      <span>Track & Update</span>
                      <ArrowRight size={13} />
                    </Link>
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
