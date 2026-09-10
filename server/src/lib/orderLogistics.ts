import {
  FulfillmentChannel,
  LogisticsStatus,
  type Prisma,
} from "@prisma/client";
import { pickOpenDeliverySlot } from "./deliverySlots.js";

type Tx = Prisma.TransactionClient;

type FulfillmentItem = {
  id?: string;
  productId: string;
  farmerId: string;
  qty: number;
  fulfillmentChannel?: FulfillmentChannel;
};

type AddressLocation = {
  latitude: number | null;
  longitude: number | null;
  district: string;
  state: string;
  pinCode: string;
};

/**
 * Calculate approximate distance between two coordinates.
 * Returns kilometres.
 */
function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadiusKm = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

/**
 * Find the nearest cooperative society that has
 * enough stock for the requested product.
 *
 * Location priority:
 * 1. Coordinates
 * 2. PIN code
 * 3. District
 * 4. State
 */
async function findSocietyWithStock(
  tx: Tx,
  input: {
    productId: string;
    quantity: number;
    address: AddressLocation;
  },
) {
  const societies = await tx.cooperativeSociety.findMany({
    where: {
      active: true,
      inventory: {
        some: {
          productId: input.productId,
          available: {
            gte: input.quantity,
          },
        },
      },
    },
    include: {
      inventory: {
        where: {
          productId: input.productId,
        },
      },
    },
  });

  if (!societies.length) {
    return null;
  }

  const scored = societies.map((society) => {
    const inventory = society.inventory[0];

    let score = Number.POSITIVE_INFINITY;

    if (
      input.address.latitude != null &&
      input.address.longitude != null &&
      society.lat != null &&
      society.lng != null
    ) {
      score = distanceKm(
        input.address.latitude,
        input.address.longitude,
        society.lat,
        society.lng,
      );
    } else if (
      society.pinCode === input.address.pinCode
    ) {
      score = 1;
    } else if (
      society.district.toLowerCase() ===
      input.address.district.toLowerCase()
    ) {
      score = 10;
    } else if (
      society.state.toLowerCase() ===
      input.address.state.toLowerCase()
    ) {
      score = 100;
    }

    return {
      society,
      inventory,
      score,
    };
  });

  scored.sort((a, b) => a.score - b.score);

  return scored[0] ?? null;
}

/**
 * Reserve society inventory atomically.
 */
async function reserveSocietyInventory(
  tx: Tx,
  societyId: string,
  productId: string,
  quantity: number,
) {
  const updated = await tx.societyInventory.updateMany({
    where: {
      societyId,
      productId,
      available: {
        gte: quantity,
      },
    },
    data: {
      available: {
        decrement: quantity,
      },
      reserved: {
        increment: quantity,
      },
    },
  });

  if (updated.count !== 1) {
    throw Object.assign(
      new Error(
        "Society inventory changed while processing the order.",
      ),
      { code: 409 },
    );
  }
}

/**
 * Move an existing farmer reservation back into
 * available stock when the order is fulfilled by society.
 */
async function releaseFarmerReservation(
  tx: Tx,
  productId: string,
  quantity: number,
) {
  const updated = await tx.inventory.updateMany({
    where: {
      productId,
      reserved: {
        gte: quantity,
      },
    },
    data: {
      reserved: {
        decrement: quantity,
      },
      available: {
        increment: quantity,
      },
    },
  });

  if (updated.count !== 1) {
    throw Object.assign(
      new Error(
        `Farmer inventory reservation missing for ${productId}`,
      ),
      { code: 409 },
    );
  }
}

/**
 * Resolve the fulfillment channel for an order.
 *
 * <50kg → SOCIETY only
 * ≥50kg → honor preferredChannel / persisted OrderItem channel
 */
function resolveFulfillmentChannel(
  totalQuantity: number,
  preferredChannel: FulfillmentChannel | undefined,
  persistedChannel: FulfillmentChannel | undefined,
): FulfillmentChannel {
  if (totalQuantity < 50) {
    return FulfillmentChannel.SOCIETY;
  }

  if (
    preferredChannel === FulfillmentChannel.SOCIETY ||
    preferredChannel === FulfillmentChannel.DIRECT_FARMER
  ) {
    return preferredChannel;
  }

  if (
    persistedChannel === FulfillmentChannel.SOCIETY ||
    persistedChannel === FulfillmentChannel.DIRECT_FARMER
  ) {
    return persistedChannel;
  }

  return FulfillmentChannel.SOCIETY;
}

/**
 * Fulfill a paid/COD order and create logistics bookings.
 *
 * Society fulfillment:
 *
 * Consumer
 *   ↓
 * nearest society with stock
 *   ↓
 * society inventory reserved
 *   ↓
 * logistics booking CONFIRMED
 *
 * No farmer acceptance is required.
 *
 * Direct farmer fulfillment:
 *
 * Consumer
 *   ↓
 * farmer inventory
 *   ↓
 * FarmerOrder / farmer preparation
 *   ↓
 * logistics after FARMER_READY
 */
