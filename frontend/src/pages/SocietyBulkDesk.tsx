import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Truck,
  CheckCircle2,
  Package,
  MapPin,
  RefreshCw,
  Clock,
  ArrowRight,
} from "lucide-react";
import { api, ApiError } from "../services/api";

interface Society {
  id: string;
  name: string;
  code: string;
  district: string;
  state: string;
  pinCode: string;
  phone?: string;
  _count?: {
    farmers: number;
    inventory: number;
    supplies: number;
    bookings: number;
  };
}

interface SupplyRecord {
  id: string;
  quantity: number;
  status: string;
  receivedAt: string;
  society: {
    name: string;
    code: string;
    district: string;
    state: string;
  };
  product: {
    name: string;
    variety: string;
    unit: string;
    pricePaise: number;
  };
}

interface BookingRecord {
  id: string;
  pickup: string;
  quantity: number;
  vehicle: string;
  status: string;
  createdAt: string;
  society?: {
    name: string;
    district: string;
  };
}

const COMMON_CROPS = [
  { name: "Tomato", variety: "Hybrid Vaishnavi", benchmarkRate: 28, category: "Vegetables" },
  { name: "Onion", variety: "Nashik Red", benchmarkRate: 25, category: "Vegetables" },
  { name: "Potato", variety: "Jyoti Large", benchmarkRate: 22, category: "Vegetables" },
  { name: "Mango", variety: "Banganapalli Table", benchmarkRate: 85, category: "Fruits" },
  { name: "Ragi", variety: "GPU 28 Finger Millet", benchmarkRate: 35, category: "Grains" },
  { name: "Paddy", variety: "Sona Masoori Raw", benchmarkRate: 26, category: "Grains" },
];

