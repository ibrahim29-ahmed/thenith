import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function GuestRoute({ children }) {
  const { isAuthenticated, user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-bold">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get("ref");
    if (refCode) {
      const cleanRef = refCode.trim().toUpperCase();
      return <Navigate to={`/r/${encodeURIComponent(cleanRef)}`} replace />;
    }

    const rawReturnTo = searchParams.get("returnTo");
    const isSafeReturnTo =
      rawReturnTo &&
      rawReturnTo.startsWith("/") &&
      !rawReturnTo.startsWith("//") &&
      !rawReturnTo.includes(":");

    const targetFrom = location.state?.from?.pathname;
    const defaultTarget = user?.publicId ? `/u/${user.publicId}` : "/u";
    const from =
      targetFrom && targetFrom !== "/"
        ? targetFrom
        : isSafeReturnTo && rawReturnTo !== "/"
          ? rawReturnTo
          : defaultTarget;

    return <Navigate to={from} replace />;
  }

  return children;
}
