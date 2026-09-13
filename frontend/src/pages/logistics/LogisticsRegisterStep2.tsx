import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FileText,
  User,
  RefreshCw,
} from "lucide-react";
import { SiteNav } from "../../components/SiteNav";
import { LogisticsStepIndicator } from "../../components/LogisticsStepIndicator";
import { CameraCaptureModal } from "../../components/CameraCaptureModal";
import { api, ApiError } from "../../services/api";

type DocumentType =
  | "PROFILE_PHOTO"
  | "DRIVING_LICENCE_FRONT"
  | "DRIVING_LICENCE_BACK"
  | "VEHICLE_RC"
  | "VEHICLE_INSURANCE"
  | "PUC"
  | "TRANSPORT_PERMIT";

interface DocSlotConfig {
  type: DocumentType;
  title: string;
  description: string;
  instructions: string[];
  isSelfie?: boolean;
}

const ALL_SLOTS: Record<DocumentType, DocSlotConfig> = {
  PROFILE_PHOTO: {
    type: "PROFILE_PHOTO",
    title: "Profile Photo",
    description: "Clear front-facing portrait of yourself.",
    instructions: [
      "Front-facing photo in good lighting",
      "Face must be fully visible and centered",
      "No sunglasses, masks, or heavy obstruction",
      "Plain neutral background preferred",
    ],
    isSelfie: true,
  },
  DRIVING_LICENCE_FRONT: {
    type: "DRIVING_LICENCE_FRONT",
    title: "Driving Licence (Front Side)",
    description: "Front face of your active permanent driving licence.",
    instructions: [
      "Ensure licence number, name, and DOB are sharp",
      "All 4 corners of the card must be visible",
      "Avoid glare, shadows, and reflection",
    ],
  },
  DRIVING_LICENCE_BACK: {
    type: "DRIVING_LICENCE_BACK",
    title: "Driving Licence (Back Side)",
    description: "Back face showing vehicle endorsement categories and validity dates.",
    instructions: [
      "Ensure vehicle category stamp and issue authority are readable",
      "No cropped edges or blurry text",
    ],
  },
  VEHICLE_RC: {
    type: "VEHICLE_RC",
    title: "Vehicle Registration Certificate (RC)",
    description: "Valid RC card or digital RC for your delivery vehicle.",
    instructions: [
      "Vehicle registration number must be crisp",
      "Owner name and chassis/engine details visible",
    ],
  },
  VEHICLE_INSURANCE: {
    type: "VEHICLE_INSURANCE",
    title: "Vehicle Insurance Certificate",
    description: "Current active insurance policy document for your vehicle.",
    instructions: [
      "Policy number and validity period clearly visible",
      "Vehicle number on policy must match RC",
    ],
  },
  PUC: {
    type: "PUC",
    title: "Pollution Under Control (PUC)",
    description: "Valid government-issued emissions test certificate.",
    instructions: [
      "Test date and expiry date must be legible",
      "Emissions reading and vehicle number readable",
    ],
  },
  TRANSPORT_PERMIT: {
    type: "TRANSPORT_PERMIT",
    title: "Commercial Transport Permit / Fitness",
    description: "Commercial goods carriage permit or fitness certificate (for large transport).",
    instructions: [
      "National / State goods permit or Fitness certificate",
      "All validity stamps and tonnage limits legible",
    ],
  },
};

