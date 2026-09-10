import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { emitEvent } from "../socket.js";
import { notify } from "../lib/notify.js";
import { env } from "../env.js";
import { consumeOtp } from "../lib/otp.js";
import { razorpaySignature } from "../lib/predict.js";
import {
  FulfillmentChannel,
  LogisticsStatus,
  OrderStatus,
  PaymentStatus,
  type Prisma,
} from "@prisma/client";
import { turnstileGuard } from "../lib/turnstile.js";
import {
  ensureOrderLogisticsBookings,
  ensureFarmerLogisticsBooking,
  releaseInventoryForOrder,
} from "../lib/orderLogistics.js";
import {
  assertOrderTransition,
  bookingBlocksConsumerCancel,
  canCancelOrder,
  FARMER_STATUSES,
  LOGISTICS_ORDER_STATUSES,
} from "../lib/orderStatus.js";

export const commerceRouter = Router();

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function notifyNewLogisticsJobs(orderId: string, bookingIds: string[]) {
  if (!bookingIds.length) return;
  const logisticsUsers = await prisma.user.findMany({
    where: { role: "LOGISTICS" },
    select: { id: true },
  });
  emitEvent("LOGISTICS_BOOKED", { orderId, bookingIds });
  for (const u of logisticsUsers) {
    await notify(u.id, "LOGISTICS_BOOKED", "New logistics job", orderId);
  }
}

function preferredChannelFromItems(
  items: { fulfillmentChannel: FulfillmentChannel }[],
): FulfillmentChannel {
  return items[0]?.fulfillmentChannel === FulfillmentChannel.DIRECT_FARMER
    ? FulfillmentChannel.DIRECT_FARMER
    : FulfillmentChannel.SOCIETY;
}

async function captureOnlinePayment(
  tx: Prisma.TransactionClient,
  paymentId: string,
  orderId: string,
  extra: { providerPayId?: string; signature?: string | null; method?: string | null }
) {
  await tx.payment.update({
    where: { id: paymentId },
    data: {
      ...(extra.providerPayId ? { providerPayId: extra.providerPayId } : {}),
      ...(extra.signature !== undefined ? { signature: extra.signature } : {}),
      ...(extra.method ? { method: extra.method } : {}),
      status: PaymentStatus.CAPTURED,
    },
  });
  const order = await tx.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.PAID },
    include: { items: true },
  });
  const preferredChannel = preferredChannelFromItems(order.items);
  await ensureOrderLogisticsBookings(tx, {
    orderId: order.id,
    consumerUserId: order.consumerId,
    items: order.items,
    preferredChannel,
  });
  await tx.cartItem.deleteMany({ where: { userId: order.consumerId } });
  return order;
}

/**
 * Get current user's cart.
 */
commerceRouter.get("/cart", auth, async (req, res) => {
  const items = await prisma.cartItem.findMany({
    where: {
      userId: req.user!.id,
    },
    include: {
      product: {
        include: {
          inventory: true,
          farmer: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  res.json({ items });
});

/**
 * Add/update/remove cart item.
 */
commerceRouter.post("/cart", auth, async (req, res) => {
  const productId = String(req.body?.productId || "").trim();
  const qty = Number(req.body?.qty);

  if (!productId) {
    return res.status(422).json({
      error: "Product ID required",
      code: 422,
    });
  }

  /*
   * qty <= 0 means remove the product from cart.
   */
  if (Number.isFinite(qty) && qty <= 0) {
    await prisma.cartItem.deleteMany({
      where: {
        userId: req.user!.id,
        productId,
      },
    });

    return res.json({
      item: null,
    });
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(422).json({
      error: "Valid quantity required",
      code: 422,
    });
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    include: {
      inventory: true,
    },
  });

  if (!product) {
    return res.status(404).json({
      error: "Product not found",
      code: 404,
    });
  }

  if (!product.active) {
    return res.status(409).json({
      error: "Product is no longer available",
      code: 409,
    });
  }

  if (qty < product.minQty) {
    return res.status(409).json({
      error: `Minimum quantity is ${product.minQty} ${product.unit}`,
      code: 409,
    });
  }

  if (
    product.maxQty !== null &&
    qty > product.maxQty
  ) {
    return res.status(409).json({
      error: `Maximum quantity is ${product.maxQty} ${product.unit}`,
      code: 409,
    });
  }

  if (
    !product.inventory ||
    product.inventory.available < qty
  ) {
    return res.status(409).json({
      error: "Not enough inventory",
      code: 409,
    });
  }

  const item = await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId: req.user!.id,
        productId,
      },
    },
    create: {
      userId: req.user!.id,
      productId,
      qty,
    },
    update: {
      qty,
    },
  });

  res.json({
    item,
  });
});

/**
 * ---------------------------------------------------------
 * ORDERS
 * ---------------------------------------------------------
 */

/**
 * Create order from current user's cart.
 *
 * Important:
 * - Address must belong to the logged-in consumer.
 * - Product must still be active.
 * - Inventory is checked inside a DB transaction.
 * - Product prices are snapshotted into OrderItem.
 * - Inventory is reserved atomically.
 */
