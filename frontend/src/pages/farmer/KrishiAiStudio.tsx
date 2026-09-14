import { useState, useEffect } from "react";
import {
  Camera,
  CheckCircle2,
  Calendar,
  Layers,
  Droplets,
  RefreshCw,
  Sprout,
  Globe,
  AlertTriangle,
  Search,
} from "lucide-react";
import { api } from "../../services/api";
import { useI18n, SUPPORTED_LANGUAGES } from "../../i18n";
import { validateProduceImage } from "../../utils/produceVerifier";
import {
  KRISHI_TRANSLATIONS,
  translateParcel,
  translateNutritionStage,
} from "../../i18n/krishiTranslations";

interface OrganicCure {
  name: string;
  type: string;
  dosage: string;
  instructions: string;
  organicStoreBrand: string;
}

interface DiagnosisResult {
  crop: string;
  diseaseName: string;
  scientificPathogen: string;
  severity: "Mild" | "Moderate" | "Severe";
  confidenceScore: number;
  contagionRisk: string;
  keySymptomsIdentified: string[];
  favorableWeatherContext: string;
  curativeOrganicProtocol: OrganicCure[];
  longTermPrevention: string;
  kisanActionPlan: string[];
}

interface CalendarData {
  crop: string;
  season: string;
  sowingWindow: string;
  transplantingWindow: string;
  daysToMaturity: number;
  harvestWindow: string;
  soilTempRange: string;
  waterRequirementMm: number;
  recommendedVarieties: string[];
  criticalGrowthStages: { stage: string; daysAfterSowing: string; keyAction: string }[];
}

interface FarmPlanResult {
  acreage: number;
  primaryCrop: string;
  soilType: string;
  waterSource: string;
  parcels: {
    name: string;
    acres: number;
    purpose: string;
    irrigation: string;
  }[];
  inputRequirements: {
    organicManureFYMTons: number;
    jeevamrutMonthlyLiters: number;
    seedRequirementKg: number;
    dripLateralLengthKm: number;
    dailyWaterRequirementKL: number;
  };
  nutritionSchedule: {
    phase: string;
    timing: string;
    input: string;
  }[];
  financialProjections: {
    totalEstimatedYieldTonnes: number;
    totalProductionCostRupees: number;
    grossRevenueMandiRupees: number;
    directPlatformRevenueRupees: number;
    netFarmerProfitRupees: number;
    roiPercentage: number;
  };
}

