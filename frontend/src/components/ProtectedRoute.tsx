import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useApp } from "../context/AppState";
import type { UserRole } from "../types";
import { homeForRole, isRole, readSession } from "../lib/routes";

export function ProtectedRoute({
  role,
  children,
}: {
  role?: UserRole | UserRole[];
  children: ReactNode;
}) {
  const { user } = useApp();
  const location = useLocation();
  const session = user || readSession();

  if (!session) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }
  if (!isRole(session, role)) {
    return <Navigate to={homeForRole(session.role)} replace />;
  }
  return children;
}
