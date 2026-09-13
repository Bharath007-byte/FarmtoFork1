import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const teacherFarmers = [
  {
    name: "Bharath",
    email: "bharathg@gmail.com",
    farmName: "Green Valley Farm",
    phone: "9000000001",
    pinCode: "516001",
    district: "Kadapa",
    state: "Andhra Pradesh",
    location: "Kadapa",
    categories: ["Vegetables", "Fruits"],
    societyCode: "KADAPA-CENTRAL",
  },
  {
    name: "Aditya",
    email: "aditya@gmail.com",
    farmName: "FreshRoots Farm",
    phone: "9000000002",
    pinCode: "516002",
    district: "Kadapa",
    state: "Andhra Pradesh",
    location: "Kadapa",
    categories: ["Vegetables", "Organic Produce"],
    societyCode: "KADAPA-CENTRAL",
  },
  {
    name: "Bhargav",
    email: "bhargav@gmail.com",
    farmName: "Sunrise Organics",
    phone: "9000000003",
    pinCode: "516003",
    district: "Kadapa",
    state: "Andhra Pradesh",
    location: "Kadapa",
    categories: ["Grains", "Pulses"],
    societyCode: "KADAPA-CENTRAL",
  },
  {
    name: "Charan",
    email: "charan@gmail.com",
    farmName: "Riverbank Fresh Farms",
    phone: "9000000006",
    pinCode: "516006",
    district: "Kadapa",
    state: "Andhra Pradesh",
    location: "Kadapa",
    categories: ["Spices", "Millets"],
    societyCode: "KADAPA-RURAL",
  },
  {
    name: "Dileep",
    email: "dileep@gmail.com",
    farmName: "Golden Fields Farm",
    phone: "9000000005",
    pinCode: "516005",
    district: "Kadapa",
    state: "Andhra Pradesh",
    location: "Kadapa",
    categories: ["Vegetables", "Leafy Vegetables"],
    societyCode: "KADAPA-RURAL",
  },
  {
    name: "Yaswant",
    email: "yaswant@gmail.com",
    farmName: "Evergreen Harvest Farm",
    phone: "9000000004",
    pinCode: "516004",
    district: "Kadapa",
    state: "Andhra Pradesh",
    location: "Kadapa",
    categories: ["Fruits", "Other"],
    societyCode: "KADAPA-RURAL",
  },
];

const SOCIETIES = [
  {
    name: "Kadapa Central Collection Centre",
    code: "KADAPA-CENTRAL",
    description: "Farm2Fork cooperative collection centre serving central Kadapa.",
    address: "Kadapa Central Collection Centre",
    village: "Kadapa",
    district: "Kadapa",
    state: "Andhra Pradesh",
    pinCode: "516001",
  },
  {
    name: "Kadapa Rural Collection Centre",
    code: "KADAPA-RURAL",
    description: "Farm2Fork cooperative collection centre serving rural Kadapa.",
    address: "Kadapa Rural Collection Centre",
    village: "Kadapa",
    district: "Kadapa",
    state: "Andhra Pradesh",
    pinCode: "516004",
  },
];

