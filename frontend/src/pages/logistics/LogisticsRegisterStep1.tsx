import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bike, Truck, ShieldCheck, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { SiteNav } from "../../components/SiteNav";
import { LogisticsStepIndicator } from "../../components/LogisticsStepIndicator";
import { api, ApiError } from "../../services/api";
import { useApp } from "../../context/AppState";

export function LogisticsRegisterStep1() {
  const navigate = useNavigate();
  const { user } = useApp();

  // Personal Information
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("male");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");

  // Emergency Information
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");

  // Worker Type (BIKE or LARGE_TRUCK)
  const [workerType, setWorkerType] = useState<"BIKE" | "LARGE_TRUCK">("BIKE");

  // Consents
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!termsAccepted || !consentAccepted) {
      setError("Please accept the terms and document verification consent to proceed.");
      return;
    }

    if (!/^\+?[0-9]{10,14}$/.test(phone.replace(/\s+/g, ""))) {
      setError("Please enter a valid 10-digit mobile phone number.");
      return;
    }

    if (!/^[0-9]{6}$/.test(pinCode.trim())) {
      setError("Please enter a valid 6-digit postal PIN code.");
      return;
    }

    setBusy(true);

    try {
      const res = await api<{ token: string; user: any; nextStep: string }>(
        "/api/logistics/register",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            phone,
            password: password || undefined,
            confirmPassword: confirmPassword || undefined,
            dateOfBirth,
            gender,
            address,
            district,
            city,
            state,
            pinCode,
            emergencyName,
            emergencyPhone,
            emergencyRelation,
            workerType,
            termsAccepted,
            consentAccepted,
          }),
        }
      );

      if (res.token) {
        localStorage.setItem("f2f-token", res.token);
        localStorage.setItem("f2f-session", JSON.stringify(res.user));
      }

      setBusy(false);
      navigate(res.nextStep || "/logistics/register/documents");
    } catch (err: any) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : err.message || "Registration failed. Please check your inputs.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900">
      <SiteNav />
      <div className="pt-20">
        <LogisticsStepIndicator currentStep={1} />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Header Title */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> Logistics Partner Onboarding
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Personal & Logistics Registration
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Join Farm2Fork's delivery network. Complete registration to transport fresh produce directly from farms and societies to consumers.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Unable to proceed</p>
              <p className="mt-0.5 text-xs text-rose-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Logistics Worker Type */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900">1. Select Worker Type</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Choose your operational category. Vehicle requirements and documents will adapt to this choice.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {/* Card 1: Delivery Agent */}
              <button
                type="button"
                onClick={() => setWorkerType("BIKE")}
                className={`flex flex-col items-start rounded-2xl border-2 p-5 text-left transition-all ${
                  workerType === "BIKE"
                    ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      workerType === "BIKE"
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    <Bike className="h-6 w-6" />
                  </div>
                  {workerType === "BIKE" && (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
                <h3 className="mt-4 text-base font-bold text-zinc-900">DELIVERY AGENT</h3>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  Bike / Scooter / Small Vehicle
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  Deliver quick batch orders (below 50 kg) from local societies or directly from nearby farms to consumer doorsteps.
                </p>
              </button>

              {/* Card 2: Large Transport */}
              <button
                type="button"
                onClick={() => setWorkerType("LARGE_TRUCK")}
                className={`flex flex-col items-start rounded-2xl border-2 p-5 text-left transition-all ${
                  workerType === "LARGE_TRUCK"
                    ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      workerType === "LARGE_TRUCK"
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    <Truck className="h-6 w-6" />
                  </div>
                  {workerType === "LARGE_TRUCK" && (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
                <h3 className="mt-4 text-base font-bold text-zinc-900">LARGE TRANSPORT</h3>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  Truck / Bulk Agricultural Transport
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                  Transport bulk agricultural produce (50 kg to several tons) between cooperative societies, central warehouses, and distributors.
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Personal Information */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900">2. Personal Information</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Provide your official details as they appear on your government-issued identity cards.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-zinc-700">Full Name *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Email Address *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Mobile Number *</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit phone number"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Date of Birth *</label>
                <input
                  required
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-zinc-700">Street Address *</label>
                <input
                  required
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House number, Street, Landmark"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">City / Town *</label>
                <input
                  required
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">District *</label>
                <input
                  required
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="District"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">State *</label>
                <input
                  required
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">PIN Code *</label>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="6-digit PIN code"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {!user && (
                <>
                  <div>
                    <label className="text-xs font-bold text-zinc-700">Password (min 8 chars) *</label>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700">Confirm Password *</label>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 3: Emergency Information */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900">3. Emergency Contact</h2>
            <p className="mt-1 text-xs text-zinc-500">
              For your safety during active transit and logistics assignments.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-zinc-700">Contact Name *</label>
                <input
                  required
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Contact person"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Emergency Phone *</label>
                <input
                  required
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Relationship *</label>
                <input
                  required
                  type="text"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  placeholder="e.g. Parent, Spouse, Sibling"
                  className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Terms & Verification Consent */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900">4. Agreements & Verification Consent</h2>
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-zinc-600">
                  I agree to Farm2Fork's Logistics Partner Terms & Conditions, safety regulations, and operational code of conduct.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-zinc-600">
                  I give explicit consent for Farm2Fork administrators to review and verify my driving licence and vehicle documents for background verification.
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
            <p className="text-xs text-zinc-500">
              Already registered?{" "}
              <Link to="/login?next=/logistics" className="font-bold text-emerald-700 hover:underline">
                Sign in to your account
              </Link>
            </p>

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-50 sm:w-auto"
            >
              {busy ? (
                "Submitting details..."
              ) : (
                <>
                  Continue to Step 2: Upload Documents <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
