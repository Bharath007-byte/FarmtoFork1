import { predictFromSeries } from "../../lib/predict.js";

export function describeTrend(modals: number[]) {
  const pred = predictFromSeries(modals);
  if (!pred.ok) return pred;
  return {
    ...pred,
    band: { low: pred.low, high: pred.high },
  };
}
