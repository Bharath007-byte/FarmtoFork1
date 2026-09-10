import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { useApp } from "../context/AppState";
import { afterLoginPath, readSession } from "../lib/routes";

export function Login() {
  const { loginWithPassword, logout, user } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const next = params.get("next");
  const isAdminLogin = Boolean(next?.startsWith("/admin"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = user || readSession();

    if (!session) return;

    /*
     * Admin Portal is intentionally a fresh authentication screen.
     *
     * Even if an old admin session exists in localStorage,
     * /login?next=/admin must show the Admin login form.
     */
    if (isAdminLogin) return;

    const wantsFarmer = Boolean(next?.startsWith("/farmer"));
    const wantsLogistics = Boolean(next?.startsWith("/logistics"));

    if (wantsFarmer && session.role !== "farmer") return;
    if (wantsLogistics && session.role !== "logistics") return;

    navigate(afterLoginPath(session.role, next), {
      replace: true,
    });
  }, [user, next, isAdminLogin, navigate]);

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

    const stored = JSON.parse(
      localStorage.getItem("f2f-session") || "null",
    ) as {
      role?: string;
      name?: string;
      email?: string;
    } | null;

    /*
     * Admin Portal accepts ONLY an ADMIN account.
     */
    if (isAdminLogin && stored?.role !== "admin") {
      logout();
      setError(
        "This account does not have administrator access. Please use the Admin account.",
      );
      return;
    }

    navigate(afterLoginPath(stored?.role, next), {
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <SiteNav />

      <div className="mx-auto max-w-md px-5 pb-16 pt-28">
        {isAdminLogin ? (
          <>
            <div className="mb-5 inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
              Farm2Fork Administration
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950">
              Admin sign in
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in with the authorized Farm2Fork administrator account to
              access the Admin Portal.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-4xl text-slate-950">
              Sign in
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Farmers go to the farm dashboard after sign in. New accounts use
              Sign up.
            </p>
          </>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">
              Email
            </label>

            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                isAdminLogin ? "Administrator email" : "Email"
              }
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">
              Password
            </label>

            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#2563EB] py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#1D4ED8] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Signing in…"
              : isAdminLogin
                ? "Sign in to Admin Portal"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-sm">
          <Link
            to="/forgot-password"
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Forgot password?
          </Link>
        </p>

        {!isAdminLogin && (
          <p className="mt-4 text-sm text-slate-500">
            New farmer?{" "}
            <Link
              to="/register/farmer"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Create a farm account
            </Link>
            {" · "}
            <Link
              to="/join"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Other roles
            </Link>
          </p>
        )}

        {isAdminLogin && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs leading-5 text-slate-500">
              Administrator access is restricted. Public registration does not
              create administrator accounts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
