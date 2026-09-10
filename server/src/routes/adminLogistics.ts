import { Router } from "express";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

export const adminLogisticsRouter = Router();

/**
 * GET /api/admin/logistics
 *
 * Admin-only logistics operations view.
 *
 * Everything returned here comes from PostgreSQL:
 * - logistics bookings
 * - farmer
 * - society
 * - assigned logistics worker
 * - consumer/order
 * - GPS when available
 * - real order value
 */
adminLogisticsRouter.get(
  "/",
  auth,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const jobs = await prisma.logisticsBooking.findMany({
        where: {
          status: {
            not: "CANCELLED",
          },
        },
        orderBy: {
          createdAt: "desc",
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
            },
          },

          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              photoUrl: true,
              deliveryType: true,
              vehicleNumber: true,
            },
          },

          order: {
            select: {
              id: true,
              status: true,
              paymentMethod: true,
              totalPaise: true,
              platformFeePaise: true,
              logisticsPaise: true,
              createdAt: true,
              consumer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      });

      const activeJobs = jobs.filter(
        (job) =>
          !["DELIVERED", "CANCELLED"].includes(job.status),
      );

      const statusCounts = {
        confirmed: jobs.filter((j) => j.status === "CONFIRMED").length,
        pickupScheduled: jobs.filter(
          (j) => j.status === "PICKUP_SCHEDULED",
        ).length,
        farmerReady: jobs.filter(
          (j) => j.status === "FARMER_READY",
        ).length,
        pickedUp: jobs.filter((j) => j.status === "PICKED_UP").length,
        inTransit: jobs.filter((j) => j.status === "IN_TRANSIT").length,
        outForDelivery: jobs.filter(
          (j) => j.status === "OUT_FOR_DELIVERY",
        ).length,
        delivered: jobs.filter((j) => j.status === "DELIVERED").length,
      };

      const totalQuantity = jobs.reduce(
        (sum, job) => sum + Number(job.quantity || 0),
        0,
      );

      const orderValuePaise = jobs.reduce(
        (sum, job) => sum + (job.order?.totalPaise || 0),
        0,
      );

      const logisticsRevenuePaise = jobs.reduce(
        (sum, job) => sum + (job.order?.logisticsPaise || 0),
        0,
      );

      const jobsWithLocation = jobs.filter(
        (job) =>
          job.currentLat != null &&
          job.currentLng != null &&
          job.locationUpdatedAt != null,
      ).length;

      res.json({
        summary: {
          totalJobs: jobs.length,
          activeJobs: activeJobs.length,
          totalQuantity,
          orderValuePaise,
          logisticsRevenuePaise,
          jobsWithLocation,
        },

        statusCounts,

        jobs: jobs.map((job) => ({
          id: job.id,
          orderId: job.orderId,
          status: job.status,
          fulfillmentChannel: job.fulfillmentChannel,

          quantity: job.quantity,
          vehicle: job.vehicle,
          pickup: job.pickup,

          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          acceptedAt: job.acceptedAt,
          farmerReadyAt: job.farmerReadyAt,
          pickedUpAt: job.pickedUpAt,
          inTransitAt: job.inTransitAt,
          deliveredAt: job.deliveredAt,

          location: {
            lat: job.currentLat,
            lng: job.currentLng,
            updatedAt: job.locationUpdatedAt,
          },

          farmer: {
            id: job.farmer.id,
            name: job.farmer.user.name,
            email: job.farmer.user.email,
            phone: job.farmer.user.phone,
            photoUrl: job.farmer.user.photoUrl,
            farmName: job.farmer.farmName,
            district: job.farmer.district,
            state: job.farmer.state,
          },

          society: job.society
            ? {
                id: job.society.id,
                name: job.society.name,
                code: job.society.code,
                address: job.society.address,
                village: job.society.village,
                district: job.society.district,
                state: job.society.state,
                pinCode: job.society.pinCode,
                lat: job.society.lat,
                lng: job.society.lng,
              }
            : null,

          assignedLogistics: job.assignedUser
            ? {
                id: job.assignedUser.id,
                name: job.assignedUser.name,
                email: job.assignedUser.email,
                phone: job.assignedUser.phone,
                photoUrl: job.assignedUser.photoUrl,
                deliveryType: job.assignedUser.deliveryType,
                vehicleNumber: job.assignedUser.vehicleNumber,
              }
            : null,

          order: job.order
            ? {
                id: job.order.id,
                status: job.order.status,
                paymentMethod: job.order.paymentMethod,
                totalPaise: job.order.totalPaise,
                platformFeePaise: job.order.platformFeePaise,
                logisticsPaise: job.order.logisticsPaise,
                createdAt: job.order.createdAt,
                consumer: job.order.consumer,
              }
            : null,
        })),
      });
    } catch (error) {
      console.error("GET /api/admin/logistics", error);

      res.status(500).json({
        error: "Failed to load admin logistics",
        code: 500,
      });
    }
  },
);

/**
 * GET /api/admin/logistics/:id
 *
 * Detailed view for one logistics job.
 */
adminLogisticsRouter.get(
  "/:id",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const job = await prisma.logisticsBooking.findUnique({
        where: {
          id: String(req.params.id),
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
            },
          },

          society: true,

          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              photoUrl: true,
              deliveryType: true,
              vehicleNumber: true,
            },
          },

          order: {
            select: {
              id: true,
              status: true,
              paymentMethod: true,
              totalPaise: true,
              platformFeePaise: true,
              logisticsPaise: true,
              createdAt: true,
              consumer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              items: {
                select: {
                  id: true,
                  qty: true,
                  unitPaise: true,
                  linePaise: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      variety: true,
                      unit: true,
                      imageUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!job) {
        return res.status(404).json({
          error: "Logistics job not found",
          code: 404,
        });
      }

      res.json({ job });
    } catch (error) {
      console.error("GET /api/admin/logistics/:id", error);

      res.status(500).json({
        error: "Failed to load logistics job",
        code: 500,
      });
    }
  },
);
