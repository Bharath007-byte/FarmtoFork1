import { useState } from "react";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppState";

export function AdminSettings() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);

    logout();

    navigate("/login?next=/admin", {
      replace: true,
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
          System
        </div>

        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-slate-950">
          Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage the Farm2Fork administrator account and session.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserRound size={19} />
            </div>

            <div>
              <h2 className="text-base font-extrabold text-slate-950">
                Administrator account
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Current authenticated Farm2Fork administrator.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Name
            </div>

            <div className="mt-2 text-sm font-bold text-slate-900">
              {user?.name || "Administrator"}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Email
            </div>

            <div className="mt-2 break-all text-sm font-bold text-slate-900">
              {user?.email || "Not available"}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Role
            </div>

            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              <ShieldCheck size={14} />
              Administrator
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Access
            </div>

            <div className="mt-2 text-sm font-bold text-emerald-600">
              Admin portal
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-red-100 bg-white shadow-sm">
        <div className="p-6">
          <h2 className="text-base font-extrabold text-slate-950">
            Sign out
          </h2>

          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            Sign out of the current administrator session. You will need to
            authenticate again before accessing the Admin Portal.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={17} />

            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </section>
    </div>
  );
}
