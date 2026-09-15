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
    name: "Tirupati Agri & Horticulture Farmers Cooperative Society",
    code: "TIRUPATI-AGRI",
    description: "Regional aggregation, tomato & fruit cold-storage pool serving Tirupati & Chittoor farmers.",
    address: "Chandragiri - Renigunta Agricultural Hub, Tirupati",
    village: "Tirupati",
    district: "Tirupati",
    state: "Andhra Pradesh",
    pinCode: "517501",
    verified: true,
  },
  {
    name: "Devanahalli Silk & Fruit Growers Cooperative Union",
    code: "DEVANAHALLI-UNION",
    description: "Devanahalli pomelo, grape and high-density vegetable cold-chain hub serving Bengaluru Rural.",
    address: "NH-44 Corridor, Devanahalli Rural Hub",
    village: "Devanahalli",
    district: "Bengaluru Rural",
    state: "Karnataka",
    pinCode: "562110",
    verified: true,
  },
  {
    name: "Karnal Indigenous Dairy & Grains Cooperative Union",
    code: "KARNAL-UNION",
    description: "Farmer-owned cooperative union pooling indigenous dairy, basmati grains and millets.",
    address: "Karnal - Kurukshetra - Panipat Belt, Karnal",
    village: "Karnal",
    district: "Karnal",
    state: "Haryana",
    pinCode: "132001",
    verified: true,
  },
  {
    name: "Konkan Agro & Horticulture Producer Cooperative Society",
    code: "KONKAN-AGRO",
    description: "GI-authenticated Alphonso mango, cashew & coastal produce grading collective.",
    address: "Ratnagiri - Devgad - Sindhudurg Orchard Belt",
    village: "Ratnagiri",
    district: "Ratnagiri",
    state: "Maharashtra",
    pinCode: "415612",
    verified: true,
  },
  {
    name: "Sahyadri Farmers Agro Cooperative Society Ltd.",
    code: "SAHYADRI-AGRO",
    description: "Leading multi-crop farmer producer cooperative union for grapes, onions, and vegetables.",
    address: "Nashik - Dindori - Niphad Belt, Nashik",
    village: "Nashik",
    district: "Nashik",
    state: "Maharashtra",
    pinCode: "422001",
    verified: true,
  },
  {
    name: "Gulf of Mannar Coastal Fishermen Cooperative Federation",
    code: "GULF-MANNAR",
    description: "Coastal aquaculture, seaweed, and marine producer federation with shared cold rooms.",
    address: "Thoothukudi Marine Corridor & Jetty 1-4",
    village: "Thoothukudi",
    district: "Thoothukudi",
    state: "Tamil Nadu",
    pinCode: "628001",
    verified: true,
  },
  {
    name: "Kadapa Central Collection Centre",
    code: "KADAPA-CENTRAL",
    description: "Farm2Fork cooperative collection centre serving central Kadapa.",
    address: "Kadapa Central Collection Centre",
    village: "Kadapa",
    district: "Kadapa",
    state: "Andhra Pradesh",
    pinCode: "516001",
    verified: true,
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
    verified: true,
  },
];

