import { prisma } from "../db.js";

async function main() {
  const [
    products,
    categories,
    inventories,
    users,
    farmers,
    societies,
    orders,
    bookings,
    verifications,
    documents,
    marketPrices,
    reviews,
    notifications,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.productCategory.count(),
    prisma.inventory.count(),
    prisma.user.count(),
    prisma.farmerProfile.count(),
    prisma.cooperativeSociety.count(),
    prisma.order.count(),
    prisma.logisticsBooking.count(),
    prisma.logisticsVerification.count(),
    prisma.logisticsDocument.count(),
    prisma.marketPrice.count(),
    prisma.review.count(),
    prisma.notification.count(),
  ]);

  const allCategories = await prisma.productCategory.findMany({
    select: { name: true, _count: { select: { products: true } } },
  });

  const sampleProducts = await prisma.product.findMany({
    take: 5,
    select: { id: true, name: true, pricePaise: true, unit: true, category: { select: { name: true } }, inventory: { select: { available: true } } },
  });

  const userRoles = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
  });

  const societyList = await prisma.cooperativeSociety.findMany({
    select: { code: true, name: true, district: true, state: true },
  });

  console.log(JSON.stringify({
    counts: {
      products,
      categories,
      inventories,
      users,
      farmers,
      societies,
      orders,
      bookings,
      verifications,
      documents,
      marketPrices,
      reviews,
      notifications,
    },
    userRoles,
    allCategories,
    sampleProducts,
    societies: societyList,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
