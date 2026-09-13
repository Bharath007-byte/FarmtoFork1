import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppState";
import { api } from "../services/api";
import { readSession } from "../lib/routes";

interface VerificationStatusResponse {
  status: "INCOMPLETE" | "DOCUMENTS_UPLOADED" | "PENDING_REVIEW" | "ACTION_REQUIRED" | "VERIFIED" | "APPROVED" | "REJECTED";
  currentStep: number;
  canAccessDashboard: boolean;
  rejectionReason?: string | null;
}

export function LogisticsGuard({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const session = user || readSession();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<VerificationStatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      if (!session || session.role !== "logistics") {
        setLoading(false);
        return;
      }

      try {
        const res = await api<VerificationStatusResponse>("/api/logistics/verification-status");
        if (!cancelled) {
          setStatusData(res);
          setLoading(false);
        }
      } catch (err) {
        console.warn("Logistics verification check error:", err);
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (session.role !== "logistics") {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafaf9] text-zinc-500">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Checking logistics verification...
        </p>
      </div>
    );
  }

  // If approved or verified, allow access to logistics dashboard
  if (statusData?.canAccessDashboard || statusData?.status === "APPROVED" || statusData?.status === "VERIFIED") {
    return <>{children}</>;
  }

  // Otherwise redirect to appropriate onboarding step without creating loops
  const step = statusData?.currentStep || 1;
  if (step <= 1) {
    return <Navigate to="/logistics/register" replace />;
  }
  if (step === 2) {
    return <Navigate to="/logistics/register/documents" replace />;
  }
  if (step === 3) {
    return <Navigate to="/logistics/register/verification" replace />;
  }
  if (step === 4) {
    return <Navigate to="/logistics/register/status" replace />;
  }
  if (step === 5) {
    return <Navigate to="/logistics/register/vehicle" replace />;
  }
  return <Navigate to="/logistics/register/approval" replace />;
}
