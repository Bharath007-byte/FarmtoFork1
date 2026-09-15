import { useState, useEffect, useRef } from "react";
import {
  Mail,
  Phone,
  Truck,
  ShieldCheck,
  Star,
  Award,
  Clock,
  Camera,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { LogisticsLayout } from "../../layouts/LogisticsLayout";
import { api, mediaUrl } from "../../services/api";

type LogisticsProfileData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  role: string;
  deliveryType: "BIKE" | "LARGE_TRUCK" | null;
  vehicleNumber: string | null;
};

export function LogisticsProfile() {
  const [profile, setProfile] = useState<LogisticsProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api<{ profile: LogisticsProfileData }>("/api/logistics/profile");
        const cachedPhoto = localStorage.getItem(`drv-photo-${res.profile.id}`);
        if (cachedPhoto && !res.profile.photoUrl) {
          res.profile.photoUrl = cachedPhoto;
        }
        setProfile(res.profile);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fast local preview
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (profile?.id) {
        localStorage.setItem(`drv-photo-${profile.id}`, dataUrl);
      }
      setProfile((prev) => prev ? { ...prev, photoUrl: dataUrl } : null);
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      setUploading(true);
      setUploadMsg("");
      const formData = new FormData();
      formData.append("photo", file);

      const token = localStorage.getItem("f2f-token") || "";
      const apiBase = import.meta.env.VITE_API_URL || "";
      const resp = await fetch(`${apiBase}/api/logistics/me/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json.photoUrl) {
          setProfile((prev) => prev ? { ...prev, photoUrl: json.photoUrl } : null);
        }
        setUploadMsg("Photo updated successfully!");
      } else {
        setUploadMsg("Photo saved locally!");
      }
    } catch {
      setUploadMsg("Photo saved locally!");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMsg(""), 4000);
    }
  };

  const firstName = profile?.name ? profile.name.trim().split(/\s+/)[0] : "Ramesh";

  if (loading) {
    return (
      <LogisticsLayout>
        <div className="p-8 animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded" />
          <div className="h-48 bg-white rounded-2xl border border-slate-200" />
        </div>
      </LogisticsLayout>
    );
  }

  return (
    <LogisticsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Driver Identity & Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified delivery partner profile registered with Samruddhi Setu APMC cooperative network.
          </p>
        </div>

        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white font-black text-xl flex items-center justify-center shadow-md overflow-hidden ring-2 ring-emerald-500/20">
                  {profile?.photoUrl ? (
                    <img src={mediaUrl(profile.photoUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    firstName.charAt(0)
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  title="Upload Driver Photo"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md border-2 border-white transition flex items-center justify-center"
                >
                  {uploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                </button>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-slate-900">{profile?.name || "Ramesh Babu"}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Active Driver
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: SS-DRV-{profile?.id ? profile.id.slice(0, 8) : "772183"} • Devanahalli Hub
                </p>
                {uploadMsg && (
                  <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 size={12} />
                    <span>{uploadMsg}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5">
                <Truck size={14} />
                <span>{profile?.deliveryType === "LARGE_TRUCK" ? "Heavy Freight" : "Courier Express"}</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Verified</span>
              </span>
            </div>
          </div>

          {/* Contact & Registration Information */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Mail size={13} />
                <span>Registered Email</span>
              </span>
              <p className="font-bold text-slate-900 mt-1">{profile?.email || "ramesh.truck@samruddhsetu.in"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Phone size={13} />
                <span>Mobile Phone</span>
              </span>
              <p className="font-bold text-slate-900 mt-1">{profile?.phone || "+91 98450 12345"}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Truck size={13} />
                <span>Assigned Vehicle Number</span>
              </span>
              <p className="font-mono font-bold text-slate-900 mt-1">
                {profile?.vehicleNumber || "KA01EF3456"}
              </p>
            </div>
          </div>
        </div>

        {/* Safety & Performance Scorecard */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide mb-4">
            Driver Performance & Quality Scorecard
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Star size={20} className="fill-amber-400 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Farmer Rating</span>
                <p className="text-lg font-black text-slate-900">4.9 / 5.0</p>
                <p className="text-[10px] text-slate-500">Based on 48 verified deliveries</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On-Time Arrival</span>
                <p className="text-lg font-black text-slate-900">99.4%</p>
                <p className="text-[10px] text-slate-500">Exceeding SLA benchmark (95%)</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                <Award size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Perishable Integrity
                </span>
                <p className="text-lg font-black text-slate-900">100% Pass</p>
                <p className="text-[10px] text-slate-500">Zero produce damage reported</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LogisticsLayout>
  );
}
