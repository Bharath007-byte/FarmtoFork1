import { prisma } from "../src/db.js";

const emails = [
  "bharathg@gmail.com",
  "aditya@gmail.com",
  "bhargav@gmail.com",
  "yaswant@gmail.com",
  "dileep@gmail.com",
  "charan@gmail.com",
];

async function main() {
  const farmers = await prisma.farmerProfile.findMany({
    where: {
      user: {
        email: {
          in: emails,
        },
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      inventory: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
              active: true,
            },
          },
        },
      },
    },
    orderBy: {
      farmName: "asc",
    },
  });

  for (const farmer of farmers) {
    console.log(`\n=== ${farmer.user.name} — ${farmer.farmName} ===`);
    console.log(`Email: ${farmer.user.email}`);
    console.table(
      farmer.inventory.map((item) => ({
        productId: item.product.id,
        product: item.product.name,
        unit: item.product.unit,
        active: item.product.active,
        available: item.available,
        reserved: item.reserved,
        sold: item.sold,
      })),
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