commerceRouter.post(
  "/orders",
  auth,
  requireRole("CONSUMER"),
  turnstileGuard,
  async (req, res) => {
    const method = String(
      req.body?.paymentMethod || "ONLINE"
    ).toUpperCase();

    const addressId = req.body?.addressId
      ? String(req.body.addressId).trim()
      : null;

    const rawFulfillmentChannel = String(
      req.body?.fulfillmentChannel || FulfillmentChannel.SOCIETY
    )
      .trim()
      .toUpperCase();

    /**
     * Validate payment method.
     */
    if (method !== "ONLINE" && method !== "COD") {
      return res.status(422).json({
        error: "Unsupported payment method",
        code: 422,
      });
    }

    if (
      rawFulfillmentChannel !== FulfillmentChannel.SOCIETY &&
      rawFulfillmentChannel !== FulfillmentChannel.DIRECT_FARMER
    ) {
      return res.status(422).json({
        error: "fulfillmentChannel must be SOCIETY or DIRECT_FARMER",
        code: 422,
      });
    }

    const requestedChannel =
      rawFulfillmentChannel as FulfillmentChannel;

    if (!addressId) {
      return res.status(422).json({
        error: "Delivery address required",
        code: 422,
      });
    }

    /**
     * Validate address ownership.
     */
    if (addressId) {
      const address = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId: req.user!.id,
        },
      });

      if (!address) {
        return res.status(403).json({
          error: "Address does not belong to this account",
          code: 403,
        });
      }
    }

    /**
     * Load the complete cart before starting checkout.
     */
    const cart = await prisma.cartItem.findMany({
      where: {
        userId: req.user!.id,
      },
      include: {
        product: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!cart.length) {
      return res.status(422).json({
        error: "Cart empty",
        code: 422,
      });
    }

    if (method === "ONLINE") {
      const unpaid = await prisma.order.findFirst({
        where: {
          consumerId: req.user!.id,
          paymentMethod: "ONLINE",
          status: OrderStatus.PENDING_PAYMENT,
        },
      });
      if (unpaid) {
        return res.status(409).json({
          error: "Complete or cancel the unpaid online order before placing another.",
          code: 409,
          orderId: unpaid.id,
        });
      }
    }

    try {
      const order = await prisma.$transaction(
        async (tx) => {
          let total = 0;
          let totalQuantity = 0;

          /**
           * First validate every line.
           */
          for (const line of cart) {
            const product = line.product;
            const inventory = product.inventory;

            if (!product.active) {
              throw Object.assign(
                new Error(
                  `${product.name} is no longer available`
                ),
                { code: 409 }
              );
            }

            if (
              !Number.isFinite(line.qty) ||
              line.qty <= 0
            ) {
              throw Object.assign(
                new Error(
                  `Invalid quantity for ${product.name}`
                ),
                { code: 422 }
              );
            }

            if (line.qty < product.minQty) {
              throw Object.assign(
                new Error(
                  `Minimum quantity for ${product.name} is ${product.minQty} ${product.unit}`
                ),
                { code: 409 }
              );
            }

            if (
              product.maxQty !== null &&
              line.qty > product.maxQty
            ) {
              throw Object.assign(
                new Error(
                  `Maximum quantity for ${product.name} is ${product.maxQty} ${product.unit}`
                ),
                { code: 409 }
              );
            }

            if (
              !Number.isInteger(product.pricePaise) ||
              product.pricePaise < 0
            ) {
              throw Object.assign(
                new Error(
                  `Invalid price for ${product.name}`
                ),
                { code: 500 }
              );
            }

            if (
              !inventory ||
              inventory.available < line.qty
            ) {
              throw Object.assign(
                new Error(
                  `Not enough inventory for ${product.name}`
                ),
                { code: 409 }
              );
            }

            total += Math.round(
              line.qty * product.pricePaise
            );
            totalQuantity += line.qty;
          }

          if (total <= 0) {
            throw Object.assign(
              new Error(
                "Order total must be greater than zero"
              ),
              { code: 422 }
            );
          }

          /**
           * Enforce the 50kg fulfillment rule server-side.
           * <50kg must use SOCIETY. ≥50kg may choose either channel.
           */
          const fulfillmentChannel =
            totalQuantity < 50
              ? FulfillmentChannel.SOCIETY
              : requestedChannel;

          if (
            totalQuantity < 50 &&
            requestedChannel === FulfillmentChannel.DIRECT_FARMER
          ) {
            throw Object.assign(
              new Error(
                "Orders below 50 kg must be fulfilled through a cooperative society."
              ),
              { code: 409 }
            );
          }

          /**
           * Create the order.
           *
           * OrderItem stores the price at purchase time
           * and the selected fulfillment channel.
           */
          const created = await tx.order.create({
            data: {
              consumerId: req.user!.id,
              addressId,
              paymentMethod: method,

              status:
                method === "COD"
                  ? OrderStatus.COD_PENDING
                  : OrderStatus.PENDING_PAYMENT,

              totalPaise: total,

              platformFeePaise: Math.round(total * 0.03),

              items: {
                create: cart.map((line) => ({
                  productId: line.productId,
                  qty: line.qty,
                  unitPaise: line.product.pricePaise,
                  linePaise: Math.round(
                    line.qty * line.product.pricePaise
                  ),
                  farmerId: line.product.farmerId,
                  fulfillmentChannel,
                })),
              },
            },

            include: {
              items: true,
            },
          });

          /**
           * Reserve inventory atomically.
           *
           * available >= qty prevents overselling when
           * multiple customers checkout simultaneously.
           */
          for (const line of cart) {
            const updated = await tx.inventory.updateMany({
              where: {
                productId: line.productId,
                available: {
                  gte: line.qty,
                },
              },
              data: {
                available: {
                  decrement: line.qty,
                },
                reserved: {
                  increment: line.qty,
                },
              },
            });

            if (updated.count !== 1) {
              throw Object.assign(
                new Error(
                  `Inventory changed while placing the order for ${line.product.name}`
                ),
                { code: 409 }
              );
            }
          }

          /**
           * COD resolves fulfillment in the same transaction.
           * ONLINE waits until payment is captured.
           */
          if (method === "COD") {
            await ensureOrderLogisticsBookings(tx, {
              orderId: created.id,
              consumerUserId: req.user!.id,
              items: created.items,
              preferredChannel: fulfillmentChannel,
            });

            await tx.cartItem.deleteMany({
              where: {
                userId: req.user!.id,
              },
            });
          }

          return created;
        },
        {
          isolationLevel: "Serializable",
        }
      );

      /**
       * Notify connected clients.
       */
      emitEvent("ORDER_CREATED", {
        orderId: order.id,
      });

      /**
       * Notify farmers only for DIRECT_FARMER lines.
       * Society fulfillment does not require farmer acceptance.
       */
      for (const item of order.items) {
        if (item.fulfillmentChannel !== FulfillmentChannel.DIRECT_FARMER) {
          continue;
        }

        const farmer = await prisma.farmerProfile.findUnique({
          where: {
            id: item.farmerId,
          },
        });

        if (farmer) {
          await notify(
            farmer.userId,
            "NEW_ORDER",
            "New order",
            `Order ${order.id}`
          );
        }
      }

      if (method === "COD") {
        const bookings = await prisma.logisticsBooking.findMany({
          where: { orderId: order.id },
          select: { id: true },
        });
        await notifyNewLogisticsJobs(
          order.id,
          bookings.map((b) => b.id)
        );
        return res.status(201).json({
          order,
        });
      }

      return res.status(201).json({
        order,
      });
    } catch (err) {
      const e = err as Error & {
        code?: number | string;
      };

      if (
        e.code === 409 ||
        e.code === 422
      ) {
        return res.status(Number(e.code)).json({
          error: e.message,
          code: Number(e.code),
        });
      }

      /**
       * PostgreSQL serializable transaction conflicts.
       */
      if (
        e.message?.toLowerCase().includes(
          "serialization"
        ) ||
        e.message?.toLowerCase().includes(
          "serializable"
        )
      ) {
        return res.status(409).json({
          error:
            "Another order changed inventory at the same time. Please retry.",
          code: 409,
        });
      }

      throw err;
    }
  }
);

