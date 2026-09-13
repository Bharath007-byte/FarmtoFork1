import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, X, Sparkles } from "lucide-react";
import { api } from "../services/api";
import { useApp } from "../context/AppState";
import { useRealtime } from "../hooks/useRealtime";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function NotificationBell({ light = false }: { light?: boolean }) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api<{ notifications: NotificationItem[] }>("/api/notifications");
      setNotifications(res.notifications || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useRealtime(
    ["NOTIFICATION", "ORDER_STATUS_CHANGED", "LOGISTICS_STATUS_CHANGED", "LOGISTICS_BOOKED"],
    fetchNotifications
  );

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await api(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await api("/api/notifications/mark-all-read", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full transition hover:scale-105 ${
          light
            ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur"
            : "bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/70"
        }`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[100] mt-3 w-80 sm:w-96 rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-800 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50 py-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-zinc-400">
                <Sparkles className="mx-auto mb-2 h-7 w-7 text-zinc-300" />
                <p className="text-xs font-medium">No notifications yet</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Order and delivery alerts will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`group relative cursor-pointer px-3 py-3 transition hover:bg-zinc-50 rounded-xl my-1 ${
                    !n.read ? "bg-emerald-50/50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-zinc-900 leading-snug">
                      {n.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-zinc-400">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                    {n.message}
                  </p>
                  {!n.read && (
                    <span className="absolute left-1 top-4 h-1.5 w-1.5 rounded-full bg-emerald-600 ring-2 ring-emerald-100" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
