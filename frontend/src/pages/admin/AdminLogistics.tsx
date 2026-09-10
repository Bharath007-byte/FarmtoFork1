import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  UserRound,
} from "lucide-react";
import { api } from "../../services/api";

type LogisticsJob = {
  id: string;
  orderId: string | null;
  status: string;
  fulfillmentChannel: string;
  quantity: number;
  vehicle: string;
  pickup: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  farmerReadyAt: string | null;
  pickedUpAt: string | null;
  inTransitAt: string | null;
  deliveredAt: string | null;

  location: {
    lat: number | null;
    lng: number | null;
    updatedAt: string | null;
  };

  farmer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    photoUrl: string | null;
    farmName: string;
    district: string;
    state: string;
  };

  society: {
    id: string;
    name: string;
    code: string;
    address: string;
    village: string | null;
    district: string;
    state: string;
    pinCode: string;
    lat: number | null;
    lng: number | null;
  } | null;

  assignedLogistics: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    photoUrl: string | null;
    deliveryType: string | null;
    vehicleNumber: string | null;
  } | null;

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
  } | null;
};

type LogisticsResponse = {
  summary: {
    totalJobs: number;
    activeJobs: number;
    totalQuantity: number;
    orderValuePaise: number;
    logisticsRevenuePaise: number;
    jobsWithLocation: number;
  };
  statusCounts: {
    confirmed: number;
    pickupScheduled: number;
    farmerReady: number;
    pickedUp: number;
    inTransit: number;
    outForDelivery: number;
    delivered: number;
  };
  jobs: LogisticsJob[];
};

