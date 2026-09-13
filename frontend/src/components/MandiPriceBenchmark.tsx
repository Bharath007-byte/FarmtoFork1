import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  MapPin,
  RefreshCw,
  AlertCircle,
  Zap,
} from "lucide-react";
import { api } from "../services/api";
import { useI18n, type AppLang } from "../i18n";

const cropNameTranslations: Record<string, Record<AppLang, string>> = {
  tomato: { en: "Tomato", te: "టమోటా", hi: "टमाटर", kn: "ಟೊಮ್ಯಾಟೊ" },
  onion: { en: "Onion", te: "ఉల్లిపాయ", hi: "प्याज", kn: "ಈರುಳ್ಳಿ" },
  potato: { en: "Potato", te: "బంగాళాదుంప", hi: "आलू", kn: "ಆಲೂಗಡ್ಡೆ" },
  chilli: { en: "Chilli", te: "పచ్చిమిర్చి", hi: "हरी मिर्च", kn: "ಹಸಿರು ಮೆಣಸಿನಕಾಯಿ" },
  mango: { en: "Mango", te: "మామిడి", hi: "आम", kn: "ಮಾವು" },
  paddy: { en: "Paddy", te: "వరి / ధాన్యం", hi: "धान / चावल", kn: "ಭತ್ತ / ಅಕ್ಕಿ" },
  wheat: { en: "Wheat", te: "గోధుమ", hi: "गेहूं", kn: "ಗೋಧಿ" },
  cotton: { en: "Cotton", te: "పత్తి", hi: "कपास", kn: "ಹತ್ತಿ" },
  mustard: { en: "Mustard", te: "ఆవాలు", hi: "सरसों", kn: "ಸಾಸಿವೆ" },
  ragi: { en: "Ragi", te: "రాగులు", hi: "रागी", kn: "ರಾಗಿ" },
};

interface Commodity {
  id: string;
  name: string;
  hindiName: string;
  category: string;
  unit: string;
  markets: { name: string; state: string; distanceKm: number }[];
  currentModalPaise: number;
  seasonPeakMonths: string[];
  seasonTroughMonths: string[];
  tenYearCagr: string;
}

interface PricePoint {
  date: string;
  modalPrice: number;
  arrivalsTonnes: number;
  minPrice: number;
  maxPrice: number;
}

interface ForecastPoint {
  date: string;
  expectedPrice: number;
  lowerBand: number;
  upperBand: number;
  projectedArrivals: number;
}

interface ForecastResponse {
  success: boolean;
  commodity: Commodity;
  selectedMarket: { name: string; state: string; distanceKm: number };
  currentPrice: number;
  trendDirection: string;
  percentChange: number;
  bestSellWindow: {
    recommendedDate: string;
    expectedPeakRate: number;
    windowStartDay: number;
    windowEndDay: number;
  };
  recommendation: string;
  confidenceScore: number;
  historicalData: PricePoint[];
  forecastData: ForecastPoint[];
  meta: {
    dataSource: string;
    method: string;
    generatedAt: string;
  };
}

