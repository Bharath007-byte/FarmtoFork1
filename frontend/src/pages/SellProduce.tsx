import { useEffect, useState, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Upload,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Award,
} from "lucide-react";
import { api, ApiError } from "../services/api";
import { CameraCaptureModal } from "../components/CameraCaptureModal";
import { useI18n } from "../i18n";
import { validateProduceImage, validateCropName } from "../utils/produceVerifier";

interface GradingResult {
  crop: {
    name: string;
    variety: string;
    category: string;
    categoryId: string | null;
  };
  grading: {
    grade: "GRADE_A" | "GRADE_B" | "GRADE_C";
    gradeLabel: string;
    qualityScore: number;
    colorUniformity: string;
    freshnessIndex: string;
    surfaceAnalysis: string;
    recommendation: string;
  };
  pricing: {
    mandiBenchmarkRupees: number;
    suggestedPriceRupees: number;
    suggestedPricePaise: number;
    unit: string;
  };
  imageQuality?: {
    fileSizeBytes: number;
    resolutionStatus: "LOW_RES" | "ACCEPTABLE" | "SHARP_HIGH_RES";
    isBlurOrLowRes: boolean;
    confidencePercent: number;
    warning: string | null;
  };
  imageUrl: string;
}

export function SellProduce() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [variety, setVariety] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [organic, setOrganic] = useState(false);
  const [description, setDescription] = useState("");
  const [minQty, setMinQty] = useState("0.1");
  const [maxQty, setMaxQty] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [marketHint, setMarketHint] = useState("");
  const [busy, setBusy] = useState(false);

  // AI Grading & Produce Verification state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [gradingBusy, setGradingBusy] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [farmerConfirmedGrade, setFarmerConfirmedGrade] = useState(false);
  const [gradingError, setGradingError] = useState("");
  const [isWrongImage, setIsWrongImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api<{ categories: { id: string; name: string }[] }>("/api/products/categories").then((d) => {
      setCategories(d.categories);
      setCategoryId(d.categories[0]?.id || "");
    });
    api<{ prices: { commodity: string; modalPaise: number; source: string }[]; disclaimer: string }>(
      "/api/market-prices"
    ).then((d) => {
      const t = d.prices.find((p) => p.commodity.toLowerCase() === "tomato") || d.prices[0];
      if (t) {
        setMarketHint(
          `${d.disclaimer}. ${t.commodity} modal ₹${t.modalPaise / 100}/kg (${t.source}).`
        );
      }
    });
  }, []);

  const runAiGrading = async (selectedFile: File) => {
    setGradingBusy(true);
    setGradingError("");
    setIsWrongImage(false);

    // 1. Client-Side Produce Verification (Detect human portraits, selfies, vehicles, non-crop items)
    const clientCheck = await validateProduceImage(selectedFile, lang);
    if (!clientCheck.isValid) {
      setFile(null);
      setPreviewUrl(null);
      setGradingResult(null);
      setGradingBusy(false);
      setIsWrongImage(true);
      setGradingError(
        clientCheck.error ||
          (lang === "te"
            ? "ఇది తప్పు చిత్రం. దయచేసి మీ పంట లేదా వ్యవసాయ ఉత్పత్తుల ఫోటోను మాత్రమే అప్‌లోడ్ చేయండి. మనుషుల ఫోటోలు లేదా ఇతర వస్తువులు అనుమతించబడవు."
            : "This is a wrong image. Please upload a clear photo of your farm produce/crop item. Human faces, selfies, or non-crop objects cannot be accepted.")
      );
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));

    const fd = new FormData();
    fd.append("image", selectedFile);
    if (name) fd.append("cropHint", name);

    try {
      const res = await api<GradingResult>("/api/ai/grade-produce", {
        method: "POST",
        body: fd,
      });

      setGradingResult(res);
      setFarmerConfirmedGrade(true);
      setGradingBusy(false);
      setIsWrongImage(false);

      // Auto-populate form with AI-verified data
      if (res.crop.name && !name) {
        setName(res.crop.name);
        setNameError("");
      }
      if (res.crop.variety && !variety) setVariety(res.crop.variety);
      if (res.pricing.suggestedPriceRupees) setPrice(String(res.pricing.suggestedPriceRupees));
      if (res.crop.categoryId) setCategoryId(res.crop.categoryId);

      const aiBadgeNote = `[AI Verified Quality: ${res.grading.gradeLabel} · Score: ${res.grading.qualityScore}% · Surface: ${res.grading.surfaceAnalysis}]`;
      setDescription((prev) => (prev ? `${prev}\n\n${aiBadgeNote}` : aiBadgeNote));
    } catch (err: any) {
      console.error("Grading failed:", err);
      setGradingBusy(false);
      setFile(null);
      setPreviewUrl(null);
      setGradingResult(null);
      setIsWrongImage(true);
      setGradingError(
        err instanceof ApiError
          ? err.message
          : (lang === "te"
            ? "ఇది తప్పు చిత్రం. దయచేసి నిజమైన పంట ఫోటోను అప్‌లోడ్ చేయండి. మనుషుల లేదా ఇతర వస్తువుల ఫోటోలు అనుమతించబడవు."
            : "This is a wrong image. Please upload a real farm produce photo. Human photos, selfies, or non-crop objects cannot be verified.")
      );
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Validate Crop Name
    const nameCheck = validateCropName(name, lang);
    if (!nameCheck.isValid) {
      setNameError(nameCheck.error || "");
      setError(nameCheck.error || "Please enter a valid crop name.");
      return;
    }

    // 2. Validate produce image if attached
    if (file) {
      const imgCheck = await validateProduceImage(file, lang);
      if (!imgCheck.isValid) {
        setIsWrongImage(true);
        setGradingError(imgCheck.error || "");
        setError(imgCheck.error || "Wrong image attached.");
        return;
      }
    }

    setBusy(true);

    const fd = new FormData();
    fd.append("name", name);
    fd.append("categoryId", categoryId);
    fd.append("variety", variety);
    fd.append("quantity", quantity);
    fd.append("unit", unit);
    fd.append("price", price);
    fd.append("harvestDate", harvestDate);
    fd.append("availableFrom", availableFrom);
    fd.append("organic", String(organic));
    fd.append("description", description);
    fd.append("minQty", minQty);
    fd.append("maxQty", maxQty);
    if (file) fd.append("image", file);

    try {
      const created = await api<{ product: { id: string } }>("/api/products", {
        method: "POST",
        body: fd,
      });
      setBusy(false);
      navigate(`/farmer/products/${created.product.id}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : "Could not save product");
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-16">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-zinc-900 md:text-4xl">Sell Fresh Produce</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload harvest lots with AI Quality Verification or enter details manually.
        </p>
        {marketHint && <p className="mt-2 text-xs font-semibold text-emerald-700">{marketHint}</p>}
      </div>

      {/* AI Produce Quality Scanner Banner (Slide 4 Feature) */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" /> AI Produce Scanner & Grading
            </span>
            <h2 className="mt-2 text-lg font-bold text-zinc-900">
              Instant Grade A / B / C Quality Verification
            </h2>
            <p className="mt-1 text-xs text-zinc-600">
              Snap a live camera photo of your crop. AI inspects freshness, skin uniformity, and benchmarks live APMC Mandi prices.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2f7a4a] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#26633c]"
            >
              <Camera className="h-4 w-4" />
              Live Camera
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) runAiGrading(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Loading Spinner during scan */}
        {gradingBusy && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <RefreshCw className="h-5 w-5 animate-spin text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-zinc-800">AI Vision Analyzing Crop...</p>
              <p className="text-[11px] text-zinc-500">
                Evaluating skin luster, blemish percentage, and calculating APMC Mandi benchmark price.
              </p>
            </div>
          </div>
        )}

        {/* Wrong Image Warning Alert */}
        {isWrongImage && (
          <div className="mt-4 rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-4 text-rose-900 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-600 shrink-0 mt-0.5">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-rose-900">
                  {lang === "te"
                    ? "తప్పు చిత్రం గుర్తించబడింది! (దయచేసి పంట ఫోటోను మాత్రమే అప్‌లోడ్ చేయండి)"
                    : lang === "hi"
                    ? "गलत तस्वीर पहचानी गई! (कृपया केवल फसल की वास्तविक तस्वीर अपलोड करें)"
                    : lang === "kn"
                    ? "ತಪ್ಪು ಚಿತ್ರ ಪತ್ತೆಯಾಗಿದೆ! (ದಯವಿಟ್ಟು ಕೃಷಿ ಬೆಳೆಯ ಫೋಟೋವನ್ನು ಮಾತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ)"
                    : "Wrong Image Detected! (Please upload farm produce item photo)"}
                </h4>
                <p className="mt-1 text-xs text-rose-700 leading-relaxed font-medium">
                  {gradingError ||
                    (lang === "te"
                      ? "మనుషుల ఫోటోలు, సెల్ఫీలు, వాహనాలు లేదా ఇతర వస్తువులు అనుమతించబడవు. దయచేసి టమోటాలు, ఉల్లిపాయలు, పచ్చిమిర్చి వంటి నిజమైన వ్యవసాయ పంట ఫోటోను అప్‌లోడ్ చేయండి."
                      : "Human faces, selfies, vehicles, or non-crop objects are not permitted. Please upload a clear photo of genuine agricultural produce (e.g. Tomatoes, Onions, Chillies, Rice, Fruits).")}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWrongImage(false);
                      setGradingError("");
                      setCameraOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer shadow-xs"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {lang === "te" ? "లైవ్ కెమెరాతో తీయండి" : "Scan with Live Camera"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWrongImage(false);
                      setGradingError("");
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {lang === "te" ? "వేరే పంట ఫోటో ఎంచుకోండి" : "Upload Genuine Crop Photo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Standard Grading Error */}
        {gradingError && !isWrongImage && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{gradingError}</span>
          </div>
        )}

        {/* AI Inspection Card Result */}
        {gradingResult && !gradingBusy && (
          <div className="mt-5 rounded-2xl border border-emerald-300 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Produce scan"
                    className="h-20 w-20 rounded-xl object-cover border border-zinc-200 shrink-0 shadow-sm"
                  />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wider ${
                        gradingResult.grading.grade === "GRADE_A"
                          ? "bg-emerald-100 text-emerald-800"
                          : gradingResult.grading.grade === "GRADE_B"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      <Award className="h-3.5 w-3.5" />
                      {gradingResult.grading.gradeLabel}
                    </span>
                    <span className="text-xs font-semibold text-zinc-500">
                      Score: {gradingResult.grading.qualityScore}/100
                    </span>
                    {gradingResult.imageQuality?.resolutionStatus === "SHARP_HIGH_RES" && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        ✓ Sharp Focus ({gradingResult.imageQuality.confidencePercent}% confidence)
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1 text-base font-bold text-zinc-900">
                    {gradingResult.crop.name} ({gradingResult.crop.variety})
                  </h3>
                  <p className="mt-1 text-xs text-zinc-600">
                    {gradingResult.grading.surfaceAnalysis}
                  </p>
                </div>
              </div>

              {/* Price comparison badge */}
              <div className="rounded-xl bg-zinc-50 p-3 text-right shrink-0">
                <p className="text-[11px] font-semibold text-zinc-500">Mandi Benchmark</p>
                <p className="text-sm font-bold text-zinc-700">₹{gradingResult.pricing.mandiBenchmarkRupees}/kg</p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Recommended
                </p>
                <p className="text-lg font-black text-emerald-800">
                  ₹{gradingResult.pricing.suggestedPriceRupees}/kg
                </p>
              </div>
            </div>

            {/* Quality Warning if resolution is low */}
            {gradingResult.imageQuality?.warning && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{gradingResult.imageQuality.warning}</span>
              </div>
            )}

            {/* Farmer Confirmation Checkbox */}
            <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <input
                type="checkbox"
                id="farmerVerifyCheck"
                checked={farmerConfirmedGrade}
                onChange={(e) => setFarmerConfirmedGrade(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="farmerVerifyCheck" className="text-xs font-semibold text-zinc-800 cursor-pointer">
                I verify that this produce lot matches <span className="font-bold text-emerald-900">{gradingResult.grading.gradeLabel}</span> at ₹{price || gradingResult.pricing.suggestedPriceRupees}/kg.
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Produce Form */}
      <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">Product Information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-700">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-700">
              {lang === "te" ? "పంట / ఉత్పత్తి పేరు *" : "Crop / Product Name *"}
            </label>
            <input
              required
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                if (val.trim()) {
                  const check = validateCropName(val, lang);
                  setNameError(check.isValid ? "" : (check.error || ""));
                } else {
                  setNameError("");
                }
              }}
              placeholder={lang === "te" ? "ఉదా: టమోటా, ఉల్లిపాయ, పచ్చిమిర్చి, వరి" : "e.g. Hybrid Tomato"}
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none ${
                nameError
                  ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-500"
                  : "border-zinc-300 bg-white focus:border-emerald-600"
              }`}
            />
            {nameError && (
              <p className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {nameError}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-700">Variety</label>
            <input
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="e.g. Vaishnavi / Nandi"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-700">Total Quantity *</label>
            <input
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="100"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-700">Unit *</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              {["kg", "quintal", "ton", "box", "dozen"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-700">Selling Price per Unit (₹) *</label>
            <input
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="35"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-emerald-800 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-700">Harvest Date</label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-700">Available From</label>
            <input
              type="date"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-700">Min Order Qty</label>
            <input
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
              placeholder="0.1"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-700">Max Order Qty (Optional)</label>
            <input
              value={maxQty}
              onChange={(e) => setMaxQty(e.target.value)}
              placeholder="Leave empty for no limit"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-zinc-700">Description & Quality Notes</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe harvest quality, storage advice, and certifications..."
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
          <input
            type="checkbox"
            checked={organic}
            onChange={(e) => setOrganic(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
          />
          Certified Organic Produce
        </label>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3">
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f7a4a] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#26633c] disabled:opacity-50"
          >
            {busy ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Saving Produce...
              </>
            ) : gradingResult && farmerConfirmedGrade ? (
              <>
                <ShieldCheck className="h-4 w-4" /> List Verified {gradingResult.grading.grade === "GRADE_A" ? "Grade A" : "Produce"} for Sale
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" /> List Produce for Sale
              </>
            )}
          </button>
        </div>
      </form>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(capturedFile) => {
          setCameraOpen(false);
          runAiGrading(capturedFile);
        }}
        title="Scan Produce Quality"
        isSelfie={false}
      />
    </div>
  );
}
