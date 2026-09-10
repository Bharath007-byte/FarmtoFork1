import { prisma } from "../src/db.js";

async function main() {
  const farmers = await prisma.farmerProfile.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      farmName: "asc",
    },
  });

  console.table(
    farmers.map((farmer) => ({
      id: farmer.id,
      name: farmer.user.name,
      email: farmer.user.email,
      farm: farmer.farmName,
      location: farmer.location,
      district: farmer.district,
      state: farmer.state,
      pin: farmer.pinCode,
    })),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
