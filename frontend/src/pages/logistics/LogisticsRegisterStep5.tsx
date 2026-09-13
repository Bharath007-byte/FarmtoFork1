import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Bike, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { SiteNav } from "../../components/SiteNav";
import { LogisticsStepIndicator } from "../../components/LogisticsStepIndicator";
import { api, ApiError } from "../../services/api";

export function LogisticsRegisterStep5() {
  const navigate = useNavigate();

  const [workerType, setWorkerType] = useState<"BIKE" | "LARGE_TRUCK">("BIKE");

  // Form Fields
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColour, setVehicleColour] = useState("");
  const [vehicleYear, setVehicleYear] = useState<number>(new Date().getFullYear());
  const [truckType, setTruckType] = useState("mini_truck");
  const [capacityKg, setCapacityKg] = useState<number>(35);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api<any>("/api/logistics/onboarding");
        const type = res.verification?.workerType || res.user?.deliveryType || "BIKE";
        setWorkerType(type);

        if (res.verification) {
          if (res.verification.vehicleNumber) setVehicleNumber(res.verification.vehicleNumber);
          if (res.verification.vehicleMake) setVehicleMake(res.verification.vehicleMake);
          if (res.verification.vehicleModel) setVehicleModel(res.verification.vehicleModel);
          if (res.verification.vehicleColour) setVehicleColour(res.verification.vehicleColour);
          if (res.verification.vehicleYear) setVehicleYear(res.verification.vehicleYear);
          if (res.verification.truckType) setTruckType(res.verification.truckType);
          if (res.verification.capacityKg) setCapacityKg(res.verification.capacityKg);
        } else if (type === "LARGE_TRUCK") {
          setCapacityKg(1500); // default large truck capacity in kg
        }
      } catch (err: any) {
        console.error("Failed to load vehicle profile:", err);
      }
    }

    loadProfile();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate vehicle number format (e.g. MH12AB1234, DL01A1234, TS09EA4321)
    const cleanNumber = vehicleNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleanNumber.length < 5 || cleanNumber.length > 15) {
      setError("Please enter a valid registration plate number (e.g. MH 12 AB 1234).");
      return;
    }

    if (capacityKg <= 0) {
      setError("Vehicle capacity must be greater than 0 kg.");
      return;
    }

    setBusy(true);

    try {
      await api<any>("/api/logistics/vehicle", {
        method: "POST",
        body: JSON.stringify({
          vehicleType: workerType,
          vehicleNumber: cleanNumber,
          vehicleMake,
          vehicleModel,
          vehicleColour,
          vehicleYear: Number(vehicleYear),
          truckType: workerType === "LARGE_TRUCK" ? truckType : undefined,
          capacityKg: Number(capacityKg),
        }),
      });

      setBusy(false);
      navigate("/logistics/register/approval");
    } catch (err: any) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : err.message || "Failed to save vehicle details.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900">
      <SiteNav />
      <div className="pt-20">
        <LogisticsStepIndicator currentStep={5} />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> Step 5: Fleet Specifications
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Vehicle Information
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Register the vehicle you will operate for Farm2Fork assignments.
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-800">
            {workerType === "LARGE_TRUCK" ? <Truck className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
            <span>Configured for: {workerType === "LARGE_TRUCK" ? "Large Transport" : "Delivery Agent"}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Unable to save</p>
              <p className="mt-0.5 text-xs text-rose-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900">Vehicle Specifications</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Ensure plate number matches your uploaded Vehicle RC document.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-zinc-700">Vehicle Registration Plate Number *</label>
                <input
                  required
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MH 12 AB 1234 / DL 01 TR 5678"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 font-mono text-sm uppercase tracking-wider focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {workerType === "LARGE_TRUCK" && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-zinc-700">Truck / Transport Category *</label>
                  <select
                    value={truckType}
                    onChange={(e) => setTruckType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="mini_truck">Mini Commercial Truck (Tata Ace / Mahindra Bolero)</option>
                    <option value="medium_truck">Medium Duty Truck (Eicher / Ashok Leyland)</option>
                    <option value="heavy_lorry">Heavy Goods Carrier / Lorry (10-wheel+)</option>
                    <option value="reefer_cold_storage">Cold-Chain Temperature Controlled Reefer</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-700">Vehicle Make / Manufacturer *</label>
                <input
                  required
                  type="text"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  placeholder={workerType === "LARGE_TRUCK" ? "e.g. Tata, Mahindra, Eicher" : "e.g. Honda, TVS, Hero"}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Vehicle Model *</label>
                <input
                  required
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder={workerType === "LARGE_TRUCK" ? "e.g. Ace Gold / 407" : "e.g. Activa 6G / Splendor"}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Vehicle Colour *</label>
                <input
                  required
                  type="text"
                  value={vehicleColour}
                  onChange={(e) => setVehicleColour(e.target.value)}
                  placeholder="e.g. White, Black, Red"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Registration Year *</label>
                <input
                  required
                  type="number"
                  min={1995}
                  max={new Date().getFullYear() + 1}
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-zinc-700">
                  Cargo Carrying Capacity (in Kilograms) *
                </label>
                <div className="relative mt-1">
                  <input
                    required
                    type="number"
                    min={5}
                    step={1}
                    value={capacityKg}
                    onChange={(e) => setCapacityKg(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm pr-12 focus:border-emerald-600 focus:outline-none"
                  />
                  <span className="absolute right-4 top-2.5 text-xs font-bold text-zinc-400">
                    kg {capacityKg >= 1000 && `(${(capacityKg / 1000).toFixed(1)} Tons)`}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {workerType === "LARGE_TRUCK"
                    ? "Specifies maximum agricultural tonnage for society-to-society bulk transport dispatch."
                    : "Typical two-wheeler delivery capacity: 25 kg - 60 kg."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs sm:flex-row">
            <p className="text-xs text-zinc-500">
              Vehicle details will be matched against your uploaded RC document during administrative approval.
            </p>

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-50 sm:w-auto"
            >
              {busy ? "Saving vehicle..." : <>Save & Complete Step 5 <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