export async function autoSeedIfEmpty() {
  try {
    // 1. Ensure all valid admin accounts exist at every boot
    const defaultAdminPass = await bcrypt.hash("AdminDemo@123", 10);
    const adminEmails = [
      "admin@farm2fork.demo",
      "admin@samruddhisetu.in",
      "admin@samruddhsetu.in",
    ];
    for (const admEmail of adminEmails) {
      await prisma.user.upsert({
        where: { email: admEmail },
        update: { role: "ADMIN" },
        create: {
          email: admEmail,
          name: "Samruddhi Setu Admin",
          role: "ADMIN",
          passwordHash: defaultAdminPass,
        },
      });
    }

    // 2. Ensure all regional cooperative societies exist at every boot
    const societyMap = new Map<string, string>();
    for (const soc of SOCIETIES) {
      const s = await prisma.cooperativeSociety.upsert({
        where: { code: soc.code },
        update: {
          name: soc.name,
          address: soc.address,
          village: soc.village,
          district: soc.district,
          state: soc.state,
          pinCode: soc.pinCode,
          description: soc.description,
          verified: true,
          active: true,
        },
        create: soc,
      });
      societyMap.set(soc.code, s.id);
    }

    // 3. Ensure categories exist
    for (const [name, slug] of categories) {
      await prisma.productCategory.upsert({
        where: { slug },
        update: { name },
        create: { name, slug },
      });
    }
    const catRecords = await prisma.productCategory.findMany();
    const catMap = new Map(catRecords.map((c) => [c.name.toLowerCase(), c.id]));
    const defaultCatId = catRecords[0]?.id || "";

    // 4. Ensure demo consumer user exists for simulated order dispatches
    const defaultConsumerPass = await bcrypt.hash("ShopDemo@123", 10);
    const demoConsumer = await prisma.user.upsert({
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

    // 5. Ensure the 6 Teacher Demo Farmers exist with full inventory, sales, and dispatches
    const defaultFarmerPass = await bcrypt.hash("FarmDemo@123", 10);
    const demoFarmerCrops: Record<string, Array<{ name: string; variety: string; category: string; priceRupees: number; img: string; available: number; sold: number }>> = {
      Bharath: [
        { name: "Fresh Country Tomatoes", variety: "Hybrid Red", category: "vegetables", priceRupees: 28, img: "/products/tomato.webp", available: 240, sold: 110 },
        { name: "Green Shimla Capsicum", variety: "Grade A Crisp", category: "vegetables", priceRupees: 45, img: "/products/capsicum.webp", available: 160, sold: 75 },
        { name: "Nagpur Sweet Oranges", variety: "Fresh Harvest", category: "fruits", priceRupees: 65, img: "/products/orange.webp", available: 300, sold: 90 },
      ],
      Aditya: [
        { name: "Organic Crisp Carrots", variety: "Ooty Red", category: "vegetables", priceRupees: 40, img: "/products/carrot.webp", available: 180, sold: 95 },
        { name: "Palak (Spinach)", variety: "Broad Leaf Tender", category: "vegetables", priceRupees: 20, img: "/products/spinach.webp", available: 120, sold: 60 },
        { name: "French Beans", variety: "Tender Bush", category: "vegetables", priceRupees: 50, img: "/products/beans.webp", available: 150, sold: 70 },
      ],
      Bhargav: [
        { name: "Sona Masoori Rice (Aged)", variety: "Single Polish 1-Year", category: "grains", priceRupees: 62, img: "/products/basmati-rice.webp", available: 500, sold: 280 },
        { name: "Desi Toor Dal (Pigeon Pea)", variety: "Unpolished Organic", category: "pulses", priceRupees: 145, img: "/products/toor-dal.webp", available: 320, sold: 130 },
        { name: "Sharbati Whole Wheat", variety: "Golden Grain", category: "grains", priceRupees: 42, img: "/products/wheat.webp", available: 400, sold: 190 },
      ],
      Charan: [
        { name: "Guntur Red Dry Chillies", variety: "Sanam Hot S4", category: "spices", priceRupees: 210, img: "/products/whole-red-chillies.webp", available: 200, sold: 140 },
        { name: "Organic Salem Turmeric", variety: "High Curcumin Grade", category: "spices", priceRupees: 180, img: "/products/turmeric.webp", available: 250, sold: 105 },
        { name: "Foxtail Millet (Kangni)", variety: "Dehusked Natural", category: "millets", priceRupees: 78, img: "/products/millet.webp", available: 300, sold: 85 },
      ],
      Dileep: [
        { name: "Snowball Cauliflower", variety: "Compact White", category: "vegetables", priceRupees: 35, img: "/products/cauliflower.webp", available: 190, sold: 80 },
        { name: "Organic Bitter Gourd", variety: "Dark Green Spiny", category: "vegetables", priceRupees: 38, img: "/products/bitter-gourd.webp", available: 140, sold: 55 },
        { name: "Fresh Kasuri Methi", variety: "Tender Green Leaves", category: "leafy vegetables", priceRupees: 22, img: "/products/methi.webp", available: 110, sold: 65 },
      ],
      Yaswant: [
        { name: "Banganapalli Mangoes", variety: "Naturally Ripened", category: "fruits", priceRupees: 95, img: "/products/mango.webp", available: 350, sold: 180 },
        { name: "Robusta Farm Bananas", variety: "Yellow Table Grade", category: "fruits", priceRupees: 32, img: "/products/banana.webp", available: 260, sold: 120 },
      ],
    };

    for (const farmer of teacherFarmers) {
      const u = await prisma.user.upsert({
        where: { email: farmer.email },
        update: { name: farmer.name, phone: farmer.phone },
        create: {
          email: farmer.email,
          name: farmer.name,
          phone: farmer.phone,
          passwordHash: defaultFarmerPass,
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

      if (profile) {
        // Associate society membership
        const socCode = farmer.societyCode || "KADAPA-CENTRAL";
        const socId = societyMap.get(socCode) || societyMap.get("TIRUPATI-AGRI") || Array.from(societyMap.values())[0];
        if (socId) {
          await prisma.societyFarmer.upsert({
            where: {
              societyId_farmerId: {
                societyId: socId,
                farmerId: profile.id,
              },
            },
            update: { active: true, status: "APPROVED" },
            create: {
              societyId: socId,
              farmerId: profile.id,
              active: true,
              status: "APPROVED",
            },
          });
        }

        // Seed or update products and inventory for this farmer
        const cropList = demoFarmerCrops[farmer.name] || demoFarmerCrops["Bharath"];
        for (let idx = 0; idx < cropList.length; idx++) {
          const crop = cropList[idx];
          const prodSlug = `${farmer.name.toLowerCase()}-${crop.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          const catId = catMap.get(crop.category.toLowerCase()) || defaultCatId;

          const prod = await prisma.product.upsert({
            where: { id: `FARM-${profile.id.slice(-6)}-${idx + 1}` },
            update: {
              name: crop.name,
              variety: crop.variety,
              pricePaise: crop.priceRupees * 100,
              active: true,
            },
            create: {
              id: `FARM-${profile.id.slice(-6)}-${idx + 1}`,
              farmerId: profile.id,
              categoryId: catId,
              name: crop.name,
              variety: crop.variety,
              unit: "kg",
              pricePaise: crop.priceRupees * 100,
              imageUrl: crop.img,
              active: true,
            },
          });

          await prisma.inventory.upsert({
            where: { productId: prod.id },
            update: {
              available: crop.available,
              reserved: 12,
              sold: crop.sold,
            },
            create: {
              productId: prod.id,
              farmerId: profile.id,
              available: crop.available,
              reserved: 12,
              sold: crop.sold,
            },
          });

          // Ensure at least one order and completed dispatch exists for real earnings calculation
          const sampleOrderId = `ORD-${farmer.name.toUpperCase().slice(0, 3)}-${idx + 1}`;
          const sampleOrder = await prisma.order.upsert({
            where: { id: sampleOrderId },
            update: {},
            create: {
              id: sampleOrderId,
              consumerId: demoConsumer.id,
              status: "DELIVERED",
              paymentMethod: "ONLINE",
              totalPaise: Math.round(crop.sold * crop.priceRupees * 100),
              platformFeePaise: Math.round(crop.sold * crop.priceRupees * 3),
              logisticsPaise: 15000,
            },
          });

          await prisma.orderItem.upsert({
            where: {
              id: `ITEM-${sampleOrderId}`,
            },
            update: {
              qty: crop.sold,
              linePaise: Math.round(crop.sold * crop.priceRupees * 100),
            },
            create: {
              id: `ITEM-${sampleOrderId}`,
              orderId: sampleOrder.id,
              productId: prod.id,
              farmerId: profile.id,
              qty: crop.sold,
              unitPaise: crop.priceRupees * 100,
              linePaise: Math.round(crop.sold * crop.priceRupees * 100),
              fulfillmentChannel: "SOCIETY",
            },
          });
        }
      }
    }

    const prodCount = await prisma.product.count();
    if (prodCount >= 150) {
      console.log(`[AutoSeed] Database has ${prodCount} products. Core demo data up to date.`);
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
