import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check, Sprout, User } from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { useApp } from "../context/AppState";
import { useI18n, type AppLang } from "../i18n";
import type { UserRole } from "../types";

const POPULAR_CROPS = [
  "Tomato", "Mango", "Onion", "Potato", "Chili", "Paddy (Rice)", "Carrot", "Banana", "Capsicum", "Millets"
];

const REGIONAL_DISTRICTS = [
  { district: "Bengaluru Rural", state: "Karnataka" },
  { district: "Bengaluru Urban", state: "Karnataka" },
  { district: "Kolar", state: "Karnataka" },
  { district: "Chikkaballapura", state: "Karnataka" },
  { district: "Tirupati", state: "Andhra Pradesh" },
  { district: "Chittoor", state: "Andhra Pradesh" },
];

export function Register() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { registerAccount } = useApp();
  const { lang, setLang } = useI18n();

  // Multi-step for farmer
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Personal
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: Farm & Location
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [district, setDistrict] = useState("Bengaluru Rural");
  const [state, setState] = useState("Karnataka");
  const [pinCode, setPinCode] = useState("");
  const [selectedCrops, setSelectedCrops] = useState<string[]>(["Tomato"]);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (role === "logistics") {
    return <Navigate to="/logistics/register" replace />;
  }

  if (role !== "farmer" && role !== "consumer") {
    return <Navigate to="/join" replace />;
  }

  const toggleCrop = (c: string) => {
    setSelectedCrops((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleNextStep = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (role === "farmer") {
      setStep(2);
    } else {
      finishRegistration();
    }
  };

  const finishRegistration = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (role === "farmer" && (!farmName || !pinCode)) {
      setError("Please fill in your farm name and 6-digit PIN code.");
      return;
    }

    setBusy(true);
    const err = await registerAccount({
      name,
      email,
      password,
      confirmPassword,
      role: role as UserRole,
      phone,
      farmName: role === "farmer" ? farmName : undefined,
      location: role === "farmer" ? (location || district) : undefined,
      district: role === "farmer" ? district : undefined,
      state: role === "farmer" ? state : undefined,
      pinCode: role === "farmer" ? pinCode : undefined,
    });
    setBusy(false);

    if (err) {
      setError(err);
      return;
    }

    const home = role === "farmer" ? "/farmer/dashboard" : "/shop";
    navigate(home);
  };

  return (
    <div className="min-h-screen bg-[#fcfbfa] text-[#1c2b22]">
      <SiteNav />

      <div className="mx-auto max-w-lg px-5 pb-20 pt-28">
        {/* Role badge */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-xs font-bold text-[#2f7a4a]">
            {role === "farmer" ? <Sprout className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            {role === "farmer" ? "Farmer Registration · किसान पंजीकरण" : "Consumer Sign Up"}
          </span>

          {role === "farmer" && (
            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-500">
              <span className={`h-2.5 w-2.5 rounded-full ${step === 1 ? "bg-[#2f7a4a]" : "bg-zinc-300"}`} />
              <span className={`h-2.5 w-2.5 rounded-full ${step === 2 ? "bg-[#2f7a4a]" : "bg-zinc-300"}`} />
              <span className="ml-1 text-[11px] font-bold text-zinc-600">Step {step} of 2</span>
            </div>
          )}
        </div>

        <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {role === "farmer"
            ? step === 1
              ? "Start Your Farmer Desk"
              : "Tell Us About Your Farm"
            : "Create Consumer Account"}
        </h1>

        <p className="mt-2 text-sm text-zinc-600">
          {role === "farmer"
            ? step === 1
              ? "Join Samruddhi Setu to sell harvest directly to consumers and cooperative societies with fair prices."
              : "Add your farm location and crops so local logistics and buyers can discover your produce."
            : "Sign up to buy harvest-fresh produce directly from verified farmers."}
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* STEP 1: Basic Credentials */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="mt-7 space-y-4">
            {/* Preferred Language for Farmer */}
            {role === "farmer" && (
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-xs">
                <label className="block text-xs font-bold text-zinc-700">
                  Preferred Language / भाषा / భాష / ಭಾಷೆ
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2 text-xs font-bold">
                  {[
                    { code: "en", label: "English" },
                    { code: "hi", label: "हिन्दी" },
                    { code: "te", label: "తెలుగు" },
                    { code: "kn", label: "ಕನ್ನಡ" },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLang(l.code as AppLang)}
                      className={`rounded-xl py-2 text-center transition ${
                        lang === l.code
                          ? "bg-[#2f7a4a] text-white shadow-xs"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-700">Full Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Gowda"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#2f7a4a] focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-zinc-700">Mobile Number</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#2f7a4a] focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700">Email Address</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#2f7a4a] focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-zinc-700">Password</label>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#2f7a4a] focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700">Confirm Password</label>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#2f7a4a] focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f7a4a] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#26633c] hover:shadow-xl disabled:opacity-60"
            >
              {role === "farmer" ? (
                <>
                  Continue to Farm Details
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                busy ? "Creating Account..." : "Create Account"
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Farm Details (Farmer Only) */}
        {step === 2 && role === "farmer" && (
          <form onSubmit={finishRegistration} className="mt-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700">Farm / Land Name</label>
              <input
                required
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. Sri Lakshmi Venkateswara Farm"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#2f7a4a] focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700">Village / Town</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kundana, Devanahalli Hobli"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#2f7a4a] focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Quick Regional Presets */}
            <div>
              <label className="block text-xs font-bold text-zinc-700">Quick Region Presets</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REGIONAL_DISTRICTS.map((reg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDistrict(reg.district);
                      setState(reg.state);
                    }}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      district === reg.district
                        ? "border-[#2f7a4a] bg-[#e8f0e3] text-[#2f7a4a]"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {reg.district}, {reg.state}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-zinc-700">District</label>
                <input
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#2f7a4a] focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700">PIN Code</label>
                <input
                  required
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="e.g. 562110"
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#2f7a4a] focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* Crops Grown Selector */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
              <label className="block text-xs font-bold text-zinc-700">
                Primary Produce Grown (Select all that apply)
              </label>
              <p className="mt-1 text-[11px] text-zinc-500">
                This helps us recommend regional mandi prices and match buyers.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {POPULAR_CROPS.map((c) => {
                  const selected = selectedCrops.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCrop(c)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? "bg-[#2f7a4a] text-white shadow-xs"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="submit"
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2f7a4a] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#26633c] hover:shadow-xl disabled:opacity-60"
              >
                {busy ? "Opening Farm Desk..." : "Complete & Open Farm Desk"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-zinc-500">
          Already registered?{" "}
          <Link
            to={role === "farmer" ? "/login?next=/farmer/dashboard" : "/login"}
            className="font-bold text-[#2f7a4a] hover:underline"
          >
            Sign in to your account
          </Link>
        </p>
      </div>
    </div>
  );
}
