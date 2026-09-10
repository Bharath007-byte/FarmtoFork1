import "dotenv/config";
import { prisma } from "../src/db.js";
import { ensureUpcomingDeliverySlots } from "../src/lib/deliverySlots.js";

const created = await ensureUpcomingDeliverySlots(prisma);
console.log(`Refreshed delivery slots. Newly created: ${created.length}`);
await prisma.$disconnect();