export async function ensureOrderLogisticsBookings(
  tx: Tx,
  input: {
    orderId: string;
    consumerUserId: string;
    items: FulfillmentItem[];
    vehicle?: string;
    preferredChannel?: FulfillmentChannel;
  },
) {
  const order = await tx.order.findUnique({
    where: {
      id: input.orderId,
    },
    include: {
      address: true,
      items: true,
    },
  });

  if (!order) {
    throw Object.assign(
      new Error("Order not found for logistics fulfillment"),
      { code: 404 },
    );
  }

  if (!order.address) {
    throw Object.assign(
      new Error("Delivery address missing for logistics fulfillment"),
      { code: 409 },
    );
  }

  /**
   * Always operate on the exact OrderItem rows for this order.
   * Prefer matching by OrderItem id when callers pass them.
   */
  const orderItems = order.items;
  if (!orderItems.length) {
    throw Object.assign(
      new Error("Order has no items for logistics fulfillment"),
      { code: 409 },
    );
  }

  const totalQuantity = orderItems.reduce(
    (sum, item) => sum + item.qty,
    0,
  );

  const channel = resolveFulfillmentChannel(
    totalQuantity,
    input.preferredChannel,
    orderItems[0]?.fulfillmentChannel,
  );

  for (const orderItem of orderItems) {
    if (channel === FulfillmentChannel.SOCIETY) {
      /**
       * Idempotent: this line was already assigned to a society
       * in a prior successful call. Do not re-reserve stock.
       */
      if (
        orderItem.fulfillmentChannel === FulfillmentChannel.SOCIETY &&
        orderItem.societyId
      ) {
        continue;
      }

      const society = await findSocietyWithStock(tx, {
        productId: orderItem.productId,
        quantity: orderItem.qty,
        address: {
          latitude: order.address.latitude,
          longitude: order.address.longitude,
          district: order.address.district,
          state: order.address.state,
          pinCode: order.address.pinCode,
        },
      });

      if (!society) {
        throw Object.assign(
          new Error(
            "No cooperative society has enough stock for this order item.",
          ),
          { code: 409 },
        );
      }

      await reserveSocietyInventory(
        tx,
        society.society.id,
        orderItem.productId,
        orderItem.qty,
      );

      /**
       * The order initially reserves farmer inventory.
       * Release that reservation because the parcel is now
       * being fulfilled from society stock.
       */
      await releaseFarmerReservation(
        tx,
        orderItem.productId,
        orderItem.qty,
      );

      await tx.orderItem.update({
        where: {
          id: orderItem.id,
        },
        data: {
          fulfillmentChannel: FulfillmentChannel.SOCIETY,
          societyId: society.society.id,
        },
      });

      const slot = await pickOpenDeliverySlot(tx);

      if (!slot) {
        throw Object.assign(
          new Error("No upcoming delivery slots with capacity"),
          { code: 409 },
        );
      }

      const reservedSlot = await tx.deliverySlot.updateMany({
        where: {
          id: slot.id,
          booked: { lt: slot.capacity },
        },
        data: { booked: { increment: 1 } },
      });

      if (reservedSlot.count !== 1) {
        throw Object.assign(
          new Error("Delivery slot filled while creating logistics job"),
          { code: 409 },
        );
      }

      await tx.logisticsBooking.create({
        data: {
          farmerId: orderItem.farmerId,
          userId: input.consumerUserId,
          orderId: input.orderId,
          fulfillmentChannel: FulfillmentChannel.SOCIETY,
          societyId: society.society.id,
          slotId: slot.id,
          pickup: society.society.address,
          quantity: orderItem.qty,
          vehicle: input.vehicle || "mini-truck",
          status: LogisticsStatus.CONFIRMED,
        },
      });

      continue;
    }

    /**
     * DIRECT_FARMER — only when total quantity ≥ 50kg and
     * the consumer selected this channel. Keep farmer reservation.
     * Do not create a logistics booking yet.
     */
    const farmer = await tx.farmerProfile.findUnique({
      where: {
        id: orderItem.farmerId,
      },
    });

    if (!farmer) {
      throw Object.assign(
        new Error("Farmer profile missing for direct fulfillment"),
        { code: 409 },
      );
    }

    if (
      orderItem.fulfillmentChannel !== FulfillmentChannel.DIRECT_FARMER ||
      orderItem.societyId !== null
    ) {
      await tx.orderItem.update({
        where: {
          id: orderItem.id,
        },
        data: {
          fulfillmentChannel: FulfillmentChannel.DIRECT_FARMER,
          societyId: null,
        },
      });
    }

    const existingFarmerOrder = await tx.farmerOrder.findUnique({
      where: {
        orderId_farmerId: {
          orderId: input.orderId,
          farmerId: orderItem.farmerId,
        },
      },
    });

    if (!existingFarmerOrder) {
      await tx.farmerOrder.create({
        data: {
          orderId: input.orderId,
          farmerId: orderItem.farmerId,
          status: "PENDING",
        },
      });
    }
  }

  if (channel === FulfillmentChannel.DIRECT_FARMER) {
    return [];
  }

  const bookings = await tx.logisticsBooking.findMany({
    where: {
      orderId: input.orderId,
      fulfillmentChannel: FulfillmentChannel.SOCIETY,
      status: {
        not: LogisticsStatus.CANCELLED,
      },
    },
    select: { id: true },
  });

  return bookings.map((booking) => booking.id);
}

