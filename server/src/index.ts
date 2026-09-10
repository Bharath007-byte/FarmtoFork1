import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { createServer } from "node:http";
import { env } from "./env.js";
import { prisma } from "./db.js";
import { attachIo } from "./socket.js";
import { authRouter } from "./routes/auth.js";
import { farmerRouter } from "./routes/farmers.js";
import { productRouter } from "./routes/products.js";
import { commerceRouter } from "./routes/commerce.js";
import { marketRouter, ingestMarket } from "./routes/market.js";
import { opsRouter } from "./routes/ops.js";
import { societyRouter } from "./routes/societies.js";
import { adminLogisticsRouter } from "./routes/adminLogistics.js";
import { adminPaymentsRouter } from "./routes/adminPayments.js";
import { auth, requireRole } from "./middleware/auth.js";

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.corsOrigins, credentials: true }));

/**
 * Razorpay webhook must receive the exact raw request body
 * because its HMAC signature is calculated from the raw bytes.
 *
 * This middleware is intentionally scoped only to the webhook.
 * All other API routes continue using normal JSON parsing below.
 */
app.use(
  "/api/payments/webhook",
  express.raw({
    type: "application/json",
    limit: "2mb",
  })
);

app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get("/api/health", async (_req, res) => {
  let database = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }
  const latest = await prisma.marketPrice.findFirst({ orderBy: { observedAt: "desc" } }).catch(() => null);
  res.status(database === "up" ? 200 : 503).json({
    server: "up",
    database,
    marketData: latest
      ? { source: latest.source, lastUpdated: latest.observedAt, liveFeed: latest.liveFeed }
      : { source: null, lastUpdated: null },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/farmers", farmerRouter);
app.use("/api/products", productRouter);
app.use("/api", commerceRouter);
app.use("/api/market-prices", marketRouter);
app.get("/api/ai/price-prediction", (req, res) => {
  const q = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(307, `/api/market-prices/prediction${q ? `?${q}` : ""}`);
});
app.use("/api", opsRouter);
app.use("/api/societies", societyRouter);
app.use("/api/admin/logistics", adminLogisticsRouter);
app.use("/api/admin/payments", adminPaymentsRouter);
app.get("/api/admin/overview", auth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const [
      farmers,
      consumers,
      products,
      societies,
      activeSocietyFarmers,
      societySupplies,
      societyInventoryRows,
      orders,
      capturedPayments,
      logisticsJobs,
    ] = await Promise.all([
      prisma.user.count({
        where: { role: "FARMER" },
      }),

      prisma.user.count({
        where: { role: "CONSUMER" },
      }),

      prisma.product.count({
        where: { active: true },
      }),

      prisma.cooperativeSociety.count({
        where: { active: true },
      }),

      prisma.societyFarmer.count({
        where: {
          active: true,
          society: {
            active: true,
          },
        },
      }),

      prisma.societySupply.findMany({
        where: {
          society: {
            active: true,
          },
        },
        select: {
          quantity: true,
          soldQty: true,
          status: true,
        },
      }),

      prisma.societyInventory.findMany({
        where: {
          society: {
            active: true,
          },
        },
        select: {
          available: true,
          reserved: true,
          sold: true,
        },
      }),

      prisma.order.count(),

      prisma.payment.count({
        where: {
          status: "CAPTURED",
        },
      }),

      prisma.logisticsBooking.count({
        where: {
          status: {
            notIn: ["CANCELLED", "DELIVERED"],
          },
        },
      }),
    ]);

    const supplyReceivedKg = societySupplies.reduce(
      (sum, row) => sum + row.quantity,
      0
    );

    const supplySoldKg = societySupplies.reduce(
      (sum, row) => sum + row.soldQty,
      0
    );

    const societyAvailableKg = societyInventoryRows.reduce(
      (sum, row) => sum + row.available,
      0
    );

    const societyReservedKg = societyInventoryRows.reduce(
      (sum, row) => sum + row.reserved,
      0
    );

    const societySoldKg = societyInventoryRows.reduce(
      (sum, row) => sum + row.sold,
      0
    );

    const pendingSupplyRecords = societySupplies.filter(
      (row) => row.status === "RECEIVED"
    ).length;

    const partiallySoldSupplyRecords = societySupplies.filter(
      (row) => row.status === "PARTIALLY_SOLD"
    ).length;

    const soldSupplyRecords = societySupplies.filter(
      (row) => row.status === "SOLD"
    ).length;

    res.json({
      users: {
        farmers,
        consumers,
      },

      catalog: {
        products,
      },

      societies: {
        active: societies,
        activeFarmers: activeSocietyFarmers,
      },

      supplies: {
        records: societySupplies.length,
        receivedKg: supplyReceivedKg,
        soldKg: supplySoldKg,
        pendingRecords: pendingSupplyRecords,
        partiallySoldRecords: partiallySoldSupplyRecords,
        soldRecords: soldSupplyRecords,
      },

      societyInventory: {
        availableKg: societyAvailableKg,
        reservedKg: societyReservedKg,
        soldKg: societySoldKg,
      },

      orders: {
        total: orders,
      },

      payments: {
        captured: capturedPayments,
      },

      logistics: {
        activeJobs: logisticsJobs,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/overview", error);

    res.status(500).json({
      error: "Failed to load admin overview",
      code: 500,
    });
  }
});
app.get(
  "/api/admin/orders",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const status = String(req.query.status || "").trim();
      const search = String(req.query.search || "").trim();

      const orders = await prisma.order.findMany({
        where: {
          ...(status
            ? {
                status: status as any,
              }
            : {}),

          ...(search
            ? {
                OR: [
                  {
                    id: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    consumer: {
                      name: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                  {
                    consumer: {
                      email: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                  {
                    items: {
                      some: {
                        product: {
                          name: {
                            contains: search,
                            mode: "insensitive",
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          consumer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              photoUrl: true,
            },
          },

          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  variety: true,
                  unit: true,
                  imageUrl: true,
                  pricePaise: true,
                  farmer: {
                    select: {
                      id: true,
                      farmName: true,
                      district: true,
                      state: true,
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },

              society: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  district: true,
                  state: true,
                },
              },
            },
          },

          payments: {
            select: {
              id: true,
              provider: true,
              providerOrder: true,
              providerPayId: true,
              amountPaise: true,
              currency: true,
              method: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },

            orderBy: {
              createdAt: "desc",
            },
          },

          bookings: {
            select: {
              id: true,
              status: true,
              fulfillmentChannel: true,
              pickup: true,
              quantity: true,
              vehicle: true,
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              farmer: {
                select: {
                  id: true,
                  farmName: true,
                  district: true,
                  state: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              society: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  district: true,
                  state: true,
                },
              },
              acceptedAt: true,
              farmerReadyAt: true,
              pickedUpAt: true,
              inTransitAt: true,
              deliveredAt: true,
              currentLat: true,
              currentLng: true,
              locationUpdatedAt: true,
              createdAt: true,
              updatedAt: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      const summary = {
        total: orders.length,

        pendingPayment: orders.filter(
          (order) => order.status === "PENDING_PAYMENT",
        ).length,

        paid: orders.filter(
          (order) =>
            order.status === "PAID" ||
            order.status === "ACCEPTED" ||
            order.status === "PREPARING",
        ).length,

        preparing: orders.filter(
          (order) => order.status === "PREPARING",
        ).length,

        readyForPickup: orders.filter(
          (order) => order.status === "READY_FOR_PICKUP",
        ).length,

        pickedUp: orders.filter(
          (order) => order.status === "PICKED_UP",
        ).length,

        inTransit: orders.filter(
          (order) => order.status === "IN_TRANSIT",
        ).length,

        outForDelivery: orders.filter(
          (order) => order.status === "OUT_FOR_DELIVERY",
        ).length,

        delivered: orders.filter(
          (order) => order.status === "DELIVERED",
        ).length,

        cancelled: orders.filter(
          (order) => order.status === "CANCELLED",
        ).length,

        failed: orders.filter(
          (order) => order.status === "FAILED",
        ).length,

        capturedPayments: orders.reduce(
          (sum, order) =>
            sum +
            order.payments
              .filter((payment) => payment.status === "CAPTURED")
              .reduce(
                (paymentSum, payment) =>
                  paymentSum + payment.amountPaise,
                0,
              ),
          0,
        ),

        orderValuePaise: orders.reduce(
          (sum, order) => sum + order.totalPaise,
          0,
        ),
      };

      res.json({
        orders,
        summary,
      });
    } catch (error) {
      console.error("GET /api/admin/orders", error);

      res.status(500).json({
        error: "Failed to load admin orders",
        code: 500,
      });
    }
  },
);
app.get("/api/admin/farmers", auth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const farmers = await prisma.farmerProfile.findMany({
      orderBy: {
        farmName: "asc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photoUrl: true,
            createdAt: true,
          },
        },
        products: {
          where: {
            active: true,
          },
          select: {
            id: true,
            name: true,
            variety: true,
            unit: true,
            pricePaise: true,
            imageUrl: true,
          },
        },
        inventory: {
          select: {
            available: true,
            reserved: true,
            sold: true,
          },
        },
        societyMemberships: {
          where: {
            active: true,
            society: {
              active: true,
            },
          },
          include: {
            society: {
              select: {
                id: true,
                name: true,
                code: true,
                district: true,
                state: true,
                pinCode: true,
                verified: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });

app.get("/api/admin/inventory", auth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        farmer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                photoUrl: true,
              },
            },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        inventory: {
          select: {
            available: true,
            reserved: true,
            sold: true,
            updatedAt: true,
          },
        },
        societyInventory: {
          include: {
            society: {
              select: {
                id: true,
                name: true,
                code: true,
                district: true,
                state: true,
                pinCode: true,
                active: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
      },
    });

    const result = products.map((product) => {
      const farmerStock = {
        available: product.inventory?.available ?? 0,
        reserved: product.inventory?.reserved ?? 0,
        sold: product.inventory?.sold ?? 0,
      };

      const societyStock = product.societyInventory.reduce(
        (totals, row) => ({
          available: totals.available + row.available,
          reserved: totals.reserved + row.reserved,
          sold: totals.sold + row.sold,
        }),
        {
          available: 0,
          reserved: 0,
          sold: 0,
        },
      );

      return {
        id: product.id,
        name: product.name,
        variety: product.variety,
        description: product.description,
        unit: product.unit,
        pricePaise: product.pricePaise,
        imageUrl: product.imageUrl,
        organic: product.organic,
        category: product.category,

        farmer: {
          id: product.farmer.id,
          farmName: product.farmer.farmName,
          district: product.farmer.district,
          state: product.farmer.state,
          pinCode: product.farmer.pinCode,
          location: product.farmer.location,
          user: product.farmer.user,
        },

        farmerStock,

        societyStock,

        totalStock: {
          available:
            farmerStock.available + societyStock.available,
          reserved:
            farmerStock.reserved + societyStock.reserved,
          sold:
            farmerStock.sold + societyStock.sold,
        },

        societies: product.societyInventory.map((row) => ({
          id: row.id,
          available: row.available,
          reserved: row.reserved,
          sold: row.sold,
          updatedAt: row.updatedAt,
          society: row.society,
        })),

        inventoryUpdatedAt:
          product.inventory?.updatedAt ?? null,
      };
    });

    const totals = result.reduce(
      (summary, product) => ({
        products: summary.products + 1,

        available:
          summary.available +
          product.totalStock.available,

        reserved:
          summary.reserved +
          product.totalStock.reserved,

        sold:
          summary.sold +
          product.totalStock.sold,
      }),
      {
        products: 0,
        available: 0,
        reserved: 0,
        sold: 0,
      },
    );

    res.json({
      products: result,
      totals,
    });
  } catch (error) {
    console.error("GET /api/admin/inventory", error);

    res.status(500).json({
      error: "Failed to load admin inventory",
      code: 500,
    });
  }
});

    const result = farmers.map((farmer) => {
      const inventory = farmer.inventory.reduce(
        (totals, row) => ({
          available: totals.available + row.available,
          reserved: totals.reserved + row.reserved,
          sold: totals.sold + row.sold,
        }),
        {
          available: 0,
          reserved: 0,
          sold: 0,
        },
      );

      return {
        id: farmer.id,
        user: farmer.user,
        farmName: farmer.farmName,
        district: farmer.district,
        state: farmer.state,
        pinCode: farmer.pinCode,
        location: farmer.location,
        lat: farmer.lat,
        lng: farmer.lng,
        categories: farmer.categories,
        details: farmer.details,
        verified: farmer.verified,
        products: farmer.products,
        inventory,
        societies: farmer.societyMemberships.map((membership) => ({
          membershipId: membership.id,
          joinedAt: membership.joinedAt,
          society: membership.society,
        })),
      };
    });

    res.json({
      farmers: result,
      total: result.length,
    });
  } catch (error) {
    console.error("GET /api/admin/farmers", error);

    res.status(500).json({
      error: "Failed to load admin farmers",
      code: 500,
    });
  }
});
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error", code: 500 });
});

const httpServer = createServer(app);
attachIo(httpServer);

httpServer.listen(env.port, () => {
  console.log(`farm2fork API on :${env.port}`);
  if (env.dataGovKey) {
    ingestMarket().catch((e) => console.warn("market ingest", e));
  }
});
