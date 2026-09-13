import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const societies = [
  {
    name: "Devanahalli Farmers Cooperative Society",
    code: "SOC-DEV-001",
    description: "Primary Agricultural Marketing Cooperative Society serving Devanahalli taluk and Bengaluru Rural producers with direct mandi connections and cold storage facilities.",
    address: "APMC Yard Road, Near Railway Station, Devanahalli",
    village: "Devanahalli",
    district: "Bengaluru Rural",
    state: "Karnataka",
    pinCode: "562110",
    lat: 13.2484,
    lng: 77.7126,
    phone: "080-27682241",
    email: "devanahalli.coop@farm2fork.in",
    verified: true,
    active: true,
  },
  {
    name: "Yelahanka Raitha Seva Sahakara Sangha",
    code: "SOC-YEL-002",
    description: "Serving vegetable, fruit, leafy greens and dairy farmers across Yelahanka, Doddaballapura Highway and North Bangalore urban-fringe clusters.",
    address: "Sahakara Bhavan, BBMP Main Road, Yelahanka Old Town",
    village: "Yelahanka",
    district: "Bengaluru Urban",
    state: "Karnataka",
    pinCode: "560064",
    lat: 13.1007,
    lng: 77.5963,
    phone: "080-28561190",
    email: "yelahanka.sangha@farm2fork.in",
    verified: true,
    active: true,
  },
  {
    name: "Tirupati Rythu Seva Sahakara Society",
    code: "SOC-TIR-003",
    description: "Rayalaseema Farmers Cooperative Society coordinating direct bulk transports of mangoes, tomatoes, paddy, and pulses from Chittoor/Tirupati farm belts.",
    address: "Rythu Bazar Complex, Renigunta Road, Tirupati",
    village: "Tirupati",
    district: "Tirupati",
    state: "Andhra Pradesh",
    pinCode: "517501",
    lat: 13.6288,
    lng: 79.4192,
    phone: "0877-2248550",
    email: "tirupati.rythu@farm2fork.in",
    verified: true,
    active: true,
  },
];

async function seedSocieties() {
  console.log("Seeding cooperative societies...");
  for (const s of societies) {
    const record = await prisma.cooperativeSociety.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        description: s.description,
        address: s.address,
        village: s.village,
        district: s.district,
        state: s.state,
        pinCode: s.pinCode,
        lat: s.lat,
        lng: s.lng,
        phone: s.phone,
        email: s.email,
        verified: s.verified,
        active: s.active,
      },
      create: s,
    });
    console.log(`✓ Upserted Society: ${record.name} (${record.code}) in ${record.district}, ${record.state}`);
  }
}

seedSocieties()
  .catch((err) => {
    console.error("Failed to seed societies:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
