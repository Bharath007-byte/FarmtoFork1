const BASE = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function token() {
  return localStorage.getItem("f2f-token") || "";
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const t = token();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 502 || res.status === 503) {
    throw new ApiError(
      "The farm2fork API is not running. In a terminal: cd server && npm run dev (PostgreSQL must be up first).",
      res.status
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data.error;
    const message =
      typeof err === "string" ? err : err ? JSON.stringify(err) : res.statusText;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export function mediaUrl(path: string | null | undefined) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${import.meta.env.VITE_API_URL || ""}${path}`;
}

export function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
