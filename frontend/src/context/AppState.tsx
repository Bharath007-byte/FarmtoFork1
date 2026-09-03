import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, token as readToken } from "../services/api";
import {
  getCurrentCoords,
  reverseGeocode,
  watchLiveLocation,
  type Coords,
} from "../lib/location";
import type { FarmerOffer, SessionUser, UserRole } from "../types";

const SESSION_KEY = "f2f-session";
const TOKEN_KEY = "f2f-token";
const OFFERS_KEY = "f2f-offers";
const LOCATION_KEY = "f2f-location";
const COORDS_KEY = "f2f-coords";
const NOTIFY_KEY = "f2f-notify";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function mapRole(role: string): UserRole {
  return role.toLowerCase() as UserRole;
}

function toSession(user: {
  id: string;
  role: string;
  name: string;
  email: string;
  phone?: string | null;
  photoUrl?: string | null;
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: mapRole(user.role),
    phone: user.phone || undefined,
    photoUrl: user.photoUrl || undefined,
  };
}

interface AppState {
  user: SessionUser | null;
  cartCount: number;
  offers: FarmerOffer[];
  locationLabel: string;
  coords: Coords | null;
  notifyPermission: NotificationPermission | "unsupported";
  alertsEnabled: boolean;
  apiReady: boolean;
  registerAccount: (input: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
    phone?: string;
    crops?: string[];
    farmName?: string;
    location?: string;
    district?: string;
    state?: string;
    pinCode?: string;
    turnstileToken?: string;
  }) => Promise<string | null>;
  loginWithPassword: (
    email: string,
    password: string,
    turnstileToken?: string
  ) => Promise<string | null>;
  logout: () => void;
  refreshCartCount: () => Promise<void>;
  addProductToCart: (productId: string, qty?: number) => Promise<string | null>;
  saveOffer: (offer: FarmerOffer) => void;
  enableLiveLocation: () => Promise<string | null>;
  enableNotifications: () => Promise<void>;
  pingHarvest: (body: string) => void;
  setLocationLabel: (value: string) => void;
  setNotifyPermission: (value: NotificationPermission | "unsupported") => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() =>
    readJson<SessionUser | null>(SESSION_KEY, null)
  );
  const [cartCount, setCartCount] = useState(0);
  const [offers, setOffers] = useState<FarmerOffer[]>(() =>
    readJson<FarmerOffer[]>(OFFERS_KEY, [])
  );
  const [locationLabel, setLocationState] = useState(
    () => localStorage.getItem(LOCATION_KEY) || ""
  );
  const [coords, setCoords] = useState<Coords | null>(() =>
    readJson<Coords | null>(COORDS_KEY, null)
  );
  const [notifyPermission, setNotifyState] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission
  );
  const [alertsEnabled, setAlertsEnabled] = useState(
    () => localStorage.getItem(NOTIFY_KEY) === "granted"
  );
  const [apiReady, setApiReady] = useState(false);
  const watchRef = useRef<number>(-1);

  const persistUser = (next: SessionUser | null, token?: string) => {
    setUser(next);
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (!next) localStorage.removeItem(TOKEN_KEY);
  };

  const refreshCartCount = async () => {
    if (!readToken()) {
      setCartCount(0);
      return;
    }
    try {
      const data = await api<{ items: { qty: number }[] }>("/api/cart");
      setCartCount(data.items.reduce((n, i) => n + i.qty, 0));
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        await fetch("/api/health");
        setApiReady(true);
      } catch {
        setApiReady(false);
      }
      if (!readToken()) return;
      try {
        const data = await api<{
          user: { id: string; role: string; name: string; email: string; phone?: string | null };
        }>("/api/auth/me");
        persistUser(toSession(data.user));
        await refreshCartCount();
      } catch {
        persistUser(null);
      }
    })();
  }, []);

  const applyCoords = async (next: Coords, announce = false) => {
    setCoords(next);
    localStorage.setItem(COORDS_KEY, JSON.stringify(next));
    const label = await reverseGeocode(next.lat, next.lng);
    setLocationState(label);
    localStorage.setItem(LOCATION_KEY, label);
    if (announce && localStorage.getItem(NOTIFY_KEY) === "granted") {
      try {
        new Notification("farm2fork", {
          body: `Live pin updated · ${label}`,
        });
      } catch {
        /* ignore */
      }
    }
  };

  useEffect(() => {
    return () => {
      if (watchRef.current !== -1) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  const value = useMemo<AppState>(
    () => ({
      user,
      cartCount,
      offers,
      locationLabel,
      coords,
      notifyPermission,
      alertsEnabled,
      apiReady,
      registerAccount: async (input) => {
        try {
          const data = await api<{
            token: string;
            user: { id: string; role: string; name: string; email: string; phone?: string | null };
          }>("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
              role: input.role.toUpperCase(),
              name: input.name.trim(),
              email: input.email.trim().toLowerCase(),
              password: input.password,
              confirmPassword: input.confirmPassword,
              phone: input.phone,
              categories: input.crops,
              farmName: input.farmName,
              location: input.location,
              district: input.district,
              state: input.state,
              pinCode: input.pinCode,
              turnstileToken: input.turnstileToken,
            }),
          });
          persistUser(toSession(data.user), data.token);
          return null;
        } catch (e) {
          return e instanceof ApiError ? e.message : "Unable to register. Is the API running?";
        }
      },
      loginWithPassword: async (email, password, turnstileToken) => {
        try {
          const data = await api<{
            token: string;
            user: { id: string; role: string; name: string; email: string; phone?: string | null };
          }>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              password,
              turnstileToken,
            }),
          });
          persistUser(toSession(data.user), data.token);
          await refreshCartCount();
          return null;
        } catch (e) {
          return e instanceof ApiError
            ? e.message
            : "Cannot reach the farm2fork API. Start PostgreSQL, then `cd server && npm run dev`.";
        }
      },
      logout: () => {
        persistUser(null);
        setCartCount(0);
      },
      refreshCartCount,
      addProductToCart: async (productId, qty = 1) => {
        if (!readToken()) return "Sign in before adding to cart.";
        try {
          await api("/api/cart", {
            method: "POST",
            body: JSON.stringify({ productId, qty }),
          });
          await refreshCartCount();
          return null;
        } catch (e) {
          return e instanceof ApiError ? e.message : "Could not add to cart";
        }
      },
      saveOffer: (offer) => {
        setOffers((current) => {
          const next = [offer, ...current];
          localStorage.setItem(OFFERS_KEY, JSON.stringify(next));
          return next;
        });
      },
      enableLiveLocation: async () => {
        try {
          const next = await getCurrentCoords();
          await applyCoords(next, false);
          if (watchRef.current !== -1) {
            navigator.geolocation.clearWatch(watchRef.current);
          }
          watchRef.current = watchLiveLocation((tick) => {
            void applyCoords(tick, false);
          });
          return null;
        } catch {
          return "Location permission was denied. Enable it in the browser address bar.";
        }
      },
      enableNotifications: async () => {
        if (typeof Notification === "undefined") {
          setNotifyState("unsupported");
          return;
        }
        const result = await Notification.requestPermission();
        setNotifyState(result);
        const on = result === "granted";
        setAlertsEnabled(on);
        localStorage.setItem(NOTIFY_KEY, result);
        if (on) {
          new Notification("farm2fork alerts on", {
            body: "We will notify you when harvest near your live pin is moving.",
          });
        }
      },
      pingHarvest: (body) => {
        if (typeof Notification === "undefined") return;
        if (Notification.permission !== "granted") return;
        new Notification("farm2fork", { body });
      },
      setLocationLabel: (value) => {
        setLocationState(value);
        localStorage.setItem(LOCATION_KEY, value);
      },
      setNotifyPermission: (value) => {
        setNotifyState(value);
        localStorage.setItem(NOTIFY_KEY, value);
      },
    }),
    [
      user,
      cartCount,
      offers,
      locationLabel,
      coords,
      notifyPermission,
      alertsEnabled,
      apiReady,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
