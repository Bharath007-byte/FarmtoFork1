import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Camera,
  Package,
  Truck,
  Wallet,
  ArrowRight,
  TrendingUp,
  Sprout,
  Stethoscope,
  Layers,
  Building2,
  CheckCircle2,
  MessageSquare,
  UserCircle,
  MapPin,
  Droplets,
  LandPlot,
  Award,
  Phone,
  CreditCard,
  Check,
  UploadCloud,
} from "lucide-react";
import { useApp } from "../context/AppState";
import { api, ApiError, rupees, mediaUrl } from "../services/api";
import { useRealtime } from "../hooks/useRealtime";
import { FarmerVoiceAssistant } from "../components/FarmerVoiceAssistant";
import { MandiPriceBenchmark } from "../components/MandiPriceBenchmark";

type Stats = {
  todaySalesPaise: number;
  totalEarningsPaise: number;
  pendingEarningsPaise?: number;
  pendingOrders: number;
  completedOrders: number;
  activeProducts: number;
  availableInventory: number;
};

type RecentItem = {
  orderId: string;
  product: string;
  qty: number;
  amountPaise: number;
  status: string;
  createdAt: string;
};

export function FarmerDashboard() {
  const { user } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downsideFileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Farmer Profile & Land Details state:
  const [profilePhoto, setProfilePhoto] = useState<string>(user?.photoUrl || "");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [farmerName, setFarmerName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [district, setDistrict] = useState("Tirupati");
  const [stateName, setStateName] = useState("Andhra Pradesh");
  const [pinCode, setPinCode] = useState("");

  // Detailed agronomic & land inputs from farmer:
  const [landSizeAcres, setLandSizeAcres] = useState("5.0");
  const [soilType, setSoilType] = useState("Red Sandy Loam");
  const [irrigationSource, setIrrigationSource] = useState("Borewell + Drip Irrigation");
  const [farmingType, setFarmingType] = useState("100% Certified Organic");
  const [experienceYears, setExperienceYears] = useState("12 Years");
  const [mandiRegNo, setMandiRegNo] = useState("APMC-TPT-2024-8891");
  const [primaryCrops, setPrimaryCrops] = useState("Tomatoes, Banganapalli Mangoes, Methi, Chilli, Ragi");
  const [payoutUpi, setPayoutUpi] = useState("farmer@okhdfcbank");
  const [storageFacility, setStorageFacility] = useState("On-farm ventilated shed");
  const [bio, setBio] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setProfilePhoto(previewUrl);

    try {
      setPhotoUploading(true);
      const fd = new FormData();
      fd.append("photo", file);
      const res = await api<{ photoUrl: string }>("/api/farmers/me/photo", {
        method: "POST",
        body: fd,
      });
      if (res?.photoUrl) {
        setProfilePhoto(res.photoUrl);
        try {
          const session = JSON.parse(localStorage.getItem("f2f-session") || "null");
          if (session) {
            session.photoUrl = res.photoUrl;
            localStorage.setItem("f2f-session", JSON.stringify(session));
          }
        } catch {}
      }
      setSaveMessage("Profile photo updated successfully!");
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err) {
      console.error("Photo upload error:", err);
      // Fallback: Data URL
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setProfilePhoto(base64);
        await api("/api/farmers/me", {
          method: "PUT",
          body: JSON.stringify({ photoUrl: base64 }),
        }).catch(() => {});
        setSaveMessage("Profile photo updated!");
        setTimeout(() => setSaveMessage(""), 4000);
      };
      reader.readAsDataURL(file);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveMessage("");
    try {
      const detailsPayload = JSON.stringify({
        landSizeAcres,
        soilType,
        irrigationSource,
        farmingType,
        experienceYears,
        mandiRegNo,
        primaryCrops,
        payoutUpi,
        storageFacility,
        bio,
      });

      await api("/api/farmers/me", {
        method: "PUT",
        body: JSON.stringify({
          name: farmerName,
          phone,
          farmName,
          location,
          district,
          state: stateName,
          pinCode,
          photoUrl: profilePhoto,
          details: detailsPayload,
        }),
      });

      setSaveMessage("Farm profile and agricultural data saved successfully!");
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err: any) {
      console.error(err);
      setSaveMessage(err?.message || "Failed to save profile. Please check connection.");
    } finally {
      setSavingProfile(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api<Stats>("/api/farmers/me/stats"),
      api<{ rows: RecentItem[] }>("/api/farmers/me/earnings").catch(() => ({ rows: [] })),
      api<{
        user: {
          name: string;
          phone?: string;
          email?: string;
          photoUrl?: string;
          farmer?: {
            farmName?: string;
            location?: string;
            district?: string;
            state?: string;
            pinCode?: string;
            details?: string;
          };
        };
      }>("/api/farmers/me").catch(() => null),
    ])
      .then(([s, earn, farmerData]) => {
        setStats(s);
        setRecentItems(earn.rows?.slice(0, 4) || []);
        if (farmerData?.user) {
          if (farmerData.user.name) setFarmerName(farmerData.user.name);
          if (farmerData.user.phone) setPhone(farmerData.user.phone);
          if (farmerData.user.email) setEmail(farmerData.user.email);
          if (farmerData.user.photoUrl) setProfilePhoto(farmerData.user.photoUrl);
          if (farmerData.user.farmer) {
            const f = farmerData.user.farmer;
            if (f.farmName) setFarmName(f.farmName);
            if (f.location) setLocation(f.location);
            if (f.district) setDistrict(f.district);
            if (f.state) setStateName(f.state);
            if (f.pinCode) setPinCode(f.pinCode);
            if (f.details) {
              try {
                const extra = JSON.parse(f.details);
                if (extra.landSizeAcres) setLandSizeAcres(extra.landSizeAcres);
                if (extra.soilType) setSoilType(extra.soilType);
                if (extra.irrigationSource) setIrrigationSource(extra.irrigationSource);
                if (extra.farmingType) setFarmingType(extra.farmingType);
                if (extra.experienceYears) setExperienceYears(extra.experienceYears);
                if (extra.mandiRegNo) setMandiRegNo(extra.mandiRegNo);
                if (extra.primaryCrops) setPrimaryCrops(extra.primaryCrops);
                if (extra.payoutUpi) setPayoutUpi(extra.payoutUpi);
                if (extra.storageFacility) setStorageFacility(extra.storageFacility);
                if (extra.bio) setBio(extra.bio);
              } catch {
                setBio(f.details);
              }
            }
          }
        }
        setError("");
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Unable to load dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime(
    ["ORDER_CREATED", "PAYMENT_CONFIRMED", "INVENTORY_UPDATED", "ORDER_STATUS_CHANGED"],
    load
  );

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col justify-between gap-6 rounded-3xl border border-zinc-200/70 bg-white p-6 sm:p-7 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-start gap-4 sm:gap-5">
          {/* Farmer Profile Avatar with Photo Upload */}
          <div className="relative group shrink-0">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-emerald-600/30 bg-emerald-50 flex items-center justify-center shadow-xs">
              {profilePhoto ? (
                <img
                  src={mediaUrl(profilePhoto)}
                  alt={farmerName || "Farmer Profile"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-emerald-800">
                  <Sprout className="h-8 w-8 text-emerald-700" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800/80">Kisaan</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload / Change Profile Photo"
              className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-xl bg-[#1b4332] text-white shadow-md transition hover:bg-[#245e38] hover:scale-105"
            >
              {photoUploading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-900">
                <Sprout className="h-3.5 w-3.5 text-zinc-800 shrink-0" />
                Verified Farmer
              </span>
              <span className="text-zinc-300 select-none">·</span>
              <span className="font-normal text-zinc-500">
                Samruddhi Setu Network
              </span>
              {district && (
                <>
                  <span className="text-zinc-300 select-none">·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                    <MapPin className="h-3 w-3 text-emerald-600" />
                    {district}
                  </span>
                </>
              )}
            </div>

            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Namaste{farmerName || user?.name ? `, ${farmerName || user?.name}` : ""}
            </h1>
            <p className="mt-1 max-w-xl text-xs sm:text-sm leading-relaxed text-zinc-500">
              Welcome to your digital farm desk. Live harvest rates, consumer orders, and logistics updates.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Link
            to="/farmer/krishi-ai"
            className="flex items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-xs transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            <Stethoscope className="h-4 w-4 text-zinc-600" />
            Krishi Crop Doctor & Planner
          </Link>

          <Link
            to="/farmer/twin"
            className="flex items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-xs transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            <Activity className="h-4 w-4 text-zinc-600" />
            Farm Field Simulator
          </Link>

          <Link
            to="/farmer/sell"
            className="flex items-center gap-2 rounded-2xl bg-[#1b4332] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245e38]"
          >
            <Camera className="h-4 w-4" />
            Sell Crop
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm font-medium text-zinc-500">Loading farm numbers…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* 2. Primary Hero Card: Sell Produce with Quality Grading */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-[#1b4332] via-[#245e38] to-[#1e4a30] p-6 text-white shadow-lg sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-100 border border-emerald-400/30 backdrop-blur-md">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
            Harvest Quality & Mandi Grade Verification
          </span>

          <h2 className="mt-4 font-serif text-2xl font-bold leading-tight sm:text-3xl">
            Sell Produce & Get Fair APMC Mandi Grade A/B/C
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed text-emerald-50/90 sm:text-base">
            Upload a photo of your freshly harvested crops. Our camera scanner checks surface quality, freshness, and suggests fair APMC mandi prices before listing.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/farmer/sell"
              className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-[#1b4332] shadow-md transition hover:bg-emerald-50"
            >
              <Camera className="h-4 w-4 text-[#1b4332]" />
              Scan & Sell Now
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/farmer/cooperative"
              className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <Building2 className="h-4 w-4 text-emerald-200" />
              Pool to Society Hub (100kg+)
            </Link>

            <Link
              to="/farmer/produce"
              className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              View My Produce
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Core Numbers: 4 Clear Metric Tiles */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Today's Sales"
            value={rupees(stats.todaySalesPaise)}
            hint="Gross orders received today"
            icon={<TrendingUp className="h-5 w-5 text-[#1b4332]" />}
            color="emerald"
          />
          <MetricTile
            label="Total Earnings"
            value={rupees(stats.totalEarningsPaise)}
            hint="Net earnings settled to bank"
            icon={<Wallet className="h-5 w-5 text-amber-700" />}
            color="amber"
          />
          <MetricTile
            label="Pending Orders"
            value={String(stats.pendingOrders)}
            hint="Orders waiting for pickup"
            icon={<Package className="h-5 w-5 text-[#2d6a4f]" />}
            color="blue"
          />
          <MetricTile
            label="Active Inventory"
            value={`${stats.availableInventory} kg`}
            hint={`${stats.activeProducts} crops active in catalog`}
            icon={<Layers className="h-5 w-5 text-[#1b4332]" />}
            color="purple"
          />
        </div>
      )}

      {/* 4. Kisan Multilingual Voice Assistant (Small/Medium Toggleable) */}
      <FarmerVoiceAssistant embedded={true} initialMode="medium" />

      {/* 5. Live Orders & Packing Feed */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-zinc-900">Recent Consumer & Society Orders</h2>
            <p className="text-xs text-zinc-500">Live order items assigned to your farm</p>
          </div>
          <Link
            to="/farmer/orders"
            className="flex items-center gap-1 text-xs font-bold text-[#2f7a4a] hover:underline"
          >
            All Orders
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
              <Package className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-zinc-700">No active orders right now</p>
            <p className="mt-1 text-xs text-zinc-500">
              When consumers in Bengaluru or local cooperative societies buy your produce, orders will show up here.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-zinc-100">
            {recentItems.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#2f7a4a]">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{item.product}</p>
                    <p className="text-xs text-zinc-500">
                      Quantity: {item.qty} · Order #{item.orderId.slice(-6).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-900">{rupees(item.amountPaise)}</p>
                  <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Quick Action Navigation Hub */}
      <div>
        <h2 className="mb-4 font-serif text-xl font-bold text-zinc-900">Farm Desk Tools</h2>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <ToolCard
            to="/farmer/krishi-ai"
            icon={<Stethoscope className="h-5 w-5 text-[#1b4332]" />}
            title="Krishi Crop Doctor & Planner"
            desc="Leaf disease diagnosis, organic cures, sowing windows & 10-50 acre plan"
          />
          <ToolCard
            to="/farmer/produce"
            icon={<Package className="h-5 w-5 text-[#1b4332]" />}
            title="My Produce Catalog"
            desc="Update prices, varieties, and stock quantity"
          />
          <ToolCard
            to="/farmer/orders"
            icon={<Truck className="h-5 w-5 text-[#2d6a4f]" />}
            title="Orders & Logistics"
            desc="Track pickup trucks and delivery progress"
          />
          <ToolCard
            to="/farmer/earnings"
            icon={<Wallet className="h-5 w-5 text-amber-700" />}
            title="Earnings & Payouts"
            desc="Settled balances and payment breakdown"
          />
          <ToolCard
            to="/farmer/advisory"
            icon={<MessageSquare className="h-5 w-5 text-[#1b4332]" />}
            title="Kisan Farm Advisory"
            desc="Crop care, weather alerts, and soil nutrition"
          />
          <ToolCard
            to="/farmer/cooperative"
            icon={<Building2 className="h-5 w-5 text-[#1b4332]" />}
            title="Cooperative Society Hubs"
            desc="Devanahalli, Yelahanka, and Tirupati bulk supply"
          />
        </div>
      </div>

      {/* 7. Mandi Price Benchmark & Predictive Forecasting System */}
      <MandiPriceBenchmark />

      {/* 8. Farmer Profile, Identity & Land Records (రైతు వివరాలు & క్షేత్ర సమాచారం) */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-100 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                <UserCircle className="h-3.5 w-3.5 text-emerald-700" />
                Verified Kisaan Profile
              </span>
              <span className="text-zinc-300">·</span>
              <span className="text-xs text-zinc-500 font-medium">Digital Landholding & Payouts</span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-zinc-900">
              Farmer Profile & Land Records
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500 leading-relaxed">
              Maintain your farm landholding, soil type, irrigation source, and APMC/PM-KISAN details for direct society contracts and logistics dispatch.
            </p>
          </div>

          {/* Photo Upload in Profile Section */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-emerald-600/30 bg-emerald-50 flex items-center justify-center shadow-xs">
                {profilePhoto ? (
                  <img
                    src={mediaUrl(profilePhoto)}
                    alt={farmerName || "Farmer Photo"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-emerald-700">
                    <UserCircle className="h-8 w-8" />
                    <span className="text-[9px] font-bold">Add Photo</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => downsideFileInputRef.current?.click()}
                title="Change Photo"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg bg-[#1b4332] text-white shadow transition hover:bg-[#245e38]"
              >
                {photoUploading ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </button>
              <input
                ref={downsideFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div className="text-left">
              <button
                type="button"
                onClick={() => downsideFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 hover:border-zinc-300"
              >
                <UploadCloud className="h-3.5 w-3.5 text-emerald-700" />
                {profilePhoto ? "Change Photo" : "Upload Profile Photo"}
              </button>
              <p className="mt-1 text-[11px] text-zinc-400">JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {saveMessage && (
          <div className={`mt-5 flex items-center gap-2 rounded-2xl p-4 text-xs font-bold ${
            saveMessage.includes("success") || saveMessage.includes("updated")
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}>
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{saveMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-6">
          {/* Group 1: Personal & Contact Information */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-800 text-xs font-bold">1</div>
              <h3 className="text-sm font-bold text-zinc-900">Personal & Kisaan Contact Details</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Farmer Full Name *</label>
                <div className="relative">
                  <UserCircle className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    required
                    type="text"
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    placeholder="e.g. Ramesh Naidu"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Phone / WhatsApp Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98480 12345"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Account Email (Verified)</label>
                <input
                  disabled
                  type="email"
                  value={email || user?.email || "farmer@samruddhisetu.in"}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Group 2: Farm Location & Region */}
          <div className="border-t border-zinc-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-800 text-xs font-bold">2</div>
              <h3 className="text-sm font-bold text-zinc-900">Farm Location & District Hub</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Farm / Estate Name *</label>
                <input
                  required
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. Sri Venkateswara Agro Farm"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Village / Mandal / Panchayat</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Chandragiri / Devanahalli Rural"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">District / APMC Region *</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                >
                  <option value="Tirupati">Tirupati (తిరుపతి APMC)</option>
                  <option value="Devanahalli">Devanahalli (ದೇವನಹಳ್ಳಿ Hub)</option>
                  <option value="Chittoor">Chittoor (చిత్తూరు)</option>
                  <option value="Bengaluru Rural">Bengaluru Rural (ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ)</option>
                  <option value="Kolar">Kolar (ಕೋಲಾರ APMC)</option>
                  <option value="Anantapur">Anantapur (అనంతపురం)</option>
                  <option value="Yelahanka">Yelahanka Cluster</option>
                  <option value="Kadapa">YSR Kadapa (కడప)</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">State</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g. Andhra Pradesh / Karnataka"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">PIN Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="e.g. 517501"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Mandi / PM-KISAN Reg No</label>
                <div className="relative">
                  <Award className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={mandiRegNo}
                    onChange={(e) => setMandiRegNo(e.target.value)}
                    placeholder="e.g. APMC-TPT-2024-8891"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Group 3: Agricultural, Soil & Agronomic Data */}
          <div className="border-t border-zinc-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-800 text-xs font-bold">3</div>
              <h3 className="text-sm font-bold text-zinc-900">Agronomic, Land Size & Cultivation Inputs</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Total Landholding Area</label>
                <div className="relative">
                  <LandPlot className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={landSizeAcres}
                    onChange={(e) => setLandSizeAcres(e.target.value)}
                    placeholder="e.g. 5.5 Acres / 2 Hectares"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Soil Type (నేల రకం)</label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                >
                  <option value="Red Sandy Loam">Red Sandy Loam (ఎర్ర నేలలు / ಕೆಂಪು ಮಣ್ಣು)</option>
                  <option value="Black Cotton Soil">Black Cotton Soil (నల్లరేగడి నేలలు / ಕಪ್ಪು ಮಣ್ಣು)</option>
                  <option value="Alluvial Soil">Alluvial Soil (ఒండ్రు నేలలు)</option>
                  <option value="Clay Loam">Clay Loam (జిగురు నేలలు)</option>
                  <option value="Laterite / Red Gravelly">Laterite / Red Gravelly Soil</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Primary Irrigation Source</label>
                <div className="relative">
                  <Droplets className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <select
                    value={irrigationSource}
                    onChange={(e) => setIrrigationSource(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                  >
                    <option value="Borewell + Drip Irrigation">Solar / Electric Borewell + Drip Irrigation</option>
                    <option value="Canal / River Lift">Canal Water / River Lift</option>
                    <option value="Open Farm Pond / Tank">Open Farm Pond / Rainwater Harvesting Tank</option>
                    <option value="Sprinkler System">Sprinkler Network</option>
                    <option value="Rainfed / Dryland">Rainfed / Dryland (వర్షాధార)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Farming Practice & Certification</label>
                <select
                  value={farmingType}
                  onChange={(e) => setFarmingType(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                >
                  <option value="100% Certified Organic">100% Certified Organic (NPOP / Jaivik Bharat)</option>
                  <option value="ZBNF Natural Farming">ZBNF / Natural Farming (సుభాష్ పాలేకర్ ప్రాకృతిక వ్యవసాయం)</option>
                  <option value="Regenerative Agroforestry">Regenerative Agroforestry</option>
                  <option value="Integrated Pest Management">Integrated Pest Management (IPM)</option>
                  <option value="Conventional Farming">Conventional Good Agricultural Practices</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Farming Experience</label>
                <input
                  type="text"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 15 Years"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Post-Harvest Storage Facility</label>
                <select
                  value={storageFacility}
                  onChange={(e) => setStorageFacility(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                >
                  <option value="On-farm ventilated shed">On-farm ventilated shade shed</option>
                  <option value="Local APMC Packhouse">Local APMC Packhouse / Sorting Yard</option>
                  <option value="Cold Storage nearby">Cold Storage facility within 10 km</option>
                  <option value="Covered Drying Yard">Covered drying yard for grains</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Primary Crops Grown (ముఖ్యమైన పంటలు)</label>
                <input
                  type="text"
                  value={primaryCrops}
                  onChange={(e) => setPrimaryCrops(e.target.value)}
                  placeholder="e.g. Tomatoes, Banganapalli Mangoes, Chilli, Fresh Kasuri Methi, Foxtail Millet, Ragi"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-700">Direct Payout UPI ID (Escrow T+1)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={payoutUpi}
                    onChange={(e) => setPayoutUpi(e.target.value)}
                    placeholder="e.g. farmer@okhdfcbank"
                    className="w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-3.5 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Group 4: Farm Story & Organic Practices */}
          <div className="border-t border-zinc-100 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100/70 text-emerald-800 text-xs font-bold">4</div>
              <h3 className="text-sm font-bold text-zinc-900">Farm Story & Cultivation Notes for Buyers</h3>
            </div>
            <div>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your natural cultivation methods, manure usage (Jeevamrutham/Cow dung compost), harvest frequency, and direct society supply capabilities..."
                className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-50 resize-y"
              />
              <p className="mt-1.5 text-[11px] text-zinc-400">
                This note appears on your verified produce listings and helps apartment buyers trust your chemical-free methods.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <p className="text-xs text-zinc-400">
              Changes sync directly with Samruddhi Setu APMC logistics & society desks.
            </p>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1b4332] px-7 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#245e38] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingProfile ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving Details…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Farm Profile & Land Records
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:border-zinc-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <p className="font-serif text-2xl font-bold tracking-tight text-zinc-900">{value}</p>
        <p className="mt-1 text-[11px] text-zinc-400">{hint}</p>
      </div>
    </div>
  );
}

function ToolCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-50 transition group-hover:bg-emerald-50">
          {icon}
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-zinc-900" />
      </div>
      <div className="mt-4">
        <p className="text-base font-bold text-zinc-900">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{desc}</p>
      </div>
    </Link>
  );
}

export function FarmerFeature({
  title,
  kicker,
  body,
}: {
  title: string;
  kicker: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2f7a4a]">{kicker}</p>
      <h1 className="mt-2 font-serif text-3xl">{title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-600">{body}</p>
    </div>
  );
}
