import type { DataOrigin } from "../ai/engine";

export function DataBadge({ origin }: { origin: DataOrigin }) {
  const tone =
    origin === "Live"
      ? "bg-emerald-100 text-emerald-800"
      : origin === "AI Prediction"
        ? "bg-amber-100 text-amber-900"
        : origin === "Simulated"
          ? "bg-sky-100 text-sky-800"
          : "bg-zinc-100 text-zinc-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
      {origin}
    </span>
  );
}