/**
 * Verify COD OTP.
 */
commerceRouter.post(
  "/orders/:id/cod-verify",
  auth,
  requireRole("CONSUMER"),
  async (req, res) => {
    const orderId = String(req.params.id);
    const otpId = String(
      req.body?.otpId || ""
    );
    const code = String(
      req.body?.code || ""
    );

    if (!otpId || !code) {
      return res.status(422).json({
        error: "OTP ID and code required",
        code: 422,
      });
    }

    /**
     * Verify that the order belongs to this consumer
     * before changing its status.
     */
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        consumerId: req.user!.id,
      },
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        code: 404,
      });
    }

    if (
      order.status !== OrderStatus.COD_PENDING
    ) {
      return res.status(409).json({
        error: "COD verification is not pending",
        code: 409,
      });
    }

    const ok = await consumeOtp(
      otpId,
      code
    );

    if (!ok.ok) {
      return res.status(400).json({
        error: ok.error,
        code: 400,
      });
    }

    const updated =
      await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.PAID,
        },
      });

    emitEvent(
      "ORDER_STATUS_CHANGED",
      {
        orderId: updated.id,
        status: updated.status,
      }
    );

    return res.json({
      order: updated,
    });
  }
);

/**
 * Get orders.
 *
 * FARMER:
 *   Orders containing the farmer's products.
 *
 * CONSUMER:
 *   Consumer's own orders.
 *
 * LOGISTICS / ADMIN:
 *   Current implementation returns orders for the
 *   authenticated user. Logistics/Admin-specific
 *   operational views can be hardened separately.
 */
commerceRouter.get(
  "/orders",
  auth,
  async (req, res) => {
    if (req.user!.role === "FARMER") {
      const farmer =
        await prisma.farmerProfile.findUnique({
          where: {
            userId: req.user!.id,
          },
        });

      if (!farmer) {
        return res.status(404).json({
          error: "Farmer profile not found",
          code: 404,
        });
      }

      const items =
        await prisma.orderItem.findMany({
          where: {
            farmerId: farmer.id,
            /**
             * Society fulfillment does not require farmer acceptance.
             */
            fulfillmentChannel: FulfillmentChannel.DIRECT_FARMER,
          },
          include: {
            order: {
              include: {
                items: {
                  include: {
                    product: true,
                  },
                },
                consumer: {
                  select: {
                    name: true,
                  },
                },
                address: true,
                payments: true,
              },
            },
            product: true,
          },
          orderBy: {
            order: {
              createdAt: "desc",
            },
          },
        });

      /**
       * Avoid returning duplicate orders when
       * multiple items belong to the same order.
       */
      const uniqueOrders = new Map<
        string,
        (typeof items)[number]["order"]
      >();

      for (const item of items) {
        uniqueOrders.set(item.order.id, {
          ...item.order,
          items: item.order.items.filter((line) => line.farmerId === farmer.id),
        });
      }

      return res.json({
        orders: Array.from(
          uniqueOrders.values()
        ),
      });
    }

    /**
     * Consumer orders.
     */
    const orders =
      await prisma.order.findMany({
        where: {
          consumerId: req.user!.id,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
          address: true,
          bookings: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      orders,
    });
  }
);
/**
 * Get one order for the authenticated consumer.
 *
 * Returns the real database state needed by the
 * consumer Order Details and Tracking screens.
 */
commerceRouter.get(
  "/orders/:id",
  auth,
  requireRole("CONSUMER"),
  async (req, res) => {
    const orderId = String(req.params.id).trim();

    if (!orderId) {
      return res.status(422).json({
        error: "Order ID required",
        code: 422,
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        consumerId: req.user!.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },

        payments: true,

        address: true,

        bookings: {
          include: {
            slot: true,

            farmer: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    photoUrl: true,
                  },
                },
              },
            },

            assignedUser: {
              select: {
                id: true,
                name: true,
                phone: true,
                photoUrl: true,
                deliveryType: true,
                vehicleNumber: true,
              },
            },

            society: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        code: 404,
      });
    }

    return res.json({
      order,
    });
  }
);
commerceRouter.post(
  "/orders/:id/cancel",
  auth,
  async (req, res) => {
    const orderId = String(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, bookings: true },
    });
    if (!order) return res.status(404).json({ error: "Order not found", code: 404 });

    if (req.user!.role === "CONSUMER" && order.consumerId !== req.user!.id) {
      return res.status(403).json({ error: "You cannot cancel this order", code: 403 });
    }
    if (req.user!.role === "FARMER") {
      const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
      if (!farmer || !order.items.some((i) => i.farmerId === farmer.id)) {
        return res.status(403).json({ error: "You cannot cancel this order", code: 403 });
      }
    }
    if (req.user!.role === "LOGISTICS") {
      return res.status(403).json({ error: "Logistics cannot cancel orders here", code: 403 });
    }
    if (!canCancelOrder(order.status) || bookingBlocksConsumerCancel(order.bookings)) {
      return res.status(409).json({
        error: "This order can no longer be cancelled",
        code: 409,
      });
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true, bookings: true },
        });
        if (!current) throw Object.assign(new Error("Order not found"), { code: 404 });
        if (current.status === OrderStatus.CANCELLED) return current;
        if (!canCancelOrder(current.status) || bookingBlocksConsumerCancel(current.bookings)) {
          throw Object.assign(new Error("This order can no longer be cancelled"), { code: 409 });
        }
        assertOrderTransition(current.status, OrderStatus.CANCELLED);
        await releaseInventoryForOrder(tx, current.items, "cancel");
        for (const booking of current.bookings) {
          if (booking.status === LogisticsStatus.CANCELLED) continue;
          await tx.deliverySlot.updateMany({
            where: { id: booking.slotId, booked: { gte: 1 } },
            data: { booked: { decrement: 1 } },
          });
          await tx.logisticsBooking.update({
            where: { id: booking.id },
            data: { status: LogisticsStatus.CANCELLED },
          });
        }
        return tx.order.update({
          where: { id: current.id },
          data: { status: OrderStatus.CANCELLED },
          include: { items: true },
        });
      });
      await notify(updated.consumerId, "ORDER_STATUS", "Order cancelled", updated.id);
      emitEvent("ORDER_STATUS_CHANGED", { orderId: updated.id, status: updated.status });
      return res.json({ order: updated });
    } catch (err) {
      const e = err as Error & { code?: number };
      if (e.code === 404 || e.code === 409) {
        return res.status(Number(e.code)).json({ error: e.message, code: Number(e.code) });
      }
      throw err;
    }
  }
);

