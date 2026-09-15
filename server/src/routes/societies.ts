import { Router } from "express";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { emitEvent } from "../socket.js";
import { notify } from "../lib/notify.js";
import { ensureUpcomingDeliverySlots } from "../lib/deliverySlots.js";
import { LogisticsStatus, FulfillmentChannel } from "@prisma/client";

export const societyRouter = Router();

function getSocietyId(req: { params: { id?: string | string[] } }): string {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    throw new Error("Invalid society id");
  }

  return id;
}

/**
 * GET /api/societies
 *
 * Returns active cooperative societies.
 * Used by admin dashboard, society directory, and farmer bulk pooling desk.
 */
societyRouter.get("/", auth, requireRole("ADMIN", "FARMER", "CONSUMER"), async (_req, res) => {
  try {
    const societies = await prisma.cooperativeSociety.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            farmers: true,
            inventory: true,
            supplies: true,
            bookings: true,
          },
        },
      },
    });

    res.json(societies);
  } catch (error) {
    console.error("GET /societies", error);
    res.status(500).json({
      error: "Failed to load cooperative societies",
    });
  }
});

/**
 * GET /api/societies/my-memberships
 *
 * Returns farmer's membership status for all cooperative societies.
 */
societyRouter.get("/my-memberships", auth, requireRole("FARMER"), async (req, res) => {
  try {
    const farmer = await prisma.farmerProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!farmer) {
      return res.status(404).json({ error: "Farmer profile not found", code: 404 });
    }

    const memberships = await prisma.societyFarmer.findMany({
      where: { farmerId: farmer.id },
      include: {
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
    });

    res.json({ memberships });
  } catch (error) {
    console.error("GET /societies/my-memberships", error);
    res.status(500).json({ error: "Failed to load memberships", code: 500 });
  }
});

/**
 * POST /api/societies/:id/join
 *
 * Farmer submits a join request for a cooperative society community.
 */
societyRouter.post("/:id/join", auth, requireRole("FARMER"), async (req, res) => {
  try {
    const societyId = getSocietyId(req);
    const farmer = await prisma.farmerProfile.findUnique({
      where: { userId: req.user!.id },
      include: { user: true },
    });

    if (!farmer) {
      return res.status(404).json({ error: "Farmer profile not found", code: 404 });
    }

    const society = await prisma.cooperativeSociety.findUnique({
      where: { id: societyId },
    });

    if (!society) {
      return res.status(404).json({ error: "Cooperative society not found", code: 404 });
    }

    const membership = await prisma.societyFarmer.upsert({
      where: {
        societyId_farmerId: {
          societyId,
          farmerId: farmer.id,
        },
      },
      update: {
        status: "PENDING",
      },
      create: {
        societyId,
        farmerId: farmer.id,
        status: "PENDING",
        active: false,
      },
    });

    emitEvent("SOCIETY_JOIN_REQUESTED", {
      societyId,
      farmerId: farmer.id,
      farmerName: farmer.user.name,
      societyName: society.name,
    });

    // Notify Admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await notify(
        admin.id,
        "SOCIETY_JOIN_REQUEST",
        "New Farmer Community Request 🌾",
        `${farmer.user.name} (${farmer.farmName}, ${farmer.district}) requested to join ${society.name}. Review in Admin Portal.`
      );
    }

    res.status(200).json({
      ok: true,
      message: "Join request submitted. Pending administrator approval.",
      membership,
    });
  } catch (error) {
    console.error("POST /societies/:id/join", error);
    res.status(500).json({ error: "Failed to submit join request", code: 500 });
  }
});

/**
 * GET /api/societies/admin/requests
 *
 * Admin fetches all pending farmer requests to join cooperative communities.
 */
societyRouter.get("/admin/requests", auth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const requests = await prisma.societyFarmer.findMany({
      where: {
        status: "PENDING",
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
          },
        },
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
            products: {
              where: { active: true },
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    res.json({ requests });
  } catch (error) {
    console.error("GET /societies/admin/requests", error);
    res.status(500).json({ error: "Failed to load society requests", code: 500 });
  }
});

/**
 * POST /api/societies/admin/requests/:id/accept
 *
 * Admin accepts farmer's join request.
 */
