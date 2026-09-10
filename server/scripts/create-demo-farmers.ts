import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "FarmDemo@123";

const farmers = [
  {
    name: "Bharath",
    email: "bharathg@gmail.com",
    farmName: "Green Valley Farm",
    phone: "9000000001",
    pinCode: "516001",
  },
  {
    name: "Aditya",
    email: "aditya@gmail.com",
    farmName: "FreshRoots Farm",
    phone: "9000000002",
    pinCode: "516002",
  },
  {
    name: "Bhargav",
    email: "bhargav@gmail.com",
    farmName: "Sunrise Organics",
    phone: "9000000003",
    pinCode: "516003",
  },
  {
    name: "Yaswant",
    email: "yaswant@gmail.com",
    farmName: "Evergreen Harvest Farm",
    phone: "9000000004",
    pinCode: "516004",
  },
  {
    name: "Dileep",
    email: "dileep@gmail.com",
    farmName: "Golden Fields Farm",
    phone: "9000000005",
    pinCode: "516005",
  },
  {
    name: "Charan",
    email: "charan@gmail.com",
    farmName: "Riverbank Fresh Farms",
    phone: "9000000006",
    pinCode: "516006",
  },
];

async function main() {
  console.log("\n🌱 Farm2Fork — Creating demo farmers...\n");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const farmer of farmers) {
    const user = await prisma.user.upsert({
      where: {
        email: farmer.email,
      },
      update: {
        name: farmer.name,
        role: "FARMER",
        phone: farmer.phone,
      },
      create: {
        email: farmer.email,
        name: farmer.name,
        role: "FARMER",
        phone: farmer.phone,
        passwordHash,
        farmer: {
          create: {
            farmName: farmer.farmName,
            location: "Kadapa",
            district: "Kadapa",
            state: "Andhra Pradesh",
            pinCode: farmer.pinCode,
            categories: [
              "Vegetables",
              "Fruits",
              "Grains",
            ],
            details:
              "Demo farmer account created for the Farm2Fork SIH demonstration.",
            verified: true,
          },
        },
      },
      include: {
        farmer: true,
      },
    });

    let farmerProfile = user.farmer;

    if (!farmerProfile) {
      farmerProfile = await prisma.farmerProfile.upsert({
        where: {
          userId: user.id,
        },
        update: {
          farmName: farmer.farmName,
          location: "Kadapa",
          district: "Kadapa",
          state: "Andhra Pradesh",
          pinCode: farmer.pinCode,
          categories: [
            "Vegetables",
            "Fruits",
            "Grains",
          ],
          details:
            "Demo farmer account created for the Farm2Fork SIH demonstration.",
          verified: true,
        },
        create: {
          userId: user.id,
          farmName: farmer.farmName,
          location: "Kadapa",
          district: "Kadapa",
          state: "Andhra Pradesh",
          pinCode: farmer.pinCode,
          categories: [
            "Vegetables",
            "Fruits",
            "Grains",
          ],
          details:
            "Demo farmer account created for the Farm2Fork SIH demonstration.",
          verified: true,
        },
      });
    }

    console.log(
      `✓ ${farmer.name.padEnd(8)} → ${farmer.email.padEnd(
        24
      )} → ${farmerProfile.farmName}`
    );
  }

  console.log("\n📦 Distributing existing products across the six farmers...\n");

  const demoEmails = farmers.map((farmer) => farmer.email);

  const demoProfiles = await prisma.farmerProfile.findMany({
    where: {
      user: {
        email: {
          in: demoEmails,
        },
      },
    },
    orderBy: {
      user: {
        email: "asc",
      },
    },
    select: {
      id: true,
      farmName: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (demoProfiles.length !== farmers.length) {
    throw new Error(
      `Expected ${farmers.length} demo farmer profiles, found ${demoProfiles.length}.`
    );
  }

  const products = await prisma.product.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      farmerId: true,
    },
  });

  console.log(`Found ${products.length} existing products.`);

  if (products.length === 0) {
    console.log("No products found. Farmer accounts were created successfully.");
    return;
  }

  /*
   * Important:
   * We are moving existing Product records between farmer profiles.
   * We are NOT creating duplicate products.
   *
   * Inventory.farmerId is updated at the same time because Inventory
   * also stores the farmer relationship.
   */
  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < products.length; index++) {
      const product = products[index];
      const targetFarmer =
        demoProfiles[index % demoProfiles.length];

      await tx.product.update({
        where: {
          id: product.id,
        },
        data: {
          farmerId: targetFarmer.id,
        },
      });

      await tx.inventory.updateMany({
        where: {
          productId: product.id,
        },
        data: {
          farmerId: targetFarmer.id,
        },
      });
    }
  });

  console.log("\n📊 Final farmer distribution:\n");

  for (const farmer of demoProfiles) {
    const count = await prisma.product.count({
      where: {
        farmerId: farmer.id,
      },
    });

    console.log(
      `${farmer.farmName.padEnd(25)} ${count} products`
    );
  }

  console.log("\n========================================");
  console.log(" FARM2FORK DEMO FARMERS READY");
  console.log("========================================\n");

  console.log("Login accounts:");

  for (const farmer of farmers) {
    console.log(
      `${farmer.name.padEnd(10)} ${farmer.email}`
    );
  }

  console.log(`\nDemo password: ${DEMO_PASSWORD}`);
  console.log("\n✓ Six farmer accounts created.");
  console.log("✓ Existing products distributed.");
  console.log("✓ Inventory farmer ownership synchronized.");
  console.log("\n");
}

main()
  .catch((error) => {
    console.error("\n❌ Demo farmer setup failed:\n");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