/**
 * ---------------------------------------------------------
 * ORDER STATUS
 * ---------------------------------------------------------
 */

/**
 * Update order status.
 *
 * Inventory is only moved when the order actually
 * transitions into DELIVERED or CANCELLED.
 */
commerceRouter.post(
  "/orders/:id/status",
  auth,
  requireRole(
    "FARMER",
    "LOGISTICS",
    "ADMIN"
  ),
  async (req, res) => {
    const orderId = String(
      req.params.id
    );

    const requestedStatus = String(
      req.body?.status || ""
    ).toUpperCase();

    /**
     * Validate enum instead of trusting arbitrary
     * request body text.
     */
    if (
      !Object.values(OrderStatus).includes(
        requestedStatus as OrderStatus
      )
    ) {
      return res.status(422).json({
        error: "Invalid order status",
        code: 422,
      });
    }

    const status =
      requestedStatus as OrderStatus;

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          items: true,
        },
      });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        code: 404,
      });
    }

    /**
     * Prevent meaningless duplicate terminal
     * transitions.
     */
    if (
      order.status === status
    ) {
      return res.json({
        order,
        message: "Order already has this status",
      });
    }

    /**
     * Do not modify completed/cancelled orders
     * through this generic endpoint.
     */
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.FAILED
    ) {
      return res.status(409).json({
        error:
          "This order is already in a terminal state",
        code: 409,
      });
    }
    try {
      assertOrderTransition(order.status, status);
    } catch (err) {
      const e = err as Error & { code?: number };
      return res.status(e.code || 409).json({ error: e.message, code: e.code || 409 });
    }

    if (req.user!.role === "FARMER" && !FARMER_STATUSES.includes(status)) {
      return res.status(403).json({
        error: "Farmers can only accept, prepare, or mark ready for pickup",
        code: 403,
      });
    }

    if (req.user!.role === "LOGISTICS" && !LOGISTICS_ORDER_STATUSES.includes(status)) {
      return res.status(403).json({
        error: "Logistics can only update pickup and delivery statuses",
        code: 403,
      });
    }

    /**
     * Farmer ownership check.
     *
     * A farmer can only update orders containing
     * their own products.
     */
    if (req.user!.role === "FARMER") {
      const farmer =
        await prisma.farmerProfile.findUnique({
          where: {
            userId: req.user!.id,
          },
        });

      if (!farmer) {
        return res.status(403).json({
          error: "Farmer profile not found",
          code: 403,
        });
      }

      const ownsItem =
        order.items.some(
          (item) =>
            item.farmerId === farmer.id
        );

      if (!ownsItem) {
        return res.status(403).json({
          error:
            "You cannot update this order",
          code: 403,
        });
      }
    }

    try {
      const updated =
        await prisma.$transaction(
          async (tx) => {
            /**
             * Re-read the order inside transaction.
             */
            const current =
              await tx.order.findUnique({
                where: {
                  id: order.id,
                },
                include: {
                  items: true,
                },
              });

            if (!current) {
              throw Object.assign(
                new Error(
                  "Order not found"
                ),
                { code: 404 }
              );
            }

            if (
              current.status ===
                OrderStatus.DELIVERED ||
              current.status ===
                OrderStatus.CANCELLED ||
              current.status ===
                OrderStatus.FAILED
            ) {
              throw Object.assign(
                new Error(
                  "Order is already in a terminal state"
                ),
                { code: 409 }
              );
            }

            if (current.status !== order.status) {
              assertOrderTransition(current.status, status);
            }

            /**
             * Update order.
             */
            const changed =
  await tx.order.update({
    where: {
      id: current.id,
    },
    data: {
      status,
    },
    include: {
      items: true,
    },
  });

/**
 * When a farmer marks the order READY_FOR_PICKUP,
 * create/use a DIRECT_FARMER logistics booking so
 * logistics workers can claim the job.
 *
 * SOCIETY fulfillment is intentionally ignored here —
 * those bookings are already CONFIRMED at order time.
 */
if (
  status === OrderStatus.READY_FOR_PICKUP &&
  req.user!.role === "FARMER"
) {
  const farmer = await tx.farmerProfile.findUnique({
    where: {
      userId: req.user!.id,
    },
  });

  if (!farmer) {
    throw Object.assign(
      new Error("Farmer profile not found"),
      { code: 403 }
    );
  }

  const directItems = changed.items.filter(
    (item) =>
      item.farmerId === farmer.id &&
      item.fulfillmentChannel === FulfillmentChannel.DIRECT_FARMER
  );

  if (!directItems.length) {
    throw Object.assign(
      new Error(
        "No direct-farmer items available to mark ready for pickup"
      ),
      { code: 409 }
    );
  }

  const farmerOrder = await tx.farmerOrder.findUnique({
    where: {
      orderId_farmerId: {
        orderId: changed.id,
        farmerId: farmer.id,
      },
    },
  });

  if (!farmerOrder) {
    throw Object.assign(
      new Error(
        "Farmer order record missing for direct-farmer fulfillment"
      ),
      { code: 409 }
    );
  }

  await ensureFarmerLogisticsBooking(tx, {
    orderId: changed.id,
    consumerUserId: changed.consumerId,
    farmerId: farmer.id,
  });

  /**
   * If a DIRECT_FARMER booking already existed in an earlier
   * status, advance only that channel to FARMER_READY.
   * Never touch SOCIETY bookings for this order+farmer.
   */
  await tx.logisticsBooking.updateMany({
    where: {
      orderId: changed.id,
      farmerId: farmer.id,
      fulfillmentChannel: FulfillmentChannel.DIRECT_FARMER,
      status: {
        in: [
          LogisticsStatus.CONFIRMED,
          LogisticsStatus.PICKUP_SCHEDULED,
        ],
      },
    },
    data: {
      status: LogisticsStatus.FARMER_READY,
      farmerReadyAt: new Date(),
    },
  });
}

if (status === OrderStatus.DELIVERED) {
  await releaseInventoryForOrder(
    tx,
    changed.items,
    "deliver"
  );
}

if (
  status === OrderStatus.CANCELLED ||
  status === OrderStatus.FAILED
) {
  await releaseInventoryForOrder(
    tx,
    changed.items,
    "cancel"
  );
}

return changed;
                  
          },
          {
            isolationLevel:
              "Serializable",
          }
        );

      await notify(
        updated.consumerId,
        "ORDER_STATUS",
        "Order update",
        `${updated.id} is ${updated.status}`
      );
      if (
  updated.status === OrderStatus.READY_FOR_PICKUP &&
  req.user!.role === "FARMER"
) {
  const bookings =
    await prisma.logisticsBooking.findMany({
      where: {
        orderId: updated.id,
        farmerId: (
          await prisma.farmerProfile.findUnique({
            where: {
              userId: req.user!.id,
            },
          })
        )?.id,
        fulfillmentChannel: FulfillmentChannel.DIRECT_FARMER,
        status: LogisticsStatus.FARMER_READY,
      },
      select: {
        id: true,
        farmer: {
          select: {
            farmName: true,
          },
        },
      },
    });

  const logisticsUsers =
    await prisma.user.findMany({
      where: {
        role: "LOGISTICS",
      },
      select: {
        id: true,
      },
    });

  for (const booking of bookings) {
    emitEvent(
      "LOGISTICS_STATUS_CHANGED",
      {
        id: booking.id,
        status: LogisticsStatus.FARMER_READY,
        orderId: updated.id,
      }
    );

    for (const worker of logisticsUsers) {
      await notify(
        worker.id,
        "LOGISTICS_JOB_READY",
        "New delivery job available",
        `${booking.farmer.farmName} has prepared order ${updated.id} for pickup.`
      );
    }
  }
}
      emitEvent(
        "ORDER_STATUS_CHANGED",
        {
          orderId: updated.id,
          status: updated.status,
        }
      );

      return res.json({
        order: updated,
      });
    } catch (err) {
      const e = err as Error & {
        code?: number | string;
      };

      if (
        e.code === 404 ||
        e.code === 409
      ) {
        return res
          .status(Number(e.code))
          .json({
            error: e.message,
            code: Number(e.code),
          });
      }

      throw err;
    }
  }
);

