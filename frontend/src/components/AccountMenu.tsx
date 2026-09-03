import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserRound } from "lucide-react";
import { useApp } from "../context/AppState";

export function AccountMenu({ light = false }: { light?: boolean }) {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const home =
    user?.role === "farmer"
      ? "/farmer/dashboard"
      : user?.role === "logistics"
        ? "/logistics"
        : user?.role === "admin"
          ? "/admin"
          : "/shop";

  const initial = (user?.name || "?").slice(0, 1).toUpperCase();
  const photo = user?.photoUrl
    ? user.photoUrl.startsWith("http")
      ? user.photoUrl
      : `${import.meta.env.VITE_API_URL || ""}${user.photoUrl}`
    : null;

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-2 ${
          light ? "ring-white/70 bg-white/20 text-white" : "ring-emerald-100 bg-[#e8f0e3] text-[#2f7a4a]"
        }`}
      >
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : user ? (
          <span className="text-sm font-bold">{initial}</span>
        ) : (
          <UserRound className="h-5 w-5" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-[90] mt-2 w-52 overflow-hidden rounded-2xl bg-white py-1 text-sm text-[#1c2b22] shadow-xl ring-1 ring-black/5">
          {user ? (
            <>
              <p className="truncate px-4 py-2 text-xs text-zinc-400">{user.name}</p>
              <Link
                to={home}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 hover:bg-zinc-50"
              >
                My account
              </Link>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left hover:bg-zinc-50"
                onClick={() => {
                  setOpen(false);
                  logout();
                  navigate("/");
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)} className="block px-4 py-2 hover:bg-zinc-50">
                Sign in
              </Link>
              <Link to="/join" onClick={() => setOpen(false)} className="block px-4 py-2 hover:bg-zinc-50">
                Sign up
              </Link>
              <Link
                to="/register/consumer"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 hover:bg-zinc-50"
              >
                Create a new account
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
