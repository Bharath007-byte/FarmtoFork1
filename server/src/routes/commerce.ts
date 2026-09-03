import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { emitEvent } from "../socket.js";
import { notify } from "../lib/notify.js";
import { env } from "../env.js";
import { issueOtp, consumeOtp } from "../lib/otp.js";
import { razorpaySignature } from "../lib/predict.js";
import {
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import { turnstileGuard } from "../lib/turnstile.js";

export const commerceRouter = Router();
function isPrismaUniqueViolation(
  error: unknown
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
/**
 * Valid order-status transitions.
 *
 * The backend is the source of truth for the order lifecycle.
 * A request cannot arbitrarily jump between statuses.
 *
 * Logistics-related transitions are included because the
 * OrderStatus enum already supports them, but the actual
 * logistics workflow will be hardened further in the
 * logistics milestone.
 */
const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  OrderStatus[]
> = {
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
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
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
    OrderStatus.CANCELLED,
  ],

  [OrderStatus.PICKED_UP]: [
    OrderStatus.IN_TRANSIT,
    OrderStatus.CANCELLED,
  ],

  [OrderStatus.IN_TRANSIT]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.CANCELLED,
  ],

  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ],

  [OrderStatus.DELIVERED]: [],

  [OrderStatus.CANCELLED]: [],

  [OrderStatus.FAILED]: [],
};
/**
 * ---------------------------------------------------------
 * CART
 * ---------------------------------------------------------
 */

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

    /**
     * Validate payment method.
     */
    if (method !== "ONLINE" && method !== "COD") {
      return res.status(422).json({
        error: "Unsupported payment method",
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

    try {
      const order = await prisma.$transaction(
        async (tx) => {
          let total = 0;

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
           * Create the order.
           *
           * OrderItem stores the price at purchase time.
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

              /**
               * Current platform fee rule.
               * This is stored with the order so historical
               * orders are not affected by future fee changes.
               */
              platformFeePaise: Math.round(
                total * 0.03
              ),

              items: {
                create: cart.map((line) => ({
                  productId: line.productId,
                  qty: line.qty,
                  unitPaise: line.product.pricePaise,
                  linePaise: Math.round(
                    line.qty * line.product.pricePaise
                  ),
                  farmerId: line.product.farmerId,
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
            const updated =
              await tx.inventory.updateMany({
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
           * Only clear cart after order + inventory
           * reservation have succeeded.
           */
          await tx.cartItem.deleteMany({
            where: {
              userId: req.user!.id,
            },
          });

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
       * Notify affected farmers.
       */
      for (const item of order.items) {
        const farmer =
          await prisma.farmerProfile.findUnique({
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

      /**
       * COD requires OTP verification.
       */
      if (method === "COD") {
        const user = await prisma.user.findUnique({
          where: {
            id: req.user!.id,
          },
        });

        if (!user) {
          return res.status(401).json({
            error: "User account no longer exists",
            code: 401,
          });
        }

        const otp = await issueOtp({
          userId: user.id,
          channel: user.phone || user.email,
          purpose: `cod:${order.id}`,
        });

        return res.status(201).json({
          order,
          otpId: otp.id,
          delivery: otp.delivery,
          message: "COD verification pending",
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
        uniqueOrders.set(
          item.order.id,
          item.order
        );
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
const allowedTransitions:OrderStatus[] =
  ORDER_STATUS_TRANSITIONS[order.status] ?? [];

if (!allowedTransitions.includes(status)) {
  return res.status(409).json({
    error: `Invalid order status transition: ${order.status} → ${status}`,
    code: 409,
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
             * DELIVERED:
             *
             * reserved -> sold
             *
             * updateMany uses reserved >= qty
             * to protect against negative inventory.
             */
            if (
              status ===
              OrderStatus.DELIVERED
            ) {
              for (const item of changed.items) {
                const inventory =
                  await tx.inventory.updateMany(
                    {
                      where: {
                        productId:
                          item.productId,
                        reserved: {
                          gte: item.qty,
                        },
                      },
                      data: {
                        reserved: {
                          decrement:
                            item.qty,
                        },
                        sold: {
                          increment:
                            item.qty,
                        },
                      },
                    }
                  );

                if (
                  inventory.count !== 1
                ) {
                  throw Object.assign(
                    new Error(
                      `Inventory reservation missing for ${item.productId}`
                    ),
                    { code: 409 }
                  );
                }
              }
            }

            /**
             * CANCELLED:
             *
             * reserved -> available
             */
            if (
              status ===
              OrderStatus.CANCELLED
            ) {
              for (const item of changed.items) {
                const inventory =
                  await tx.inventory.updateMany(
                    {
                      where: {
                        productId:
                          item.productId,
                        reserved: {
                          gte: item.qty,
                        },
                      },
                      data: {
                        reserved: {
                          decrement:
                            item.qty,
                        },
                        available: {
                          increment:
                            item.qty,
                        },
                      },
                    }
                  );

                if (
                  inventory.count !== 1
                ) {
                  throw Object.assign(
                    new Error(
                      `Inventory reservation missing for ${item.productId}`
                    ),
                    { code: 409 }
                  );
                }
              }
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
            current.status ===
              PaymentStatus.CAPTURED &&
            current.order.status ===
              OrderStatus.PAID
          ) {
            return current;
          }

          await tx.payment.update({
            where: {
              id: current.id,
            },
            data: {
              providerPayId:
                providerPayment,
              signature,
              status:
                PaymentStatus.CAPTURED,
            },
          });

          await tx.order.update({
            where: {
              id: current.orderId,
            },
            data: {
              status:
                OrderStatus.PAID,
            },
          });

          return current;
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
    }

    return res.json({
      ok: true,
      orderId:
        payment.orderId,
      paymentId:
        result.id,
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
                    PaymentStatus.CAPTURED,
                },
              });

              await tx.order.update({
                where: {
                  id: payment.orderId,
                },
                data: {
                  status:
                    OrderStatus.PAID,
                },
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

              await tx.order.update({
                where: {
                  id: payment.orderId,
                },
                data: {
                  status:
                    OrderStatus.FAILED,
                },
              });
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

    const address =
      await prisma.address.create({
        data: {
          userId:
            req.user!.id,
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
