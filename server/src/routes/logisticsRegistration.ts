import { Router, Request, Response } from "express";
import { z } from "zod";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { auth, requireRole, signToken } from "../middleware/auth.js";
import {
  validateDocumentQuality,
  runDocumentVerificationPipeline,
  REQUIRED_DOCUMENTS_BY_WORKER_TYPE,
  DOCUMENT_LABELS,
  DocumentType,
} from "../services/documentVerification.js";

export const logisticsRegistrationRouter = Router();

// Secure directory for identity documents (NOT exposed via express.static)
const secureStorageDir = path.join(process.cwd(), "storage", "secure_documents");
const avatarStorageDir = path.join(process.cwd(), "uploads", "logistics");

fs.mkdirSync(secureStorageDir, { recursive: true });
fs.mkdirSync(avatarStorageDir, { recursive: true });

const upload = multer({
  dest: path.join(process.cwd(), "storage", "tmp"),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
fs.mkdirSync(path.join(process.cwd(), "storage", "tmp"), { recursive: true });

const registerStep1Schema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().regex(/^\+?[0-9]{10,14}$/, "Please enter a valid 10-digit mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  confirmPassword: z.string().min(8).optional(),
  dateOfBirth: z.string().min(4, "Date of birth is required"),
  gender: z.string().optional(),
  address: z.string().trim().min(5, "Address must be at least 5 characters"),
  district: z.string().trim().min(2, "District is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  pinCode: z.string().trim().regex(/^[0-9]{6}$/, "PIN code must be a 6-digit number"),
  emergencyName: z.string().trim().min(2, "Emergency contact name is required"),
  emergencyPhone: z.string().trim().regex(/^\+?[0-9]{10,14}$/, "Please enter a valid emergency mobile number"),
  emergencyRelation: z.string().trim().min(2, "Relationship is required"),
  workerType: z.enum(["BIKE", "LARGE_TRUCK"]),
  termsAccepted: z.boolean().refine((val) => val === true, "You must accept the terms and conditions"),
  consentAccepted: z.boolean().refine((val) => val === true, "You must provide consent for document verification"),
});

/**
 * STEP 1: Personal & Logistics Registration
 * POST /api/logistics/register
 */
logisticsRegistrationRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const parsed = registerStep1Schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: parsed.error.issues.map((i) => i.message).join(". "),
        details: parsed.error.flatten(),
        code: 422,
      });
    }

    const data = parsed.data;

    let userId: string;
    let userRecord: any;

    // Check if user is already logged in or if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: { logisticsVerification: true },
    });

    if (existingUser) {
      // If user exists but is not logistics role, or already registered
      if (existingUser.role !== "LOGISTICS") {
        return res.status(409).json({
          error: "An account with this email already exists with a different role. Please sign in or use another email.",
          code: 409,
        });
      }
      userId = existingUser.id;
      userRecord = existingUser;

      // Update user info
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          phone: data.phone,
          deliveryType: data.workerType,
        },
      });
    } else {
      // New registration requires password
      if (!data.password || !data.confirmPassword) {
        return res.status(422).json({
          error: "Password and Confirm Password are required for registration.",
          code: 422,
        });
      }
      if (data.password !== data.confirmPassword) {
        return res.status(422).json({
          error: "Passwords do not match.",
          code: 422,
        });
      }

      const passwordHash = await bcrypt.hash(data.password, 12);

      userRecord = await prisma.user.create({
        data: {
          role: "LOGISTICS",
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          passwordHash,
          deliveryType: data.workerType,
        },
      });
      userId = userRecord.id;
    }

    // Upsert LogisticsVerification record with Step 1 details
    const verification = await prisma.logisticsVerification.upsert({
      where: { userId },
      create: {
        userId,
        vehicleType: data.workerType,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender || null,
        address: data.address,
        district: data.district,
        city: data.city,
        state: data.state,
        pinCode: data.pinCode,
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        emergencyRelation: data.emergencyRelation,
        termsAccepted: data.termsAccepted,
        consentAccepted: data.consentAccepted,
        currentStep: 2,
        status: "INCOMPLETE",
      },
      update: {
        vehicleType: data.workerType,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender || null,
        address: data.address,
        district: data.district,
        city: data.city,
        state: data.state,
        pinCode: data.pinCode,
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        emergencyRelation: data.emergencyRelation,
        termsAccepted: data.termsAccepted,
        consentAccepted: data.consentAccepted,
        currentStep: 2,
      },
    });

    const token = signToken({
      id: userRecord.id,
      role: userRecord.role,
      email: userRecord.email,
      name: userRecord.name,
    });

    res.status(200).json({
      token,
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: "logistics",
        phone: userRecord.phone,
      },
      verification: {
        id: verification.id,
        status: verification.status,
        currentStep: verification.currentStep,
        workerType: verification.vehicleType,
      },
      nextStep: "/logistics/register/documents",
    });
  } catch (error: any) {
    console.error("POST /api/logistics/register error:", error);
    res.status(500).json({ error: error.message || "Failed to submit registration.", code: 500 });
  }
});

