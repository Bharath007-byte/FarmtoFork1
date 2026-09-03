import "dotenv/config";

function req(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT || 8787),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: req("DATABASE_URL", "postgresql://postgres:farm2fork@localhost:5432/farm2fork"),
  jwtSecret: req("JWT_SECRET", "dev-only-change-me"),
  corsOrigins: (process.env.CORS_ORIGIN ||
    "http://localhost:5173,http://localhost:5188,http://localhost:5189,http://localhost:4173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  turnstileSecret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || "",
  otpProviderKey: process.env.OTP_PROVIDER_API_KEY || "",
  dataGovKey: process.env.DATA_GOV_API_KEY || "",
  aiKey: process.env.AI_API_KEY || "",
  demoMode: process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production",
};
