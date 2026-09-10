import { Router, type Request } from "express";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

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
 * Used by the admin dashboard and society directory.
 */
societyRouter.get("/", auth, requireRole("ADMIN"), async (_req, res) => {
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
 * ADMIN only: receive real farmer supply into a society.
 * Creates a SocietySupply ledger row and atomically increases
 * SocietyInventory.available for the product.
 */
societyRouter.post(
  "/:id/supplies",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const societyId = getSocietyId(req);
      const farmerId = String(req.body?.farmerId || "").trim();
      const productId = String(req.body?.productId || "").trim();
      const quantity = Number(req.body?.quantity);

      if (!farmerId) {
        return res.status(422).json({
          error: "farmerId is required",
          code: 422,
        });
      }

      if (!productId) {
        return res.status(422).json({
          error: "productId is required",
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
        select: {
          id: true,
          active: true,
        },
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
        select: { id: true },
      });

      if (!farmer) {
        return res.status(404).json({
          error: "Farmer profile not found",
          code: 404,
        });
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          farmerId: true,
          active: true,
          unit: true,
          name: true,
        },
      });

      if (!product) {
        return res.status(404).json({
          error: "Product not found",
          code: 404,
        });
      }

      if (!product.active) {
        return res.status(409).json({
          error: "Product is not active",
          code: 409,
        });
      }

      if (product.farmerId !== farmerId) {
        return res.status(409).json({
          error: "Product does not belong to the selected farmer",
          code: 409,
        });
      }

      if (product.unit.toLowerCase() !== "kg") {
        return res.status(422).json({
          error: "Only kg products can be received into society inventory",
          code: 422,
        });
      }

      const membership = await prisma.societyFarmer.findFirst({
        where: {
          societyId,
          farmerId,
          active: true,
        },
        select: { id: true },
      });

      if (!membership) {
        return res.status(409).json({
          error: "Farmer is not an active member of this society",
          code: 409,
        });
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

      res.status(201).json(result);
    } catch (error) {
      console.error("POST /societies/:id/supplies", error);
      res.status(500).json({
        error: "Failed to receive farmer supply",
        code: 500,
      });
    }
  }
);