/**
 * GET /api/logistics/onboarding
 * Get current onboarding state, steps, and document checklist
 */
logisticsRegistrationRouter.get(
  "/onboarding",
  auth,
  requireRole("LOGISTICS"),
  async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
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

      if (!user) {
        return res.status(404).json({ error: "Worker not found", code: 404 });
      }

      const verification = user.logisticsVerification;
      const workerType = verification?.vehicleType || user.deliveryType || "BIKE";
      const requiredTypes = REQUIRED_DOCUMENTS_BY_WORKER_TYPE[workerType] || REQUIRED_DOCUMENTS_BY_WORKER_TYPE.BIKE;

      // Group active documents (latest per documentType that is not REPLACED)
      const allDocs = verification?.documents || [];
      const activeDocsMap: Record<string, any> = {};

      for (const doc of allDocs) {
        if (!activeDocsMap[doc.documentType] && doc.status !== "REPLACED") {
          activeDocsMap[doc.documentType] = doc;
        }
      }

      const checklist = requiredTypes.map((type) => {
        const doc = activeDocsMap[type];
        return {
          documentType: type,
          label: DOCUMENT_LABELS[type] || type,
          uploaded: !!doc,
          status: doc ? doc.status : "NOT_UPLOADED",
          rejectionReason: doc?.rejectionReason || null,
          reviewerNotes: doc?.reviewerNotes || null,
          uploadedAt: doc?.uploadedAt || null,
          attempts: doc?.attempts || 0,
          documentId: doc?.id || null,
        };
      });

      const missingCount = checklist.filter((item) => !item.uploaded).length;
      const rejectedCount = checklist.filter(
        (item) => item.status === "REJECTED" || item.status === "REUPLOAD_REQUIRED"
      ).length;

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          photoUrl: user.photoUrl,
          deliveryType: user.deliveryType,
          vehicleNumber: user.vehicleNumber,
        },
        verification: verification
          ? {
              id: verification.id,
              status: verification.status,
              currentStep: verification.currentStep,
              workerType: verification.vehicleType,
              dateOfBirth: verification.dateOfBirth,
              address: verification.address,
              district: verification.district,
              city: verification.city,
              state: verification.state,
              pinCode: verification.pinCode,
              emergencyName: verification.emergencyName,
              emergencyPhone: verification.emergencyPhone,
              emergencyRelation: verification.emergencyRelation,
              vehicleMake: verification.vehicleMake,
              vehicleModel: verification.vehicleModel,
              vehicleColour: verification.vehicleColour,
              vehicleYear: verification.vehicleYear,
              truckType: verification.truckType,
              capacityKg: verification.capacityKg,
              rejectionReason: verification.rejectionReason,
            }
          : null,
        checklist,
        missingCount,
        rejectedCount,
        canAccessDashboard: verification?.status === "APPROVED" || verification?.status === "VERIFIED",
      });
    } catch (error: any) {
      console.error("GET /api/logistics/onboarding error:", error);
      res.status(500).json({ error: "Failed to load onboarding status", code: 500 });
    }
  }
);

/**
 * STEP 2: Document Upload
 * POST /api/logistics/documents
 */
