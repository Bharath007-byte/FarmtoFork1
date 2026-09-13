import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Wheat,
  Phone,
  Mail,
  MapPin,
  Heart,
  Sparkles,
  Lock,
  Check,
} from "lucide-react";
import { SamruddhiSetuLogo } from "./SamruddhiSetuLogo";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail("");
    }, 4000);
  };

  return (
    <footer className="w-full bg-[#111c15] text-stone-300 font-sans border-t border-stone-800">
      {/* 1. NEWSLETTER & HARVEST DROP SUBSCRIPTION STRIP */}
      <div className="border-b border-stone-800/80 bg-[#16241c]">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 px-3.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-800/60">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Weekly Farm Fresh Notifications</span>
              </div>
              <h3 className="mt-3 font-serif text-2xl font-bold text-white sm:text-3xl">
                Stay connected to rural India's harvest.
              </h3>
              <p className="mt-2 text-sm text-stone-400 leading-relaxed max-w-xl">
                Receive weekly seasonal fruit drops, live APMC mandi price shifts, organic farming updates, and exclusive community bulk discounts directly to your inbox.
              </p>
            </div>

            <div className="lg:col-span-6">
              {subscribed ? (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-900/40 p-4 border border-emerald-700/50 text-emerald-200">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">You're on the list!</p>
                    <p className="text-xs text-emerald-300">
                      Welcome to the Samruddhi Setu family. Watch your inbox for harvest drops.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    required
                    className="flex-1 rounded-full bg-[#0d1711] px-5 py-3.5 text-sm text-white placeholder-stone-500 border border-stone-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2f7a4a] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#25633c] shadow-lg shrink-0 cursor-pointer"
                  >
                    Subscribe Now
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No spam guaranteed
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Direct farmer support
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Unsubscribe anytime
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TRUST HIGHLIGHTS PILLARS */}
      <div className="border-b border-stone-800/60 bg-[#132018]/50">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                <Wheat className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">0% Middleman Commission</h4>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                  100% of fair value goes directly to farmers' bank accounts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-950 text-amber-400 border border-amber-800/60">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">AI Harvest Grading</h4>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                  Computer vision verifies freshness, grade, and quality standards.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-blue-400 border border-blue-800/60">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">2–4 Hour Farm Transit</h4>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                  Harvested early morning and delivered hyper-fresh to doorsteps.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-950 text-purple-400 border border-purple-800/60">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">RBI & UPI Compliant</h4>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                  256-bit encrypted payments with instant daily settlement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN MULTI-COLUMN NAVIGATION DIRECTORY */}
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand Col (4 cols) */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-block">
              <SamruddhiSetuLogo light size="md" />
            </Link>
            <p className="mt-4 text-xs text-stone-400 leading-relaxed max-w-sm">
              <strong className="text-stone-200">Samruddhi Setu (समृद्धि सेतु)</strong> bridges the gap between Indian growers and conscious consumers. We empower farmers with fair mandi price transparency, automated AI grading, and direct market access.
            </p>

            {/* National Initiatives & Recognitions */}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-md bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-amber-300 border border-stone-800">
                🇮🇳 Digital India Initiative
              </span>
              <span className="rounded-md bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-stone-800">
                ONDC Aligned
              </span>
              <span className="rounded-md bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-blue-300 border border-stone-800">
                SIH AgriTech
              </span>
            </div>

            {/* Direct Contact Info */}
            <div className="mt-6 space-y-2.5 text-xs text-stone-400">
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Toll-Free Helpline: <strong className="text-stone-200 font-mono">1800-FARM-SETU</strong> (1800-3276-7388)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-emerald-400 shrink-0" />
                <a href="mailto:support@samruddhsetu.in" className="hover:text-emerald-300 transition">
                  support@samruddhsetu.in
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Agri-Innovation Hub, Sector 62, Noida, NCR, India</span>
              </div>
            </div>
          </div>

          {/* Col 2: Marketplace / Produce (2 cols) */}
          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Marketplace
            </p>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link to="/shop" className="text-stone-400 hover:text-white transition">
                  Fresh Vegetables
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-stone-400 hover:text-white transition">
                  Seasonal Fruits
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-stone-400 hover:text-white transition">
                  Pure A2 Bilona Ghee
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-stone-400 hover:text-white transition">
                  Cold-Pressed Oils
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-stone-400 hover:text-white transition">
                  Farm Honey & Jaggery
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-stone-400 hover:text-white transition">
                  Organic Pulses & Millets
                </Link>
              </li>
              <li>
                <Link to="/shop" className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-emerald-200 transition">
                  Explore All 150+ Items →
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: For Farmers (2 cols) */}
          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              For Farmers (किसान)
            </p>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link to="/login?next=/farmer/dashboard" className="text-stone-400 hover:text-white transition">
                  Farmer Dashboard
                </Link>
              </li>
              <li>
                <Link to="/register?role=farmer" className="text-stone-400 hover:text-white transition">
                  Register as Grower
                </Link>
              </li>
              <li>
                <Link to="/farmer/dashboard" className="text-stone-400 hover:text-white transition">
                  AI Produce Scanner
                </Link>
              </li>
              <li>
                <Link to="/farmer/dashboard" className="text-stone-400 hover:text-white transition">
                  APMC Mandi Live Rates
                </Link>
              </li>
              <li>
                <Link to="/farmer/dashboard" className="text-stone-400 hover:text-white transition">
                  Kisan Digital Twin & IoT
                </Link>
              </li>
              <li>
                <Link to="/farmer/dashboard" className="text-stone-400 hover:text-white transition">
                  Crop Advisory & Weather
                </Link>
              </li>
              <li>
                <Link to="/farmer/dashboard" className="text-stone-400 hover:text-white transition">
                  Direct Bank Settlement
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Logistics & Partners (2 cols) */}
          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Logistics & Fleet
            </p>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link to="/login?next=/logistics" className="text-stone-400 hover:text-white transition">
                  Fleet Desk Login
                </Link>
              </li>
              <li>
                <Link to="/register?role=logistics" className="text-stone-400 hover:text-white transition">
                  Join as Delivery Partner
                </Link>
              </li>
              <li>
                <Link to="/logistics" className="text-stone-400 hover:text-white transition">
                  Live Dispatch & Clustering
                </Link>
              </li>
              <li>
                <Link to="/logistics" className="text-stone-400 hover:text-white transition">
                  Cold-Chain Truck Network
                </Link>
              </li>
              <li>
                <Link to="/logistics" className="text-stone-400 hover:text-white transition">
                  Mandi-to-Society Linehauls
                </Link>
              </li>
              <li>
                <Link to="/logistics" className="text-stone-400 hover:text-white transition">
                  Daily Earnings Settle
                </Link>
              </li>
              <li>
                <Link to="/logistics" className="text-stone-400 hover:text-white transition">
                  Vehicle Insurance
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Help & Company (2 cols) */}
          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Support & Company
            </p>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <a href="#about" className="text-stone-400 hover:text-white transition">
                  About Our Mission
                </a>
              </li>
              <li>
                <Link to="/login" className="text-stone-400 hover:text-white transition">
                  Customer Sign In
                </Link>
              </li>
              <li>
                <Link to="/register?role=consumer" className="text-stone-400 hover:text-white transition">
                  Create Account
                </Link>
              </li>
              <li>
                <span className="text-stone-400 cursor-pointer hover:text-white transition">
                  Track Consignment
                </span>
              </li>
              <li>
                <span className="text-stone-400 cursor-pointer hover:text-white transition">
                  100% Freshness Policy
                </span>
              </li>
              <li>
                <span className="text-stone-400 cursor-pointer hover:text-white transition">
                  Grievance Redressal
                </span>
              </li>
              <li>
                <span className="text-stone-400 cursor-pointer hover:text-white transition">
                  Kisan & Buyer FAQs
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. PAYMENT METHODS & COMPLIANCE BAR */}
      <div className="border-t border-stone-800/80 bg-[#0d1610]">
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
              <span className="font-semibold text-stone-300">Accepted Payments:</span>
              <span className="rounded bg-stone-900 px-2 py-0.5 font-mono text-[11px] text-stone-300 border border-stone-800">
                BHIM UPI
              </span>
              <span className="rounded bg-stone-900 px-2 py-0.5 font-mono text-[11px] text-stone-300 border border-stone-800">
                GPay
              </span>
              <span className="rounded bg-stone-900 px-2 py-0.5 font-mono text-[11px] text-stone-300 border border-stone-800">
                PhonePe
              </span>
              <span className="rounded bg-stone-900 px-2 py-0.5 font-mono text-[11px] text-stone-300 border border-stone-800">
                RuPay
              </span>
              <span className="rounded bg-stone-900 px-2 py-0.5 font-mono text-[11px] text-stone-300 border border-stone-800">
                Visa / MasterCard
              </span>
              <span className="rounded bg-stone-900 px-2 py-0.5 font-mono text-[11px] text-stone-300 border border-stone-800">
                NetBanking
              </span>
              <span className="rounded bg-stone-900 px-2 py-0.5 font-mono text-[11px] text-stone-300 border border-stone-800">
                Cash On Delivery
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-stone-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Lock className="h-3.5 w-3.5" /> 256-Bit SSL Encrypted
              </span>
              <span className="h-3 w-px bg-stone-700" />
              <span>ISO 9001:2015 Quality</span>
              <span className="h-3 w-px bg-stone-700" />
              <span>Made in India 🇮🇳</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM COPYRIGHT & LEGAL BAR */}
      <div className="border-t border-stone-900 bg-black/60">
        <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <p>
              © {new Date().getFullYear()} <strong>Samruddhi Setu</strong> (समृद्धि सेतु) Technologies Pvt. Ltd. All rights reserved.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <span className="hover:text-stone-300 cursor-pointer transition">Privacy Policy</span>
              <span>·</span>
              <span className="hover:text-stone-300 cursor-pointer transition">Terms of Service</span>
              <span>·</span>
              <span className="hover:text-stone-300 cursor-pointer transition">Farmer Protection Accord</span>
              <span>·</span>
              <span className="hover:text-stone-300 cursor-pointer transition">Refund & Cancellation</span>
              <span>·</span>
              <span className="hover:text-stone-300 cursor-pointer transition">Security & Grievance</span>
            </div>

            <p className="flex items-center gap-1 text-[11px] text-stone-400">
              Built with <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 inline" /> for India's 140M+ Kisan
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
