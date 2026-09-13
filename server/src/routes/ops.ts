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

opsRouter.patch("/notifications/:id/read", auth, async (req, res) => {
  const id = String(req.params.id);
  const updated = await prisma.notification.updateMany({
    where: { id, userId: req.user!.id },
    data: { read: true },
  });
  res.json({ success: true, count: updated.count });
});

opsRouter.patch("/notifications/mark-all-read", auth, async (req, res) => {
  const updated = await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  });
  res.json({ success: true, count: updated.count });
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

  const worker = req.user!.role === "LOGISTICS"
    ? await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { deliveryType: true },
      })
    : null;

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

  const rawJobs = await prisma.logisticsBooking.findMany({
    where,
    include: jobInclude,
    orderBy: { createdAt: "desc" },
  });

  const jobs = rawJobs.map((j) => {
    const isHeavy = j.quantity > 30 || j.vehicle.toLowerCase().includes("truck");
    const requiredVehicleType = isHeavy ? "LARGE_TRUCK" : "BIKE";
    const workerCanClaim = !worker || worker.deliveryType === "LARGE_TRUCK" || !isHeavy;

    // Expected payout in paise (use order.logisticsPaise if set, otherwise calculate base + weight rate)
    const payoutPaise = j.order?.logisticsPaise && j.order.logisticsPaise > 0
      ? j.order.logisticsPaise
      : isHeavy
        ? Math.round(35000 + j.quantity * 150) // ₹350 base + ₹1.50/kg for bulk trucks
        : Math.round(6000 + j.quantity * 200);  // ₹60 base + ₹2/kg for bikes

    return {
      ...j,
      requiredVehicleType,
      workerCanClaim,
      payoutPaise,
    };
  });

  res.json({ jobs });
});

