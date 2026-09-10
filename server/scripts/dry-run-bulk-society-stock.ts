/**
 * ONE-TIME DRY RUN — Bulk Cooperative Society stock preparation
 *
 * READ-ONLY. Does NOT create/update/delete SocietySupply or SocietyInventory.
 * Does NOT call POST /api/societies/:id/supplies.
 * Does NOT use raw SQL mutations.
 *
 * Purpose:
 * Validate that exactly 159 active kg products belonging to the six intended
 * demo farmers (on their correct active society) would receive 50 kg each
 * (7,950 kg total) before any real receive is run.
 *
 * Run:
 *   cd server && npx tsx scripts/dry-run-bulk-society-stock.ts
 */

import { prisma } from "../src/db.js";

const PLANNED_QTY_KG = 50;

const INTENDED_FARMERS = [
  "Bharath",
  "Aditya",
  "Bhargav",
  "Yaswant",
  "Dileep",
  "Charan",
] as const;

const EXPECTED_BY_FARMER: Record<string, number> = {
  Bharath: 27,
  Aditya: 27,
  Bhargav: 27,
  Yaswant: 26,
  Dileep: 26,
  Charan: 26,
};

const EXPECTED_CENTRAL_PRODUCTS = 81;
const EXPECTED_RURAL_PRODUCTS = 78;
const EXPECTED_TOTAL_PRODUCTS = 159;
const EXPECTED_TOTAL_KG = EXPECTED_TOTAL_PRODUCTS * PLANNED_QTY_KG;

