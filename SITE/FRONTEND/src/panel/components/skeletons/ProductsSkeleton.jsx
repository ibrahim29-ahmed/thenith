import React from "react";

export default function ProductsSkeleton({ isArabic = true }) {
  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      {/* Categories Bar Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse shrink-0"
          />
        ))}
      </div>

      {/* Product Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-sm overflow-hidden"
          >
            {/* Image Placeholder */}
            <div className="h-52 w-full rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse relative">
              <div className="absolute top-3 end-3 h-6 w-16 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse" />
            </div>

            {/* Title & Desc */}
            <div className="space-y-2 px-1">
              <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-3.5 w-1/2 bg-slate-200 dark:bg-slate-800/70 rounded-md animate-pulse" />
            </div>

            {/* Price & Action Button */}
            <div className="flex items-center justify-between pt-2 px-1 border-t border-slate-100 dark:border-slate-800">
              <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-10 w-28 bg-indigo-600/20 dark:bg-indigo-500/20 rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

