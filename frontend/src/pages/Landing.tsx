import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { Footer } from "../components/Footer";
import { useI18n } from "../i18n";
import farmerImg from "../assets/farmer-produce.png";
import truckImg from "../assets/delivery-truck.png";
import farmTechImg from "../assets/farm-tech.png";

export function Landing() {
  const { t } = useI18n();
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

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-white ring-1 ring-white/40 backdrop-blur-md">
            {t("pillBadge") || "FARMER · DIRECT · FAIR"}
          </span>

          <h1 className="mt-5 font-serif text-5xl leading-[1.05] tracking-tight text-white drop-shadow-lg md:text-7xl">
            {t("brandName")}
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg sm:text-xl md:text-2xl font-medium tracking-wide text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)] leading-relaxed">
            "{t("heroQuote") || "Bridging India's harvest directly to your home — fresh, fair, and pure."}"
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Link
              to="/join"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2f7a4a] px-8 py-3.5 text-sm font-bold text-white shadow-xl transition hover:bg-[#26633c] hover:shadow-2xl sm:w-auto"
            >
              {t("joinFamily")}
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-white/15 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/25 sm:w-auto"
            >
              {t("signIn")}
            </Link>

            <Link
              to="/shop"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#e8b84a] px-7 py-3.5 text-sm font-bold text-[#1c2b22] shadow-lg transition hover:bg-[#dca838] sm:w-auto"
            >
              {t("exploreShop")}
            </Link>
          </div>
        </div>
      </section>

      {/* Services Showcase: Full-Section Edge-to-Edge Experience */}
      <section id="family" className="w-full bg-[#f6f4ee]">
        {/* Header intro */}
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <span className="inline-block rounded-full bg-emerald-100/90 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#235e38]">
            Platform Services
          </span>
          <h2 className="mt-4 font-serif text-4xl font-bold tracking-tight text-[#1c2b22] sm:text-5xl">
            Be A Part Of Our Family
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#1c2b22]/70 sm:text-lg max-w-2xl mx-auto">
            "Whether you grow, buy, or deliver — Samruddhi Setu connects every link of the farm-to-fork chain with complete transparency, fresh food, and fair earnings."
          </p>
        </div>

        {/* 1. FARMER SERVICE - FULL SECTION WITH CRISP IMAGE COLORS & TRANSPARENT BORDER */}
        <div className="w-full border-t border-stone-200/80 bg-white">
          <div className="mx-auto max-w-7xl grid w-full items-center lg:grid-cols-2">
            {/* Image container: rich natural colors, transparent rounded border & soft elevation */}
            <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-14">
              <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-stone-200/80 shadow-2xl bg-stone-50 group">
                <img
                  src={farmerImg}
                  alt="Farmer with fresh harvest"
                  className="h-[400px] sm:h-[460px] lg:h-[520px] w-full object-cover object-center transition duration-700 group-hover:scale-105"
                />
                <div className="absolute left-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-[#2f7a4a] text-base font-black text-white shadow-xl ring-2 ring-white/80">
                  01
                </div>
                <span className="absolute bottom-6 left-6 rounded-full bg-black/70 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  Crop & Dairy Producers
                </span>
              </div>
            </div>

            {/* Content (Spacious editorial) */}
            <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14 xl:px-16 bg-white">
              <span className="text-xs font-bold uppercase tracking-widest text-[#2f7a4a]">
                Direct Farmer Access
              </span>
              <h3 className="mt-3 font-serif text-3xl font-bold text-[#1c2b22] sm:text-4xl lg:text-5xl leading-tight">
                Empowering Every Indian Grower.
              </h3>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-zinc-600 font-normal">
                Snap a photo of your harvest for automated AI quality grading, view real-time APMC Mandi rates, and sell directly to consumers and cooperative societies with zero commission middlemen and guaranteed direct bank payouts.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-800">
                  AI Harvest Grading
                </span>
                <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-800">
                  Zero Commission Middlemen
                </span>
                <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-800">
                  Guaranteed Direct Payouts
                </span>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <Link
                  to="/login?next=/farmer/dashboard"
                  className="inline-flex items-center gap-3 rounded-full bg-[#2f7a4a] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#25633c] hover:shadow-xl"
                >
                  Click here to redirect to Farmer Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/register?role=farmer"
                  className="text-xs font-bold text-zinc-500 hover:text-[#2f7a4a] transition underline underline-offset-4"
                >
                  New grower? Register as Farmer →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CONSUMER SERVICE - FULL SECTION WITH CRISP IMAGE COLORS & TRANSPARENT BORDER (Alternating) */}
        <div className="w-full border-t border-stone-200/80 bg-[#faf8f4]">
          <div className="mx-auto max-w-7xl grid w-full items-center lg:grid-cols-2">
            {/* Content (Desktop Left) */}
            <div className="order-2 flex flex-col justify-center px-6 py-10 sm:px-12 lg:order-1 lg:px-14 xl:px-16 bg-[#faf8f4]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#b87d19]">
                100% Farm Fresh
              </span>
              <h3 className="mt-3 font-serif text-3xl font-bold text-[#1c2b22] sm:text-4xl lg:text-5xl leading-tight">
                Pure Nutrition, From Soil to Table.
              </h3>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-zinc-600 font-normal">
                Experience genuine tree-ripened seasonal fruits, crisp organic vegetables, and cold-pressed pure oils picked at peak morning freshness and delivered directly to your doorstep with full farmer traceability.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                <span className="rounded-full bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-800">
                  150+ Authentic Catalog Items
                </span>
                <span className="rounded-full bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-800">
                  Live Delivery Route Tracking
                </span>
                <span className="rounded-full bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-800">
                  100g Samples to Bulk Packs
                </span>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-3 rounded-full bg-[#d89726] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#c28319] hover:shadow-xl"
                >
                  Click here to redirect to Marketplace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/register?role=consumer"
                  className="text-xs font-bold text-zinc-500 hover:text-[#d89726] transition underline underline-offset-4"
                >
                  New customer? Register as Consumer →
                </Link>
              </div>
            </div>

            {/* Image (Desktop Right): rich natural colors, transparent rounded border & soft elevation */}
            <div className="order-1 flex items-center justify-center p-6 sm:p-10 lg:order-2 lg:p-12 xl:p-14">
              <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-stone-200/80 shadow-2xl bg-[#f5f1e8] group">
                <img
                  src={farmTechImg}
                  alt="Organic farming technology"
                  className="h-[400px] sm:h-[460px] lg:h-[520px] w-full object-cover object-center transition duration-700 group-hover:scale-105"
                />
                <div className="absolute left-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-[#d89726] text-sm font-black text-white shadow-xl ring-2 ring-white/80">
                  02
                </div>
                <span className="absolute bottom-6 left-6 rounded-full bg-black/70 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  Households & Bulk Buyers
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. LOGISTICS SERVICE - FULL SECTION WITH CRISP IMAGE COLORS & TRANSPARENT BORDER */}
        <div className="w-full border-t border-b border-stone-200/80 bg-white">
          <div className="mx-auto max-w-7xl grid w-full items-center lg:grid-cols-2">
            {/* Image: rich natural colors, transparent rounded border & soft elevation */}
            <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-14">
              <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-stone-200/80 shadow-2xl bg-stone-50 group">
                <img
                  src={truckImg}
                  alt="Logistics delivery truck"
                  className="h-[400px] sm:h-[460px] lg:h-[520px] w-full object-cover object-center transition duration-700 group-hover:scale-105"
                />
                <div className="absolute left-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-[#1c2b22] text-base font-black text-white shadow-xl ring-2 ring-white/80">
                  03
                </div>
                <span className="absolute bottom-6 left-6 rounded-full bg-black/70 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  Instant Bikes & Bulk Trucks
                </span>
              </div>
            </div>

            {/* Content (Spacious editorial) */}
            <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14 xl:px-16 bg-white">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1c2b22]">
                Agri Transit Backbone
              </span>
              <h3 className="mt-3 font-serif text-3xl font-bold text-[#1c2b22] sm:text-4xl lg:text-5xl leading-tight">
                The Backbone of Fresh Transit.
              </h3>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-zinc-600 font-normal">
                Join our verified logistics network to transport mandi harvests, cooperative society bulk loads, and local hyper-express neighborhood deliveries with intelligent route clustering and steady daily earnings.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                <span className="rounded-full bg-stone-100 px-4 py-1.5 text-xs font-bold text-stone-800">
                  Cluster-Optimized Routing
                </span>
                <span className="rounded-full bg-stone-100 px-4 py-1.5 text-xs font-bold text-stone-800">
                  Mandi-to-Society Linehauls
                </span>
                <span className="rounded-full bg-stone-100 px-4 py-1.5 text-xs font-bold text-stone-800">
                  Instant Settled Daily Earnings
                </span>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <Link
                  to="/login?next=/logistics"
                  className="inline-flex items-center gap-3 rounded-full bg-[#1c2b22] px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-black hover:shadow-xl"
                >
                  Click here to redirect to Logistics Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/register?role=logistics"
                  className="text-xs font-bold text-zinc-500 hover:text-[#1c2b22] transition underline underline-offset-4"
                >
                  Fleet partner? Register with Fleet →
                </Link>
              </div>
            </div>
          </div>
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
              Samruddhi Setu (समृद्धि सेतु) is a direct farmer-to-consumer marketplace. Farmers set
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

      {/* COMPREHENSIVE PLATFORM FOOTER */}
      <Footer />
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
