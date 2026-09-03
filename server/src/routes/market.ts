import { Router } from "express";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { predictFromSeries } from "../lib/predict.js";
import { env } from "../env.js";
import { notify } from "../lib/notify.js";
import { AgmarknetProvider } from "../services/marketData/index.js";

export const marketRouter = Router();

marketRouter.get("/", async (req, res) => {
  const commodity = String(req.query.commodity || "");
  const where = commodity ? { commodity: { equals: commodity, mode: "insensitive" as const } } : {};
  const latest = await prisma.marketPrice.findMany({
    where,
    orderBy: { observedAt: "desc" },
    take: 40,
  });
  res.json({
    prices: latest,
    disclaimer: latest[0]?.liveFeed
      ? "Near-real-time feed from configured government API"
      : "Demo Market Dataset — not live government data",
  });
});

marketRouter.get("/history", async (req, res) => {
  const commodity = String(req.query.commodity || "Tomato");
  const days = Number(req.query.days || 30);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = await prisma.priceHistory.findMany({
    where: { commodity, dataDate: { gte: since } },
    orderBy: { dataDate: "asc" },
  });
  const modal = rows.map((r) => r.modalPaise);
  const avg = modal.length ? Math.round(modal.reduce((a, b) => a + b, 0) / modal.length) : 0;
  res.json({
    rows,
    stats: {
      average: avg,
      min: modal.length ? Math.min(...modal) : 0,
      max: modal.length ? Math.max(...modal) : 0,
      current: modal.at(-1) || 0,
    },
    source: rows[0]?.source || null,
  });
});

marketRouter.get("/prediction", async (req, res) => {
  const commodity = String(req.query.commodity || "Tomato");
  const rows = await prisma.priceHistory.findMany({
    where: { commodity },
    orderBy: { dataDate: "asc" },
  });
  const pred = predictFromSeries(rows.map((r) => r.modalPaise));
  if (!pred.ok) return res.json({ ok: false, message: pred.message, generatedAt: new Date().toISOString() });
  const saved = await prisma.aIPricePrediction.create({
    data: {
      commodity,
      market: rows.at(-1)?.market || "unknown",
      lowPaise: pred.low,
      highPaise: pred.high,
      trend: pred.trend,
      confidence: pred.confidence,
      method: pred.method,
      sampleSize: pred.sampleSize,
      recommendation: pred.recommendation,
    },
  });
  res.json({
    ok: true,
    prediction: saved,
    basedOn: ["Historical market prices", "Recent price trend", "Commodity", "Market", "Season index in OLS"],
    generatedAt: saved.createdAt,
  });
});

marketRouter.post("/ingest", auth, requireRole("ADMIN"), async (_req, res) => {
  const result = await ingestMarket();
  res.json(result);
});

export async function ingestMarket() {
  if (env.dataGovKey) {
    const provider = new AgmarknetProvider(env.dataGovKey);
    const rows = await provider.fetchLatest();
    let n = 0;
    for (const rec of rows) {
      const min = Math.round(rec.minPrice * 100);
      const max = Math.round(rec.maxPrice * 100);
      const modalPaise = Math.round(rec.modalPrice * 100);
      const dataDate = new Date(rec.observedAt);
      await prisma.marketPrice.create({
        data: {
          commodity: rec.commodity,
          market: rec.market,
          state: rec.state,
          district: rec.district,
          minPaise: min,
          maxPaise: max,
          modalPaise,
          unit: rec.unit,
          source: rec.source,
          dataDate,
          liveFeed: rec.liveFeed,
        },
      });
      await prisma.priceHistory.create({
        data: {
          commodity: rec.commodity,
          market: rec.market,
          state: rec.state,
          district: rec.district,
          minPaise: min,
          maxPaise: max,
          modalPaise,
          dataDate,
          source: rec.source,
        },
      });
      n += 1;
    }
    await firePriceAlerts();
    return { ok: true, inserted: n, source: "data.gov.in Agmarknet" };
  }
  return { ok: true, inserted: 0, source: "Demo Market Dataset", note: "DATA_GOV_API_KEY not set; demo rows come from seed only." };
}

async function firePriceAlerts() {
  const alerts = await prisma.priceAlert.findMany({ where: { active: true } });
  for (const a of alerts) {
    const latest = await prisma.marketPrice.findFirst({
      where: { commodity: { equals: a.commodity, mode: "insensitive" } },
      orderBy: { observedAt: "desc" },
    });
    if (latest && latest.modalPaise >= a.abovePaise) {
      await notify(
        a.userId,
        "PRICE_ALERT",
        `${a.commodity} crossed your threshold`,
        `Modal ₹${(latest.modalPaise / 100).toFixed(2)} from ${latest.source}`
      );
    }
  }
}

marketRouter.post("/alerts", auth, requireRole("FARMER"), async (req, res) => {
  const commodity = String(req.body.commodity || "");
  const above = Math.round(Number(req.body.above || 0) * 100);
  if (!commodity || !above) return res.status(422).json({ error: "commodity and above required", code: 422 });
  const row = await prisma.priceAlert.create({
    data: { userId: req.user!.id, commodity, abovePaise: above },
  });
  res.status(201).json({ alert: row });
});
