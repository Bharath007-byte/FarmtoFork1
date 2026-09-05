import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppState";
import { api, ApiError, mediaUrl, rupees } from "../services/api";

const WEIGHT_OPTIONS = [
  { label: "250 g", qty: 0.25 },
  { label: "500 g", qty: 0.5 },
  { label: "1 kg", qty: 1 },
];

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addProductToCart, user } = useApp();

  const [qty, setQty] = useState(0.25);
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
    farmer: {
      location: string;
      state: string;
      user: { name: string };
    };
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

        // Start with the smallest available option.
        const available = d.product.inventory?.available ?? 0;

        const firstAvailable = WEIGHT_OPTIONS.find(
          (option) => available >= option.qty
        );

        setQty(firstAvailable?.qty ?? 0.25);
      })
      .catch((e) => {
        setProduct(null);
        setError(
          e instanceof ApiError ? e.message : "Unable to load product"
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="p-10">Loading product…</p>;
  }

  if (error || !product) {
    return (
      <div className="p-10 text-center">
        <p>{error || "This listing is gone."}</p>

        <Link
          to="/shop"
          className="mt-4 inline-block text-emerald-700"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  const img =
    mediaUrl(product.imageUrl) ||
    "https://images.unsplash.com/photo-1546470427-227c1c0a0d4a?auto=format&fit=crop&w=800&q=80";

  const avail = product.inventory?.available ?? 0;

  /*
   * The marketplace catalog is priced per kg.
   *
   * Example:
   * ₹100 / kg
   * 250 g = ₹25
   * 500 g = ₹50
   * 1 kg = ₹100
   */
  const selectedPricePaise = Math.round(product.pricePaise * qty);

  const selectedOptionAvailable = avail >= qty;

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-8 md:grid-cols-[1.1fr_0.9fr] md:py-12">
        {/* Product image */}
        <div>
          <Link
            to="/shop"
            className="text-sm font-semibold text-[#2f7a4a]"
          >
            ← Marketplace
          </Link>

          <div className="mt-4 overflow-hidden rounded-3xl bg-white">
            <img
              src={img}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </div>
        </div>

        {/* Product information */}
        <div className="py-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2f7a4a]">
            {product.category.name}
          </p>

          <h1 className="mt-2 font-serif text-4xl">
            {product.name}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {product.description ||
              "Farm-listed harvest from the live inventory table."}
          </p>

          {/* Base price */}
          <p className="mt-6 text-3xl font-extrabold">
            {rupees(product.pricePaise)} / {product.unit}
          </p>

          {/* Farmer information */}
          <div className="mt-6 rounded-2xl bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
              Farmer
            </p>

            <p className="mt-1 font-bold">
              {product.farmer.user.name}
            </p>

            <p className="text-sm text-zinc-500">
              {product.farmer.location}, {product.farmer.state}
            </p>

            <p className="text-xs text-zinc-400">
              {product.organic ? "Organic" : "Conventional"} ·{" "}
              {avail} {product.unit} available
            </p>
          </div>

          {/* Weight selector */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">
                Choose quantity
              </p>

              <p className="text-xs text-zinc-500">
                Price per {product.unit}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {WEIGHT_OPTIONS.map((option) => {
                const available = avail >= option.qty;
                const selected = qty === option.qty;

                return (
                  <button
                    key={option.qty}
                    type="button"
                    disabled={!available}
                    onClick={() => setQty(option.qty)}
                    className={[
                      "rounded-2xl border px-3 py-3 text-sm font-bold transition",
                      selected
                        ? "border-[#2f7a4a] bg-[#2f7a4a] text-white"
                        : "border-zinc-200 bg-white text-[#1c2b22]",
                      !available
                        ? "cursor-not-allowed opacity-40"
                        : "hover:border-[#2f7a4a]",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected quantity + calculated price */}
          <div className="mt-4 rounded-2xl border border-[#dce7df] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                  Selected quantity
                </p>

                <p className="mt-1 text-lg font-extrabold">
                  {qty === 0.25
                    ? "250 g"
                    : qty === 0.5
                      ? "500 g"
                      : "1 kg"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                  Price
                </p>

                <p className="mt-1 text-2xl font-extrabold text-[#2f7a4a]">
                  {rupees(selectedPricePaise)}
                </p>
              </div>
            </div>
          </div>

          {/* Inventory warning */}
          {!selectedOptionAvailable && avail > 0 && (
            <p className="mt-3 text-sm font-semibold text-rose-600">
              Only {avail} {product.unit} is currently available.
            </p>
          )}

          {/* Add to cart */}
          <button
            disabled={avail < 0.25 || !selectedOptionAvailable}
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
            {avail < 0.25
              ? "Out of stock"
              : !selectedOptionAvailable
                ? "Not enough stock"
                : user
                  ? `Add ${qty === 0.25 ? "250 g" : qty === 0.5 ? "500 g" : "1 kg"} to cart`
                  : "Sign in to add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
