import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
const Dashboard = lazy(() => import("./components/Dashboard.jsx"));
const Auth = lazy(() => import("./components/auth/Auth.jsx"));
import { LanguageProvider, useLanguage } from "./hooks/useLanguage.jsx";
import { ThemeProvider } from "./hooks/useTheme.jsx";
import { ConfirmProvider } from "./context/ConfirmContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { deleteAccount } from "./services/authApi.js";
import toast from "react-hot-toast";
import { getLocalizedErrorMessage } from "../utils/errorHandling.js";

function AppContent({ forceMode }) {
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    isAuthenticated,
    user,
    isInitializing,
    handleLogin: authLogin,
    handleLogout: authLogout,
    refreshSession,
  } = useAuth();

  useEffect(() => {
    const path = location.pathname;
    if (isAuthenticated) {
      if (path === "/panel" || path === "/panel/") {
        navigate(`/u${location.search || ""}`, { replace: true });
      } else if (path.startsWith("/panel/")) {
        const sub = path.replace(/^\/panel\//, "");
        navigate(`/u/${sub}${location.search || ""}`, { replace: true });
      }
    }
  }, [
    isAuthenticated,
    location.pathname,
    location.search,
    navigate,
  ]);

  // ─── Called by Auth component after successful login ─────────────────────
  const handleLogin = (userData) => {
    authLogin(userData);
    const publicId = userData?.publicId;
    const fromState = location.state?.from;
    const fromPath = typeof fromState === "string" ? fromState : fromState?.pathname;
    const fromSearch = fromState?.search || "";
    const from = fromPath ? `${fromPath}${fromSearch}` : null;

    const searchParams = new URLSearchParams(location.search);
    const rawReturnTo = searchParams.get("returnTo");
    const isSafeReturnTo =
      rawReturnTo &&
      rawReturnTo.startsWith("/") &&
      !rawReturnTo.startsWith("//") &&
      !rawReturnTo.includes(":");

    if (from && (from.startsWith("/u/") || from.startsWith("/panel"))) {
      navigate(from, { replace: true });
    } else if (isSafeReturnTo) {
      navigate(rawReturnTo, { replace: true });
    } else if (publicId) {
      navigate(`/u/${publicId}${location.search || ""}`, { replace: true });
    } else {
      refreshSession().then((session) => {
        if (session?.user?.publicId) {
          navigate(`/u/${session.user.publicId}`, { replace: true });
        }
      });
    }
  };

  const handleLogout = async () => {
    await authLogout();
    navigate("/", { replace: true });
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      await authLogout();
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(getLocalizedErrorMessage(error, language));
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isInitializing) {
    return <LoadingScreen label={t("loading")} />;
  }

  return (
    <ConfirmProvider>
      <Suspense fallback={<LoadingScreen label={t("loading")} />}>
        {!isAuthenticated ? (
          <Auth
            t={t}
            language={language}
            onLogin={handleLogin}
            forceMode={forceMode}
          />
        ) : (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </Suspense>
    </ConfirmProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#03070c] p-3 sm:p-6 space-y-5 animate-pulse" dir="rtl">
      {/* Top Header Bar Skeleton */}
      <div className="h-16 w-full max-w-7xl mx-auto rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-6">
        <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* Main Grid: Sidebar + Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        <div className="hidden lg:block lg:col-span-3 h-[480px] rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
          ))}
        </div>
        <div className="lg:col-span-9 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-28 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 p-4" />
            <div className="h-28 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 p-4" />
            <div className="h-28 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 p-4" />
          </div>
          <div className="h-72 rounded-3xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60" />
        </div>
      </div>
    </div>
  );
}

export default function App({ forceMode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent forceMode={forceMode} />
      </LanguageProvider>
    </ThemeProvider>
  );
}
