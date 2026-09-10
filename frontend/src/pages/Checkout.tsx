import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError, rupees } from "../services/api";
import { useApp } from "../context/AppState";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

type Address = {
  id: string;
  label: string;
  recipient: string | null;
  line1: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
};

type CartItem = {
  id: string;
  productId: string;
  qty: number;
  product: {
    id: string;
    name: string;
    unit: string;
    pricePaise: number;
    imageUrl?: string | null;
    farmer?: {
      user?: {
        name?: string | null;
      } | null;
    } | null;
  };
};

type PaymentMethod = "ONLINE" | "COD";

export function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshCartCount } = useApp();

  const addressId =
    (location.state as { addressId?: string } | null)?.addressId || "";

  const [address, setAddress] = useState<Address | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("ONLINE");
  type FulfillmentChoice = "SOCIETY" | "DIRECT_FARMER";

  const [fulfillmentChoice, setFulfillmentChoice] =
    useState<FulfillmentChoice>("SOCIETY");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState("");

  /*
   * If somebody opens /checkout/payment directly without
   * selecting an address first, send them back to address selection.
   */
  useEffect(() => {
    if (!addressId) {
      navigate("/checkout", { replace: true });
    }
  }, [addressId, navigate]);

  /*
   * Load the selected address from the database.
   */
  useEffect(() => {
    if (!addressId) return;

    let cancelled = false;

    async function loadAddress() {
      try {
        const result = await api<{ addresses: Address[] }>(
          "/api/addresses"
        );

        if (cancelled) return;

        const selected = result.addresses.find(
          (item) => item.id === addressId
        );

        if (!selected) {
          setError("The selected address could not be found.");
          return;
        }

        setAddress(selected);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to load the delivery address."
          );
        }
      }
    }

    void loadAddress();

    return () => {
      cancelled = true;
    };
  }, [addressId]);

  /*
   * Load the real database-backed cart.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      try {
        const result = await api<{ items: CartItem[] }>("/api/cart");

        if (!cancelled) {
          setItems(result.items || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to load your cart."
          );
        }
      }
    }

    void loadCart();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Load Razorpay only for online payments.
   */
  useEffect(() => {
    if (method !== "ONLINE" || success) return;

    if (window.Razorpay) return;

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [method, success]);

  const itemsTotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total +
        Math.round(item.qty * item.product.pricePaise),
      0
    );
  }, [items]);

  const totalItems = useMemo(() => {
    return items.reduce((total, item) => total + item.qty, 0);
  }, [items]);

  const societyOnly = totalItems < 50;

  /*
   * Orders below 50 kg must always use cooperative society fulfillment.
   */
  useEffect(() => {
    if (societyOnly) {
      setFulfillmentChoice("SOCIETY");
    }
  }, [societyOnly]);

  const formatQty = (qty: number, unit: string) => {
    if (unit === "kg") {
      if (qty < 1) {
        return `${Math.round(qty * 1000)} g`;
      }

      return `${qty} kg`;
    }

    return `${qty} ${unit}`;
  };

  const showSuccess = async (orderId: string) => {
    await refreshCartCount();

    setSuccessOrderId(orderId);
    setSuccess(true);

    /*
     * Give the user time to see the order confirmation.
     * The cart is already empty in the database after
     * successful order completion.
     */
    window.setTimeout(() => {
      navigate("/cart", { replace: true });
    }, 3000);
  };

  const placeOrder = async (e: FormEvent) => {
    e.preventDefault();

    if (!addressId) {
      setError("Please select a delivery address.");
      return;
    }

    if (!address) {
      setError("Please wait for the delivery address to load.");
      return;
    }

    if (!items.length) {
      setError("Your cart is empty.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      /*
       * Create the real order using the selected saved address.
       */
      const created = await api<{
        order: {
          id: string;
          totalPaise: number;
        };
      }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod: method,
          addressId,
          fulfillmentChannel: societyOnly
            ? "SOCIETY"
            : fulfillmentChoice,
        }),
      });

      /*
       * CASH ON DELIVERY
       *
       * No OTP.
       * The backend creates the COD order and we
       * immediately show the order confirmation.
       */
      if (method === "COD") {
        await showSuccess(created.order.id);
        setBusy(false);
        return;
      }

      /*
       * ONLINE PAYMENT
       *
       * Create the real Razorpay order from the backend.
       */
      const payment = await api<{
        keyId: string;
        razorpayOrderId: string;
        amount: number;
        paymentId: string;
      }>("/api/payments/create", {
        method: "POST",
        body: JSON.stringify({
          orderId: created.order.id,
        }),
      });

      if (!window.Razorpay) {
        setError(
          "Razorpay checkout could not be loaded. Please try again."
        );
        setBusy(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: "INR",
        name: "Farm2Fork",
        description: "Fresh farm produce",
        order_id: payment.razorpayOrderId,

        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api("/api/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                ...response,
                orderId: created.order.id,
              }),
            });

            await showSuccess(created.order.id);
          } catch (err) {
            setError(
              err instanceof ApiError
                ? err.message
                : "Payment verification failed."
            );
            setBusy(false);
          }
        },

        modal: {
          ondismiss: () => {
            setBusy(false);
            setError(
              "Payment was cancelled. Your order has not been completed."
            );
          },
        },

        theme: {
          color: "#16823F",
        },
      });

      razorpay.open();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to place your order."
      );
      setBusy(false);
    }
  };

  /*
   * ORDER SUCCESS SCREEN
   */
  if (success) {
    return (
      <div className="min-h-screen bg-[#F3F8F4] px-5 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[32px] border border-[#DDEADF] bg-white px-8 py-12 text-center shadow-[0_18px_50px_rgba(31,41,55,0.08)]">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#E7F6EC]">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#16823F] text-4xl text-white animate-[bounce_0.8s_ease-in-out]">
                ✓
              </div>
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.22em] text-[#16823F]">
              Farm2Fork
            </p>

            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#1F2937]">
              Order placed!
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6B7280]">
              Your farm-fresh order has been successfully placed.
              We're getting everything ready for you.
            </p>

            <div className="mx-auto mt-7 max-w-sm rounded-2xl bg-[#F3F8F4] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Order ID
              </p>

              <p className="mt-1 break-all text-sm font-bold text-[#075B42]">
                {successOrderId}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-[#6B7280]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#16823F]" />
              Returning to your cart…
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F8F4] px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/checkout"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#39834A] hover:text-[#075B42]"
        >
          ← Change delivery address
        </Link>

        <div className="mt-5">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#16823F]">
            Step 2 of 2
          </p>

          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#1F2937]">
            Payment
          </h1>

          <p className="mt-2 text-base text-[#6B7280]">
            Review your delivery and choose how you'd like to pay.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <form
          onSubmit={placeOrder}
          className="mt-8 grid gap-6 lg:grid-cols-[1fr_390px]"
        >
          <div className="space-y-6">
            {/* DELIVERY ADDRESS */}
            <section className="rounded-[28px] border border-[#DDEADF] bg-white p-6 shadow-[0_12px_35px_rgba(31,41,55,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16823F]">
                    Delivering to
                  </p>

                  <h2 className="mt-2 text-xl font-extrabold text-[#1F2937]">
                    {address?.label || "Selected address"}
                  </h2>
                </div>

                <span className="rounded-full bg-[#E7F6EC] px-3 py-1 text-xs font-bold text-[#16823F]">
                  ✓ Selected
                </span>
              </div>

              {address ? (
                <div className="mt-5 rounded-2xl bg-[#F7FAF8] p-4">
                  <p className="font-bold text-[#1F2937]">
                    {address.recipient || "Recipient"}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                    {address.line1}
                    <br />
                    {address.city}, {address.district}
                    <br />
                    {address.state} — {address.pinCode}
                  </p>

                  {address.phone && (
                    <p className="mt-2 text-sm font-semibold text-[#6B7280]">
                      Phone: {address.phone}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-[#F7FAF8] p-4 text-sm text-[#6B7280]">
                  Loading selected address…
                </div>
              )}
            </section>

            {/* FULFILLMENT CHANNEL */}
            <section className="rounded-[28px] border border-[#DDEADF] bg-white p-6 shadow-[0_12px_35px_rgba(31,41,55,0.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16823F]">
                Fulfillment
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-[#1F2937]">
                How your order will be fulfilled
              </h2>

              {societyOnly ? (
                <div className="mt-5 rounded-2xl border border-[#DDEADF] bg-[#F3F8F4] p-4">
                  <p className="font-bold text-[#1F2937]">
                    Cooperative society fulfillment
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                    Orders below 50 kg are fulfilled through a nearby
                    cooperative society with available stock. Direct
                    farmer delivery is available only for orders of
                    50 kg or more.
                  </p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[#16823F]">
                    Current total: {totalItems} kg
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <p className="text-sm text-[#6B7280]">
                    Your order is {totalItems} kg, so you can choose
                    how it should be fulfilled.
                  </p>

                  <label
                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                      fulfillmentChoice === "SOCIETY"
                        ? "border-[#16823F] bg-[#F3F8F4]"
                        : "border-[#E5E7EB] bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      value="SOCIETY"
                      checked={fulfillmentChoice === "SOCIETY"}
                      onChange={() => setFulfillmentChoice("SOCIETY")}
                      className="h-5 w-5 accent-[#16823F]"
                    />

                    <div className="flex-1">
                      <p className="font-bold text-[#1F2937]">
                        Cooperative society
                      </p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        Pickup from a nearby society collection centre
                        with confirmed stock.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                      fulfillmentChoice === "DIRECT_FARMER"
                        ? "border-[#16823F] bg-[#F3F8F4]"
                        : "border-[#E5E7EB] bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      value="DIRECT_FARMER"
                      checked={fulfillmentChoice === "DIRECT_FARMER"}
                      onChange={() =>
                        setFulfillmentChoice("DIRECT_FARMER")
                      }
                      className="h-5 w-5 accent-[#16823F]"
                    />

                    <div className="flex-1">
                      <p className="font-bold text-[#1F2937]">
                        Direct from farmer
                      </p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        The farmer accepts and prepares your order
                        before logistics pickup.
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </section>

            {/* PAYMENT METHOD */}
            <section className="rounded-[28px] border border-[#DDEADF] bg-white p-6 shadow-[0_12px_35px_rgba(31,41,55,0.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16823F]">
                Payment method
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-[#1F2937]">
                Choose how you want to pay
              </h2>

              <div className="mt-5 space-y-3">
                <label
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                    method === "ONLINE"
                      ? "border-[#16823F] bg-[#F3F8F4]"
                      : "border-[#E5E7EB] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="ONLINE"
                    checked={method === "ONLINE"}
                    onChange={() => setMethod("ONLINE")}
                    className="h-5 w-5 accent-[#16823F]"
                  />

                  <div className="flex-1">
                    <p className="font-bold text-[#1F2937]">
                      Online payment
                    </p>

                    <p className="mt-1 text-sm text-[#6B7280]">
                      Pay securely using Razorpay.
                    </p>
                  </div>

                  <span className="rounded-full bg-[#E7F6EC] px-3 py-1 text-xs font-bold text-[#16823F]">
                    Secure
                  </span>
                </label>

                <label
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                    method === "COD"
                      ? "border-[#16823F] bg-[#F3F8F4]"
                      : "border-[#E5E7EB] bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="COD"
                    checked={method === "COD"}
                    onChange={() => setMethod("COD")}
                    className="h-5 w-5 accent-[#16823F]"
                  />

                  <div className="flex-1">
                    <p className="font-bold text-[#1F2937]">
                      Cash on delivery
                    </p>

                    <p className="mt-1 text-sm text-[#6B7280]">
                      Pay when your fresh order arrives.
                    </p>
                  </div>

                  <span className="rounded-full bg-[#F7F4EC] px-3 py-1 text-xs font-bold text-[#6B7280]">
                    COD
                  </span>
                </label>
              </div>
            </section>
          </div>

          {/* ORDER SUMMARY */}
          <aside className="h-fit rounded-[28px] border border-[#DDEADF] bg-white p-6 shadow-[0_12px_35px_rgba(31,41,55,0.06)] lg:sticky lg:top-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16823F]">
              Your order
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-[#1F2937]">
              Order summary
            </h2>

            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F3F8F4]">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">🌱</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#1F2937]">
                      {item.product.name}
                    </p>

                    <p className="mt-1 text-xs text-[#6B7280]">
                      {formatQty(item.qty, item.product.unit)}
                    </p>
                  </div>

                  <p className="text-sm font-bold text-[#1F2937]">
                    {rupees(
                      Math.round(
                        item.qty * item.product.pricePaise
                      )
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div className="my-5 border-t border-dashed border-[#D7DED9]" />

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">
                  Items ({totalItems})
                </span>

                <span className="font-semibold text-[#1F2937]">
                  {rupees(itemsTotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#6B7280]">
                  Delivery
                </span>

                <span className="font-semibold text-[#6B7280]">
                  Calculated at checkout
                </span>
              </div>
            </div>

            <div className="my-5 border-t border-[#E5E7EB]" />

            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                  Total
                </p>

                <p className="mt-1 text-3xl font-extrabold text-[#075B42]">
                  {rupees(itemsTotal)}
                </p>
              </div>

              <span className="rounded-full bg-[#E7F6EC] px-3 py-1 text-xs font-bold text-[#16823F]">
                Farm fresh
              </span>
            </div>

            <button
              type="submit"
              disabled={
                busy ||
                !address ||
                !items.length
              }
              className="mt-6 w-full rounded-2xl bg-[#16823F] px-5 py-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(22,130,63,0.18)] transition hover:bg-[#075B42] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? method === "ONLINE"
                  ? "Opening secure payment…"
                  : "Placing order…"
                : method === "ONLINE"
                  ? "Continue to secure payment →"
                  : "Place COD order →"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-[#6B7280]">
              Your selected address and payment choice will
              be securely attached to this order.
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}
