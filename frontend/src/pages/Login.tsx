import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { useApp } from "../context/AppState";
import { afterLoginPath, readSession } from "../lib/routes";

export function Login() {
  const { loginWithPassword, user } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = user || readSession();
    if (!session) return;
    const next = params.get("next");
    const wantsFarmer = Boolean(next?.startsWith("/farmer"));
    const wantsLogistics = Boolean(next?.startsWith("/logistics"));
    const wantsAdmin = Boolean(next?.startsWith("/admin"));
    if (wantsFarmer && session.role !== "farmer") return;
    if (wantsLogistics && session.role !== "logistics") return;
    if (wantsAdmin && session.role !== "admin") return;
    navigate(afterLoginPath(session.role, next), { replace: true });
  }, [user, params, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const err = await loginWithPassword(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    const stored = JSON.parse(localStorage.getItem("f2f-session") || "null") as {
      role?: string;
    } | null;
    navigate(afterLoginPath(stored?.role, params.get("next")), { replace: true });
  };

  return (
    <div className="min-h-screen bg-white text-[#1c2b22]">
      <SiteNav />
      <div className="mx-auto max-w-md px-5 pb-16 pt-28">
        <h1 className="font-serif text-4xl">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Farmers go to the farm dashboard after sign in. New accounts use Sign up.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded-2xl bg-[#2f7a4a] py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-sm">
          <Link to="/forgot-password" className="font-semibold text-[#2f7a4a]">
            Forgot password?
          </Link>
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          New farmer?{" "}
          <Link to="/register/farmer" className="font-semibold text-[#2f7a4a]">
            Create a farm account
          </Link>
          {" · "}
          <Link to="/join" className="font-semibold text-[#2f7a4a]">
            Other roles
          </Link>
        </p>
        <p className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-500">
          Demo after the API is running: farmer@farm2fork.demo / FarmDemo@123
        </p>
      </div>
    </div>
  );
}
