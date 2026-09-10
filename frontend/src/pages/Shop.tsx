import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, rupees } from "../services/api";
import { useApp } from "../context/AppState";

export { Marketplace as Shop } from "../Marketplace";

type CartItem = {
  id: string;
  qty: number;
  product: {
    id: string;
    name: string;
    pricePaise: number;
    unit: string;
    imageUrl: string | null;
    minQty: number;
    maxQty: number | null;
    inventory: {
      available: number;
    } | null;
    farmer: {
      user?: { name?: string };
      farmName?: string;
    };
  };
};

type RecommendedProduct = {
  id: string;
  name: string;
  pricePaise: number;
  unit: string;
  imageUrl: string | null;
  inventory: {
    available: number;
  } | null;
};
function DeliveryTipCard() {
  const [selectedTip, setSelectedTip] = useState<number>(0);

  const tipOptions = [20, 30, 50];

  return (
    <div className="mt-5 rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF1F0] text-xl">
          ❤️
        </div>

        <div>
          <h3 className="font-bold text-[#1F2937]">
            Tip your delivery partner
          </h3>

          <p className="mt-1 text-xs leading-5 text-[#6B7280]">
            Your kindness means a lot. 100% of your tip will
            go directly to your delivery partner.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {tipOptions.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => setSelectedTip(amount)}
            className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${
              selectedTip === amount
                ? "border-[#16823F] bg-[#E8F5EC] text-[#16823F]"
                : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#A8D5B5]"
            }`}
          >
            ₹{amount}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setSelectedTip(0)}
          className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${
            selectedTip === 0
              ? "border-[#16823F] bg-[#E8F5EC] text-[#16823F]"
              : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#A8D5B5]"
          }`}
        >
          Custom
        </button>
      </div>

      {selectedTip > 0 && (
        <p className="mt-3 text-center text-xs font-medium text-[#16823F]">
          Thank you for supporting your delivery partner ❤️
        </p>
      )}
    </div>
  );
}

function FarmerSupportCard() {
  return (
    <div className="mt-5 rounded-[24px] border border-[#DCE9DF] bg-[#EAF6EE] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
          🌱
        </div>

        <div>
          <h3 className="font-bold text-[#075B42]">
            Supporting a better food system
          </h3>

          <p className="mt-1 text-xs leading-5 text-[#4B6355]">
            Every Farm2Fork order helps connect customers
            with farmers and brings fresh food closer to
            your table.
          </p>
        </div>
      </div>
    </div>
  );
}
function formatWeight(qty: number, unit: string) {
  const normalized = unit.toLowerCase();

  if (
    normalized === "kg" ||
    normalized === "kilogram" ||
    normalized === "kilograms"
  ) {
    if (qty < 1) {
      return `${Math.round(qty * 1000)} g`;
    }

    if (Number.isInteger(qty)) {
      return `${qty} kg`;
    }

    return `${qty.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} kg`;
  }

  return `${qty} ${unit}`;
}

