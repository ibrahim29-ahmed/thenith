import AppRoutes from "./routes/AppRoutes.jsx";
import { SiteSettingsProvider } from "./context/SiteSettingsContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { GlobalLanguageProvider } from "./context/GlobalLanguageContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import SupportWidget from "./components/SupportWidget.jsx";
import { Toaster, toast, useToasterStore } from "react-hot-toast";
import ServerHealthGuard from "./components/ServerHealthGuard.jsx";
import { useEffect } from "react";


// --- Toast Limiter Component (Max 4) ---
function ToastManager() {
  const { toasts } = useToasterStore();
  
  useEffect(() => {
    const visibleToasts = toasts.filter((t) => t.visible);
    if (visibleToasts.length > 4) {
      // Dismiss the oldest toasts keeping only the latest 4
      const toastsToDismiss = visibleToasts.slice(4);
      toastsToDismiss.forEach((t) => toast.dismiss(t.id));
    }
  }, [toasts]);
  
  return null;
}

// --- Global Single Support Toast for Public Pages ---
function GlobalSupportToast() {
  useEffect(() => {
    const handleSupportNewMessage = () => {
      // If user is inside dashboard /u/ or public wallet redirect /pay/ or /m/
      const path = window.location.pathname;
      if (path.startsWith("/u/") || path.startsWith("/pay") || path.startsWith("/m")) return;

      const isAr = document.documentElement.dir === "rtl" || document.documentElement.lang === "ar";

      toast.custom(
        (t) => (
          <div
            dir={isAr ? "rtl" : "ltr"}
            className={`pointer-events-auto transition-all duration-300 transform ${
              t.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"
            }`}
            style={{ marginTop: "16px" }}
          >
            <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-full bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md shadow-xl border border-white/10 ring-1 ring-black/10 font-sans">
              <span className="text-sm font-semibold tracking-wide">
                {isAr ? "رسالة جديدة من الدعم الفني" : "New message from Support"}
              </span>
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t.id);
                  window.dispatchEvent(new CustomEvent("open-support-widget"));
                }}
                className="px-3.5 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all shrink-0 shadow-sm"
              >
                {isAr ? "الذهاب للرسالة" : "Go to message"}
              </button>
            </div>
          </div>
        ),
        {
          id: "support-message-alert",
          duration: 7000,
          position: "top-center",
        }
      );
    };

    window.addEventListener("support-new-message", handleSupportNewMessage);
    return () => window.removeEventListener("support-new-message", handleSupportNewMessage);
  }, []);

  return null;
}

export default function App() {
  return (
    <GlobalLanguageProvider>
      <ServerHealthGuard>
        <SiteSettingsProvider>
          <AuthProvider>
            <CartProvider>
              <Toaster
                position="top-center"
                toastOptions={{
                  className: "glass-toast",
                  error: { className: "glass-toast glass-toast-error" },
                  ariaProps: { role: "alert", "aria-live": "assertive" },
                }}
              />
              <ToastManager />
              <GlobalSupportToast />
              <SupportWidget />
              <AppRoutes />
            </CartProvider>
          </AuthProvider>
        </SiteSettingsProvider>
      </ServerHealthGuard>
    </GlobalLanguageProvider>
  );
}
