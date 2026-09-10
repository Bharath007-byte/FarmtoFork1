import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, Sprout, ArrowRight } from "lucide-react";
import { api, ApiError } from "../services/api";

type Farmer = {
  id: string;
  farmName: string;
  district: string;
  state: string;
  location?: string | null;
  verified: boolean;
  user?: {
    name?: string;
  };
  _count?: {
    products?: number;
  };
};

export function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFarmers() {
      try {
        setLoading(true);
        setError("");

        const data = await api<{ farmers: Farmer[] }>("/api/farmers");

        setFarmers(data.farmers || []);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load farmers right now.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadFarmers();
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[#17211b]">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link
            to="/shop"
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf7ee] text-[#1d7a42]">
              <Sprout className="h-5 w-5" />
            </span>

            <span className="text-xl font-black tracking-tight">
              <span className="text-[#075b42]">Farm</span>
              <span className="text-[#ef6a35]">2</span>
              <span className="text-[#075b42]">Fork</span>
            </span>
          </Link>

          <Link
            to="/shop"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[#16823f] hover:text-[#16823f]"
          >
            Back to Marketplace
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16823f]">
            Farm2Fork Farmers
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-[#173b29] sm:text-5xl">
            Meet the farmers behind your food.
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600">
            Discover verified farms connected to the Farm2Fork
            marketplace and learn where your produce comes from.
          </p>
        </div>

        {loading && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-3xl bg-white shadow-sm"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && farmers.length === 0 && (
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <Sprout className="mx-auto h-10 w-10 text-slate-300" />

            <h2 className="mt-4 text-lg font-bold text-slate-800">
              No farmers available yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Farmer profiles will appear here when they are
              connected to the marketplace.
            </p>
          </div>
        )}

        {!loading && !error && farmers.length > 0 && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {farmers.map((farmer) => (
              <article
                key={farmer.id}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef8f1] text-[#16823f]">
                    <Sprout className="h-6 w-6" />
                  </div>

                  {farmer.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                </div>

                <h2 className="mt-6 text-xl font-black text-slate-900">
                  {farmer.farmName}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {farmer.user?.name || "Farm Partner"}
                </p>

                <div className="mt-4 flex items-start gap-2 text-sm text-slate-500">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

                  <span>
                    {farmer.location ||
                      [farmer.district, farmer.state]
                        .filter(Boolean)
                        .join(", ") ||
                      "Location unavailable"}
                  </span>
                </div>

                {farmer._count?.products !== undefined && (
                  <p className="mt-3 text-xs font-semibold text-slate-400">
                    {farmer._count.products} marketplace products
                  </p>
                )}

                <Link
                  to={`/shop?farmer=${encodeURIComponent(farmer.id)}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#075b42] transition group-hover:gap-3"
                >
                  View farm products
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
