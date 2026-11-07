import { ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

export default function PanelFooter({
  language = "ar",
  onOpenPolicies,
}) {
  const isAr = language === "ar";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-10 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-xs backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/30">
      <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 sm:flex-row">
        {/* Brand & Rights */}
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium">
            © {currentYear} Thenith • {isAr ? "جميع الحقوق محفوظة" : "All rights reserved"}
          </span>
        </div>

        {/* Clean Button opening policies right inside the panel */}
        <button
          type="button"
          onClick={onOpenPolicies}
          className="group inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-1.5 font-medium text-slate-600 shadow-2xs transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:text-indigo-400 cursor-pointer"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
          <span>{isAr ? "سياسة الاستخدام" : "Terms of Use"}</span>
          {isAr ? (
            <ChevronLeft className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:-translate-x-0.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
          )}
        </button>
      </div>
    </footer>
  );
}
