import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Upload,
  Camera,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { SiteNav } from "../../components/SiteNav";
import { LogisticsStepIndicator } from "../../components/LogisticsStepIndicator";
import { CameraCaptureModal } from "../../components/CameraCaptureModal";
import { api, ApiError } from "../../services/api";

export function LogisticsRegisterStep4() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [reuploadingDocId, setReuploadingDocId] = useState<string | null>(null);
  const [cameraModalDoc, setCameraModalDoc] = useState<any | null>(null);
  const [reuploadError, setReuploadError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedDocForUpload, setSelectedDocForUpload] = useState<any | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api<any>("/api/logistics/onboarding");
      setChecklist(res.checklist || []);
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to load verification status:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleReupload = async (documentId: string, file: File) => {
    setReuploadingDocId(documentId);
    setReuploadError(null);
    setActionSuccess(null);

    const formData = new FormData();
    formData.append("document", file);

    try {
      await api<any>(`/api/logistics/documents/${documentId}/reupload`, {
        method: "POST",
        body: formData,
      });

      setActionSuccess("Document successfully re-uploaded! Status updated to Pending Review.");
      setReuploadingDocId(null);
      fetchStatus();
    } catch (err: any) {
      console.error("Re-upload error:", err);
      setReuploadError(err instanceof ApiError ? err.message : err.message || "Failed to re-upload document.");
      setReuploadingDocId(null);
    }
  };

  const hasRejections = checklist.some(
    (item) => item.status === "REJECTED" || item.status === "REUPLOAD_REQUIRED"
  );
  const allVerified = checklist.length > 0 && checklist.every((item) => item.status === "VERIFIED");

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900">
      <SiteNav />
      <div className="pt-20">
        <LogisticsStepIndicator currentStep={4} />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> Step 4: Verification Status
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Verification Status
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Track the approval status of each submitted credential and address required actions.
          </p>
        </div>

        {/* Global Status Banner */}
        {hasRejections ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">Action Required</p>
              <p className="mt-0.5 text-xs text-rose-700 leading-relaxed">
                One or more documents were rejected or require a clearer replacement by the verification reviewer. Please inspect the feedback below and upload a corrected copy. You do not need to restart registration.
              </p>
            </div>
          </div>
        ) : allVerified ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold">Verification Complete</p>
              <p className="mt-0.5 text-xs text-emerald-700">
                All uploaded documents have been approved by our administrative verification team. You may proceed to enter your vehicle specifications.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold">Documents Under Review</p>
              <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
                Your documents have been submitted to our operations verification team. You cannot accept delivery dispatches until verification is approved. Meanwhile, you can proceed to register your vehicle details.
              </p>
            </div>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
            {actionSuccess}
          </div>
        )}

        {reuploadError && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
            {reuploadError}
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {checklist.map((item) => {
              const isRejected = item.status === "REJECTED" || item.status === "REUPLOAD_REQUIRED";
              const isVerified = item.status === "VERIFIED";
              const isBusy = reuploadingDocId === item.documentId;

              return (
                <div
                  key={item.documentType}
                  className={`rounded-2xl border p-5 transition-all ${
                    isRejected
                      ? "border-rose-300 bg-rose-50/40"
                      : isVerified
                      ? "border-emerald-200 bg-white"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isRejected
                            ? "bg-rose-100 text-rose-700"
                            : isVerified
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">{item.label}</h3>
                        {item.attempts > 1 && (
                          <p className="text-[11px] font-semibold text-zinc-500">
                            Submission Attempt #{item.attempts}
                          </p>
                        )}
                        {item.uploadedAt && (
                          <p className="text-[11px] text-zinc-400">
                            Uploaded on: {new Date(item.uploadedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                          <XCircle className="h-3.5 w-3.5" /> Action Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          <Clock className="h-3.5 w-3.5" /> Pending Review
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rejection / Reviewer Feedback */}
                  {isRejected && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-white p-3.5">
                      <p className="text-xs font-bold text-rose-900">Reviewer Reason / Required Correction:</p>
                      <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                        {item.rejectionReason || "Please upload a clearer and valid replacement document."}
                      </p>

                      {/* Re-upload Controls */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCameraModalDoc(item)}
                          disabled={isBusy}
                          className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Take New Photo
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocForUpload(item);
                            fileInputRef.current?.click();
                          }}
                          disabled={isBusy}
                          className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload Replacement File
                        </button>

                        {isBusy && (
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                            Uploading...
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Hidden generic file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && selectedDocForUpload) {
                  handleReupload(selectedDocForUpload.documentId, f);
                }
                e.target.value = "";
              }}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
            />

            {/* Bottom Actions */}
            <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs sm:flex-row">
              <div>
                <p className="text-sm font-bold text-zinc-900">
                  {hasRejections
                    ? "Action required on rejected documents"
                    : "Proceed to Vehicle Registration"}
                </p>
                <p className="text-xs text-zinc-500">
                  {hasRejections
                    ? "Fix rejected documents above, or continue entering your vehicle specifications."
                    : "Enter vehicle specs to complete your logistics profile."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/logistics/register/vehicle")}
                className="flex items-center gap-2 rounded-2xl bg-emerald-700 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800"
              >
                Continue to Step 5: Vehicle Details <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Camera Capture Modal for Re-uploads */}
      {cameraModalDoc && (
        <CameraCaptureModal
          isOpen={true}
          onClose={() => setCameraModalDoc(null)}
          title={`Retake ${cameraModalDoc.label}`}
          isSelfie={cameraModalDoc.documentType === "PROFILE_PHOTO"}
          onCapture={(file) => {
            handleReupload(cameraModalDoc.documentId, file);
            setCameraModalDoc(null);
          }}
        />
      )}
    </div>
  );
}
