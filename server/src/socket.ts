import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./env.js";

let io: Server | null = null;

export function attachIo(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });
  io.on("connection", (socket) => {
    socket.on("join", (room: string) => {
      if (typeof room === "string") socket.join(room);
    });
  });
  return io;
}

export function emitEvent(event: string, payload: unknown, room?: string) {
  if (!io) return;
  if (room) io.to(room).emit(event, payload);
  else io.emit(event, payload);
}
