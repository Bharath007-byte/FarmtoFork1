import type { UserRole, SessionUser } from "../types";

const SESSION_KEY = "f2f-session";

export function readSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function homeForRole(role?: string) {
  if (role === "farmer") return "/farmer/dashboard";
  if (role === "logistics") return "/logistics";
  if (role === "admin") return "/admin";
  return "/shop";
}

/** Farmers always land on the farm desk. `next` is used only if it matches the role. */
export function afterLoginPath(role: string | undefined, next: string | null) {
  const home = homeForRole(role);
  if (!next || !next.startsWith("/") || next.startsWith("//")) return home;
  if (role === "farmer") {
    return next.startsWith("/farmer") ? next : home;
  }
  if (role === "logistics") {
    return next.startsWith("/logistics") ? next : home;
  }
  if (role === "admin") {
    return next.startsWith("/admin") ? next : home;
  }
  if (next.startsWith("/farmer") || next.startsWith("/logistics") || next.startsWith("/admin")) {
    return home;
  }
  return next;
}

export function isRole(user: SessionUser | null, role?: UserRole | UserRole[]) {
  if (!user || !role) return true;
  const allowed = Array.isArray(role) ? role : [role];
  return allowed.includes(user.role);
}
