import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const farmers = await prisma.farmerProfile.findMany({
    where: {
      user: {
        role: "FARMER",
        email: {
          in: [
            "bharathg@gmail.com",
            "aditya@gmail.com",
            "bhargav@gmail.com",
            "yaswant@gmail.com",
            "dileep@gmail.com",
            "charan@gmail.com",
          ],
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
      products: {
        where: {
          active: true,
        },
        include: {
          category: {
            select: {
              name: true,
            },
          },
          inventory: {
            select: {
              available: true,
              reserved: true,
              sold: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  console.log("\n========== FARM2FORK DEMO FARMER PRODUCT MAP ==========\n");

  let total = 0;

  for (const farmer of farmers) {
    console.log(`FARMER: ${farmer.user.name}`);
    console.log(`EMAIL : ${farmer.user.email}`);
    console.log(`FARM  : ${farmer.farmName}`);
    console.log(`PRODUCTS: ${farmer.products.length}`);
    console.log("--------------------------------------------");

    for (const product of farmer.products) {
      console.log(
        `${product.name} | ${product.category.name} | ` +
        `${product.pricePaise / 100} INR/kg | ` +
        `stock=${product.inventory?.available ?? 0}`
      );
    }

    console.log("\n");
    total += farmer.products.length;
  }

  console.log("============================================");
  console.log(`TOTAL ACTIVE DEMO FARMER PRODUCTS: ${total}`);
  console.log("============================================\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
