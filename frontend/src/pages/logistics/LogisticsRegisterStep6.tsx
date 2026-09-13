import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  LayoutDashboard,
  FileText,
  Sparkles,
} from "lucide-react";
import { SiteNav } from "../../components/SiteNav";
import { LogisticsStepIndicator } from "../../components/LogisticsStepIndicator";
import { api } from "../../services/api";

export function LogisticsRegisterStep6() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any | null>(null);

  const fetchStatus = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await api<any>("/api/logistics/onboarding");
      setData(res);
      setLoading(false);
      setRefreshing(false);
    } catch (err: any) {
      console.error("Failed to load approval status:", err);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-poll status every 12 seconds while on approval page
    const timer = setInterval(() => {
      fetchStatus(true);
    }, 12000);

    return () => clearInterval(timer);
  }, []);

  const status = data?.verification?.status || "INCOMPLETE";
  const isApproved = status === "APPROVED" || status === "VERIFIED";
  const isActionRequired = status === "ACTION_REQUIRED";
  const isRejected = status === "REJECTED";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900">
      <SiteNav />
      <div className="pt-20">
        <LogisticsStepIndicator currentStep={6} />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> Final Step: Administrative Review
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Account Approval Status
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            All onboarding steps completed. Final platform activation is enforced by backend administrators.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : isApproved ? (
          /* State 1: APPROVED */
          <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-lg">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-center text-white">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="mt-4 text-2xl font-bold">Congratulations! You're Approved!</h2>
              <p className="mt-1 text-xs text-emerald-100">
                Your credentials and vehicle documents have been officially verified by Farm2Fork administrators.
              </p>
            </div>

            <div className="p-6">
              <div className="rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-800">
                <p className="font-bold text-sm">Dashboard Access Unlocked</p>
                <p className="mt-1 leading-relaxed">
                  You are now authorized to view active pickup bookings, accept society-to-consumer batches, and track deliveries in real-time.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/logistics")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Enter Logistics Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : isActionRequired ? (
          /* State 2: ACTION REQUIRED */
          <div className="overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-md">
            <div className="bg-rose-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 shrink-0 text-white" />
                <div>
                  <h2 className="text-xl font-bold">Action Required On Your Application</h2>
                  <p className="text-xs text-rose-100">
                    A reviewer flagged one or more documents for correction.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs font-bold text-rose-900">Admin Feedback:</p>
                <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                  {data?.verification?.rejectionReason || "Please re-upload a clearer copy of your rejected document."}
                </p>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => navigate("/logistics/register/status")}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white shadow-md hover:bg-rose-700"
                >
                  <FileText className="h-4 w-4" />
                  Open Document Checklist & Fix Now
                </button>
              </div>
            </div>
          </div>
        ) : isRejected ? (
          /* State 3: REJECTED */
          <div className="overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-md">
            <div className="bg-zinc-900 p-6 text-white">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 shrink-0 text-rose-500" />
                <div>
                  <h2 className="text-xl font-bold">Application Not Approved</h2>
                  <p className="text-xs text-zinc-400">
                    Your logistics partner application was declined.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-2xl bg-zinc-100 p-4 text-xs text-zinc-700">
                <p className="font-bold">Reason for decision:</p>
                <p className="mt-1 leading-relaxed">
                  {data?.verification?.rejectionReason || "Credentials did not satisfy platform onboarding standards."}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/logistics/register")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
                >
                  Re-apply With Updated Information
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* State 4: PENDING REVIEW (Standard awaiting admin review) */
          <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
            <div className="border-b border-amber-100 bg-amber-50/70 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-amber-950">Application In Review Queue</h2>
                  <p className="text-xs text-amber-800">
                    Our operations verification team is validating your documents and vehicle specifications.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-600">
                <p className="font-bold text-zinc-900">What happens next?</p>
                <ul className="mt-2 space-y-1.5 leading-relaxed">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    An authorized administrator inspects your driving licence and vehicle RC.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    Once approved, your dashboard will automatically unlock.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    You cannot claim or accept delivery orders until approved.
                  </li>
                </ul>
              </div>

              <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => fetchStatus(true)}
                  disabled={refreshing}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
                  {refreshing ? "Checking status..." : "Check Status Now"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/logistics/register/status")}
                  className="flex w-full items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline sm:w-auto"
                >
                  View Document Checklist <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
