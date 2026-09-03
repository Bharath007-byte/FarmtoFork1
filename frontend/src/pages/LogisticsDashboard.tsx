import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Bike, Truck } from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { useApp } from "../context/AppState";
import { loadSihDb } from "../platform/store";
import { optimizeRoute } from "../ai/engine";

export function LogisticsDashboard() {
  const { user, loginWithPassword } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    const err = await loginWithPassword(email, password);
    if (err) setError(err);
  };

  if (!user || user.role !== "logistics") {
    return (
      <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
        <SiteNav />
        <div className="mx-auto max-w-md px-5 pb-16 pt-28">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#2f7a4a]">
            Logistics
          </p>
          <h1 className="mt-2 font-serif text-4xl">Fleet desk login</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Only a created logistics account can open jobs. Sign in below or
            register a vehicle first.
          </p>
          <form onSubmit={onLogin} className="mt-8 space-y-3">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm"
            />
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm"
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button className="w-full rounded-2xl bg-[#2f7a4a] py-3.5 text-sm font-bold text-white">
              Sign in to logistics
            </button>
          </form>
          <p className="mt-4 text-sm text-zinc-500">
            Need a fleet account?{" "}
            <Link to="/register/logistics" className="font-semibold text-[#2f7a4a]">
              Create one
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <SiteNav />
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-28">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#2f7a4a]">
          Logistics
        </p>
        <h1 className="mt-2 font-serif text-4xl">{user.name}&apos;s fleet desk</h1>
        <p className="mt-2 max-w-xl text-zinc-600">
          Take jobs and keep crates cold from farm gate to kitchen.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link
            to="/logistics/jobs"
            className="rounded-3xl bg-white p-7 shadow-sm hover:-translate-y-0.5"
          >
            <Bike className="h-7 w-7 text-[#2f7a4a]" />
            <h2 className="mt-4 text-xl font-bold">Instant deliveries</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Bike / scooter jobs, same-day, short radius. AI suggests the
              tightest loop.
            </p>
          </Link>
          <Link
            to="/logistics/jobs"
            className="rounded-3xl bg-white p-7 shadow-sm hover:-translate-y-0.5"
          >
            <Truck className="h-7 w-7 text-[#2f7a4a]" />
            <h2 className="mt-4 text-xl font-bold">Large deliveries</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Van, truck, and cold-chain lots with capacity in tons.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LogisticsJobs() {
  const db = loadSihDb();
  const route = optimizeRoute(
    db.vehicles.map((v) => ({ id: v.id, lat: v.lat, lng: v.lng }))
  );

  return (
    <div className="min-h-screen bg-[#f7f4ec]">
      <SiteNav />
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-28">
        <Link to="/logistics" className="text-sm font-semibold text-[#2f7a4a]">
          ← Logistics home
        </Link>
        <h1 className="mt-4 font-serif text-4xl">Fleet desk</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Vehicle pins and temperatures are labeled simulated telemetry — not live hardware.
        </p>
        <div className="mt-4 rounded-2xl bg-white p-4 text-sm">
          Suggested loop {route.order.join(" → ")} · {route.km} km{" "}
          <span className="text-zinc-400">({route.origin})</span>
        </div>
        <ul className="mt-6 space-y-4">
          {db.vehicles.map((v) => {
            const hot = v.coldChain && v.tempC != null && v.tempC > v.thresholdC;
            return (
              <li key={v.id} className="rounded-2xl bg-white p-5">
                <p className="text-xs font-bold text-[#2f7a4a]">
                  {v.type} · {v.driver} · {v.id}
                </p>
                <p className="mt-1 font-bold">{v.routeLabel}</p>
                <p className="text-sm text-zinc-500">
                  Order {v.orderId} · {v.progress}% · ETA {v.etaMin} min
                </p>
                {v.coldChain && (
                  <p className={`mt-2 text-sm ${hot ? "font-bold text-rose-600" : ""}`}>
                    Cabin {v.tempC}°C / alert at {v.thresholdC}°C
                    {hot ? " · threshold exceeded — swap to spare reefer V-11" : ""}
                  </p>
                )}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full bg-[#2f7a4a]"
                    style={{ width: `${v.progress}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