/**
 * ---------------------------------------------------------
 * RAZORPAY PAYMENT
 * ---------------------------------------------------------
 */

/**
 * Create Razorpay order.
 */
commerceRouter.post(
  "/payments/create",
  auth,
  requireRole("CONSUMER"),
  async (req, res) => {
    if (
      !env.razorpayKeyId ||
      !env.razorpayKeySecret
    ) {
      return res.status(503).json({
        error:
          "Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        code: 503,
      });
    }

    const orderId = String(
      req.body?.orderId || ""
    ).trim();

    if (!orderId) {
      return res.status(422).json({
        error: "Order ID required",
        code: 422,
      });
    }

    const order =
      await prisma.order.findFirst({
        where: {
          id: orderId,
          consumerId: req.user!.id,
        },
      });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        code: 404,
      });
    }

    /**
     * Payment can only be created for an
     * unpaid online order.
     */
    if (
      order.paymentMethod !== "ONLINE"
    ) {
      return res.status(409).json({
        error:
          "This order does not require online payment",
        code: 409,
      });
    }

    if (
      order.status !==
      OrderStatus.PENDING_PAYMENT
    ) {
      return res.status(409).json({
        error:
          "Order is not awaiting payment",
        code: 409,
      });
    }

    if (order.totalPaise <= 0) {
      return res.status(422).json({
        error: "Invalid order amount",
        code: 422,
      });
    }

    /**
     * Reuse an existing CREATED Razorpay payment
     * instead of unnecessarily creating multiple
     * provider orders.
     */
    const existingPayment =
      await prisma.payment.findFirst({
        where: {
          orderId: order.id,
          provider: "razorpay",
          status: PaymentStatus.CREATED,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (
      existingPayment?.providerOrder
    ) {
      return res.json({
        keyId: env.razorpayKeyId,
        razorpayOrderId:
          existingPayment.providerOrder,
        amount: order.totalPaise,
        paymentId: existingPayment.id,
      });
    }

    const rz = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret:
        env.razorpayKeySecret,
    });

    const rzOrder =
      await rz.orders.create({
        amount: order.totalPaise,
        currency: "INR",
        receipt: order.id,
      });

    const payment =
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "razorpay",
          providerOrder:
            rzOrder.id,
          amountPaise:
            order.totalPaise,
          status:
            PaymentStatus.CREATED,
        },
      });

    return res.json({
      keyId: env.razorpayKeyId,
      razorpayOrderId:
        rzOrder.id,
      amount:
        order.totalPaise,
      paymentId:
        payment.id,
    });
  }
);

/**
 * Verify Razorpay payment.
 */