logisticsRegistrationRouter.post(
  "/documents",
  auth,
  requireRole("LOGISTICS"),
  upload.single("document"),
  async (req: Request, res: Response) => {
    const tempFile = req.file;

    try {
      if (!tempFile) {
        return res.status(422).json({
          error: "No file uploaded. Please select or capture a document to upload.",
          code: 422,
        });
      }

      const documentType = req.body?.documentType as DocumentType;
      if (!documentType || !DOCUMENT_LABELS[documentType]) {
        if (fs.existsSync(tempFile.path)) fs.unlinkSync(tempFile.path);
        return res.status(422).json({
          error: "Invalid document type specified.",
          code: 422,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          logisticsVerification: {
            include: { documents: true },
          },
        },
      });

      if (!user || !user.logisticsVerification) {
        if (fs.existsSync(tempFile.path)) fs.unlinkSync(tempFile.path);
        return res.status(404).json({
          error: "Logistics profile not initialized. Please complete Step 1 first.",
          code: 404,
        });
      }

      // Existing active hashes to prevent duplicate file uploads across slots
      const activeDocuments = user.logisticsVerification.documents.filter(
        (d) => d.status !== "REPLACED" && d.fileHash
      );
      const existingHashes = activeDocuments
        .filter((d) => d.documentType !== documentType)
        .map((d) => d.fileHash!)
        .filter(Boolean);

      // Quality and Magic Bytes Validation
      const qualityCheck = validateDocumentQuality(tempFile.path, tempFile.mimetype, existingHashes);
      if (!qualityCheck.valid) {
        if (fs.existsSync(tempFile.path)) fs.unlinkSync(tempFile.path);
        return res.status(422).json({
          error: qualityCheck.error,
          code: 422,
        });
      }

      // Target permanent storage
      const ext = path.extname(tempFile.originalname) || (qualityCheck.mimeType === "application/pdf" ? ".pdf" : ".jpg");
      const safeFileName = `${req.user!.id}_${documentType}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
      const permanentPath = path.join(secureStorageDir, safeFileName);

      fs.copyFileSync(tempFile.path, permanentPath);
      fs.unlinkSync(tempFile.path);

      // If profile photo, also copy to public avatars for site display
      let photoUrl: string | undefined;
      if (documentType === "PROFILE_PHOTO") {
        const avatarPath = path.join(avatarStorageDir, safeFileName);
        fs.copyFileSync(permanentPath, avatarPath);
        photoUrl = `/uploads/logistics/${safeFileName}`;
        await prisma.user.update({
          where: { id: req.user!.id },
          data: { photoUrl },
        });
      }

      // Archive previous document of same type
      const previousDoc = user.logisticsVerification.documents.find(
        (d) => d.documentType === documentType && d.status !== "REPLACED"
      );
      const attempts = (previousDoc?.attempts || 0) + 1;

      if (previousDoc) {
        await prisma.logisticsDocument.update({
          where: { id: previousDoc.id },
          data: { status: "REPLACED" },
        });
      }

      // Run real verification pipeline
      const pipelineResult = await runDocumentVerificationPipeline({
        documentType,
        filePath: permanentPath,
        userName: user.name,
        vehicleNumber: user.vehicleNumber || user.logisticsVerification.vehicleNumber,
      });

      const newDoc = await prisma.logisticsDocument.create({
        data: {
          verificationId: user.logisticsVerification.id,
          userId: user.id,
          documentType,
          fileUrl: permanentPath,
          fileName: tempFile.originalname || safeFileName,
          fileSize: tempFile.size,
          mimeType: qualityCheck.mimeType || tempFile.mimetype,
          fileHash: qualityCheck.fileHash,
          status: pipelineResult.status,
          attempts,
          extractedData: (pipelineResult.extractedData as any) || undefined,
        },
      });

      res.status(201).json({
        success: true,
        document: {
          id: newDoc.id,
          documentType: newDoc.documentType,
          status: newDoc.status,
          attempts: newDoc.attempts,
          fileName: newDoc.fileName,
          uploadedAt: newDoc.uploadedAt,
          statusMessage: pipelineResult.statusMessage,
          automatedVerification: pipelineResult.automatedVerification,
        },
        photoUrl,
      });
    } catch (error: any) {
      if (tempFile && fs.existsSync(tempFile.path)) {
        fs.unlinkSync(tempFile.path);
      }
      console.error("POST /api/logistics/documents error:", error);
      res.status(500).json({ error: error.message || "Failed to upload document", code: 500 });
    }
  }
);

/**
 * Re-upload replacement for a rejected document
 * POST /api/logistics/documents/:id/reupload
 */
logisticsRegistrationRouter.post(
  "/documents/:id/reupload",
  auth,
  requireRole("LOGISTICS"),
  upload.single("document"),
  async (req: Request, res: Response) => {
    const tempFile = req.file;

    try {
      if (!tempFile) {
        return res.status(422).json({ error: "Please choose a replacement document.", code: 422 });
      }

      const existingDoc = await prisma.logisticsDocument.findUnique({
        where: { id: String(req.params.id) },
        include: { verification: true },
      });

      if (!existingDoc || existingDoc.userId !== req.user!.id) {
        if (fs.existsSync(tempFile.path)) fs.unlinkSync(tempFile.path);
        return res.status(404).json({ error: "Document record not found or access denied.", code: 404 });
      }

      // Quality check
      const qualityCheck = validateDocumentQuality(tempFile.path, tempFile.mimetype);
      if (!qualityCheck.valid) {
        if (fs.existsSync(tempFile.path)) fs.unlinkSync(tempFile.path);
        return res.status(422).json({ error: qualityCheck.error, code: 422 });
      }

      const ext = path.extname(tempFile.originalname) || ".jpg";
      const safeFileName = `${req.user!.id}_${existingDoc.documentType}_reupload_${Date.now()}${ext}`;
      const permanentPath = path.join(secureStorageDir, safeFileName);

      fs.copyFileSync(tempFile.path, permanentPath);
      fs.unlinkSync(tempFile.path);

      // Mark old document as REPLACED
      await prisma.logisticsDocument.update({
        where: { id: existingDoc.id },
        data: { status: "REPLACED" },
      });

      // Run pipeline
      const pipelineResult = await runDocumentVerificationPipeline({
        documentType: existingDoc.documentType as DocumentType,
        filePath: permanentPath,
        userName: req.user!.name,
      });

      const replacementDoc = await prisma.logisticsDocument.create({
        data: {
          verificationId: existingDoc.verificationId,
          userId: req.user!.id,
          documentType: existingDoc.documentType,
          fileUrl: permanentPath,
          fileName: tempFile.originalname || safeFileName,
          fileSize: tempFile.size,
          mimeType: qualityCheck.mimeType || tempFile.mimetype,
          fileHash: qualityCheck.fileHash,
          status: pipelineResult.status,
          attempts: existingDoc.attempts + 1,
          extractedData: (pipelineResult.extractedData as any) || undefined,
        },
      });

      // If user had status ACTION_REQUIRED, check if any other rejected docs remain
      const remainingRejected = await prisma.logisticsDocument.count({
        where: {
          verificationId: existingDoc.verificationId,
          status: { in: ["REJECTED", "REUPLOAD_REQUIRED"] },
        },
      });

      if (remainingRejected === 0) {
        await prisma.logisticsVerification.update({
          where: { id: existingDoc.verificationId },
          data: { status: "PENDING_REVIEW" },
        });
      }

      res.json({
        success: true,
        document: replacementDoc,
        statusMessage: "Document successfully re-uploaded and submitted for review.",
      });
    } catch (error: any) {
      if (tempFile && fs.existsSync(tempFile.path)) {
        fs.unlinkSync(tempFile.path);
      }
      console.error("POST /api/logistics/documents/:id/reupload error:", error);
      res.status(500).json({ error: "Failed to re-upload document", code: 500 });
    }
  }
);

/**
 * STEP 3: Document Verification Submission
 * POST /api/logistics/verification/submit
 */
logisticsRegistrationRouter.post(
  "/verification/submit",
  auth,
  requireRole("LOGISTICS"),
  async (req: Request, res: Response) => {
    try {
      const verification = await prisma.logisticsVerification.findUnique({
        where: { userId: req.user!.id },
        include: { documents: true },
      });

      if (!verification) {
        return res.status(404).json({ error: "Logistics profile not found", code: 404 });
      }

      const workerType = verification.vehicleType || "BIKE";
      const requiredTypes = REQUIRED_DOCUMENTS_BY_WORKER_TYPE[workerType] || REQUIRED_DOCUMENTS_BY_WORKER_TYPE.BIKE;

      const activeDocs = verification.documents.filter((d) => d.status !== "REPLACED");
      const uploadedTypes = new Set(activeDocs.map((d) => d.documentType));

      const missing = requiredTypes.filter((t) => !uploadedTypes.has(t));
      if (missing.length > 0) {
        const missingLabels = missing.map((m) => DOCUMENT_LABELS[m] || m).join(", ");
        return res.status(422).json({
          error: `Please upload all required documents before submitting: ${missingLabels}`,
          missing,
          code: 422,
        });
      }

      // Check if both front and back of licence are present
      if (!uploadedTypes.has("DRIVING_LICENCE_FRONT") || !uploadedTypes.has("DRIVING_LICENCE_BACK")) {
        return res.status(422).json({
          error: "Both front and back sides of your driving licence are mandatory.",
          code: 422,
        });
      }

      // Update verification to PENDING_REVIEW and step to 4
      const updated = await prisma.logisticsVerification.update({
        where: { id: verification.id },
        data: {
          status: "PENDING_REVIEW",
          currentStep: 4,
          submittedAt: new Date(),
        },
      });

      res.json({
        success: true,
        verification: {
          id: updated.id,
          status: updated.status,
          currentStep: updated.currentStep,
        },
        message: "Your documents have been submitted and are pending review.",
        nextStep: "/logistics/register/status",
      });
    } catch (error: any) {
      console.error("POST /api/logistics/verification/submit error:", error);
      res.status(500).json({ error: "Failed to submit documents for verification", code: 500 });
    }
  }
);

/**
 * STEP 5: Vehicle Information
 * POST /api/logistics/vehicle
 */
const vehicleSchema = z.object({
  vehicleType: z.enum(["BIKE", "LARGE_TRUCK"]),
  vehicleNumber: z.string().trim().min(3).max(25, "Please enter a valid vehicle number"),
  vehicleMake: z.string().trim().min(2, "Vehicle make / brand is required"),
  vehicleModel: z.string().trim().min(1, "Vehicle model is required"),
  vehicleColour: z.string().trim().min(2, "Vehicle colour is required"),
  vehicleYear: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  truckType: z.string().optional(),
  capacityKg: z.number().min(5, "Capacity must be at least 5 kg"),
});

logisticsRegistrationRouter.post(
  "/vehicle",
  auth,
  requireRole("LOGISTICS"),
  async (req: Request, res: Response) => {
    try {
      const parsed = vehicleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({
          error: parsed.error.issues.map((i) => i.message).join(". "),
          code: 422,
        });
      }

      const v = parsed.data;

      // Update User and LogisticsVerification
      await prisma.$transaction([
        prisma.user.update({
          where: { id: req.user!.id },
          data: {
            deliveryType: v.vehicleType,
            vehicleNumber: v.vehicleNumber.toUpperCase(),
          },
        }),
        prisma.logisticsVerification.update({
          where: { userId: req.user!.id },
          data: {
            vehicleType: v.vehicleType,
            vehicleNumber: v.vehicleNumber.toUpperCase(),
            vehicleMake: v.vehicleMake,
            vehicleModel: v.vehicleModel,
            vehicleColour: v.vehicleColour,
            vehicleYear: v.vehicleYear,
            truckType: v.truckType || null,
            capacityKg: v.capacityKg,
            currentStep: 6,
          },
        }),
      ]);

      res.json({
        success: true,
        message: "Vehicle information saved successfully.",
        nextStep: "/logistics/register/approval",
      });
    } catch (error: any) {
      console.error("POST /api/logistics/vehicle error:", error);
      res.status(500).json({ error: "Failed to save vehicle information", code: 500 });
    }
  }
);

/**
 * GET /api/logistics/verification-status
 * Lightweight route guard check
 */
logisticsRegistrationRouter.get(
  "/verification-status",
  auth,
  requireRole("LOGISTICS"),
  async (req: Request, res: Response) => {
    try {
      const v = await prisma.logisticsVerification.findUnique({
        where: { userId: req.user!.id },
        select: {
          status: true,
          currentStep: true,
          rejectionReason: true,
        },
      });

      if (!v) {
        return res.json({
          status: "INCOMPLETE",
          currentStep: 1,
          canAccessDashboard: false,
        });
      }

      const canAccessDashboard = v.status === "APPROVED" || v.status === "VERIFIED";

      res.json({
        status: v.status,
        currentStep: v.currentStep,
        rejectionReason: v.rejectionReason,
        canAccessDashboard,
      });
    } catch (error: any) {
      console.error("GET /api/logistics/verification-status error:", error);
      res.status(500).json({ error: "Failed to check verification status", code: 500 });
    }
  }
);

/**
 * GET /api/logistics/documents/:id/file
 * Authenticated streaming of sensitive document files
 */
logisticsRegistrationRouter.get(
  "/documents/:id/file",
  auth,
  async (req: Request, res: Response) => {
    try {
      const doc = await prisma.logisticsDocument.findUnique({
        where: { id: String(req.params.id) },
      });

      if (!doc) {
        return res.status(404).json({ error: "Document not found", code: 404 });
      }

      // Security check: Only the owner or an ADMIN can view this document
      if (doc.userId !== req.user!.id && req.user!.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied. You do not have permission to view this document.", code: 403 });
      }

      // Strict path verification to prevent path traversal
      const safePath = path.resolve(doc.fileUrl);
      if (!safePath.startsWith(path.resolve(secureStorageDir))) {
        return res.status(403).json({ error: "Invalid document path", code: 403 });
      }

      if (!fs.existsSync(safePath)) {
        return res.status(404).json({ error: "Document file is missing from storage", code: 404 });
      }

      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.fileName)}"`);
      res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");

      const stream = fs.createReadStream(safePath);
      stream.pipe(res);
    } catch (error: any) {
      console.error("GET /api/logistics/documents/:id/file error:", error);
      res.status(500).json({ error: "Failed to read document file", code: 500 });
    }
  }
);
