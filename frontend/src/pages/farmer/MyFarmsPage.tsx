import { useState, useEffect, useRef } from "react";
import {
  Sprout,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Camera,
  Droplets,
  Bug,
  DollarSign,
  TrendingUp,
  Printer,
  Sparkles,
  User,
  MapPin,
  ChevronDown,
  Award,
  Check,
} from "lucide-react";
import { useApp } from "../../context/AppState";
import { api } from "../../services/api";

type ActivityItem = {
  id: string;
  date: string;
  type: "Planting" | "Fertilizer" | "Pesticide" | "Irrigation" | "Weeding" | "Labour" | "Machinery" | "Other";
  details: string;
  cost: number;
};

type ReminderItem = {
  id: string;
  activity: string;
  date: string;
  status: "Due" | "Scheduled" | "Upcoming" | "Expected" | "Completed";
};

type HarvestBatch = {
  id: string;
  date: string;
  quantityKg: number;
  pricePerKg: number;
  buyerNote?: string;
};

type CropPhoto = {
  id: string;
  url: string;
  stage: "Planting" | "Crop growth" | "Pest/disease" | "Fertilizer application" | "Harvest";
  date: string;
  caption: string;
};

type CropRecord = {
  id: string;
  cropName: string;
  season: string;
  farmerName: string;
  farmLocation: string;
  landAreaAcres: number;
  plantingDate: string;
  seedVariety: string;
  expectedHarvestDate: string;
  irrigationMethod: string;
  expectedYieldKg: number;
  activities: ActivityItem[];
  reminders: ReminderItem[];
  harvests: HarvestBatch[];
  photos: CropPhoto[];
};

const DEFAULT_CROPS: CropRecord[] = [
  {
    id: "crop-tomato-01",
    cropName: "Tomato",
    season: "Kharif",
    farmerName: "Arjun Reddy",
    farmLocation: "Tirupati Rural, Andhra Pradesh",
    landAreaAcres: 2.0,
    plantingDate: "2026-08-10",
    seedVariety: "Hybrid (Arka Rakshak)",
    expectedHarvestDate: "2026-11-15",
    irrigationMethod: "Drip",
    expectedYieldKg: 2200,
    activities: [
      { id: "act-1", date: "10 Aug", type: "Planting", details: "Tomato seeds planted & nursery beds prepared", cost: 3000 },
      { id: "act-2", date: "18 Aug", type: "Fertilizer", details: "Urea – 50 kg & micronutrient basal spray", cost: 1200 },
      { id: "act-3", date: "25 Aug", type: "Irrigation", details: "Field irrigation via sub-surface drip", cost: 500 },
      { id: "act-4", date: "02 Sep", type: "Pesticide", details: "Organic neem oil pest control spray", cost: 800 },
      { id: "act-5", date: "10 Sep", type: "Labour", details: "Farm workers for weeding and staking", cost: 1500 },
    ],
    reminders: [
      { id: "rem-1", activity: "Fertilizer application", date: "20 Sep", status: "Due" },
      { id: "rem-2", activity: "Irrigation cycle", date: "22 Sep", status: "Scheduled" },
      { id: "rem-3", activity: "Pest inspection & sticky traps", date: "28 Sep", status: "Upcoming" },
      { id: "rem-4", activity: "Harvest First Picking", date: "15 Nov", status: "Expected" },
    ],
    harvests: [
      { id: "harv-1", date: "2026-11-15", quantityKg: 2000, pricePerKg: 25, buyerNote: "Dispatched to Samruddhi Setu Tirupati Mandi Hub" },
    ],
    photos: [
      {
        id: "p-1",
        url: "https://images.unsplash.com/photo-1592417817098-8f3d6ef23963?w=600&auto=format&fit=crop&q=80",
        stage: "Planting",
        date: "10 Aug",
        caption: "Nursery bed transplanting with drip lines active",
      },
      {
        id: "p-2",
        url: "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e17?w=600&auto=format&fit=crop&q=80",
        stage: "Crop growth",
        date: "28 Aug",
        caption: "Vigorous vegetative growth and healthy flowering stage",
      },
      {
        id: "p-3",
        url: "https://images.unsplash.com/photo-1561136594-7f68413baa99?w=600&auto=format&fit=crop&q=80",
        stage: "Harvest",
        date: "15 Nov",
        caption: "Grade-A round ripe red harvest ready for crate boxing",
      },
    ],
  },
  {
    id: "crop-chilli-02",
    cropName: "Green Chilli (Guntur)",
    season: "Kharif",
    farmerName: "Arjun Reddy",
    farmLocation: "Tirupati East Plot B",
    landAreaAcres: 1.5,
    plantingDate: "2026-07-20",
    seedVariety: "Guntur Sannam",
    expectedHarvestDate: "2026-10-25",
    irrigationMethod: "Sprinkler",
    expectedYieldKg: 1400,
    activities: [
      { id: "cact-1", date: "20 Jul", type: "Planting", details: "Chilli seedlings planted with organic compost", cost: 2800 },
      { id: "cact-2", date: "05 Aug", type: "Fertilizer", details: "Potash & vermicompost application", cost: 1400 },
      { id: "cact-3", date: "15 Aug", type: "Irrigation", details: "Sprinkler set runs 4 hours", cost: 450 },
    ],
    reminders: [
      { id: "crem-1", activity: "Thrips & Mite spray", date: "24 Sep", status: "Upcoming" },
      { id: "crem-2", activity: "Green picking harvest", date: "25 Oct", status: "Expected" },
    ],
    harvests: [
      { id: "charv-1", date: "2026-10-25", quantityKg: 1200, pricePerKg: 45, buyerNote: "Direct supply to Devanahalli Hub" },
    ],
    photos: [],
  },
];

