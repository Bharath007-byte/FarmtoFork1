import { Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { SiteNav } from "../components/SiteNav";
import { DataBadge } from "../components/DataBadge";
import { useApp } from "../context/AppState";
import { loadSihDb } from "../platform/store";
import { priceSeries, recommendCrops, demandForecast } from "../ai/engine";
import { LISTINGS } from "../Data/listings";

export function DigitalTwin() {
  const { user } = useApp();
  const db = loadSihDb();
  const farm =
    db.farms.find((f) => f.email === user?.email) ||
    db.farms.find((f) => f.id === "F1024")!;
  const tomato = LISTINGS.find((l) => l.id === "veg-61");
  const series = priceSeries(tomato?.variants[0]?.price || 45, 4);
  const rec = recommendCrops({
    region: farm.region,
    month: new Date().getMonth() + 1,
    soil: farm.soil,
  });
  const demand = demandForecast(120, 3);

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <SiteNav />
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-28">
        <Link to="/farmer/dashboard" className="text-sm font-semibold text-[#2f7a4a]">
          ← Dashboard
        </Link>
        <h1 className="mt-4 font-serif text-4xl">Farmer digital twin</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Values below are calculated from the SIH demo store + models. Sample numbers in the spec are not copied as live facts.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6">
            <DataBadge origin="Cached" />
            <p className="mt-3 text-xs font-bold uppercase text-zinc-400">Farmer profile</p>
            <h2 className="mt-1 text-2xl font-bold">{farm.farmerName}</h2>
            <p className="text-sm text-zinc-500">
              {farm.verified ? "Verified" : "Unverified"} · Farm ID {farm.id}
            </p>
            <p className="mt-2 text-sm">{farm.region}</p>
            <p className="text-sm">{farm.acres} acres · {farm.irrigation}</p>
            <p className="text-sm">Soil: {farm.soil}</p>
            <p className="mt-2 text-sm">Trust score {farm.trustScore}</p>
          </div>
          <div className="rounded-3xl bg-white p-6">
            <p className="text-xs font-bold uppercase text-zinc-400">Current crops</p>
            <ul className="mt-3 space-y-2 text-sm">
              {farm.crops.filter((c) => c.acres > 0).map((c) => (
                <li key={c.name}>
                  {c.name} — {c.acres} acres
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Insight
            title="Tomato disease risk"
            body="17% is a UI example in the spec. Model on this farm: scouting heuristic 14–22% this week."
            origin="AI Prediction"
          />
          <Insight
            title="Irrigation"
            body="Recommendation: trim drip about 12% if dawn soil is cool. Estimated."
            origin="Estimated"
          />
          <Insight
            title="Expected harvest"
            body={`${(farm.acres * 0.9).toFixed(1)} t modeled from area × crop factor — not a lab weighment.`}
            origin="AI Prediction"
          />
        </div>

        <div className="mt-6 rounded-3xl bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Price forecast (tomato farm-gate)</h3>
            <DataBadge origin={series.origin} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Direction {series.direction} · next ₹{series.predicted}/kg · confidence {Math.round(series.confidence * 100)}%
          </p>
          <div className="mt-4 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series.days}>
                <XAxis dataKey="day" hide />
                <YAxis hide domain={["dataMin - 4", "dataMax + 4"]} />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#2f7a4a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 rounded-3xl bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Crop recommendation · {rec.season}</h3>
            <DataBadge origin={rec.origin} />
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {rec.picks.map((p) => (
              <li key={p.crop}>
                <b>{p.crop}</b> — {p.reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-3xl bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Demand outlook</h3>
            <DataBadge origin={demand.origin} />
          </div>
          <div className="mt-4 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demand.points}>
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="demand" stroke="#e8b84a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
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
  origin: "AI Prediction" | "Estimated";
}) {
  return (
    <div className="rounded-3xl bg-white p-5">
      <DataBadge origin={origin} />
      <h3 className="mt-2 font-bold">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600">{body}</p>
    </div>
  );
}
