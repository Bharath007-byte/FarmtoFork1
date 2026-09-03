import type { Request, Response, NextFunction } from "express";
import { env } from "../env.js";

export async function verifyTurnstile(token: string | undefined) {
  if (env.nodeEnv !== "production" && !env.turnstileSecret) {
    return { ok: true, mode: "dev_skip" as const };
  }
  if (!env.turnstileSecret) {
    return { ok: false, error: "Turnstile is not configured" };
  }
  if (!token) return { ok: false, error: "Turnstile token missing" };
  const body = new URLSearchParams({
    secret: env.turnstileSecret,
    response: token,
  });
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const data = (await r.json()) as { success?: boolean };
  return { ok: Boolean(data.success), mode: "cloudflare" as const };
}

export function turnstileGuard(req: Request, res: Response, next: NextFunction) {
  const token =
    (req.body?.turnstileToken as string | undefined) ||
    (req.headers["x-turnstile-token"] as string | undefined);
  verifyTurnstile(token)
    .then((v) => {
      if (!v.ok) return res.status(403).json({ error: v.error || "Turnstile failed", code: 403 });
      next();
    })
    .catch(next);
}
