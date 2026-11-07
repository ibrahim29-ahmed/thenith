import React from "react";

export default function SupportSkeleton({ isArabic = true }) {
  return (
    <div
      className="font-sans relative flex h-[min(72vh,760px)] min-h-[460px] w-full flex-col overflow-hidden rounded-2xl border border-white/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/80 shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl animate-in fade-in duration-200"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Header Skeleton */}
      <div className="bg-gradient-to-b from-white/80 to-transparent dark:from-slate-800/80 dark:to-transparent px-6 pt-5 pb-6 flex flex-col shrink-0 border-b border-slate-100/60 dark:border-slate-800/60">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse mt-1" />
            <div className="h-4 w-36 bg-slate-100 dark:bg-slate-800/60 rounded-md animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Chat Area Skeleton */}
      <div className="flex-1 p-6 space-y-4 overflow-hidden flex flex-col justify-end">
        {/* Date pill */}
        <div className="flex justify-center mb-2">
          <div className="h-5 w-28 bg-slate-200/70 dark:bg-slate-800/70 rounded-full animate-pulse" />
        </div>

        {/* Message 1 (Admin - Start) */}
        <div className="flex justify-start w-full">
          <div className="max-w-[75%] p-4 rounded-[20px] rounded-ss-[4px] bg-slate-200/80 dark:bg-slate-800/80 space-y-2 border border-slate-200/60 dark:border-slate-700/40 shadow-sm animate-pulse w-72">
            <div className="h-4 w-5/6 bg-slate-300 dark:bg-slate-700 rounded-md" />
            <div className="h-3 w-1/2 bg-slate-300/70 dark:bg-slate-700/60 rounded-md" />
          </div>
        </div>

        {/* Message 2 (User - End) */}
        <div className="flex justify-end w-full">
          <div className="max-w-[70%] p-4 rounded-[20px] rounded-se-[4px] bg-slate-800/90 dark:bg-slate-700/80 space-y-2 shadow-sm animate-pulse w-56">
            <div className="h-4 w-4/5 bg-slate-600 dark:bg-slate-600 rounded-md" />
            <div className="h-3 w-2/5 bg-slate-600/60 dark:bg-slate-600/50 rounded-md" />
          </div>
        </div>

        {/* Message 3 (Admin - Start) */}
        <div className="flex justify-start w-full">
          <div className="max-w-[65%] p-4 rounded-[20px] rounded-ss-[4px] bg-slate-200/80 dark:bg-slate-800/80 space-y-2 border border-slate-200/60 dark:border-slate-700/40 shadow-sm animate-pulse w-60">
            <div className="h-4 w-3/4 bg-slate-300 dark:bg-slate-700 rounded-md" />
          </div>
        </div>
      </div>

      {/* Input Skeleton */}
      <div className="p-4 bg-white/70 dark:bg-slate-800/70 border-t border-slate-100 dark:border-slate-800/60">
        <div className="h-12 w-full rounded-2xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/40 flex items-center justify-between px-4 animate-pulse">
          <div className="h-4 w-40 bg-slate-300/80 dark:bg-slate-700 rounded-md" />
          <div className="h-8 w-8 rounded-xl bg-slate-300 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

