import { useState, useEffect } from "react";
import {
  Truck,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Calendar,
  ThermometerSnowflake,
  Fuel,
  Weight,
  Award,
} from "lucide-react";
import { LogisticsLayout } from "../../layouts/LogisticsLayout";
import { api } from "../../services/api";

type VehicleData = {
  makeModel: string;
  vehicleNumber: string;
  vehicleType: string;
  typeLabel: string;
  payloadCapacityKg: number;
  fuelType: string;
  coldChainActive: boolean;
  year: number;
  registrationStatus: string;
  documents: {
    drivingLicence: string;
    vehicleRc: string;
    transportPermit: string;
    commercialInsurance: string;
  };
};

export function LogisticsVehicle() {
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVehicle() {
      try {
        const res = await api<{ vehicle: VehicleData }>("/api/logistics/vehicle-details");
        setVehicle(res.vehicle);
      } catch (err) {
        console.error("Failed to load vehicle details:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadVehicle();
  }, []);

  if (loading) {
    return (
      <LogisticsLayout>
        <div className="p-8 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-48 bg-white rounded-2xl border border-slate-200" />
        </div>
      </LogisticsLayout>
    );
  }

  return (
    <LogisticsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Vehicle Specs & Compliance</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified transport registration, cold chain capabilities, and government RTO permits.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>RTO Verified Commercial Fleet</span>
            </span>
          </div>
        </div>

        {/* Vehicle Primary Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <Truck size={28} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Primary Transport Asset
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {vehicle?.makeModel || "Eicher Pro 2049 Heavy Freight"}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-xs text-slate-800">
                    {vehicle?.vehicleNumber || "KA01EF3456"}
                  </span>
                  <span className="text-xs text-slate-500">• {vehicle?.typeLabel || "Heavy Freight"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Weight size={13} />
                  <span>Payload</span>
                </div>
                <p className="font-extrabold text-slate-900 text-sm">{vehicle?.payloadCapacityKg ?? 2500} kg</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Fuel size={13} />
                  <span>Fuel Type</span>
                </div>
                <p className="font-extrabold text-slate-900 text-sm">{vehicle?.fuelType || "Diesel"}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <ThermometerSnowflake size={13} />
                  <span>Cold Chain</span>
                </div>
                <p className="font-extrabold text-emerald-700 text-sm">
                  {vehicle?.coldChainActive ? "Active (+4°C)" : "Standard"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Calendar size={13} />
                  <span>Model Year</span>
                </div>
                <p className="font-extrabold text-slate-900 text-sm">{vehicle?.year || 2023}</p>
              </div>
            </div>
          </div>

          {/* Real-time Telematics & IoT Section */}
          <div className="pt-6">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide mb-3">
              Onboard Telematics & Diagnostic Sensors
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate-600">Reefer Box Temperature</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-lg font-black text-slate-900">+4.2°C</p>
                <p className="text-[10px] text-slate-400 mt-1">Optimal range for tomatoes & leafy greens (+2°C to +8°C)</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate-600">GPS Tracker (NavIC / IRNSS)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-lg font-black text-slate-900">Signal Strong</p>
                <p className="text-[10px] text-slate-400 mt-1">Live telemetry streaming to Devanhalli Hub & Admin</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate-600">Engine Health & OBD-II</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-lg font-black text-slate-900">Zero Fault Codes</p>
                <p className="text-[10px] text-slate-400 mt-1">Next preventive service scheduled in 3,400 km</p>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance & Regulatory Documentation Status */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Regulatory Permits & Documents
              </h3>
              <p className="text-xs text-slate-500">Government RTO & Transport Department compliance status</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-600" />
              <span>100% Compliant</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RC */}
            <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Registration Certificate (RC)</h4>
                  <p className="text-[11px] text-slate-500">KA01EF3456 • Commercial Transport</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                {vehicle?.documents.vehicleRc || "VERIFIED"}
              </span>
            </div>

            {/* DL */}
            <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <Award size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Commercial Heavy Goods DL</h4>
                  <p className="text-[11px] text-slate-500">Karnataka Transport Dept • All-India Heavy</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                {vehicle?.documents.drivingLicence || "APPROVED"}
              </span>
            </div>

            {/* Permit */}
            <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Interstate Agricultural Route Permit</h4>
                  <p className="text-[11px] text-slate-500">Karnataka & Andhra Pradesh Corridor</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                {vehicle?.documents.transportPermit || "VALID_TILL_2027"}
              </span>
            </div>

            {/* Insurance */}
            <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Commercial Cargo & Third-Party Insurance</h4>
                  <p className="text-[11px] text-slate-500">Bajaj Allianz Agri-Freight Comprehensive</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                {vehicle?.documents.commercialInsurance || "ACTIVE"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </LogisticsLayout>
  );
}
