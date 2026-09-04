import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MARKETPLACE_PRODUCTS } from "./marketplace-products.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CATALOG_OUTPUT = join(
  __dirname,
  "../src/Data/catalog.json"
);

const PRODUCTS_ROOT = join(
  __dirname,
  "../public/products"
);

const FARMERS = [
  ["Green Valley Orchards", "Himachal Pradesh"],
  ["Krishna Organic Farm", "Maharashtra"],
  ["Sri Lakshmi Farms", "Andhra Pradesh"],
  ["Nature's Basket Farm", "Karnataka"],
  ["Ananda Dairy Farm", "Tamil Nadu"],
  ["Pure Village Dairy", "Telangana"],
  ["Eastern Spice Farms", "Andhra Pradesh"],
  ["Rayalaseema Organics", "Andhra Pradesh"],
  ["Shree Go Farms", "Karnataka"],
  ["Vedic Farms", "Rajasthan"],
  ["Himalayan Orchards", "Uttarakhand"],
  ["Deccan Harvest", "Telangana"],
  ["Malabar Spice Co-op", "Kerala"],
  ["Punjab Dairy Collective", "Punjab"],
  ["Konkan Fruit Belt", "Maharashtra"],
  ["Nilgiri Greens", "Tamil Nadu"],
  ["Kutch Camel Dairy", "Gujarat"],
  ["Assam Citrus Groves", "Assam"],
  ["Nashik Vineyard Farm", "Maharashtra"],
  ["Bihar Litchi Belt", "Bihar"],
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function categorySlug(value) {
  return slugify(value);
}

function farmerFor(index) {
  return FARMERS[index % FARMERS.length];
}

function priceRupees(value) {
  const price = Number(value);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid price: ${value}`);
  }

  return Math.round(price);
}

console.log("");
console.log("Farm2Fork Marketplace Catalog Generator");
console.log("---------------------------------------");
console.log(`Master products: ${MARKETPLACE_PRODUCTS.length}`);
console.log("Image source: LOCAL FILES ONLY");
console.log("External image search: DISABLED");
console.log("");

if (MARKETPLACE_PRODUCTS.length !== 159) {
  throw new Error(
    `Expected exactly 159 master products, found ${MARKETPLACE_PRODUCTS.length}`
  );
}

const names = new Set();
const imagePaths = new Set();
const products = [];

for (let index = 0; index < MARKETPLACE_PRODUCTS.length; index += 1) {
  const source = MARKETPLACE_PRODUCTS[index];

  if (!source.name) {
    throw new Error(`Product ${index + 1} has no name.`);
  }

  if (names.has(source.name)) {
    throw new Error(`Duplicate product name: ${source.name}`);
  }

  names.add(source.name);

  const slug = slugify(source.name);
  const filename = `${slug}.webp`;
  const diskPath = join(PRODUCTS_ROOT, filename);
  const publicPath = `/products/${filename}`;

  if (!existsSync(diskPath)) {
    throw new Error(
      `Missing local image for "${source.name}": ${diskPath}`
    );
  }

  if (imagePaths.has(publicPath)) {
    throw new Error(
      `Duplicate image path detected: ${publicPath}`
    );
  }

  imagePaths.add(publicPath);

  const [farmer, location] = farmerFor(index);

  const organic = Boolean(source.organic);
  const price = priceRupees(source.price);

  products.push({
    id: `F2F-${String(index + 1).padStart(4, "0")}`,

    name: source.name,

    category: source.category,
    categorySlug: categorySlug(source.category),

    subCategory: source.category,

    farmer,
    location,

    weight: source.unit || "kg",
    packages: Array.isArray(source.packages)
      ? source.packages
      : [],

    price,

    imageUrl: publicPath,

    badge: organic ? "Organic" : null,

    organic,

    inStock: true,

    description:
      `Farm-fresh ${source.name.toLowerCase()} from a Farm2Fork marketplace farmer.`,

    imageKey: source.imageKey,
  });
}

const categoryCounts = {};

for (const product of products) {
  categoryCounts[product.category] =
    (categoryCounts[product.category] || 0) + 1;
}

writeFileSync(
  CATALOG_OUTPUT,
  JSON.stringify(products, null, 2) + "\n",
  "utf8"
);

console.log("Catalog generated successfully.");
console.log("--------------------------------");
console.log(`Products: ${products.length}`);
console.log(`Unique names: ${names.size}`);
console.log(`Unique image paths: ${imagePaths.size}`);
console.log("");
console.log("Category counts:");

for (const [category, count] of Object.entries(categoryCounts)) {
  console.log(`  ${category}: ${count}`);
}

console.log("");
console.log(`Output: ${CATALOG_OUTPUT}`);
console.log("");
