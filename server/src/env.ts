import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

const nodeEnv = optional("NODE_ENV", "development");
const isProduction = nodeEnv === "production";

const jwtSecret = process.env.JWT_SECRET?.trim();

if (isProduction && !jwtSecret) {
  throw new Error(
    "JWT_SECRET is required when NODE_ENV=production."
  );
}

export const env = {
  port: Number(process.env.PORT || 8787),

  nodeEnv,

  databaseUrl: optional(
    "DATABASE_URL",
    "postgresql://postgres:farm2fork@localhost:5432/farm2fork"
  ),

  jwtSecret: jwtSecret || "dev-only-change-me",

  corsOrigins: optional(
    "CORS_ORIGIN",
    "http://localhost:5173,http://localhost:5188,http://localhost:5189,http://localhost:4173"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  razorpayKeyId: optional("RAZORPAY_KEY_ID"),
  razorpayKeySecret: optional("RAZORPAY_KEY_SECRET"),

  turnstileSecret: optional("CLOUDFLARE_TURNSTILE_SECRET_KEY"),

  otpProviderKey: optional("OTP_PROVIDER_API_KEY"),

  dataGovKey: optional("DATA_GOV_API_KEY"),

  aiKey: optional("AI_API_KEY"),

  demoMode: process.env.DEMO_MODE === "true",
};

if (isProduction && env.demoMode) {
  throw new Error(
    "DEMO_MODE=true is not allowed when NODE_ENV=production."
  );
}
