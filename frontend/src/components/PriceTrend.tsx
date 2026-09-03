import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { Listing } from "../types";
import { priceSeries } from "../ai/engine";
import { DataBadge } from "./DataBadge";

export function PriceTrend({ listing }: { listing: Listing }) {
  const base = listing.variants.find((v) => v.price > 0)?.price ?? 0;
  if (!base) return null;
  const series = priceSeries(base, listing.name.length);
  return (
    <div className="mt-4 rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
          7-day farm-gate trend
        </p>
        <DataBadge origin={series.origin} />
      </div>
      <p className="mt-1 text-sm">
        {series.direction === "up" ? "↑" : series.direction === "down" ? "↓" : "→"} predicted ₹
        {series.predicted}
      </p>
      <div className="mt-2 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series.days}>
            <Area type="monotone" dataKey="price" stroke="#2f7a4a" fill="#e8f0e3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
