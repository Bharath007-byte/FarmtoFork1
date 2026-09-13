import { Link } from "react-router-dom";
import {
  Truck,
  Bike,
  ShieldCheck,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  DollarSign,
  Boxes,
  Zap,
} from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import truckImg from "../assets/delivery-truck.png";

export function LogisticsPortal() {
  return (
    <div className="min-h-screen bg-[#fcfbfa] text-[#1c2b22]">
      <SiteNav transparent />

      {/* Hero Section */}
      <section className="relative flex min-h-[75vh] items-center justify-center overflow-hidden bg-[#142018] pt-20">
        <img
          src={truckImg}
          alt="Fleet transport"
          className="absolute inset-0 h-full w-full object-cover opacity-35 filter brightness-75"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#142018] via-black/40 to-black/20" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-900 shadow-md border border-zinc-200 backdrop-blur-md">
            <Truck className="h-4 w-4 text-zinc-900" /> Samruddhi Setu Logistics Fleet
          </span>

          <h1 className="mt-5 font-serif text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            Empower Farm Deliveries. <br />
            <span className="text-[#e8b84a]">Earn With Every Trip.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/90 md:text-lg">
            Connect local farms directly with consumers, restaurants, and cooperative societies across Karnataka & Andhra Pradesh.
            Whether you ride a bike for instant deliveries or drive a heavy truck for bulk mandi shipments,
            there is a place for you in our fleet.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/logistics/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2f7a4a] px-8 py-4 text-sm font-bold text-white shadow-xl transition hover:bg-[#26633c] hover:shadow-2xl sm:w-auto"
            >
              Register as Delivery Partner
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/login?next=/logistics"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 sm:w-auto"
            >
              Sign In to Fleet Desk
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-white/70">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Transparent Payouts
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Flexible Hours
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Real-time GPS Navigation
            </span>
          </div>
        </div>
      </section>

      {/* Two Fleet Delivery Tiers (Matching Slide 3 & Slide 6) */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[#2f7a4a]">Choose Your Fleet Tier</span>
          <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#1c2b22] md:text-4xl">
            Two Ways to Deliver with Samruddhi Setu
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#1c2b22]/70">
            Select the delivery category tailored to your vehicle type, capacity, and route availability.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {/* Option 1: Instant Bike Deliveries */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm transition hover:shadow-md">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <Bike className="h-7 w-7" />
              </div>

              <span className="mt-6 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                Tier 1: Instant Delivery
              </span>

              <h3 className="mt-3 font-serif text-2xl font-bold text-[#1c2b22]">
                Bike & Scooter Riders
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-[#1c2b22]/70">
                Ideal for two-wheelers handling rapid, same-day delivery bags from local farm hubs and societies straight to household doorsteps.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-[#1c2b22]/80">
                <li className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                  <span><strong>Instant & Same-Day Dispatch</strong> (up to 35 kg)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                  <span><strong>Short Delivery Radius</strong> within 15–25 km</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span><strong>Flexible Availability:</strong> Part-time or Full-time shifts</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <DollarSign className="h-4 w-4 text-amber-600 shrink-0" />
                  <span><strong>Daily / Weekly UPI Payouts</strong> directly to bank</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100">
              <Link
                to="/logistics/register"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3.5 text-sm font-bold text-white transition hover:bg-black"
              >
                Apply as Bike Partner
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Option 2: Large Deliveries (Trucks / Vans) */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white p-8 shadow-sm transition hover:shadow-md">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2f7a4a] text-white">
                <Truck className="h-7 w-7" />
              </div>

              <span className="mt-6 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                Tier 2: Bulk & Inter-City
              </span>

              <h3 className="mt-3 font-serif text-2xl font-bold text-[#1c2b22]">
                Trucks, Vans & Cold Chain
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-[#1c2b22]/70">
                Designed for commercial haulers, tempos, and refrigerated trucks moving bulk crates from farmer fields to cooperative societies and urban depots.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-[#1c2b22]/80">
                <li className="flex items-center gap-2.5">
                  <Boxes className="h-4 w-4 text-[#2f7a4a] shrink-0" />
                  <span><strong>Bulk Transport & Pallet Loads</strong> (500 kg to 10+ Tons)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-[#2f7a4a] shrink-0" />
                  <span><strong>Scheduled Mandi-to-Society Routes</strong> (Devanahalli, Yelahanka, Tirupati)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#2f7a4a] shrink-0" />
                  <span><strong>Cold Storage & Preservation</strong> options for delicate produce</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <DollarSign className="h-4 w-4 text-[#2f7a4a] shrink-0" />
                  <span><strong>Guaranteed Bulk Contracts</strong> & recurring commercial freight rates</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-emerald-100">
              <Link
                to="/logistics/register"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f7a4a] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#26633c]"
              >
                Apply with Truck / Van
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Verification Steps Overview */}
      <section className="bg-[#f2efe9] py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold text-[#1c2b22]">Simple Onboarding Journey</h2>
          <p className="mt-2 text-sm text-[#1c2b22]/70">Complete your verification in 6 simple steps.</p>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {[
              { num: "01", label: "Personal Info" },
              { num: "02", label: "Upload Docs" },
              { num: "03", label: "Quality Checks" },
              { num: "04", label: "Review Status" },
              { num: "05", label: "Vehicle Specs" },
              { num: "06", label: "Admin Approval" },
            ].map((s) => (
              <div key={s.num} className="rounded-2xl bg-white p-4 text-center shadow-sm">
                <span className="block font-mono text-xl font-black text-[#2f7a4a]">{s.num}</span>
                <span className="mt-1 block text-xs font-semibold text-zinc-700">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <Link
              to="/logistics/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#2f7a4a] px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#26633c]"
            >
              Start Your Registration
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
