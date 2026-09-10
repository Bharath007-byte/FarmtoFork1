import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAILS = [
  "bharathg@gmail.com",
  "aditya@gmail.com",
  "bhargav@gmail.com",
  "yaswant@gmail.com",
  "dileep@gmail.com",
  "charan@gmail.com",
];

async function main() {
  console.log("\n🌱 Farm2Fork — Fixing demo farmer product distribution\n");

  const farmers = await prisma.farmerProfile.findMany({
    where: {
      user: {
        email: {
          in: DEMO_EMAILS,
        },
      },
    },
    select: {
      id: true,
      farmName: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      user: {
        email: "asc",
      },
    },
  });

  if (farmers.length !== 6) {
    throw new Error(
      `Expected 6 demo farmers but found ${farmers.length}.`
    );
  }

  const activeProducts = await prisma.product.findMany({
    where: {
      active: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  console.log(
    `Found ${activeProducts.length} active marketplace products.`
  );

  if (activeProducts.length !== 159) {
    console.warn(
      `⚠️ Expected 159 active products, but found ${activeProducts.length}.`
    );
  }

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < activeProducts.length; index++) {
      const product = activeProducts[index];

      const farmer = farmers[index % farmers.length];

      await tx.product.update({
        where: {
          id: product.id,
        },
        data: {
          farmerId: farmer.id,
        },
      });

      await tx.inventory.updateMany({
        where: {
          productId: product.id,
        },
        data: {
          farmerId: farmer.id,
        },
      });
    }
  });

  console.log("\n📊 ACTIVE PRODUCT DISTRIBUTION\n");

  for (const farmer of farmers) {
    const productCount = await prisma.product.count({
      where: {
        farmerId: farmer.id,
        active: true,
      },
    });

    const inventoryCount = await prisma.inventory.count({
      where: {
        farmerId: farmer.id,
        product: {
          active: true,
        },
      },
    });

    console.log(
      `${farmer.user.name.padEnd(10)} | ` +
      `${farmer.farmName.padEnd(26)} | ` +
      `${productCount} active products | ` +
      `${inventoryCount} inventory records`
    );
  }

  const totalActive = await prisma.product.count({
    where: {
      active: true,
    },
  });

  console.log("\n========================================");
  console.log(" ACTIVE MARKETPLACE PRODUCTS");
  console.log("========================================");
  console.log(`Total active products: ${totalActive}`);
  console.log("Expected: 159");
  console.log("========================================\n");

  console.log("✓ Active marketplace products assigned to six demo farmers.");
  console.log("✓ Product farmerId updated.");
  console.log("✓ Inventory farmerId synchronized.");
  console.log("✓ Inactive catalog products were NOT touched.\n");
}

main()
  .catch((error) => {
    console.error("\n❌ Correction failed:\n");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
