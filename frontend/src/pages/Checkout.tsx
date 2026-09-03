import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, rupees } from "../services/api";
import { useApp } from "../context/AppState";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export function Checkout() {
  const navigate = useNavigate();
  const { refreshCartCount } = useApp();
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [method, setMethod] = useState<"ONLINE" | "COD">("ONLINE");
  const [error, setError] = useState("");
  const [otpId, setOtpId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(s);
    return () => {
      s.remove();
    };
  }, []);

  const place = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const addr = await api<{ address: { id: string } }>("/api/addresses", {
        method: "POST",
        body: JSON.stringify({ line1, city, district: city, state, pinCode }),
      });
      const created = await api<{
        order: { id: string; totalPaise: number };
        otpId?: string;
        delivery?: string;
        message?: string;
      }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod: method,
          addressId: addr.address.id,
        }),
      });
      await refreshCartCount();
      if (method === "COD") {
        setOrderId(created.order.id);
        setOtpId(created.otpId || "");
        setError(
          created.delivery === "dev_console"
            ? "COD OTP was written to the API server console (not shown here)."
            : "Enter the OTP sent to your registered mobile."
        );
        setBusy(false);
        return;
      }
      const pay = await api<{
        keyId: string;
        razorpayOrderId: string;
        amount: number;
        paymentId: string;
      }>("/api/payments/create", {
        method: "POST",
        body: JSON.stringify({ orderId: created.order.id }),
      });
      if (!window.Razorpay) {
        setError("Razorpay checkout script failed to load.");
        setBusy(false);
        return;
      }
      const rz = new window.Razorpay({
        key: pay.keyId,
        amount: pay.amount,
        currency: "INR",
        order_id: pay.razorpayOrderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await api("/api/payments/verify", {
            method: "POST",
            body: JSON.stringify({
              ...response,
              orderId: created.order.id,
            }),
          });
          navigate("/orders");
        },
      });
      rz.open();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed");
    }
    setBusy(false);
  };

  const verifyCod = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/api/orders/${orderId}/cod-verify`, {
        method: "POST",
        body: JSON.stringify({ otpId, code }),
      });
      navigate("/orders");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "OTP failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ec] px-5 py-10">
      <div className="mx-auto max-w-md">
        <Link to="/cart" className="text-sm font-semibold text-[#2f7a4a]">
          ← Cart
        </Link>
        <h1 className="mt-4 font-serif text-4xl">Checkout</h1>
        {!orderId && (
          <form onSubmit={place} className="mt-6 space-y-3">
            <input required value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Address line" className="w-full rounded-2xl bg-white px-4 py-3 text-sm" />
            <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full rounded-2xl bg-white px-4 py-3 text-sm" />
            <input required value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-full rounded-2xl bg-white px-4 py-3 text-sm" />
            <input required value={pinCode} onChange={(e) => setPinCode(e.target.value)} placeholder="PIN" className="w-full rounded-2xl bg-white px-4 py-3 text-sm" />
            <label className="flex gap-2 text-sm">
              <input type="radio" checked={method === "ONLINE"} onChange={() => setMethod("ONLINE")} />
              Online (Razorpay test)
            </label>
            <label className="flex gap-2 text-sm">
              <input type="radio" checked={method === "COD"} onChange={() => setMethod("COD")} />
              Cash on delivery (OTP)
            </label>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button disabled={busy} className="w-full rounded-2xl bg-[#2f7a4a] py-3 text-sm font-bold text-white">
              Place order
            </button>
          </form>
        )}
        {orderId && (
          <form onSubmit={verifyCod} className="mt-6 space-y-3">
            <p className="text-sm">Order {orderId.slice(0, 8)}… {rupees(0).replace("₹0", "COD pending")}</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="OTP" className="w-full rounded-2xl bg-white px-4 py-3 text-sm" />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button className="w-full rounded-2xl bg-[#2f7a4a] py-3 text-sm font-bold text-white">
              Verify COD OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
