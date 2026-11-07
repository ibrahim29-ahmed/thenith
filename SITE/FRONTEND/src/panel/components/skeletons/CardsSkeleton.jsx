import React from "react";

export default function CardsSkeleton({ isArabic = true }) {
  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      {/* Top Toggle & Add Button Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="h-12 w-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        <div className="h-12 w-36 bg-indigo-600/20 dark:bg-indigo-500/20 rounded-2xl animate-pulse" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-4"
          >
            {/* Card Header & Avatar */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-3.5 w-48 bg-slate-100 dark:bg-slate-800/70 rounded-md animate-pulse" />
              </div>
            </div>

            {/* Links / Contact icons preview */}
            <div className="flex gap-2 pt-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="h-10 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

