import React from "react";

export default function SubscriptionsSkeleton({ isArabic = true }) {
  return (
    <div className="space-y-6 sm:space-y-8 pb-20 max-w-2xl mx-auto" dir={isArabic ? "rtl" : "ltr"}>
      {/* Header Skeleton */}
      <div className="text-center pt-2 sm:pt-4 pb-2 space-y-3">
        <div className="h-8 sm:h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-2xl mx-auto animate-pulse" />
        <div className="h-4 w-80 max-w-full bg-slate-200 dark:bg-slate-800/80 rounded-xl mx-auto animate-pulse" />
      </div>

      {/* Main Plan Card Skeleton */}
      <div className="relative bg-slate-900/90 rounded-3xl sm:rounded-[32px] p-6 sm:p-10 border border-slate-800 overflow-hidden shadow-xl space-y-6">
        {/* Title & Badge */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-36 bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-4 w-48 bg-slate-800/70 rounded-lg animate-pulse" />
          </div>
          <div className="h-7 w-24 bg-slate-800 rounded-full animate-pulse" />
        </div>

        {/* Pricing Area */}
        <div className="space-y-2 pt-2">
          <div className="h-10 w-40 bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-3 w-28 bg-slate-800/60 rounded-md animate-pulse" />
        </div>

        {/* Billing Period Toggle Skeleton */}
        <div className="h-12 w-full max-w-[340px] bg-slate-800 rounded-full animate-pulse" />

        {/* Coupon Input Skeleton */}
        <div className="h-11 w-full max-w-[340px] bg-slate-800/80 rounded-xl animate-pulse" />

        {/* Action Button Skeleton */}
        <div className="h-14 w-full bg-indigo-600/30 rounded-2xl animate-pulse border border-indigo-500/20" />

        {/* Features Checklist Grid Skeleton */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="h-4 w-32 bg-slate-800 rounded-md animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-800 animate-pulse shrink-0" />
                <div className="h-3.5 bg-slate-800 rounded-md animate-pulse" style={{ width: `${60 + (i % 4) * 10}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

