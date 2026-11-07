import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Clock,
  Loader2,
} from "lucide-react";
import { publicClient } from "../../../api/client.js";
import PoliciesSkeleton from "../skeletons/PoliciesSkeleton.jsx";

export default function PanelPoliciesPage({
  t,
  language = "ar",
  policies: passedPolicies = [],
  selectedSlug = "",
  onSelectPolicy,
}) {
  const isAr = language === "ar";
  const [policiesList, setPoliciesList] = useState(passedPolicies || []);
  const [loadingList, setLoadingList] = useState(!passedPolicies || passedPolicies.length === 0);
  const [activeSlug, setActiveSlug] = useState(selectedSlug || "");
  const [policyCache, setPolicyCache] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getLoc = (val) => {
    if (typeof val === "object" && val !== null) {
      return val[language] || val.ar || val.en || "";
    }
    return val || "";
  };

  // 1. Fetch policy navigation list
  useEffect(() => {
    let mounted = true;
    publicClient
      .get("/policies")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data?.policies) ? res.data.policies : [];
        setPoliciesList(list);

        if (list.length > 0 && !activeSlug) {
          const initialSlug = selectedSlug || (() => {
            const termsPolicy =
              list.find(
                (p) =>
                  p.slug?.includes("term") ||
                  p.slug?.includes("use") ||
                  p.slug?.includes("condition")
              ) || list[0];
            return termsPolicy?.slug || list[0]?.slug || "";
          })();
          setActiveSlug(initialSlug);
          if (onSelectPolicy && initialSlug) onSelectPolicy(initialSlug);
        }
      })
      .catch((err) => {
        console.error("Failed to load policies list:", err);
      })
      .finally(() => {
        if (mounted) setLoadingList(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Sync when selectedSlug changes from parent sidebar
  useEffect(() => {
    if (selectedSlug && selectedSlug !== activeSlug) {
      setActiveSlug(selectedSlug);
    }
  }, [selectedSlug]);

  // 2. Fetch full policy details (including sections) when activeSlug changes
  useEffect(() => {
    if (!activeSlug) return;
    if (policyCache[activeSlug]) return; // already loaded in cache

    let mounted = true;
    setLoadingDetails(true);

    publicClient
      .get(`/policies/${activeSlug}`)
      .then((res) => {
        if (!mounted) return;
        if (res.data?.policy) {
          setPolicyCache((prev) => ({
            ...prev,
            [activeSlug]: res.data.policy,
          }));
        }
      })
      .catch((err) => {
        console.error(`Failed to load policy details for ${activeSlug}:`, err);
      })
      .finally(() => {
        if (mounted) setLoadingDetails(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeSlug, policyCache]);

  const handleSlugChange = (slug) => {
    setActiveSlug(slug);
    if (onSelectPolicy) onSelectPolicy(slug);
  };

  const fallbackSummary = policiesList.find((p) => p.slug === activeSlug);
  const activePolicy = policyCache[activeSlug] || fallbackSummary;

  if (loadingList) {
    return <PoliciesSkeleton isArabic={isAr} />;
  }

  if (!policiesList || policiesList.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white/60 p-8 text-center text-slate-500 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-400">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-indigo-500 opacity-60" />
        <h3 className="text-base font-black text-slate-800 dark:text-white">
          {isAr ? "لا توجد سياسات منشورة حالياً" : "No published policies available"}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {isAr ? "سيتم عرض سياسات المنصة والشروط فور نشرها." : "Platform terms and policies will appear here."}
        </p>
      </div>
    );
  }

  const activeTitle = getLoc(activePolicy?.title);
  const activeDesc = getLoc(activePolicy?.description);
  const sections = activePolicy?.sections || [];

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* ── Page Header Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/90 dark:bg-slate-900/70 sm:p-7">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-2xl">
              {activeTitle}
            </h1>
            {activeDesc && (
              <p className="max-w-2xl text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                {activeDesc}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-start text-xs font-medium text-slate-400 dark:text-slate-500 sm:self-auto">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {isAr
                ? `آخر تحديث: ${new Date(activePolicy?.updatedAt || Date.now()).toLocaleDateString("ar-EG-u-nu-latn", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}`
                : `Updated: ${new Date(activePolicy?.updatedAt || Date.now()).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content Sections ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlug}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {loadingDetails && !policyCache[activeSlug] ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-slate-200/80 bg-white/60 p-8 dark:border-slate-800/80 dark:bg-slate-900/40">
              <div className="flex flex-col items-center gap-2.5">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs text-slate-400">
                  {isAr ? "جاري تحميل محتوى السياسة..." : "Loading content..."}
                </p>
              </div>
            </div>
          ) : sections.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white/60 p-8 text-center text-slate-400 dark:border-slate-800/80 dark:bg-slate-900/40">
              {isAr ? "لم يتم إضافة أقسام لهذه السياسة بعد." : "No sections added to this policy yet."}
            </div>
          ) : (
            sections.map((section, idx) => {
              const heading = getLoc(section.heading);
              const content = getLoc(section.content);

              return (
                <article
                  key={section._id || idx}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/90 dark:bg-slate-900/60 sm:p-7 overflow-hidden break-words"
                >
                  {heading && (
                    <h3 className="mb-3.5 flex items-center gap-2.5 text-base font-black text-slate-900 dark:text-white sm:text-lg">
                      <span className="h-5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500 shrink-0" />
                      <span>{heading}</span>
                    </h3>
                  )}

                  <div
                    className="prose dark:prose-invert max-w-none text-xs font-normal leading-relaxed text-slate-700 dark:text-slate-300 sm:text-sm [&_a]:text-indigo-600 dark:[&_a]:text-indigo-400 [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-s-4 [&_blockquote]:border-indigo-500 [&_blockquote]:bg-slate-50 dark:[&_blockquote]:bg-slate-800/40 [&_blockquote]:p-3.5 [&_blockquote]:rounded-r-xl [&_blockquote]:text-slate-600 dark:[&_blockquote]:text-slate-300 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:mb-3 [&_strong]:font-bold [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-6"
                    dangerouslySetInnerHTML={{ __html: content || "" }}
                  />
                </article>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
