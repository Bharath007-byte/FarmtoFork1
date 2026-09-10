import { Router } from "express";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

export const adminPaymentsRouter = Router();

adminPaymentsRouter.get(
  "/",
  auth,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const payments = await prisma.payment.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
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

      const summary = payments.reduce(
        (result, payment) => {
          result.totalRecords += 1;

          if (payment.status === "CAPTURED") {
            result.capturedCount += 1;
            result.capturedPaise += payment.amountPaise;
          }

          if (payment.status === "CREATED") {
            result.createdCount += 1;
            result.createdPaise += payment.amountPaise;
          }

          if (payment.status === "AUTHORIZED") {
            result.authorizedCount += 1;
            result.authorizedPaise += payment.amountPaise;
          }

          if (payment.status === "FAILED") {
            result.failedCount += 1;
            result.failedPaise += payment.amountPaise;
          }

          if (payment.status === "REFUNDED") {
            result.refundedCount += 1;
            result.refundedPaise += payment.amountPaise;
          }

          return result;
        },
        {
          totalRecords: 0,
          capturedCount: 0,
          capturedPaise: 0,
          createdCount: 0,
          createdPaise: 0,
          authorizedCount: 0,
          authorizedPaise: 0,
          failedCount: 0,
          failedPaise: 0,
          refundedCount: 0,
          refundedPaise: 0,
        },
      );

      res.json({
        summary,
        payments: payments.map((payment) => ({
          id: payment.id,
          provider: payment.provider,
          providerOrder: payment.providerOrder,
          providerPayId: payment.providerPayId,
          amountPaise: payment.amountPaise,
          currency: payment.currency,
          method: payment.method,
          status: payment.status,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,

          order: {
            id: payment.order.id,
            status: payment.order.status,
            paymentMethod: payment.order.paymentMethod,
            totalPaise: payment.order.totalPaise,
            platformFeePaise: payment.order.platformFeePaise,
            logisticsPaise: payment.order.logisticsPaise,
            createdAt: payment.order.createdAt,

            consumer: payment.order.consumer,
          },
        })),
      });
    } catch (error) {
      console.error("GET /api/admin/payments", error);

      res.status(500).json({
        error: "Failed to load admin payments",
        code: 500,
      });
    }
  },
);

adminPaymentsRouter.get(
  "/:id",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const payment = await prisma.payment.findUnique({
        where: {
          id: String(req.params.id),
        },
        include: {
          order: {
            include: {
              consumer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              items: {
                include: {
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
          webhookEvents: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          error: "Payment not found",
          code: 404,
        });
      }

      res.json({ payment });
    } catch (error) {
      console.error("GET /api/admin/payments/:id", error);

      res.status(500).json({
        error: "Failed to load payment",
        code: 500,
      });
    }
  },
);
