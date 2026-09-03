import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  ["Vegetables", "vegetables"],
  ["Fruits", "fruits"],
  ["Grains", "grains"],
  ["Pulses", "pulses"],
  ["Millets", "millets"],
  ["Spices", "spices"],
  ["Leafy Vegetables", "leafy-vegetables"],
  ["Organic Produce", "organic"],
  ["Other", "other"],
];

async function main() {
  for (const [name, slug] of categories) {
    await prisma.productCategory.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }

  const source = "Demo Market Dataset";
  await prisma.priceHistory.deleteMany({ where: { source } });
  await prisma.marketPrice.deleteMany({ where: { source } });
  const commodity = "Tomato";
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const modal = 2800 + i * 20;
    await prisma.priceHistory.create({
      data: {
        commodity,
        market: "Nashik",
        district: "Nashik",
        state: "Maharashtra",
        minPaise: modal - 200,
        maxPaise: modal + 200,
        modalPaise: modal,
        dataDate: d,
        source,
      },
    });
  }
  await prisma.marketPrice.create({
    data: {
      commodity,
      market: "Nashik",
      state: "Maharashtra",
      district: "Nashik",
      minPaise: 3000,
      maxPaise: 3400,
      modalPaise: 3200,
      unit: "kg",
      source,
      dataDate: new Date(),
      liveFeed: false,
    },
  });

  for (let day = 0; day < 7; day++) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + day);
    for (const start of [9 * 60, 10 * 60, 11 * 60, 14 * 60, 15 * 60]) {
      await prisma.deliverySlot.upsert({
        where: { date_startMin_endMin: { date, startMin: start, endMin: start + 60 } },
        update: {},
        create: { date, startMin: start, endMin: start + 60, capacity: 2, booked: 0 },
      });
    }
  }

  const pass = await bcrypt.hash("FarmDemo@123", 12);
  const farmerUser = await prisma.user.upsert({
    where: { email: "farmer@farm2fork.demo" },
    update: {},
    create: {
      email: "farmer@farm2fork.demo",
      name: "Ravi Kumar",
      role: "FARMER",
      phone: "9999900001",
      passwordHash: pass,
      farmer: {
        create: {
          farmName: "Green Valley Farm",
          location: "Kadapa",
          district: "Kadapa",
          state: "Andhra Pradesh",
          pinCode: "516001",
          categories: ["Vegetables"],
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "farmer2@farm2fork.demo" },
    update: {},
    create: {
      email: "farmer2@farm2fork.demo",
      name: "Lakshmi Reddy",
      role: "FARMER",
      phone: "9999900004",
      passwordHash: pass,
      farmer: {
        create: {
          farmName: "Red Earth Fields",
          location: "Kadapa",
          district: "Kadapa",
          state: "Andhra Pradesh",
          pinCode: "516002",
          categories: ["Vegetables"],
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "consumer@farm2fork.demo" },
    update: {},
    create: {
      email: "consumer@farm2fork.demo",
      name: "Asha Kitchen",
      role: "CONSUMER",
      phone: "9999900002",
      passwordHash: await bcrypt.hash("ShopDemo@123", 12),
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@farm2fork.demo" },
    update: {},
    create: {
      email: "admin@farm2fork.demo",
      name: "SIH Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash("AdminDemo@123", 12),
    },
  });

  await prisma.user.upsert({
    where: { email: "logistics@farm2fork.demo" },
    update: {},
    create: {
      email: "logistics@farm2fork.demo",
      name: "Ravi Fleet",
      role: "LOGISTICS",
      phone: "9999900003",
      passwordHash: await bcrypt.hash("FleetDemo@123", 12),
    },
  });

  const farmer = await prisma.farmerProfile.findUnique({ where: { userId: farmerUser.id } });
  const veg = await prisma.productCategory.findUnique({ where: { slug: "vegetables" } });
  const fru = await prisma.productCategory.findUnique({ where: { slug: "fruits" } });
  const gra = await prisma.productCategory.findUnique({ where: { slug: "grains" } });
  const spi = await prisma.productCategory.findUnique({ where: { slug: "spices" } });
  if (farmer && veg && fru && gra && spi) {
    const existing = await prisma.product.count({ where: { farmerId: farmer.id } });
    if (existing === 0) {
      const lots = [
        {
          name: "Tomato",
          categoryId: veg.id,
          pricePaise: 3200,
          quantity: 80,
          organic: true,
          imageUrl:
            "https://images.unsplash.com/photo-1546470427-227c1c0a0d4a?auto=format&fit=crop&w=800&q=80",
        },
        {
          name: "Onion",
          categoryId: veg.id,
          pricePaise: 2800,
          quantity: 120,
          organic: false,
          imageUrl:
            "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=800&q=80",
        },
        {
          name: "Banana",
          categoryId: fru.id,
          pricePaise: 4500,
          quantity: 60,
          organic: false,
          imageUrl:
            "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80",
        },
        {
          name: "Rice",
          categoryId: gra.id,
          pricePaise: 6200,
          quantity: 200,
          organic: true,
          imageUrl:
            "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
        },
        {
          name: "Chilli",
          categoryId: spi.id,
          pricePaise: 18000,
          quantity: 25,
          organic: true,
          imageUrl:
            "https://images.unsplash.com/photo-1583119022894-919a6a0b8e1f?auto=format&fit=crop&w=800&q=80",
        },
      ];
      for (const lot of lots) {
        const p = await prisma.product.create({
          data: {
            farmerId: farmer.id,
            categoryId: lot.categoryId,
            name: lot.name,
            unit: "kg",
            pricePaise: lot.pricePaise,
            organic: lot.organic,
            imageUrl: lot.imageUrl,
            description: `Fresh ${lot.name.toLowerCase()} from Green Valley Farm.`,
          },
        });
        await prisma.inventory.create({
          data: { productId: p.id, farmerId: farmer.id, available: lot.quantity },
        });
        await prisma.productPriceLog.create({
          data: { productId: p.id, pricePaise: lot.pricePaise },
        });
      }
    }
  }

  console.log("Seed complete. Farmer", farmerUser.email, "demo harvest is in the marketplace.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
