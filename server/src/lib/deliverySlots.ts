import { Prisma, type DeliverySlot, type PrismaClient } from "@prisma/client";

/** Same schedule as prisma/seed.ts — do not invent extra windows. */
export const SLOT_START_MINUTES = [9 * 60, 10 * 60, 11 * 60, 14 * 60, 15 * 60];
export const SLOT_LENGTH_MIN = 60;
export const SLOT_CAPACITY = 2;
export const SLOT_DAYS_AHEAD = 7;

type Db = Prisma.TransactionClient | PrismaClient;

function startOfDay(d: Date) {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function slotDateTime(slot: { date: Date; startMin: number }) {
  const at = new Date(slot.date);
  at.setHours(0, 0, 0, 0);
  at.setMinutes(slot.startMin);
  return at;
}

export function slotIsInFuture(slot: { date: Date; startMin: number }, now = new Date()) {
  return slotDateTime(slot).getTime() > now.getTime();
}

export function slotIsBookable(
  slot: { date: Date; startMin: number; booked: number; capacity: number },
  now = new Date()
) {
  return slot.booked < slot.capacity && slotIsInFuture(slot, now);
}

/** Create upcoming slots only. Never decrease booked. Never delete slots. */
export async function ensureUpcomingDeliverySlots(db: Db, now = new Date()) {
  const created: DeliverySlot[] = [];
  for (let day = 0; day < SLOT_DAYS_AHEAD; day++) {
    const date = startOfDay(now);
    date.setDate(date.getDate() + day);
    for (const startMin of SLOT_START_MINUTES) {
      const endMin = startMin + SLOT_LENGTH_MIN;
      const existing = await db.deliverySlot.findUnique({
        where: { date_startMin_endMin: { date, startMin, endMin } },
      });
      if (existing) continue;
      const row = await db.deliverySlot.create({
        data: { date, startMin, endMin, capacity: SLOT_CAPACITY, booked: 0 },
      });
      created.push(row);
    }
  }
  return created;
}

export async function pickOpenDeliverySlot(db: Db, now = new Date()) {
  await ensureUpcomingDeliverySlots(db, now);
  const from = startOfDay(now);
  const until = startOfDay(now);
  until.setDate(until.getDate() + SLOT_DAYS_AHEAD);
  const slots = await db.deliverySlot.findMany({
    where: {
      date: { gte: from, lt: until },
    },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });
  return slots.find((s) => slotIsBookable(s, now)) ?? null;
}