societyRouter.post("/admin/requests/:id/accept", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const requestId = String(req.params.id);
    const existing = await prisma.societyFarmer.findUnique({
      where: { id: requestId },
      include: {
        farmer: { include: { user: true } },
        society: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Join request not found", code: 404 });
    }

    const updated = await prisma.societyFarmer.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        active: true,
      },
    });

    emitEvent("SOCIETY_MEMBER_UPDATED", {
      requestId,
      status: "APPROVED",
      farmerId: existing.farmerId,
      societyId: existing.societyId,
    });

    await notify(
      existing.farmer.userId,
      "SOCIETY_APPROVED",
      "Community Membership Approved! 🏛️",
      `Congratulations! Your request to join ${existing.society.name} has been approved by the administration. You can now pool bulk produce and access collective transport.`
    );

    res.json({ ok: true, member: updated });
  } catch (error) {
    console.error("POST /admin/requests/:id/accept", error);
    res.status(500).json({ error: "Failed to accept society request", code: 500 });
  }
});

/**
 * POST /api/societies/admin/requests/:id/reject
 *
 * Admin declines farmer's join request.
 */
societyRouter.post("/admin/requests/:id/reject", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const requestId = String(req.params.id);
    const existing = await prisma.societyFarmer.findUnique({
      where: { id: requestId },
      include: {
        farmer: { include: { user: true } },
        society: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Join request not found", code: 404 });
    }

    const updated = await prisma.societyFarmer.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        active: false,
      },
    });

    emitEvent("SOCIETY_MEMBER_UPDATED", {
      requestId,
      status: "REJECTED",
      farmerId: existing.farmerId,
    });

    await notify(
      existing.farmer.userId,
      "SOCIETY_REJECTED",
      "Community Request Update",
      `Your request to join ${existing.society.name} was not approved at this time. Please contact support or your local district coordinator.`
    );

    res.json({ ok: true, member: updated });
  } catch (error) {
    console.error("POST /admin/requests/:id/reject", error);
    res.status(500).json({ error: "Failed to decline society request", code: 500 });
  }
});

/**
 * GET /api/societies/my-supplies
 *
 * Returns bulk supply submissions made by the logged-in farmer.
 */
societyRouter.get("/my-supplies", auth, requireRole("FARMER"), async (req, res) => {
  try {
    const farmer = await prisma.farmerProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!farmer) {
      return res.status(404).json({ error: "Farmer profile not found", code: 404 });
    }

    const supplies = await prisma.societySupply.findMany({
      where: { farmerId: farmer.id },
      include: {
        society: {
          select: {
            id: true,
            name: true,
            code: true,
            district: true,
            state: true,
            pinCode: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            variety: true,
            unit: true,
            pricePaise: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { receivedAt: "desc" },
    });

    const bookings = await prisma.logisticsBooking.findMany({
      where: {
        farmerId: farmer.id,
        fulfillmentChannel: FulfillmentChannel.SOCIETY,
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
          },
        },
        slot: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ supplies, bookings });
  } catch (error) {
    console.error("GET /societies/my-supplies", error);
    res.status(500).json({ error: "Failed to load farmer supplies", code: 500 });
  }
});

/**
 * GET /api/societies/:id
 *
 * Returns complete society information:
 * - society details
 * - member farmers
 * - inventory
 * - farmer supplies
 */
societyRouter.get(
  "/:id",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const society = await prisma.cooperativeSociety.findUnique({
        where: {
          id: getSocietyId(req),
        },
        include: {
          farmers: {
            where: {
              active: true,
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
                      active: true,
                    },
                  },
                },
              },
            },
          },
          inventory: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  variety: true,
                  unit: true,
                  pricePaise: true,
                  imageUrl: true,
                  farmerId: true,
                },
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
          },
          supplies: {
            include: {
              farmer: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              product: {
                select: {
                  id: true,
                  name: true,
                  variety: true,
                  unit: true,
                },
              },
            },
            orderBy: {
              receivedAt: "desc",
            },
          },
          _count: {
            select: {
              farmers: true,
              inventory: true,
              supplies: true,
              bookings: true,
            },
          },
        },
      });

      if (!society) {
        return res.status(404).json({
          error: "Cooperative society not found",
        });
      }

      res.json(society);
    } catch (error) {
      console.error("GET /societies/:id", error);
      res.status(500).json({
        error: "Failed to load cooperative society",
      });
    }
  }
);

