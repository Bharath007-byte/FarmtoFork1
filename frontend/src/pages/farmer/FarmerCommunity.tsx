import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Percent,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { api, ApiError } from "../../services/api";
import { useRealtime } from "../../hooks/useRealtime";

type Society = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  address: string;
  village?: string | null;
  district: string;
  state: string;
  pinCode: string;
  verified: boolean;
  active: boolean;
  totalSeats?: number;
  occupiedSeats?: number;
  marginPercent?: number;
  operationModel?: string;
  corridorDistance?: string;
  _count?: {
    farmers: number;
    inventory: number;
    supplies: number;
  };
};

type Membership = {
  id: string;
  societyId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  active: boolean;
  joinedAt: string;
};

// Preset metadata to enrich societies matching media_1789452175964.png
const SOCIETY_META: Record<
  string,
  {
    totalSeats: number;
    occupiedSeats: number;
    marginPercent: number;
    operationModel: string;
    corridorDistance: string;
  }
> = {
  "KARNAL-UNION": {
    totalSeats: 18,
    occupiedSeats: 0,
    marginPercent: 1.2,
    operationModel: "Non-Profit Operation",
    corridorDistance: "Karnal - Kurukshetra - Panipat Belt (Within 25 km)",
  },
  "KONKAN-AGRO": {
    totalSeats: 12,
    occupiedSeats: 1,
    marginPercent: 2.0,
    operationModel: "GI Authentication & Quality Grading",
    corridorDistance: "Ratnagiri - Devgad - Sindhudurg Orchard Belt (Within 30 km)",
  },
  "SAHYADRI-AGRO": {
    totalSeats: 25,
    occupiedSeats: 0,
    marginPercent: 1.5,
    operationModel: "Pooled Maintenance & Cold Storage",
    corridorDistance: "Nashik - Dindori - Niphad Belt (Within 15 km)",
  },
  "GULF-MANNAR": {
    totalSeats: 30,
    occupiedSeats: 0,
    marginPercent: 1.8,
    operationModel: "Coastal Welfare Pool & Marine Depot",
    corridorDistance: "Tuticorin Marine Corridor & Jetty 1–4 (Within 10 km)",
  },
  "TIRUPATI-AGRI": {
    totalSeats: 20,
    occupiedSeats: 2,
    marginPercent: 1.4,
    operationModel: "APMC Mandi Pooling & Cold Reefer",
    corridorDistance: "Chandragiri - Renigunta Agricultural Corridor (Within 15 km)",
  },
  "DEVANAHALLI-UNION": {
    totalSeats: 15,
    occupiedSeats: 3,
    marginPercent: 1.5,
    operationModel: "Airport Highway Cold-Chain & Silk Pool",
    corridorDistance: "NH-44 Devanahalli - Yelahanka Belt (Within 20 km)",
  },
  "KADAPA-CENTRAL": {
    totalSeats: 25,
    occupiedSeats: 6,
    marginPercent: 1.0,
    operationModel: "Central APMC Mandi Aggregation Pool",
    corridorDistance: "Kadapa Central Hub & Rayalaseema Route (Within 12 km)",
  },
  "KADAPA-RURAL": {
    totalSeats: 20,
    occupiedSeats: 4,
    marginPercent: 1.0,
    operationModel: "Rural Village Bulk Collection & Transport",
    corridorDistance: "Kadapa Rural Farm Belt (Within 18 km)",
  },
};

