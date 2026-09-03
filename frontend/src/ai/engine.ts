export type DataOrigin =
  | "Live"
  | "Cached"
  | "Simulated"
  | "AI Prediction"
  | "Estimated";

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function priceSeries(base: number, seed = 1) {
  const days = [];
  let v = base;
  for (let i = 6; i >= 0; i--) {
    const wobble = Math.sin(seed * 1.7 + i) * 0.045 + ((seed * (i + 3)) % 7) / 220;
    v = Math.max(8, Math.round(base * (1 + wobble)));
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      day: d.toISOString().slice(5, 10),
      price: v,
    });
  }
  const last = days[days.length - 1]?.price ?? base;
  const prev = days[0]?.price ?? base;
  const direction: "up" | "down" | "flat" =
    last > prev * 1.02 ? "up" : last < prev * 0.98 ? "down" : "flat";
  const predicted = Math.round(last * (direction === "up" ? 1.03 : direction === "down" ? 0.97 : 1.01));
  return {
    days,
    direction,
    predicted,
    confidence: 0.72,
    origin: "AI Prediction" as DataOrigin,
  };
}

export function wasteRisk(args: {
  harvestedKg: number;
  soldKg: number;
  inTransitKg: number;
  ageHours: number;
  shelfLifeHours: number;
}) {
  const leftover = Math.max(0, args.harvestedKg - args.soldKg - args.inTransitKg);
  const ageRatio = args.ageHours / Math.max(1, args.shelfLifeHours);
  const score = Math.min(
    100,
    Math.round(leftover * 0.4 + ageRatio * 70 + (ageRatio > 0.75 ? 18 : 0))
  );
  const approaching = leftover > 0 && ageRatio > 0.7;
  return {
    leftoverKg: leftover,
    score,
    approaching,
    reason: approaching
      ? "Inventory age is past 70% of estimated shelf life."
      : "Stock is moving within a safe window.",
    action: approaching
      ? "Offer a time-sensitive discount to nearby buyers and restaurants."
      : "Keep listing at the farm-gate rate.",
    origin: "AI Prediction" as DataOrigin,
  };
}

export function recommendCrops(args: {
  region: string;
  month: number;
  soil: string;
}) {
  const kharif = args.month >= 6 && args.month <= 10;
  const list = kharif
    ? [
        { crop: "Tomato", reason: "Kharif demand on farm2fork is firm; drip suits this soil." },
        { crop: "Chilli", reason: "High spice search and good price hold for 4–6 weeks." },
        { crop: "Okra / Lady Finger (Bhindi)", reason: "Short cycle, nearby kitchen demand." },
      ]
    : [
        { crop: "Carrot Orange", reason: "Rabi roots move well in cooler weeks." },
        { crop: "Cauliflower", reason: "Steady mandi-alternative demand from households." },
        { crop: "Spinach (Palak)", reason: "Fast harvest, low waste if same-day dispatch." },
      ];
  if (/black|clay/i.test(args.soil)) {
    list.unshift({
      crop: "Cotton is out of catalog — prefer Tomato",
      reason: `${args.soil} retains moisture; tomato under drip is the in-catalog pick.`,
    });
  }
  return {
    region: args.region || "your pin",
    season: kharif ? "Kharif" : "Rabi / summer",
    picks: list.slice(0, 3),
    origin: "AI Prediction" as DataOrigin,
    confidence: 0.68,
  };
}

export function detectFromImageSignals(args: {
  cropHint: string;
  avgGreen: number;
  avgRed: number;
  brightness: number;
}) {
  const blight = args.avgRed > args.avgGreen * 1.05 && args.brightness < 140;
  const pale = args.brightness > 180;
  const disease = blight
    ? "Early blight (heuristic)"
    : pale
      ? "Nutrient pale / possible nitrogen stress"
      : "No strong disease signal";
  const health = blight ? "Moderate" : pale ? "Watch" : "Healthy";
  const confidence = blight ? 0.81 : pale ? 0.64 : 0.58;
  return {
    crop: args.cropHint || "Unknown crop",
    health,
    disease,
    confidence,
    action: blight
      ? "Remove spotted leaves, improve airflow, and avoid overhead water at dusk."
      : pale
        ? "Check drip EC and add a light nitrogen foliar if soil test agrees."
        : "Keep scouting twice a week; no spray suggested from this photo alone.",
    preventive: "Mulch, drip (not flood), and rotate solanaceae next season.",
    origin: "AI Prediction" as DataOrigin,
  };
}

export function optimizeRoute(
  points: { id: string; lat: number; lng: number }[]
) {
  if (points.length < 2) {
    return { order: points.map((p) => p.id), km: 0, origin: "Estimated" as DataOrigin };
  }
  const left = [...points];
  const path = [left.shift()!];
  while (left.length) {
    const last = path[path.length - 1];
    let best = 0;
    let bestD = Infinity;
    left.forEach((p, i) => {
      const d = haversineKm(last, p);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    path.push(left.splice(best, 1)[0]);
  }
  let km = 0;
  for (let i = 1; i < path.length; i++) km += haversineKm(path[i - 1], path[i]);
  return {
    order: path.map((p) => p.id),
    km: Math.round(km * 10) / 10,
    origin: "Estimated" as DataOrigin,
  };
}

export function demandForecast(baseSearch = 100, seed = 2) {
  const points = Array.from({ length: 14 }, (_, i) => {
    const v = Math.round(baseSearch * (1 + Math.sin((i + seed) / 3) * 0.12 + i * 0.01));
    return { day: `D${i + 1}`, demand: v };
  });
  return {
    points,
    nextWeek: points[points.length - 1]?.demand ?? baseSearch,
    confidence: 0.7,
    origin: "AI Prediction" as DataOrigin,
  };
}
