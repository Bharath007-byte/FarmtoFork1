import {
  Building2,
  MapPin,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { LogisticsLayout } from "../../layouts/LogisticsLayout";
import { Link } from "react-router-dom";

type Hub = {
  name: string;
  region: string;
  code: string;
  activeVehicles: number;
  openBulkJobs: number;
  status: string;
};

const HUBS: Hub[] = [
  {
    name: "Devanahalli Agricultural Logistics Hub",
    region: "Bangalore Rural (Devanahalli - Doddaballapura Corridor)",
    code: "BLR-DEV-01",
    activeVehicles: 8,
    openBulkJobs: 5,
    status: "ACTIVE",
  },
  {
    name: "Yelahanka Urban Distribution Center",
    region: "Bangalore Urban (Yelahanka New Town)",
    code: "BLR-YLH-02",
    activeVehicles: 12,
    openBulkJobs: 8,
    status: "ACTIVE",
  },
  {
    name: "Tirupati Horticultural Hub",
    region: "Chittoor / Tirupati District, Andhra Pradesh",
    code: "AP-TPT-01",
    activeVehicles: 6,
    openBulkJobs: 4,
    status: "ACTIVE",
  },
];

export function LogisticsFleet() {
  return (
    <LogisticsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Fleet Desk & Regional Hubs</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring cold-chain freight capacity across Karnataka & Andhra Pradesh cooperative societies.
            </p>
          </div>
          <Link
            to="/logistics/jobs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            <span>View Available Freight</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Fleet Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Active Vehicle</span>
            <h3 className="text-xl font-black text-slate-900 mt-1">Eicher Pro 2049</h3>
            <p className="text-xs text-slate-500 mt-0.5">KA01EF3456 • Heavy Freight</p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Payload Capacity</span>
              <span className="font-extrabold text-slate-900">2,500 kg</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Corridor</span>
            <h3 className="text-xl font-black text-slate-900 mt-1">Devanahalli ⇄ Tirupati</h3>
            <p className="text-xs text-slate-500 mt-0.5">Direct Highway 75 & NH 69</p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Cold Chain Active</span>
              <span className="font-extrabold text-emerald-700">Yes (+4°C Reefer)</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fleet Duty Status</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xl font-black text-slate-900">Operational</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Telematics Ping</span>
              <span className="font-semibold text-emerald-700">Every 15 seconds</span>
            </div>
          </div>
        </div>

        {/* Regional Agricultural Logistics Hubs */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Regional Cooperative Hubs
              </h3>
              <p className="text-xs text-slate-500">Collection centers linking farmer societies to city retail</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              3 Active Hubs
            </span>
          </div>

          <div className="space-y-3">
            {HUBS.map((hub) => (
              <div
                key={hub.code}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{hub.name}</h4>
                      <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                        {hub.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin size={12} />
                      <span>{hub.region}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs shrink-0">
                  <div>
                    <span className="text-slate-400 font-medium">Active Fleet</span>
                    <p className="font-extrabold text-slate-900">{hub.activeVehicles} Trucks</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Pending Dispatches</span>
                    <p className="font-extrabold text-emerald-700">{hub.openBulkJobs} Shipments</p>
                  </div>
                  <Link
                    to="/logistics/jobs"
                    className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cold-Chain Freight Protocol Banner */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Direct Farmer Agreement
            </span>
            <h4 className="text-base font-bold text-white mt-0.5">
              Zero Middlemen • Cold Chain Quality Guarantee
            </h4>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Perishable produce (tomatoes, capsicum, greens) transported under continuous temperature logging
              directly from farm clusters in Devanahalli and Tirupati to consumer apartment societies.
            </p>
          </div>
          <Link
            to="/logistics/vehicle"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition"
          >
            Check Reefer Settings
          </Link>
        </div>
      </div>
    </LogisticsLayout>
  );
}
