import { Router } from "express";
import Razorpay from "razorpay";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { emitEvent } from "../socket.js";
import { notify } from "../lib/notify.js";
import { env } from "../env.js";
import { issueOtp, consumeOtp } from "../lib/otp.js";
import { razorpaySignature } from "../lib/predict.js";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { turnstileGuard } from "../lib/turnstile.js";

export const commerceRouter = Router();

commerceRouter.get("/cart", auth, async (req, res) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.user!.id },
    include: { product: { include: { inventory: true, farmer: { include: { user: { select: { name: true } } } } } } },
  });
  res.json({ items });
});

commerceRouter.post("/cart", auth, async (req, res) => {
  const productId = String(req.body.productId || "");
  const qty = Number(req.body.qty || 1);
  if (qty <= 0) {
    await prisma.cartItem.deleteMany({
      where: { userId: req.user!.id, productId },
    });
    return res.json({ item: null });
  }
  const inv = await prisma.inventory.findUnique({ where: { productId } });
  if (!inv || inv.available < qty) {
    return res.status(409).json({ error: "Not enough inventory", code: 409 });
  }
  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId: req.user!.id, productId } },
    create: { userId: req.user!.id, productId, qty },
    update: { qty },
  });
  res.json({ item });
});

commerceRouter.post("/orders", auth, requireRole("CONSUMER"), turnstileGuard, async (req, res) => {
  const method = String(req.body.paymentMethod || "ONLINE");
  const addressId = req.body.addressId ? String(req.body.addressId) : null;
  const cart = await prisma.cartItem.findMany({
    where: { userId: req.user!.id },
    include: { product: { include: { inventory: true } } },
  });
  if (!cart.length) return res.status(422).json({ error: "Cart empty", code: 422 });

  try {
    const order = await prisma.$transaction(async (tx) => {
      let total = 0;
      for (const line of cart) {
        const inv = line.product.inventory;
        if (!inv || inv.available < line.qty) {
          throw Object.assign(new Error("Not enough inventory"), { code: 409 });
        }
        total += Math.round(line.qty * line.product.pricePaise);
      }
      const created = await tx.order.create({
        data: {
          consumerId: req.user!.id,
          addressId,
          paymentMethod: method,
          status: method === "COD" ? OrderStatus.COD_PENDING : OrderStatus.PENDING_PAYMENT,
          totalPaise: total,
          platformFeePaise: Math.round(total * 0.03),
          items: {
            create: cart.map((line) => ({
              productId: line.productId,
              qty: line.qty,
              unitPaise: line.product.pricePaise,
              linePaise: Math.round(line.qty * line.product.pricePaise),
              farmerId: line.product.farmerId,
            })),
          },
        },
        include: { items: true },
      });
      for (const line of cart) {
        const updated = await tx.inventory.updateMany({
          where: { productId: line.productId, available: { gte: line.qty } },
          data: {
            available: { decrement: line.qty },
            reserved: { increment: line.qty },
          },
        });
        if (updated.count !== 1) {
          throw Object.assign(new Error("Not enough inventory"), { code: 409 });
        }
      }
      await tx.cartItem.deleteMany({ where: { userId: req.user!.id } });
      return created;
    });

    emitEvent("ORDER_CREATED", { orderId: order.id });
    for (const item of order.items) {
      const farmer = await prisma.farmerProfile.findUnique({ where: { id: item.farmerId } });
      if (farmer) await notify(farmer.userId, "NEW_ORDER", "New order", `Order ${order.id}`);
    }

    if (method === "COD") {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      const otp = await issueOtp({
        userId: user!.id,
        channel: user!.phone || user!.email,
        purpose: `cod:${order.id}`,
      });
      return res.status(201).json({
        order,
        otpId: otp.id,
        delivery: otp.delivery,
        message: "COD verification pending",
      });
    }

    res.status(201).json({ order });
  } catch (err) {
    const e = err as Error & { code?: number };
    if (e.code === 409) return res.status(409).json({ error: e.message, code: 409 });
    throw err;
  }
});

commerceRouter.post("/orders/:id/cod-verify", auth, async (req, res) => {
  const ok = await consumeOtp(String(req.body.otpId || ""), String(req.body.code || ""));
  if (!ok.ok) return res.status(400).json({ error: ok.error, code: 400 });
  const order = await prisma.order.findFirst({
    where: { id: String(req.params.id), consumerId: req.user!.id },
  });
  if (!order) return res.status(404).json({ error: "Not found", code: 404 });
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.PAID },
  });
  emitEvent("ORDER_STATUS_CHANGED", { orderId: updated.id, status: updated.status });
  res.json({ order: updated });
});

