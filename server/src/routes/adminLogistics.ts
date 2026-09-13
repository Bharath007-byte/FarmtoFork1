import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { emitEvent } from "../socket.js";

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
 * GET /api/admin/logistics/verifications
 * List all logistics workers with verification status, worker type, and document counts.
 */
adminLogisticsRouter.get(
  "/verifications",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;

      const workers = await prisma.user.findMany({
        where: {
          role: "LOGISTICS",
          ...(status && status !== "ALL"
            ? {
                logisticsVerification: {
                  status: status as any,
                },
              }
            : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          logisticsVerification: {
            include: {
              documents: {
                orderBy: { uploadedAt: "desc" },
              },
            },
          },
        },
      });

      const list = workers.map((w) => {
        const v = w.logisticsVerification;
        const activeDocs = v?.documents.filter((d) => d.status !== "REPLACED") || [];
        const verifiedCount = activeDocs.filter((d) => d.status === "VERIFIED").length;
        const rejectedCount = activeDocs.filter((d) => d.status === "REJECTED" || d.status === "REUPLOAD_REQUIRED").length;

        return {
          id: w.id,
          name: w.name,
          email: w.email,
          phone: w.phone,
          photoUrl: w.photoUrl,
          workerType: v?.vehicleType || w.deliveryType || "BIKE",
          vehicleNumber: v?.vehicleNumber || w.vehicleNumber,
          verificationId: v?.id || null,
          status: v?.status || "INCOMPLETE",
          currentStep: v?.currentStep || 1,
          submittedAt: v?.submittedAt || null,
          reviewedAt: v?.reviewedAt || null,
          rejectionReason: v?.rejectionReason || null,
          documentsCount: activeDocs.length,
          verifiedDocumentsCount: verifiedCount,
          rejectedDocumentsCount: rejectedCount,
          documents: activeDocs.map((d) => ({
            id: d.id,
            documentType: d.documentType,
            status: d.status,
            fileName: d.fileName,
            fileSize: d.fileSize,
            mimeType: d.mimeType,
            uploadedAt: d.uploadedAt,
            attempts: d.attempts,
            rejectionReason: d.rejectionReason,
            reviewerNotes: d.reviewerNotes,
            extractedData: d.extractedData,
          })),
        };
      });

      res.json({ workers: list });
    } catch (error: any) {
      console.error("GET /api/admin/logistics/verifications error:", error);
      res.status(500).json({ error: "Failed to load logistics verifications", code: 500 });
    }
  }
);

/**
 * GET /api/admin/logistics/verifications/:id
 * Detailed verification view for one worker
 */
adminLogisticsRouter.get(
  "/verifications/:id",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const worker = await prisma.user.findUnique({
        where: { id: String(req.params.id) },
        include: {
          logisticsVerification: {
            include: {
              documents: {
                orderBy: { uploadedAt: "desc" },
              },
            },
          },
        },
      });

      if (!worker) {
        return res.status(404).json({ error: "Logistics worker not found", code: 404 });
      }

      res.json({ worker });
    } catch (error: any) {
      console.error("GET /api/admin/logistics/verifications/:id error:", error);
      res.status(500).json({ error: "Failed to load worker verification details", code: 500 });
    }
  }
);

/**
 * PATCH /api/admin/logistics/verifications/:id
 * Admin action: Approve, Reject, Verify Document, Reject Document, Request Re-upload
 */
