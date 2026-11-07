import React from "react";

export default function PoliciesSkeleton({ isArabic = true }) {
  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      {/* Banner Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800/90 dark:bg-slate-900/70 p-6 space-y-3">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/70 rounded-lg animate-pulse" />
      </div>

      {/* Sections Skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/80 dark:bg-slate-900/50 p-6 space-y-3"
          >
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded-md animate-pulse" />
            <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-800/60 rounded-md animate-pulse" />
            <div className="h-4 w-4/6 bg-slate-100 dark:bg-slate-800/60 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

