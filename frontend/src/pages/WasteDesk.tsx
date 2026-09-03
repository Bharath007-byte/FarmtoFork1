import { Link } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { DataBadge } from "../components/DataBadge";
import { loadSihDb } from "../platform/store";
import { wasteRisk } from "../ai/engine";
import { getListing } from "../Data/listings";

export function WasteDesk() {
  const db = loadSihDb();
  return (
    <div className="min-h-screen bg-[#f7f4ec]">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-28">
        <Link to="/admin" className="text-sm font-semibold text-[#2f7a4a]">
          ← Command center
        </Link>
        <h1 className="mt-4 font-serif text-4xl">Food-waste reduction</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Scores use inventory age vs shelf life. Not a lab spoilage assay.
        </p>
        <ul className="mt-8 space-y-4">
          {db.waste.map((row) => {
            const listing = getListing(row.listingId);
            const risk = wasteRisk(row);
            return (
              <li key={row.id} className="rounded-3xl bg-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">{listing?.name ?? row.listingId}</h2>
                  <DataBadge origin={risk.origin} />
                </div>
                <p className="mt-3 text-sm">
                  {row.harvestedKg} kg harvested → {row.soldKg} kg sold → {row.inTransitKg} kg in transit →{" "}
                  {risk.leftoverKg} kg leftover
                </p>
                <p className="mt-2 text-3xl font-extrabold">Risk {risk.score}</p>
                {risk.approaching && (
                  <p className="mt-2 font-semibold text-amber-800">AI detects waste risk</p>
                )}
                <p className="mt-2 text-sm text-zinc-600">{risk.reason}</p>
                <p className="mt-1 text-sm">{risk.action}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
