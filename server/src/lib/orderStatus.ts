import { LogisticsStatus, OrderStatus } from "@prisma/client";

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.COD_PENDING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
  ],
  [OrderStatus.COD_PENDING]: [
    OrderStatus.PAID,
    OrderStatus.ACCEPTED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.ACCEPTED,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
  ],
  [OrderStatus.ACCEPTED]: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PREPARING]: [
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.PICKED_UP,
  ],
  [OrderStatus.PICKED_UP]: [
    OrderStatus.IN_TRANSIT,
  ],
  [OrderStatus.IN_TRANSIT]: [
    OrderStatus.OUT_FOR_DELIVERY,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderStatus.DELIVERED,
  ],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [],
};

export const FARMER_STATUSES: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
];

export const LOGISTICS_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus
) {
  return (ORDER_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function assertOrderTransition(
  from: OrderStatus,
  to: OrderStatus
) {
  if (from === to) return;

  if (!canTransitionOrder(from, to)) {
    throw Object.assign(
      new Error(
        `Invalid order status transition: ${from} → ${to}`
      ),
      { code: 409 }
    );
  }
}

export function canCancelOrder(status: OrderStatus) {
  return (
    status === OrderStatus.DRAFT ||
    status === OrderStatus.PENDING_PAYMENT ||
    status === OrderStatus.COD_PENDING ||
    status === OrderStatus.PAID ||
    status === OrderStatus.ACCEPTED ||
    status === OrderStatus.PREPARING
  );
}

const PICKUP_OR_LATER: LogisticsStatus[] = [
  LogisticsStatus.PICKED_UP,
  LogisticsStatus.IN_TRANSIT,
  LogisticsStatus.OUT_FOR_DELIVERY,
  LogisticsStatus.DELIVERED,
];

/** DB bookings are the source of truth; order.status may lag. */
export function bookingBlocksConsumerCancel(
  bookings: { status: LogisticsStatus }[]
) {
  return bookings.some(
    (b) =>
      b.status !== LogisticsStatus.CANCELLED &&
      PICKUP_OR_LATER.includes(b.status)
  );
}

export const LOGISTICS_TRANSITIONS: Record<
  LogisticsStatus,
  LogisticsStatus[]
> = {
  [LogisticsStatus.CONFIRMED]: [
    LogisticsStatus.PICKUP_SCHEDULED,
    LogisticsStatus.FARMER_READY,
    LogisticsStatus.CANCELLED,
  ],
  [LogisticsStatus.PICKUP_SCHEDULED]: [
    LogisticsStatus.FARMER_READY,
    LogisticsStatus.CANCELLED,
  ],
  [LogisticsStatus.FARMER_READY]: [
    LogisticsStatus.PICKED_UP,
    LogisticsStatus.CANCELLED,
  ],
  [LogisticsStatus.PICKED_UP]: [
    LogisticsStatus.IN_TRANSIT,
  ],
  [LogisticsStatus.IN_TRANSIT]: [
    LogisticsStatus.OUT_FOR_DELIVERY,
  ],
  [LogisticsStatus.OUT_FOR_DELIVERY]: [
    LogisticsStatus.DELIVERED,
  ],
  [LogisticsStatus.DELIVERED]: [],
  [LogisticsStatus.CANCELLED]: [],
};

export function assertLogisticsTransition(
  from: LogisticsStatus,
  to: LogisticsStatus
) {
  if (from === to) return;

  if (!(LOGISTICS_TRANSITIONS[from] ?? []).includes(to)) {
    throw Object.assign(
      new Error(
        `Invalid logistics transition: ${from} → ${to}`
      ),
      { code: 409 }
    );
  }
}

export function advanceOrderAlongChain(
  current: OrderStatus,
  target: OrderStatus
): OrderStatus | null {
  const chain: OrderStatus[] = [
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.PICKED_UP,
    OrderStatus.IN_TRANSIT,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
  ];

  const targetIdx = chain.indexOf(target);

  if (targetIdx < 0) return null;

  let status = current;

  for (let i = 0; i <= targetIdx; i++) {
    const step = chain[i];

    if (canTransitionOrder(status, step)) {
      status = step;
    }
  }

  return status === current ? null : status;
}

export function orderStatusFromBookings(
  bookings: { status: LogisticsStatus }[],
  current: OrderStatus
): OrderStatus | null {
  /**
   * Logistics must not pay an unpaid ONLINE order,
   * and must not revive cancelled/failed/draft rows.
   */
  if (
    current === OrderStatus.PENDING_PAYMENT ||
    current === OrderStatus.DRAFT ||
    current === OrderStatus.FAILED ||
    current === OrderStatus.CANCELLED
  ) {
    return null;
  }

  const active = bookings.filter(
    (b) => b.status !== LogisticsStatus.CANCELLED
  );

  if (!active.length) return null;

  if (
    active.every(
      (b) => b.status === LogisticsStatus.DELIVERED
    )
  ) {
    return advanceOrderAlongChain(
      current,
      OrderStatus.DELIVERED
    );
  }

  const rank: Record<string, number> = {
    CONFIRMED: 0,
    PICKUP_SCHEDULED: 1,
    FARMER_READY: 2,
    PICKED_UP: 3,
    IN_TRANSIT: 4,
    OUT_FOR_DELIVERY: 5,
    DELIVERED: 6,
  };

  const min = Math.min(
    ...active.map((b) => rank[b.status] ?? 0)
  );

  const mapped: Record<number, OrderStatus> = {
    2: OrderStatus.READY_FOR_PICKUP,
    3: OrderStatus.PICKED_UP,
    4: OrderStatus.IN_TRANSIT,
    5: OrderStatus.OUT_FOR_DELIVERY,
  };

  const next = mapped[min];

  if (!next) return null;

  return advanceOrderAlongChain(current, next);
}

export function groupQtyByFarmer(
  items: { farmerId: string; qty: number }[]
) {
  const map = new Map<string, number>();

  for (const item of items) {
    map.set(
      item.farmerId,
      (map.get(item.farmerId) || 0) + item.qty
    );
  }

  return [...map.entries()].map(
    ([farmerId, qty]) => ({
      farmerId,
      qty,
    })
  );
}

/**
 * Farmer-specific fulfillment status.
 *
 * This is separate from the global OrderStatus because
 * one consumer order may contain products from multiple farmers.
 */
export const FARMER_ORDER_TRANSITIONS: Record<
  string,
  string[]
> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertFarmerOrderTransition(
  from: string,
  to: string
) {
  if (from === to) return;

  if (
    !(FARMER_ORDER_TRANSITIONS[from] ?? []).includes(to)
  ) {
    throw Object.assign(
      new Error(
        `Invalid farmer order status transition: ${from} → ${to}`
      ),
      { code: 409 }
    );
  }
}