export function CartPage() {
  const { refreshCartCount, user } = useApp();
  const navigate = useNavigate();

  const [items, setItems] = useState<CartItem[]>([]);
  const [recommendations, setRecommendations] = useState<
    RecommendedProduct[]
  >([]);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [recommendationLoading, setRecommendationLoading] =
    useState(false);

  const loadCart = async () => {
    const d = await api<{ items: CartItem[] }>("/api/cart");
    setItems(d.items);
  };

  const loadRecommendations = async () => {
    try {
      setRecommendationLoading(true);

      const d = await api<{ products: RecommendedProduct[] }>(
        "/api/products"
      );

      const cartIds = new Set(items.map((item) => item.product.id));

      const available = (d.products || []).filter(
        (product) =>
          !cartIds.has(product.id) &&
          (product.inventory?.available ?? 0) > 0
      );

      setRecommendations(available.slice(0, 4));
    } catch {
      setRecommendations([]);
    } finally {
      setRecommendationLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setError("Sign in to view your cart and place an order.");
      setItems([]);
      return;
    }

    loadCart()
      .then(() => setError(""))
      .catch((e) =>
        setError(
          e instanceof ApiError
            ? e.message
            : "Sign in to view cart"
        )
      );
  }, [user]);

  useEffect(() => {
    if (user && items.length >= 0) {
      loadRecommendations();
    }
  }, [user, items]);

  const updateQuantity = async (
    line: CartItem,
    nextQty: number
  ) => {
    setError("");

    const minimum = line.product.minQty || 0.25;
    const available =
      line.product.inventory?.available ?? 0;

    /*
     * Marketplace quantities use 250 g steps.
     * The backend continues receiving kg values.
     */
    const normalizedQty =
      Math.round(nextQty * 100) / 100;

    if (normalizedQty < minimum) {
      return;
    }

    if (normalizedQty > available) {
      setError(
        `Only ${formatWeight(
          available,
          line.product.unit
        )} available for ${line.product.name}.`
      );
      return;
    }

    setUpdatingId(line.id);

    try {
      await api("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          productId: line.product.id,
          qty: normalizedQty,
        }),
      });

      await loadCart();
      await refreshCartCount();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Unable to update cart."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (line: CartItem) => {
    setError("");
    setUpdatingId(line.id);

    try {
      await api("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          productId: line.product.id,
          qty: 0,
        }),
      });

      await loadCart();
      await refreshCartCount();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Unable to remove item."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const addRecommendation = async (
    product: RecommendedProduct
  ) => {
    setError("");

    if ((product.inventory?.available ?? 0) < 0.25) {
      setError(
        `${product.name} does not currently have enough stock.`
      );
      return;
    }

    try {
      await api("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          qty: 0.25,
        }),
      });

      await loadCart();
      await refreshCartCount();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Unable to add recommendation."
      );
    }
  };

  const total = useMemo(
    () =>
      items.reduce(
        (n, i) => n + i.qty * i.product.pricePaise,
        0
      ),
    [items]
  );

  const totalQuantity = useMemo(
    () => items.reduce((n, i) => n + i.qty, 0),
    [items]
  );

  return (
    <div className="min-h-screen bg-[#F3F8F4] pb-32">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/shop"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#075B42] shadow-sm transition hover:-translate-x-0.5 hover:shadow-md"
            aria-label="Continue shopping"
          >
            ←
          </Link>

          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16823F]">
              Farm2Fork
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#1F2937] sm:text-3xl">
              My Cart
            </h1>
          </div>

          <div className="h-10 w-10" />
        </div>

        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-[#6B7280]">
          Fresh products directly from farmers, prepared for
          your next delivery.
        </p>

        {/* Error */}
        {error && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}{" "}
            {!user && (
              <Link
                to="/login?next=/cart"
                className="font-semibold underline"
              >
                Sign in
              </Link>
            )}
          </div>
        )}

        {/* Empty cart */}
        {items.length === 0 && !error && (
          <div className="mx-auto mt-10 max-w-xl rounded-[28px] border border-[#E5E7EB] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F3F8F4] text-3xl">
              🛒
            </div>

            <h2 className="mt-5 text-xl font-bold text-[#1F2937]">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#6B7280]">
              Explore fresh produce from local farmers and
              add something delicious to your cart.
            </p>

            <Link
              to="/shop"
              className="mt-6 inline-flex rounded-full bg-[#16823F] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#075B42]"
            >
              Browse fresh produce
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">

            {/* LEFT */}
            <div className="space-y-5">

              {/* Delivery information */}
              <div className="rounded-[24px] border border-[#DCE9DF] bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F5EC] text-xl">
                    🌿
                  </div>

                  <div>
                    <p className="font-bold text-[#1F2937]">
                      Farm-fresh delivery
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[#6B7280]">
                      Your products will be prepared and
                      delivered using the available delivery
                      options at checkout.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cart items */}
              <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#1F2937]">
                      Your products
                    </h2>
                    <p className="mt-1 text-xs text-[#6B7280]">
                      {items.length}{" "}
                      {items.length === 1 ? "product" : "products"}{" "}
                      · {formatWeight(totalQuantity, "kg")}
                    </p>
                  </div>

                  <span className="rounded-full bg-[#F3F8F4] px-3 py-1.5 text-xs font-bold text-[#16823F]">
                    Fresh picks
                  </span>
                </div>

                <div className="mt-5 divide-y divide-[#E5E7EB]">
                  {items.map((line) => {
                    const available =
                      line.product.inventory?.available ?? 0;

                    const minimum =
                      line.product.minQty || 0.25;

                    const canIncrease =
                      line.qty + 0.25 <= available;

                    const canDecrease =
                      line.qty - 0.25 >= minimum;

                    const busy =
                      updatingId === line.id;

                    return (
                      <div
                        key={line.id}
                        className="py-5 first:pt-0 last:pb-0"
                      >
                        <div className="flex gap-4">
                          {/* Image */}
                          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#F3F8F4] sm:h-28 sm:w-28">
                            {line.product.imageUrl ? (
                              <img
                                src={line.product.imageUrl}
                                alt={line.product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-[#6B7280]">
                                No image
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-bold text-[#1F2937]">
                                  {line.product.name}
                                </p>

                                <p className="mt-1 text-xs text-[#6B7280]">
                                  ₹
                                  {(
                                    line.product.pricePaise /
                                    100
                                  ).toFixed(2)}{" "}
                                  / {line.product.unit}
                                </p>

                                <p className="mt-1 text-xs font-medium text-[#16823F]">
                                  {line.product.farmer.farmName ||
                                    line.product.farmer.user?.name ||
                                    "Farm2Fork farmer"}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeItem(line)}
                                disabled={busy}
                                className="shrink-0 text-xs font-semibold text-[#9CA3AF] transition hover:text-rose-600 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                              {/* Quantity */}
                              <div className="flex items-center rounded-full border border-[#DCE9DF] bg-[#F8FBF8] p-1">
                                <button
                                  type="button"
                                  disabled={
                                    !canDecrease || busy
                                  }
                                  onClick={() =>
                                    updateQuantity(
                                      line,
                                      Math.round(
                                        (line.qty - 0.25) *
                                          100
                                      ) / 100
                                    )
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-[#075B42] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                                  aria-label={`Decrease ${line.product.name}`}
                                >
                                  −
                                </button>

                                <span className="min-w-[76px] text-center text-xs font-bold text-[#1F2937]">
                                  {formatWeight(
                                    line.qty,
                                    line.product.unit
                                  )}
                                </span>

                                <button
                                  type="button"
                                  disabled={
                                    !canIncrease || busy
                                  }
                                  onClick={() =>
                                    updateQuantity(
                                      line,
                                      Math.round(
                                        (line.qty + 0.25) *
                                          100
                                      ) / 100
                                    )
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-[#075B42] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                                  aria-label={`Increase ${line.product.name}`}
                                >
                                  +
                                </button>
                              </div>

                              {/* Price */}
                              <div className="text-right">
                                <p className="text-xs text-[#9CA3AF]">
                                  {formatWeight(
                                    available,
                                    line.product.unit
                                  )}{" "}
                                  available
                                </p>

                                <p className="mt-1 text-lg font-bold text-[#1F2937]">
                                  {rupees(
                                    line.qty *
                                      line.product.pricePaise
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Recommendations */}
              <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16823F]">
                      Fresh suggestions
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-[#1F2937]">
                      You might also like
                    </h2>
                  </div>

                  <Link
                    to="/shop"
                    className="text-xs font-bold text-[#16823F] hover:underline"
                  >
                    View all
                  </Link>
                </div>

                {recommendationLoading ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                      <div
                        key={item}
                        className="h-44 animate-pulse rounded-2xl bg-[#F3F8F4]"
                      />
                    ))}
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {recommendations.map((product) => (
                      <div
                        key={product.id}
                        className="group overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="aspect-[1.1] overflow-hidden bg-[#F3F8F4]">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-[#9CA3AF]">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="p-3">
                          <p className="truncate text-sm font-bold text-[#1F2937]">
                            {product.name}
                          </p>

                          <p className="mt-1 text-xs text-[#6B7280]">
                            ₹
                            {(product.pricePaise / 100).toFixed(
                              2
                            )}{" "}
                            / {product.unit}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              addRecommendation(product)
                            }
                            className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-[#E8F5EC] px-3 py-2 text-xs font-bold text-[#16823F] transition hover:bg-[#16823F] hover:text-white"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl bg-[#F3F8F4] p-4 text-sm text-[#6B7280]">
                    More fresh recommendations will appear
                    here as products become available.
                  </p>
                )}
              </section>
            </div>

            {/* RIGHT — BILL */}
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#1F2937]">
                  Bill details
                </h2>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7280]">
                      Items total
                    </span>
                    <span className="font-semibold text-[#1F2937]">
                      {rupees(total)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7280]">
                      Delivery charge
                    </span>
                    <span className="font-semibold text-[#6B7280]">
                      Calculated at checkout
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-[#6B7280]">
                      Handling charge
                    </span>
                    <span className="font-semibold text-[#6B7280]">
                      Calculated at checkout
                    </span>
                  </div>
                </div>

                <div className="my-5 border-t border-dashed border-[#D1D5DB]" />

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#6B7280]">
                      Grand total
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-[#075B42]">
                      {rupees(total)}
                    </p>
                  </div>

                  <span className="rounded-full bg-[#E8F5EC] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#16823F]">
                    Secure checkout
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/checkout")}
                  className="mt-6 flex w-full items-center justify-between rounded-2xl bg-[#16823F] px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#075B42] hover:shadow-md"
                >
                  <span>
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-white/70">
                      Total
                    </span>
                    {rupees(total)}
                  </span>

                  <span className="flex items-center gap-2">
                    Proceed to delivery
                    <span className="text-lg">→</span>
                  </span>
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-[#9CA3AF]">
                  Choose your delivery address and payment
                  method on the next step.
                </p>
              </div>
              <DeliveryTipCard />

              <FarmerSupportCard />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
