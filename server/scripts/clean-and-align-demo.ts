import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  console.log("=== Starting Data Clean and Alignment ===");

  // 1. Remap any order items referencing the non-MKT products
  const nonMktProducts = await prisma.product.findMany({
    where: {
      id: {
        not: {
          startsWith: "MKT-",
        },
      },
    },
    select: { id: true, name: true },
  });

  console.log(`Found ${nonMktProducts.length} non-MKT products to clean.`);

  const canonicalTomato = await prisma.product.findFirst({
    where: { id: "MKT-0026" },
  });
  const canonicalMango = await prisma.product.findFirst({
    where: { id: "MKT-0005" },
  });

  for (const p of nonMktProducts) {
    const targetProd = p.name.toLowerCase().includes("mango") ? canonicalMango : canonicalTomato;
    if (targetProd) {
      await prisma.orderItem.updateMany({
        where: { productId: p.id },
        data: { productId: targetProd.id },
      });
    }

    await prisma.productPriceLog.deleteMany({ where: { productId: p.id } }).catch(() => {});
    await prisma.inventory.deleteMany({ where: { productId: p.id } }).catch(() => {});
    await prisma.product.delete({ where: { id: p.id } }).catch(() => {});
  }

  // 2. Clean dummy catalog users
  const dummyUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: "catalog.",
      },
    },
    include: { farmer: true },
  });

  console.log(`Found ${dummyUsers.length} dummy catalog users.`);

  for (const u of dummyUsers) {
    if (u.farmer) {
      await prisma.logisticsBooking.deleteMany({ where: { farmerId: u.farmer.id } }).catch(() => {});
      await prisma.societyFarmer.deleteMany({ where: { farmerId: u.farmer.id } }).catch(() => {});
      await prisma.farmerProfile.delete({ where: { id: u.farmer.id } }).catch(() => {});
    }
    await prisma.logisticsBooking.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }

  // 3. Ensure logistics user
  const fleetPassHash = await bcrypt.hash("Logistics@123", 10);
  const demoFleetPassHash = await bcrypt.hash("FleetDemo@123", 10);

  await prisma.user.upsert({
    where: { email: "logistics@samruddhisetu.in" },
    update: { passwordHash: fleetPassHash, role: "LOGISTICS" },
    create: {
      email: "logistics@samruddhisetu.in",
      name: "Ravi Fleet Logistics",
      role: "LOGISTICS",
      phone: "9999900003",
      passwordHash: fleetPassHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "logistics@farm2fork.demo" },
    update: { passwordHash: demoFleetPassHash, role: "LOGISTICS" },
    create: {
      email: "logistics@farm2fork.demo",
      name: "Ravi Fleet Logistics",
      role: "LOGISTICS",
      phone: "9999900003",
      passwordHash: demoFleetPassHash,
    },
  });

  // 4. Align the 159 active products across the 6 demo farmers:
  // Aditya: 27, Bharath: 27, Bhargav: 27, Charan: 26, Dileep: 26, Yaswant: 26
  const farmers = await prisma.farmerProfile.findMany({
    where: {
      user: {
        email: {
          in: DEMO_EMAILS,
        },
      },
    },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  const farmerMap = new Map(farmers.map((f) => [f.user.name, f]));
  const aditya = farmerMap.get("Aditya")!;
  const bharath = farmerMap.get("Bharath")!;
  const bhargav = farmerMap.get("Bhargav")!;
  const charan = farmerMap.get("Charan")!;
  const dileep = farmerMap.get("Dileep")!;
  const yaswant = farmerMap.get("Yaswant")!;

  const distributionOrder = [aditya, bharath, bhargav, charan, dileep, yaswant];

  const allProducts = await prisma.product.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
    include: { category: true },
  });

  console.log(`Total active products in database: ${allProducts.length}`);

  for (let i = 0; i < allProducts.length; i++) {
    const prod = allProducts[i];
    const farmer = distributionOrder[i % distributionOrder.length];

    await prisma.product.update({
      where: { id: prod.id },
      data: { farmerId: farmer.id },
    });

    const catName = prod.category?.name?.toLowerCase() || "";
    const isHeavyProduce =
      catName.includes("grain") ||
      catName.includes("pulse") ||
      catName.includes("veg") ||
      catName.includes("fruit");

    const stockQty = isHeavyProduce ? 100 : 50;

    await prisma.inventory.upsert({
      where: { productId: prod.id },
      update: {
        farmerId: farmer.id,
        available: stockQty,
        reserved: 0,
      },
      create: {
        productId: prod.id,
        farmerId: farmer.id,
        available: stockQty,
        reserved: 0,
        sold: 0,
      },
    });
  }

  console.log("=== Alignment Finished Successfully! ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