export function KrishiAiStudio() {
  const { lang, setLang } = useI18n();
  const t = KRISHI_TRANSLATIONS[lang] || KRISHI_TRANSLATIONS.en;

  const [activeTab, setActiveTab] = useState<"doctor" | "calendar" | "planner">("planner");

  // --- TAB 1: DISEASE DOCTOR STATE ---
  const [doctorCrop, setDoctorCrop] = useState("tomato");
  const [symptomsText, setSymptomsText] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [doctorError, setDoctorError] = useState<string>("");
  const [isWrongImage, setIsWrongImage] = useState<boolean>(false);

  // --- TAB 2: CULTIVATION CALENDAR STATE ---
  const [calendarCrop, setCalendarCrop] = useState("tomato");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);

  // --- TAB 3: 1-50 ACRE PLANNER STATE ---
  const [acreage, setAcreage] = useState<number>(5);
  const [planCrop, setPlanCrop] = useState("Tomato");
  const [soilType, setSoilType] = useState("Red Sandy Loam");
  const [waterSource, setWaterSource] = useState("Borewell with Solar Drip");
  const [planLoading, setPlanLoading] = useState(false);
  const [farmPlan, setFarmPlan] = useState<FarmPlanResult | null>(null);

  // Initial load
  useEffect(() => {
    runDiagnosis("Early concentric circular rings on lower tomato leaves");
    loadCalendar("tomato");
    generateFarmPlan(5, "Tomato", "Red Sandy Loam", "Borewell with Solar Drip");
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDoctorError("");
    setIsWrongImage(false);

    // Validate if image is real agricultural plant/leaf
    const check = await validateProduceImage(file, lang, "leaf");
    if (!check.isValid) {
      setPhotoPreview(null);
      setDiagnosis(null);
      setIsWrongImage(true);
      setDoctorError(check.error || "Non-crop image detected. Please upload an agricultural crop or leaf photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(String(reader.result));
      setIsWrongImage(false);
      setDoctorError("");
      runDiagnosis("High-resolution leaf scan uploaded", check);
    };
    reader.readAsDataURL(file);
  };

  const runDiagnosis = (customQuery?: string, verifiedStatus?: any) => {
    if (isWrongImage) {
      return;
    }
    setDiagnosing(true);
    setDoctorError("");
    api<{ success: boolean; diagnosis?: DiagnosisResult; error?: string }>("/api/krishi-ai/diagnose", {
      method: "POST",
      body: JSON.stringify({
        crop: doctorCrop,
        symptomsDescription: customQuery || symptomsText || "Early blight spots on leaves",
        imageVerification: verifiedStatus || { isValid: true },
      }),
    })
      .then((res) => {
        if (res.success && res.diagnosis) {
          setDiagnosis(res.diagnosis);
          setIsWrongImage(false);
        } else if (res.error) {
          setDiagnosis(null);
          setIsWrongImage(true);
          setDoctorError(res.error);
        }
      })
      .catch((err) => {
        console.error("Diagnosis error:", err);
        setDoctorError("Diagnosis failed. Please verify crop photo and try again.");
      })
      .finally(() => setDiagnosing(false));
  };

  const loadCalendar = (crop: string) => {
    setCalendarLoading(true);
    api<{ success: boolean; calendar: CalendarData }>(`/api/krishi-ai/cultivation-calendar?crop=${crop}`)
      .then((res) => {
        if (res.success) setCalendarData(res.calendar);
      })
      .catch((err) => console.error("Calendar error:", err))
      .finally(() => setCalendarLoading(false));
  };

  const generateFarmPlan = (acres: number, crop: string, soil: string, water: string) => {
    setPlanLoading(true);
    api<{ success: boolean } & FarmPlanResult>("/api/krishi-ai/plan-farm", {
      method: "POST",
      body: JSON.stringify({
        acreage: Math.max(1, acres),
        primaryCrop: crop,
        soilType: soil,
        waterSource: water,
      }),
    })
      .then((res) => {
        if (res.success) setFarmPlan(res);
      })
      .catch((err) => console.error("Farm plan error:", err))
      .finally(() => setPlanLoading(false));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 font-sans">
      {/* 1. Header Banner & Language Selector Bar */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-[#1b4332]">
                <Sprout className="h-3.5 w-3.5 text-emerald-700" />
                {t.krishiAiAgronomist}
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs font-semibold text-stone-500">
                {t.organicProtocolSmartPlanner}
              </span>
            </div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              {t.studioTitle}
            </h1>
          </div>

          {/* Clean Language Selector */}
          <div className="flex items-center gap-1 rounded-2xl bg-stone-100 p-1 self-start sm:self-center border border-stone-200/80">
            <Globe className="ml-2 h-3.5 w-3.5 text-stone-500 shrink-0" />
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  lang === l.code
                    ? "bg-[#1b4332] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Minimalist Tab Bar */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
          <button
            onClick={() => setActiveTab("planner")}
            className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === "planner"
                ? "bg-[#1b4332] text-white shadow-sm"
                : "bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200/70"
            }`}
          >
            <Layers className="h-4 w-4" />
            {t.tabPlanner}
          </button>

          <button
            onClick={() => setActiveTab("doctor")}
            className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === "doctor"
                ? "bg-[#1b4332] text-white shadow-sm"
                : "bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200/70"
            }`}
          >
            <Camera className="h-4 w-4" />
            {t.tabDoctor}
          </button>

          <button
            onClick={() => {
              setActiveTab("calendar");
              loadCalendar(calendarCrop);
            }}
            className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === "calendar"
                ? "bg-[#1b4332] text-white shadow-sm"
                : "bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200/70"
            }`}
          >
            <Calendar className="h-4 w-4" />
            {t.tabCalendar}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 3 (PRIMARY): 1–50+ ACRE AGRICULTURAL MASTERPLANNER                     */}
      {/* ========================================================================= */}
      {activeTab === "planner" && (
        <div className="space-y-6">
          {/* Masterplanner Input Dashboard - Clean & Spacious */}
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-4 mb-5">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900">
                  {t.selectFarmland}
                </h3>
                <p className="text-xs text-stone-500">
                  {t.flexiblePlanning}
                </p>
              </div>

              {/* Direct Numeric Input Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-500">{t.selectedSize}</span>
                <div className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 border border-emerald-200 text-[#1b4332] font-serif font-bold text-lg">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={acreage}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      setAcreage(val);
                      generateFarmPlan(val, planCrop, soilType, waterSource);
                    }}
                    className="w-12 bg-transparent text-right font-bold text-emerald-950 focus:outline-none"
                  />
                  <span>{acreage === 1 ? t.acre : t.acres}</span>
                </div>
              </div>
            </div>

            {/* Quick Acreage Preset Buttons */}
            <div className="mb-5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
                {t.quickPresets}
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 5, 10, 20, 25, 30, 40, 50].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setAcreage(num);
                      generateFarmPlan(num, planCrop, soilType, waterSource);
                    }}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      acreage === num
                        ? "bg-[#2f7a4a] text-white shadow-xs"
                        : "bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    {num} {num === 1 ? t.acre : t.acres}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div className="mb-6">
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={acreage}
                onChange={(e) => {
                  const a = Number(e.target.value);
                  setAcreage(a);
                  generateFarmPlan(a, planCrop, soilType, waterSource);
                }}
                className="w-full accent-[#2f7a4a] cursor-pointer"
              />
              <div className="mt-1 flex justify-between text-[11px] font-semibold text-stone-400">
                <span>{t.smallholderLabel}</span>
                <span>{t.tenAcres}</span>
                <span>{t.twentyFiveAcres}</span>
                <span>{t.largeFarmLabel}</span>
              </div>
            </div>

            {/* Clean 3-Column Dropdowns */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5">
                  {t.primaryCrop}
                </label>
                <select
                  value={planCrop}
                  onChange={(e) => {
                    setPlanCrop(e.target.value);
                    generateFarmPlan(acreage, e.target.value, soilType, waterSource);
                  }}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Tomato">{t.cropTomato}</option>
                  <option value="Chilli">{t.cropChilli}</option>
                  <option value="Onion">{t.cropOnion}</option>
                  <option value="Paddy">{t.cropPaddy}</option>
                  <option value="Cotton">{t.cropCotton}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5">
                  {t.soilType}
                </label>
                <select
                  value={soilType}
                  onChange={(e) => {
                    setSoilType(e.target.value);
                    generateFarmPlan(acreage, planCrop, e.target.value, waterSource);
                  }}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Red Sandy Loam">{t.soilRedSandyLoam}</option>
                  <option value="Black Cotton Soil">{t.soilBlackCotton}</option>
                  <option value="Clay Loam">{t.soilClayLoam}</option>
                  <option value="Alluvial Soil">{t.soilAlluvial}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5">
                  {t.waterSource}
                </label>
                <select
                  value={waterSource}
                  onChange={(e) => {
                    setWaterSource(e.target.value);
                    generateFarmPlan(acreage, planCrop, soilType, e.target.value);
                  }}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Borewell with Solar Drip">{t.waterBorewellSolar}</option>
                  <option value="Canal Irrigation">{t.waterCanal}</option>
                  <option value="Open Well & Micro-Drip">{t.waterOpenWell}</option>
                  <option value="Rainfed Farm Pond">{t.waterRainfedPond}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Generated Farm Masterplan Results */}
          {planLoading ? (
            <div className="flex h-52 items-center justify-center rounded-3xl bg-white border border-stone-200">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-stone-500">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                {t.calculatingPlan}
              </div>
            </div>
          ) : farmPlan ? (
            <div className="space-y-6">
              {/* Financial & Yield Projection Strip - Clean Minimal Numbers */}
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
                  <span className="text-xs font-semibold text-stone-500">{t.projectedHarvest}</span>
                  <p className="mt-1.5 font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                    {farmPlan.financialProjections.totalEstimatedYieldTonnes}{" "}
                    <span className="text-xs font-normal text-stone-500">{t.tonnes}</span>
                  </p>
                  <span className="mt-1 text-[11px] text-emerald-700 font-semibold block">
                    {farmPlan.acreage} {farmPlan.acreage === 1 ? t.acre : t.acres} {t.totalAcreageSuffix}
                  </span>
                </div>

                <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
                  <span className="text-xs font-semibold text-stone-500">{t.estimatedCost}</span>
                  <p className="mt-1.5 font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                    ₹{(farmPlan.financialProjections.totalProductionCostRupees / 100000).toFixed(2)}{" "}
                    <span className="text-xs font-normal text-stone-500">{t.lakhs}</span>
                  </p>
                  <span className="mt-1 text-[11px] text-stone-400 block">
                    {t.costSubtext}
                  </span>
                </div>

                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-5 shadow-xs">
                  <span className="text-xs font-semibold text-emerald-900">{t.directMarketValue}</span>
                  <p className="mt-1.5 font-serif text-2xl sm:text-3xl font-bold text-[#1b4332]">
                    ₹{(farmPlan.financialProjections.directPlatformRevenueRupees / 100000).toFixed(2)}{" "}
                    <span className="text-xs font-normal text-emerald-800">{t.lakhs}</span>
                  </p>
                  <span className="mt-1 text-[11px] text-emerald-800 font-semibold block">
                    {t.directToConsumerBonus}
                  </span>
                </div>

                <div className="rounded-2xl border border-[#2f7a4a] bg-[#1b4332] p-5 text-white shadow-md">
                  <span className="text-xs font-semibold text-emerald-200">{t.netEstimatedProfit}</span>
                  <p className="mt-1.5 font-serif text-2xl sm:text-3xl font-bold text-white">
                    ₹{(farmPlan.financialProjections.netFarmerProfitRupees / 100000).toFixed(2)}{" "}
                    <span className="text-xs font-normal text-emerald-200">{t.lakhs}</span>
                  </p>
                  <span className="mt-1 text-[11px] text-amber-300 font-bold block">
                    {t.roiLabel} +{farmPlan.financialProjections.roiPercentage}%
                  </span>
                </div>
              </div>

              {/* Land Parcel Division Architecture - Spacious & Clean */}
              <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xs">
                <h3 className="font-serif text-lg font-bold text-stone-900 mb-3">
                  {t.landParcelBreakdown} ({farmPlan.acreage} {farmPlan.acreage === 1 ? t.acre : t.acres} {t.totalText})
                </h3>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {farmPlan.parcels.map((parcel, idx) => {
                    const tp = translateParcel(parcel.name, parcel.purpose, parcel.irrigation, lang);
                    return (
                      <div
                        key={idx}
                        className="flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                              {tp.name}
                            </h4>
                            <span className="rounded-full bg-[#2f7a4a] px-2.5 py-0.5 text-xs font-bold text-white">
                              {parcel.acres} {parcel.acres === 1 ? t.acre : t.acres}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                            {tp.purpose}
                          </p>
                        </div>

                        <div className="mt-3 border-t border-stone-200/70 pt-2.5 text-[11px] text-stone-500 flex items-center gap-1.5">
                          <Droplets className="h-3 w-3 text-blue-600 shrink-0" />
                          <span className="truncate">{tp.irrigation}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Input Quantities in 5 Clean Tiles */}
              <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xs">
                <h3 className="font-serif text-lg font-bold text-stone-900 mb-3">
                  {t.requiredInputsFor} {farmPlan.acreage} {farmPlan.acreage === 1 ? t.acre : t.acres})
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-center">
                  <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      {t.fymManure}
                    </span>
                    <p className="mt-1 font-serif text-xl font-bold text-stone-900">
                      {farmPlan.inputRequirements.organicManureFYMTons} <span className="text-xs font-normal">{t.tons}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      {t.jeevamrutMo}
                    </span>
                    <p className="mt-1 font-serif text-xl font-bold text-stone-900">
                      {farmPlan.inputRequirements.jeevamrutMonthlyLiters} <span className="text-xs font-normal">{t.litersAbbr}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      {t.certifiedSeed}
                    </span>
                    <p className="mt-1 font-serif text-xl font-bold text-stone-900">
                      {farmPlan.inputRequirements.seedRequirementKg} <span className="text-xs font-normal">{t.kgAbbr}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      {t.dripLateral}
                    </span>
                    <p className="mt-1 font-serif text-xl font-bold text-stone-900">
                      {farmPlan.inputRequirements.dripLateralLengthKm} <span className="text-xs font-normal">{t.kmAbbr}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      {t.waterBudget}
                    </span>
                    <p className="mt-1 font-serif text-xl font-bold text-stone-900">
                      {farmPlan.inputRequirements.dailyWaterRequirementKL} <span className="text-xs font-normal">{t.klPerDay}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 4-Stage Nutrition Plan */}
              <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xs">
                <h3 className="font-serif text-lg font-bold text-stone-900 mb-3">
                  {t.organicNutritionSchedule}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {farmPlan.nutritionSchedule.map((stage, idx) => {
                    const tn = translateNutritionStage(stage.phase, stage.timing, stage.input, lang);
                    return (
                      <div key={idx} className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#2f7a4a]">{tn.phase}</span>
                          <span className="text-[10px] font-semibold text-stone-400">{tn.timing}</span>
                        </div>
                        <p className="mt-1 text-xs text-stone-700 leading-relaxed">
                          {tn.input}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CROP DOCTOR & LEAF DISEASE DIAGNOSIS                               */}
      {/* ========================================================================= */}
      {activeTab === "doctor" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xs">
            <div className="grid gap-6 lg:grid-cols-12 items-center">
              {/* Photo Area */}
              <div className="lg:col-span-5">
                <label className="block text-xs font-bold text-stone-600 mb-2">
                  {t.leafCropPhoto}
                </label>
                <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300/80 bg-emerald-50/40 p-5 text-center">
                  {photoPreview ? (
                    <div className="relative w-full">
                      <img
                        src={photoPreview}
                        alt="Scanned leaf"
                        className="h-44 w-full rounded-xl object-cover shadow-xs"
                      />
                      <button
                        onClick={() => setPhotoPreview(null)}
                        className="absolute top-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white cursor-pointer"
                      >
                        {t.changePhoto}
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center cursor-pointer">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                        <Camera className="h-5 w-5" />
                      </div>
                      <p className="mt-2.5 text-xs font-bold text-stone-900">
                        {t.clickToUpload}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Rejection Alert Banner */}
                {doctorError && (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800 shadow-xs flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-900 leading-snug">{doctorError}</p>
                      <p className="mt-1 text-[11px] text-rose-700 leading-normal">
                        To maintain agricultural accuracy, human faces, pets, vehicles, screens, and domestic items are strictly blocked.
                      </p>
                    </div>
                  </div>
                )}

                {/* Demo samples */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-stone-400 self-center">{t.samplesLabel}</span>
                  {[
                    { label: t.sampleTomatoBlight, crop: "tomato", query: "Tomato leaf concentric brown target spots" },
                    { label: t.sampleTomatoCurl, crop: "tomato", query: "Severe upward curling with whitefly" },
                    { label: t.sampleChilliAnthracnose, crop: "chilli", query: "Sunken dark rot circular spots on chilli" },
                  ].map((sample, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setDoctorCrop(sample.crop);
                        setSymptomsText(sample.query);
                        setDoctorError("");
                        setIsWrongImage(false);
                        runDiagnosis(sample.query, { isValid: true });
                      }}
                      className="rounded-lg bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-700 hover:bg-emerald-100 hover:text-emerald-800 transition cursor-pointer"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Area */}
              <div className="lg:col-span-7 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    {t.primaryCrop}
                  </label>
                  <select
                    value={doctorCrop}
                    onChange={(e) => {
                      setDoctorCrop(e.target.value);
                      if (!isWrongImage) runDiagnosis();
                    }}
                    className="w-full rounded-2xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="tomato">{t.cropTomato}</option>
                    <option value="chilli">{t.cropChilli}</option>
                    <option value="onion">{t.cropOnion}</option>
                    <option value="paddy">{t.cropPaddy}</option>
                    <option value="cotton">{t.cropCotton}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    {t.describeSymptoms}
                  </label>
                  <textarea
                    value={symptomsText}
                    onChange={(e) => {
                      setSymptomsText(e.target.value);
                      if (doctorError) setDoctorError("");
                    }}
                    placeholder={t.symptomsPlaceholder}
                    rows={2}
                    className="w-full rounded-2xl border border-stone-300 bg-white p-3 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  onClick={() => runDiagnosis()}
                  disabled={diagnosing || isWrongImage}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1b4332] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#245e38] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {diagnosing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      {t.analyzingText}
                    </>
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5" />
                      {t.diagnoseBtn}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Rejection / Warning Notice when image is not agricultural */}
          {doctorError && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 sm:p-7 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                    Scan Rejected · Non-Agricultural Image
                  </span>
                  <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold text-rose-950">
                    {doctorError}
                  </h2>
                  <p className="mt-2 text-xs text-rose-800 leading-relaxed max-w-2xl">
                    Krishi AI Doctor's neural model strictly evaluates foliar plant pathology, crop blights, and agricultural leaf symptoms. Selfies, human portraits, household pets, vehicles, and electronics are blocked from diagnosis.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-900 border border-rose-200">
                      Step 1: Capture clear, centered photo of crop leaf
                    </span>
                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-900 border border-rose-200">
                      Step 2: Ensure daylight or bright natural illumination
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Diagnosis Results */}
          {!doctorError && diagnosis && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-emerald-300/80 bg-white p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      {t.detectedLabel} ({diagnosis.crop})
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                      {diagnosis.diseaseName}
                    </h2>
                    <p className="text-xs text-stone-500 italic">
                      {diagnosis.scientificPathogen}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                        diagnosis.severity === "Severe"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {diagnosis.severity === "Severe"
                        ? t.severeSeverity
                        : diagnosis.severity === "Moderate"
                        ? t.moderateSeverity
                        : t.mildSeverity}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                      {diagnosis.confidenceScore}% {t.matchText}
                    </span>
                  </div>
                </div>

                {/* Prescribed Organic Cures */}
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-stone-700 mb-3">
                    {t.prescribedTreatments}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {diagnosis.curativeOrganicProtocol.map((cure, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5 text-xs"
                      >
                        <div>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                            {cure.type}
                          </span>
                          <h4 className="mt-2 font-bold text-stone-900">{cure.name}</h4>
                          <p className="mt-1 text-stone-600 leading-snug">
                            <strong>{t.doseLabel}</strong> {cure.dosage}
                          </p>
                        </div>
                        <div className="mt-2.5 border-t border-stone-200 pt-2 text-[10px] font-semibold text-emerald-900">
                          {cure.organicStoreBrand}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WHEN TO CULTIVATE (SOWING CALENDAR)                                 */}
      {/* ========================================================================= */}
      {activeTab === "calendar" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs">
            <label className="block text-xs font-bold text-stone-600 mb-2">
              {t.primaryCrop}
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "tomato", name: t.cropTomato },
                { id: "onion", name: t.cropOnion },
                { id: "paddy", name: t.cropPaddy },
                { id: "chilli", name: t.cropChilli },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCalendarCrop(c.id);
                    loadCalendar(c.id);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    calendarCrop === c.id
                      ? "bg-[#2f7a4a] text-white shadow-xs"
                      : "bg-stone-50 text-stone-700 border border-stone-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {calendarLoading ? (
            <div className="flex h-52 items-center justify-center rounded-3xl bg-white border border-stone-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                {t.loadingCalendar}
              </div>
            </div>
          ) : calendarData ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs">
                <div className="border-b border-stone-100 pb-3">
                  <h2 className="font-serif text-xl font-bold text-stone-900">
                    {calendarData.crop}
                  </h2>
                  <p className="text-xs text-stone-500">
                    {t.seasonLabel} <strong>{calendarData.season}</strong> · {t.maturityLabel} <strong>{calendarData.daysToMaturity} {t.daysText}</strong>
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60">
                    <span className="text-[10px] font-bold text-stone-400 uppercase">{t.sowingWindow}</span>
                    <p className="mt-1 font-bold text-stone-900">{calendarData.sowingWindow}</p>
                  </div>

                  <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60">
                    <span className="text-[10px] font-bold text-stone-400 uppercase">{t.transplantingWindow}</span>
                    <p className="mt-1 font-bold text-stone-900">{calendarData.transplantingWindow}</p>
                  </div>

                  <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60">
                    <span className="text-[10px] font-bold text-stone-400 uppercase">{t.harvestingWindow}</span>
                    <p className="mt-1 font-bold text-stone-900">{calendarData.harvestWindow}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs font-bold text-stone-700 mb-2">{t.lifecycleMilestones}</h4>
                  <div className="space-y-2">
                    {calendarData.criticalGrowthStages.map((st, i) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-xl bg-stone-50 p-2.5 border border-stone-200/60 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <strong>{st.stage} ({st.daysAfterSowing}):</strong> {st.keyAction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