commerceRouter.post(
  "/payments/verify",
  auth,
  requireRole("CONSUMER"),
  async (req, res) => {
    if (!env.razorpayKeySecret) {
      return res.status(503).json({
        error:
          "Razorpay secret missing",
        code: 503,
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    const providerOrder =
      String(
        razorpay_order_id || ""
      ).trim();

    const providerPayment =
      String(
        razorpay_payment_id || ""
      ).trim();

    const signature =
      String(
        razorpay_signature || ""
      ).trim();

    if (
      !providerOrder ||
      !providerPayment ||
      !signature
    ) {
      return res.status(422).json({
        error:
          "Incomplete payment verification data",
        code: 422,
      });
    }

    /**
     * Verify Razorpay signature.
     */
    const expected =
      razorpaySignature(
        providerOrder,
        providerPayment,
        env.razorpayKeySecret
      );

    if (
      expected !== signature
    ) {
      return res.status(400).json({
        error:
          "Invalid payment signature",
        code: 400,
      });
    }

    /**
     * Find payment and its order.
     */
    const payment =
      await prisma.payment.findFirst({
        where: {
          providerOrder,
          provider: "razorpay",
        },
        include: {
          order: true,
        },
      });

    if (!payment) {
      return res.status(404).json({
        error:
          "Payment record missing",
        code: 404,
      });
    }

    /**
     * Critical ownership check.
     *
     * The authenticated consumer must own
     * the order associated with this payment.
     */
    if (
      payment.order.consumerId !==
      req.user!.id
    ) {
      return res.status(403).json({
        error:
          "Payment does not belong to this account",
        code: 403,
      });
    }

    /**
     * Already captured = idempotent success.
     */
    if (
      payment.status ===
        PaymentStatus.CAPTURED &&
      payment.order.status ===
        OrderStatus.PAID
    ) {
      await prisma.$transaction(async (tx) => {
        const items = await tx.orderItem.findMany({
          where: { orderId: payment.orderId },
        });
        await ensureOrderLogisticsBookings(tx, {
          orderId: payment.orderId,
          consumerUserId: payment.order.consumerId,
          items,
          preferredChannel: preferredChannelFromItems(items),
        });
      });
      return res.json({
        ok: true,
        orderId:
          payment.orderId,
        alreadyProcessed:
          true,
      });
    }

    /**
     * Do not accept payment for cancelled/
     * delivered/failed orders.
     */
    if (
      payment.order.status ===
        OrderStatus.CANCELLED ||
      payment.order.status ===
        OrderStatus.DELIVERED ||
      payment.order.status ===
        OrderStatus.FAILED
    ) {
      return res.status(409).json({
        error:
          "Order is no longer payable",
        code: 409,
      });
    }

    /**
     * Verify payment amount matches the
     * amount stored for the payment/order.
     *
     * Razorpay's signature proves authenticity,
     * while the DB amount protects against
     * mismatched local payment records.
     */
    if (
      payment.amountPaise !==
      payment.order.totalPaise
    ) {
      return res.status(409).json({
        error:
          "Payment amount does not match order amount",
        code: 409,
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          /**
           * Re-read payment to protect against
           * concurrent verification requests.
           */
          const current =
            await tx.payment.findUnique({
              where: {
                id: payment.id,
              },
              include: {
                order: true,
              },
            });

          if (!current) {
            throw Object.assign(
              new Error(
                "Payment record missing"
              ),
              { code: 404 }
            );
          }

          if (
            current.status === PaymentStatus.CAPTURED &&
            current.order.status === OrderStatus.PAID
          ) {
            const items = await tx.orderItem.findMany({
              where: { orderId: current.orderId },
            });
            await ensureOrderLogisticsBookings(tx, {
              orderId: current.orderId,
              consumerUserId: current.order.consumerId,
              items,
              preferredChannel: preferredChannelFromItems(items),
            });
            return current;
          }

          return captureOnlinePayment(tx, current.id, current.orderId, {
            providerPayId: providerPayment,
            signature,
          });
        },
        {
          isolationLevel:
            "Serializable",
        }
      );

    emitEvent(
      "PAYMENT_CONFIRMED",
      {
        orderId:
          payment.orderId,
      }
    );

    const order =
      await prisma.order.findUnique({
        where: {
          id: payment.orderId,
        },
        include: {
          items: true,
        },
      });

      if (order) {
      await notify(
        order.consumerId,
        "PAYMENT_SUCCESS",
        "Payment confirmed",
        order.id
      );

      for (const item of order.items) {
        if (item.fulfillmentChannel !== FulfillmentChannel.DIRECT_FARMER) {
          continue;
        }

        const farmer =
          await prisma.farmerProfile.findUnique(
            {
              where: {
                id: item.farmerId,
              },
            }
          );

        if (farmer) {
          await notify(
            farmer.userId,
            "PAYMENT_SUCCESS",
            "Order paid",
            order.id
          );
        }
      }
      const bookings = await prisma.logisticsBooking.findMany({
        where: { orderId: order.id },
        select: { id: true },
      });
      await notifyNewLogisticsJobs(order.id, bookings.map((b) => b.id));
    }

    return res.json({
      ok: true,
      orderId: payment.orderId,
      paymentId: payment.id,
    });
  }
);

/**
 * ---------------------------------------------------------
 * RAZORPAY WEBHOOK
 * ---------------------------------------------------------
 *
 * Razorpay signs the exact raw request body.
 *
 * index.ts installs express.raw() specifically for this
 * endpoint, so req.body must be a Buffer here.
 *
 * Webhook event IDs are stored separately from Payment
 * because one payment can produce multiple provider events.
 */
commerceRouter.post(
  "/payments/webhook",
  async (req, res) => {
    if (!env.razorpayKeySecret) {
      return res.status(503).json({
        error: "Razorpay webhook is not configured",
        code: 503,
      });
    }

    const signatureHeader =
      req.headers["x-razorpay-signature"];

    const eventIdHeader =
      req.headers["x-razorpay-event-id"];

    if (
      typeof signatureHeader !== "string" ||
      !signatureHeader.trim()
    ) {
      return res.status(400).json({
        error: "Missing webhook signature",
        code: 400,
      });
    }

    if (
      typeof eventIdHeader !== "string" ||
      !eventIdHeader.trim()
    ) {
      return res.status(400).json({
        error: "Missing webhook event ID",
        code: 400,
      });
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        error: "Webhook raw body unavailable",
        code: 400,
      });
    }

    const rawBody = req.body;
    const signature = signatureHeader.trim();
    const eventId = eventIdHeader.trim();

    /**
     * Verify the exact raw bytes supplied by Razorpay.
     */
    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          env.razorpayKeySecret
        )
        .update(rawBody)
        .digest("hex");

    const expectedBuffer =
      Buffer.from(expectedSignature, "utf8");

    const providedBuffer =
      Buffer.from(signature, "utf8");

    if (
      expectedBuffer.length !==
        providedBuffer.length ||
      !crypto.timingSafeEqual(
        expectedBuffer,
        providedBuffer
      )
    ) {
      return res.status(400).json({
        error: "Bad webhook signature",
        code: 400,
      });
    }

    /**
     * Only parse JSON after signature verification.
     */
    let payload: {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            amount?: number;
            currency?: string;
            method?: string;
          };
        };
      };
    };

    try {
      payload =
        JSON.parse(
          rawBody.toString("utf8")
        );
    } catch {
      return res.status(400).json({
        error: "Invalid webhook JSON",
        code: 400,
      });
    }

    const event =
      typeof payload.event === "string"
        ? payload.event.trim()
        : "";

    if (!event) {
      return res.status(400).json({
        error: "Webhook event missing",
        code: 400,
      });
    }

    const payloadHash =
      crypto
        .createHash("sha256")
        .update(rawBody)
        .digest("hex");

    /**
     * We currently process payment.captured and
     * payment.failed. Other events are recorded and
     * acknowledged without changing payment state.
     */
    const isPaymentEvent =
      event === "payment.captured" ||
      event === "payment.failed";

    if (!isPaymentEvent) {
      try {
        await prisma.paymentWebhookEvent.create({
          data: {
            provider: "razorpay",
            eventId,
            event,
            payloadHash,
            processedAt: new Date(),
          },
        });
      } catch (error) {
        if (
          !isPrismaUniqueViolation(error)
        ) {
          throw error;
        }
      }

      return res.json({
        ok: true,
        ignored: true,
        event,
      });
    }

    const paymentEntity =
      payload.payload?.payment?.entity;

    const providerPaymentId =
      typeof paymentEntity?.id === "string"
        ? paymentEntity.id.trim()
        : "";

    const providerOrderId =
      typeof paymentEntity?.order_id === "string"
        ? paymentEntity.order_id.trim()
        : "";

    const amountPaise =
      Number(paymentEntity?.amount);

    const currency =
      typeof paymentEntity?.currency === "string"
        ? paymentEntity.currency.trim()
        : "";

    if (
      !providerPaymentId ||
      !providerOrderId ||
      !Number.isSafeInteger(amountPaise) ||
      amountPaise <= 0 ||
      currency !== "INR"
    ) {
      return res.status(422).json({
        error:
          "Incomplete or invalid payment webhook",
        code: 422,
      });
    }

    try {
      const result =
        await prisma.$transaction(
          async (tx) => {
            /**
             * Insert the event first.
             *
             * @@unique([provider, eventId]) makes
             * duplicate delivery idempotent.
             */
            try {
              await tx.paymentWebhookEvent.create({
                data: {
                  provider: "razorpay",
                  eventId,
                  event,
                  payloadHash,
                },
              });
            } catch (error) {
              if (
                isPrismaUniqueViolation(error)
              ) {
                return {
                  alreadyProcessed: true,
                };
              }

              throw error;
            }

            const payment =
              await tx.payment.findFirst({
                where: {
                  provider: "razorpay",
                  providerOrder:
                    providerOrderId,
                },
                include: {
                  order: true,
                },
              });

            if (!payment) {
              throw Object.assign(
                new Error(
                  "Payment record missing"
                ),
                { code: 404 }
              );
            }

            /**
             * Verify the webhook amount against
             * our own payment and order records.
             */
            if (
              payment.amountPaise !==
                amountPaise ||
              payment.order.totalPaise !==
                amountPaise
            ) {
              throw Object.assign(
                new Error(
                  "Payment amount does not match order"
                ),
                { code: 409 }
              );
            }

            if (
              payment.order.paymentMethod !==
              "ONLINE"
            ) {
              throw Object.assign(
                new Error(
                  "Webhook payment does not belong to an online order"
                ),
                { code: 409 }
              );
            }

            if (
              event === "payment.captured"
            ) {
              /**
               * Already captured/paid is safe.
               */
              if (
                payment.status ===
                  PaymentStatus.CAPTURED &&
                payment.order.status ===
                  OrderStatus.PAID
              ) {
                const items = await tx.orderItem.findMany({
                  where: { orderId: payment.orderId },
                });
                await ensureOrderLogisticsBookings(tx, {
                  orderId: payment.orderId,
                  consumerUserId: payment.order.consumerId,
                  items,
                  preferredChannel: preferredChannelFromItems(items),
                });
                await tx.paymentWebhookEvent.update({
                  where: {
                    provider_eventId: {
                      provider: "razorpay",
                      eventId,
                    },
                  },
                  data: {
                    processedAt: new Date(),
                  },
                });

                return {
                  alreadyProcessed: false,
                  captured: true,
                  orderId: payment.orderId,
                };
              }

              /**
               * A captured webhook can only pay an
               * order that is still awaiting payment.
               */
              if (
                payment.order.status !==
                OrderStatus.PENDING_PAYMENT
              ) {
                throw Object.assign(
                  new Error(
                    `Order is not awaiting payment: ${payment.order.status}`
                  ),
                  { code: 409 }
                );
              }

              await captureOnlinePayment(tx, payment.id, payment.orderId, {
                providerPayId: providerPaymentId,
                method:
                  typeof paymentEntity?.method === "string"
                    ? paymentEntity.method
                    : payment.method,
              });

              await tx.paymentWebhookEvent.update({
                where: {
                  provider_eventId: {
                    provider: "razorpay",
                    eventId,
                  },
                },
                data: {
                  processedAt: new Date(),
                },
              });

              return {
                alreadyProcessed: false,
                captured: true,
                orderId: payment.orderId,
              };
            }

            /**
             * payment.failed
             */
            if (
              payment.status ===
                PaymentStatus.CAPTURED
            ) {
              throw Object.assign(
                new Error(
                  "Captured payment cannot become failed"
                ),
                { code: 409 }
              );
            }

            if (
              payment.order.status ===
                OrderStatus.PENDING_PAYMENT
            ) {
              await tx.payment.update({
                where: {
                  id: payment.id,
                },
                data: {
                  providerPayId:
                    providerPaymentId,
                  method:
                    typeof paymentEntity?.method ===
                    "string"
                      ? paymentEntity.method
                      : payment.method,
                  status:
                    PaymentStatus.FAILED,
                },
              });

              const failedOrder = await tx.order.update({
                where: {
                  id: payment.orderId,
                },
                data: {
                  status:
                    OrderStatus.FAILED,
                },
                include: { items: true },
              });
              await releaseInventoryForOrder(tx, failedOrder.items, "cancel");
            } else {
              await tx.payment.update({
                where: {
                  id: payment.id,
                },
                data: {
                  providerPayId:
                    providerPaymentId,
                  status:
                    PaymentStatus.FAILED,
                },
              });
            }

            await tx.paymentWebhookEvent.update({
              where: {
                provider_eventId: {
                  provider: "razorpay",
                  eventId,
                },
              },
              data: {
                processedAt: new Date(),
              },
            });

            return {
              alreadyProcessed: false,
              failed: true,
            };
          },
          {
            isolationLevel:
              "Serializable",
          }
        );

      if (result.alreadyProcessed) {
        return res.json({
          ok: true,
          alreadyProcessed: true,
          eventId,
        });
      }

      if ("captured" in result && result.captured && "orderId" in result && result.orderId) {
        const paidOrder = await prisma.order.findUnique({
          where: { id: String(result.orderId) },
          include: { items: true, bookings: true },
        });
        if (paidOrder) {
          emitEvent("PAYMENT_CONFIRMED", { orderId: paidOrder.id });
          await notify(paidOrder.consumerId, "PAYMENT_SUCCESS", "Payment confirmed", paidOrder.id);
          await notifyNewLogisticsJobs(
            paidOrder.id,
            paidOrder.bookings.map((b) => b.id)
          );
        }
      }

      return res.json({
        ok: true,
        processed: true,
        event,
      });
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? Number(
              (error as { code?: unknown }).code
            )
          : 500;

      if (
        code === 404 ||
        code === 409
      ) {
        return res.status(code).json({
          error:
            error instanceof Error
              ? error.message
              : "Webhook processing failed",
          code,
        });
      }

      throw error;
    }
  }
);



