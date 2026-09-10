import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  IndianRupee,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { api } from "../../services/api";

type PaymentRecord = {
  id: string;
  orderId: string;
  provider: string;
  providerOrder: string | null;
  providerPayId: string | null;
  amountPaise: number;
  currency: string;
  method: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;

  order: {
    id: string;
    status: string;
    paymentMethod: string;
    totalPaise: number;
    platformFeePaise: number;
    logisticsPaise: number;
    createdAt: string;

    consumer: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
  };
};

type PaymentResponse = {
  summary: {
    totalRecords: number;
    capturedCount: number;
    capturedPaise: number;
    createdCount: number;
    createdPaise: number;
    authorizedCount: number;
    authorizedPaise: number;
    failedCount: number;
    failedPaise: number;
    refundedCount: number;
    refundedPaise: number;
  };

  payments: PaymentRecord[];
};
  

const statusLabels: Record<string, string> = {
  CREATED: "Created",
  AUTHORIZED: "Authorized",
  CAPTURED: "Captured",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

function money(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusTone(status: string) {
  switch (status) {
    case "CAPTURED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "AUTHORIZED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "CREATED":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";

    case "REFUNDED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function paymentMethodLabel(method: string | null) {
  if (!method) return "Not recorded";

  const normalized = method.toLowerCase();

  if (normalized === "upi") return "UPI";
  if (normalized === "card") return "Card";
  if (normalized === "netbanking") return "Net banking";
  if (normalized === "wallet") return "Wallet";
  if (normalized === "cod") return "Cash on delivery";

  return method;
}

export function AdminPayments() {
  const [data, setData] = useState<PaymentResponse | null>(null);
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentRecord | null>(null);

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await api<PaymentResponse>("/api/admin/payments");

      setData(result);

      setSelectedPayment((current) => {
        if (!current) {
          return result.payments[0] ?? null;
        }

        return (
          result.payments.find((payment) => payment.id === current.id) ??
          result.payments[0] ??
          null
        );
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payment data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPayments = useMemo(() => {
    if (!data) return [];

    const query = search.trim().toLowerCase();

    return data.payments.filter((payment) => {
      const matchesStatus =
        filter === "ALL" || payment.status === filter;

      if (!matchesStatus) return false;

      if (!query) return true;

      const searchable = [
        payment.id,
        payment.orderId,
        payment.provider,
        payment.providerOrder ?? "",
        payment.providerPayId ?? "",
        payment.method ?? "",
        payment.status,
        payment.order.consumer.name,
        payment.order.consumer.email,
        payment.order.consumer.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [data, filter, search]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <RefreshCw className="animate-spin" size={18} />
          Loading payment records…
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <div className="flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />

          <div>
            <div className="font-bold">Could not load payments</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
        </div>

        <button
          onClick={() => void load()}
          className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const cards = [
  {
    label: "Payment records",
    value: data.summary.totalRecords.toLocaleString("en-IN"),
    detail: "All recorded consumer payments",
    icon: CreditCard,
    iconClass: "bg-blue-50 text-blue-600",
  },
  {
    label: "Captured",
    value: money(data.summary.capturedPaise),
    detail: `${data.summary.capturedCount} captured payment${
      data.summary.capturedCount === 1 ? "" : "s"
    }`,
    icon: CheckCircle2,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Authorized",
    value: money(data.summary.authorizedPaise),
    detail: `${data.summary.authorizedCount} awaiting capture`,
    icon: ShieldCheck,
    iconClass: "bg-cyan-50 text-cyan-700",
  },
  {
    label: "Created",
    value: money(data.summary.createdPaise),
    detail: `${data.summary.createdCount} initiated payment${
      data.summary.createdCount === 1 ? "" : "s"
    }`,
    icon: Clock3,
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    label: "Failed",
    value: data.summary.failedCount.toLocaleString("en-IN"),
    detail: `${money(data.summary.failedPaise)} attempted`,
    icon: XCircle,
    iconClass: "bg-red-50 text-red-600",
  },
  {
    label: "Refunded",
    value: money(data.summary.refundedPaise),
    detail: `${data.summary.refundedCount} refund record${
      data.summary.refundedCount === 1 ? "" : "s"
    }`,
    icon: RotateCcw,
    iconClass: "bg-orange-50 text-orange-600",
  },
];
    
    

  const filters = [
  ["ALL", "All", data.summary.totalRecords],
  ["CAPTURED", "Captured", data.summary.capturedCount],
  ["AUTHORIZED", "Authorized", data.summary.authorizedCount],
  ["CREATED", "Created", data.summary.createdCount],
  ["FAILED", "Failed", data.summary.failedCount],
  ["REFUNDED", "Refunded", data.summary.refundedCount],
] as const;

  return (
    <div className="space-y-7 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-600">
            <Banknote size={17} />
            Financial operations
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Payments
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review consumer payment records and their actual provider status.
            Values shown here are read from Farm2Fork payment records.
          </p>
        </div>

        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-500">
                    {card.label}
                  </div>

                  <div className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950">
                    {card.value}
                  </div>

                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {card.detail}
                  </div>
                </div>

                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
                >
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map(([value, label, count]) => {
              const active = filter === value;

              return (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                  <span
                    className={`ml-2 ${
                      active ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full xl:w-80">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, consumer, payment ID…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="font-bold text-slate-900">
              Payment transactions
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {filteredPayments.length.toLocaleString("en-IN")} matching
              record{filteredPayments.length === 1 ? "" : "s"}
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <CreditCard size={30} className="text-slate-300" />

              <div className="mt-3 font-bold text-slate-700">
                No payment records found
              </div>

              <div className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                No database payment records match the current filters.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPayments.map((payment) => {
                const selected = selectedPayment?.id === payment.id;

                return (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() => setSelectedPayment(payment)}
                    className={`grid w-full gap-4 px-5 py-4 text-left transition md:grid-cols-[minmax(0,1.3fr)_minmax(120px,0.65fr)_minmax(120px,0.6fr)] md:items-center ${
                      selected
                        ? "bg-blue-50/70"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate font-bold text-slate-900">
                          {payment.order.consumer.name}
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusTone(
                            payment.status,
                          )}`}
                        >
                          {statusLabels[payment.status] ?? payment.status}
                        </span>
                      </div>

                      <div className="mt-1 truncate text-xs text-slate-500">
                        Order {payment.orderId}
                      </div>

                      <div className="mt-1 truncate text-xs text-slate-400">
                        {payment.order.consumer.email}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Method
                      </div>

                      <div className="mt-1 text-sm font-bold text-slate-700">
                        {paymentMethodLabel(
                          payment.method ?? payment.order.paymentMethod,
                        )}
                      </div>
                    </div>

                    <div className="md:text-right">
                      <div className="text-base font-black text-slate-950">
                        {money(payment.amountPaise)}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {formatDate(payment.createdAt)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          {selectedPayment ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      Payment details
                    </div>

                    <div className="mt-1 font-black text-slate-900">
                      {money(selectedPayment.amountPaise)}
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusTone(
                      selectedPayment.status,
                    )}`}
                  >
                    {statusLabels[selectedPayment.status] ??
                      selectedPayment.status}
                  </span>
                </div>
              </div>

              <div className="space-y-6 p-5">
                <section>
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                    <CreditCard size={16} className="text-blue-600" />
                    Transaction
                  </div>

                  <div className="space-y-3 text-sm">
                    <DetailRow
                      label="Payment ID"
                      value={selectedPayment.id}
                    />

                    <DetailRow
                      label="Provider"
                      value={selectedPayment.provider || "—"}
                    />

                    <DetailRow
                      label="Provider order"
                      value={selectedPayment.providerOrder || "—"}
                    />

                    <DetailRow
                      label="Provider payment"
                      value={selectedPayment.providerPayId || "—"}
                    />

                    <DetailRow
                      label="Method"
                      value={paymentMethodLabel(
                        selectedPayment.method ??
                          selectedPayment.order.paymentMethod,
                      )}
                    />

                    <DetailRow
                      label="Created"
                      value={formatDate(selectedPayment.createdAt)}
                    />

                    <DetailRow
                      label="Last updated"
                      value={formatDate(selectedPayment.updatedAt)}
                    />
                  </div>
                </section>

                <div className="border-t border-slate-100" />

                <section>
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
                    <IndianRupee size={16} className="text-orange-600" />
                    Order amounts
                  </div>

                  <div className="space-y-3 text-sm">
                    <DetailRow
                      label="Order total"
                      value={money(selectedPayment.order.totalPaise)}
                    />

                    <DetailRow
                      label="Platform fee"
                      value={money(
                        selectedPayment.order.platformFeePaise,
                      )}
                    />

                    <DetailRow
                      label="Logistics charge"
                      value={money(
                        selectedPayment.order.logisticsPaise,
                      )}
                    />

                    <DetailRow
                      label="Payment amount"
                      value={money(selectedPayment.amountPaise)}
                      strong
                    />
                  </div>
                </section>

                <div className="border-t border-slate-100" />

                <section>
                  <div className="mb-3 text-sm font-black text-slate-900">
                    Consumer & order
                  </div>

                  <div className="space-y-3 text-sm">
                    <DetailRow
                      label="Consumer"
                      value={selectedPayment.order.consumer.name}
                    />

                    <DetailRow
                      label="Email"
                      value={selectedPayment.order.consumer.email}
                    />

                    <DetailRow
                      label="Phone"
                      value={
                        selectedPayment.order.consumer.phone ||
                        "Not provided"
                      }
                    />

                    <DetailRow
                      label="Order ID"
                      value={selectedPayment.order.id}
                    />

                    <DetailRow
                      label="Order status"
                      value={selectedPayment.order.status}
                    />
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <CreditCard
                size={30}
                className="mx-auto text-slate-300"
              />

              <div className="mt-3 font-bold text-slate-700">
                Select a payment
              </div>

              <div className="mt-1 text-sm leading-6 text-slate-500">
                Choose a payment record to inspect its database details.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <span className="shrink-0 text-slate-500">{label}</span>

      <span
        className={`min-w-0 break-all text-right ${
          strong
            ? "font-black text-slate-950"
            : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
