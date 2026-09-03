import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(
  readFileSync(join(__dirname, "../src/Data/harvest-catalog.json"), "utf8")
);

const USD_INR = 84;
const FARMERS = [
  ["Green Ridge Farm", "Nashik"],
  ["Kaveri Valley", "Mysuru"],
  ["Sahyadri Organics", "Pune"],
  ["Narmada Fields", "Anand"],
  ["Deccan Harvest", "Hyderabad"],
  ["Coorg Hillside", "Kodagu"],
];

const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`;

const IMAGES = {
  "VEG-09": U("1594282486552-05b4d80f09c0"),
  "VEG-21": U("1449300079323-02e209d9d3a6"),
  "VEG-22": U("1449300079323-02e209d9d3a6"),
  "VEG-26": U("1540148426945-6cf22a6b4d52"),
  "VEG-27": U("1540148426945-6cf22a6b4d52"),
  "ENG-06": U("1506806732259-39c2d0268443"),
  "FRU-03": U("1577003831638-37c3e340eb5f"),
  "FRU-13": U("1514756331096-1626a5ee446b"),
  "PLT-01": U("1506976785307-8732e854ad03"),
  "PLT-02": U("1506976785307-8732e854ad03"),
  "HON-01": U("1558642452-9d2a7deb7f62"),
  "HON-02": U("1558642452-9d2a7deb7f62"),
  "HON-03": U("1558642452-9d2a7deb7f62"),
};

function mapCategory(category) {
  if (category === "Ghee & Oils") return "Ghee";
  if (category === "Honey & Sweeteners") return "Honey";
  return category;
}

function dairyGroup(name) {
  if (name.startsWith("Shrikhand & Mango"))
    return { id: "dai-shrikhand-mango", name: "Shrikhand & Mango Shrikhand" };
  if (name.startsWith("Fruit Shrikhand"))
    return { id: "dai-fruit-shrikhand", name: "Fruit Shrikhand" };
  if (name.startsWith("Skimmed Milk Powder"))
    return { id: "dai-smp", name: "Skimmed Milk Powder" };
  if (name.startsWith("Paneer")) return { id: "dai-paneer", name: "Paneer" };
  if (name.startsWith("Table Butter"))
    return { id: "dai-table-butter", name: "Table Butter" };
  if (name.startsWith("Cooking Butter"))
    return { id: "dai-cooking-butter", name: "Cooking Butter" };
  if (name.startsWith("Lassi - Mango"))
    return { id: "dai-lassi-mango", name: "Lassi — Mango & Vanilla" };
  if (name.startsWith("Lassi")) return { id: "dai-lassi", name: "Lassi" };
  if (name.startsWith("Dahi")) return { id: "dai-dahi", name: "Dahi / Curd" };
  if (name.startsWith("Masala Tak"))
    return { id: "dai-masala-tak", name: "Masala Tak" };
  if (name.startsWith("Tak")) return { id: "dai-tak", name: "Tak" };
  if (name.startsWith("UHT")) return { id: "dai-uht-milk", name: "UHT Milk" };
  if (name.startsWith("Basundi")) return { id: "dai-basundi", name: "Basundi" };
  if (name.startsWith("Flavoured Milk"))
    return { id: "dai-flavoured-milk", name: "Flavoured Milk" };
  if (name.startsWith("Pedha")) return { id: "dai-pedha", name: "Pedha" };
  return null;
}

function groupMeta(row) {
  const category = mapCategory(row.category);
  if (category === "Dairy") return dairyGroup(row.name);
  if (category === "Ghee") {
    const buffalo = /buffalo/i.test(row.name);
    return buffalo
      ? { id: "ghee-buffalo", name: "Ghee — Buffalo" }
      : { id: "ghee-cow", name: "Ghee — Cow" };
  }
  if (row.name === "Farm Fresh White Eggs")
    return { id: "plt-white-eggs", name: "Farm Fresh White Eggs" };
  if (row.name.startsWith("Pure Wildflower Honey"))
    return { id: "hon-wildflower", name: "Pure Wildflower Honey" };
  return {
    id: row.id.toLowerCase(),
    name: row.name.replace(/\s+\([^)]*gm.*\)$/i, "").replace(/\s+\([^)]*ml.*\)$/i, "").replace(/\s+\([^)]*Lit.*\)$/i, "").trim(),
  };
}

function resolvePrice(row) {
  if (row.price === "Seasonal") {
    return { price: 0, seasonal: true };
  }
  if (typeof row.priceUsd === "number") {
    return { price: Math.round(row.priceUsd * USD_INR), seasonal: false };
  }
  if (row.price == null) {
    return { price: 0, seasonal: true };
  }
  return { price: Number(row.price), seasonal: false };
}

function packLabel(row) {
  return row.packing || row.weight || (row.unit === "Kg" ? "1 Kg" : row.unit);
}

function imageFor(row) {
  return IMAGES[row.id] || `${String(row.image).split("?")[0]}?auto=format&fit=crop&w=600&q=80`;
}

const groups = new Map();

raw.forEach((row, index) => {
  const category = mapCategory(row.category);
  const meta = groupMeta(row);
  const { price, seasonal } = resolvePrice(row);
  const [farmer, location] = FARMERS[index % FARMERS.length];
  if (!groups.has(meta.id)) {
    groups.set(meta.id, {
      id: meta.id,
      name: meta.name,
      category,
      subCategory: row.category === "English Vegetables" ? "English vegetables" : category,
      imageUrl: imageFor(row),
      description: seasonal
        ? `${meta.name} is listed as seasonal. We will confirm the live farm rate at harvest.`
        : `Farm-gate ${meta.name.toLowerCase()} with the listed pack sizes and rupee rates.`,
      rating: 4.6,
      reviews: 24 + (index % 40),
      badge: seasonal ? "Seasonal" : undefined,
      organic: /organic/i.test(row.name),
      variants: [],
    });
  }
  const listing = groups.get(meta.id);
  listing.variants.push({
    id: row.id,
    variety: listing.variants.length === 0 ? "Farm harvest" : packLabel(row),
    weight: packLabel(row),
    price,
    originalPrice: price,
    farmer,
    location,
    inStock: !seasonal,
  });
});

for (const listing of groups.values()) {
  listing.variants.forEach((v) => {
    v.variety = "Farm harvest";
  });
}

const listings = [...groups.values()];

writeFileSync(
  join(__dirname, "../src/Data/listings.json"),
  JSON.stringify(listings, null, 2)
);

const buySheet = listings
  .filter((item) => item.variants.some((v) => v.price > 0))
  .map((item) => {
    const retail = Math.min(
      ...item.variants.filter((v) => v.price > 0).map((v) => v.price)
    );
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.variants[0]?.weight || "pack",
      retailFrom: retail,
      weBuyAt: Math.max(8, Math.round(retail * 0.72)),
      imageUrl: item.imageUrl,
    };
  });

writeFileSync(
  join(__dirname, "../src/Data/buySheet.json"),
  JSON.stringify(buySheet, null, 2)
);

const counts = listings.reduce((acc, l) => {
  acc[l.category] = (acc[l.category] || 0) + 1;
  return acc;
}, {});
console.log("listings", listings.length, counts);
console.log("buy sheet", buySheet.length);