export async function autoSeedIfEmpty() {
  try {
    const prodCount = await prisma.product.count();
    if (prodCount >= 150) {
      console.log(`[AutoSeed] Database already has ${prodCount} products. Seeding up to date.`);
      return;
    }

    console.log(`[AutoSeed] Database currently has ${prodCount} products (< 150). Running full seed...`);

    // 1. Categories
    for (const [name, slug] of categories) {
      await prisma.productCategory.upsert({
        where: { slug },
        update: { name },
        create: { name, slug },
      });
    }

    // 2. Demo passwords precomputed with 10 salt rounds for high startup speed
    const defaultFarmerPass = await bcrypt.hash("FarmDemo@123", 10);
    const defaultConsumerPass = await bcrypt.hash("ShopDemo@123", 10);
    const defaultAdminPass = await bcrypt.hash("AdminDemo@123", 10);
    const defaultFleetPass = await bcrypt.hash("FleetDemo@123", 10);

    // 3. Core demo users
    const primaryFarmerUser = await prisma.user.upsert({
      where: { email: "farmer@farm2fork.demo" },
      update: {},
      create: {
        email: "farmer@farm2fork.demo",
        name: "Ravi Kumar",
        role: "FARMER",
        phone: "9999900001",
        passwordHash: defaultFarmerPass,
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

    const primaryFarmerProfile = await prisma.farmerProfile.findUnique({
      where: { userId: primaryFarmerUser.id },
    });

    await prisma.user.upsert({
      where: { email: "farmer2@farm2fork.demo" },
      update: {},
      create: {
        email: "farmer2@farm2fork.demo",
        name: "Lakshmi Reddy",
        role: "FARMER",
        phone: "9999900004",
        passwordHash: defaultFarmerPass,
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
        passwordHash: defaultConsumerPass,
      },
    });

    await prisma.user.upsert({
      where: { email: "admin@farm2fork.demo" },
      update: {},
      create: {
        email: "admin@farm2fork.demo",
        name: "SIH Admin",
        role: "ADMIN",
        passwordHash: defaultAdminPass,
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
        passwordHash: defaultFleetPass,
      },
    });

    // 4. Cooperative societies
    const societyMap = new Map<string, string>();
    for (const soc of SOCIETIES) {
      const s = await prisma.cooperativeSociety.upsert({
        where: { code: soc.code },
        update: { name: soc.name, address: soc.address, district: soc.district, state: soc.state, pinCode: soc.pinCode },
        create: soc,
      });
      societyMap.set(soc.code, s.id);
    }

    // 5. 6 Demo Farmers for Teacher demonstration
    for (const farmer of teacherFarmers) {
      const pHash = await bcrypt.hash(farmer.name.toLowerCase(), 10);
      const u = await prisma.user.upsert({
        where: { email: farmer.email },
        update: { name: farmer.name, phone: farmer.phone },
        create: {
          email: farmer.email,
          name: farmer.name,
          phone: farmer.phone,
          passwordHash: pHash,
          role: "FARMER",
          farmer: {
            create: {
              farmName: farmer.farmName,
              district: farmer.district,
              state: farmer.state,
              pinCode: farmer.pinCode,
              location: farmer.location,
              categories: farmer.categories,
              verified: true,
            },
          },
        },
      });

      const profile = await prisma.farmerProfile.findUnique({
        where: { userId: u.id },
      });

      if (profile && farmer.societyCode && societyMap.has(farmer.societyCode)) {
        const socId = societyMap.get(farmer.societyCode)!;
        await prisma.societyFarmer.upsert({
          where: {
            societyId_farmerId: {
              societyId: socId,
              farmerId: profile.id,
            },
          },
          update: { active: true },
          create: {
            societyId: socId,
            farmerId: profile.id,
            active: true,
          },
        });
      }
    }

    // 6. Delivery slots
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + day);
      for (const start of [9 * 60, 10 * 60, 11 * 60, 14 * 60, 15 * 60]) {
        await prisma.deliverySlot.upsert({
          where: { date_startMin_endMin: { date, startMin: start, endMin: start + 60 } },
          update: {},
          create: { date, startMin: start, endMin: start + 60, capacity: 5, booked: 0 },
        });
      }
    }

    // 7. Market price & price history
    const source = "Demo Market Dataset";
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
      }).catch(() => {});
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
    }).catch(() => {});

    // 8. Fix existing demo product images to local webp assets
    const fixMap: Record<string, string> = {
      Tomato: "/products/tomato.webp",
      Onion: "/products/onion.webp",
      Banana: "/products/banana.webp",
      Rice: "/products/basmati-rice.webp",
      Chilli: "/products/whole-red-chillies.webp",
    };
    for (const [name, img] of Object.entries(fixMap)) {
      await prisma.product.updateMany({
        where: { name: { contains: name, mode: "insensitive" } },
        data: { imageUrl: img },
      }).catch(() => {});
    }

    // 9. Catalog Import (159 products if catalog.json is available)
    const thisDir = path.dirname(fileURLToPath(import.meta.url));
    const catalogCandidates = [
      path.resolve(thisDir, "../data/catalog.json"),
      path.resolve(thisDir, "../../server/data/catalog.json"),
      path.resolve(process.cwd(), "data/catalog.json"),
      path.resolve(process.cwd(), "server/data/catalog.json"),
      path.resolve(process.cwd(), "../frontend/src/Data/catalog.json"),
      path.resolve(process.cwd(), "frontend/src/Data/catalog.json"),
    ];
    let catalogJson: any[] | null = null;
    for (const cPath of catalogCandidates) {
      if (fs.existsSync(cPath)) {
        try {
          catalogJson = JSON.parse(fs.readFileSync(cPath, "utf-8"));
          break;
        } catch {
          // ignore
        }
      }
    }

    if (catalogJson && Array.isArray(catalogJson) && catalogJson.length > 0) {
      console.log(`[AutoSeed] Importing ${catalogJson.length} products from catalog.json...`);
      const catRecords = await prisma.productCategory.findMany();
      const catMap = new Map(catRecords.map((c) => [c.name.toLowerCase(), c.id]));
      const otherCatId = catRecords[0]?.id;

      // Seed catalog farmer accounts with single hash
      const catalogPass = await bcrypt.hash("CatalogDemo@123", 10);
      const farmerNames = [...new Set(catalogJson.map((p) => String(p.farmer || "Ravi Kumar").trim()))];
      const farmerObjMap = new Map<string, string>();

      for (const fName of farmerNames) {
        const slug = fName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const email = `catalog.${slug}@farm2fork.demo`;
        const u = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: fName,
            role: "FARMER",
            passwordHash: catalogPass,
            farmer: {
              create: {
                farmName: `${fName} Farm`,
                district: "Kadapa",
                state: "Andhra Pradesh",
                pinCode: "516001",
                location: "Kadapa",
                categories: [],
                verified: true,
              },
            },
          },
        });
        const fp = await prisma.farmerProfile.findUnique({ where: { userId: u.id } });
        if (fp) farmerObjMap.set(fName, fp.id);
      }

      for (let i = 0; i < catalogJson.length; i++) {
        const item = catalogJson[i];
        const pId = `MKT-${String(i + 1).padStart(4, "0")}`;
        const cName = String(item.category || "").toLowerCase();
        const categoryId = catMap.get(cName) || otherCatId;
        const farmerId = farmerObjMap.get(String(item.farmer || "").trim()) || primaryFarmerProfile?.id;

        if (categoryId && farmerId) {
          const pricePaise = Math.round(Number(item.price || 50) * 100);
          const p = await prisma.product.upsert({
            where: { id: pId },
            update: {
              pricePaise,
              active: true,
            },
            create: {
              id: pId,
              farmerId,
              categoryId,
              name: String(item.name),
              variety: item.subCategory ? String(item.subCategory) : null,
              unit: item.weight && item.weight.includes("g") ? "g" : "kg",
              pricePaise,
              organic: Boolean(item.organic),
              imageUrl: item.imageUrl || "/products/tomato.webp",
              description: item.description || `Fresh ${item.name} sourced directly from verified growers.`,
              active: true,
            },
          });

          await prisma.inventory.upsert({
            where: { productId: p.id },
            update: { available: 100 },
            create: { productId: p.id, farmerId, available: 100 },
          }).catch(() => {});

          await prisma.productPriceLog.create({
            data: { productId: p.id, pricePaise },
          }).catch(() => {});
        }
      }
      console.log(`[AutoSeed] Finished importing catalog products!`);
    } else {
      console.log("[AutoSeed] catalog.json not found, seeding default 5 produce items...");
      if (primaryFarmerProfile) {
        const veg = await prisma.productCategory.findUnique({ where: { slug: "vegetables" } });
        if (veg) {
          const p = await prisma.product.create({
            data: {
              farmerId: primaryFarmerProfile.id,
              categoryId: veg.id,
              name: "Fresh Tomatoes",
              unit: "kg",
              pricePaise: 3200,
              organic: true,
              imageUrl: "/products/tomato.webp",
              description: "Farm fresh vine-ripened tomatoes.",
            },
          });
          await prisma.inventory.create({
            data: { productId: p.id, farmerId: primaryFarmerProfile.id, available: 150 },
          });
        }
      }
    }

    console.log("[AutoSeed] Auto-seeding completed successfully!");
  } catch (error) {
    console.error("[AutoSeed] Seeding failed with error:", error);
  }
}
