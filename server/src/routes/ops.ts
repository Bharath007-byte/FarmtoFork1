import { Router } from "express";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { emitEvent } from "../socket.js";
import { notify } from "../lib/notify.js";
import { LogisticsStatus, CollabStatus } from "@prisma/client";

export const opsRouter = Router();

opsRouter.get("/logistics/slots", auth, async (req, res) => {
  const date = req.query.date ? new Date(String(req.query.date)) : new Date();
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  const slots = await prisma.deliverySlot.findMany({
    where: { date: { gte: day, lt: next } },
    orderBy: { startMin: "asc" },
  });
  res.json({
    slots: slots.map((s) => ({
      ...s,
      available: s.booked < s.capacity,
    })),
  });
});

opsRouter.post("/logistics/book", auth, requireRole("FARMER"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!farmer) return res.status(404).json({ error: "Farmer profile missing", code: 404 });
  const { slotId, pickup, quantity, vehicle, orderId } = req.body || {};
  try {
    const booking = await prisma.$transaction(async (tx) => {
      const slot = await tx.deliverySlot.findUnique({ where: { id: String(slotId) } });
      if (!slot) throw Object.assign(new Error("Slot not found"), { code: 404 });
      if (slot.booked >= slot.capacity) throw Object.assign(new Error("Slot full"), { code: 409 });
      const updated = await tx.deliverySlot.updateMany({
        where: { id: slot.id, booked: { lt: slot.capacity } },
        data: { booked: { increment: 1 } },
      });
      if (updated.count !== 1) throw Object.assign(new Error("Slot full"), { code: 409 });
      return tx.logisticsBooking.create({
        data: {
          farmerId: farmer.id,
          userId: req.user!.id,
          slotId: slot.id,
          pickup: String(pickup || farmer.location),
          quantity: Number(quantity || 1),
          vehicle: String(vehicle || "mini-truck"),
          orderId: orderId || null,
          status: LogisticsStatus.CONFIRMED,
        },
      });
    });
    await notify(req.user!.id, "LOGISTICS_BOOKED", "Logistics booked", booking.id);
    emitEvent("LOGISTICS_BOOKED", { id: booking.id });
    res.status(201).json({ booking });
  } catch (err) {
    const e = err as Error & { code?: number };
    return res.status(e.code || 500).json({ error: e.message, code: e.code || 500 });
  }
});

opsRouter.get("/logistics/bookings", auth, requireRole("FARMER", "LOGISTICS", "ADMIN"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  const bookings = await prisma.logisticsBooking.findMany({
    where: req.user!.role === "FARMER" ? { farmerId: farmer?.id } : {},
    include: { slot: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ bookings });
});

opsRouter.post("/collaborations", auth, requireRole("FARMER"), async (req, res) => {
  const toUserId = String(req.body.toUserId || "");
  if (toUserId === req.user!.id) return res.status(422).json({ error: "Cannot collaborate with self", code: 422 });
  const row = await prisma.farmerCollaboration.create({
    data: {
      fromUserId: req.user!.id,
      toUserId,
      crop: String(req.body.crop || ""),
      qtyA: Number(req.body.qtyA || 0),
      note: req.body.note || null,
    },
  });
  await notify(toUserId, "COLLAB_REQUEST", "Collaboration request", `${req.user!.name} wants to combine ${row.crop}`);
  emitEvent("COLLABORATION_REQUESTED", { id: row.id });
  res.status(201).json({ collaboration: row });
});

opsRouter.get("/collaborations", auth, requireRole("FARMER"), async (req, res) => {
  const rows = await prisma.farmerCollaboration.findMany({
    where: { OR: [{ fromUserId: req.user!.id }, { toUserId: req.user!.id }] },
    orderBy: { createdAt: "desc" },
  });
  res.json({ collaborations: rows });
});

opsRouter.post("/collaborations/:id/respond", auth, requireRole("FARMER"), async (req, res) => {
  const accept = Boolean(req.body.accept);
  const existing = await prisma.farmerCollaboration.findUnique({ where: { id: String(req.params.id) } });
  if (!existing || existing.toUserId !== req.user!.id) {
    return res.status(403).json({ error: "Not your request", code: 403 });
  }
  const row = await prisma.farmerCollaboration.update({
    where: { id: existing.id },
    data: {
      status: accept ? CollabStatus.ACCEPTED : CollabStatus.REJECTED,
      qtyB: accept ? Number(req.body.qtyB || 0) : 0,
    },
  });
  await notify(existing.fromUserId, "COLLAB_UPDATE", "Collaboration update", row.status);
  res.json({ collaboration: row, combinedQty: row.qtyA + row.qtyB });
});

opsRouter.get("/notifications", auth, async (req, res) => {
  const rows = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ notifications: rows });
});

opsRouter.post("/logistics/bookings/:id/cancel", auth, requireRole("FARMER"), async (req, res) => {
  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: req.user!.id } });
  const booking = await prisma.logisticsBooking.findUnique({ where: { id: String(req.params.id) } });
  if (!booking || booking.farmerId !== farmer?.id) {
    return res.status(403).json({ error: "Not your booking", code: 403 });
  }
  if (booking.status === LogisticsStatus.CANCELLED) {
    return res.json({ booking });
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.deliverySlot.update({
      where: { id: booking.slotId },
      data: { booked: { decrement: 1 } },
    });
    return tx.logisticsBooking.update({
      where: { id: booking.id },
      data: { status: LogisticsStatus.CANCELLED },
    });
  });
  res.json({ booking: updated });
});