commerceRouter.get("/orders", auth, async (req, res) => {
  if (req.user!.role === "FARMER") {
    const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
    const items = await prisma.orderItem.findMany({
      where: { farmerId: farmer?.id || "" },
      include: { order: { include: { items: true, consumer: { select: { name: true } } } }, product: true },
    });
    return res.json({ orders: items.map((i) => i.order) });
  }
  const orders = await prisma.order.findMany({
    where: { consumerId: req.user!.id },
    include: { items: { include: { product: true } }, payments: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
});

commerceRouter.post("/orders/:id/status", auth, requireRole("FARMER", "LOGISTICS", "ADMIN"), async (req, res) => {
  const status = req.body.status as OrderStatus;
  const order = await prisma.order.update({
    where: { id: String(req.params.id) },
    data: { status },
    include: { items: true },
  });
  if (status === OrderStatus.DELIVERED) {
    for (const item of order.items) {
      await prisma.inventory.update({
        where: { productId: item.productId },
        data: { reserved: { decrement: item.qty }, sold: { increment: item.qty } },
      });
    }
  }
  if (status === OrderStatus.CANCELLED) {
    for (const item of order.items) {
      await prisma.inventory.update({
        where: { productId: item.productId },
        data: { reserved: { decrement: item.qty }, available: { increment: item.qty } },
      });
    }
  }
  await notify(order.consumerId, "ORDER_STATUS", "Order update", `${order.id} is ${status}`);
  emitEvent("ORDER_STATUS_CHANGED", { orderId: order.id, status });
  res.json({ order });
});

commerceRouter.post("/payments/create", auth, async (req, res) => {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    return res.status(503).json({
      error: "Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      code: 503,
    });
  }
  const orderId = String(req.body.orderId || "");
  const order = await prisma.order.findFirst({
    where: { id: orderId, consumerId: req.user!.id },
  });
  if (!order) return res.status(404).json({ error: "Order not found", code: 404 });
  const rz = new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });
  const rzOrder = await rz.orders.create({
    amount: order.totalPaise,
    currency: "INR",
    receipt: order.id,
  });
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: "razorpay",
      providerOrder: rzOrder.id,
      amountPaise: order.totalPaise,
      status: PaymentStatus.CREATED,
    },
  });
  res.json({
    keyId: env.razorpayKeyId,
    razorpayOrderId: rzOrder.id,
    amount: order.totalPaise,
    paymentId: payment.id,
  });
});

commerceRouter.post("/payments/verify", auth, async (req, res) => {
  if (!env.razorpayKeySecret) {
    return res.status(503).json({ error: "Razorpay secret missing", code: 503 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body || {};
  const expected = razorpaySignature(
    String(razorpay_order_id),
    String(razorpay_payment_id),
    env.razorpayKeySecret
  );
  if (expected !== String(razorpay_signature)) {
    return res.status(400).json({ error: "Invalid payment signature", code: 400 });
  }
  const payment = await prisma.payment.findFirst({
    where: { providerOrder: String(razorpay_order_id) },
  });
  if (!payment) return res.status(404).json({ error: "Payment record missing", code: 404 });
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPayId: String(razorpay_payment_id),
        signature: String(razorpay_signature),
        status: PaymentStatus.CAPTURED,
      },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PAID },
    }),
  ]);
  emitEvent("PAYMENT_CONFIRMED", { orderId: payment.orderId });
  const order = await prisma.order.findUnique({ where: { id: payment.orderId }, include: { items: true } });
  if (order) {
    await notify(order.consumerId, "PAYMENT_SUCCESS", "Payment confirmed", order.id);
    for (const item of order.items) {
      const farmer = await prisma.farmerProfile.findUnique({ where: { id: item.farmerId } });
      if (farmer) await notify(farmer.userId, "PAYMENT_SUCCESS", "Order paid", order.id);
    }
  }
  res.json({ ok: true, orderId: orderId || payment.orderId });
});

commerceRouter.post("/payments/webhook", async (req, res) => {
  if (!env.razorpayKeySecret) return res.status(503).end();
  const sig = req.headers["x-razorpay-signature"];
  const crypto = await import("node:crypto");
  const body = JSON.stringify(req.body);
  const expected = crypto.createHmac("sha256", env.razorpayKeySecret).update(body).digest("hex");
  if (expected !== sig) return res.status(400).json({ error: "bad webhook signature" });
  res.json({ ok: true });
});

commerceRouter.post("/addresses", auth, async (req, res) => {
  const { line1, city, district, state, pinCode, phone } = req.body || {};
  if (!line1 || !city || !state || !pinCode) {
    return res.status(422).json({ error: "Incomplete address", code: 422 });
  }
  const address = await prisma.address.create({
    data: {
      userId: req.user!.id,
      line1,
      city,
      district: district || city,
      state,
      pinCode,
      phone,
    },
  });
  res.status(201).json({ address });
});

commerceRouter.get("/addresses", auth, async (req, res) => {
  const addresses = await prisma.address.findMany({ where: { userId: req.user!.id } });
  res.json({ addresses });
});

commerceRouter.post("/reviews", auth, requireRole("CONSUMER"), async (req, res) => {
  const productId = String(req.body.productId || "");
  const rating = Number(req.body.rating || 0);
  if (rating < 1 || rating > 5) return res.status(422).json({ error: "Rating 1–5 required", code: 422 });
  const delivered = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { consumerId: req.user!.id, status: OrderStatus.DELIVERED },
    },
  });
  if (!delivered) {
    return res.status(403).json({ error: "Review after delivery only", code: 403 });
  }
  const review = await prisma.review.create({
    data: {
      userId: req.user!.id,
      productId,
      rating,
      text: req.body.text || null,
    },
  });
  res.status(201).json({ review });
});
