import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    name: "Charan",
    email: "charan@gmail.com",
    farmName: "Riverbank Fresh Farms",
    phone: "9000000006",
    pinCode: "516006",
  },
  {
    name: "Dileep",
    email: "dileep@gmail.com",
    farmName: "Golden Fields Farm",
    phone: "9000000005",
    pinCode: "516005",
  },
  {
    name: "Yaswant",
    email: "yaswant@gmail.com",
    farmName: "Evergreen Harvest Farm",
    phone: "9000000004",
    pinCode: "516004",
  },
];

async function main() {
  console.log("\n🌱 Setting up 6 Demo Farmers for Teacher Demonstration...\n");

  for (const farmer of farmers) {
    const passwordHash = await bcrypt.hash(farmer.name.toLowerCase(), 12);

    const user = await prisma.user.upsert({
      where: {
        email: farmer.email,
      },
      update: {
        name: farmer.name,
        role: "FARMER",
        phone: farmer.phone,
        passwordHash,
      },
      create: {
        email: farmer.email,
        name: farmer.name,
        role: "FARMER",
        phone: farmer.phone,
        passwordHash,
      },
    });

    const farmerProfile = await prisma.farmerProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        farmName: farmer.farmName,
        location: "Kadapa",
        district: "Kadapa",
        state: "Andhra Pradesh",
        pinCode: farmer.pinCode,
        categories: ["Vegetables", "Fruits", "Grains & Pulses", "Dairy & Cheese", "Oils & Ghee", "Spices"],
        details: "Verified demo farmer account for Samruddhi Setu demonstration.",
        verified: true,
      },
      create: {
        userId: user.id,
        farmName: farmer.farmName,
        location: "Kadapa",
        district: "Kadapa",
        state: "Andhra Pradesh",
        pinCode: farmer.pinCode,
        categories: ["Vegetables", "Fruits", "Grains & Pulses", "Dairy & Cheese", "Oils & Ghee", "Spices"],
        details: "Verified demo farmer account for Samruddhi Setu demonstration.",
        verified: true,
      },
    });

    console.log(
      `✓ Farmer Account: ${farmer.name.padEnd(9)} | Email: ${farmer.email.padEnd(22)} | Password: ${farmer.name.toLowerCase().padEnd(9)} | Farm: ${farmerProfile.farmName}`
    );
  }

  console.log("\n📦 Distributing 159 active marketplace products across the 6 farmers...\n");

  // Fetch farmers ordered by email asc (matches fix-demo-farmer-products.ts)
  const demoProfiles = await prisma.farmerProfile.findMany({
    where: {
      user: {
        email: {
          in: farmers.map((f) => f.email),
        },
      },
    },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      user: {
        email: "asc",
      },
    },
  });

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

  console.log(`Found ${activeProducts.length} active marketplace products.`);

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < activeProducts.length; index++) {
      const product = activeProducts[index];
      const targetFarmer = demoProfiles[index % demoProfiles.length];

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

  console.log("\n📊 ACTIVE PRODUCT DISTRIBUTION\n");

  for (const farmer of demoProfiles) {
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
      `${farmer.farmName.padEnd(24)} | ` +
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
}

main()
  .catch((e) => {
    console.error("Setup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
