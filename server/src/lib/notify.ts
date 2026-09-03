import { prisma } from "../db.js";
import { emitEvent } from "../socket.js";

export async function notify(
  userId: string,
  type: string,
  title: string,
  message: string
) {
  const row = await prisma.notification.create({
    data: { userId, type, title, message },
  });
  emitEvent("NOTIFICATION", row, `user:${userId}`);
  return row;
}
