import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppState";
import { api, ApiError, mediaUrl, rupees } from "../services/api";

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addProductToCart, user } = useApp();
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<{
    id: string;
    name: string;
    description: string | null;
    unit: string;
    pricePaise: number;
    organic: boolean;
    imageUrl: string | null;
    harvestDate: string | null;
    farmer: { location: string; state: string; user: { name: string } };
    inventory: { available: number } | null;
    category: { name: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api<{ product: NonNullable<typeof product> }>(`/api/products/${id}`)
      .then((d) => {
        setProduct(d.product);
        setError("");
      })
      .catch((e) => {
        setProduct(null);
        setError(e instanceof ApiError ? e.message : "Unable to load product");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-10">Loading product…</p>;
  if (error || !product) {
    return (
      <div className="p-10 text-center">
        <p>{error || "This listing is gone."}</p>
        <Link to="/shop" className="mt-4 inline-block text-emerald-700">
          Back to shop
        </Link>
      </div>
    );
  }

  const img =
    mediaUrl(product.imageUrl) ||
    "https://images.unsplash.com/photo-1546470427-227c1c0a0d4a?auto=format&fit=crop&w=800&q=80";
  const avail = product.inventory?.available ?? 0;

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-8 md:grid-cols-[1.1fr_0.9fr] md:py-12">
        <div>
          <Link to="/shop" className="text-sm font-semibold text-[#2f7a4a]">
            ← Marketplace
          </Link>
          <div className="mt-4 overflow-hidden rounded-3xl bg-white">
            <img src={img} alt={product.name} className="aspect-square w-full object-cover" />
          </div>
        </div>
        <div className="py-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2f7a4a]">
            {product.category.name}
          </p>
          <h1 className="mt-2 font-serif text-4xl">{product.name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {product.description || "Farm-listed harvest from the live inventory table."}
          </p>
          <p className="mt-6 text-3xl font-extrabold">
            {rupees(product.pricePaise)} / {product.unit}
          </p>
          <div className="mt-6 rounded-2xl bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Farmer</p>
            <p className="mt-1 font-bold">{product.farmer.user.name}</p>
            <p className="text-sm text-zinc-500">
              {product.farmer.location}, {product.farmer.state}
            </p>
            <p className="text-xs text-zinc-400">
              {product.organic ? "Organic" : "Conventional"} · {avail} {product.unit} available
            </p>
          </div>
          <input
            type="number"
            min={1}
            max={avail}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="mt-4 w-full rounded-xl bg-white px-3 py-2 text-sm"
          />
          <button
            disabled={avail < 1}
            onClick={async () => {
              if (!user) {
                navigate("/login?next=/shop/" + product.id);
                return;
              }
              const err = await addProductToCart(product.id, qty);
              if (err) {
                window.alert(err);
                return;
              }
              navigate("/cart");
            }}
            className="mt-8 w-full rounded-2xl bg-[#2f7a4a] py-3.5 text-sm font-bold text-white disabled:bg-zinc-300"
          >
            {avail > 0 ? (user ? "Add to cart" : "Sign in to add to cart") : "Out of stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
