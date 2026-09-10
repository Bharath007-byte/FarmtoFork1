/**
 * ONE-TIME REAL WRITE — Bulk Cooperative Society stock population
 *
 * Receives 50 kg of every eligible active kg product from the six intended
 * demo farmers into their correct active society.
 *
 * Uses the SAME validation + transaction rules as:
 *   POST /api/societies/:id/supplies
 * in server/src/routes/societies.ts
 *
 * - Creates a new SocietySupply (RECEIVED) per product
 * - Upserts SocietyInventory: available += 50 (reserved/sold untouched)
 * - Does NOT delete/reset existing supply or inventory rows
 * - Does NOT use raw SQL mutations
 *
 * SAFETY:
 * Validate the full 159 / 7,950 kg plan BEFORE any writes.
 * Refuse to write if validation fails.
 *
 * Run ONLY after explicit approval:
 *   cd server && npx tsx scripts/bulk-receive-society-stock.ts
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

const EXPECTED_BY_FARMER: Record<(typeof INTENDED_FARMERS)[number], number> = {
  Bharath: 27,
  Aditya: 27,
  Bhargav: 27,
  Yaswant: 26,
  Dileep: 26,
  Charan: 26,
};

const EXPECTED_SOCIETY: Record<(typeof INTENDED_FARMERS)[number], string> = {
  Bharath: "KADAPA-CENTRAL",
  Aditya: "KADAPA-CENTRAL",
  Bhargav: "KADAPA-CENTRAL",
  Yaswant: "KADAPA-RURAL",
  Dileep: "KADAPA-RURAL",
  Charan: "KADAPA-RURAL",
};

const EXPECTED_CENTRAL_PRODUCTS = 81;
const EXPECTED_RURAL_PRODUCTS = 78;
const EXPECTED_TOTAL_PRODUCTS = 159;
const EXPECTED_TOTAL_KG = EXPECTED_TOTAL_PRODUCTS * PLANNED_QTY_KG;

type PlannedReceipt = {
  societyId: string;
  societyCode: string;
  societyName: string;
  farmerId: string;
  farmerName: string;
  farmerEmail: string;
  farmName: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function intendedKey(name: string): (typeof INTENDED_FARMERS)[number] | null {
  const key = normalizeName(name);
  return (
    INTENDED_FARMERS.find((n) => normalizeName(n) === key) ?? null
  );
}

/**
 * Mirror of POST /api/societies/:id/supplies validation + transaction.
 */
async function receiveFarmerSupply(input: {
  societyId: string;
  farmerId: string;
  productId: string;
  quantity: number;
}) {
  const { societyId, farmerId, productId, quantity } = input;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw Object.assign(
      new Error("quantity must be a finite number greater than 0"),
      { code: 422 },
    );
  }

  const society = await prisma.cooperativeSociety.findUnique({
    where: { id: societyId },
    select: { id: true, active: true },
  });

  if (!society) {
    throw Object.assign(new Error("Cooperative society not found"), {
      code: 404,
    });
  }

  if (!society.active) {
    throw Object.assign(new Error("Cooperative society is not active"), {
      code: 409,
    });
  }

  const farmer = await prisma.farmerProfile.findUnique({
    where: { id: farmerId },
    select: { id: true },
  });

  if (!farmer) {
    throw Object.assign(new Error("Farmer profile not found"), { code: 404 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      farmerId: true,
      active: true,
      unit: true,
      name: true,
    },
  });

  if (!product) {
    throw Object.assign(new Error("Product not found"), { code: 404 });
  }

  if (!product.active) {
    throw Object.assign(new Error("Product is not active"), { code: 409 });
  }

  if (product.farmerId !== farmerId) {
    throw Object.assign(
      new Error("Product does not belong to the selected farmer"),
      { code: 409 },
    );
  }

  if (product.unit.toLowerCase() !== "kg") {
    throw Object.assign(
      new Error("Only kg products can be received into society inventory"),
      { code: 422 },
    );
  }

  const membership = await prisma.societyFarmer.findFirst({
    where: {
      societyId,
      farmerId,
      active: true,
    },
    select: { id: true },
  });

  if (!membership) {
    throw Object.assign(
      new Error("Farmer is not an active member of this society"),
      { code: 409 },
    );
  }

  const existingInventory = await prisma.societyInventory.findUnique({
    where: {
      societyId_productId: {
        societyId,
        productId,
      },
    },
    select: { id: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    const supply = await tx.societySupply.create({
      data: {
        societyId,
        farmerId,
        productId,
        quantity,
        status: "RECEIVED",
      },
    });

    const inventory = await tx.societyInventory.upsert({
      where: {
        societyId_productId: {
          societyId,
          productId,
        },
      },
      create: {
        societyId,
        productId,
        available: quantity,
        reserved: 0,
        sold: 0,
      },
      update: {
        available: {
          increment: quantity,
        },
      },
    });

    return { supply, inventory };
  });

  return {
    ...result,
    inventoryCreated: !existingInventory,
  };
}

