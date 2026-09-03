import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { emitEvent } from "../socket.js";
import { notify } from "../lib/notify.js";

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 6_000_000 } });

export const productRouter = Router();

productRouter.get("/categories", async (_req, res) => {
  const categories = await prisma.productCategory.findMany({ orderBy: { name: "asc" } });
  res.json({ categories });
});

productRouter.get("/mine", auth, requireRole("FARMER"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!farmer) return res.status(404).json({ error: "Farmer profile missing", code: 404 });
  const products = await prisma.product.findMany({
    where: { farmerId: farmer.id },
    include: { inventory: true, category: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ products });
});

productRouter.get("/", async (req, res) => {
  const q = String(req.query.q || "");
  const category = String(req.query.category || "");
  const organic = req.query.organic === "true";
  const sort = String(req.query.sort || "newest");
  const where = {
    active: true,
    ...(category ? { category: { slug: category } } : {}),
    ...(organic ? { organic: true } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { variety: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const products = await prisma.product.findMany({
    where,
    include: {
      farmer: { include: { user: { select: { name: true } } } },
      category: true,
      inventory: true,
      reviews: true,
    },
    orderBy:
      sort === "price_asc"
        ? { pricePaise: "asc" }
        : sort === "price_desc"
          ? { pricePaise: "desc" }
          : { createdAt: "desc" },
  });
  res.json({
    products: products.map((p) => ({
      ...p,
      rating:
        p.reviews.length === 0
          ? null
          : p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length,
    })),
  });
});

productRouter.get("/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: String(req.params.id) },
    include: {
      farmer: { include: { user: { select: { name: true, photoUrl: true } } } },
      category: true,
      inventory: true,
      priceLogs: { orderBy: { createdAt: "desc" }, take: 30 },
      reviews: true,
    },
  });
  if (!product) return res.status(404).json({ error: "Not found", code: 404 });
  res.json({ product });
});

productRouter.post("/", auth, requireRole("FARMER"), upload.single("image"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!farmer) return res.status(404).json({ error: "Farmer profile missing", code: 404 });
  const {
    name,
    categoryId,
    variety,
    quantity,
    unit,
    price,
    harvestDate,
    availableFrom,
    organic,
    description,
    minQty,
    maxQty,
  } = req.body || {};
  if (!name || !categoryId || !unit || price == null || quantity == null) {
    return res.status(422).json({ error: "Missing product fields", code: 422 });
  }
  const pricePaise = Math.round(Number(price) * 100);
  const qty = Number(quantity);
  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        farmerId: farmer.id,
        categoryId: String(categoryId),
        name: String(name),
        variety: variety || null,
        description: description || null,
        unit: String(unit),
        pricePaise,
        organic: organic === "true" || organic === true,
        harvestDate: harvestDate ? new Date(harvestDate) : null,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        minQty: minQty ? Number(minQty) : 1,
        maxQty: maxQty ? Number(maxQty) : null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      },
    });
    await tx.inventory.create({
      data: {
        productId: p.id,
        farmerId: farmer.id,
        available: qty,
      },
    });
    await tx.productPriceLog.create({
      data: { productId: p.id, pricePaise },
    });
    return p;
  });
  emitEvent("INVENTORY_UPDATED", { productId: product.id });
  res.status(201).json({ product });
});

productRouter.put("/:id", auth, requireRole("FARMER"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  const existing = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
  if (!existing || !farmer || existing.farmerId !== farmer.id) {
    return res.status(403).json({ error: "Cannot edit another farmer's product", code: 403 });
  }
  const pricePaise =
    req.body.price != null ? Math.round(Number(req.body.price) * 100) : undefined;
  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.update({
      where: { id: existing.id },
      data: {
        name: req.body.name || undefined,
        description: req.body.description || undefined,
        active: req.body.active === undefined ? undefined : Boolean(req.body.active),
        pricePaise,
      },
    });
    if (pricePaise != null && pricePaise !== existing.pricePaise) {
      await tx.productPriceLog.create({ data: { productId: p.id, pricePaise } });
      await notify(req.user!.id, "PRICE_UPDATED", "Price changed", `${p.name} is now ₹${(pricePaise / 100).toFixed(2)}`);
    }
    if (req.body.quantity != null) {
      await tx.inventory.update({
        where: { productId: p.id },
        data: { available: Number(req.body.quantity) },
      });
    }
    return p;
  });
  emitEvent("PRICE_UPDATED", { productId: product.id });
  res.json({ product });
});

productRouter.post("/:id/deactivate", auth, requireRole("FARMER"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  const existing = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
  if (!existing || !farmer || existing.farmerId !== farmer.id) {
    return res.status(403).json({ error: "Cannot edit another farmer's product", code: 403 });
  }
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { active: false },
  });
  res.json({ product });
});
