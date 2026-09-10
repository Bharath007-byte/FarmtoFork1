import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { emitEvent } from "../socket.js";
import { notify } from "../lib/notify.js";
import { LogisticsStatus, OrderStatus, CollabStatus, FulfillmentChannel } from "@prisma/client";
import { ensureUpcomingDeliverySlots, slotIsBookable } from "../lib/deliverySlots.js";
import { assertLogisticsTransition, orderStatusFromBookings } from "../lib/orderStatus.js";
import { releaseInventoryForOrder } from "../lib/orderLogistics.js";

export const opsRouter = Router();

const logisticsUploadDir = path.join(process.cwd(), "uploads", "logistics");

fs.mkdirSync(logisticsUploadDir, { recursive: true });

const logisticsUpload = multer({
  dest: logisticsUploadDir,
  limits: {
    fileSize: 5_000_000,
  },
});

const deliveryProfileSchema = z.object({
  deliveryType: z.enum(["BIKE", "LARGE_TRUCK"]),
  vehicleNumber: z.string().trim().min(3).max(30),
});
 
opsRouter.get(
  "/logistics/onboarding",
  auth,
  requireRole("LOGISTICS"),
  async (req, res) => {
    const worker = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        photoUrl: true,
        deliveryType: true,
        vehicleNumber: true,
        logisticsVerification: {
          select: {
            vehicleType: true,
            vehicleNumber: true,
            licenceNumber: true,
            licenceDocumentUrl: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            rejectionReason: true,
          },
        },
      },
    });

    if (!worker) {
      return res.status(404).json({
        error: "Logistics worker not found",
        code: 404,
      });
    }

    const verification = worker.logisticsVerification;

    const needsOnboarding =
      !worker.photoUrl ||
      !verification ||
      verification.status !== "VERIFIED";

        res.json({
      profile: {
        ...worker,
        verificationStatus:
          worker.logisticsVerification?.status ?? null,
      },
    });
  }
);

opsRouter.post(
  "/logistics/me/photo",
  auth,
  requireRole("LOGISTICS"),
  logisticsUpload.single("photo"),
  async (req, res) => {
    if (!req.file) {
      return res.status(422).json({
        error: "Worker photo is required",
        code: 422,
      });
    }

    const photoUrl = `/uploads/logistics/${req.file.filename}`;

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { photoUrl },
    });

    res.json({
      photoUrl,
    });
  }
);
const logisticsVerificationSchema = z.object({
  vehicleType: z.enum(["BIKE", "LARGE_TRUCK"]),
  vehicleNumber: z.string().trim().min(3).max(30),
  licenceNumber: z.string().trim().min(5).max(50),
});

opsRouter.post(
  "/logistics/verification",
  auth,
  requireRole("LOGISTICS"),
  logisticsUpload.single("licenceDocument"),
  async (req, res) => {
    const parsed = logisticsVerificationSchema.safeParse({
      vehicleType: req.body?.vehicleType,
      vehicleNumber: req.body?.vehicleNumber,
      licenceNumber: req.body?.licenceNumber,
    });

    if (!parsed.success) {
      return res.status(422).json({
        error: parsed.error.flatten(),
        code: 422,
      });
    }

    if (!req.file) {
      return res.status(422).json({
        error: "Licence document is required",
        code: 422,
      });
    }

    const {
      vehicleType,
      vehicleNumber,
      licenceNumber,
    } = parsed.data;

    const licenceDocumentUrl =
      `/uploads/logistics/${req.file.filename}`;

    const verification =
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: {
            id: req.user!.id,
          },
          data: {
            deliveryType: vehicleType,
            vehicleNumber:
              vehicleNumber.toUpperCase(),
          },
        });

        return tx.logisticsVerification.upsert({
          where: {
            userId: req.user!.id,
          },
          create: {
            userId: req.user!.id,
            vehicleType,
            vehicleNumber:
              vehicleNumber.toUpperCase(),
            licenceNumber,
            licenceDocumentUrl,
            status: "VERIFIED",
            submittedAt: new Date(),
            reviewedAt: new Date(),
          },
          update: {
            vehicleType,
            vehicleNumber:
              vehicleNumber.toUpperCase(),
            licenceNumber,
            licenceDocumentUrl,
            status: "VERIFIED",
            submittedAt: new Date(),
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        });
      });

    emitEvent("LOGISTICS_VERIFICATION_UPDATED", {
      userId: req.user!.id,
      status: verification.status,
    });

    res.json({
      verification,
      verified: verification.status === "VERIFIED",
    });
  }
);


