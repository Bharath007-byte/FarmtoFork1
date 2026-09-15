import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Bell,
  CheckCheck,
  UserCircle,
  MapPin,
  Droplets,
  LandPlot,
  Award,
  Phone,
  CreditCard,
  Check,
  UploadCloud,
  Camera,
  Sprout,
} from "lucide-react";
import { api, ApiError, rupees, mediaUrl } from "../../services/api";
import { useRealtime } from "../../hooks/useRealtime";
import { useApp } from "../../context/AppState";

export function InventoryPage() {
  const [rows, setRows] = useState<
    {
      productId: string;
      product: string;
      available: number;
      reserved: number;
      sold: number;
      unit: string;
      pricePaise: number;
      marketPaise: number | null;
      active: boolean;
    }[]
  >([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api<{ rows: typeof rows }>("/api/farmers/me/inventory")
      .then((d) => {
        setRows(d.rows);
        setError("");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Unable to load inventory"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["INVENTORY_UPDATED", "ORDER_CREATED"], load);

  return (
    <div>
      <h1 className="font-serif text-3xl">Inventory</h1>
      {loading && <p className="mt-4 text-sm text-zinc-500">Loading inventory…</p>}
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="mt-6 text-zinc-500">No inventory yet. List produce from Sell Produce.</p>
      )}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th>Available</th>
              <th>Reserved</th>
              <th>Sold</th>
              <th>Your price</th>
              <th>Market</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link to={`/farmer/products/${r.productId}`} className="font-semibold">
                    {r.product}
                  </Link>
                </td>
                <td>
                  {r.available} {r.unit}
                </td>
                <td>{r.reserved}</td>
                <td>{r.sold}</td>
                <td>{rupees(r.pricePaise)}</td>
                <td>{r.marketPaise != null ? rupees(r.marketPaise) : "—"}</td>
                <td>{r.active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EarningsPage() {
  const [stats, setStats] = useState<{
    totalEarningsPaise: number;
    pendingEarningsPaise: number;
    completedOrders: number;
  } | null>(null);
  const [rows, setRows] = useState<
    { orderId: string; product: string; amountPaise: number; status: string }[]
  >([]);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([
      api<{
        totalEarningsPaise: number;
        pendingEarningsPaise: number;
        completedOrders: number;
      }>("/api/farmers/me/stats"),
      api<{ rows: typeof rows }>("/api/farmers/me/earnings"),
    ])
      .then(([s, e]) => {
        setStats(s);
        setRows(e.rows);
        setError("");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Unable to load earnings"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["PAYMENT_CONFIRMED", "ORDER_STATUS_CHANGED"], load);

  return (
    <div>
      <h1 className="font-serif text-3xl">Earnings</h1>
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {stats && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs text-zinc-400">Net (delivered)</p>
            <p className="text-2xl font-extrabold">{rupees(stats.totalEarningsPaise)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs text-zinc-400">Pending earnings</p>
            <p className="text-2xl font-extrabold">{rupees(stats.pendingEarningsPaise)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs text-zinc-400">Completed orders</p>
            <p className="text-2xl font-extrabold">{stats.completedOrders}</p>
          </div>
        </div>
      )}
      {!error && rows.length === 0 && (
        <p className="mt-6 text-zinc-500">No order transactions yet.</p>
      )}
      <ul className="mt-6 space-y-2">
        {rows.map((r) => (
          <li key={r.orderId + r.product} className="flex justify-between rounded-xl bg-white px-4 py-3 text-sm">
            <span>
              {r.product}
              <span className="ml-2 text-xs text-zinc-400">{r.status}</span>
            </span>
            <span className="font-bold">{rupees(r.amountPaise)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketPage() {
  const [data, setData] = useState<{
    prices: {
      commodity: string;
      market: string;
      modalPaise: number;
      source: string;
      dataDate: string;
      observedAt: string;
      liveFeed: boolean;
    }[];
    disclaimer: string;
  } | null>(null);
  const [history, setHistory] = useState<{ date: string; modal: number }[]>([]);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");
  const [alertAbove, setAlertAbove] = useState("");

  const load = useCallback(() => {
    api<{
      prices: {
        commodity: string;
        market: string;
        modalPaise: number;
        source: string;
        dataDate: string;
        observedAt: string;
        liveFeed: boolean;
      }[];
      disclaimer: string;
    }>("/api/market-prices")
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Unable to load market prices"));
    api<{
      rows: { dataDate: string; modalPaise: number }[];
    }>(`/api/market-prices/history?commodity=Tomato&days=${days}`)
      .then((d) =>
        setHistory(
          d.rows.map((r) => ({
            date: r.dataDate.slice(0, 10),
            modal: r.modalPaise / 100,
          }))
        )
      )
      .catch(() => setHistory([]));
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["MARKET_PRICE_UPDATED"], load);

  return (
    <div>
      <h1 className="font-serif text-3xl">Market prices</h1>
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {data && (
        <p className="mt-2 text-sm text-zinc-500">
          {data.disclaimer}. Latest source: {data.prices[0]?.source || "none"}. Last
          updated:{" "}
          {data.prices[0]
            ? new Date(data.prices[0].observedAt).toLocaleString("en-IN")
            : "—"}
          . Data date:{" "}
          {data.prices[0] ? new Date(data.prices[0].dataDate).toLocaleDateString("en-IN") : "—"}
        </p>
      )}
      {!error && data && data.prices.length === 0 && (
        <p className="mt-6">No market data available.</p>
      )}
      <div className="mt-4 flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-full px-3 py-1 text-xs ${days === d ? "bg-[#1c2b22] text-white" : "bg-white"}`}
          >
            {d} days
          </button>
        ))}
      </div>
      {history.length > 0 && (
        <div className="mt-4 h-56 rounded-2xl bg-white p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="modal" stroke="#2f7a4a" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <ul className="mt-6 space-y-2">
        {data?.prices.map((p) => (
          <li key={p.commodity + p.market + p.observedAt} className="rounded-xl bg-white px-4 py-3 text-sm">
            <span className="font-bold">{p.commodity}</span> · {p.market} · {rupees(p.modalPaise)}
          </li>
        ))}
      </ul>
      <form
        className="mt-8 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await api("/api/market-prices/alerts", {
            method: "POST",
            body: JSON.stringify({ commodity: "Tomato", above: Number(alertAbove) }),
          });
          setAlertAbove("");
        }}
      >
        <input
          value={alertAbove}
          onChange={(e) => setAlertAbove(e.target.value)}
          placeholder="Alert if tomato modal above ₹"
          className="flex-1 rounded-xl bg-white px-3 py-2 text-sm"
        />
        <button className="rounded-xl bg-[#2f7a4a] px-4 text-sm font-bold text-white">Save</button>
      </form>
    </div>
  );
}

export function PredictionsPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Record<string, unknown>>("/api/market-prices/prediction?commodity=Tomato")
      .then(setResult)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Prediction request failed"));
  }, []);
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-[#1c2b22]">Market Price Forecasts</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Statistical trends based on Agmarknet historical mandi arrivals. The model does not invent missing mandi prices.
      </p>
      {error && <p className="mt-4 text-rose-600">{error}</p>}
      {result && result.ok === false && (
        <p className="mt-6 rounded-2xl bg-white p-5">{String(result.message)}</p>
      )}
      {result && result.ok === true && (
        <div className="mt-6 rounded-2xl bg-white p-5 text-sm">
          <p>Trend: {String((result.prediction as { trend: string }).trend)}</p>
          <p>
            Range: {rupees((result.prediction as { lowPaise: number }).lowPaise)} –{" "}
            {rupees((result.prediction as { highPaise: number }).highPaise)}
          </p>
          <p>
            Confidence (R²):{" "}
            {Math.round((result.prediction as { confidence: number }).confidence * 100)}%
          </p>
          <p className="mt-2">{String((result.prediction as { recommendation: string }).recommendation)}</p>
          <p className="mt-4 text-xs text-zinc-400">
            Based on: {((result.basedOn as string[]) || []).join(", ")}. Generated{" "}
            {String(result.generatedAt)}
          </p>
        </div>
      )}
    </div>
  );
}

export function LogisticsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<
    { id: string; startMin: number; endMin: number; booked: number; capacity: number; available: boolean }[]
  >([]);
  const [bookings, setBookings] = useState<{ id: string; status: string; pickup: string }[]>([]);
  const [pickup, setPickup] = useState("");
  const [qty, setQty] = useState("10");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<{ slots: typeof slots }>(`/api/logistics/slots?date=${date}`).then((d) => setSlots(d.slots));
    api<{ bookings: typeof bookings }>("/api/logistics/bookings").then((d) => setBookings(d.bookings));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime(["LOGISTICS_BOOKED"], load);

  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const am = h < 12;
    const h12 = h % 12 || 12;
    return `${h12}:${String(min).padStart(2, "0")} ${am ? "AM" : "PM"}`;
  };

  return (
    <div>
      <h1 className="font-serif text-3xl">Logistics</h1>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mt-4 rounded-xl bg-white px-3 py-2 text-sm"
      />
      <input
        value={pickup}
        onChange={(e) => setPickup(e.target.value)}
        placeholder="Pickup location"
        className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-sm"
      />
      <input
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Quantity"
        className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-sm"
      />
      <div className="mt-4 grid gap-2">
        {slots.length === 0 && <p className="text-sm text-zinc-500">No slots for this date (seed generates 7 days).</p>}
        {slots.map((s) => (
          <button
            key={s.id}
            disabled={!s.available}
            type="button"
            onClick={async () => {
              setMsg("");
              try {
                const r = await api<{ booking: { id: string } }>("/api/logistics/book", {
                  method: "POST",
                  body: JSON.stringify({
                    slotId: s.id,
                    pickup,
                    quantity: Number(qty),
                    vehicle: "mini-truck",
                  }),
                });
                setMsg(`Booking confirmed: ${r.booking.id}`);
                load();
              } catch (e) {
                setMsg(e instanceof ApiError ? e.message : "Booking failed");
              }
            }}
            className="rounded-xl bg-white px-4 py-3 text-left text-sm disabled:opacity-40"
          >
            {fmt(s.startMin)} – {fmt(s.endMin)} · {s.booked}/{s.capacity}
            {!s.available ? " · full" : ""}
          </button>
        ))}
      </div>
      {msg && <p className="mt-3 text-sm font-semibold">{msg}</p>}
      <h2 className="mt-8 font-bold">Bookings</h2>
      <ul className="mt-2 space-y-2">
        {bookings.map((b) => (
          <li key={b.id} className="rounded-xl bg-white px-4 py-3 text-sm">
            {b.id.slice(0, 8)} · {b.status} · {b.pickup}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CollabPage() {
  const [nearby, setNearby] = useState<
    { userId?: string; user: { id: string; name: string }; farmName: string; location: string }[]
  >([]);
  const [rows, setRows] = useState<
    { id: string; crop: string; qtyA: number; qtyB: number; status: string; fromUserId: string; toUserId: string }[]
  >([]);
  const { id: myId } = useParams();
  void myId;

  const load = () => {
    api<{ farmers: typeof nearby }>("/api/farmers/nearby").then((d) => setNearby(d.farmers));
    api<{ collaborations: typeof rows }>("/api/collaborations").then((d) => setRows(d.collaborations));
  };
  useEffect(() => {
    load();
  }, []);
  useRealtime(["COLLABORATION_REQUESTED"], load);

  return (
    <div>
      <h1 className="font-serif text-3xl">Farmer collaborations</h1>
      <p className="mt-2 text-sm text-zinc-500">Nearby farmers in your district (from profiles).</p>
      <ul className="mt-6 space-y-2">
        {nearby.length === 0 && <li className="text-sm text-zinc-500">No other farmers in this district yet.</li>}
        {nearby.map((f) => (
          <li key={f.user.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
            <span>
              <span className="font-bold">{f.user.name}</span>
              <span className="block text-xs text-zinc-400">
                {f.farmName} · {f.location}
              </span>
            </span>
            <button
              type="button"
              className="rounded-full bg-[#2f7a4a] px-3 py-1 text-xs font-bold text-white"
              onClick={() =>
                api("/api/collaborations", {
                  method: "POST",
                  body: JSON.stringify({ toUserId: f.user.id, crop: "Tomato", qtyA: 80 }),
                }).then(load)
              }
            >
              Request
            </button>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-bold">Requests</h2>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl bg-white px-4 py-3 text-sm">
            {r.crop} · {r.qtyA}+{r.qtyB} = {r.qtyA + r.qtyB} · {r.status}
            {r.status === "PENDING" && (
              <button
                type="button"
                className="ml-3 text-xs font-bold text-[#2f7a4a]"
                onClick={() =>
                  api(`/api/collaborations/${r.id}/respond`, {
                    method: "POST",
                    body: JSON.stringify({ accept: true, qtyB: 120 }),
                  }).then(load)
                }
              >
                Accept 120 kg
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NotificationsPage() {
  const [rows, setRows] = useState<
    { id: string; title: string; message: string; read: boolean; createdAt: string }[]
  >([]);

  const load = () =>
    api<{ notifications: typeof rows }>("/api/notifications").then((d) => setRows(d.notifications || []));

  useEffect(() => {
    load();
  }, []);

  useRealtime(
    [
      "NOTIFICATION",
      "NEW_ORDER",
      "ORDER_CREATED",
      "COLLABORATION_REQUESTED",
      "PAYMENT_CONFIRMED",
      "LOGISTICS_BOOKED",
      "LOGISTICS_STATUS_CHANGED",
      "SOCIETY_SUPPLY",
    ],
    load
  );

  const markAsRead = async (id: string) => {
    try {
      await api(`/api/notifications/${id}/read`, { method: "PATCH" });
      setRows((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await api("/api/notifications/mark-all-read", { method: "PATCH" });
      setRows((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const unreadCount = rows.filter((r) => !r.read).length;

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-zinc-900">Farmer Notifications</h1>
            <p className="text-xs text-zinc-500">Live order bookings, cooperative society pooling & logistics alerts</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center text-zinc-400">
          <Bell className="mx-auto mb-2 h-8 w-8 text-emerald-600/40" />
          <p className="text-sm font-medium text-zinc-600">No notifications yet</p>
          <p className="mt-1 text-xs text-zinc-400">
            Incoming orders from consumers and cooperative societies will notify you here in real time.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((n) => (
            <li
              key={n.id}
              onClick={() => !n.read && markAsRead(n.id)}
              className={`relative cursor-pointer rounded-2xl border p-4 transition hover:shadow-sm ${
                !n.read
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600 ring-2 ring-emerald-100" />
                  )}
                  <div>
                    <p className="font-semibold text-zinc-900 text-sm">{n.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">{n.message}</p>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-zinc-400">
                  {formatTime(n.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FarmerProductInfo() {
  const { id } = useParams();
  const [product, setProduct] = useState<{
    name: string;
    pricePaise: number;
    unit: string;
    imageUrl: string | null;
    organic: boolean;
    harvestDate: string | null;
    farmer: { location: string };
    inventory: { available: number } | null;
  } | null>(null);
  const [market, setMarket] = useState<{ modalPaise: number; source: string } | null>(null);
  const [pred, setPred] = useState<Record<string, unknown> | null>(null);
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!id) return;
    api<{ product: typeof product }>(`/api/products/${id}`).then((d) => {
      setProduct(d.product);
      setPrice(String((d.product?.pricePaise || 0) / 100));
      setQty(String(d.product?.inventory?.available ?? ""));
    });
    api<{ prices: { commodity: string; modalPaise: number; source: string }[] }>("/api/market-prices").then(
      (d) => setMarket(d.prices[0] || null)
    );
    api<Record<string, unknown>>("/api/market-prices/prediction?commodity=Tomato").then(setPred);
  }, [id]);

  if (!product) return <p>Loading product…</p>;
  const img = product.imageUrl
    ? `${import.meta.env.VITE_API_URL || ""}${product.imageUrl}`
    : "https://images.unsplash.com/photo-1546470427-227c1c0a0d4a?auto=format&fit=crop&w=800&q=80";

  return (
    <div>
      <img src={img} alt="" className="h-48 w-full rounded-2xl object-cover" />
      <h1 className="mt-4 font-serif text-3xl">{product.name}</h1>
      <p className="mt-2 text-sm">Your price: {rupees(product.pricePaise)} / {product.unit}</p>
      <p className="text-sm">
        Market modal: {market ? `${rupees(market.modalPaise)} · ${market.source}` : "No stored market row"}
      </p>
      <p className="text-sm">Available: {product.inventory?.available ?? 0} {product.unit}</p>
      <p className="text-sm">Organic: {product.organic ? "Yes" : "No"}</p>
      {pred && pred.ok === false && <p className="mt-4 text-sm">{String(pred.message)}</p>}
      {pred && pred.ok === true && (
        <p className="mt-4 text-sm">
          AI: {(pred.prediction as { recommendation: string }).recommendation} (R²{" "}
          {Math.round((pred.prediction as { confidence: number }).confidence * 100)}%)
        </p>
      )}
      <form
        className="mt-6 space-y-2"
        onSubmit={async (e: FormEvent) => {
          e.preventDefault();
          await api(`/api/products/${id}`, {
            method: "PUT",
            body: JSON.stringify({ price: Number(price), quantity: Number(qty) }),
          });
          setMsg("Saved to database");
        }}
      >
        <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl bg-white px-3 py-2" />
        <input value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-xl bg-white px-3 py-2" />
        <button className="rounded-xl bg-[#2f7a4a] px-4 py-2 text-sm font-bold text-white">Update</button>
      </form>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}

export function FarmerOrdersPage() {
  const [orders, setOrders] = useState<
    {
      id: string;
      status: string;
      totalPaise: number;
      createdAt?: string;
      consumer?: { name: string };
      address?: { city?: string; district?: string; state?: string } | null;
      items: { qty: number; farmerId?: string; product: { name: string; unit: string } }[];
      payments?: { status: string }[];
    }[]
  >([]);
  const [error, setError] = useState("");
  const load = () =>
    api<{ orders: typeof orders }>("/api/orders")
      .then((d) => {
        setOrders(d.orders);
        setError("");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Unable to load orders"));
  useEffect(() => {
    load();
  }, []);
  useRealtime(["ORDER_CREATED", "ORDER_STATUS_CHANGED", "PAYMENT_CONFIRMED", "LOGISTICS_BOOKED"], load);

  const nextFor = (status: string) => {
    if (status === "PAID" || status === "COD_PENDING") return "ACCEPTED";
    if (status === "ACCEPTED") return "PREPARING";
    if (status === "PREPARING") return "READY_FOR_PICKUP";
    return null;
  };

  return (
    <div>
      <h1 className="font-serif text-3xl">Orders</h1>
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {orders.length === 0 && !error && <p className="mt-6 text-zinc-500">No orders yet.</p>}
      <ul className="mt-6 space-y-2">
        {orders.map((o) => {
          const next = nextFor(o.status);
          const paid = o.payments?.some((p) => p.status === "CAPTURED") || o.status !== "PENDING_PAYMENT";
          return (
            <li key={o.id} className="rounded-xl bg-white px-4 py-3 text-sm">
              <p className="font-bold">
                {o.status} · {o.id.slice(0, 8)} · {rupees(o.totalPaise)}
              </p>
              <p className="text-xs text-zinc-400">
                {o.consumer?.name}
                {o.createdAt ? ` · ${new Date(o.createdAt).toLocaleString("en-IN")}` : ""}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {o.items.map((i) => `${i.product.name} ${i.qty} ${i.product.unit}`).join(" · ")}
              </p>
              {o.address && (
                <p className="text-xs text-zinc-400">
                  Deliver to {o.address.city}, {o.address.district}, {o.address.state}
                </p>
              )}
              <p className="text-[11px] text-zinc-400">Payment: {paid ? "recorded" : "awaiting"}</p>
              {next && (
                <button
                  type="button"
                  className="mt-2 text-xs font-bold text-[#2f7a4a]"
                  onClick={() =>
                    api(`/api/orders/${o.id}/status`, {
                      method: "POST",
                      body: JSON.stringify({ status: next }),
                    }).then(load)
                  }
                >
                  Mark {next.replaceAll("_", " ").toLowerCase()}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FarmerProfilePage() {
  const { user } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profilePhoto, setProfilePhoto] = useState<string>(user?.photoUrl || "");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [farmerName, setFarmerName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [district, setDistrict] = useState("Tirupati");
  const [stateName, setStateName] = useState("Andhra Pradesh");
  const [pinCode, setPinCode] = useState("");

  // Detailed agronomic & land inputs from farmer:
  const [landSizeAcres, setLandSizeAcres] = useState("5.0");
  const [soilType, setSoilType] = useState("Red Sandy Loam");
  const [irrigationSource, setIrrigationSource] = useState("Borewell + Drip Irrigation");
  const [farmingType, setFarmingType] = useState("100% Certified Organic");
  const [experienceYears, setExperienceYears] = useState("12 Years");
  const [mandiRegNo, setMandiRegNo] = useState("APMC-TPT-2024-8891");
  const [primaryCrops, setPrimaryCrops] = useState("Tomatoes, Banganapalli Mangoes, Methi, Chilli, Ragi");
  const [payoutUpi, setPayoutUpi] = useState("farmer@okhdfcbank");
  const [storageFacility, setStorageFacility] = useState("On-farm ventilated shed");
  const [bio, setBio] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    api<{
      user: {
        name: string;
        phone?: string;
        email?: string;
        photoUrl?: string;
        farmer?: {
          farmName?: string;
          location?: string;
          district?: string;
          state?: string;
          pinCode?: string;
          details?: string;
        };
      };
    }>("/api/farmers/me")
      .then((d) => {
        if (d?.user) {
          if (d.user.name) setFarmerName(d.user.name);
          if (d.user.phone) setPhone(d.user.phone);
          if (d.user.email) setEmail(d.user.email);
          if (d.user.photoUrl) setProfilePhoto(d.user.photoUrl);
          if (d.user.farmer) {
            const f = d.user.farmer;
            if (f.farmName) setFarmName(f.farmName);
            if (f.location) setLocation(f.location);
            if (f.district) setDistrict(f.district);
            if (f.state) setStateName(f.state);
            if (f.pinCode) setPinCode(f.pinCode);
            if (f.details) {
              try {
                const extra = JSON.parse(f.details);
                if (extra.landSizeAcres) setLandSizeAcres(extra.landSizeAcres);
                if (extra.soilType) setSoilType(extra.soilType);
                if (extra.irrigationSource) setIrrigationSource(extra.irrigationSource);
                if (extra.farmingType) setFarmingType(extra.farmingType);
                if (extra.experienceYears) setExperienceYears(extra.experienceYears);
                if (extra.mandiRegNo) setMandiRegNo(extra.mandiRegNo);
                if (extra.primaryCrops) setPrimaryCrops(extra.primaryCrops);
                if (extra.payoutUpi) setPayoutUpi(extra.payoutUpi);
                if (extra.storageFacility) setStorageFacility(extra.storageFacility);
                if (extra.bio) setBio(extra.bio);
              } catch {
                setBio(f.details);
              }
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setProfilePhoto(previewUrl);

    try {
      setPhotoUploading(true);
      const fd = new FormData();
      fd.append("photo", file);
      const res = await api<{ photoUrl: string }>("/api/farmers/me/photo", {
        method: "POST",
        body: fd,
      });
      if (res?.photoUrl) {
        setProfilePhoto(res.photoUrl);
        try {
          const session = JSON.parse(localStorage.getItem("f2f-session") || "null");
          if (session) {
            session.photoUrl = res.photoUrl;
            localStorage.setItem("f2f-session", JSON.stringify(session));
          }
        } catch {}
      }
      setSaveMessage("Profile photo updated successfully!");
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err) {
      console.error("Photo upload error:", err);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setProfilePhoto(base64);
        await api("/api/farmers/me", {
          method: "PUT",
          body: JSON.stringify({ photoUrl: base64 }),
        }).catch(() => {});
        setSaveMessage("Profile photo updated!");
        setTimeout(() => setSaveMessage(""), 4000);
      };
      reader.readAsDataURL(file);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveMessage("");
    try {
      const detailsPayload = JSON.stringify({
        landSizeAcres,
        soilType,
        irrigationSource,
        farmingType,
        experienceYears,
        mandiRegNo,
        primaryCrops,
        payoutUpi,
        storageFacility,
        bio,
      });

      await api("/api/farmers/me", {
        method: "PUT",
        body: JSON.stringify({
          name: farmerName,
          phone,
          farmName,
          location,
          district,
          state: stateName,
          pinCode,
          photoUrl: profilePhoto,
          details: detailsPayload,
        }),
      });

      setSaveMessage("Farm profile and land records saved successfully!");
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err: any) {
      console.error(err);
      setSaveMessage(err?.message || "Failed to save profile. Please check connection.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-16">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-5">
            {/* Avatar & Photo Picker */}
            <div className="relative group shrink-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border-2 border-emerald-600/30 bg-emerald-50 flex items-center justify-center shadow-xs">
                {profilePhoto ? (
                  <img
                    src={mediaUrl(profilePhoto)}
                    alt={farmerName || "Farmer Photo"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-emerald-800">
                    <Sprout className="h-10 w-10 text-emerald-700" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 mt-1">Kisaan</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Change Photo"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl bg-[#1b4332] text-white shadow transition hover:bg-[#245e38] hover:scale-105"
              >
                {photoUploading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                  <UserCircle className="h-3.5 w-3.5 text-emerald-700" />
                  Verified Kisaan Profile
                </span>
                <span className="text-zinc-300">·</span>
                <span className="text-xs text-zinc-500 font-medium">Digital Landholding & Payouts</span>
              </div>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-zinc-900">
                Farmer Profile & Land Records
              </h1>
              <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
                Maintain your farm landholding, soil type, irrigation source, and APMC/PM-KISAN details for direct society contracts and logistics dispatch.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 hover:border-zinc-300"
            >
              <UploadCloud className="h-4 w-4 text-emerald-700" />
              {profilePhoto ? "Change Photo" : "Upload Profile Photo"}
            </button>
            <p className="mt-1 text-[11px] text-zinc-400 text-center sm:text-left">JPG, PNG up to 5MB</p>
          </div>
        </div>

        {/* Feedback Alert */}
        {saveMessage && (
          <div className={`mt-5 flex items-center gap-2 rounded-2xl p-4 text-xs font-bold ${
            saveMessage.includes("success") || saveMessage.includes("updated")
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}>
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{saveMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="mt-8 space-y-6">
          {/* Group 1: Personal & Contact Details */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-800 text-xs font-bold">1</div>
              <h3 className="text-sm font-bold text-zinc-900">Personal & Kisaan Contact Details</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Farmer Full Name *</label>
                <div className="relative">
                  <UserCircle className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    required
                    type="text"
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    placeholder="e.g. Ramesh Naidu"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Phone / WhatsApp Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98480 12345"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Account Email (Verified)</label>
                <input
                  disabled
                  type="email"
                  value={email || user?.email || "farmer@samruddhisetu.in"}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Group 2: Farm Location & Region */}
          <div className="border-t border-zinc-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-800 text-xs font-bold">2</div>
              <h3 className="text-sm font-bold text-zinc-900">Farm Location & District Hub</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Farm / Estate Name *</label>
                <input
                  required
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. Sri Venkateswara Agro Farm"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Village / Mandal / Panchayat</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Chandragiri / Devanahalli Rural"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">District / APMC Region *</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                >
                  <option value="Tirupati">Tirupati (తిరుపతి APMC)</option>
                  <option value="Devanahalli">Devanahalli (ದೇವನಹಳ್ಳಿ Hub)</option>
                  <option value="Chittoor">Chittoor (చిత్తూరు)</option>
                  <option value="Bengaluru Rural">Bengaluru Rural (ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ)</option>
                  <option value="Kolar">Kolar (ಕೋಲಾರ APMC)</option>
                  <option value="Anantapur">Anantapur (అనంతపురం)</option>
                  <option value="Yelahanka">Yelahanka Cluster</option>
                  <option value="Kadapa">YSR Kadapa (కడప)</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">State</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g. Andhra Pradesh / Karnataka"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">PIN Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="e.g. 517501"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Mandi / PM-KISAN Reg No</label>
                <div className="relative">
                  <Award className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={mandiRegNo}
                    onChange={(e) => setMandiRegNo(e.target.value)}
                    placeholder="e.g. APMC-TPT-2024-8891"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Group 3: Agricultural, Soil & Agronomic Data */}
          <div className="border-t border-zinc-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-800 text-xs font-bold">3</div>
              <h3 className="text-sm font-bold text-zinc-900">Agronomic, Land Size & Cultivation Inputs</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Total Landholding Area</label>
                <div className="relative">
                  <LandPlot className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={landSizeAcres}
                    onChange={(e) => setLandSizeAcres(e.target.value)}
                    placeholder="e.g. 5.5 Acres / 2 Hectares"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Soil Type (నేల రకం)</label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                >
                  <option value="Red Sandy Loam">Red Sandy Loam (ఎర్ర నేలలు / ಕೆಂಪು ಮಣ್ಣು)</option>
                  <option value="Black Cotton Soil">Black Cotton Soil (నల్లరేగడి నేలలు / ಕಪ್ಪು ಮಣ್ಣು)</option>
                  <option value="Alluvial Soil">Alluvial Soil (ఒండ్రు నేలలు)</option>
                  <option value="Clay Loam">Clay Loam (జిగురు నేలలు)</option>
                  <option value="Laterite / Red Gravelly">Laterite / Red Gravelly Soil</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Primary Irrigation Source</label>
                <div className="relative">
                  <Droplets className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <select
                    value={irrigationSource}
                    onChange={(e) => setIrrigationSource(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  >
                    <option value="Borewell + Drip Irrigation">Solar / Electric Borewell + Drip Irrigation</option>
                    <option value="Canal / River Lift">Canal Water / River Lift</option>
                    <option value="Open Farm Pond / Tank">Open Farm Pond / Rainwater Harvesting Tank</option>
                    <option value="Sprinkler System">Sprinkler Network</option>
                    <option value="Rainfed / Dryland">Rainfed / Dryland (వర్షాధార)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Farming Practice & Certification</label>
                <select
                  value={farmingType}
                  onChange={(e) => setFarmingType(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                >
                  <option value="100% Certified Organic">100% Certified Organic (NPOP / Jaivik Bharat)</option>
                  <option value="ZBNF Natural Farming">ZBNF / Natural Farming (సుభాష్ పాలేకర్ ప్రాకృతిక వ్యవసాయం)</option>
                  <option value="Regenerative Agroforestry">Regenerative Agroforestry</option>
                  <option value="Integrated Pest Management">Integrated Pest Management (IPM)</option>
                  <option value="Conventional Farming">Conventional Good Agricultural Practices</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Farming Experience</label>
                <input
                  type="text"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 15 Years"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Post-Harvest Storage Facility</label>
                <select
                  value={storageFacility}
                  onChange={(e) => setStorageFacility(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                >
                  <option value="On-farm ventilated shed">On-farm ventilated shade shed</option>
                  <option value="Local APMC Packhouse">Local APMC Packhouse / Sorting Yard</option>
                  <option value="Cold Storage nearby">Cold Storage facility within 10 km</option>
                  <option value="Covered Drying Yard">Covered drying yard for grains</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Primary Crops Grown (ముఖ్యమైన పంటలు)</label>
                <input
                  type="text"
                  value={primaryCrops}
                  onChange={(e) => setPrimaryCrops(e.target.value)}
                  placeholder="e.g. Tomatoes, Banganapalli Mangoes, Chilli, Fresh Kasuri Methi, Foxtail Millet, Ragi"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Direct Payout UPI ID (Escrow T+1)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={payoutUpi}
                    onChange={(e) => setPayoutUpi(e.target.value)}
                    placeholder="e.g. farmer@okhdfcbank"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Group 4: Farm Story & Cultivation Notes */}
          <div className="border-t border-zinc-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-800 text-xs font-bold">4</div>
              <h3 className="text-sm font-bold text-zinc-900">Farm Story & Cultivation Notes for Buyers</h3>
            </div>
            <div>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your natural cultivation methods, manure usage (Jeevamrutham/Cow dung compost), harvest frequency, and direct society supply capabilities..."
                className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50 resize-y"
              />
              <p className="mt-1.5 text-[11px] text-zinc-400">
                This note appears on your verified produce listings and helps apartment buyers trust your chemical-free methods.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-400">
              Changes sync directly with Samruddhi Setu APMC logistics & society desks.
            </p>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1b4332] px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#245e38] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingProfile ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving Details…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Farm Profile & Land Records
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
