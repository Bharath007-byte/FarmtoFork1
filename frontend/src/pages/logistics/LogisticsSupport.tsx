import { useState } from "react";
import {
  AlertTriangle,
  MapPin,
  FileQuestion,
} from "lucide-react";
import { LogisticsLayout } from "../../layouts/LogisticsLayout";

export function LogisticsSupport() {
  const [sosSent, setSosSent] = useState(false);

  const handleSos = () => {
    setSosSent(true);
    setTimeout(() => {
      alert("🚨 SOS Broadcast sent to Devanahalli Hub Dispatcher & Emergency Roadside Team with your live GPS location.");
    }, 100);
  };

  return (
    <LogisticsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Cooperative Dispatch & Support Desk</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct line to regional hub controllers, emergency roadside mechanics, and farmer coordinators.
            </p>
          </div>
          <button
            onClick={handleSos}
            disabled={sosSent}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              sosSent
                ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                : "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
            }`}
          >
            <AlertTriangle size={15} />
            <span>{sosSent ? "SOS Dispatched" : "Emergency Highway SOS"}</span>
          </button>
        </div>

        {/* Regional Dispatch Desks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bangalore North Hub Dispatch</h3>
                <p className="text-xs text-slate-500">Devanahalli & Yelahanka Cooperative Clusters</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Handles direct farm pickups from Doddaballapura, Devanahalli green belts, and delivery to apartment societies.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700">Hub Hotline</span>
                <a href="tel:+918028415500" className="font-bold text-slate-900 hover:underline">
                  +91 80 2841 5500
                </a>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700">Duty Manager</span>
                <span className="font-bold text-slate-900">K. Manjunath (VHF Ch 4)</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Andhra Pradesh Hub Dispatch</h3>
                <p className="text-xs text-slate-500">Tirupati & Chittoor Horticultural Clusters</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Coordinates bulk inter-state shipments, tomato mandis, mango consignments, and NH-69 highway transit.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700">Hub Hotline</span>
                <a href="tel:+918772256700" className="font-bold text-slate-900 hover:underline">
                  +91 877 225 6700
                </a>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700">Duty Manager</span>
                <span className="font-bold text-slate-900">R. Subba Rao</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cold-Chain FAQ & Operating Protocols */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <FileQuestion size={18} className="text-slate-700" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Driver Operating Protocols & FAQ
            </h3>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <p className="font-bold text-slate-900">What should I do if a farmer cannot provide an OTP?</p>
              <p className="mt-1 text-slate-500">
                Every booking generates a verification code in the driver app and farmer desk. If the farmer is offline,
                call the Hub Dispatch hotline to request manual coordinator clearance with photographic proof.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <p className="font-bold text-slate-900">How do I report produce spoilage or transit damage?</p>
              <p className="mt-1 text-slate-500">
                Use the Live Tracker page to flag an issue before marking 'Delivered'. Photographic proof will be
                logged with the cooperative insurance desk.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <p className="font-bold text-slate-900">When do delivery payouts get settled to my bank account?</p>
              <p className="mt-1 text-slate-500">
                All delivered dispatches are cleared bi-weekly on Tuesday and Friday mornings directly via Direct Benefit
                Transfer (DBT) with zero platform deductions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LogisticsLayout>
  );
}
