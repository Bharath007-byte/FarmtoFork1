import type { Listing } from "../types";
import { farmForListing } from "../platform/seed";
import { loadSihDb } from "../platform/store";
import { DataBadge } from "./DataBadge";

export function TraceTimeline({ listing }: { listing: Listing }) {
  const db = loadSihDb();
  const events = db.traces.filter((e) => e.listingId === listing.id);
  const farm = farmForListing(listing.id, db.farms);
  if (!events.length) {
    return (
      <p className="mt-6 text-sm text-zinc-500">No harvest batch linked yet.</p>
    );
  }
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Farm-to-fork trace</h2>
        <DataBadge origin="Simulated" />
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {farm.verified ? "Verified farmer" : "Verification pending"} · {farm.region} · trust {farm.trustScore}
      </p>
      <ol className="mt-4 space-y-3 border-l-2 border-emerald-100 pl-4">
        {events.map((ev) => (
          <li key={ev.id}>
            <p className="text-sm font-semibold">{ev.step}</p>
            <p className="text-xs text-zinc-500">
              {new Date(ev.at).toLocaleString("en-IN")} · {ev.place}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
