import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CloudSun, LineChart, Sparkles, Stethoscope } from "lucide-react";
import { useApp } from "../context/AppState";

export function AiAdvisory() {
  const { user, locationLabel } = useApp();
  const crops = user?.crops?.length ? user.crops.join(", ") : "your listed crops";

  return (
    <div>
        <Link to="/farmer/dashboard" className="text-sm font-semibold text-[#2f7a4a]">
          ← Dashboard
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-[#2f7a4a]">
          AI advisory
        </p>
        <h1 className="mt-2 font-serif text-4xl">Care, weather, and price sense</h1>
        <p className="mt-3 text-zinc-600">
          Built for {user?.name || "your farm"}
          {locationLabel ? ` near ${locationLabel}` : ""}. Advice is tuned to {crops}.
        </p>

        <Link to="/farmer/farmai" className="mt-4 inline-block text-sm font-semibold text-[#2f7a4a]">
          Open FarmAI for photo diagnosis →
        </Link>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card
            icon={<CloudSun className="h-5 w-5" />}
            title="Weather alert"
            body="Light showers expected in 36 hours. Hold leafy harvest until morning, keep ghee and milk in shade."
          />
          <Card
            icon={<LineChart className="h-5 w-5" />}
            title="Demand forecast"
            body="Tomato and mango search is up this week on farm2fork. Raising list quantity by 8–12% is likely to clear."
          />
          <Card
            icon={<Sparkles className="h-5 w-5" />}
            title="Pricing tip"
            body="Your farm-gate ask is healthiest within 5% of our buy sheet. Premium organic lots can sit 8% above."
          />
          <Card
            icon={<Stethoscope className="h-5 w-5" />}
            title="Livestock & crop care"
            body="For dairy: keep morning milk below 4°C within 45 minutes. For spices: sun-dry only to 10–12% moisture."
          />
        </div>
    </div>
  );
}

function Card({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0e3] text-[#2f7a4a]">
        {icon}
      </div>
      <h2 className="mt-4 font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{body}</p>
    </div>
  );
}