/**
 * GET /api/societies/:id/farmers
 *
 * Returns active farmers belonging to a society.
 */
societyRouter.get(
  "/:id/farmers",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const society = await prisma.cooperativeSociety.findUnique({
        where: {
          id: getSocietyId(req),
        },
        select: {
          id: true,
        },
      });

      if (!society) {
        return res.status(404).json({
          error: "Cooperative society not found",
        });
      }

      const members = await prisma.societyFarmer.findMany({
        where: {
          societyId: getSocietyId(req),
          active: true,
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
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      });

      res.json(members);
    } catch (error) {
      console.error("GET /societies/:id/farmers", error);
      res.status(500).json({
        error: "Failed to load society farmers",
      });
    }
  }
);

/**
 * GET /api/societies/:id/inventory
 *
 * Returns real society inventory.
 */
societyRouter.get(
  "/:id/inventory",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const inventory = await prisma.societyInventory.findMany({
        where: {
          societyId: getSocietyId(req),
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              variety: true,
              unit: true,
              pricePaise: true,
              imageUrl: true,
              farmerId: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      res.json(inventory);
    } catch (error) {
      console.error("GET /societies/:id/inventory", error);
      res.status(500).json({
        error: "Failed to load society inventory",
      });
    }
  }
);

/**
 * GET /api/societies/:id/supplies
 *
 * Returns real farmer supply records received by the society.
 */
societyRouter.get(
  "/:id/supplies",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const supplies = await prisma.societySupply.findMany({
        where: {
          societyId: getSocietyId(req),
        },
        include: {
          farmer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              variety: true,
              unit: true,
            },
          },
        },
        orderBy: {
          receivedAt: "desc",
        },
      });

      res.json(supplies);
    } catch (error) {
      console.error("GET /societies/:id/supplies", error);
      res.status(500).json({
        error: "Failed to load society supplies",
      });
    }
  }
);

/**
 * POST /api/societies/:id/supplies
 *
 * Farmer or Admin: submit bulk produce supply to cooperative society.
 * - Auto-enrols farmer into cooperative society membership
 * - Atomically increments SocietyInventory
 * - Automatically schedules a high-payload truck pickup if requested / >= 50kg
 */
