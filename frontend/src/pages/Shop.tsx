import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, rupees } from "../services/api";
import { useApp } from "../context/AppState";

export { Marketplace as Shop } from "../Marketplace";

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
