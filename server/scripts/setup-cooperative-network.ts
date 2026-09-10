import { prisma } from "../src/db.js";

const SOCIETIES = [
  {
    name: "Kadapa Central Collection Centre",
    code: "KADAPA-CENTRAL",
    description:
      "Farm2Fork cooperative collection centre serving farmers in the central Kadapa network.",
    address: "Kadapa Central Collection Centre",
    village: "Kadapa",
    district: "Kadapa",
    state: "Andhra Pradesh",
    pinCode: "516001",
  },
  {
    name: "Kadapa Rural Collection Centre",
    code: "KADAPA-RURAL",
    description:
      "Farm2Fork cooperative collection centre serving farmers in the rural Kadapa network.",
    address: "Kadapa Rural Collection Centre",
    village: "Kadapa",
    district: "Kadapa",
    state: "Andhra Pradesh",
    pinCode: "516004",
  },
];

const MEMBERS = [
  {
    societyCode: "KADAPA-CENTRAL",
    email: "bharathg@gmail.com",
  },
  {
    societyCode: "KADAPA-CENTRAL",
    email: "aditya@gmail.com",
  },
  {
    societyCode: "KADAPA-CENTRAL",
    email: "bhargav@gmail.com",
  },
  {
    societyCode: "KADAPA-RURAL",
    email: "yaswant@gmail.com",
  },
  {
    societyCode: "KADAPA-RURAL",
    email: "dileep@gmail.com",
  },
  {
    societyCode: "KADAPA-RURAL",
    email: "charan@gmail.com",
  },
];

async function main() {
  console.log("Setting up Farm2Fork cooperative network...");

  const societies = new Map<string, string>();

  for (const data of SOCIETIES) {
    const society = await prisma.cooperativeSociety.upsert({
      where: {
        code: data.code,
      },
      update: {
        name: data.name,
        description: data.description,
        address: data.address,
        village: data.village,
        district: data.district,
        state: data.state,
        pinCode: data.pinCode,
        active: true,
      },
      create: {
        ...data,
        active: true,
        verified: false,
      },
    });

    societies.set(society.code, society.id);

    console.log(`Society: ${society.name}`);
  }

  for (const member of MEMBERS) {
    const societyId = societies.get(member.societyCode);

    if (!societyId) {
      throw new Error(
        `Society ${member.societyCode} was not created/found`
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: member.email,
      },
      include: {
        farmer: true,
      },
    });

    if (!user) {
      throw new Error(`User not found: ${member.email}`);
    }

    if (user.role !== "FARMER") {
      throw new Error(`${member.email} is not a FARMER account`);
    }

    if (!user.farmer) {
      throw new Error(`${member.email} does not have a FarmerProfile`);
    }

    await prisma.societyFarmer.upsert({
      where: {
        societyId_farmerId: {
          societyId,
          farmerId: user.farmer.id,
        },
      },
      update: {
        active: true,
      },
      create: {
        societyId,
        farmerId: user.farmer.id,
        active: true,
      },
    });

    console.log(
      `  Member: ${user.name} (${user.email})`
    );
  }

  console.log("");
  console.log("Cooperative network setup complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
