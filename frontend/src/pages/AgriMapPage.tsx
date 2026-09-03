import { Link } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { AgriMap } from "../components/AgriMap";
import { DataBadge } from "../components/DataBadge";
import { loadSihDb } from "../platform/store";
import { useApp } from "../context/AppState";

export function AgriMapPage() {
  const { coords } = useApp();
  const db = loadSihDb();
  const markers = [
    ...db.farms.map((f) => ({
      id: f.id,
      lat: f.lat,
      lng: f.lng,
      label: `${f.farmerName} · ${f.region}`,
      color: "#2f7a4a",
      kind: "farm" as const,
    })),
    ...db.vehicles.map((v) => ({
      id: v.id,
      lat: v.lat,
      lng: v.lng,
      label: `${v.type} · ${v.driver}`,
      color: "#2563eb",
      kind: "vehicle" as const,
    })),
    ...(coords
      ? [{ id: "you", lat: coords.lat, lng: coords.lng, label: "You", color: "#e8b84a", kind: "you" as const }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#f7f4ec]">
      <SiteNav />
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-28">
        <Link to="/" className="text-sm font-semibold text-[#2f7a4a]">
          ← Home
        </Link>
        <h1 className="mt-4 font-serif text-4xl">Agricultural map</h1>
        <div className="mt-2">
          <DataBadge origin="Simulated" />
          <span className="ml-2 text-sm text-zinc-500">
            Tiles are live OSM. Farm and vehicle pins are a demo operations layer.
          </span>
        </div>
        <div className="mt-6">
          <AgriMap markers={markers} height="h-[480px]" />
        </div>
      </div>
    </div>
  );
}
