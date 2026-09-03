import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  MapPin,
  Search,
  ShoppingCart,
  Sprout,
} from "lucide-react";
import { SEARCH_HINTS } from "../Data/products";
import { useApp } from "../context/AppState";
import { api, ApiError, mediaUrl, rupees } from "../services/api";
import { AccountMenu } from "../components/AccountMenu";

type ApiProduct = {
  id: string;
  name: string;
  unit: string;
  pricePaise: number;
  organic: boolean;
  imageUrl: string | null;
  farmer: { location: string; user: { name: string } };
  category: { name: string; slug: string };
  inventory: { available: number } | null;
  rating: number | null;
};

export function Shop() {
  const { cartCount, user, locationLabel, enableLiveLocation } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [hintIndex, setHintIndex] = useState(0);
  const [sort, setSort] = useState("newest");
  const [organic, setOrganic] = useState(false);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locBusy, setLocBusy] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % SEARCH_HINTS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (search) q.set("q", search);
    if (organic) q.set("organic", "true");
    q.set("sort", sort);
    api<{ products: ApiProduct[] }>(`/api/products?${q.toString()}`)
      .then((d) => {
        setProducts(d.products);
        setError("");
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Unable to load marketplace");
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [search, sort, organic]);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white">
        <div className="mx-auto flex min-h-[72px] max-w-[1280px] items-center gap-4 px-4 py-2 lg:px-6">
          <div className="flex shrink-0 flex-col items-start gap-1">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a7a32] text-white">
                <Sprout className="h-5 w-5" />
              </span>
              <span className="text-[22px] font-extrabold tracking-tight text-[#1a7a32]">
                farm2fork
              </span>
            </Link>
            <button
              type="button"
              onClick={async () => {
                setLocBusy(true);
                await enableLiveLocation();
                setLocBusy(false);
              }}
              className="inline-flex max-w-[200px] items-center gap-1 text-left text-[11px] font-semibold text-zinc-500"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1a7a32]" />
              <span className="truncate">{locBusy ? "Detecting…" : locationLabel || "Location"}</span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </button>
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={SEARCH_HINTS[hintIndex]}
              className="h-11 w-full rounded-xl bg-[#f2f4f7] pl-11 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
          <AccountMenu />
          <button
            onClick={() => navigate(user ? "/cart" : "/login?next=/cart")}
            className="relative flex h-11 items-center gap-2 rounded-xl bg-[#1d1d1d] px-3.5 text-sm font-bold text-white"
          >
            <ShoppingCart className="h-4 w-4" />
            My Cart
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f4c430] px-1 text-[10px] font-bold text-zinc-900">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 pb-20 pt-4 lg:px-6">
        <section className="overflow-hidden rounded-2xl bg-[#0d3d2c]">
          <div className="grid min-h-[240px] items-center md:grid-cols-2">
            <div className="px-8 py-10">
              <h1 className="text-3xl font-extrabold text-white md:text-4xl">
                Stock up on daily farm essentials
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/80">
                Live harvest from farms. Browse freely — sign in when you add to cart or checkout.
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80"
              alt=""
              className="hidden h-full min-h-[240px] w-full object-cover md:block"
            />
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOrganic((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${organic ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
          >
            Organic
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price low → high</option>
            <option value="price_desc">Price high → low</option>
          </select>
        </div>

        {loading && <p className="mt-10 text-sm text-zinc-500">Loading marketplace…</p>}
        {error && <p className="mt-10 text-sm text-rose-600">{error}</p>}
        {!loading && !error && products.length === 0 && (
          <p className="mt-10 text-zinc-500">
            No harvest listed yet. Farmers add produce from their dashboard.
          </p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((p) => {
            const img =
              mediaUrl(p.imageUrl) ||
              "https://images.unsplash.com/photo-1546470427-227c1c0a0d4a?auto=format&fit=crop&w=600&q=70";
            return (
              <Link
                key={p.id}
                to={`/shop/${p.id}`}
                className="group flex flex-col rounded-2xl border border-zinc-100 bg-white p-2.5"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f4f6fb]">
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </div>
                <p className="mt-2 text-[11px] text-zinc-400">
                  {p.category.name}
                  {p.organic ? " · Organic" : ""}
                </p>
                <h3 className="line-clamp-2 min-h-[36px] text-[13px] font-semibold">{p.name}</h3>
                <p className="text-[11px] text-zinc-500">
                  {p.farmer.user.name} · {p.farmer.location}
                </p>
                <p className="mt-auto pt-2 text-[15px] font-bold">
                  {rupees(p.pricePaise)} / {p.unit}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {p.inventory?.available ?? 0} available
                  {p.rating != null ? ` · ${p.rating.toFixed(1)}★` : ""}
                </p>
              </Link>
            );
          })}
        </div>
        <p className="mt-10 text-[11px] text-zinc-400">Direct from farm inventory.</p>
      </main>
    </div>
  );
}

export function CartPage() {
  const { refreshCartCount, user } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState<
    {
      id: string;
      qty: number;
      product: {
        id: string;
        name: string;
        pricePaise: number;
        unit: string;
        imageUrl: string | null;
        farmer: { user?: { name?: string }; farmName?: string };
      };
    }[]
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setError("Sign in to view your cart and place an order.");
      setItems([]);
      return;
    }
    api<{ items: typeof items }>("/api/cart")
      .then((d) => {
        setItems(d.items);
        setError("");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Sign in to view cart"));
  }, [user]);

  const total = items.reduce((n, i) => n + i.qty * i.product.pricePaise, 0);

  return (
    <div className="min-h-screen bg-[#f6f3ec]">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link to="/shop" className="text-sm font-semibold text-emerald-800">
          ← Continue shopping
        </Link>
        <h1 className="mt-4 font-serif text-4xl">My Cart</h1>
        {error && (
          <p className="mt-6 text-sm text-zinc-600">
            {error}{" "}
            {!user && (
              <Link to="/login?next=/cart" className="font-semibold text-[#2f7a4a]">
                Sign in
              </Link>
            )}
          </p>
        )}
        {items.length === 0 && !error && (
          <p className="mt-8 text-zinc-500">Your crate is empty.</p>
        )}
        <ul className="mt-8 space-y-4">
          {items.map((line) => (
            <li key={line.id} className="flex gap-4 rounded-2xl bg-white p-4">
              <div className="flex-1">
                <p className="font-semibold">{line.product.name}</p>
                <p className="text-xs text-zinc-500">
                  {line.product.unit} · {line.product.farmer.farmName || line.product.farmer.user?.name}
                </p>
                <p className="mt-1 font-bold">{rupees(line.product.pricePaise)}</p>
              </div>
              <button
                type="button"
                className="text-xs"
                onClick={async () => {
                  await api("/api/cart", {
                    method: "POST",
                    body: JSON.stringify({ productId: line.product.id, qty: line.qty - 1 }),
                  });
                  await refreshCartCount();
                  const d = await api<{ items: typeof items }>("/api/cart");
                  setItems(d.items);
                }}
              >
                −
              </button>
              <span className="text-sm font-bold">{line.qty}</span>
            </li>
          ))}
        </ul>
        {items.length > 0 && (
          <div className="mt-8 rounded-2xl bg-[#1a7a32] px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <span className="font-bold">{rupees(total)}</span>
              <button
                type="button"
                onClick={() => navigate("/checkout")}
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#1a7a32]"
              >
                Checkout
              </button>
            </div>
            <p className="mt-2 text-xs text-white/80">
              Address, delivery, Razorpay test checkout or COD OTP.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
