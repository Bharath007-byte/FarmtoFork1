import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, rupees } from "../services/api";

export function FarmerProduce() {
  const [products, setProducts] = useState<
    { id: string; name: string; pricePaise: number; active: boolean; inventory?: { available: number } | null }[]
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ products: typeof products }>("/api/products/mine")
      .then((d) => setProducts(d.products))
      .catch(() => setError("Unable to load products"));
  }, []);

  return (
    <div>
      <h1 className="font-serif text-3xl">My produce</h1>
      <Link
        to="/farmer/sell"
        className="mt-4 inline-block rounded-full bg-[#1a7a32] px-5 py-2.5 text-sm font-bold text-white"
      >
        Upload produce
      </Link>
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {products.length === 0 && !error && (
        <p className="mt-6 text-sm text-zinc-500">No lots in the database yet.</p>
      )}
      <ul className="mt-8 space-y-3">
        {products.map((p) => (
          <li key={p.id} className="rounded-2xl bg-white p-4">
            <Link to={`/farmer/products/${p.id}`} className="font-bold">
              {p.name}
            </Link>
            <p className="text-sm text-zinc-500">
              {rupees(p.pricePaise)} · {p.inventory?.available ?? 0} available · {p.active ? "active" : "inactive"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
