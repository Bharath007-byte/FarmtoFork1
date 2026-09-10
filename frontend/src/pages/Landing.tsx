import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Leaf, ShieldCheck, Truck, Wheat } from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import farmerImg from "../assets/farmer-produce.png";
import truckImg from "../assets/delivery-truck.png";
import farmTechImg from "../assets/farm-tech.png";

export function Landing() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    el?.scrollIntoView({ behavior: "smooth" });
  }, [location.hash]);

  return (
    <div className="bg-[#f7f4ec] text-[#1c2b22]">
      <SiteNav transparent />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#142018]">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-[115%] w-full scale-110 object-cover object-center"
        >
          <source src="/hero-hd.mp4" type="video/mp4" />
          <source src="/upscaled-video.mov" type="video/quicktime" />
        </video>

        <div className="pointer-events-none absolute inset-0 bg-black/15" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white">
            Fresh · Fair · Connected
          </p>

          <h1 className="mt-5 font-serif text-5xl leading-[1.05] tracking-tight text-white drop-shadow md:text-7xl">
            farm2fork
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white drop-shadow md:text-lg">
            Welcome aboard. Whether you grow, buy, or deliver — this is your
            first step into a community that keeps food fresh, fair, and
            connected.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-[#e8b84a] px-8 py-3.5 text-sm font-bold text-[#1c2b22] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Shop now
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/login?next=/admin"
              className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Portal
            </Link>
          </div>

          <p className="mt-4 text-[11px] text-white/60">
            Authorized Farm2Fork administrators only
          </p>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#2f7a4a]">
              About us
            </p>

            <h2 className="mt-3 font-serif text-4xl leading-tight">
              From the field to your table, without the middleman.
            </h2>

            <p className="mt-5 leading-relaxed text-[#1c2b22]/70">
              farm2fork is a direct farmer-to-consumer marketplace. Farmers set
              live prices, buyers choose harvest-fresh produce, and logistics
              partners move it with care. Fruits, vegetables, dairy, spices,
              ghee, eggs, and honey — priced as listed.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <Stat value="0%" label="middleman commission" />
              <Stat value="2 hrs" label="typical harvest drop" />
            </div>
          </div>

          <img
            src={farmerImg}
            alt="Farmer with harvest"
            className="h-[380px] w-full rounded-3xl object-cover shadow-xl"
          />
        </div>
      </section>

      <section id="family" className="bg-[#e8f0e3] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl md:text-4xl">
            Be a part of our family
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-center text-[#1c2b22]/65">
            Three doors. One harvest network. Pick the path that is yours.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <RoleCard
              to="/login?next=/farmer/dashboard"
              icon={<Wheat className="h-6 w-6" />}
              title="Farmer"
              text="Sign in to your farm dashboard. New farmers can create an account from Sign up."
            />

            <RoleCard
              to="/register/consumer"
              icon={<Leaf className="h-6 w-6" />}
              title="Consumer"
              text="Shop unique harvest types, then pick variety and weight on the product page."
            />

            <RoleCard
              to="/register/logistics"
              icon={<Truck className="h-6 w-6" />}
              title="Logistics"
              text="Sign in to your fleet desk and take bike or cold-chain jobs."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-serif text-3xl md:text-4xl">
          How harvest travels
        </h2>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <Story
            image={farmTechImg}
            title="Grown with care"
            text="Verified farms share harvest dates, variety, and live rates."
          />

          <Story
            image={farmerImg}
            title="Sold without noise"
            text="One card per produce type. Open it, pick variety and pack size."
          />

          <Story
            image={truckImg}
            title="Moved while fresh"
            text="Bike for small drops, cold trucks for bulk."
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-3xl font-extrabold text-[#2f7a4a]">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function RoleCard({
  to,
  icon,
  title,
  text,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-3xl bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f0e3] text-[#2f7a4a]">
        {icon}
      </div>

      <h3 className="mt-5 text-xl font-bold">{title}</h3>

      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{text}</p>

      <p className="mt-5 text-sm font-semibold text-[#2f7a4a]">
        Continue →
      </p>
    </Link>
  );
}

function Story({
  image,
  title,
  text,
}: {
  image: string;
  title: string;
  text: string;
}) {
  return (
    <article>
      <img
        src={image}
        alt=""
        className="h-52 w-full rounded-2xl object-cover"
      />

      <h3 className="mt-4 text-lg font-bold">{title}</h3>

      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{text}</p>
    </article>
  );
}
