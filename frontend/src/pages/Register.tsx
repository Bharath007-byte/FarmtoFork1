import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { useApp } from "../context/AppState";
import type { UserRole } from "../types";

export function Register() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { registerAccount } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (role !== "farmer" && role !== "consumer" && role !== "logistics") {
    return <Navigate to="/join" replace />;
  }

  const home =
    role === "farmer" ? "/farmer/dashboard" : role === "logistics" ? "/logistics" : "/shop";

  const finish = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const err = await registerAccount({
      name,
      email,
      password,
      confirmPassword,
      role: role as UserRole,
      phone,
      farmName,
      location,
      district,
      state,
      pinCode,
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(home);
  };

  return (
    <div className="min-h-screen bg-white text-[#1c2b22]">
      <SiteNav />
      <div className="mx-auto max-w-md px-5 pb-16 pt-28">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#2f7a4a]">
          Create account
        </p>
        <h1 className="mt-2 font-serif text-4xl">
          {role === "farmer"
            ? "Farmer sign up"
            : role === "logistics"
              ? "Logistics sign up"
              : "Consumer sign up"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {role === "farmer"
            ? "After this you land on your dashboard. List produce from Sell."
            : "Use this email and password to sign in next time."}
        </p>

        <form onSubmit={finish} className="mt-8 space-y-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" />
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" />
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" />
          {role === "farmer" && (
            <>
              <input required value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="Farm name" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" />
              <input required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Village / town" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" />
              <input required value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" />
              <input required value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" />
              <input required value={pinCode} onChange={(e) => setPinCode(e.target.value)} placeholder="PIN code" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" />
            </>
          )}
          <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8)" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" />
          <input required minLength={8} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button disabled={busy} className="w-full rounded-2xl bg-[#2f7a4a] py-3.5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-500">
          Already registered?{" "}
          <Link
            to={role === "farmer" ? "/login?next=/farmer/dashboard" : "/login"}
            className="font-semibold text-[#2f7a4a]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
