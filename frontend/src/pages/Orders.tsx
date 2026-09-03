import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { api, ApiError, rupees } from "../services/api";
import { useRealtime } from "../hooks/useRealtime";

const STEPS = [
  "PENDING_PAYMENT",
  "COD_PENDING",
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export function Orders() {
  const [orders, setOrders] = useState<
    {
      id: string;
      status: string;
      totalPaise: number;
      createdAt: string;
      items: { product: { name: string }; qty: number }[];
    }[]
  >([]);
  const [error, setError] = useState("");

  const load = () => {
    api<{ orders: typeof orders }>("/api/orders")
      .then((d) => {
        setOrders(d.orders);
        setError("");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Unable to load orders"));
  };

  useEffect(() => {
    load();
  }, []);
  useRealtime(["ORDER_STATUS_CHANGED", "PAYMENT_CONFIRMED"], load);

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-28">
        <Link to="/shop" className="text-sm font-semibold text-emerald-800">
          ← Marketplace
        </Link>
        <h1 className="mt-4 font-serif text-4xl">Orders & deliveries</h1>
        {error && <p className="mt-6 text-rose-600">{error}</p>}
        {orders.length === 0 && !error && (
          <p className="mt-8 text-zinc-500">No crate on the road yet. Place an order from the cart.</p>
        )}
        <ul className="mt-8 space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-2xl bg-white p-5">
              <p className="text-xs font-bold uppercase text-emerald-800">{order.status}</p>
              <p className="mt-1 font-semibold">
                {order.items.map((i) => `${i.product.name} ×${i.qty}`).join(", ")}
              </p>
              <p className="text-sm text-zinc-500">
                {rupees(order.totalPaise)} · {new Date(order.createdAt).toLocaleString("en-IN")}
              </p>
              <ol className="mt-3 flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-zinc-400">
                {STEPS.map((s) => (
                  <li key={s} className={s === order.status ? "font-bold text-[#2f7a4a]" : ""}>
                    {s.replaceAll("_", " ")}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
