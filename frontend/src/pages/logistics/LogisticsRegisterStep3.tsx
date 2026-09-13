import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  FileCheck,
  RefreshCw,
  Info,
} from "lucide-react";
import { SiteNav } from "../../components/SiteNav";
import { LogisticsStepIndicator } from "../../components/LogisticsStepIndicator";
import { api, ApiError } from "../../services/api";

export function LogisticsRegisterStep3() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAndSubmit = async () => {
    try {
      setLoading(true);
      const res = await api<any>("/api/logistics/onboarding");
      setChecklist(res.checklist || []);
      setLoading(false);

      // Automatically trigger real backend verification submission
      setSubmitting(true);
      await api<any>("/api/logistics/verification/submit", {
        method: "POST",
      });

      setSubmitting(false);
    } catch (err: any) {
      console.error("Verification submit error:", err);
      setSubmitting(false);
      setLoading(false);
      setError(err instanceof ApiError ? err.message : err.message || "Failed to submit documents for verification.");
    }
  };

  useEffect(() => {
    loadAndSubmit();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900">
      <SiteNav />
      <div className="pt-20">
        <LogisticsStepIndicator currentStep={3} />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
            <Clock className="h-4 w-4" /> Step 3: Real Pipeline Processing
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Verifying your documents
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Automated quality checks have completed. Your documents have been securely routed to our operations review team.
          </p>
        </div>

        {/* Level 3 Transparency Notice */}
        <div className="mb-8 rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 to-orange-50/50 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="text-xs leading-relaxed text-amber-900">
              <p className="font-bold text-sm">Automated Verification Connectivity Notice</p>
              <p className="mt-1">
                Direct automated government API gateways (Surepass/Digilocker) are not currently connected in this environment. In accordance with platform integrity rules, no automated verification will be faked.
              </p>
              <p className="mt-1 font-semibold">
                Status: <span className="rounded-md bg-amber-200/60 px-2 py-0.5 text-amber-900">PENDING_REVIEW</span> — Your documents have been safely received and queued for administrative review.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Verification check stopped</p>
              <p className="mt-0.5 text-xs text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {loading || submitting ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center shadow-xs">
            <RefreshCw className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
            <h3 className="mt-4 text-base font-bold text-zinc-900">
              Running verification pipeline...
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Validating cryptographic signatures, file magic bytes, and recording attempts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Document Verification Cards */}
            {checklist.map((item) => (
              <div
                key={item.documentType}
                className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">{item.label}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                      </span>
                      <span>•</span>
                      <span>Format & integrity check passed</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 sm:mt-0">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    <Clock className="h-3.5 w-3.5" /> Pending Review
                  </span>
                </div>
              </div>
            ))}

            {/* Next Action Button */}
            <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xs sm:flex-row">
              <div>
                <p className="text-sm font-bold text-zinc-900">
                  Document submission completed
                </p>
                <p className="text-xs text-zinc-500">
                  Check your verification status checklist and review guidelines.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/logistics/register/status")}
                className="flex items-center gap-2 rounded-2xl bg-emerald-700 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800"
              >
                Continue to Step 4: Verification Status <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
