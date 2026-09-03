import { Link } from "react-router-dom";
import { Leaf, Truck, Wheat } from "lucide-react";
import type { ReactNode } from "react";
import { SiteNav } from "../components/SiteNav";

export function Join() {
  return (
    <div className="min-h-screen bg-[#f7f4ec] text-[#1c2b22]">
      <SiteNav />
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-28">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#2f7a4a]">
          Be a part of our family
        </p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">Choose your door</h1>
        <p className="mt-3 max-w-xl text-zinc-600">
          Welcome aboard. Whether you grow, buy, or deliver, this is your first
          step into a community that keeps food fresh, fair, and connected.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Door
            to="/register/farmer"
            n="1"
            icon={<Wheat />}
            title="Farmer"
            text="Create your farm account, then open the dashboard to sell produce."
          />
          <Door
            to="/register/consumer"
            n="2"
            icon={<Leaf />}
            title="Consumer"
            text="Households and bulk buyers shop unique produce types."
          />
          <Door
            to="/register/logistics"
            n="3"
            icon={<Truck />}
            title="Logistics"
            text="Create a fleet account, then sign in on the logistics desk."
          />
        </div>
        <p className="mt-10 text-sm text-zinc-500">
          Already on farm2fork?{" "}
          <Link to="/login" className="font-semibold text-[#2f7a4a]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Door({
  to,
  n,
  icon,
  title,
  text,
}: {
  to: string;
  n: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link to={to} className="rounded-3xl bg-white p-8 shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[#2f7a4a]">{icon}</span>
        <span className="text-xs font-bold text-zinc-300">{n}</span>
      </div>
      <h2 className="mt-8 text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{text}</p>
    </Link>
  );
}
