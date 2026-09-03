import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { api, ApiError } from "../services/api";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otpId, setOtpId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const request = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const d = await api<{ otpId: string; delivery: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setOtpId(d.otpId);
      setMsg(
        d.delivery === "dev_console"
          ? "Reset OTP printed on the API server console. It is not returned to this page."
          : "If that account exists, a verification code was sent."
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ otpId, code, password }),
      });
      setMsg("Password updated. You can sign in.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ec]">
      <SiteNav />
      <div className="mx-auto max-w-md px-5 pb-16 pt-28">
        <h1 className="font-serif text-4xl">Forgot password</h1>
        <form onSubmit={request} className="mt-6 space-y-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm"
          />
          <button className="w-full rounded-2xl bg-[#2f7a4a] py-3 text-sm font-bold text-white">
            Send OTP
          </button>
        </form>
        {otpId && (
          <form onSubmit={reset} className="mt-6 space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="OTP from SMS or server log"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm"
            />
            <input
              minLength={8}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm"
            />
            <button className="w-full rounded-2xl bg-[#1c2b22] py-3 text-sm font-bold text-white">
              Set password
            </button>
          </form>
        )}
        {msg && <p className="mt-4 text-sm text-emerald-800">{msg}</p>}
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-[#2f7a4a]">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
