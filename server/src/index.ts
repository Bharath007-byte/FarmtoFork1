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

app.get("/api/admin/overview", auth, requireRole("ADMIN"), async (_req, res) => {
  const [farmers, consumers, products, orders] = await Promise.all([
    prisma.user.count({ where: { role: "FARMER" } }),
    prisma.user.count({ where: { role: "CONSUMER" } }),
    prisma.product.count(),
    prisma.order.count(),
  ]);
  const paid = await prisma.payment.count({ where: { status: "CAPTURED" } });
  res.json({ farmers, consumers, products, orders, capturedPayments: paid });
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