export function SocietyBulkDesk() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState("");
  const [supplies, setSupplies] = useState<SupplyRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State
  const [cropName, setCropName] = useState(COMMON_CROPS[0].name);
  const [variety, setVariety] = useState(COMMON_CROPS[0].variety);
  const [category, setCategory] = useState(COMMON_CROPS[0].category);
  const [benchmarkRate, setBenchmarkRate] = useState(COMMON_CROPS[0].benchmarkRate);
  const [quantity, setQuantity] = useState("250");
  const [requestTruckPickup, setRequestTruckPickup] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [socList, mySupplies] = await Promise.all([
        api<Society[]>("/api/societies"),
        api<{ supplies: SupplyRecord[]; bookings: BookingRecord[] }>("/api/societies/my-supplies"),
      ]);

      setSocieties(socList);
      if (socList.length > 0 && !selectedSocietyId) {
        setSelectedSocietyId(socList[0].id);
      }
      setSupplies(mySupplies.supplies || []);
      setBookings(mySupplies.bookings || []);
    } catch (err: any) {
      console.error("Bulk desk data fetch error:", err);
      setError(err instanceof ApiError ? err.message : "Failed to load cooperative societies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSelectCrop = (crop: (typeof COMMON_CROPS)[0]) => {
    setCropName(crop.name);
    setVariety(crop.variety);
    setCategory(crop.category);
    setBenchmarkRate(crop.benchmarkRate);
  };

  const parsedQty = Math.max(1, Number(quantity) || 1);
  const totalEstimatedPayout = Math.round(parsedQty * benchmarkRate);

  const onSubmitSupply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSocietyId) {
      setError("Please select a cooperative society.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await api<{
        supply: SupplyRecord;
        booking?: BookingRecord;
      }>(`/api/societies/${selectedSocietyId}/supplies`, {
        method: "POST",
        body: JSON.stringify({
          productName: cropName,
          variety,
          category,
          quantity: parsedQty,
          pricePaise: benchmarkRate * 100,
          requestTruckPickup,
        }),
      });

      setSuccessMsg(
        `Successfully pooled ${parsedQty} kg ${cropName}! ${
          res.booking ? "Heavy Truck Logistics Pickup Scheduled." : "Logged into cooperative inventory."
        }`
      );
      loadData();
    } catch (err: any) {
      console.error("Bulk submit failed:", err);
      setError(err instanceof ApiError ? err.message : "Failed to submit bulk supply.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-16">
      {/* 1. Header */}
      <div>
        <Link to="/farmer/dashboard" className="text-sm font-semibold text-[#2f7a4a] hover:underline">
          ← Back to Farmer Dashboard
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              <Building2 className="h-3.5 w-3.5 text-emerald-700" />
              Cooperative Aggregation Desk (सहकारी संकलन केंद्र)
            </span>
            <h1 className="mt-2 font-serif text-3xl font-bold text-zinc-900 md:text-4xl">
              Supply Bulk Produce to Society Hubs
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Pool large harvest lots (100 kg – 2000 kg+) directly with verified cooperative societies in Devanahalli, Yelahanka, and Tirupati. Guaranteed APMC benchmark payout + heavy truck logistics.
            </p>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Hubs
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Choose Nearest Society Hub */}
      <div>
        <h2 className="text-base font-bold text-zinc-900">1. Select Target Cooperative Society Hub</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Choose the society nearest to your farm location for minimal transit time and fast inspection.
        </p>

        <div className="grid gap-3.5 sm:grid-cols-3">
          {societies.map((soc) => {
            const isSelected = selectedSocietyId === soc.id;
            return (
              <div
                key={soc.id}
                onClick={() => setSelectedSocietyId(soc.id)}
                className={`cursor-pointer rounded-3xl p-5 border transition ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20 shadow-sm"
                    : "border-zinc-200 bg-white hover:border-zinc-300 shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-emerald-100/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    {soc.code}
                  </span>
                  {isSelected && (
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  )}
                </div>

                <h3 className="mt-3 font-bold text-sm text-zinc-900 line-clamp-2">{soc.name}</h3>

                <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  {soc.district}, {soc.state} (PIN {soc.pinCode})
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-[11px] text-zinc-500">
                  <span>Members: {soc._count?.farmers ?? 0}</span>
                  <span className="font-semibold text-emerald-700">Active Center</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Produce Details & Bulk Pooling Form */}
      <form onSubmit={onSubmitSupply} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-zinc-900">2. Bulk Produce Details & Logistics Request</h2>
          <p className="text-xs text-zinc-500">
            Specify the harvest crop, total weight, and request automated heavy truck pickup.
          </p>
        </div>

        {/* Quick Crop Selector Chips */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 mb-2">Select Regional Produce</label>
          <div className="flex flex-wrap gap-2">
            {COMMON_CROPS.map((c) => (
              <button
                type="button"
                key={c.name}
                onClick={() => onSelectCrop(c)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  cropName === c.name
                    ? "bg-[#2f7a4a] text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {c.name} (₹{c.benchmarkRate}/kg)
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">Crop Name</label>
            <input
              required
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">Variety / Cultivar</label>
            <input
              required
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">Cooperative Rate (₹/kg)</label>
            <input
              type="number"
              required
              value={benchmarkRate}
              onChange={(e) => setBenchmarkRate(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Quantity in KG with presets */}
        <div>
          <label className="block text-xs font-bold text-zinc-700 mb-1.5">
            Total Harvest Weight to Pool (Kilograms)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-48 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-900 focus:border-emerald-600 focus:outline-none"
            />
            <span className="text-xs font-semibold text-zinc-500">kg</span>

            <div className="flex flex-wrap gap-1.5">
              {["100", "250", "500", "1000", "2000"].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setQuantity(preset)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold border transition ${
                    quantity === preset
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {preset} kg
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logistics Truck Pickup Toggle */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requestTruckPickup}
              onChange={(e) => setRequestTruckPickup(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <p className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-[#2f7a4a]" />
                Request Heavy Cargo Truck Pickup from Farm Gate
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">
                {parsedQty > 30
                  ? "✓ Heavy payload (>30 kg) will be automatically matched to certified Mini-Truck or Large Truck couriers."
                  : "Standard pickup will be scheduled."}
              </p>
            </div>
          </label>
        </div>

        {/* Total Value & Submit */}
        <div className="flex flex-col gap-4 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-zinc-500">Estimated Cooperative Procurement Value</p>
            <p className="text-2xl font-extrabold text-emerald-800">
              ₹{totalEstimatedPayout.toLocaleString("en-IN")}
              <span className="text-xs font-normal text-zinc-500 ml-1.5">
                ({parsedQty} kg @ ₹{benchmarkRate}/kg)
              </span>
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#2f7a4a] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#26633c] disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Dispatching Bulk Pool Order...
              </>
            ) : (
              <>
                <span>Dispatch Bulk Supply to Society</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* 4. Live Supply Ledger & Logistics Pickups */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-zinc-900">3. Your Cooperative Supply History & Pickups</h2>

        {supplies.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
            <Package className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-2 text-sm font-bold text-zinc-700">No bulk society supplies yet</p>
            <p className="text-xs text-zinc-400">
              When you pool crops to Devanahalli, Yelahanka, or Tirupati societies, records will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xs">
            <div className="divide-y divide-zinc-100">
              {supplies.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">
                        {s.quantity} kg {s.product.name} ({s.product.variety})
                      </p>
                      <p className="text-xs text-zinc-500">
                        Hub: <span className="font-semibold text-zinc-700">{s.society.name}</span> ({s.society.code})
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      {s.status}
                    </span>
                    <p className="mt-1 text-[11px] text-zinc-400 flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(s.receivedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logistics Pickups */}
        {bookings.length > 0 && (
          <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
              Active Logistics Pickups
            </h3>
            <div className="divide-y divide-zinc-100">
              {bookings.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-[#2f7a4a]" />
                    <div>
                      <span className="font-bold text-zinc-800">
                        {b.quantity} kg Pickup via {b.vehicle}
                      </span>
                      <p className="text-zinc-500">{b.pickup}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-800 border border-amber-200">
                      {b.status}
                    </span>
                    <Link
                      to="/farmer/orders"
                      className="font-bold text-emerald-700 hover:underline"
                    >
                      Track →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
