import { useState } from "react";
import { Bell, MapPin, X } from "lucide-react";
import { detectAddress } from "../lib/location";
import { useApp } from "../context/AppState";

export function PermissionsPrompt() {
  const {
    locationLabel,
    setLocationLabel,
    notifyPermission,
    setNotifyPermission,
  } = useApp();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("f2f-perm") === "1"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (dismissed) return null;
  if (locationLabel && notifyPermission !== "default") return null;

  const allowLocation = async () => {
    setBusy(true);
    setError("");
    try {
      const label = await detectAddress();
      setLocationLabel(label);
    } catch {
      setError("Location was blocked. You can set it later in the shop header.");
    } finally {
      setBusy(false);
    }
  };

  const allowNotify = async () => {
    if (typeof Notification === "undefined") {
      setNotifyPermission("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifyPermission(result);
    if (result === "granted") {
      new Notification("farm2fork", {
        body: "We will ping you when harvest near you is on the move.",
      });
    }
  };

  const skip = () => {
    sessionStorage.setItem("f2f-perm", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-[90] w-[min(100%-1.5rem,420px)] -translate-x-1/2 rounded-2xl border border-emerald-100 bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-[#1c2b22]">
          Make harvest feel local
        </p>
        <button onClick={skip} className="text-zinc-400" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Allow live location so we can route crates to you, and choose whether
        you want harvest alerts.
      </p>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!locationLabel && (
          <button
            disabled={busy}
            onClick={allowLocation}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2f7a4a] px-3 py-1.5 text-xs font-bold text-white"
          >
            <MapPin className="h-3.5 w-3.5" />
            {busy ? "Finding you…" : "Allow live location"}
          </button>
        )}
        {notifyPermission === "default" && (
          <button
            onClick={allowNotify}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-bold text-[#2f7a4a]"
          >
            <Bell className="h-3.5 w-3.5" />
            Allow notifications
          </button>
        )}
        <button onClick={skip} className="text-xs font-semibold text-zinc-500">
          Not now
        </button>
      </div>
    </div>
  );
}