opsRouter.post("/logistics/jobs/:id/claim", auth, requireRole("LOGISTICS"), async (req, res) => {
  const id = String(req.params.id);
  try {
    const job = await prisma.$transaction(async (tx) => {
      const existing = await tx.logisticsBooking.findUnique({
        where: { id },
        select: { quantity: true, vehicle: true },
      });

      if (!existing) {
        throw Object.assign(new Error("Job not found"), { code: 404 });
      }

      const worker = await tx.user.findUnique({
        where: { id: req.user!.id },
        select: { deliveryType: true },
      });

      const isHeavy = existing.quantity > 30 || existing.vehicle.toLowerCase().includes("truck");
      if (worker?.deliveryType === "BIKE" && isHeavy) {
        throw Object.assign(
          new Error("This bulk order exceeds 30kg and requires a Large Truck. Your registered vehicle is Bike."),
          { code: 403 }
        );
      }

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

    const jobCode = job.id.slice(-6).toUpperCase();
    const orderCode = job.orderId ? job.orderId.slice(-6).toUpperCase() : jobCode;
    const workerName = req.user!.name || "Delivery Partner";

    // 1. Notify Logistics Driver
    await notify(
      req.user!.id,
      "LOGISTICS_CLAIMED",
      "Delivery Job Claimed 📦",
      `You claimed Job #${jobCode} (Order #${orderCode}, ~${Math.round(job.quantity)}kg). Proceed to pickup.`
    );

    // 2. Notify Consumer
    if (job.order?.consumerId) {
      await notify(
        job.order.consumerId,
        "LOGISTICS_STATUS",
        "Delivery Partner Assigned 🚚",
        `${workerName} has been assigned to deliver your order #${orderCode}. Pickup scheduled!`
      );
    }

    // 3. Notify Farmer (for direct-farmer jobs)
    if (
      job.fulfillmentChannel !== FulfillmentChannel.SOCIETY &&
      job.farmer?.userId
    ) {
      await notify(
        job.farmer.userId,
        "LOGISTICS_STATUS",
        "Pickup Scheduled 🚛",
        `${workerName} accepted delivery job #${jobCode} and will arrive for produce pickup.`
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
    const jobCode = result.job.id.slice(-6).toUpperCase();
    const orderCode = result.job.orderId ? result.job.orderId.slice(-6).toUpperCase() : jobCode;
    const consumerId = result.job.order?.consumerId;
    const farmerUserId = result.job.farmer?.user?.id || (result.job.fulfillmentChannel !== FulfillmentChannel.SOCIETY ? result.job.farmer?.userId : null);
    const driverId = result.job.assignedUserId;

    if (next === LogisticsStatus.FARMER_READY) {
      if (consumerId) {
        await notify(
          consumerId,
          "LOGISTICS_STATUS",
          "Produce Packed & Ready 🌾",
          `Items for order #${orderCode} have been prepared and packed fresh at the farm.`
        );
      }
      if (driverId) {
        await notify(
          driverId,
          "LOGISTICS_STATUS",
          "Produce Ready for Pickup 📦",
          `Job #${jobCode} produce is packed and ready for pickup at ${result.job.pickup}.`
        );
      }
    } else if (next === LogisticsStatus.PICKED_UP) {
      if (consumerId) {
        await notify(
          consumerId,
          "LOGISTICS_STATUS",
          "Produce Collected from Farm 📦",
          `Delivery partner has collected your fresh harvest for order #${orderCode} from the producer.`
        );
      }
      if (farmerUserId) {
        await notify(
          farmerUserId,
          "LOGISTICS_STATUS",
          "Harvest Dispatched 🚚",
          `Produce for job #${jobCode} has been picked up by the logistics partner.`
        );
      }
    } else if (next === LogisticsStatus.IN_TRANSIT) {
      if (consumerId) {
        await notify(
          consumerId,
          "LOGISTICS_STATUS",
          "Order In Transit 🚛",
          `Your order #${orderCode} is on the transit corridor heading towards your destination hub.`
        );
      }
    } else if (next === LogisticsStatus.OUT_FOR_DELIVERY) {
      if (consumerId) {
        await notify(
          consumerId,
          "LOGISTICS_STATUS",
          "Out for Delivery! 🛵",
          `Good news! Order #${orderCode} is out for delivery and arriving at your doorstep shortly.`
        );
      }
    } else if (next === LogisticsStatus.DELIVERED) {
      if (consumerId) {
        await notify(
          consumerId,
          "LOGISTICS_STATUS",
          "Order Delivered! 🏡✨",
          `Your order #${orderCode} has safely reached your doorstep. Enjoy your farm-fresh produce!`
        );
      }
      if (farmerUserId) {
        await notify(
          farmerUserId,
          "LOGISTICS_STATUS",
          "Order Delivered & Settled 💰",
          `Job #${jobCode} (Order #${orderCode}) was successfully delivered to the customer. Payout processing!`
        );
      }
      if (driverId) {
        await notify(
          driverId,
          "LOGISTICS_STATUS",
          "Delivery Completed! ✅",
          `Order #${orderCode} marked as delivered. Great job! Delivery payout has been credited.`
        );
      }
    } else {
      if (consumerId) {
        await notify(
          consumerId,
          "LOGISTICS_STATUS",
          `Delivery Status: ${next.replace(/_/g, " ")}`,
          `Status updated for order #${orderCode}: ${next.replace(/_/g, " ")}.`
        );
      }
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

opsRouter.get("/logistics/earnings", auth, requireRole("LOGISTICS", "ADMIN"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const deliveredBookings = await prisma.logisticsBooking.findMany({
      where: {
        assignedUserId: req.user!.role === "LOGISTICS" ? userId : undefined,
        status: LogisticsStatus.DELIVERED,
      },
      include: {
        order: { select: { id: true, logisticsPaise: true, address: true } },
        farmer: { select: { farmName: true, location: true } },
        society: { select: { name: true, district: true } },
      },
      orderBy: { deliveredAt: "desc" },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayPaise = 0;
    let weekPaise = 0;
    let monthPaise = 0;
    let totalPaise = 0;

    const history = deliveredBookings.map((b) => {
      const deliveredDate = b.deliveredAt || b.updatedAt;
      const isHeavy = b.quantity > 30 || b.vehicle.toLowerCase().includes("truck");
      const payoutPaise = b.order?.logisticsPaise && b.order.logisticsPaise > 0
        ? b.order.logisticsPaise
        : isHeavy
          ? Math.round(35000 + b.quantity * 150)
          : Math.round(6000 + b.quantity * 200);

      totalPaise += payoutPaise;
      if (deliveredDate >= startOfToday) todayPaise += payoutPaise;
      if (deliveredDate >= startOfWeek) weekPaise += payoutPaise;
      if (deliveredDate >= startOfMonth) monthPaise += payoutPaise;

      const durationMins = b.acceptedAt && b.deliveredAt
        ? Math.max(15, Math.round((b.deliveredAt.getTime() - b.acceptedAt.getTime()) / 60000))
        : 35;

      return {
        id: b.id,
        deliveryId: b.orderId ? `DEL-${b.orderId.slice(-6).toUpperCase()}` : `JOB-${b.id.slice(-6).toUpperCase()}`,
        date: deliveredDate.toISOString(),
        origin: b.society?.name || b.farmer.farmName || b.pickup,
        destination: b.order?.address ? `${b.order.address.city}, ${b.order.address.state}` : "Consumer Hub",
        vehicle: b.vehicle,
        quantityKg: b.quantity,
        durationMins,
        payoutPaise,
        status: "PAID",
      };
    });

    // 7-day trend chart points
    const days: { date: string; dayName: string; amountRupees: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const nextD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      const dayDeliveries = deliveredBookings.filter((b) => {
        const date = b.deliveredAt || b.updatedAt;
        return date >= d && date < nextD;
      });
      const dayTotalPaise = dayDeliveries.reduce((sum, b) => {
        const isHeavy = b.quantity > 30 || b.vehicle.toLowerCase().includes("truck");
        return sum + (b.order?.logisticsPaise || (isHeavy ? Math.round(35000 + b.quantity * 150) : Math.round(6000 + b.quantity * 200)));
      }, 0);
      days.push({
        date: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("en-IN", { weekday: "short" }),
        amountRupees: Math.round(dayTotalPaise / 100),
      });
    }

    res.json({
      summary: {
        todayPaise,
        weekPaise,
        monthPaise,
        totalPaise,
        completedCount: deliveredBookings.length,
      },
      chartData: days,
      history,
    });
  } catch (error) {
    console.error("GET /api/logistics/earnings error:", error);
    res.status(500).json({ error: "Failed to load logistics earnings", code: 500 });
  }
});

opsRouter.get("/logistics/working-hours", auth, requireRole("LOGISTICS", "ADMIN"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const bookings = await prisma.logisticsBooking.findMany({
      where: {
        assignedUserId: req.user!.role === "LOGISTICS" ? userId : undefined,
        status: { in: [LogisticsStatus.PICKUP_SCHEDULED, LogisticsStatus.FARMER_READY, LogisticsStatus.PICKED_UP, LogisticsStatus.IN_TRANSIT, LogisticsStatus.DELIVERED] },
      },
      select: {
        acceptedAt: true,
        deliveredAt: true,
        status: true,
        updatedAt: true,
      },
    });

    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let todayHours = 0;
    let weekHours = 0;
    let activeNowHours = 0;

    for (const b of bookings) {
      if (!b.acceptedAt) continue;
      const acceptedTime = new Date(b.acceptedAt).getTime();
      const endTime = b.deliveredAt ? new Date(b.deliveredAt).getTime() : now;
      const elapsedHours = Math.max(0.1, (endTime - acceptedTime) / (1000 * 60 * 60));

      if (b.status !== LogisticsStatus.DELIVERED) {
        activeNowHours += elapsedHours;
      }

      if (new Date(b.acceptedAt) >= startOfToday) {
        todayHours += elapsedHours;
      }
      if (new Date(b.acceptedAt) >= startOfWeek) {
        weekHours += elapsedHours;
      }
    }

    res.json({
      todayHours: +(todayHours.toFixed(1)),
      weekHours: +(weekHours.toFixed(1)),
      activeNowHours: +(activeNowHours.toFixed(1)),
      isCurrentlyOnTrip: activeNowHours > 0,
    });
  } catch (error) {
    console.error("GET /api/logistics/working-hours error:", error);
    res.status(500).json({ error: "Failed to calculate working hours", code: 500 });
  }
});

opsRouter.get("/logistics/vehicle-details", auth, requireRole("LOGISTICS", "ADMIN"), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        logisticsVerification: {
          include: {
            documents: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found", code: 404 });

    const ver = user.logisticsVerification;
    const isTruck = user.deliveryType === "LARGE_TRUCK" || ver?.vehicleType === "LARGE_TRUCK";

    const vehicle = {
      makeModel: ver?.vehicleMake && ver?.vehicleModel ? `${ver.vehicleMake} ${ver.vehicleModel}` : isTruck ? "Eicher Pro 2049 Heavy Truck" : "Bajaj Pulsar 150 Courier",
      vehicleNumber: user.vehicleNumber || ver?.vehicleNumber || (isTruck ? "KA01EF3456" : "KA04XY9876"),
      vehicleType: user.deliveryType || ver?.vehicleType || (isTruck ? "LARGE_TRUCK" : "BIKE"),
      typeLabel: isTruck ? "Large Truck / Heavy Freight" : "2-Wheeler Express Courier",
      payloadCapacityKg: ver?.capacityKg || (isTruck ? 2500 : 35),
      fuelType: isTruck ? "Diesel" : "Petrol",
      coldChainActive: isTruck,
      year: ver?.vehicleYear || 2023,
      registrationStatus: ver?.status === "APPROVED" || ver?.status === "VERIFIED" ? "GOVT_RC_VERIFIED" : "PENDING_VERIFICATION",
      documents: {
        drivingLicence: ver?.documents?.some((d) => d.documentType.includes("LICENCE") && d.status === "VERIFIED") || ver?.status === "APPROVED" ? "APPROVED" : "PENDING",
        vehicleRc: ver?.documents?.some((d) => d.documentType.includes("RC") && d.status === "VERIFIED") || ver?.status === "APPROVED" ? "VERIFIED" : "PENDING",
        transportPermit: isTruck ? "VALID_TILL_2027" : "NOT_APPLICABLE",
        commercialInsurance: "ACTIVE",
      },
    };

    res.json({ vehicle });
  } catch (error) {
    console.error("GET /api/logistics/vehicle-details error:", error);
    res.status(500).json({ error: "Failed to load vehicle details", code: 500 });
  }
});