type PreviewRow = {
  societyCode: string;
  societyName: string;
  farmerName: string;
  farmerEmail: string;
  farmName: string;
  productId: string;
  productName: string;
  unit: string;
  plannedQuantity: number;
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

async function main() {
  const intendedNames = INTENDED_FARMERS.map(normalizeName);

  const societies = await prisma.cooperativeSociety.findMany({
    where: {
      code: {
        in: ["KADAPA-CENTRAL", "KADAPA-RURAL"],
      },
    },
    select: {
      id: true,
      name: true,
      code: true,
      active: true,
    },
  });

  const central = societies.find((s) => s.code === "KADAPA-CENTRAL");
  const rural = societies.find((s) => s.code === "KADAPA-RURAL");

  const users = await prisma.user.findMany({
    where: {
      role: "FARMER",
      OR: INTENDED_FARMERS.map((name) => ({
        name: { equals: name, mode: "insensitive" as const },
      })),
    },
    select: {
      id: true,
      name: true,
      email: true,
      farmer: {
        select: {
          id: true,
          farmName: true,
          societyMemberships: {
            select: {
              active: true,
              societyId: true,
              society: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  active: true,
                },
              },
            },
          },
          products: {
            select: {
              id: true,
              name: true,
              unit: true,
              active: true,
            },
            orderBy: {
              name: "asc",
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const missingFarmerMemberships: string[] = [];
  const farmersBelongingToMultipleSocieties: string[] = [];
  const inactiveProducts: string[] = [];
  const nonKgProducts: string[] = [];
  const productsBelongingToWrongSociety: string[] = [];
  const unexpectedFarmers: string[] = [];
  const duplicateProductIds: string[] = [];

  const seenProductIds = new Set<string>();
  const preview: PreviewRow[] = [];

  type FarmerAgg = {
    name: string;
    email: string;
    farmName: string;
    societyCode: string;
    societyName: string;
    eligibleCount: number;
    plannedKg: number;
  };

  const farmerAgg = new Map<string, FarmerAgg>();

  if (!central || !central.active) {
    missingFarmerMemberships.push(
      "Active society KADAPA-CENTRAL is missing from the database",
    );
  }
  if (!rural || !rural.active) {
    missingFarmerMemberships.push(
      "Active society KADAPA-RURAL is missing from the database",
    );
  }

  const foundNames = new Set(
    users.map((u) => normalizeName(u.name)),
  );

  for (const intended of INTENDED_FARMERS) {
    if (!foundNames.has(normalizeName(intended))) {
      missingFarmerMemberships.push(
        `Intended farmer not found: ${intended}`,
      );
    }
  }

  for (const user of users) {
    const farmerName = user.name;
    const key = normalizeName(farmerName);

    if (!intendedNames.includes(key)) {
      unexpectedFarmers.push(
        `${farmerName} <${user.email}> matched query but is not an intended demo farmer`,
      );
      continue;
    }

    if (!user.farmer) {
      missingFarmerMemberships.push(
        `${farmerName} <${user.email}> has no FarmerProfile`,
      );
      continue;
    }

    const activeMemberships = user.farmer.societyMemberships.filter(
      (m) => m.active && m.society.active,
    );

    if (activeMemberships.length === 0) {
      missingFarmerMemberships.push(
        `${farmerName} <${user.email}> has no active SocietyFarmer membership on an active society`,
      );
      continue;
    }

    if (activeMemberships.length > 1) {
      farmersBelongingToMultipleSocieties.push(
        `${farmerName} <${user.email}> active societies: ${activeMemberships
          .map((m) => m.society.code)
          .join(", ")}`,
      );
    }

    const membership = activeMemberships[0]!;
    const society = membership.society;

    const expectedCentral = ["bharath", "aditya", "bhargav"].includes(key);
    const expectedRural = ["yaswant", "dileep", "charan"].includes(key);

    if (expectedCentral && society.code !== "KADAPA-CENTRAL") {
      productsBelongingToWrongSociety.push(
        `${farmerName} is on ${society.code} but expected KADAPA-CENTRAL`,
      );
    }
    if (expectedRural && society.code !== "KADAPA-RURAL") {
      productsBelongingToWrongSociety.push(
        `${farmerName} is on ${society.code} but expected KADAPA-RURAL`,
      );
    }

    let eligibleCount = 0;

    for (const product of user.farmer.products) {
      const label = `${farmerName} / ${product.id} / ${product.name}`;

      if (!product.active) {
        inactiveProducts.push(label);
        continue;
      }

      if (product.unit.toLowerCase() !== "kg") {
        nonKgProducts.push(`${label} (unit=${product.unit})`);
        continue;
      }

      if (seenProductIds.has(product.id)) {
        duplicateProductIds.push(product.id);
        continue;
      }
      seenProductIds.add(product.id);

      /**
       * Product is owned by this farmer (queried via farmer.products).
       * Society correctness is validated via the farmer's active membership.
       */
      if (
        (expectedCentral && society.code !== "KADAPA-CENTRAL") ||
        (expectedRural && society.code !== "KADAPA-RURAL")
      ) {
        productsBelongingToWrongSociety.push(label);
        continue;
      }

      eligibleCount += 1;
      preview.push({
        societyCode: society.code,
        societyName: society.name,
        farmerName,
        farmerEmail: user.email,
        farmName: user.farmer.farmName,
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        plannedQuantity: PLANNED_QTY_KG,
      });
    }

    farmerAgg.set(key, {
      name: farmerName,
      email: user.email,
      farmName: user.farmer.farmName,
      societyCode: society.code,
      societyName: society.name,
      eligibleCount,
      plannedKg: eligibleCount * PLANNED_QTY_KG,
    });
  }

  const centralFarmers = ["Bharath", "Aditya", "Bhargav"].map(
    (n) => farmerAgg.get(normalizeName(n)),
  );
  const ruralFarmers = ["Yaswant", "Dileep", "Charan"].map(
    (n) => farmerAgg.get(normalizeName(n)),
  );

  const centralProducts = centralFarmers.reduce(
    (sum, f) => sum + (f?.eligibleCount ?? 0),
    0,
  );
  const ruralProducts = ruralFarmers.reduce(
    (sum, f) => sum + (f?.eligibleCount ?? 0),
    0,
  );
  const totalProducts = preview.length;
  const totalKg = totalProducts * PLANNED_QTY_KG;

  console.log("=== DRY RUN: BULK SOCIETY STOCK ===");
  console.log("");
  console.log("Planned quantity per eligible product:", PLANNED_QTY_KG, "kg");
  console.log("Write operations: NONE (read-only dry run)");
  console.log("");

  console.log("--- Societies ---");
  console.log(
    central
      ? `KADAPA-CENTRAL: ${central.name} (active=${central.active}) id=${central.id}`
      : "KADAPA-CENTRAL: MISSING",
  );
  console.log(
    rural
      ? `KADAPA-RURAL: ${rural.name} (active=${rural.active}) id=${rural.id}`
      : "KADAPA-RURAL: MISSING",
  );
  console.log("");

  console.log("--- Farmer summary ---");
  console.log("Society | Farmer | Email | Farm | Eligible products | Planned kg");
  for (const name of INTENDED_FARMERS) {
    const f = farmerAgg.get(normalizeName(name));
    if (!f) {
      console.log(`MISSING | ${name} | - | - | 0 | 0`);
      continue;
    }
    console.log(
      `${f.societyCode} | ${f.name} | ${f.email} | ${f.farmName} | ${f.eligibleCount} | ${f.plannedKg}`,
    );
  }
  console.log("");

  console.log("Central:");
  for (const name of ["Bharath", "Aditya", "Bhargav"] as const) {
    const f = farmerAgg.get(normalizeName(name));
    const count = f?.eligibleCount ?? 0;
    const kg = count * PLANNED_QTY_KG;
    const expected = EXPECTED_BY_FARMER[name];
    console.log(
      `${name}: ${count} products × ${PLANNED_QTY_KG} kg = ${kg} kg` +
        (count === expected ? "" : `  [EXPECTED ${expected}]`),
    );
  }
  console.log("");

  console.log("Rural:");
  for (const name of ["Yaswant", "Dileep", "Charan"] as const) {
    const f = farmerAgg.get(normalizeName(name));
    const count = f?.eligibleCount ?? 0;
    const kg = count * PLANNED_QTY_KG;
    const expected = EXPECTED_BY_FARMER[name];
    console.log(
      `${name}: ${count} products × ${PLANNED_QTY_KG} kg = ${kg} kg` +
        (count === expected ? "" : `  [EXPECTED ${expected}]`),
    );
  }
  console.log("");

  console.log("Expected:");
  console.log(
    `Central: ${EXPECTED_CENTRAL_PRODUCTS} products / ${EXPECTED_CENTRAL_PRODUCTS * PLANNED_QTY_KG} kg`,
  );
  console.log(
    `Rural: ${EXPECTED_RURAL_PRODUCTS} products / ${EXPECTED_RURAL_PRODUCTS * PLANNED_QTY_KG} kg`,
  );
  console.log(
    `TOTAL: ${EXPECTED_TOTAL_PRODUCTS} products / ${EXPECTED_TOTAL_KG} kg`,
  );
  console.log("");

  console.log("Actual:");
  console.log(
    `Central: ${centralProducts} products / ${centralProducts * PLANNED_QTY_KG} kg`,
  );
  console.log(
    `Rural: ${ruralProducts} products / ${ruralProducts * PLANNED_QTY_KG} kg`,
  );
  console.log(`TOTAL: ${totalProducts} products / ${totalKg} kg`);
  console.log("");

  console.log("=== VALIDATION ===");
  const printList = (title: string, items: string[]) => {
    console.log(`${title}: ${items.length}`);
    for (const item of items.slice(0, 25)) {
      console.log(`  - ${item}`);
    }
    if (items.length > 25) {
      console.log(`  ... and ${items.length - 25} more`);
    }
  };

  printList("missing farmer memberships", missingFarmerMemberships);
  printList(
    "farmers belonging to multiple societies",
    farmersBelongingToMultipleSocieties,
  );
  printList("inactive products (excluded)", inactiveProducts);
  printList("non-kg products (excluded)", nonKgProducts);
  printList(
    "products belonging to wrong society",
    productsBelongingToWrongSociety,
  );
  printList("duplicate product IDs", duplicateProductIds);
  printList("unexpected farmers", unexpectedFarmers);
  console.log("total eligible product count:", totalProducts);
  console.log("total planned kg:", totalKg);
  console.log("");

  console.log("=== PRODUCT-LEVEL PREVIEW ===");
  console.log(
    "society code | farmer | product ID | product name | unit | planned quantity",
  );
  for (const row of preview) {
    console.log(
      `${row.societyCode} | ${row.farmerName} | ${row.productId} | ${row.productName} | ${row.unit} | ${row.plannedQuantity}`,
    );
  }
  console.log("");
  console.log(`Preview rows: ${preview.length}`);

  const countsMatch =
    totalProducts === EXPECTED_TOTAL_PRODUCTS &&
    totalKg === EXPECTED_TOTAL_KG &&
    centralProducts === EXPECTED_CENTRAL_PRODUCTS &&
    ruralProducts === EXPECTED_RURAL_PRODUCTS &&
    missingFarmerMemberships.length === 0 &&
    farmersBelongingToMultipleSocieties.length === 0 &&
    productsBelongingToWrongSociety.length === 0 &&
    duplicateProductIds.length === 0 &&
    unexpectedFarmers.length === 0 &&
    nonKgProducts.length === 0;

  if (!countsMatch) {
    console.error("");
    console.error(
      "DRY RUN FAILED: eligible product / kg totals or membership validation did not match expected 159 products / 7,950 kg.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log(
    "DRY RUN PASSED: 159 eligible products / 7,950 kg validated. No database writes were performed.",
  );
}

main()
  .catch((error) => {
    console.error("DRY RUN ERROR:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