export function LogisticsRegisterStep2() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [workerType, setWorkerType] = useState<"BIKE" | "LARGE_TRUCK">("BIKE");
  const [documentsState, setDocumentsState] = useState<Record<string, any>>({});
  const [activeModalSlot, setActiveModalSlot] = useState<DocSlotConfig | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchOnboarding = async () => {
    try {
      setLoading(true);
      const res = await api<any>("/api/logistics/onboarding");
      setWorkerType(res.verification?.workerType || res.user?.deliveryType || "BIKE");

      const docMap: Record<string, any> = {};
      if (res.checklist) {
        for (const item of res.checklist) {
          docMap[item.documentType] = item;
        }
      }
      setDocumentsState(docMap);
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to load onboarding:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboarding();
  }, []);

  const requiredSlots: DocSlotConfig[] =
    workerType === "LARGE_TRUCK"
      ? [
          ALL_SLOTS.PROFILE_PHOTO,
          ALL_SLOTS.DRIVING_LICENCE_FRONT,
          ALL_SLOTS.DRIVING_LICENCE_BACK,
          ALL_SLOTS.VEHICLE_RC,
          ALL_SLOTS.VEHICLE_INSURANCE,
          ALL_SLOTS.PUC,
          ALL_SLOTS.TRANSPORT_PERMIT,
        ]
      : [
          ALL_SLOTS.PROFILE_PHOTO,
          ALL_SLOTS.DRIVING_LICENCE_FRONT,
          ALL_SLOTS.DRIVING_LICENCE_BACK,
          ALL_SLOTS.VEHICLE_RC,
          ALL_SLOTS.VEHICLE_INSURANCE,
          ALL_SLOTS.PUC,
        ];

  const handleUploadFile = async (type: DocumentType, file: File) => {
    setUploadingSlot(type);
    setUploadError(null);

    // Client-side pre-validations
    if (file.size < 5 * 1024) {
      setUploadError("The selected file is empty or too small. Please upload a clear original document.");
      setUploadingSlot(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10 MB limit. Please compress the file and try again.");
      setUploadingSlot(null);
      return;
    }

    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedMimes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
      setUploadError("Unsupported file format. Please upload JPG, PNG, WebP or PDF files only.");
      setUploadingSlot(null);
      return;
    }

    const formData = new FormData();
    formData.append("document", file);
    formData.append("documentType", type);

    try {
      const res = await api<any>("/api/logistics/documents", {
        method: "POST",
        body: formData,
      });

      // Update state
      setDocumentsState((prev) => ({
        ...prev,
        [type]: {
          documentType: type,
          uploaded: true,
          status: res.document.status,
          uploadedAt: res.document.uploadedAt,
          fileName: res.document.fileName,
          attempts: res.document.attempts,
          documentId: res.document.id,
        },
      }));

      setUploadingSlot(null);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err instanceof ApiError ? err.message : err.message || "Failed to upload document.");
      setUploadingSlot(null);
    }
  };

  const allUploaded = requiredSlots.every((slot) => documentsState[slot.type]?.uploaded);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900">
      <SiteNav />
      <div className="pt-20">
        <LogisticsStepIndicator currentStep={2} />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> Step 2: Verification Required
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Identity & Document Verification
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Your documents are required before you can start accepting deliveries on Farm2Fork.
          </p>
          <p className="mt-1 text-xs font-semibold text-emerald-700">
            Current Partner Profile: {workerType === "LARGE_TRUCK" ? "Large Transport (Trucks)" : "Delivery Agent (Bike / Small Vehicles)"}
          </p>
        </div>

        {uploadError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Upload failed</p>
              <p className="mt-0.5 text-xs text-rose-700">{uploadError}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {requiredSlots.map((slot) => {
                const docInfo = documentsState[slot.type];
                const isUploaded = !!docInfo?.uploaded;
                const isBusy = uploadingSlot === slot.type;

                return (
                  <div
                    key={slot.type}
                    className={`flex flex-col justify-between rounded-3xl border p-6 transition-all ${
                      isUploaded
                        ? "border-emerald-300 bg-white shadow-xs"
                        : "border-zinc-200 bg-white shadow-xs"
                    }`}
                  >
                    <div>
                      {/* Title & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isUploaded ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {slot.isSelfie ? <User className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900">{slot.title}</h3>
                            <p className="text-xs text-zinc-500">{slot.description}</p>
                          </div>
                        </div>

                        {isUploaded ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                            Required
                          </span>
                        )}
                      </div>

                      {/* Instructions */}
                      <ul className="mt-4 space-y-1 rounded-xl bg-zinc-50 p-3 text-[11px] text-zinc-600">
                        {slot.instructions.map((ins, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                            {ins}
                          </li>
                        ))}
                      </ul>

                      {docInfo?.fileName && (
                        <p className="mt-2 truncate text-xs text-zinc-500">
                          Saved: <span className="font-semibold text-zinc-700">{docInfo.fileName}</span>
                        </p>
                      )}
                    </div>

                    {/* Actions: Take Photo / Upload */}
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveModalSlot(slot)}
                        disabled={isBusy}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <Camera className="h-4 w-4 text-emerald-600" />
                        Take Photo
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[slot.type]?.click()}
                        disabled={isBusy}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4 text-emerald-600" />
                        Upload File
                      </button>

                      <input
                        type="file"
                        ref={(el) => { fileInputRefs.current[slot.type] = el; }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadFile(slot.type, f);
                          e.target.value = "";
                        }}
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                      />

                      {isBusy && (
                        <div className="flex w-full items-center justify-center gap-2 py-1 text-xs text-zinc-500">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                          Validating and storing securely...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs sm:flex-row">
              <div>
                <p className="text-sm font-bold text-zinc-900">
                  {allUploaded
                    ? "All required documents uploaded!"
                    : "Please upload all required documents above."}
                </p>
                <p className="text-xs text-zinc-500">
                  {allUploaded
                    ? "Click continue to run automated checks and submit for verification."
                    : "Every document is safely stored on authenticated backend storage."}
                </p>
              </div>

              <button
                type="button"
                disabled={!allUploaded}
                onClick={() => navigate("/logistics/register/verification")}
                className="flex items-center gap-2 rounded-2xl bg-emerald-700 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-50"
              >
                Continue to Step 3: Document Verification <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      {activeModalSlot && (
        <CameraCaptureModal
          isOpen={true}
          onClose={() => setActiveModalSlot(null)}
          title={`Capture ${activeModalSlot.title}`}
          isSelfie={activeModalSlot.isSelfie}
          onCapture={(file) => handleUploadFile(activeModalSlot.type, file)}
        />
      )}
    </div>
  );
}
