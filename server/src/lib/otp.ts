import { randomInt } from "node:crypto";
import { env } from "../env.js";
import { prisma } from "../db.js";
import { hashOtp } from "./hash.js";

export async function issueOtp(opts: {
  userId?: string;
  channel: string;
  purpose: string;
}) {
  const recent = await prisma.otpVerification.findFirst({
    where: {
      channel: opts.channel,
      purpose: opts.purpose,
      createdAt: { gt: new Date(Date.now() - 45_000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    return { id: recent.id, delivery: "cooldown" as const, expiresAt: recent.expiresAt };
  }
  const code = String(randomInt(100000, 999999));
  const row = await prisma.otpVerification.create({
    data: {
      userId: opts.userId,
      channel: opts.channel,
      purpose: opts.purpose,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  let delivery: "sms" | "dev_console" = "sms";
  if (!env.otpProviderKey) {
    delivery = "dev_console";
    console.info(`[OTP ${opts.purpose}] destination=${opts.channel} code=${code} (dev console only; not sent to client)`);
  } else {
    const r = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: env.otpProviderKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: code,
        numbers: opts.channel.replace(/\D/g, "").slice(-10),
      }),
    });
    if (!r.ok) throw new Error("OTP provider rejected the send");
  }
  return { id: row.id, delivery, expiresAt: row.expiresAt };
}

export function evaluateOtp(
  row: {
    verified: boolean;
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
    codeHash: string;
  },
  code: string,
  now = Date.now()
) {
  if (row.verified) return { ok: false as const, error: "OTP already used" };
  if (row.expiresAt.getTime() < now) return { ok: false as const, error: "OTP expired" };
  if (row.attempts >= row.maxAttempts) return { ok: false as const, error: "Too many attempts" };
  if (row.codeHash !== hashOtp(code)) return { ok: false as const, error: "Invalid OTP" };
  return { ok: true as const };
}

export async function consumeOtp(id: string, code: string) {
  const row = await prisma.otpVerification.findUnique({ where: { id } });
  if (!row) return { ok: false as const, error: "OTP not found" };
  const pre = evaluateOtp(row, code);
  if (!pre.ok && pre.error !== "Invalid OTP") return pre;
  await prisma.otpVerification.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  });
  if (row.codeHash !== hashOtp(code)) return { ok: false as const, error: "Invalid OTP" };
  await prisma.otpVerification.update({ where: { id }, data: { verified: true } });
  return { ok: true as const };
}