export function FarmerCommunity() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("ALL");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [socRes, memRes] = await Promise.all([
        api<Society[]>("/api/societies"),
        api<{ memberships: Membership[] }>("/api/societies/my-memberships").catch(() => ({
          memberships: [],
        })),
      ]);
      setSocieties(socRes || []);
      setMemberships(memRes.memberships || []);
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : "Unable to load communities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime(
    ["SOCIETY_JOIN_REQUESTED", "SOCIETY_MEMBER_UPDATED", "SOCIETY_APPROVED"],
    load
  );

  const handleRequestToJoin = async (societyId: string, societyName: string) => {
    setSubmittingId(societyId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api(`/api/societies/${societyId}/join`, {
        method: "POST",
      });
      setSuccessMsg(
        `Join request submitted for ${societyName}! Waiting for administrator approval.`
      );
      // Update local memberships state optimistically
      setMemberships((prev) => {
        const filtered = prev.filter((m) => m.societyId !== societyId);
        return [
          ...filtered,
          {
            id: `temp-${Date.now()}`,
            societyId,
            status: "PENDING",
            active: false,
            joinedAt: new Date().toISOString(),
          },
        ];
      });
    } catch (err: any) {
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to submit join request.");
    } finally {
      setSubmittingId(null);
    }
  };

  const getMembershipStatus = (societyId: string) => {
    const m = memberships.find((item) => item.societyId === societyId);
    return m ? m.status : null;
  };

  const filteredSocieties = societies.filter((s) => {
    if (filterCity !== "ALL") {
      const matchCity =
        s.district.toLowerCase().includes(filterCity.toLowerCase()) ||
        s.name.toLowerCase().includes(filterCity.toLowerCase()) ||
        s.address.toLowerCase().includes(filterCity.toLowerCase());
      if (!matchCity) return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.district.toLowerCase().includes(q) ||
      s.state.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-20">
      {/* 1. Header Matching Reference Image media_1789452175964.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e3fae8] text-[#1b4332] shadow-2xs border border-emerald-200/80">
            <Compass className="h-6 w-6 text-[#1b4332]" />
          </div>

          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Nearby Communities
            </h1>
            <p className="mt-1 text-sm font-medium text-zinc-500">
              Join a cooperative society to pool & sell produce &gt; 50 kg
            </p>
          </div>
        </div>

        {/* Quick Filter Buttons & Search for Popular Cities */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search district, city or society..."
              className="h-8 rounded-xl border border-zinc-200 bg-white pl-8 pr-3 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:border-[#1b4332] focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
            />
          </div>
          {["ALL", "Tirupati", "Devanahalli", "Kadapa", "Nashik", "Karnal"].map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setFilterCity(city)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterCity === city
                  ? "bg-[#1b4332] text-white shadow-xs"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {city === "ALL" ? "All Cities" : city}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Grid of Communities Matching User Design */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-64 animate-pulse rounded-3xl border border-zinc-200 bg-white p-7"
            />
          ))}
        </div>
      ) : filteredSocieties.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-zinc-300" />
          <h3 className="mt-3 text-base font-bold text-zinc-900">No cooperative communities found</h3>
          <p className="mt-1 text-xs text-zinc-500">Try selecting 'All Cities' or adjusting your search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredSocieties.map((society) => {
            const meta = SOCIETY_META[society.code] || {
              totalSeats: 25,
              occupiedSeats: society._count?.farmers || 2,
              marginPercent: 1.5,
              operationModel: "Non-Profit Operation",
              corridorDistance: `${society.district}, ${society.state} (Within 20 km)`,
            };

            const vacancyLeft = Math.max(0, meta.totalSeats - meta.occupiedSeats);
            const status = getMembershipStatus(society.id);
            const isSubmitting = submittingId === society.id;

            return (
              <div
                key={society.id}
                className="flex flex-col justify-between rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-7 shadow-xs transition hover:border-zinc-300 hover:shadow-md"
              >
                {/* Top: Name & Verified Badge */}
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-serif text-lg font-bold leading-snug text-zinc-900 sm:text-xl">
                      {society.name}
                    </h3>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/40 bg-[#d8f3e5] px-3 py-1 text-[11px] font-bold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                      Verified
                    </span>
                  </div>

                  {/* Location line */}
                  <div className="mt-4 flex items-start gap-2 text-xs text-zinc-600">
                    <MapPin className="h-4 w-4 shrink-0 text-zinc-400 mt-0.5" />
                    <span>
                      <strong className="font-semibold text-zinc-800">
                        {society.district}, {society.state}
                      </strong>{" "}
                      • {meta.corridorDistance}
                    </span>
                  </div>

                  {/* Seats & Occupancy row */}
                  <div className="mt-3.5 flex items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-bold text-zinc-800">
                      <Users className="h-3.5 w-3.5 text-zinc-500" />
                      <span>
                        {meta.occupiedSeats}/{meta.totalSeats} seats
                      </span>
                    </span>
                    <span className="font-bold text-emerald-700">
                      {vacancyLeft} vacancy left
                    </span>
                  </div>

                  {/* Non-Profit / Operation Structure row */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Percent className="h-3.5 w-3.5 text-zinc-400" />
                    <span>
                      <strong className="font-semibold text-zinc-700">
                        {meta.marginPercent.toFixed(1)}%
                      </strong>{" "}
                      {meta.operationModel}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-6 pt-2">
                  {status === "APPROVED" ? (
                    <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e3fae8] py-3.5 text-sm font-bold text-emerald-900 border border-emerald-300 shadow-2xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      <span>Joined · Active Member</span>
                    </div>
                  ) : status === "PENDING" ? (
                    <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/80 bg-amber-50/80 py-3.5 text-sm font-bold text-amber-900 shadow-2xs">
                      <Clock className="h-4 w-4 text-amber-700 animate-spin" />
                      <span>Request Pending Approval</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting || vacancyLeft <= 0}
                      onClick={() => handleRequestToJoin(society.id, society.name)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d4a373] hover:bg-[#c99767] py-3.5 text-sm font-bold text-[#201509] shadow-sm transition-all hover:shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Submitting Request…</span>
                        </>
                      ) : (
                        <>
                          <span>+ Request to Join</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