/**
 * Release farmer inventory after cancellation/delivery.
 */
export async function releaseInventoryForOrder(
  tx: Tx,
  items: {
    productId: string;
    qty: number;
    fulfillmentChannel?: FulfillmentChannel;
    societyId?: string | null;
  }[],
  mode: "cancel" | "deliver",
) {
  for (const item of items) {
    if (
      item.fulfillmentChannel ===
        FulfillmentChannel.SOCIETY &&
      item.societyId
    ) {
      const updated =
        await tx.societyInventory.updateMany({
          where: {
            societyId: item.societyId,
            productId: item.productId,
            reserved: {
              gte: item.qty,
            },
          },
          data:
            mode === "deliver"
              ? {
                  reserved: {
                    decrement: item.qty,
                  },
                  sold: {
                    increment: item.qty,
                  },
                }
              : {
                  reserved: {
                    decrement: item.qty,
                  },
                  available: {
                    increment: item.qty,
                  },
                },
        });

      if (updated.count === 1) {
        continue;
      }

      if (mode === "deliver") {
        continue;
      }

      throw Object.assign(
        new Error(
          `Society inventory reservation missing for ${item.productId}`,
        ),
        { code: 409 },
      );
    }

    const updated =
      await tx.inventory.updateMany({
        where: {
          productId: item.productId,
          reserved: {
            gte: item.qty,
          },
        },
        data:
          mode === "deliver"
            ? {
                reserved: {
                  decrement: item.qty,
                },
                sold: {
                  increment: item.qty,
                },
              }
            : {
                reserved: {
                  decrement: item.qty,
                },
                available: {
                  increment: item.qty,
                },
            },
      });

    if (updated.count === 1) continue;

    if (mode === "deliver") {
      continue;
    }

    throw Object.assign(
      new Error(
        `Inventory reservation missing for ${item.productId}`,
      ),
      { code: 409 },
    );
  }
}

/**
 * Create/use a DIRECT_FARMER logistics booking once the farmer
 * marks the order ready for pickup.
 *
 * Idempotent against existing DIRECT_FARMER bookings only —
 * a SOCIETY booking for the same order+farmer must not block
 * or satisfy this helper.
 */
export async function ensureFarmerLogisticsBooking(
  tx: Tx,
  input: {
    orderId: string;
    consumerUserId: string;
    farmerId: string;
    vehicle?: string;
  },
) {
  const existing = await tx.logisticsBooking.findFirst({
    where: {
      orderId: input.orderId,
      farmerId: input.farmerId,
      fulfillmentChannel: FulfillmentChannel.DIRECT_FARMER,
      status: {
        not: LogisticsStatus.CANCELLED,
      },
    },
  });

  if (existing) {
    return existing;
  }

  const orderItems = await tx.orderItem.findMany({
    where: {
      orderId: input.orderId,
      farmerId: input.farmerId,
      fulfillmentChannel: FulfillmentChannel.DIRECT_FARMER,
    },
    select: {
      qty: true,
    },
  });

  if (!orderItems.length) {
    throw Object.assign(
      new Error("Farmer has no direct-farmer items in this order"),
      { code: 403 },
    );
  }

  const quantity = orderItems.reduce(
    (sum, item) => sum + item.qty,
    0,
  );

  const farmer = await tx.farmerProfile.findUnique({
    where: {
      id: input.farmerId,
    },
  });

  if (!farmer) {
    throw Object.assign(
      new Error("Farmer profile missing"),
      { code: 404 },
    );
  }

  const slot = await pickOpenDeliverySlot(tx);

  if (!slot) {
    throw Object.assign(
      new Error("No upcoming delivery slots with capacity"),
      { code: 409 },
    );
  }

  const reserved = await tx.deliverySlot.updateMany({
    where: {
      id: slot.id,
      booked: {
        lt: slot.capacity,
      },
    },
    data: {
      booked: {
        increment: 1,
      },
    },
  });

  if (reserved.count !== 1) {
    throw Object.assign(
      new Error("Delivery slot filled while booking"),
      { code: 409 },
    );
  }

  return tx.logisticsBooking.create({
    data: {
      farmerId: farmer.id,
      userId: input.consumerUserId,
      orderId: input.orderId,
      fulfillmentChannel: FulfillmentChannel.DIRECT_FARMER,
      societyId: null,
      slotId: slot.id,
      pickup: farmer.location,
      quantity,
      vehicle: input.vehicle || "mini-truck",
      status: LogisticsStatus.FARMER_READY,
      farmerReadyAt: new Date(),
    },
  });
}