adminLogisticsRouter.patch(
  "/verifications/:id",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const userId = String(req.params.id);
      const { action, documentId, rejectionReason, reviewerNotes } = req.body;

      const verification = await prisma.logisticsVerification.findUnique({
        where: { userId },
        include: { documents: true },
      });

      if (!verification) {
        return res.status(404).json({ error: "Verification record not found", code: 404 });
      }

      // Action 1: Reject Worker (REJECTION REASON REQUIRED!)
      if (action === "REJECT_WORKER") {
        if (!rejectionReason || !rejectionReason.trim()) {
          return res.status(422).json({
            error: "Rejection reason is strictly required when rejecting a worker.",
            code: 422,
          });
        }

        const updated = await prisma.logisticsVerification.update({
          where: { id: verification.id },
          data: {
            status: "REJECTED",
            rejectionReason: rejectionReason.trim(),
            reviewedAt: new Date(),
          },
        });

        emitEvent("worker:verification_updated", {
          userId,
          status: "REJECTED",
          rejectionReason: rejectionReason.trim(),
        });

        return res.json({ success: true, verification: updated, message: "Worker verification rejected." });
      }

      // Action 2: Approve Worker
      if (action === "APPROVE_WORKER") {
        const updated = await prisma.logisticsVerification.update({
          where: { id: verification.id },
          data: {
            status: "APPROVED",
            rejectionReason: null,
            reviewedAt: new Date(),
          },
        });

        emitEvent("worker:verification_updated", {
          userId,
          status: "APPROVED",
        });

        return res.json({ success: true, verification: updated, message: "Worker approved successfully! Dashboard unlocked." });
      }

      // Action 3: Verify Specific Document
      if (action === "VERIFY_DOCUMENT") {
        if (!documentId) {
          return res.status(422).json({ error: "Document ID is required", code: 422 });
        }

        await prisma.logisticsDocument.update({
          where: { id: String(documentId) },
          data: {
            status: "VERIFIED",
            verifiedAt: new Date(),
            reviewerNotes: reviewerNotes?.trim() || null,
            rejectionReason: null,
          },
        });

        // Check if all active documents are now verified
        const allActive = await prisma.logisticsDocument.findMany({
          where: { verificationId: verification.id, status: { not: "REPLACED" } },
        });

        const allVerified = allActive.length > 0 && allActive.every((d) => d.status === "VERIFIED");
        if (allVerified) {
          await prisma.logisticsVerification.update({
            where: { id: verification.id },
            data: { status: "VERIFIED" },
          });
        }

        return res.json({ success: true, message: "Document marked as verified." });
      }

      // Action 4: Reject Specific Document (REJECTION REASON REQUIRED!)
      if (action === "REJECT_DOCUMENT") {
        if (!documentId) {
          return res.status(422).json({ error: "Document ID is required", code: 422 });
        }
        if (!rejectionReason || !rejectionReason.trim()) {
          return res.status(422).json({
            error: "Rejection reason is strictly required when rejecting a document.",
            code: 422,
          });
        }

        await prisma.logisticsDocument.update({
          where: { id: String(documentId) },
          data: {
            status: "REJECTED",
            rejectionReason: rejectionReason.trim(),
            reviewerNotes: reviewerNotes?.trim() || null,
          },
        });

        await prisma.logisticsVerification.update({
          where: { id: verification.id },
          data: {
            status: "ACTION_REQUIRED",
            rejectionReason: `Document rejected: ${rejectionReason.trim()}`,
          },
        });

        return res.json({ success: true, message: "Document rejected with reason recorded." });
      }

      // Action 5: Request Re-upload (REASON / INSTRUCTION REQUIRED!)
      if (action === "REQUEST_REUPLOAD") {
        if (!documentId) {
          return res.status(422).json({ error: "Document ID is required", code: 422 });
        }
        if (!rejectionReason || !rejectionReason.trim()) {
          return res.status(422).json({
            error: "Please specify what needs to be corrected for the re-upload.",
            code: 422,
          });
        }

        await prisma.logisticsDocument.update({
          where: { id: String(documentId) },
          data: {
            status: "REUPLOAD_REQUIRED",
            rejectionReason: rejectionReason.trim(),
            reviewerNotes: reviewerNotes?.trim() || null,
          },
        });

        await prisma.logisticsVerification.update({
          where: { id: verification.id },
          data: {
            status: "ACTION_REQUIRED",
            rejectionReason: `Re-upload requested: ${rejectionReason.trim()}`,
          },
        });

        return res.json({ success: true, message: "Re-upload request sent to worker." });
      }

      // Action 6: Keep Pending
      if (action === "KEEP_PENDING") {
        await prisma.logisticsVerification.update({
          where: { id: verification.id },
          data: {
            status: "PENDING_REVIEW",
            rejectionReason: reviewerNotes?.trim() || null,
          },
        });

        return res.json({ success: true, message: "Worker verification kept in pending review." });
      }

      return res.status(400).json({ error: "Invalid action specified", code: 400 });
    } catch (error: any) {
      console.error("PATCH /api/admin/logistics/verifications/:id error:", error);
      res.status(500).json({ error: "Failed to update verification", code: 500 });
    }
  }
);

/**
 * GET /api/admin/logistics/documents/:id/file
 * Stream document securely for admin review
 */
adminLogisticsRouter.get(
  "/documents/:id/file",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const doc = await prisma.logisticsDocument.findUnique({
        where: { id: String(req.params.id) },
      });

      if (!doc) {
        return res.status(404).json({ error: "Document not found", code: 404 });
      }

      const safePath = path.resolve(doc.fileUrl);
      if (!fs.existsSync(safePath)) {
        return res.status(404).json({ error: "Document file not found on disk", code: 404 });
      }

      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.fileName)}"`);
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");

      const stream = fs.createReadStream(safePath);
      stream.pipe(res);
    } catch (error: any) {
      console.error("GET /api/admin/logistics/documents/:id/file error:", error);
      res.status(500).json({ error: "Failed to stream document", code: 500 });
    }
  }
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
