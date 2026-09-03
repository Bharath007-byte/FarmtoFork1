import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import { api, ApiError } from "../services/api";

export function SellProduce() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [variety, setVariety] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [organic, setOrganic] = useState(false);
  const [description, setDescription] = useState("");
  const [minQty, setMinQty] = useState("1");
  const [maxQty, setMaxQty] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [marketHint, setMarketHint] = useState("");

  useEffect(() => {
    api<{ categories: { id: string; name: string }[] }>("/api/products/categories").then((d) => {
      setCategories(d.categories);
      setCategoryId(d.categories[0]?.id || "");
    });
    api<{ prices: { commodity: string; modalPaise: number; source: string }[]; disclaimer: string }>(
      "/api/market-prices"
    ).then((d) => {
      const t = d.prices.find((p) => p.commodity.toLowerCase() === "tomato") || d.prices[0];
      if (t) {
        setMarketHint(
          `${d.disclaimer}. ${t.commodity} modal ${t.modalPaise / 100} (${t.source}).`
        );
      }
    });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    fd.append("name", name);
    fd.append("categoryId", categoryId);
    fd.append("variety", variety);
    fd.append("quantity", quantity);
    fd.append("unit", unit);
    fd.append("price", price);
    fd.append("harvestDate", harvestDate);
    fd.append("availableFrom", availableFrom);
    fd.append("organic", String(organic));
    fd.append("description", description);
    fd.append("minQty", minQty);
    fd.append("maxQty", maxQty);
    if (file) fd.append("image", file);
    try {
      const created = await api<{ product: { id: string } }>("/api/products", {
        method: "POST",
        body: fd,
      });
      navigate(`/farmer/products/${created.product.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save product");
    }
  };

  return (
    <div>
      <h1 className="font-serif text-3xl">Sell produce</h1>
      <p className="mt-2 text-sm text-zinc-500">{marketHint}</p>
      <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-3">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-xl bg-white px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name (e.g. Tomato)" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" />
        <input value={variety} onChange={(e) => setVariety(e.target.value)} placeholder="Variety" className="w-full rounded-xl bg-white px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input required value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" className="rounded-xl bg-white px-3 py-2 text-sm" />
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm">
            {["kg", "quintal", "ton", "box", "dozen"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
        <input required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price per unit (₹)" className="w-full rounded-xl bg-white px-3 py-2 text-sm" />
        <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} className="w-full rounded-xl bg-white px-3 py-2 text-sm" />
        <input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className="w-full rounded-xl bg-white px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={organic} onChange={(e) => setOrganic(e.target.checked)} />
          Organic
        </label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full rounded-xl bg-white px-3 py-2 text-sm" />
        <input value={minQty} onChange={(e) => setMinQty(e.target.value)} placeholder="Min order qty" className="w-full rounded-xl bg-white px-3 py-2 text-sm" />
        <input value={maxQty} onChange={(e) => setMaxQty(e.target.value)} placeholder="Max order qty" className="w-full rounded-xl bg-white px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm">
          <Camera className="h-4 w-4" />
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="rounded-xl bg-[#2f7a4a] px-4 py-2 text-sm font-bold text-white">Save to database</button>
      </form>
    </div>
  );
}
