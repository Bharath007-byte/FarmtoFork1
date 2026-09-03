import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { OrderStatus } from "@prisma/client";

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 5_000_000 } });

export const farmerRouter = Router();

farmerRouter.get("/me", auth, requireRole("FARMER", "ADMIN"), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { farmer: true },
  });
  res.json({ user });
});

farmerRouter.put("/me", auth, requireRole("FARMER"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!farmer) return res.status(404).json({ error: "Farmer profile missing", code: 404 });
  const { farmName, location, district, state, pinCode, details, name, phone } = req.body || {};
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: name || undefined,
        phone: phone || undefined,
      },
    }),
    prisma.farmerProfile.update({
      where: { id: farmer.id },
      data: {
        farmName: farmName || undefined,
        location: location || undefined,
        district: district || undefined,
        state: state || undefined,
        pinCode: pinCode || undefined,
        details: details || undefined,
      },
    }),
  ]);
  res.json({ ok: true, user });
});

farmerRouter.post("/me/photo", auth, requireRole("FARMER"), upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(422).json({ error: "photo required", code: 422 });
  const photoUrl = `/uploads/${req.file.filename}`;
  await prisma.user.update({ where: { id: req.user!.id }, data: { photoUrl } });
  res.json({ photoUrl });
});

farmerRouter.get("/me/stats", auth, requireRole("FARMER"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!farmer) return res.status(404).json({ error: "Farmer profile missing", code: 404 });
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const items = await prisma.orderItem.findMany({
    where: { farmerId: farmer.id },
    include: { order: true },
  });
  const paidish: OrderStatus[] = [
    OrderStatus.PAID,
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.PICKED_UP,
    OrderStatus.IN_TRANSIT,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
  ];
  const todaySales = items
    .filter((i) => paidish.includes(i.order.status) && i.order.createdAt >= start)
    .reduce((s, i) => s + i.linePaise, 0);
  const pendingOrders = new Set(
    items.filter((i) => {
      const pending: OrderStatus[] = [
        OrderStatus.PAID,
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.COD_PENDING,
      ];
      return pending.includes(i.order.status);
    }).map((i) => i.orderId)
  ).size;
  const completedOrders = new Set(
    items.filter((i) => i.order.status === OrderStatus.DELIVERED).map((i) => i.orderId)
  ).size;
  const grossCompleted = items
    .filter((i) => i.order.status === OrderStatus.DELIVERED)
    .reduce((s, i) => s + i.linePaise, 0);
  const pendingEarn = items
    .filter((i) => paidish.includes(i.order.status) && i.order.status !== OrderStatus.DELIVERED)
    .reduce((s, i) => s + i.linePaise, 0);
  const fees = items
    .filter((i) => i.order.status === OrderStatus.DELIVERED)
    .reduce((s, i) => s + Math.round((i.order.platformFeePaise + i.order.logisticsPaise) * (i.linePaise / Math.max(1, i.order.totalPaise))), 0);
  const net = Math.max(0, grossCompleted - fees);
  const products = await prisma.product.count({ where: { farmerId: farmer.id, active: true } });
  const inv = await prisma.inventory.aggregate({
    where: { farmerId: farmer.id },
    _sum: { available: true },
  });
  res.json({
    todaySalesPaise: todaySales,
    totalEarningsPaise: net,
    pendingEarningsPaise: pendingEarn,
    pendingOrders,
    completedOrders,
    activeProducts: products,
    availableInventory: inv._sum.available || 0,
  });
});

farmerRouter.get("/me/earnings", auth, requireRole("FARMER"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!farmer) return res.status(404).json({ error: "Farmer profile missing", code: 404 });
  const items = await prisma.orderItem.findMany({
    where: { farmerId: farmer.id },
    include: { order: true, product: true },
    orderBy: { order: { createdAt: "desc" } },
  });
  const rows = items.map((i) => ({
    orderId: i.orderId,
    product: i.product.name,
    qty: i.qty,
    amountPaise: i.linePaise,
    status: i.order.status,
    createdAt: i.order.createdAt,
  }));
  res.json({ rows });
});

farmerRouter.get("/me/inventory", auth, requireRole("FARMER"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!farmer) return res.status(404).json({ error: "Farmer profile missing", code: 404 });
  const rows = await prisma.inventory.findMany({
    where: { farmerId: farmer.id },
    include: { product: { include: { category: true } } },
  });
  const markets = await prisma.marketPrice.findMany({
    orderBy: { observedAt: "desc" },
    take: 80,
  });
  res.json({
    rows: rows.map((r) => {
      const m = markets.find(
        (x) => x.commodity.toLowerCase() === r.product.name.toLowerCase()
      );
      return {
        productId: r.productId,
        product: r.product.name,
        category: r.product.category.name,
        available: r.available,
        reserved: r.reserved,
        sold: r.sold,
        unit: r.product.unit,
        pricePaise: r.product.pricePaise,
        marketPaise: m?.modalPaise ?? null,
        marketSource: m?.source ?? null,
        active: r.product.active,
      };
    }),
  });
});

farmerRouter.get("/nearby", auth, requireRole("FARMER"), async (req, res) => {
  const me = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  const farmers = await prisma.farmerProfile.findMany({
    where: me ? { district: me.district, NOT: { id: me.id } } : undefined,
    include: { user: { select: { id: true, name: true, photoUrl: true } } },
    take: 50,
  });
  res.json({ farmers });
});