const STORAGE_KEY = "samruddhi_my_farms_records_v2";

export function MyFarmsPage() {
  const { user } = useApp();
  const [crops, setCrops] = useState<CropRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CROPS;
  });

  const [activeCropId, setActiveCropId] = useState<string>(crops[0]?.id || "crop-tomato-01");
  const [saveToast, setSaveToast] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [showAddHarvestModal, setShowAddHarvestModal] = useState(false);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [showNewCropModal, setShowNewCropModal] = useState(false);

  // Form states for new inputs
  const [newActivity, setNewActivity] = useState<Partial<ActivityItem>>({
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    type: "Fertilizer",
    details: "",
    cost: 0,
  });

  const [newReminder, setNewReminder] = useState<Partial<ReminderItem>>({
    activity: "",
    date: "",
    status: "Upcoming",
  });

  const [newHarvest, setNewHarvest] = useState<Partial<HarvestBatch>>({
    date: new Date().toISOString().split("T")[0],
    quantityKg: 500,
    pricePerKg: 25,
    buyerNote: "",
  });

  const [newPhoto, setNewPhoto] = useState<{
    stage: CropPhoto["stage"];
    caption: string;
    fileUrl: string;
  }>({
    stage: "Crop growth",
    caption: "",
    fileUrl: "",
  });

  const [newCropForm, setNewCropForm] = useState({
    cropName: "",
    season: "Kharif",
    landAreaAcres: 1,
    plantingDate: new Date().toISOString().split("T")[0],
    seedVariety: "",
    expectedHarvestDate: "",
    irrigationMethod: "Drip",
    expectedYieldKg: 1000,
  });

  const photoFileRef = useRef<HTMLInputElement>(null);

  // Active crop record
  const currentCrop = crops.find((c) => c.id === activeCropId) || crops[0];

  // Auto-fill farmer name from profile if present
  useEffect(() => {
    api<{
      user: {
        name: string;
        farmer?: { farmName?: string; location?: string; district?: string };
      };
    }>("/api/farmers/me")
      .then((res) => {
        if (res?.user?.name && currentCrop) {
          setCrops((prev) =>
            prev.map((c) =>
              c.id === currentCrop.id && !c.farmerName
                ? {
                    ...c,
                    farmerName: res.user.name,
                    farmLocation:
                      c.farmLocation ||
                      `${res.user.farmer?.location || ""}, ${res.user.farmer?.district || "Andhra Pradesh"}`.replace(/^, /, ""),
                  }
                : c
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  // Save to localStorage and backend
  const persistCrops = (updated: CropRecord[]) => {
    setCrops(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Save to backend farmer profile details
    api("/api/farmers/me", {
      method: "PUT",
      body: JSON.stringify({
        details: JSON.stringify({ myFarmsData: updated }),
      }),
    }).catch(() => {});

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const updateCurrentCrop = (patch: Partial<CropRecord>) => {
    const updated = crops.map((c) => (c.id === currentCrop.id ? { ...c, ...patch } : c));
    persistCrops(updated);
  };

  // Metric Computations
  const cropAgeDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(currentCrop.plantingDate).getTime()) / (1000 * 60 * 60 * 24))
  );

  const totalFarmCosts = currentCrop.activities.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
  const costPerAcre = currentCrop.landAreaAcres > 0 ? Math.round(totalFarmCosts / currentCrop.landAreaAcres) : 0;

  const irrigationCount = currentCrop.activities.filter((a) => a.type === "Irrigation").length;
  const fertilizerCount = currentCrop.activities.filter((a) => a.type === "Fertilizer").length;
  const pesticideCount = currentCrop.activities.filter((a) => a.type === "Pesticide").length;

  const totalHarvestQtyKg = currentCrop.harvests.reduce((sum, h) => sum + (Number(h.quantityKg) || 0), 0);
  const totalRevenuePaise = currentCrop.harvests.reduce(
    (sum, h) => sum + (Number(h.quantityKg) || 0) * (Number(h.pricePerKg) || 0) * 100,
    0
  );
  const totalRevenueRs = totalRevenuePaise / 100;
  const netProfitRs = totalRevenueRs - totalFarmCosts;

  // Handlers for Activity
  const handleAddActivity = () => {
    if (!newActivity.details) return;
    const item: ActivityItem = {
      id: "act-" + Date.now(),
      date: newActivity.date || "Today",
      type: newActivity.type as any,
      details: newActivity.details || "",
      cost: Number(newActivity.cost) || 0,
    };
    updateCurrentCrop({ activities: [...currentCrop.activities, item] });
    setShowAddActivityModal(false);
    setNewActivity({
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      type: "Fertilizer",
      details: "",
      cost: 0,
    });
  };

  const handleDeleteActivity = (id: string) => {
    updateCurrentCrop({ activities: currentCrop.activities.filter((a) => a.id !== id) });
  };

  // Handlers for Reminders
  const handleAddReminder = () => {
    if (!newReminder.activity) return;
    const item: ReminderItem = {
      id: "rem-" + Date.now(),
      activity: newReminder.activity,
      date: newReminder.date || "Next Week",
      status: (newReminder.status as any) || "Upcoming",
    };
    updateCurrentCrop({ reminders: [...currentCrop.reminders, item] });
    setShowAddReminderModal(false);
    setNewReminder({ activity: "", date: "", status: "Upcoming" });
  };

  const handleDeleteReminder = (id: string) => {
    updateCurrentCrop({ reminders: currentCrop.reminders.filter((r) => r.id !== id) });
  };

  // Handlers for Harvest
  const handleAddHarvest = () => {
    const item: HarvestBatch = {
      id: "harv-" + Date.now(),
      date: newHarvest.date || new Date().toISOString().split("T")[0],
      quantityKg: Number(newHarvest.quantityKg) || 0,
      pricePerKg: Number(newHarvest.pricePerKg) || 0,
      buyerNote: newHarvest.buyerNote || "",
    };
    updateCurrentCrop({ harvests: [...currentCrop.harvests, item] });
    setShowAddHarvestModal(false);
  };

  const handleDeleteHarvest = (id: string) => {
    updateCurrentCrop({ harvests: currentCrop.harvests.filter((h) => h.id !== id) });
  };

  // Photo Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewPhoto((prev) => ({ ...prev, fileUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = () => {
    if (!newPhoto.fileUrl) return;
    const item: CropPhoto = {
      id: "photo-" + Date.now(),
      url: newPhoto.fileUrl,
      stage: newPhoto.stage,
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      caption: newPhoto.caption || `${newPhoto.stage} stage recorded`,
    };
    updateCurrentCrop({ photos: [...currentCrop.photos, item] });
    setShowAddPhotoModal(false);
    setNewPhoto({ stage: "Crop growth", caption: "", fileUrl: "" });
  };

  // Add New Crop
  const handleCreateCrop = () => {
    if (!newCropForm.cropName) return;
    const newRecord: CropRecord = {
      id: "crop-" + Date.now(),
      cropName: newCropForm.cropName,
      season: newCropForm.season,
      farmerName: currentCrop.farmerName || user?.name || "Farmer",
      farmLocation: currentCrop.farmLocation || "Andhra Pradesh",
      landAreaAcres: Number(newCropForm.landAreaAcres) || 1,
      plantingDate: newCropForm.plantingDate,
      seedVariety: newCropForm.seedVariety || "Standard Certified",
      expectedHarvestDate: newCropForm.expectedHarvestDate || "",
      irrigationMethod: newCropForm.irrigationMethod,
      expectedYieldKg: Number(newCropForm.expectedYieldKg) || 1000,
      activities: [
        {
          id: "act-" + Date.now(),
          date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
          type: "Planting",
          details: `${newCropForm.cropName} field prepared and sowed`,
          cost: 2000,
        },
      ],
      reminders: [
        {
          id: "rem-" + Date.now(),
          activity: "First Irrigation & Nitrogen Boost",
          date: "In 7 Days",
          status: "Scheduled",
        },
      ],
      harvests: [],
      photos: [],
    };
    const updated = [...crops, newRecord];
    persistCrops(updated);
    setActiveCropId(newRecord.id);
    setShowNewCropModal(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-950 px-5 py-2.5 text-xs font-semibold text-white shadow-xl border border-emerald-500/30 animate-bounce">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>Farm records autosaved successfully!</span>
        </div>
      )}

      {/* Top Banner: Single Page Farmer Management System */}
      <div className="rounded-3xl border border-emerald-900/20 bg-gradient-to-br from-[#1b4332] via-[#245e38] to-[#1e4a30] p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-100 border border-emerald-400/30 backdrop-blur-md">
              <Sprout className="h-3.5 w-3.5 text-emerald-300" />
              Farmer Management — Single Page
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              🌾 Farmer Management System
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/80 max-w-xl">
              “One crop, one page, complete financial and farming history.” Track every input, activity, reminder, harvest, and photo in a single unified ledger.
            </p>
          </div>

          {/* Action Buttons: Print / Report & Add Crop */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white border border-white/20 backdrop-blur-md transition hover:bg-white/20"
              title="Print or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Export Record
            </button>
            <button
              type="button"
              onClick={() => setShowNewCropModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-[#1b4332] shadow-md transition hover:bg-emerald-50 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              + Add New Crop
            </button>
          </div>
        </div>

        {/* Crop Selector Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/15 pt-5">
          <span className="text-xs font-semibold text-emerald-200">Active Crop Cycles:</span>
          {crops.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCropId(c.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                c.id === currentCrop.id
                  ? "bg-white text-[#1b4332] shadow-sm"
                  : "bg-white/10 text-white/90 hover:bg-white/20 border border-white/10"
              }`}
            >
              <Sprout className="h-3.5 w-3.5" />
              {c.cropName} ({c.landAreaAcres} Ac)
            </button>
          ))}
        </div>
      </div>

      {/* Main General Information Bar */}
      <div className="grid gap-4 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs sm:grid-cols-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Farmer Name
          </label>
          <div className="relative mt-1.5 flex items-center">
            <User className="absolute left-3.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={currentCrop.farmerName}
              onChange={(e) => updateCurrentCrop({ farmerName: e.target.value })}
              placeholder="Enter Name"
              className="w-full rounded-2xl border border-zinc-200/90 bg-zinc-50/60 py-2.5 pl-10 pr-3 text-sm font-medium text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Farm Location
          </label>
          <div className="relative mt-1.5 flex items-center">
            <MapPin className="absolute left-3.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={currentCrop.farmLocation}
              onChange={(e) => updateCurrentCrop({ farmLocation: e.target.value })}
              placeholder="Enter Location (Village, District, State)"
              className="w-full rounded-2xl border border-zinc-200/90 bg-zinc-50/60 py-2.5 pl-10 pr-3 text-sm font-medium text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Season
          </label>
          <div className="relative mt-1.5">
            <select
              value={currentCrop.season}
              onChange={(e) => updateCurrentCrop({ season: e.target.value })}
              className="w-full appearance-none rounded-2xl border border-zinc-200/90 bg-zinc-50/60 px-3.5 py-2.5 text-sm font-medium text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="Kharif">Kharif (Monsoon / Autumn)</option>
              <option value="Rabi">Rabi (Winter / Spring)</option>
              <option value="Zaid">Zaid (Summer)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-3 h-4 w-4 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* 1. CROP DETAILS */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-zinc-900">🌱 1. Crop Details</h2>
              <p className="text-xs text-zinc-500">Land acreage, sowing schedule, variety & irrigation setup</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowNewCropModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#1b4332] transition hover:bg-emerald-100"
          >
            <Plus className="h-3.5 w-3.5" />
            + Add Crop
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="pb-3 pr-4">Field</th>
                <th className="pb-3">Enter Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
              <tr>
                <td className="py-3 pr-4 font-semibold text-zinc-600">Crop Name</td>
                <td className="py-2">
                  <input
                    type="text"
                    value={currentCrop.cropName}
                    onChange={(e) => updateCurrentCrop({ cropName: e.target.value })}
                    className="w-full max-w-sm rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-1.5 text-sm font-semibold text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    placeholder="e.g. Tomato"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-zinc-600">Land Area</td>
                <td className="py-2">
                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="number"
                      step="0.1"
                      value={currentCrop.landAreaAcres}
                      onChange={(e) => updateCurrentCrop({ landAreaAcres: Number(e.target.value) || 0 })}
                      className="w-32 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-1.5 text-sm font-semibold text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    />
                    <span className="text-xs font-bold text-zinc-500">Acres</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-zinc-600">Planting Date</td>
                <td className="py-2">
                  <input
                    type="date"
                    value={currentCrop.plantingDate}
                    onChange={(e) => updateCurrentCrop({ plantingDate: e.target.value })}
                    className="w-full max-w-sm rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-1.5 text-sm text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-zinc-600">Seed / Variety</td>
                <td className="py-2">
                  <input
                    type="text"
                    value={currentCrop.seedVariety}
                    onChange={(e) => updateCurrentCrop({ seedVariety: e.target.value })}
                    className="w-full max-w-sm rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-1.5 text-sm text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                    placeholder="e.g. Hybrid (Arka Rakshak)"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-zinc-600">Expected Harvest</td>
                <td className="py-2">
                  <input
                    type="date"
                    value={currentCrop.expectedHarvestDate}
                    onChange={(e) => updateCurrentCrop({ expectedHarvestDate: e.target.value })}
                    className="w-full max-w-sm rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-1.5 text-sm text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-semibold text-zinc-600">Irrigation Method</td>
                <td className="py-2">
                  <select
                    value={currentCrop.irrigationMethod}
                    onChange={(e) => updateCurrentCrop({ irrigationMethod: e.target.value })}
                    className="w-full max-w-sm rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-1.5 text-sm text-zinc-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  >
                    <option value="Drip">Drip Irrigation</option>
                    <option value="Sprinkler">Sprinkler Irrigation</option>
                    <option value="Flood">Flood / Surface Irrigation</option>
                    <option value="Canal">Canal / Basin</option>
                    <option value="Rainfed">Rainfed (Natural Monsoon)</option>
                    <option value="Furrow">Furrow Irrigation</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. FARM ACTIVITIES */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-zinc-900">📅 2. Farm Activities</h2>
              <p className="text-xs text-zinc-500">Add every activity performed on the farm — planting, sprays, labour & costs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddActivityModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#1b4332] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#245e38]"
          >
            <Plus className="h-3.5 w-3.5" />
            + Add Activity
          </button>
        </div>

        {/* Activity Type Badges Guide */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
          <span className="font-semibold text-zinc-700">Activity types:</span>
          {["Planting", "Fertilizer", "Pesticide", "Irrigation", "Weeding", "Labour", "Machinery", "Other"].map((tag) => (
            <span key={tag} className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
              {tag}
            </span>
          ))}
        </div>

        {/* Activities Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Activity</th>
                <th className="pb-3 pr-4">Details</th>
                <th className="pb-3 text-right">Cost</th>
                <th className="pb-3 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-800">
              {currentCrop.activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-zinc-400">
                    No farm activities recorded yet. Click "+ Add Activity" to start logging expenses.
                  </td>
                </tr>
              ) : (
                currentCrop.activities.map((act) => (
                  <tr key={act.id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3 pr-4 font-semibold text-zinc-700 whitespace-nowrap">{act.date}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-800">
                        {act.type === "Planting" && "🌱"}
                        {act.type === "Fertilizer" && "🧪"}
                        {act.type === "Irrigation" && "💧"}
                        {act.type === "Pesticide" && "🐛"}
                        {act.type === "Labour" && "👷"}
                        {act.type === "Weeding" && "🌾"}
                        {act.type === "Machinery" && "🚜"}
                        {act.type === "Other" && "📌"}
                        {act.type}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium text-zinc-600">{act.details}</td>
                    <td className="py-3 text-right font-bold text-zinc-900 whitespace-nowrap">
                      ₹{act.cost.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(act.id)}
                        className="text-zinc-400 hover:text-rose-600 transition p-1"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-200 font-bold">
                <td colSpan={3} className="py-3 text-xs uppercase tracking-wider text-zinc-600">
                  Total Farm Operational Expenses
                </td>
                <td className="py-3 text-right font-serif text-base font-bold text-emerald-900">
                  ₹{totalFarmCosts.toLocaleString("en-IN")}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. UPCOMING ACTIVITIES & REMINDERS */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-800">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-zinc-900">🔔 4. Upcoming Activities & Reminders</h2>
              <p className="text-xs text-zinc-500">Schedules for nutrition, watering, scouting and harvest</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddReminderModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-purple-600/30 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-900 transition hover:bg-purple-100"
          >
            <Plus className="h-3.5 w-3.5" />
            + Add Reminder
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="pb-3 pr-4">Activity</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-800">
              {currentCrop.reminders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-zinc-400">
                    No reminders scheduled. Keep your farm timely by adding scheduled tasks.
                  </td>
                </tr>
              ) : (
                currentCrop.reminders.map((rem) => (
                  <tr key={rem.id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3 pr-4 font-semibold text-zinc-900 flex items-center gap-2">
                      {rem.activity.toLowerCase().includes("fertilizer") && "🧪"}
                      {rem.activity.toLowerCase().includes("irrigation") && "💧"}
                      {rem.activity.toLowerCase().includes("pest") && "🐛"}
                      {rem.activity.toLowerCase().includes("harvest") && "🌾"}
                      {!rem.activity.toLowerCase().match(/fertilizer|irrigation|pest|harvest/) && "📌"}
                      <span>{rem.activity}</span>
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium text-zinc-600 whitespace-nowrap">{rem.date}</td>
                    <td className="py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          rem.status === "Due"
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : rem.status === "Scheduled"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : rem.status === "Expected"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {rem.status === "Due" && "🔔 "}
                        {rem.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="text-zinc-400 hover:text-rose-600 transition p-1"
                        title="Delete reminder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. HARVEST DETAILS */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-zinc-900">🌾 5. Harvest Details</h2>
              <p className="text-xs text-zinc-500">Harvest dates, batch quantities, realized prices & gross revenues</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddHarvestModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#1b4332] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#245e38]"
          >
            <Plus className="h-3.5 w-3.5" />
            + Add Harvest
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="pb-3 pr-4">Harvest Date</th>
                <th className="pb-3 pr-4">Quantity Harvested</th>
                <th className="pb-3 pr-4">Selling Price</th>
                <th className="pb-3 text-right">Total Revenue</th>
                <th className="pb-3 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-800">
              {currentCrop.harvests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-zinc-400">
                    No harvest records added yet. Once crops are picked, log quantities and mandi prices here.
                  </td>
                </tr>
              ) : (
                currentCrop.harvests.map((h) => (
                  <tr key={h.id} className="hover:bg-zinc-50/50 transition">
                    <td className="py-3 pr-4 font-semibold text-zinc-900 whitespace-nowrap">{h.date}</td>
                    <td className="py-3 pr-4 font-bold text-zinc-800 whitespace-nowrap">
                      {h.quantityKg.toLocaleString("en-IN")} kg
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium text-zinc-600 whitespace-nowrap">
                      ₹{h.pricePerKg}/kg
                    </td>
                    <td className="py-3 text-right font-serif text-base font-bold text-emerald-900 whitespace-nowrap">
                      ₹{(h.quantityKg * h.pricePerKg).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteHarvest(h.id)}
                        className="text-zinc-400 hover:text-rose-600 transition p-1"
                        title="Delete harvest entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-200 font-bold">
                <td className="py-3 text-xs uppercase tracking-wider text-zinc-600">Total Realized</td>
                <td className="py-3 text-emerald-900">{totalHarvestQtyKg.toLocaleString("en-IN")} kg</td>
                <td></td>
                <td className="py-3 text-right font-serif text-lg font-bold text-emerald-900">
                  ₹{totalRevenueRs.toLocaleString("en-IN")}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 6. KEY METRICS SUMMARY (Hackathon USP Highlight) */}
      <div className="rounded-3xl border border-emerald-900/20 bg-gradient-to-br from-emerald-50 via-white to-zinc-50 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <h3 className="font-serif text-lg font-bold text-zinc-900">
              One-Page Crop Agronomics & Financial Journey
            </h3>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
            Verified Ledger
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span>🌱 Crop Age</span>
              <span className="text-emerald-700 font-bold">Days since sowing</span>
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-zinc-900">{cropAgeDays} days</p>
            <p className="mt-1 text-[11px] text-zinc-400">Planted on {currentCrop.plantingDate}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span>💧 Irrigation Records</span>
              <Droplets className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-zinc-900">{irrigationCount} cycles</p>
            <p className="mt-1 text-[11px] text-zinc-400">Method: {currentCrop.irrigationMethod}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span>🧪 Fertilizer Applications</span>
              <span className="text-amber-700 font-bold">Nutrition</span>
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-zinc-900">{fertilizerCount} doses</p>
            <p className="mt-1 text-[11px] text-zinc-400">Basal & top-dressing logs</p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span>🐛 Pest Treatments</span>
              <Bug className="h-4 w-4 text-rose-600" />
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-zinc-900">{pesticideCount} sprays</p>
            <p className="mt-1 text-[11px] text-zinc-400">Organic neem oil & IPDM</p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span>💰 Cost per Acre</span>
              <DollarSign className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-zinc-900">
              ₹{costPerAcre.toLocaleString("en-IN")} / ac
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">Total expense: ₹{totalFarmCosts.toLocaleString("en-IN")}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span>🌾 Expected Yield</span>
              <TrendingUp className="h-4 w-4 text-purple-700" />
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-zinc-900">
              {currentCrop.expectedYieldKg.toLocaleString("en-IN")} kg
            </p>
            <p className="mt-1 text-[11px] text-emerald-700 font-semibold">
              Harvested so far: {totalHarvestQtyKg} kg
            </p>
          </div>
        </div>

        {/* Profitability / Net Margin Banner */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#1b4332] p-4 text-white shadow-xs">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              Net Farm Income & Balance (Single Ledger)
            </p>
            <p className="mt-0.5 text-xs text-emerald-100/80">
              Gross Revenue: ₹{totalRevenueRs.toLocaleString("en-IN")} &bull; Farm Expenditure: ₹{totalFarmCosts.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-emerald-200 font-medium">Net Crop Profit:</span>
            <p className="font-serif text-2xl font-bold text-emerald-300">
              {netProfitRs >= 0 ? `+₹${netProfitRs.toLocaleString("en-IN")}` : `-₹${Math.abs(netProfitRs).toLocaleString("en-IN")}`}
            </p>
          </div>
        </div>
      </div>

      {/* 8. CROP PHOTOS */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-zinc-900">📷 8. Crop Photos</h2>
              <p className="text-xs text-zinc-500">Visual diary of planting, vegetative growth, flowering, pest scouts & harvest</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddPhotoModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#1b4332] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#245e38]"
          >
            <Plus className="h-3.5 w-3.5" />
            + Upload Photo
          </button>
        </div>

        {/* Photo Stage Guide Tags */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-700">Farmer can upload photos of:</span>
          {["Planting", "Crop growth", "Pest/disease", "Fertilizer application", "Harvest"].map((s) => (
            <span key={s} className="rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900">
              {s}
            </span>
          ))}
        </div>

        {/* Photos Grid */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currentCrop.photos.length === 0 ? (
            <div className="col-span-full py-10 text-center">
              <Camera className="mx-auto h-10 w-10 text-zinc-300" />
              <p className="mt-2 text-sm font-bold text-zinc-700">No crop photos uploaded yet</p>
              <p className="text-xs text-zinc-500">Add camera captures of field stages to maintain visual proof for buyers & mandi grading.</p>
            </div>
          ) : (
            currentCrop.photos.map((p) => (
              <div
                key={p.id}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50 shadow-xs transition hover:shadow-md"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-200">
                  <img
                    src={p.url}
                    alt={p.caption}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-md bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                    {p.stage}
                  </span>
                  <span className="absolute right-2.5 top-2.5 rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white">
                    {p.date}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-zinc-900 leading-snug">{p.caption}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: Add Activity */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-zinc-900">Add Farm Activity</h3>
            <p className="text-xs text-zinc-500">Record a new cultivation activity and its associated cost.</p>

            <div className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="text-xs font-bold text-zinc-600">Date</label>
                <input
                  type="text"
                  value={newActivity.date}
                  onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                  placeholder="e.g. 18 Aug or 2026-08-18"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600">Activity Type</label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                >
                  <option value="Planting">🌱 Planting</option>
                  <option value="Fertilizer">🧪 Fertilizer</option>
                  <option value="Pesticide">🐛 Pesticide</option>
                  <option value="Irrigation">💧 Irrigation</option>
                  <option value="Weeding">🌾 Weeding</option>
                  <option value="Labour">👷 Labour</option>
                  <option value="Machinery">🚜 Machinery</option>
                  <option value="Other">📌 Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600">Activity Details</label>
                <input
                  type="text"
                  value={newActivity.details}
                  onChange={(e) => setNewActivity({ ...newActivity, details: e.target.value })}
                  placeholder="e.g. Urea 50kg, Farm workers for staking"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600">Cost (₹)</label>
                <input
                  type="number"
                  value={newActivity.cost || ""}
                  onChange={(e) => setNewActivity({ ...newActivity, cost: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddActivityModal(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddActivity}
                className="rounded-xl bg-[#1b4332] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#245e38]"
              >
                Save Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Reminder */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-zinc-900">Add Upcoming Reminder</h3>
            <p className="text-xs text-zinc-500">Plan ahead for farm tasks so you never miss critical crop windows.</p>

            <div className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="text-xs font-bold text-zinc-600">Activity</label>
                <input
                  type="text"
                  value={newReminder.activity}
                  onChange={(e) => setNewReminder({ ...newReminder, activity: e.target.value })}
                  placeholder="e.g. Fertilizer application, Pest inspection"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600">Scheduled Date</label>
                <input
                  type="text"
                  value={newReminder.date}
                  onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                  placeholder="e.g. 20 Sep or In 3 Days"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600">Status</label>
                <select
                  value={newReminder.status}
                  onChange={(e) => setNewReminder({ ...newReminder, status: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                >
                  <option value="Due">🔔 Due Now</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Expected">Expected</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddReminderModal(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddReminder}
                className="rounded-xl bg-[#1b4332] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#245e38]"
              >
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Harvest */}
      {showAddHarvestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-zinc-900">Record Harvest Batch</h3>
            <p className="text-xs text-zinc-500">Log picked quantity, mandi realized rate, and calculated revenue.</p>

            <div className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="text-xs font-bold text-zinc-600">Harvest Date</label>
                <input
                  type="date"
                  value={newHarvest.date}
                  onChange={(e) => setNewHarvest({ ...newHarvest, date: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-600">Quantity Harvested (kg)</label>
                  <input
                    type="number"
                    value={newHarvest.quantityKg || ""}
                    onChange={(e) => setNewHarvest({ ...newHarvest, quantityKg: Number(e.target.value) || 0 })}
                    placeholder="2000"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600">Selling Price (₹/kg)</label>
                  <input
                    type="number"
                    value={newHarvest.pricePerKg || ""}
                    onChange={(e) => setNewHarvest({ ...newHarvest, pricePerKg: Number(e.target.value) || 0 })}
                    placeholder="25"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-xs">
                <span className="font-semibold text-emerald-900">Total Calculated Revenue: </span>
                <span className="font-serif text-base font-bold text-emerald-900">
                  ₹{((Number(newHarvest.quantityKg) || 0) * (Number(newHarvest.pricePerKg) || 0)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddHarvestModal(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddHarvest}
                className="rounded-xl bg-[#1b4332] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#245e38]"
              >
                Save Harvest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Upload Photo */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-zinc-900">Upload Crop Photo</h3>
            <p className="text-xs text-zinc-500">Visual proof of plant health, flowering, or harvest sorting.</p>

            <div className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="text-xs font-bold text-zinc-600">Growth Stage / Category</label>
                <select
                  value={newPhoto.stage}
                  onChange={(e) => setNewPhoto({ ...newPhoto, stage: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                >
                  <option value="Planting">🌱 Planting</option>
                  <option value="Crop growth">🌿 Crop Growth</option>
                  <option value="Pest/disease">🐛 Pest / Disease</option>
                  <option value="Fertilizer application">🧪 Fertilizer Application</option>
                  <option value="Harvest">🌾 Harvest</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600">Select Image File</label>
                <input
                  ref={photoFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="mt-1 block w-full text-xs text-zinc-500 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-emerald-800 hover:file:bg-emerald-100"
                />
              </div>

              {newPhoto.fileUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                  <img src={newPhoto.fileUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-600">Photo Caption / Observation Note</label>
                <input
                  type="text"
                  value={newPhoto.caption}
                  onChange={(e) => setNewPhoto({ ...newPhoto, caption: e.target.value })}
                  placeholder="e.g. Nursery bed transplanting with drip lines"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddPhotoModal(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={!newPhoto.fileUrl}
                className="rounded-xl bg-[#1b4332] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#245e38] disabled:opacity-50"
              >
                Add Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Crop Record */}
      {showNewCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-zinc-900">+ Add New Crop Cycle</h3>
            <p className="text-xs text-zinc-500">Create a separate single-page ledger for another crop or field plot.</p>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <label className="text-xs font-bold text-zinc-600">Crop Name</label>
                <input
                  type="text"
                  value={newCropForm.cropName}
                  onChange={(e) => setNewCropForm({ ...newCropForm, cropName: e.target.value })}
                  placeholder="e.g. Banganapalli Mango, Cotton, Chilli"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-600">Season</label>
                  <select
                    value={newCropForm.season}
                    onChange={(e) => setNewCropForm({ ...newCropForm, season: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                  >
                    <option value="Kharif">Kharif</option>
                    <option value="Rabi">Rabi</option>
                    <option value="Zaid">Zaid</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600">Land Area (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newCropForm.landAreaAcres}
                    onChange={(e) => setNewCropForm({ ...newCropForm, landAreaAcres: Number(e.target.value) || 1 })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-600">Planting Date</label>
                  <input
                    type="date"
                    value={newCropForm.plantingDate}
                    onChange={(e) => setNewCropForm({ ...newCropForm, plantingDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600">Irrigation Method</label>
                  <select
                    value={newCropForm.irrigationMethod}
                    onChange={(e) => setNewCropForm({ ...newCropForm, irrigationMethod: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
                  >
                    <option value="Drip">Drip</option>
                    <option value="Sprinkler">Sprinkler</option>
                    <option value="Flood">Flood</option>
                    <option value="Rainfed">Rainfed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowNewCropModal(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCrop}
                disabled={!newCropForm.cropName}
                className="rounded-xl bg-[#1b4332] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#245e38] disabled:opacity-50"
              >
                Start Crop Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