async function buildPlan(): Promise<PlannedReceipt[]> {
  const societies = await prisma.cooperativeSociety.findMany({
    where: {
      code: { in: ["KADAPA-CENTRAL", "KADAPA-RURAL"] },
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

  if (!central?.active || !rural?.active) {
    throw new Error(
      "Both KADAPA-CENTRAL and KADAPA-RURAL must exist and be active",
    );
  }

  const users = await prisma.user.findMany({
    where: {
      role: "FARMER",
      OR: INTENDED_FARMERS.map((name) => ({
        name: { equals: name, mode: "insensitive" as const },
      })),
    },
    select: {
      name: true,
      email: true,
      farmer: {
        select: {
          id: true,
          farmName: true,
          societyMemberships: {
            select: {
              active: true,
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
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });

  const byIntended = new Map<string, (typeof users)[number]>();
  for (const user of users) {
    const key = intendedKey(user.name);
    if (!key) {
      throw new Error(
        `Unexpected farmer matched query: ${user.name} <${user.email}>`,
      );
    }
    if (byIntended.has(key)) {
      throw new Error(`Duplicate intended farmer match for ${key}`);
    }
    byIntended.set(key, user);
  }

  for (const name of INTENDED_FARMERS) {
    if (!byIntended.has(name)) {
      throw new Error(`Intended farmer not found: ${name}`);
    }
  }

  const plan: PlannedReceipt[] = [];
  const seenProductIds = new Set<string>();

  for (const name of INTENDED_FARMERS) {
    const user = byIntended.get(name)!;
    if (!user.farmer) {
      throw new Error(`${name} has no FarmerProfile`);
    }

    const activeMemberships = user.farmer.societyMemberships.filter(
      (m) => m.active && m.society.active,
    );

    if (activeMemberships.length === 0) {
      throw new Error(`${name} has no active society membership`);
    }

    if (activeMemberships.length > 1) {
      throw new Error(
        `${name} belongs to multiple active societies: ${activeMemberships
          .map((m) => m.society.code)
          .join(", ")}`,
      );
    }

    const membership = activeMemberships[0]!;
    const expectedCode = EXPECTED_SOCIETY[name];

    if (membership.society.code !== expectedCode) {
      throw new Error(
        `${name} is on ${membership.society.code} but expected ${expectedCode}`,
      );
    }

    const eligible = user.farmer.products.filter(
      (p) => p.active && p.unit.toLowerCase() === "kg",
    );

    if (eligible.length !== EXPECTED_BY_FARMER[name]) {
      throw new Error(
        `${name} has ${eligible.length} eligible products; expected ${EXPECTED_BY_FARMER[name]}`,
      );
    }

    for (const product of eligible) {
      if (seenProductIds.has(product.id)) {
        throw new Error(`Duplicate product ID in plan: ${product.id}`);
      }
      seenProductIds.add(product.id);

      plan.push({
        societyId: membership.society.id,
        societyCode: membership.society.code,
        societyName: membership.society.name,
        farmerId: user.farmer.id,
        farmerName: user.name,
        farmerEmail: user.email,
        farmName: user.farmer.farmName,
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: PLANNED_QTY_KG,
      });
    }
  }

  const centralCount = plan.filter(
    (r) => r.societyCode === "KADAPA-CENTRAL",
  ).length;
  const ruralCount = plan.filter(
    (r) => r.societyCode === "KADAPA-RURAL",
  ).length;
  const totalKg = plan.reduce((sum, r) => sum + r.quantity, 0);

  if (
    plan.length !== EXPECTED_TOTAL_PRODUCTS ||
    totalKg !== EXPECTED_TOTAL_KG ||
    centralCount !== EXPECTED_CENTRAL_PRODUCTS ||
    ruralCount !== EXPECTED_RURAL_PRODUCTS
  ) {
    throw new Error(
      `Validation failed before write: got ${plan.length} products / ${totalKg} kg ` +
        `(Central ${centralCount}, Rural ${ruralCount}); ` +
        `expected ${EXPECTED_TOTAL_PRODUCTS} / ${EXPECTED_TOTAL_KG} ` +
        `(Central ${EXPECTED_CENTRAL_PRODUCTS}, Rural ${EXPECTED_RURAL_PRODUCTS})`,
    );
  }

  return plan;
}

async function main() {
  console.log("=== BULK SOCIETY STOCK — PRE-WRITE VALIDATION ===");
  console.log("Quantity per product:", PLANNED_QTY_KG, "kg");
  console.log("");

  const plan = await buildPlan();

  const centralCount = plan.filter(
    (r) => r.societyCode === "KADAPA-CENTRAL",
  ).length;
  const ruralCount = plan.filter(
    (r) => r.societyCode === "KADAPA-RURAL",
  ).length;

  console.log("Validation PASSED.");
  console.log(
    `KADAPA-CENTRAL: ${centralCount} products / ${centralCount * PLANNED_QTY_KG} kg`,
  );
  console.log(
    `KADAPA-RURAL: ${ruralCount} products / ${ruralCount * PLANNED_QTY_KG} kg`,
  );
  console.log(
    `TOTAL: ${plan.length} products / ${plan.length * PLANNED_QTY_KG} kg`,
  );
  console.log("");
  console.log("=== BEGINNING WRITES (same rules as Admin Receive Farmer Supply) ===");
  console.log("");

  let createdInventory = 0;
  let incrementedInventory = 0;
  let success = 0;
  const failures: { index: number; row: PlannedReceipt; error: string }[] = [];

  for (let i = 0; i < plan.length; i++) {
    const row = plan[i]!;
    const label = `[${i + 1}/${plan.length}] ${row.societyCode} | ${row.farmerName} | ${row.productName} | ${row.quantity} kg`;

    try {
      const result = await receiveFarmerSupply({
        societyId: row.societyId,
        farmerId: row.farmerId,
        productId: row.productId,
        quantity: row.quantity,
      });

      if (result.inventoryCreated) {
        createdInventory += 1;
      } else {
        incrementedInventory += 1;
      }

      success += 1;
      console.log(`${label}  OK`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      failures.push({ index: i + 1, row, error: message });
      console.error(`${label}  FAILED: ${message}`);
      break;
    }
  }

  console.log("");
  console.log("=== BULK SOCIETY STOCK COMPLETE ===");
  console.log("");
  console.log("Society");
  console.log(
    `KADAPA-CENTRAL: ${EXPECTED_CENTRAL_PRODUCTS} products / ${EXPECTED_CENTRAL_PRODUCTS * PLANNED_QTY_KG} kg`,
  );
  console.log(
    `KADAPA-RURAL: ${EXPECTED_RURAL_PRODUCTS} products / ${EXPECTED_RURAL_PRODUCTS * PLANNED_QTY_KG} kg`,
  );
  console.log("");
  console.log(`TOTAL NEW RECEIPTS: ${success}`);
  console.log(`TOTAL NEW KG: ${success * PLANNED_QTY_KG}`);
  console.log("");
  console.log(`SocietyInventory newly created: ${createdInventory}`);
  console.log(`SocietyInventory incremented existing: ${incrementedInventory}`);
  console.log("");
  console.log(`Failures: ${failures.length}`);

  if (failures.length) {
    for (const failure of failures) {
      console.error(
        `  #${failure.index} ${failure.row.societyCode} | ${failure.row.farmerName} | ${failure.row.productId} | ${failure.row.productName}: ${failure.error}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  if (success !== EXPECTED_TOTAL_PRODUCTS) {
    console.error(
      `Incomplete run: ${success}/${EXPECTED_TOTAL_PRODUCTS} receipts completed`,
    );
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("BULK RECEIVE ERROR:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
