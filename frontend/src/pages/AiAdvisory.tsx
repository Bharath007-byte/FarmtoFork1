import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CloudSun,
  LineChart,
  Layers,
  Camera,
  Stethoscope,
  ShieldCheck,
  RefreshCw,
  MapPin,
  Sprout,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useApp } from "../context/AppState";
import { api } from "../services/api";

interface AdvisoryCardData {
  id: string;
  tag: string;
  title: string;
  summary: string;
  actionItem: string;
  confidenceScore: number;
  source: string;
}

interface AdvisoryResponse {
  success: boolean;
  region: {
    district: string;
    state: string;
    soil: string;
  };
  crop: string;
  season: string;
  benchmarkPriceRupees: number;
  advisoryCards: AdvisoryCardData[];
}

const REGIONAL_DISTRICTS = [
  { label: "Bengaluru Rural (Devanahalli)", district: "Bengaluru Rural", state: "Karnataka", soil: "Red Sandy Loam" },
  { label: "Bengaluru Urban (Yelahanka)", district: "Bengaluru Urban", state: "Karnataka", soil: "Red Sandy Loam" },
  { label: "Kolar Mandi Belt", district: "Kolar", state: "Karnataka", soil: "Red Loam" },
  { label: "Mandya Cauvery Basin", district: "Mandya", state: "Karnataka", soil: "Clay Loam" },
  { label: "Tirupati Region (AP)", district: "Tirupati", state: "Andhra Pradesh", soil: "Red Sandy Loam" },
  { label: "Chittoor Fruit Hub (AP)", district: "Chittoor", state: "Andhra Pradesh", soil: "Well-drained Loam" },
];

const CROP_OPTIONS = [
  { id: "tomato", label: "Tomato (Hybrid / Local)" },
  { id: "onion", label: "Onion (Nashik Red / Local)" },
  { id: "potato", label: "Potato (Jyoti / Kufri)" },
  { id: "mango", label: "Mango (Banganapalli / Totapuri)" },
  { id: "ragi", label: "Ragi (Finger Millet - GPU 28)" },
  { id: "paddy", label: "Paddy (Sona Masoori / RNR)" },
  { id: "dairy", label: "Dairy (Cow / Buffalo Fodder & Milk)" },
];

