import assert from "node:assert/strict";
import test, { after } from "node:test";
import { LogisticsStatus } from "@prisma/client";
import { prisma } from "../db.ts";
import { pickOpenDeliverySlot } from "./deliverySlots.ts";

after(async () => {
  await prisma.$disconnect();
});

test("conditional claim update allows only one assignee", async () => {
  const logistics = await prisma.user.findMany({
    where: { role: "LOGISTICS" },
    select: { id: true },
    take: 2,
  });
  const farmer = await prisma.farmerProfile.findFirst({ select: { id: true } });
  assert.ok(farmer, "existing farmer required");
  const actorA = logistics[0]?.id;
  const actorB = logistics[1]?.id || logistics[0]?.id;
  assert.ok(actorA, "existing logistics user required");

  const slot = await pickOpenDeliverySlot(prisma);
  assert.ok(slot, "open delivery slot required");

  const booking = await prisma.logisticsBooking.create({
    data: {
      farmerId: farmer.id,
      userId: actorA,
      slotId: slot.id,
      pickup: "claim-atomicity-test",
      quantity: 0.25,
      vehicle: "mini-truck",
      status: LogisticsStatus.CONFIRMED,
    },
  });

  try {
    const [first, second] = await Promise.all([
      prisma.logisticsBooking.updateMany({
        where: {
          id: booking.id,
          assignedUserId: null,
          status: { notIn: [LogisticsStatus.CANCELLED, LogisticsStatus.DELIVERED] },
        },
        data: { assignedUserId: actorA, status: LogisticsStatus.PICKUP_SCHEDULED },
      }),
      prisma.logisticsBooking.updateMany({
        where: {
          id: booking.id,
          assignedUserId: null,
          status: { notIn: [LogisticsStatus.CANCELLED, LogisticsStatus.DELIVERED] },
        },
        data: { assignedUserId: actorB, status: LogisticsStatus.PICKUP_SCHEDULED },
      }),
    ]);
    const wins = [first.count, second.count].filter((n) => n === 1).length;
    assert.equal(wins, 1);
    const stored = await prisma.logisticsBooking.findUniqueOrThrow({ where: { id: booking.id } });
    assert.ok(stored.assignedUserId === actorA || stored.assignedUserId === actorB);
  } finally {
    await prisma.logisticsBooking.delete({ where: { id: booking.id } });
  }
});
