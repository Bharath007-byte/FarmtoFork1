import { useState } from "react";
import { MapPin } from "lucide-react";
import { useApp } from "../context/AppState";
import { LiveMap } from "./LiveMap";

export function TopAccess({ light }: { light: boolean }) {
  const { locationLabel, coords, enableLiveLocation } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const chip = light
    ? "bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md hover:bg-white/25"
    : "bg-white text-[#1c2b22] ring-1 ring-zinc-200 hover:bg-zinc-50";

  const onLocation = async () => {
    setBusy(true);
    setMessage("");
    const err = await enableLiveLocation();
    setBusy(false);
    if (err) {
      setMessage(err);
      setOpen(true);
      return;
    }
    setOpen(true);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onLocation}
        className={`inline-flex max-w-[200px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${chip}`}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{busy ? "Finding you…" : locationLabel || "Location"}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-[80] w-[min(92vw,380px)] rounded-3xl bg-white p-3 text-[#1c2b22] shadow-2xl ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-bold">Your live map</p>
            <button onClick={() => setOpen(false)} className="text-xs font-semibold text-zinc-400">
              Close
            </button>
          </div>
          <LiveMap coords={coords} />
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-zinc-500">
            {coords ? locationLabel : "Allow location to drop a pin on the map."}
          </p>
          {message && <p className="mt-1 px-1 text-[11px] text-rose-600">{message}</p>}
        </div>
      )}
    </div>
  );
}