/**
 * Create address.
 */
commerceRouter.post(
  "/addresses",
  auth,
  async (req, res) => {
    const {
      line1,
      city,
      district,
      state,
      pinCode,
      phone,
      label,
      recipient,
      latitude,
      longitude,
      isDefault,
    } = req.body || {};

    const cleanLine1 =
      String(line1 || "").trim();

    const cleanCity =
      String(city || "").trim();

    const cleanDistrict =
      String(
        district || city || ""
      ).trim();

    const cleanState =
      String(state || "").trim();

    const cleanPinCode =
      String(pinCode || "").trim();

    const cleanPhone =
      phone
        ? String(phone).trim()
        : null;

    if (
      !cleanLine1 ||
      !cleanCity ||
      !cleanState ||
      !cleanPinCode
    ) {
      return res.status(422).json({
        error:
          "Incomplete address",
        code: 422,
      });
    }

    /**
     * Basic Indian PIN validation.
     */
    if (
      !/^[1-9][0-9]{5}$/.test(
        cleanPinCode
      )
    ) {
      return res.status(422).json({
        error:
          "Invalid PIN code",
        code: 422,
      });
    }

    const lat = latitude === undefined || latitude === null ? null : Number(latitude);
    const lng = longitude === undefined || longitude === null ? null : Number(longitude);
    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      return res.status(422).json({ error: "Invalid latitude", code: 422 });
    }
    if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      return res.status(422).json({ error: "Invalid longitude", code: 422 });
    }

    const address =
      await prisma.address.create({
        data: {
          userId:
            req.user!.id,
          label: label ? String(label).trim() : null,
          recipient: recipient ? String(recipient).trim() : null,
          line1:
            cleanLine1,
          city:
            cleanCity,
          district:
            cleanDistrict,
          state:
            cleanState,
          pinCode:
            cleanPinCode,
          phone:
            cleanPhone,
          latitude: lat,
          longitude: lng,
          isDefault: Boolean(isDefault),
        },
      });

    return res.status(201).json({
      address,
    });
  }
);

