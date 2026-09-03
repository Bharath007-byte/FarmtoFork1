import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { DataBadge } from "../components/DataBadge";
import { AgriMap } from "../components/AgriMap";
import { loadSihDb } from "../platform/store";
import { demandForecast, wasteRisk } from "../ai/engine";
import { api } from "../services/api";

export function CommandCenter() {
  const db = loadSihDb();
  const [live, setLive] = useState<{
    farmers: number;
    consumers: number;
    products: number;
    orders: number;
    capturedPayments: number;
  } | null>(null);
  useEffect(() => {
    api<NonNullable<typeof live>>("/api/admin/overview")
      .then(setLive)
      .catch(() => setLive(null));
  }, []);
  const [farmId, setFarmId] = useState(db.farms[0]?.id);
  const farm = db.farms.find((f) => f.id === farmId);
  const demand = demandForecast(200, 1);
  const waste = db.waste[0]
    ? wasteRisk(db.waste[0])
    : null;
  const coldAlerts = db.vehicles.filter(
    (v) => v.coldChain && v.tempC != null && v.tempC > v.thresholdC
  );

  const markers = useMemo(
    () => [
      ...db.farms.map((f) => ({
        id: f.id,
        lat: f.lat,
        lng: f.lng,
        label: f.farmerName,
        color: f.verified ? "#2f7a4a" : "#a16207",
        kind: "farm" as const,
      })),
      ...db.vehicles.map((v) => ({
        id: v.id,
        lat: v.lat,
        lng: v.lng,
        label: v.id,
        color: "#2563eb",
        kind: "vehicle" as const,
      })),
    ],
    [db.farms, db.vehicles]
  );

  return (
    <div className="min-h-screen bg-[#121814] text-[#e8efe8]">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-28">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#e8b84a]">
          Farm2Fork command center
        </p>
        <h1 className="mt-2 font-serif text-4xl text-white">Operations pulse</h1>
        <p className="mt-2 text-sm text-zinc-400">
          KPI counts mix live auth accounts (when present) with labeled simulated fleet/map layers.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Farmers" value={String(live?.farmers ?? 0)} note="PostgreSQL users" />
          <Kpi label="Consumers" value={String(live?.consumers ?? 0)} note="PostgreSQL users" />
          <Kpi label="Orders" value={String(live?.orders ?? 0)} note="Order table" />
          <Kpi label="Products" value={String(live?.products ?? 0)} note="Product table" />
          <Kpi label="Active vehicles" value={String(db.vehicles.length)} note="Simulated" />
          <Kpi label="Cold alerts" value={String(coldAlerts.length)} note="Telemetry demo" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl bg-[#1c241e] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-white">Live agricultural map</h2>
              <DataBadge origin="Simulated" />
            </div>
            <AgriMap
              markers={markers}
              height="h-[380px]"
              onSelect={(id) => {
                if (id.startsWith("F")) setFarmId(id);
              }}
            />
            <p className="mt-2 text-[11px] text-zinc-500">
              OSM tiles are live. Pins are a labeled demo layer, not live GPS hardware.
            </p>
          </div>
          <div className="rounded-3xl bg-[#1c241e] p-5">
            <h2 className="font-bold text-white">Clicked farm</h2>
            {farm ? (
              <dl className="mt-3 space-y-2 text-sm">
                <Row k="Farmer" v={`${farm.farmerName} · ${farm.verified ? "Verified" : "Pending"}`} />
                <Row k="Location" v={farm.region} />
                <Row k="Area" v={`${farm.acres} acres`} />
                <Row k="Crop" v={farm.crops.map((c) => c.name).join(", ")} />
                <Row k="Health" v="Scout heuristic — AI Prediction" />
                <Row k="Expected yield" v="Modelled from area, not weighed" />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Select a farm pin.</p>
            )}
            <Link to="/farmer/twin" className="mt-4 inline-block text-sm font-semibold text-[#e8b84a]">
              Open digital twin →
            </Link>
            <Link to="/admin/waste" className="ml-4 inline-block text-sm font-semibold text-[#e8b84a]">
              Waste desk →
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-[#1c241e] p-5">
            <h3 className="font-bold">Demand forecast</h3>
            <p className="mt-2 text-3xl font-extrabold text-[#e8b84a]">{demand.nextWeek}</p>
            <p className="text-xs text-zinc-500">Index · {demand.origin}</p>
          </div>
          <div className="rounded-3xl bg-[#1c241e] p-5">
            <h3 className="font-bold">Food-waste risk</h3>
            <p className="mt-2 text-3xl font-extrabold">{waste?.score ?? "—"}</p>
            <p className="text-xs text-zinc-500">{waste?.reason}</p>
          </div>
          <div className="rounded-3xl bg-[#1c241e] p-5">
            <h3 className="font-bold">Logistics alerts</h3>
            <p className="mt-2 text-sm">
              {coldAlerts.length
                ? coldAlerts.map((v) => `${v.id} at ${v.tempC}°C > ${v.thresholdC}°C`).join(" · ")
                : "No threshold breaches in the demo feed."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl bg-[#1c241e] p-4">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-white">{value}</p>
      <p className="text-[10px] text-zinc-500">{note}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-zinc-500">{k}</p>
      <p>{v}</p>
    </div>
  );
}
