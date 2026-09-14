import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
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
import { logisticsRegistrationRouter } from "./routes/logisticsRegistration.js";
import { aiProduceRouter } from "./routes/aiProduceGrading.js";
import { aiAgricultureRouter } from "./routes/aiAgriculture.js";
import { mandiForecastRouter } from "./routes/mandiForecast.js";
import { krishiAiRouter } from "./routes/krishiAiSuite.js";
import { auth, requireRole } from "./middleware/auth.js";
import { autoSeedIfEmpty } from "./seedData.js";

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        env.corsOrigins.includes(origin) ||
        origin.endsWith(".github.io") ||
        origin.endsWith(".onrender.com") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
  })
);

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
app.use("/api/mandi-forecast", mandiForecastRouter);
app.use("/api/ai", aiProduceRouter);
app.use("/api/ai", aiAgricultureRouter);
app.use("/api/krishi-ai", krishiAiRouter);
app.get("/api/ai/price-prediction", (req, res) => {
  const q = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(307, `/api/market-prices/prediction${q ? `?${q}` : ""}`);
});
app.use("/api/logistics", logisticsRegistrationRouter);
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

app.get("/api/admin/waste-analytics", auth, requireRole("ADMIN", "FARMER"), async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: true,
        inventory: true,
        farmer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        societyInventory: {
          include: {
            society: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const wasteRows = products.map((product) => {
      const available = product.inventory?.available ?? 0;
      const reserved = product.inventory?.reserved ?? 0;
      const sold = product.inventory?.sold ?? 0;
      const harvestedKg = available + reserved + sold;
      const leftoverKg = available;
      const inTransitKg = reserved;

      const catSlug = product.category.slug.toLowerCase();
      const catName = product.category.name.toLowerCase();

      // Perishability calculation based on produce type
      let shelfLifeDays = 7;
      if (catSlug.includes("leafy") || catName.includes("leafy") || catName.includes("greens")) {
        shelfLifeDays = 3;
      } else if (catSlug.includes("dairy") || catName.includes("dairy") || catName.includes("egg")) {
        shelfLifeDays = 4;
      } else if (catSlug.includes("veg") || catName.includes("vegetable")) {
        shelfLifeDays = 6;
      } else if (catSlug.includes("fruit") || catName.includes("fruit")) {
        shelfLifeDays = 9;
      } else if (catSlug.includes("grain") || catSlug.includes("pulse") || catSlug.includes("staple") || catSlug.includes("spice")) {
        shelfLifeDays = 180;
      }

      // Age calculation
      const lastUpdate = product.inventory?.updatedAt ? new Date(product.inventory.updatedAt) : new Date();
      const ageHours = Math.max(1, Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)));
      const ageDays = Math.max(0.5, +(ageHours / 24).toFixed(1));

      // Waste Risk scoring: 0 - 100
      let baseScore = Math.round((ageDays / shelfLifeDays) * 100);
      if (shelfLifeDays > 30) {
        baseScore = Math.min(20, Math.round(baseScore * 0.1));
      }
      if (available === 0) {
        baseScore = 5;
      }
      const score = Math.min(98, Math.max(10, baseScore));
      const approaching = score >= 50 && available > 0;

      let reason = `Produce age ~${ageDays} days vs ${shelfLifeDays}-day shelf life (${product.category.name}).`;
      let action = "Standard retail distribution on track.";

      if (approaching) {
        if (available > 100) {
          reason = `Surplus ${available} kg perishable ${product.name} nearing ${Math.round((ageDays / shelfLifeDays) * 100)}% of shelf limit.`;
          action = `Transfer bulk lot to cooperative cold-storage hub or dispatch at 25% flash-sale discount.`;
        } else {
          reason = `Stock aging: ${available} kg remaining at ${product.farmer.farmName}.`;
          action = `Trigger consumer notification for local area instant delivery.`;
        }
      } else if (available === 0) {
        reason = `Zero inventory at farm gate; 100% sold/dispatched.`;
        action = `Replenish listing or schedule next harvesting batch.`;
      }

      return {
        id: product.id,
        listingId: product.id,
        name: product.name,
        variety: product.variety,
        category: product.category.name,
        farmName: product.farmer.farmName,
        district: product.farmer.district,
        harvestedKg,
        soldKg: sold,
        inTransitKg,
        leftoverKg,
        shelfLifeDays,
        score,
        approaching,
        reason,
        action,
        origin: "PostgreSQL Inventory & AI Model",
      };
    });

    // Summary calculations
    const totalHarvestedKg = wasteRows.reduce((sum, r) => sum + r.harvestedKg, 0);
    const totalSoldKg = wasteRows.reduce((sum, r) => sum + r.soldKg, 0);
    const totalLeftoverKg = wasteRows.reduce((sum, r) => sum + r.leftoverKg, 0);
    const highRiskLots = wasteRows.filter((r) => r.approaching && r.leftoverKg > 0);
    const atRiskKg = highRiskLots.reduce((sum, r) => sum + r.leftoverKg, 0);

    res.json({
      waste: wasteRows,
      summary: {
        totalHarvestedKg,
        totalSoldKg,
        totalLeftoverKg,
        atRiskKg,
        highRiskCount: highRiskLots.length,
        savedRatePct: totalHarvestedKg > 0 ? Math.round((totalSoldKg / totalHarvestedKg) * 100) : 100,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/waste-analytics error:", error);
    res.status(500).json({
      error: "Failed to calculate food-waste analytics",
      code: 500,
    });
  }
});

// Trigger-seed endpoint for admin or manual testing
app.post("/api/admin/trigger-seed", async (_req, res) => {
  try {
    await autoSeedIfEmpty();
    res.json({ ok: true, message: "Database seeding completed successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to seed database" });
  }
});

// Explicitly serve product images directly
const candidateProductDirs = [
  path.resolve(process.cwd(), "../frontend/public/products"),
  path.resolve(process.cwd(), "frontend/public/products"),
  path.resolve(process.cwd(), "../frontend/dist/products"),
  path.resolve(process.cwd(), "frontend/dist/products"),
];

for (const pDir of candidateProductDirs) {
  if (fs.existsSync(pDir)) {
    app.use("/products", express.static(pDir));
    app.use("/FarmtoFork1/products", express.static(pDir));
    break;
  }
}

// Serve frontend SPA bundle when built
const candidateDistPaths = [
  path.resolve(process.cwd(), "../frontend/dist"),
  path.resolve(process.cwd(), "frontend/dist"),
  path.resolve(process.cwd(), "dist/frontend"),
];

for (const distPath of candidateDistPaths) {
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use("/FarmtoFork1", express.static(distPath));
    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/uploads") ||
        req.path.startsWith("/socket.io")
      ) {
        return next();
      }
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
    break;
  }
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error", code: 500 });
});

const httpServer = createServer(app);
attachIo(httpServer);

httpServer.listen(env.port, "0.0.0.0", () => {
  console.log(`farm2fork API on 0.0.0.0:${env.port}`);
  if (env.dataGovKey) {
    ingestMarket().catch((e) => console.warn("market ingest", e));
  }
  // Auto-seed demo database in background after port 10000 has bound
  autoSeedIfEmpty().catch((err) => console.warn("auto-seed error:", err));
});
