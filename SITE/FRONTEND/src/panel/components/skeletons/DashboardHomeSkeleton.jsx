import React from "react";

export default function DashboardHomeSkeleton({ isArabic = true }) {
  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      {/* 3 Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800/60 rounded-md animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Grid: Chart & Smart Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chart Skeleton (Col 8) */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-3.5 w-48 bg-slate-100 dark:bg-slate-800/70 rounded-md animate-pulse" />
            </div>
            <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
          {/* Chart Bars Skeleton */}
          <div className="h-64 w-full bg-slate-100 dark:bg-slate-800/40 rounded-2xl flex items-end justify-between p-4 gap-2">
            {[40, 65, 30, 85, 55, 90, 70, 45, 60, 75, 50, 80].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-t-lg animate-pulse"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* QR & Card Skeleton (Col 4) */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm space-y-5 text-center">
          <div className="h-5 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto animate-pulse" />
          {/* QR Box Placeholder */}
          <div className="w-44 h-44 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mx-auto animate-pulse flex items-center justify-center p-4">
            <div className="w-full h-full rounded-xl bg-slate-200 dark:bg-slate-700/60 animate-pulse" />
          </div>
          {/* Action buttons */}
          <div className="space-y-2">
            <div className="h-10 w-full bg-indigo-600/20 dark:bg-indigo-500/20 rounded-xl animate-pulse" />
            <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