/**
 * Get current user's addresses.
 */
commerceRouter.get(
  "/addresses",
  auth,
  async (req, res) => {
    const addresses =
      await prisma.address.findMany({
        where: {
          userId:
            req.user!.id,
        },
        orderBy: {
          id: "desc",
        },
      });

    return res.json({
      addresses,
    });
  }
);

/**
 * ---------------------------------------------------------
 * REVIEWS
 * ---------------------------------------------------------
 */

/**
 * Consumer can review a product only after
 * an order containing that product has been delivered.
 */
commerceRouter.post(
  "/reviews",
  auth,
  requireRole("CONSUMER"),
  async (req, res) => {
    const productId =
      String(
        req.body?.productId || ""
      ).trim();

    const rating =
      Number(
        req.body?.rating
      );

    const text =
      req.body?.text
        ? String(
            req.body.text
          ).trim()
        : null;

    if (!productId) {
      return res.status(422).json({
        error:
          "Product ID required",
        code: 422,
      });
    }

    if (
      !Number.isInteger(
        rating
      ) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(422).json({
        error:
          "Rating 1–5 required",
        code: 422,
      });
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
      });

    if (!product) {
      return res.status(404).json({
        error:
          "Product not found",
        code: 404,
      });
    }

    /**
     * Verify that the consumer purchased
     * and received this product.
     */
    const delivered =
      await prisma.orderItem.findFirst({
        where: {
          productId,
          order: {
            consumerId:
              req.user!.id,
            status:
              OrderStatus.DELIVERED,
          },
        },
      });

    if (!delivered) {
      return res.status(403).json({
        error:
          "Review after delivery only",
        code: 403,
      });
    }

    /**
     * Prevent duplicate reviews from the
     * same consumer for the same product.
     *
     * The current schema does not yet have a
     * unique DB constraint, so we check here.
     */
    const existing =
      await prisma.review.findFirst({
        where: {
          userId:
            req.user!.id,
          productId,
        },
      });

    if (existing) {
      return res.status(409).json({
        error:
          "You have already reviewed this product",
        code: 409,
      });
    }

    const review =
      await prisma.review.create({
        data: {
          userId:
            req.user!.id,
          productId,
          rating,
          text:
            text || null,
        },
      });

    return res.status(201).json({
      review,
    });
  }
);
