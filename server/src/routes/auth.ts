import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken, auth } from "../middleware/auth.js";
import { turnstileGuard } from "../lib/turnstile.js";
import { issueOtp, consumeOtp } from "../lib/otp.js";
import { hashOtp } from "../lib/hash.js";
import { randomBytes } from "node:crypto";

export const authRouter = Router();

const registerSchema = z.object({
  role: z.enum(["FARMER", "CONSUMER", "LOGISTICS"]),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  phone: z.string().optional(),
  farmName: z.string().optional(),
  location: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
  categories: z.array(z.string()).optional(),
  details: z.string().optional(),
  turnstileToken: z.string().optional(),
});

authRouter.post("/register", turnstileGuard, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.flatten(), code: 422 });
  const b = parsed.data;
  if (b.password !== b.confirmPassword) {
    return res.status(422).json({ error: "Passwords do not match", code: 422 });
  }
  if (b.role === "FARMER" && (!b.farmName || !b.district || !b.state || !b.pinCode)) {
    return res.status(422).json({ error: "Farm name, district, state and PIN are required", code: 422 });
  }
  const exists = await prisma.user.findUnique({ where: { email: b.email.toLowerCase() } });
  if (exists) return res.status(409).json({ error: "Email already registered", code: 409 });
  const passwordHash = await bcrypt.hash(b.password, 12);
  const user = await prisma.user.create({
    data: {
      role: b.role,
      name: b.name,
      email: b.email.toLowerCase(),
      phone: b.phone,
      passwordHash,
      farmer:
        b.role === "FARMER"
          ? {
              create: {
                farmName: b.farmName!,
                location: b.location || `${b.district}, ${b.state}`,
                district: b.district!,
                state: b.state!,
                pinCode: b.pinCode!,
                categories: b.categories || [],
                details: b.details,
              },
            }
          : undefined,
    },
    include: { farmer: true },
  });
  const token = signToken({
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });
  res.status(201).json({ token, user: publicUser(user) });
});

authRouter.post("/login", turnstileGuard, async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase();
  const password = String(req.body?.password || "");
  const user = await prisma.user.findUnique({ where: { email }, include: { farmer: true } });
  if (!user) return res.status(401).json({ error: "No account found", code: 401 });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Incorrect password", code: 401 });
  const token = signToken({
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });
  res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", auth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { farmer: true },
  });
  if (!user) return res.status(401).json({ error: "Unauthorized", code: 401 });
  res.json({ user: publicUser(user) });
});

authRouter.post("/forgot-password", turnstileGuard, async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json({ ok: true });
  const issued = await issueOtp({
    userId: user.id,
    channel: user.phone || user.email,
    purpose: "password_reset",
  });
  const raw = randomBytes(24).toString("hex");
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashOtp(raw),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  res.json({ ok: true, otpId: issued.id, delivery: issued.delivery, resetHint: issued.delivery });
});

authRouter.post("/reset-password", async (req, res) => {
  const otpId = String(req.body?.otpId || "");
  const code = String(req.body?.code || "");
  const password = String(req.body?.password || "");
  if (password.length < 8) return res.status(422).json({ error: "Password too short", code: 422 });
  const otp = await consumeOtp(otpId, code);
  if (!otp.ok) return res.status(400).json({ error: otp.error, code: 400 });
  const row = await prisma.otpVerification.findUnique({ where: { id: otpId } });
  if (!row?.userId) return res.status(400).json({ error: "OTP has no user", code: 400 });
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: row.userId }, data: { passwordHash } });
  res.json({ ok: true });
});

function publicUser(user: {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  farmer: unknown;
}) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    photoUrl: user.photoUrl,
    farmer: user.farmer,
  };
}
