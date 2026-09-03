import { LISTINGS } from "../Data/listings";
import type { DataOrigin } from "../ai/engine";

export interface FarmRecord {
  id: string;
  farmerName: string;
  email: string;
  verified: boolean;
  trustScore: number;
  region: string;
  lat: number;
  lng: number;
  acres: number;
  soil: string;
  irrigation: string;
  crops: { name: string; acres: number }[];
}

export interface VehicleRecord {
  id: string;
  driver: string;
  type: string;
  coldChain: boolean;
  lat: number;
  lng: number;
  etaMin: number;
  tempC: number | null;
  thresholdC: number;
  orderId: string;
  progress: number;
  routeLabel: string;
}

export interface PlatformOrder {
  id: string;
  consumerEmail: string;
  listingId: string;
  variantId: string;
  qty: number;
  total: number;
  status: "placed" | "dispatched" | "in_transit" | "delivered";
  createdAt: string;
  farmId: string;
}

export interface TraceEvent {
  id: string;
  listingId: string;
  step: string;
  at: string;
  place: string;
  origin: DataOrigin;
}

export interface WasteRow {
  id: string;
  listingId: string;
  harvestedKg: number;
  soldKg: number;
  inTransitKg: number;
  ageHours: number;
  shelfLifeHours: number;
}

export interface SihDb {
  farms: FarmRecord[];
  vehicles: VehicleRecord[];
  orders: PlatformOrder[];
  traces: TraceEvent[];
  waste: WasteRow[];
  reviews: { listingId: string; rating: number; text: string; by: string }[];
}

const FARMS: FarmRecord[] = [
  {
    id: "F1024",
    farmerName: "Green Ridge Farm",
    email: "farmer@farm2fork.demo",
    verified: true,
    trustScore: 92,
    region: "Nashik",
    lat: 19.9975,
    lng: 73.7898,
    acres: 4.2,
    soil: "Black cotton",
    irrigation: "Drip",
    crops: [
      { name: "Tomato Large", acres: 2 },
      { name: "Onion Red", acres: 1.2 },
      { name: "Chili Green Fresh (Harimirch)", acres: 1 },
    ],
  },
  {
    id: "F1025",
    farmerName: "Kaveri Valley",
    email: "kaveri@farm2fork.demo",
    verified: true,
    trustScore: 88,
    region: "Mysuru",
    lat: 12.2958,
    lng: 76.6394,
    acres: 6.1,
    soil: "Red loam",
    irrigation: "Sprinkler",
    crops: [{ name: "Banana Ripe", acres: 2.5 }],
  },
  {
    id: "F1026",
    farmerName: "Sahyadri Organics",
    email: "sahyadri@farm2fork.demo",
    verified: true,
    trustScore: 90,
    region: "Pune",
    lat: 18.5204,
    lng: 73.8567,
    acres: 3.4,
    soil: "Laterite",
    irrigation: "Drip",
    crops: [{ name: "Ghee — Cow", acres: 0 }],
  },
  {
    id: "F1027",
    farmerName: "Narmada Fields",
    email: "narmada@farm2fork.demo",
    verified: false,
    trustScore: 71,
    region: "Anand",
    lat: 22.5645,
    lng: 72.9289,
    acres: 5,
    soil: "Alluvial",
    irrigation: "Canal + drip",
    crops: [{ name: "Dahi / Curd", acres: 0 }],
  },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function buildSeedDb(): SihDb {
  const tomato = LISTINGS.find((l) => l.id === "veg-61") ?? LISTINGS[0];
  const traces: TraceEvent[] = LISTINGS.slice(0, 40).flatMap((listing, i) => {
    const farm = FARMS[i % FARMS.length];
    const harvest = daysAgo(2 + (i % 5));
    return [
      { id: `${listing.id}-seed`, listingId: listing.id, step: "Seed planted", at: daysAgo(70), place: farm.region, origin: "Simulated" },
      { id: `${listing.id}-cult`, listingId: listing.id, step: "Crop cultivated", at: daysAgo(40), place: farm.region, origin: "Simulated" },
      { id: `${listing.id}-ver`, listingId: listing.id, step: "Farm / farmer verified", at: daysAgo(20), place: farm.farmerName, origin: farm.verified ? "Cached" : "Simulated" },
      { id: `${listing.id}-har`, listingId: listing.id, step: "Harvested", at: harvest, place: farm.region, origin: "Simulated" },
      { id: `${listing.id}-qc`, listingId: listing.id, step: "Quality checked", at: daysAgo(1), place: "Farm gate lab", origin: "Estimated" },
      { id: `${listing.id}-dis`, listingId: listing.id, step: "Ready to dispatch", at: daysAgo(0), place: farm.region, origin: "Simulated" },
    ];
  });

  return {
    farms: FARMS,
    vehicles: [
      {
        id: "V-11",
        driver: "Ravi Naik",
        type: "Cold van",
        coldChain: true,
        lat: 17.44,
        lng: 78.39,
        etaMin: 42,
        tempC: 3.6,
        thresholdC: 8,
        orderId: "ORD-SIM-1",
        progress: 58,
        routeLabel: "Nashik → Hyderabad kitchen loop",
      },
      {
        id: "V-12",
        driver: "Sita Rao",
        type: "Bike",
        coldChain: false,
        lat: 17.41,
        lng: 78.48,
        etaMin: 18,
        tempC: null,
        thresholdC: 8,
        orderId: "ORD-SIM-2",
        progress: 71,
        routeLabel: "Local 8 km harvest hop",
      },
      {
        id: "V-13",
        driver: "Imran",
        type: "Reefer truck",
        coldChain: true,
        lat: 17.36,
        lng: 78.52,
        etaMin: 95,
        tempC: 9.4,
        thresholdC: 8,
        orderId: "ORD-SIM-3",
        progress: 22,
        routeLabel: "Anand dairy → city cold room",
      },
    ],
    orders: [
      {
        id: "ORD-SIM-1",
        consumerEmail: "consumer@farm2fork.demo",
        listingId: tomato.id,
        variantId: tomato.variants[0]?.id ?? "",
        qty: 2,
        total: (tomato.variants[0]?.price ?? 45) * 2,
        status: "in_transit",
        createdAt: daysAgo(0),
        farmId: "F1024",
      },
    ],
    traces,
    waste: [
      {
        id: "W-TOM",
        listingId: tomato.id,
        harvestedKg: 500,
        soldKg: 420,
        inTransitKg: 50,
        ageHours: 38,
        shelfLifeHours: 48,
      },
    ],
    reviews: [
      {
        listingId: tomato.id,
        rating: 5,
        text: "Harvest date matched the crate. Firm fruit.",
        by: "Asha K.",
      },
    ],
  };
}

export function farmForListing(listingId: string, farms: FarmRecord[]) {
  const listing = LISTINGS.find((l) => l.id === listingId);
  const name = listing?.variants[0]?.farmer;
  return farms.find((f) => f.farmerName === name) ?? farms[0];
}
