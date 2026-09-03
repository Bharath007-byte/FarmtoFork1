import { createHmac } from "node:crypto";

/** Ordinary least squares on y vs index. Returns null if n < 7. Confidence is R², not invented. */
export function predictFromSeries(modals: number[]) {
  const n = modals.length;
  if (n < 7) {
    return {
      ok: false as const,
      message: "Insufficient historical data for reliable prediction.",
    };
  }
  const xs = modals.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = modals.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (modals[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yhat = intercept + slope * xs[i];
    ssRes += (modals[i] - yhat) ** 2;
    ssTot += (modals[i] - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  const next = intercept + slope * n;
  const spread = Math.max(50, Math.round(Math.sqrt(ssRes / n) || 100));
  const last = modals[n - 1];
  const trend = slope > last * 0.01 ? "Increasing" : slope < -last * 0.01 ? "Decreasing" : "Stable";
  const rec =
    trend === "Increasing" ? "Hold / list slightly below predicted high" : trend === "Decreasing" ? "Sell sooner at farm-gate" : "Keep current listing band";
  return {
    ok: true as const,
    low: Math.round(next - spread),
    high: Math.round(next + spread),
    trend,
    confidence: r2,
    sampleSize: n,
    method: "OLS_time_series",
    recommendation: rec,
    last,
  };
}

export function razorpaySignature(orderId: string, paymentId: string, secret: string) {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}
