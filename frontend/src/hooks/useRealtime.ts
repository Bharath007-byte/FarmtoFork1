import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useRealtime(events: string[], onEvent: () => void) {
  useEffect(() => {
    const url = import.meta.env.VITE_API_URL || window.location.origin;
    if (!socket) {
      socket = io(url, { transports: ["websocket", "polling"] });
    }
    const handler = () => onEvent();
    for (const e of events) socket.on(e, handler);
    return () => {
      for (const e of events) socket?.off(e, handler);
    };
  }, [events.join(","), onEvent]);
}