opsRouter.get(
  "/logistics/profile",
  auth,
  requireRole("LOGISTICS"),
  async (req, res) => {
    const worker = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        photoUrl: true,
        role: true,
        deliveryType: true,
        vehicleNumber: true,
      },
    });

    if (!worker) {
      return res.status(404).json({
        error: "Logistics worker not found",
        code: 404,
      });
    }

    res.json({ profile: worker });
  }
);

opsRouter.patch(
  "/logistics/profile",
  auth,
  requireRole("LOGISTICS"),
  async (req, res) => {
    const parsed = deliveryProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(422).json({
        error: parsed.error.flatten(),
        code: 422,
      });
    }

    const worker = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        deliveryType: parsed.data.deliveryType,
        vehicleNumber: parsed.data.vehicleNumber,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        photoUrl: true,
        role: true,
        deliveryType: true,
        vehicleNumber: true,
      },
    });

    res.json({ profile: worker });
  }
);


opsRouter.get("/logistics/slots", auth, async (req, res) => {
  await ensureUpcomingDeliverySlots(prisma);
  const date = req.query.date ? new Date(String(req.query.date)) : new Date();
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  const slots = await prisma.deliverySlot.findMany({
    where: { date: { gte: day, lt: next } },
    orderBy: { startMin: "asc" },
  });
  const now = new Date();
  res.json({
    slots: slots.map((s) => ({
      ...s,
      available: slotIsBookable(s, now),
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

const jobInclude = {
  slot: true,
  farmer: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  },
  society: {
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      village: true,
      district: true,
      state: true,
      pinCode: true,
      lat: true,
      lng: true,
      phone: true,
    },
  },
  order: {
    include: {
      consumer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      address: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  },
} as const;

opsRouter.get("/logistics/jobs", auth, requireRole("LOGISTICS", "ADMIN"), async (req, res) => {
  await ensureUpcomingDeliverySlots(prisma);
  const where =
  req.user!.role === "ADMIN"
    ? {
        status: {
          not: LogisticsStatus.CANCELLED,
        },
      }
    : {
        OR: [
          {
            assignedUserId: null,
            status: {
              in: [
                LogisticsStatus.CONFIRMED,
                LogisticsStatus.FARMER_READY,
              ],
            },
          },
          {
            assignedUserId: req.user!.id,
            status: {
              not: LogisticsStatus.CANCELLED,
            },
          },  
        ],
      };
  const jobs = await prisma.logisticsBooking.findMany({
    where,
    include: jobInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ jobs });
});

opsRouter.post("/logistics/jobs/:id/claim", auth, requireRole("LOGISTICS"), async (req, res) => {
  const id = String(req.params.id);
  try {
    const job = await prisma.$transaction(async (tx) => {
      const updated = await tx.logisticsBooking.updateMany({
        where: {
          id,
          assignedUserId: null,
          status: {
            in: [
              LogisticsStatus.CONFIRMED,
              LogisticsStatus.FARMER_READY,
            ],
          },
        },
        data: {
          assignedUserId: req.user!.id,
          acceptedAt: new Date(),
          status: LogisticsStatus.PICKUP_SCHEDULED,
        },
      });
      if (updated.count !== 1) {
        throw Object.assign(new Error("Job is no longer available"), { code: 409 });
      }
      return tx.logisticsBooking.findUniqueOrThrow({ where: { id }, include: jobInclude });
    });
    emitEvent("LOGISTICS_STATUS_CHANGED", { id: job.id, status: job.status, orderId: job.orderId });
    if (job.order?.consumerId) {
      await notify(job.order.consumerId, "LOGISTICS_STATUS", "Pickup scheduled", job.id);
    }
    /**
     * Society fulfillment has no farmer pickup step.
     * Only notify the farmer for direct-farmer jobs.
     */
    if (
      job.fulfillmentChannel !== FulfillmentChannel.SOCIETY &&
      job.farmer?.userId
    ) {
      await notify(
        job.farmer.userId,
        "LOGISTICS_STATUS",
        "Logistics claimed your pickup",
        job.id,
      );
    }
    res.json({ job });
  } catch (err) {
    const e = err as Error & { code?: number };
    return res.status(e.code || 500).json({ error: e.message, code: e.code || 500 });
  }
});

opsRouter.patch("/logistics/jobs/:id/status", auth, requireRole("LOGISTICS", "ADMIN"), async (req, res) => {
  const id = String(req.params.id);
  const next = String(req.body?.status || "").toUpperCase() as LogisticsStatus;
  if (!Object.values(LogisticsStatus).includes(next)) {
    return res.status(422).json({ error: "Invalid logistics status", code: 422 });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.logisticsBooking.findUnique({
        where: { id },
        include: { order: { include: { items: true, bookings: true } } },
      });
      if (!current) throw Object.assign(new Error("Job not found"), { code: 404 });
      if (req.user!.role === "LOGISTICS" && current.assignedUserId !== req.user!.id) {
        throw Object.assign(new Error("Not your job"), { code: 403 });
      }

      /**
       * Society bookings are claimed into PICKUP_SCHEDULED and have no
       * farmer-ready step. Bridge to FARMER_READY in-transaction so the
       * existing enum transition graph can reach PICKED_UP without
       * changing shared transition rules or inventing new statuses.
       */
      let fromStatus = current.status;
      if (
        current.fulfillmentChannel === FulfillmentChannel.SOCIETY &&
        current.status === LogisticsStatus.PICKUP_SCHEDULED &&
        next === LogisticsStatus.PICKED_UP
      ) {
        await tx.logisticsBooking.update({
          where: { id },
          data: {
            status: LogisticsStatus.FARMER_READY,
            farmerReadyAt: new Date(),
          },
        });
        fromStatus = LogisticsStatus.FARMER_READY;
      }

      assertLogisticsTransition(fromStatus, next);
      const stamp: Record<string, Date> = {};
      if (next === LogisticsStatus.FARMER_READY) stamp.farmerReadyAt = new Date();
      if (next === LogisticsStatus.PICKED_UP) stamp.pickedUpAt = new Date();
      if (next === LogisticsStatus.IN_TRANSIT) stamp.inTransitAt = new Date();
      if (next === LogisticsStatus.DELIVERED) stamp.deliveredAt = new Date();
      const updated = await tx.logisticsBooking.update({
        where: { id },
        data: { status: next, ...stamp },
        include: jobInclude,
      });
      let orderStatus: OrderStatus | null = updated.order?.status ?? null;
      if (updated.orderId) {
        const all = await tx.logisticsBooking.findMany({ where: { orderId: updated.orderId } });
        const order = await tx.order.findUnique({
          where: { id: updated.orderId },
          include: { items: true },
        });
        if (order) {
          orderStatus = order.status;
          const mapped = orderStatusFromBookings(all, order.status);
          if (mapped && mapped !== order.status) {
            const becameDelivered =
              mapped === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED;
            await tx.order.update({ where: { id: order.id }, data: { status: mapped } });
            orderStatus = mapped;
            if (becameDelivered) {
              await releaseInventoryForOrder(tx, order.items, "deliver");
            }
          }
        }
      }
      return { job: updated, orderStatus };
    });
    emitEvent("LOGISTICS_STATUS_CHANGED", {
      id: result.job.id,
      status: result.job.status,
      orderId: result.job.orderId,
    });
    if (result.job.orderId && result.orderStatus) {
      emitEvent("ORDER_STATUS_CHANGED", {
        orderId: result.job.orderId,
        status: result.orderStatus,
      });
    }
    if (result.job.order?.consumerId) {
      await notify(result.job.order.consumerId, "LOGISTICS_STATUS", `Delivery ${next}`, result.job.id);
    }
    res.json({ job: result.job, orderStatus: result.orderStatus });
  } catch (err) {
    const e = err as Error & { code?: number };
    return res.status(e.code || 500).json({ error: e.message, code: e.code || 500 });
  }
});

opsRouter.patch("/logistics/jobs/:id/location", auth, requireRole("LOGISTICS"), async (req, res) => {
  const lat = Number(req.body?.latitude ?? req.body?.lat);
  const lng = Number(req.body?.longitude ?? req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(422).json({ error: "Valid latitude and longitude required", code: 422 });
  }
  const id = String(req.params.id);
  const current = await prisma.logisticsBooking.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ error: "Job not found", code: 404 });
  if (current.assignedUserId !== req.user!.id) {
    return res.status(403).json({ error: "Not your job", code: 403 });
  }
  const job = await prisma.logisticsBooking.update({
    where: { id },
    data: { currentLat: lat, currentLng: lng, locationUpdatedAt: new Date() },
    include: jobInclude,
  });
  emitEvent("LOGISTICS_LOCATION_UPDATED", {
    id: job.id,
    orderId: job.orderId,
    lat,
    lng,
    locationUpdatedAt: job.locationUpdatedAt,
  });
  res.json({ job });
});
