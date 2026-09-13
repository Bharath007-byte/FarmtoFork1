import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetAccounts() {
  console.log("Starting safe user accounts cleanup...");

  // 1. Delete transactional / user-dependent data
  await prisma.cartItem.deleteMany({});
  console.log("✓ Cleared Cart items");

  await prisma.review.deleteMany({});
  console.log("✓ Cleared Reviews");

  await prisma.paymentWebhookEvent.deleteMany({});
  await prisma.payment.deleteMany({});
  console.log("✓ Cleared Payments");

  await prisma.orderItem.deleteMany({});
  await prisma.farmerOrder.deleteMany({});
  await prisma.logisticsBooking.deleteMany({});
  await prisma.order.deleteMany({});
  console.log("✓ Cleared Orders & Bookings");

  await prisma.logisticsDocument.deleteMany({});
  await prisma.logisticsVerification.deleteMany({});
  console.log("✓ Cleared Logistics verifications and documents");

  await prisma.address.deleteMany({});
  console.log("✓ Cleared Addresses");

  await prisma.otpVerification.deleteMany({});
  await prisma.passwordReset.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.priceAlert.deleteMany({});
  await prisma.farmerCollaboration.deleteMany({});
  await prisma.societyFarmer.deleteMany({});
  console.log("✓ Cleared Notifications & Sessions");

  // 2. Delete existing users & farmer profiles
  await prisma.inventory.deleteMany({});
  await prisma.productPriceLog.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.farmerProfile.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("✓ Cleared User accounts and farmer profiles");

  // 3. Create fresh default Admin for Samruddhi Setu
  const passwordHash = await bcrypt.hash("AdminDemo@123", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@samruddhsetu.in",
      name: "Samruddhi Setu Admin",
      role: "ADMIN",
      passwordHash,
    },
  });
  console.log(`✓ Created fresh Samruddhi Setu Admin: ${admin.email} (Password: AdminDemo@123)`);

  console.log("Account reset completed successfully!");
}

resetAccounts()
  .catch((err) => {
    console.error("Account reset failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