export function MandiPriceBenchmark() {
  const { lang } = useI18n();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [selectedCrop, setSelectedCrop] = useState("tomato");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [days, setDays] = useState(15);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState("");

  // Load available commodities on mount
  useEffect(() => {
    api<{ success: boolean; commodities: Commodity[] }>("/api/mandi-forecast/commodities")
      .then((res) => {
        if (res?.commodities?.length) {
          setCommodities(res.commodities);
        }
      })
      .catch((err) => console.error("Commodities fetch err:", err));
  }, []);

  // Fetch forecast data whenever crop, market, or days change
  useEffect(() => {
    setLoading(true);
    setError("");
    const q = new URLSearchParams({
      commodity: selectedCrop,
      market: selectedMarket,
      days: String(days),
    }).toString();

    api<ForecastResponse>(`/api/mandi-forecast/predict?${q}`)
      .then((res) => {
        if (res?.success) {
          setData(res);
          if (!selectedMarket && res.selectedMarket?.name) {
            setSelectedMarket(res.selectedMarket.name);
          }
        } else {
          setError("Unable to compute forecast for this market.");
        }
      })
      .catch((err) => {
        console.error("Forecast error:", err);
        setError("Failed to fetch mandi predictive pricing. Try another commodity.");
      })
      .finally(() => setLoading(false));
  }, [selectedCrop, selectedMarket, days]);

  const activeCommodity = useMemo(() => {
    return commodities.find((c) => c.id === selectedCrop) || data?.commodity;
  }, [commodities, selectedCrop, data]);

  // Calculations for chart scaling
  const chartMetrics = useMemo(() => {
    if (!data) return null;
    const history = data.historicalData || [];
    const forecast = data.forecastData || [];
    const allPrices = [
      ...history.map((p) => p.modalPrice),
      ...forecast.map((p) => p.expectedPrice),
      ...forecast.map((p) => p.upperBand),
      ...forecast.map((p) => p.lowerBand),
    ];
    const minP = Math.max(0, Math.floor(Math.min(...allPrices) * 0.92));
    const maxP = Math.ceil(Math.max(...allPrices) * 1.08);
    const range = maxP - minP || 1;

    return { minP, maxP, range, history, forecast };
  }, [data]);

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-sm">
      {/* 1. Header with Live Status & AI Model Badge */}
      <div className="flex flex-col gap-4 border-b border-stone-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-3 py-1 text-xs font-bold text-[#1b4332]">
              <Zap className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />
              {lang === "te" ? "APMC మార్కెట్ AI విశ్లేషణ" : lang === "hi" ? "एपीएमसी मंडी एआई विश्लेषण" : lang === "kn" ? "APMC ಮಾರುಕಟ್ಟೆ AI ವಿಶ್ಲೇಷಣೆ" : "Agmarknet APMC AI Benchmark"}
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
              {lang === "te" ? "ప్రభుత్వ మార్కెట్ ధరల సమాచారం" : lang === "hi" ? "सरकारी मंडी लाइव डेटा" : lang === "kn" ? "ಸರ್ಕಾರಿ ಮಂಡಿ ದರ ಮಾಹಿತಿ" : "Government APMC Modal Feed"}
            </span>
          </div>
          <h2 className="mt-2.5 font-serif text-2xl sm:text-3xl font-bold text-[#1c2b22]">
            {lang === "te" ? "మార్కెట్ ధరల అంచనా & AI భవిష్యవాణి" : lang === "hi" ? "मंडी भाव विश्लेषण एवं एआई पूर्वानुमान" : lang === "kn" ? "ಮಂಡಿ ದರ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು AI ಮುನ್ಸೂಚನೆ" : "Mandi Price Benchmark & AI Forecast"}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-stone-500">
            {lang === "te"
              ? "మీ పంటను సరైన ధరకు విక్రయించడానికి మార్కెట్ విశ్లేషణ మరియు అత్యంత లాభదాయకమైన సమయం."
              : lang === "hi"
              ? "अपनी फसल को सही मूल्य पर बेचने के लिए वास्तविक समय का मंडी विश्लेषण।"
              : lang === "kn"
              ? "ನಿಮ್ಮ ಬೆಳೆಯನ್ನು ಉತ್ತಮ ದರಕ್ಕೆ ಮಾರಾಟ ಮಾಡಲು ಮಾರುಕಟ್ಟೆ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಲಾಭದಾಯಕ ಸಮಯ."
              : "Real-time modal trade benchmarks and predictive arrival intelligence to identify your most profitable sell window."}
          </p>
        </div>

        {/* Forecast Horizon Tabs */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-stone-100 p-1.5 self-start sm:self-center">
          {[7, 15, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                days === d
                  ? "bg-[#2f7a4a] text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {d} {lang === "te" ? "రోజులు" : lang === "hi" ? "दिन" : lang === "kn" ? "ದಿನಗಳು" : "Days"}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Commodity Selector Chips */}
      <div className="mt-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
          {lang === "te" ? "పంటను ఎంచుకోండి" : lang === "hi" ? "फसल चुनें" : lang === "kn" ? "ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Select Crop or Staple"}
        </label>
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {[
            { id: "tomato", name: "Tomato" },
            { id: "onion", name: "Onion" },
            { id: "potato", name: "Potato" },
            { id: "chilli", name: "Chilli" },
            { id: "mango", name: "Mango" },
            { id: "paddy", name: "Paddy" },
            { id: "wheat", name: "Wheat" },
            { id: "cotton", name: "Cotton" },
            { id: "mustard", name: "Mustard" },
            { id: "ragi", name: "Ragi" },
          ].map((crop) => (
            <button
              key={crop.id}
              onClick={() => {
                setSelectedCrop(crop.id);
                setSelectedMarket("");
              }}
              className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                selectedCrop === crop.id
                  ? "bg-[#1c2b22] text-white shadow-md ring-2 ring-emerald-500/50"
                  : "bg-stone-50 text-stone-700 border border-stone-200/80 hover:bg-stone-100"
              }`}
            >
              {cropNameTranslations[crop.id]?.[lang] || crop.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Market Dropdown & Current Price Strip */}
      {activeCommodity && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-stone-50 p-4 border border-stone-200/70">
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-semibold text-stone-600">APMC Mandi Yard:</span>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#1c2b22] border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {activeCommodity.markets?.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} ({m.state}) — {m.distanceKm} km away
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div>
              <span className="text-stone-500">Current Benchmark: </span>
              <span className="text-base text-[#1c2b22]">
                ₹{data?.currentPrice || Math.round(activeCommodity.currentModalPaise / 100)}{" "}
                <span className="text-xs font-normal text-stone-500">{activeCommodity.unit}</span>
              </span>
            </div>

            {data && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  data.trendDirection.includes("Bullish")
                    ? "bg-emerald-100 text-emerald-800"
                    : data.trendDirection.includes("Bearish")
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {data.trendDirection.includes("Bullish") ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {data.trendDirection}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Interactive Price Trajectory Graph */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-stone-50/70 border border-dashed border-stone-200 mt-6">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-stone-500">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            Computing APMC econometric forecast curves...
          </div>
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-xs text-rose-700 border border-rose-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : chartMetrics && data ? (
        <div className="mt-6">
          <div className="relative rounded-2xl bg-stone-900 p-5 text-white shadow-inner">
            {/* Graph Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-4">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-semibold text-stone-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Past 30 Days Modal (Actual)
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Next {days} Days AI Forecast
                </span>
                <span className="hidden sm:flex items-center gap-1.5 text-stone-400">
                  <span className="h-2 w-5 bg-amber-400/20 border border-amber-400/40 rounded-sm" />
                  90% Confidence Interval
                </span>
              </div>

              <span className="text-[11px] text-stone-400">
                Confidence: <strong className="text-emerald-400">{data.confidenceScore}%</strong>
              </span>
            </div>

            {/* SVG Chart */}
            <div className="relative h-60 w-full">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 800 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                {[0.2, 0.5, 0.8].map((fraction, i) => {
                  const y = 240 * fraction;
                  const val = Math.round(chartMetrics.maxP - fraction * chartMetrics.range);
                  return (
                    <g key={i}>
                      <line x1="0" y1={y} x2="800" y2={y} stroke="#334155" strokeDasharray="4 4" strokeWidth="1" opacity="0.4" />
                      <text x="5" y={y - 4} fill="#64748b" fontSize="10" fontFamily="sans-serif">
                        ₹{val}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Divider between Historical and Forecast */}
                <line x1="500" y1="0" x2="500" y2="240" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="1.5" opacity="0.6" />
                <text x="508" y="20" fill="#f59e0b" fontSize="10" fontWeight="bold">
                  Today (Forecast Split)
                </text>

                {/* History Curve */}
                {(() => {
                  const pts = chartMetrics.history.map((pt, i) => {
                    const x = (i / (chartMetrics.history.length - 1)) * 500;
                    const y = 240 - ((pt.modalPrice - chartMetrics.minP) / chartMetrics.range) * 220;
                    return { x, y };
                  });
                  const pathD = pts.reduce((acc, p, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
                  const areaD = `${pathD} L 500 240 L 0 240 Z`;
                  return (
                    <>
                      <path d={areaD} fill="url(#historyFill)" />
                      <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                    </>
                  );
                })()}

                {/* Forecast Upper and Lower Confidence Shaded Band */}
                {(() => {
                  const historyEndPrice = chartMetrics.history[chartMetrics.history.length - 1]?.modalPrice || chartMetrics.minP;
                  const startY = 240 - ((historyEndPrice - chartMetrics.minP) / chartMetrics.range) * 220;

                  const upperPts = chartMetrics.forecast.map((pt, i) => {
                    const x = 500 + ((i + 1) / chartMetrics.forecast.length) * 300;
                    const y = 240 - ((pt.upperBand - chartMetrics.minP) / chartMetrics.range) * 220;
                    return { x, y };
                  });

                  const lowerPts = chartMetrics.forecast.map((pt, i) => {
                    const x = 500 + ((i + 1) / chartMetrics.forecast.length) * 300;
                    const y = 240 - ((pt.lowerBand - chartMetrics.minP) / chartMetrics.range) * 220;
                    return { x, y };
                  });

                  const expectedPts = chartMetrics.forecast.map((pt, i) => {
                    const x = 500 + ((i + 1) / chartMetrics.forecast.length) * 300;
                    const y = 240 - ((pt.expectedPrice - chartMetrics.minP) / chartMetrics.range) * 220;
                    return { x, y };
                  });

                  const upperPath = upperPts.reduce((acc, p) => `${acc} L ${p.x} ${p.y}`, `M 500 ${startY}`);
                  const lowerRev = lowerPts.reverse().reduce((acc, p) => `${acc} L ${p.x} ${p.y}`, "");
                  const bandPath = `${upperPath} ${lowerRev} Z`;

                  const expectedPath = expectedPts.reduce((acc, p) => `${acc} L ${p.x} ${p.y}`, `M 500 ${startY}`);

                  return (
                    <>
                      <path d={bandPath} fill="url(#forecastFill)" opacity="0.6" />
                      <path d={expectedPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 2" />
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* 5. AI Decision Recommendation & Sell Window Card */}
          <div className="mt-6 grid gap-4 sm:grid-cols-12">
            {/* Recommendation Box */}
            <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-5 sm:col-span-8">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <span>AI Agronomist Sell Window Decision</span>
              </div>
              <h3 className="mt-2 text-base font-bold text-emerald-950">
                {data.recommendation}
              </h3>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-emerald-800">
                <span>
                  Predicted Peak Rate: <strong className="text-emerald-950 font-bold">₹{data.bestSellWindow.expectedPeakRate} {activeCommodity?.unit || "/kg"}</strong>
                </span>
                <span>·</span>
                <span>
                  Expected Window: <strong>Day {data.bestSellWindow.windowStartDay} to Day {data.bestSellWindow.windowEndDay}</strong>
                </span>
                <span>·</span>
                <span>
                  Optimal Date: <strong>{new Date(data.bestSellWindow.recommendedDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</strong>
                </span>
              </div>
            </div>

            {/* Direct Platform Premium Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-stone-50 p-5 sm:col-span-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Samruddhi Setu Direct Payout
                </span>
                <p className="mt-1 text-2xl font-serif font-bold text-[#1c2b22]">
                  ₹{Math.round(data.currentPrice * 1.15)}
                  <span className="text-xs font-normal text-stone-500"> {activeCommodity?.unit || "/kg"}</span>
                </p>
                <p className="mt-1 text-xs text-emerald-700 font-semibold">
                  +15% Direct Farmer Premium over APMC
                </p>
              </div>

              <div className="mt-4 border-t border-stone-200 pt-3 text-[11px] text-stone-500">
                Guaranteed zero mandi deduction, zero middleman commission.
              </div>
            </div>
          </div>

          {/* 6. Historical Seasonal Peak Insights */}
          <div className="mt-4 rounded-2xl bg-stone-50 p-4 border border-stone-200/70 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#2f7a4a] shrink-0" />
              <span>
                <strong>Seasonal Peak Months:</strong> {activeCommodity?.seasonPeakMonths?.join(", ") || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-stone-400">|</span>
              <span>
                <strong>Trough (Lowest Arrival) Months:</strong> {activeCommodity?.seasonTroughMonths?.join(", ") || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-stone-400">|</span>
              <span className="text-emerald-800 font-semibold">{activeCommodity?.tenYearCagr || ""}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
