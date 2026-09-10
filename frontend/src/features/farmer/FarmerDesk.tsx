import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ApiError, rupees } from "../../services/api";
import { useRealtime } from "../../hooks/useRealtime";

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
      <h1 className="font-serif text-3xl">AI predictions</h1>
      <p className="mt-2 text-sm text-zinc-500">
        OLS on stored PriceHistory. The model does not invent missing mandi prices.
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
  const [rows, setRows] = useState<{ id: string; title: string; message: string; createdAt: string }[]>(
    []
  );
  const load = () =>
    api<{ notifications: typeof rows }>("/api/notifications").then((d) => setRows(d.notifications));
  useEffect(() => {
    load();
  }, []);
  useRealtime(
    ["ORDER_CREATED", "COLLABORATION_REQUESTED", "PAYMENT_CONFIRMED", "LOGISTICS_BOOKED"],
    load
  );
  return (
    <div>
      <h1 className="font-serif text-3xl">Notifications</h1>
      {rows.length === 0 && <p className="mt-6 text-zinc-500">No notifications yet.</p>}
      <ul className="mt-6 space-y-2">
        {rows.map((n) => (
          <li key={n.id} className="rounded-xl bg-white px-4 py-3">
            <p className="font-semibold">{n.title}</p>
            <p className="text-sm text-zinc-500">{n.message}</p>
          </li>
        ))}
      </ul>
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
  const [name, setName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api<{
      user: { name: string; farmer?: { farmName: string } };
    }>("/api/farmers/me").then((d) => {
      setName(d.user.name);
      setFarmName(d.user.farmer?.farmName || "");
    });
  }, []);
  return (
    <div>
      <h1 className="font-serif text-3xl">Profile</h1>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          await api("/api/farmers/me", {
            method: "PUT",
            body: JSON.stringify({ name, farmName }),
          });
          setMsg("Saved");
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl bg-white px-3 py-2" />
        <input
          value={farmName}
          onChange={(e) => setFarmName(e.target.value)}
          className="w-full rounded-xl bg-white px-3 py-2"
        />
        <label className="block text-sm">
          Profile photo
          <input
            type="file"
            accept="image/*"
            className="mt-1 block"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("photo", file);
              await api("/api/farmers/me/photo", { method: "POST", body: fd });
              setMsg("Photo uploaded");
            }}
          />
        </label>
        <button className="rounded-xl bg-[#2f7a4a] px-4 py-2 text-sm font-bold text-white">Save</button>
      </form>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
