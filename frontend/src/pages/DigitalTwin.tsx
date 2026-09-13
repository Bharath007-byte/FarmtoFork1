import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import {
  ArrowLeft,
  Building2,
  RefreshCw,
} from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { DataBadge } from "../components/DataBadge";
import { useApp } from "../context/AppState";
import { api } from "../services/api";
import { loadSihDb } from "../platform/store";
import { priceSeries, recommendCrops, demandForecast } from "../ai/engine";
import { LISTINGS } from "../Data/listings";

type DigitalTwinData = {
  profile: {
    farmerName: string;
    farmName: string;
    district: string;
    state: string;
    pinCode: string;
    verified: boolean;
    soil: string;
    cropsCount: number;
    totalAvailableKg: number;
    totalSoldKg: number;
  };
  crops: {
    name: string;
    category: string;
    available: number;
    priceRupees: number;
  }[];
  societies: string[];
  insights: {
    title: string;
    body: string;
    origin: string;
  }[];
  priceForecast: {
    commodity: string;
    currentRupees: number;
    predictedRupees: number;
    direction: string;
    confidence: number;
  };
};

export function DigitalTwin() {
  const { user } = useApp();
  const [twin, setTwin] = useState<DigitalTwinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const fetchTwin = async () => {
    setLoading(true);
    try {
      const res = await api<{ digitalTwin: DigitalTwinData }>("/api/farmers/me/digital-twin");
      if (res && res.digitalTwin) {
        setTwin(res.digitalTwin);
        setIsLive(true);
        return;
      }
    } catch (e) {
      console.warn("Digital twin API not available or user is not a farmer, using fallback store:", e);
    }

    // Demo store fallback
    const db = loadSihDb();
    const farm =
      db.farms.find((f) => f.email === user?.email) ||
      db.farms.find((f) => f.id === "F1024")!;

    setTwin({
      profile: {
        farmerName: farm.farmerName,
        farmName: `${farm.farmerName}'s Organic Farm`,
        district: farm.region,
        state: "Karnataka",
        pinCode: "562110",
        verified: farm.verified,
        soil: farm.soil,
        cropsCount: farm.crops.length,
        totalAvailableKg: 1450,
        totalSoldKg: 3200,
      },
      crops: farm.crops.map((c) => ({
        name: c.name,
        category: "Vegetables",
        available: Math.round(c.acres * 400),
        priceRupees: 42,
      })),
      societies: ["Devanahalli Cooperative Society (SOC-DEV-001)"],
      insights: [
        {
          title: "Tomato Disease Risk Index",
          body: "Scouting heuristic for this micro-climate zone: 14–22% dampness risk. Preventative bio-fungicide drench suggested.",
          origin: "ICAR Agronomy Model",
        },
        {
          title: "Irrigation Optimization",
          body: "Recommendation: Trim drip duration by ~12% if dawn soil temperature remains below 19°C.",
          origin: "UAS Bangalore Heuristic",
        },
        {
          title: "Expected Seasonal Yield",
          body: `${(farm.acres * 1.2).toFixed(1)} tons modeled from active acreage and regional vegetative index.`,
          origin: "AI Grounded Projection",
        },
      ],
      priceForecast: {
        commodity: "Hybrid Tomato",
        currentRupees: 45,
        predictedRupees: 49,
        direction: "Upward (+9%)",
        confidence: 88,
      },
    });
    setIsLive(false);
  };

  useEffect(() => {
    fetchTwin().finally(() => setLoading(false));
  }, []);

  const tomato = LISTINGS.find((l) => l.id === "veg-61");
  const series = priceSeries(twin?.priceForecast?.currentRupees || tomato?.variants[0]?.price || 45, 4);
  const rec = recommendCrops({
    region: twin?.profile?.district || "Bengaluru Rural",
    month: new Date().getMonth() + 1,
    soil: twin?.profile?.soil || "Red Sandy Loam",
  });
  const demand = demandForecast(120, 3);

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <SiteNav />
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-28">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link to="/farmer/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2f7a4a] hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              Farmer Dashboard
            </Link>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Farmer Digital Twin
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Live biophysical mirror powered by ICAR crop models, UAS Bangalore advisories, and PostgreSQL catalog telemetry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs ${
                isLive
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-600 animate-pulse" : "bg-amber-600"}`} />
              {isLive ? "PostgreSQL Live Twin" : "Demo Cache Store"}
            </span>

            <button
              onClick={() => fetchTwin()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Sync
            </button>
          </div>
        </div>

        {twin && (
          <>
            {/* Farmer Profile & Crops Card */}
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Farmer Profile</span>
                  <DataBadge origin={isLive ? "Live" : "Cached"} />
                </div>
                <h2 className="mt-3 text-2xl font-bold text-zinc-900">{twin.profile.farmerName}</h2>
                <p className="text-sm text-zinc-500">
                  {twin.profile.farmName} · {twin.profile.district}, {twin.profile.state}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-zinc-50 p-3">
                    <span className="text-xs text-zinc-500">Soil Classification</span>
                    <p className="mt-0.5 font-bold text-zinc-800">{twin.profile.soil}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-3">
                    <span className="text-xs text-zinc-500">Active Listings</span>
                    <p className="mt-0.5 font-bold text-zinc-800">{twin.profile.cropsCount} Crops</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-3">
                    <span className="text-xs text-emerald-700">Available Lot Stock</span>
                    <p className="mt-0.5 font-bold text-emerald-900">{twin.profile.totalAvailableKg} kg</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-3">
                    <span className="text-xs text-blue-700">Dispatched & Sold</span>
                    <p className="mt-0.5 font-bold text-blue-900">{twin.profile.totalSoldKg} kg</p>
                  </div>
                </div>

                {twin.societies.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs font-medium text-emerald-900">
                    <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Enrolled Hub: <b>{twin.societies[0]}</b></span>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Live Active Crops</span>
                  <Link
                    to="/farmer/cooperative"
                    className="text-xs font-bold text-[#2f7a4a] hover:underline flex items-center gap-1"
                  >
                    Pool Produce →
                  </Link>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {twin.crops.length === 0 ? (
                    <li className="py-6 text-center text-sm text-zinc-500">No active crops registered yet.</li>
                  ) : (
                    twin.crops.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-2xl bg-zinc-50 p-3 text-sm transition hover:bg-zinc-100"
                      >
                        <div>
                          <p className="font-bold text-zinc-900">{c.name}</p>
                          <span className="text-xs text-zinc-500">{c.category}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#2f7a4a]">{c.available} kg</p>
                          <span className="text-xs text-zinc-400">₹{c.priceRupees}/kg</span>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            {/* AI Insight Triad */}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {twin.insights.map((ins, i) => (
                <Insight
                  key={i}
                  title={ins.title}
                  body={ins.body}
                  origin={ins.origin as any}
                />
              ))}
            </div>

            {/* Price Forecast Section */}
            <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold text-lg text-zinc-900">
                    Farm-Gate Price Forecast: {twin.priceForecast.commodity}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Trend: <b className="text-emerald-700">{twin.priceForecast.direction}</b> · Next target: <b>₹{twin.priceForecast.predictedRupees}/kg</b> · Model Confidence: {twin.priceForecast.confidence}%
                  </p>
                </div>
                <DataBadge origin={series.origin} />
              </div>

              <div className="mt-4 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series.days}>
                    <XAxis dataKey="day" hide />
                    <YAxis hide domain={["dataMin - 4", "dataMax + 4"]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#2f7a4a" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Seasonal Agronomy Recommendation */}
            <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-zinc-900">UAS Bangalore Crop Recommendation · {rec.season}</h3>
                <DataBadge origin={rec.origin} />
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {rec.picks.map((p) => (
                  <li key={p.crop} className="rounded-xl bg-zinc-50 p-2.5">
                    <b className="text-zinc-900">{p.crop}</b> — <span className="text-zinc-600">{p.reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Demand Outlook */}
            <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-zinc-900">Regional Consumer Demand Outlook</h3>
                <DataBadge origin={demand.origin} />
              </div>
              <div className="mt-4 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={demand.points}>
                    <XAxis dataKey="day" hide />
                    <YAxis hide />
                    <Tooltip />
                    <Line type="monotone" dataKey="demand" stroke="#e8b84a" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Insight({
  title,
  body,
  origin,
}: {
  title: string;
  body: string;
  origin: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs">
      <span className="rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2f7a4a]">
        {origin}
      </span>
      <h3 className="mt-2.5 font-bold text-zinc-900">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600">{body}</p>
    </div>
  );
}