societyRouter.post(
  "/:id/supplies",
  auth,
  requireRole("ADMIN", "FARMER"),
  async (req, res) => {
    try {
      const societyId = getSocietyId(req);
      let farmerId = String(req.body?.farmerId || "").trim();
      let productId = String(req.body?.productId || "").trim();
      const quantity = Number(req.body?.quantity);
      const requestTruckPickup = req.body?.requestTruckPickup !== false;

      // If user is farmer, automatically resolve farmerProfile
      if (req.user!.role === "FARMER") {
        const myProfile = await prisma.farmerProfile.findUnique({
          where: { userId: req.user!.id },
        });
        if (!myProfile) {
          return res.status(404).json({ error: "Farmer profile not found", code: 404 });
        }
        farmerId = myProfile.id;
      }

      if (!farmerId) {
        return res.status(422).json({
          error: "farmerId is required",
          code: 422,
        });
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(422).json({
          error: "quantity must be a finite number greater than 0",
          code: 422,
        });
      }

      const society = await prisma.cooperativeSociety.findUnique({
        where: { id: societyId },
      });

      if (!society) {
        return res.status(404).json({
          error: "Cooperative society not found",
          code: 404,
        });
      }

      if (!society.active) {
        return res.status(409).json({
          error: "Cooperative society is not active",
          code: 409,
        });
      }

      const farmer = await prisma.farmerProfile.findUnique({
        where: { id: farmerId },
        include: { user: true },
      });

      if (!farmer) {
        return res.status(404).json({
          error: "Farmer profile not found",
          code: 404,
        });
      }

      // Auto-enroll farmer in society if not yet enrolled
      await prisma.societyFarmer.upsert({
        where: {
          societyId_farmerId: {
            societyId,
            farmerId,
          },
        },
        create: {
          societyId,
          farmerId,
          active: true,
        },
        update: {
          active: true,
        },
      });

      // Product resolution or creation
      let product = productId ? await prisma.product.findUnique({ where: { id: productId } }) : null;

      if (!product) {
        const cropName = String(req.body?.productName || "Fresh Farm Produce").trim();
        const variety = String(req.body?.variety || "Cooperative Grade A").trim();
        const categoryName = String(req.body?.category || "Vegetables").trim();

        let category = await prisma.productCategory.findFirst({
          where: { name: { contains: categoryName, mode: "insensitive" } },
        });

        if (!category) {
          category = await prisma.productCategory.findFirst();
        }

        product = await prisma.product.create({
          data: {
            farmerId,
            categoryId: category!.id,
            name: cropName,
            variety,
            unit: "kg",
            pricePaise: Number(req.body?.pricePaise) || 3000,
            imageUrl: req.body?.imageUrl || "/images/categories/vegetables.png",
            active: true,
          },
        });
        productId = product.id;
      }

      const result = await prisma.$transaction(async (tx) => {
        const supply = await tx.societySupply.create({
          data: {
            societyId,
            farmerId,
            productId,
            quantity,
            status: "RECEIVED",
          },
          include: {
            farmer: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                variety: true,
                unit: true,
                pricePaise: true,
              },
            },
          },
        });

        const inventory = await tx.societyInventory.upsert({
          where: {
            societyId_productId: {
              societyId,
              productId,
            },
          },
          create: {
            societyId,
            productId,
            available: quantity,
            reserved: 0,
            sold: 0,
          },
          update: {
            available: {
              increment: quantity,
            },
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                variety: true,
                unit: true,
                pricePaise: true,
                imageUrl: true,
                farmerId: true,
              },
            },
          },
        });

        return { supply, inventory };
      });

      let booking = null;

      // Schedule automated truck transport if requested or quantity >= 50kg
      if (requestTruckPickup || quantity >= 50) {
        await ensureUpcomingDeliverySlots(prisma);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let slot = await prisma.deliverySlot.findFirst({
          where: { date: { gte: now } },
          orderBy: [{ date: "asc" }, { startMin: "asc" }],
        });

        if (!slot) {
          slot = await prisma.deliverySlot.create({
            data: {
              date: now,
              startMin: 540,
              endMin: 660,
              capacity: 50,
              booked: 0,
            },
          });
        }

        booking = await prisma.logisticsBooking.create({
          data: {
            farmerId,
            userId: req.user!.id,
            societyId,
            slotId: slot.id,
            pickup: farmer.location || `${farmer.farmName}, ${farmer.district} (PIN ${farmer.pinCode})`,
            quantity,
            vehicle: quantity > 30 ? "LARGE_TRUCK" : "BIKE",
            status: LogisticsStatus.CONFIRMED,
            fulfillmentChannel: FulfillmentChannel.SOCIETY,
          },
          include: {
            society: true,
            slot: true,
          },
        });

        emitEvent("LOGISTICS_BOOKED", { id: booking.id, societyId, quantity });
      }

      emitEvent("INVENTORY_UPDATED", { societyId, productId, quantity });

      // Notify Farmer about society supply confirmation
      if (farmer.userId) {
        const estEarnings = Math.round((quantity * (result.supply.product.pricePaise || 0)) / 100);
        await notify(
          farmer.userId,
          "SOCIETY_SUPPLY",
          "Society Supply Confirmed 🏛️",
          `Successfully deposited ${quantity} ${result.supply.product.unit} of ${result.supply.product.name} with ${society.name}.${estEarnings > 0 ? ` Estimated payout: ₹${estEarnings.toLocaleString("en-IN")}.` : ""}`
        );
      }

      // If transport booking was created, notify logistics workers
      if (booking) {
        const logisticsUsers = await prisma.user.findMany({
          where: { role: "LOGISTICS" },
          select: { id: true },
        });
        const pickupLoc = booking.pickup ? booking.pickup.slice(0, 35) : "Farm Gate";
        for (const u of logisticsUsers) {
          await notify(
            u.id,
            "LOGISTICS_BOOKED",
            "New Bulk Society Transport 🚛",
            `Bulk supply (~${Math.round(quantity)} kg) ready for pickup from ${pickupLoc} to ${society.name}. Tap to claim.`
          );
        }
      }

      res.status(201).json({
        ...result,
        booking,
      });
    } catch (error) {
      console.error("POST /societies/:id/supplies", error);
      res.status(500).json({
        error: "Failed to receive farmer supply",
        code: 500,
      });
    }
  }
);