export function AiAdvisory() {
  const { user } = useApp();

  const [selectedDistrict, setSelectedDistrict] = useState(REGIONAL_DISTRICTS[0]);
  const [selectedCrop, setSelectedCrop] = useState("tomato");
  const [soilType, setSoilType] = useState("Red Sandy Loam");
  const [loading, setLoading] = useState(true);
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const [error, setError] = useState("");

  const loadAdvisory = async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({
        crop: selectedCrop,
        district: selectedDistrict.district,
        state: selectedDistrict.state,
        soil: soilType,
      }).toString();

      const data = await api<AdvisoryResponse>(`/api/ai/agri-advisory?${q}`);
      setAdvisory(data);
    } catch (err: any) {
      console.error("Advisory fetch error:", err);
      setError("Unable to retrieve real-time agronomy advisory. Using cached ICAR guidance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvisory();
  }, [selectedDistrict, selectedCrop, soilType]);

  const getCardIcon = (id: string) => {
    switch (id) {
      case "weather_irrigation":
        return <CloudSun className="h-5 w-5" />;
      case "mandi_harvest":
        return <LineChart className="h-5 w-5" />;
      case "nutrition_soil":
        return <Layers className="h-5 w-5" />;
      case "pest_disease":
        return <Stethoscope className="h-5 w-5" />;
      default:
        return <Sprout className="h-5 w-5" />;
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/farmer/dashboard" className="text-sm font-semibold text-[#1b4332] hover:underline">
        ← Back to Farmer Dashboard
      </Link>

      <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-semibold text-zinc-900">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-800" />
            ICAR & State Agronomy Intelligence
          </span>
          <h1 className="mt-2 font-serif text-3xl font-bold text-zinc-900 md:text-4xl">
            Agronomy, Weather & Fair Price Advisory
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Grounded advisory tuned for {user?.name || "your farm"} across Karnataka and Andhra Pradesh regional micro-climates.
          </p>
        </div>

        <Link
          to="/farmer/farmai"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1b4332] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#245e38]"
        >
          <Camera className="h-4 w-4" />
          Open Farm Assistant & Scanner →
        </Link>
      </div>

      {/* Micro-climate & Crop Selectors */}
      <div className="mt-6 grid gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-zinc-700">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" /> Regional District Preset
          </label>
          <select
            value={selectedDistrict.district}
            onChange={(e) => {
              const matched = REGIONAL_DISTRICTS.find((d) => d.district === e.target.value);
              if (matched) {
                setSelectedDistrict(matched);
                setSoilType(matched.soil);
              }
            }}
            className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
          >
            {REGIONAL_DISTRICTS.map((d) => (
              <option key={d.district} value={d.district}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-zinc-700">
            <Sprout className="h-3.5 w-3.5 text-emerald-700" /> Target Crop / Enterprise
          </label>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
          >
            {CROP_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-zinc-700">
            <Info className="h-3.5 w-3.5 text-emerald-700" /> Soil Classification
          </label>
          <select
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
          >
            <option value="Red Sandy Loam">Red Sandy Loam (High drainage)</option>
            <option value="Red Loam">Red Loam (Medium fertility)</option>
            <option value="Clay Loam">Clay Loam (Cauvery / River basin)</option>
            <option value="Black Cotton Soil">Black Cotton Soil (High moisture retention)</option>
            <option value="Well-drained Loam">Well-drained Loam (Fruit Orchards)</option>
          </select>
        </div>
      </div>

      {/* Advisory Status Header */}
      {advisory && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f2f7f0] border border-emerald-200 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-bold text-emerald-900">
              Active Advisory: <span className="font-extrabold">{advisory.crop}</span> · Season: <span className="font-extrabold">{advisory.season}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600">Mandi Benchmark:</span>
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-black text-emerald-800 border border-emerald-300 shadow-sm">
              ₹{advisory.benchmarkPriceRupees}/kg
            </span>
            <button
              onClick={loadAdvisory}
              title="Refresh Advisory"
              className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-700 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
          {error}
        </div>
      )}

      {/* Advisory Cards Grid */}
      {loading && !advisory ? (
        <div className="mt-8 flex items-center justify-center p-12 text-zinc-500">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-700" />
          <span className="ml-3 text-sm font-semibold">Consulting agricultural knowledge base...</span>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {advisory?.advisoryCards.map((card) => (
            <Card
              key={card.id}
              icon={getCardIcon(card.id)}
              tag={card.tag}
              title={card.title}
              summary={card.summary}
              actionItem={card.actionItem}
              confidenceScore={card.confidenceScore}
              source={card.source}
            />
          ))}
        </div>
      )}

      {/* Grounding & Integrity Disclaimer */}
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-[11px] text-zinc-500 leading-relaxed">
        <p className="font-semibold text-zinc-700">Data Grounding & Compliance Notice:</p>
        <p className="mt-0.5">
          Recommendations are formulated from ICAR packages of practices, University of Agricultural Sciences (UAS) Bangalore, and ANGRAU Andhra Pradesh field manuals. Mandi benchmarks reflect modal rates recorded across APMC markets. These advisories support farm decision-making and are not substitutes for physical field inspection by certified agricultural extension officers.
        </p>
      </div>
    </div>
  );
}

function Card({
  icon,
  tag,
  title,
  summary,
  actionItem,
  confidenceScore,
  source,
}: {
  icon: ReactNode;
  tag: string;
  title: string;
  summary: string;
  actionItem: string;
  confidenceScore: number;
  source: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm transition hover:border-emerald-300">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0e3] text-[#2f7a4a]">
            {icon}
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
            {tag}
          </span>
        </div>

        <h2 className="mt-4 text-base font-bold text-zinc-900">{title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-600">{summary}</p>

        <div className="mt-3.5 rounded-xl bg-zinc-50 p-3 border border-zinc-100">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <p className="text-xs font-semibold text-zinc-800 leading-snug">
              <span className="text-emerald-800 font-bold">Action Item: </span>
              {actionItem}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-100 text-[11px] text-zinc-500">
        <span className="truncate max-w-[260px] font-medium" title={source}>
          {source}
        </span>
        <span className="font-bold text-emerald-700">{confidenceScore}% match</span>
      </div>
    </div>
  );
}
