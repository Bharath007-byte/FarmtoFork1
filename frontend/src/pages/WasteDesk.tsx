import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { api } from "../services/api";
import { loadSihDb } from "../platform/store";
import { wasteRisk } from "../ai/engine";
import { getListing } from "../Data/listings";

type WasteRow = {
  id: string;
  listingId: string;
  name: string;
  variety?: string;
  category: string;
  farmName?: string;
  district?: string;
  harvestedKg: number;
  soldKg: number;
  inTransitKg: number;
  leftoverKg: number;
  shelfLifeDays: number;
  score: number;
  approaching: boolean;
  reason: string;
  action: string;
  origin: string;
};

type Summary = {
  totalHarvestedKg: number;
  totalSoldKg: number;
  totalLeftoverKg: number;
  atRiskKg: number;
  highRiskCount: number;
  savedRatePct: number;
};

export function WasteDesk() {
  const [wasteRows, setWasteRows] = useState<WasteRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "HIGH_RISK" | "SURPLUS">("ALL");
  const [actionNotif, setActionNotif] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api<{ waste: WasteRow[]; summary: Summary }>(
        "/api/admin/waste-analytics"
      );
      if (res && res.waste && res.waste.length > 0) {
        setWasteRows(res.waste);
        setSummary(res.summary);
        setIsLive(true);
        return;
      }
    } catch (err) {
      console.warn("Waste analytics from PostgreSQL failed, loading local store fallback:", err);
    }

    // Fallback gracefully to demo database if offline/demo
    const db = loadSihDb();
    const fallbackRows: WasteRow[] = db.waste.map((w) => {
      const listing = getListing(w.listingId);
      const risk = wasteRisk(w);
      return {
        id: w.id,
        listingId: w.listingId,
        name: listing?.name ?? w.listingId,
        variety: "Hybrid Standard",
        category: listing?.category ?? "Vegetables",
        farmName: "Samruddhi Cooperative Cluster",
        district: "Bengaluru Rural",
        harvestedKg: w.harvestedKg,
        soldKg: w.soldKg,
        inTransitKg: w.inTransitKg,
        leftoverKg: risk.leftoverKg,
        shelfLifeDays: 7,
        score: risk.score,
        approaching: risk.approaching,
        reason: risk.reason,
        action: risk.action,
        origin: risk.origin,
      };
    });

    const totalHarvested = fallbackRows.reduce((a, b) => a + b.harvestedKg, 0);
    const totalSold = fallbackRows.reduce((a, b) => a + b.soldKg, 0);
    const totalLeftover = fallbackRows.reduce((a, b) => a + b.leftoverKg, 0);
    const highRisk = fallbackRows.filter((r) => r.approaching);

    setWasteRows(fallbackRows);
    setSummary({
      totalHarvestedKg: totalHarvested,
      totalSoldKg: totalSold,
      totalLeftoverKg: totalLeftover,
      atRiskKg: highRisk.reduce((a, b) => a + b.leftoverKg, 0),
      highRiskCount: highRisk.length,
      savedRatePct: totalHarvested > 0 ? Math.round((totalSold / totalHarvested) * 100) : 92,
    });
    setIsLive(false);
  };

  useEffect(() => {
    fetchAnalytics().finally(() => setLoading(false));
  }, []);

  const triggerAction = (rowName: string, actionDesc: string) => {
    setActionNotif(`✓ Action Triggered for ${rowName}: ${actionDesc}`);
    setTimeout(() => setActionNotif(null), 4500);
  };

  const filteredRows = wasteRows.filter((r) => {
    if (filterTab === "HIGH_RISK") return r.approaching || r.score >= 50;
    if (filterTab === "SURPLUS") return r.leftoverKg >= 100;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6">
        {/* Navigation & Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2f7a4a] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Command Center
            </Link>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Food-Waste Mitigation Desk
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Live algorithmic perishability tracking across 159 master catalog lots and cooperative hubs.
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
              {isLive ? "PostgreSQL Live Store" : "Demo Cache Store"}
            </span>

            <button
              onClick={() => fetchAnalytics()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-xs hover:bg-zinc-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Action notification toast */}
        {actionNotif && (
          <div className="mt-4 animate-fadeIn rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-xs">
            {actionNotif}
          </div>
        )}

        {/* Top Summary Metrics */}
        {summary && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Harvested Volume</span>
                <Boxes className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
                {summary.totalHarvestedKg.toLocaleString()} <span className="text-base font-medium text-zinc-500">kg</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">Across all catalog produce</p>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Dispatched & Sold</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-emerald-700 sm:text-3xl">
                {summary.totalSoldKg.toLocaleString()} <span className="text-base font-medium text-emerald-600">kg</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {summary.savedRatePct}% successfully saved
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Current Stock</span>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
                {summary.totalLeftoverKg.toLocaleString()} <span className="text-base font-medium text-zinc-500">kg</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">In farm storage & cold chains</p>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-bold uppercase tracking-wider">At-Risk Lots</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-amber-900 sm:text-3xl">
                {summary.atRiskKg.toLocaleString()} <span className="text-base font-medium text-amber-700">kg</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-amber-800">
                {summary.highRiskCount} lots require mitigation
              </p>
            </div>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterTab("ALL")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filterTab === "ALL"
                  ? "bg-[#2f7a4a] text-white shadow-xs"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200"
              }`}
            >
              All Tracked Items ({wasteRows.length})
            </button>
            <button
              onClick={() => setFilterTab("HIGH_RISK")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                filterTab === "HIGH_RISK"
                  ? "bg-amber-700 text-white shadow-xs"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              High Risk / Perishable ({wasteRows.filter((r) => r.approaching || r.score >= 50).length})
            </button>
            <button
              onClick={() => setFilterTab("SURPLUS")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filterTab === "SURPLUS"
                  ? "bg-blue-700 text-white shadow-xs"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200"
              }`}
            >
              Bulk Surplus ({wasteRows.filter((r) => r.leftoverKg >= 100).length})
            </button>
          </div>

          <span className="text-xs text-zinc-500">
            Showing <b>{filteredRows.length}</b> catalog entries
          </span>
        </div>

        {/* Produce Cards List */}
        {loading ? (
          <div className="mt-12 text-center py-16">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#2f7a4a]" />
            <p className="mt-3 text-sm font-semibold text-zinc-600">Analyzing live crop lots & decay rates…</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white p-12 text-center border border-zinc-200">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h3 className="mt-3 text-lg font-bold text-zinc-800">No At-Risk Inventory Found</h3>
            <p className="mt-1 text-sm text-zinc-500">All harvest items within this filter are in optimal freshness range.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredRows.map((row) => {
              const isUrgent = row.approaching || row.score >= 50;

              return (
                <div
                  key={row.id}
                  className={`rounded-3xl border bg-white p-6 shadow-xs transition hover:shadow-md ${
                    isUrgent ? "border-amber-300 ring-1 ring-amber-200" : "border-zinc-200"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-lg text-zinc-900">{row.name}</h2>
                        {row.variety && (
                          <span className="text-xs font-medium text-zinc-500">({row.variety})</span>
                        )}
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                          {row.category}
                        </span>
                        {row.district && (
                          <span className="text-xs text-zinc-500">· {row.district}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Farm: <b>{row.farmName || "Primary Producer"}</b> · Shelf life ~{row.shelfLifeDays} days
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Waste Score</span>
                        <div
                          className={`text-2xl font-black ${
                            row.score >= 65
                              ? "text-rose-600"
                              : row.score >= 40
                              ? "text-amber-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {row.score}/100
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2f7a4a]">
                        {row.origin}
                      </span>
                    </div>
                  </div>

                  {/* Flow Numbers */}
                  <div className="mt-4 rounded-2xl bg-[#f7f4ec]/80 p-3.5 text-xs sm:text-sm font-medium text-zinc-700 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <b>{row.harvestedKg} kg</b> harvested
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span>
                      <b>{row.soldKg} kg</b> sold
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span>
                      <b>{row.inTransitKg} kg</b> in transit
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span className={`font-bold ${isUrgent ? "text-amber-800" : "text-zinc-900"}`}>
                      {row.leftoverKg} kg available stock
                    </span>
                  </div>

                  {/* Rationale & Action */}
                  <div className="mt-3 text-sm">
                    <p className="text-zinc-600">
                      <span className="font-semibold text-zinc-900">Decay Analysis: </span>
                      {row.reason}
                    </p>
                    <p className="mt-1 text-zinc-800">
                      <span className="font-semibold text-[#2f7a4a]">Recommended Mitigation: </span>
                      {row.action}
                    </p>
                  </div>

                  {/* Mitigation Quick-Action Buttons */}
                  <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-zinc-400">
                      1-Click Intervention:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => triggerAction(row.name, "20% Flash-Sale discount applied to Marketplace")}
                        className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                      >
                        ⚡ 20% Flash Sale
                      </button>
                      <button
                        onClick={() => triggerAction(row.name, "Lot diverted to Devanahalli Cold Hub (SOC-DEV-001)")}
                        className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition shadow-2xs"
                      >
                        ❄ Divert to Cold Hub
                      </button>
                      <button
                        onClick={() => triggerAction(row.name, "Sent priority notification to nearby consumers")}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-100 transition shadow-2xs"
                      >
                        📲 Local Push Alert
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

