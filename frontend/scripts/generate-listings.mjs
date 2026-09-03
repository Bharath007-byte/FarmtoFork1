import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(__dirname, "../src/Data/catalog.json"), "utf8")
);

const PREFIXES = [
  "Farm Fresh ",
  "Harvest Crate ",
  "Kitchen pack ",
  "Farm crate ",
  "Small batch ",
  "Daily fresh ",
  "Family pack ",
  "Family ",
  "Bulk jar ",
  "Pouch ",
  "Jar ",
  "Tin ",
  "A2 / Organic ",
  "Bilona / Organic ",
  "Organic ",
];

function coreName(raw) {
  let n = String(raw).replace(/\s+·\s+.+$/, "").trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIXES) {
      if (n.toLowerCase().startsWith(p.toLowerCase())) {
        n = n.slice(p.length).trim();
        changed = true;
      }
    }
  }
  return n;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const groups = new Map();

for (const row of catalog) {
  const variety = coreName(row.name);
  const typeName =
    row.category === "Ghee"
      ? "Ghee"
      : row.category === "Dairy" && /milk/i.test(row.subCategory)
        ? "Milk"
        : row.subCategory;
  const key = `${row.category}::${typeName}`;
  if (!groups.has(key)) {
    groups.set(key, {
      id: slugify(`${row.category}-${typeName}`),
      name: typeName,
      category: row.category,
      subCategory: typeName,
      imageUrl: row.imageUrl,
      description: row.description,
      rating: row.rating,
      reviews: 0,
      badge: undefined,
      organic: false,
      variants: [],
    });
  }
  const item = groups.get(key);
  item.reviews += row.reviews;
  item.organic = item.organic || row.organic;
  const dup = item.variants.some(
    (v) => v.variety === variety && v.weight === row.weight
  );
  if (!dup) {
    item.variants.push({
      id: row.id,
      variety,
      weight: row.weight,
      price: row.price,
      originalPrice: row.originalPrice,
      farmer: row.farmer,
      location: row.location,
      inStock: row.inStock,
    });
  }
}

const listings = [...groups.values()].map((item) => {
  item.variants.sort((a, b) => a.variety.localeCompare(b.variety) || a.price - b.price);
  item.reviews = Math.min(999, Math.round(item.reviews / Math.max(1, item.variants.length)));
  const mid = item.variants[Math.floor(item.variants.length / 2)];
  if (mid) item.imageUrl = item.imageUrl;
  return item;
});

writeFileSync(
  join(__dirname, "../src/Data/listings.json"),
  JSON.stringify(listings, null, 2)
);

const buySheet = listings.map((item) => {
  const retail = Math.min(...item.variants.map((v) => v.price));
  const buyPrice = Math.max(8, Math.round(retail * 0.72));
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit: "per kg / standard pack",
    retailFrom: retail,
    weBuyAt: buyPrice,
    imageUrl: item.imageUrl,
  };
});

writeFileSync(
  join(__dirname, "../src/Data/buySheet.json"),
  JSON.stringify(buySheet, null, 2)
);

console.log("Unique listings (by type)", listings.length);
console.log(
  listings.reduce((acc, l) => {
    acc[l.category] = (acc[l.category] || 0) + 1;
    return acc;
  }, {})
);