const statusLabels: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PICKUP_SCHEDULED: "Pickup scheduled",
  FARMER_READY: "Farmer ready",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function money(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
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
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
    case "PICKED_UP":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "FARMER_READY":
    case "PICKUP_SCHEDULED":
      return "bg-amber-50 text-amber-700 border-amber-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

export function AdminLogistics() {
  const [data, setData] = useState<LogisticsResponse | null>(null);
  const [selectedJob, setSelectedJob] = useState<LogisticsJob | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await api<LogisticsResponse>("/api/admin/logistics");
      setData(result);

      setSelectedJob((current) => {
        if (!current) return result.jobs[0] ?? null;

        return (
          result.jobs.find((job) => job.id === current.id) ??
          result.jobs[0] ??
          null
        );
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load logistics data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredJobs = useMemo(() => {
    if (!data) return [];

    if (filter === "ALL") {
      return data.jobs;
    }

    return data.jobs.filter((job) => job.status === filter);
  }, [data, filter]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <RefreshCw className="animate-spin" size={18} />
          Loading logistics data…
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
            <div className="font-bold">Could not load logistics</div>
            <div className="mt-1 text-sm">{error}</div>
          </div>
        </div>

        <button
          onClick={() => void load()}
          className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      label: "Total jobs",
      value: data.summary.totalJobs,
      detail: "All non-cancelled logistics records",
      icon: Truck,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      label: "Active jobs",
      value: data.summary.activeJobs,
      detail: "Not delivered or cancelled",
      icon: Activity,
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      label: "Quantity moving",
      value: `${data.summary.totalQuantity.toLocaleString("en-IN")} kg`,
      detail: "Quantity across logistics records",
      icon: Package,
      iconClass: "bg-cyan-50 text-cyan-600",
    },
    {
      label: "Order value",
      value: money(data.summary.orderValuePaise),
      detail: "Linked consumer orders",
      icon: CheckCircle2,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Logistics charges",
      value: money(data.summary.logisticsRevenuePaise),
      detail: "Charges recorded on linked orders",
      icon: Clock3,
      iconClass: "bg-orange-50 text-orange-600",
    },
    {
      label: "GPS available",
      value: data.summary.jobsWithLocation,
      detail: "Jobs with real location telemetry",
      icon: MapPin,
      iconClass: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
            Operations
          </div>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Logistics control
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor real pickup and delivery jobs, assigned workers,
            order values and available GPS telemetry.
          </p>
        </div>

        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}
              >
                <Icon size={19} />
              </div>

              <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {card.label}
              </div>

              <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                {card.value}
              </div>

              <div className="mt-1 text-xs leading-5 text-slate-500">
                {card.detail}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status overview */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Delivery pipeline
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current status of logistics records in PostgreSQL.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filter === "ALL"}
              onClick={() => setFilter("ALL")}
            >
              All
            </FilterButton>

            <FilterButton
              active={filter === "FARMER_READY"}
              onClick={() => setFilter("FARMER_READY")}
            >
              Farmer ready
            </FilterButton>

            <FilterButton
              active={filter === "PICKED_UP"}
              onClick={() => setFilter("PICKED_UP")}
            >
              Picked up
            </FilterButton>

            <FilterButton
              active={filter === "IN_TRANSIT"}
              onClick={() => setFilter("IN_TRANSIT")}
            >
              In transit
            </FilterButton>

            <FilterButton
              active={filter === "OUT_FOR_DELIVERY"}
              onClick={() => setFilter("OUT_FOR_DELIVERY")}
            >
              Out for delivery
            </FilterButton>

            <FilterButton
              active={filter === "DELIVERED"}
              onClick={() => setFilter("DELIVERED")}
            >
              Delivered
            </FilterButton>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Pipeline label="Confirmed" value={data.statusCounts.confirmed} />
          <Pipeline
            label="Pickup scheduled"
            value={data.statusCounts.pickupScheduled}
          />
          <Pipeline
            label="Farmer ready"
            value={data.statusCounts.farmerReady}
          />
          <Pipeline label="Picked up" value={data.statusCounts.pickedUp} />
          <Pipeline
            label="In transit"
            value={data.statusCounts.inTransit}
          />
          <Pipeline
            label="Out for delivery"
            value={data.statusCounts.outForDelivery}
          />
          <Pipeline label="Delivered" value={data.statusCounts.delivered} />
        </div>
      </section>

      {/* Main workspace */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        {/* Jobs */}
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Logistics jobs
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredJobs.length} record
                  {filteredJobs.length === 1 ? "" : "s"}
                </p>
              </div>

              {loading && (
                <RefreshCw
                  size={17}
                  className="animate-spin text-slate-400"
                />
              )}
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Truck
                size={32}
                className="mx-auto text-slate-300"
              />

              <div className="mt-3 font-bold text-slate-700">
                No logistics jobs
              </div>

              <p className="mt-1 text-sm text-slate-400">
                No database records match this filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={[
                    "block w-full px-5 py-5 text-left transition",
                    selectedJob?.id === job.id
                      ? "bg-slate-50"
                      : "hover:bg-slate-50/70",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-950">
                          Job #{job.id.slice(-8)}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(job.status)}`}
                        >
                          {statusLabels[job.status] || job.status}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {job.fulfillmentChannel === "SOCIETY"
                            ? "Society"
                            : "Direct farmer"}
                        </span>
                      </div>

                      <div className="mt-2 truncate text-sm font-semibold text-slate-700">
                        {job.pickup}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>{job.farmer.farmName}</span>
                        <span>{job.quantity} kg</span>
                        {job.orderId && (
                          <span>Order #{job.orderId.slice(-8)}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-left lg:text-right">
                      <div className="text-sm font-bold text-slate-950">
                        {job.order
                          ? money(job.order.totalPaise)
                          : "No linked order"}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {formatDate(job.createdAt)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Detail */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          {!selectedJob ? (
            <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
              <div>
                <Truck
                  size={34}
                  className="mx-auto text-slate-300"
                />
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Select a logistics job
                </p>
              </div>
            </div>
          ) : (
            <JobDetails job={selectedJob} />
          )}
        </section>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-lg border px-3 py-2 text-xs font-bold transition",
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Pipeline({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

function JobDetails({ job }: { job: LogisticsJob }) {
  return (
    <div>
      <div className="border-b border-slate-100 p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
          Job details
        </div>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          #{job.id.slice(-8)}
        </h2>

        <span
          className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(job.status)}`}
        >
          {statusLabels[job.status] || job.status}
        </span>
      </div>

      <div className="space-y-6 p-5">
        <DetailBlock title="Pickup">
          <div className="flex gap-3">
            <div className="mt-0.5 text-blue-600">
              <MapPin size={18} />
            </div>

            <div>
              <div className="font-semibold text-slate-800">
                {job.pickup}
              </div>

              {job.society ? (
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {job.society.name}
                  <br />
                  {job.society.address}, {job.society.district}
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-500">
                  Direct farmer pickup
                </div>
              )}
            </div>
          </div>
        </DetailBlock>

        <DetailBlock title="Farmer">
          <div className="flex items-center gap-3">
            {job.farmer.photoUrl ? (
              <img
                src={job.farmer.photoUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <UserRound size={18} />
              </div>
            )}

            <div>
              <div className="font-semibold text-slate-800">
                {job.farmer.name}
              </div>
              <div className="text-xs text-slate-500">
                {job.farmer.farmName}
              </div>
              <div className="text-xs text-slate-400">
                {job.farmer.district}, {job.farmer.state}
              </div>
            </div>
          </div>
        </DetailBlock>

        <DetailBlock title="Assigned logistics worker">
          {job.assignedLogistics ? (
            <div className="flex items-center gap-3">
              {job.assignedLogistics.photoUrl ? (
                <img
                  src={job.assignedLogistics.photoUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Truck size={18} />
                </div>
              )}

              <div>
                <div className="font-semibold text-slate-800">
                  {job.assignedLogistics.name}
                </div>

                <div className="text-xs text-slate-500">
                  {job.assignedLogistics.deliveryType || "Vehicle not specified"}
                </div>

                <div className="text-xs text-slate-400">
                  {job.assignedLogistics.vehicleNumber ||
                    "Vehicle number unavailable"}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              No logistics worker is currently assigned.
            </div>
          )}
        </DetailBlock>

        <DetailBlock title="Order">
          {job.order ? (
            <div className="space-y-2 text-sm">
              <Row label="Consumer" value={job.order.consumer.name} />
              <Row label="Payment" value={job.order.paymentMethod} />
              <Row label="Order status" value={job.order.status} />
              <Row label="Order value" value={money(job.order.totalPaise)} />
              <Row
                label="Logistics charge"
                value={money(job.order.logisticsPaise)}
              />
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              This logistics record has no linked consumer order.
            </div>
          )}
        </DetailBlock>

        <DetailBlock title="Tracking">
          {job.location.lat != null && job.location.lng != null ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <MapPin size={17} />
                Real GPS telemetry available
              </div>

              <div className="mt-2 text-xs text-emerald-700">
                Latitude: {job.location.lat}
                <br />
                Longitude: {job.location.lng}
              </div>

              <div className="mt-2 text-[11px] text-emerald-600">
                Updated {formatDate(job.location.updatedAt)}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <MapPin size={17} />
                GPS unavailable
              </div>

              <div className="mt-1 text-xs leading-5 text-slate-400">
                No live location has been recorded for this job. The system
                does not simulate a vehicle location.
              </div>
            </div>
          )}
        </DetailBlock>

        <DetailBlock title="Timeline">
          <div className="space-y-3">
            <TimelineRow
              label="Accepted"
              value={job.acceptedAt}
            />
            <TimelineRow
              label="Farmer ready"
              value={job.farmerReadyAt}
            />
            <TimelineRow
              label="Picked up"
              value={job.pickedUpAt}
            />
            <TimelineRow
              label="In transit"
              value={job.inTransitAt}
            />
            <TimelineRow
              label="Delivered"
              value={job.deliveredAt}
            />
          </div>
        </DetailBlock>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Quantity
          </div>

          <div className="mt-1 text-2xl font-bold text-slate-950">
            {job.quantity} kg
          </div>

          <div className="mt-1 text-xs text-slate-400">
            Vehicle: {job.vehicle || "Not specified"}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-semibold text-slate-700">
        {value}
      </span>
    </div>
  );
}

function TimelineRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-slate-600">{label}</span>

      <span
        className={[
          "text-xs font-semibold",
          value ? "text-emerald-600" : "text-slate-300",
        ].join(" ")}
      >
        {value ? formatDate(value) : "Not reached"}
      </span>
    </div>
  );
}
