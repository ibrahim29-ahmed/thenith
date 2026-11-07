import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Share2,
  Wallet,
  Smartphone,
  Info,
  ArrowRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { publicClient } from "../api/client.js";

const WALLET_LOGOS = {
  vodafone_cash: "/wallets/vodafone-cash.png",
  instapay: "/wallets/instapay.png",
  orange_cash: "/wallets/orange-cash.png",
  etisalat_cash: "/wallets/etisalat-cash.png",
  we_pay: "/wallets/we-pay.png",
};

const WALLET_NAMES = {
  vodafone_cash: { ar: "فودافون كاش", en: "Vodafone Cash" },
  instapay: { ar: "انستاباي", en: "Instapay" },
  orange_cash: { ar: "أورنج كاش", en: "Orange Cash" },
  etisalat_cash: { ar: "اتصالات كاش", en: "Etisalat Cash" },
  we_pay: { ar: "وي باي", en: "WE Pay" },
};

const APP_NAMES = {
  vodafone_cash: "Ana Vodafone",
  instapay: "InstaPay",
  orange_cash: "My Orange",
  etisalat_cash: "My Etisalat",
  we_pay: "My WE",
};

export default function WalletRedirectPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract identifier from params or pathname (supports /pay/:identifier and /m/:identifier)
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const identifier =
    params.identifier ||
    (["m", "pay"].includes(pathParts[0]?.toLowerCase())
      ? pathParts[1]
      : pathParts[0]) ||
    "";
  const payParam = searchParams.get("pay") || "";
  // Track whether visitor arrived directly via a single payment method link
  const [isDirectSingleLink] = useState(() => Boolean(searchParams.get("pay")));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    if (!identifier) {
      setError("الرابط غير صالح، لم يتم تحديد المستفيد");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    publicClient
      .get(`/public/wallet/${encodeURIComponent(identifier)}`, {
        params: payParam ? { pay: payParam } : {},
      })
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success) {
          setData(res.data);
          // If a specific pay query is provided, or if not entitled to unified hub, or only 1 method:
          // automatically open the target primary method directly!
          if (
            (payParam ||
              res.data.canAccessUnifiedHub === false ||
              res.data.allMethods?.length <= 1) &&
            res.data.method?.id
          ) {
            setSelectedMethodId(res.data.method.id);
          } else {
            setSelectedMethodId(null);
          }
        } else {
          setError(res.data?.message || "تعذر العثور على وسيلة الدفع المطلوبة");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "تعذر العثور على حساب المستفيد أو المحفظة المطلوبة",
        );
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [identifier, payParam]);

  const user = data?.user;
  const panelConfig = data?.panelConfig;
  const allMethods = data?.allMethods || [];
  const currentMethod = allMethods.find((m) => m.id === selectedMethodId);

  // Show "العودة لجميع وسائل الدفع" only if user opened the hub with multiple methods,
  // is entitled to the unified hub, and navigated into this method (NOT when opening a direct single-method link)
  const canAccessHub = data?.canAccessUnifiedHub !== false;
  const showBackToAll = canAccessHub && !isDirectSingleLink && allMethods.length > 1;

  // Format wallet number with clean readable grouping
  const formatNumber = (num) => {
    if (!num) return "";
    const clean = String(num).replace(/\s+/g, "");
    if (/^01[0125]\d{8}$/.test(clean)) {
      return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
    }
    if (clean.length > 6) {
      return clean.replace(/(\d{4})/g, "$1 ").trim();
    }
    return clean;
  };

  const walletNumber =
    currentMethod?.walletNumber ||
    currentMethod?.link?.replace(/[^0-9]/g, "") ||
    "";
  const accountHolder =
    currentMethod?.accountName || user?.name || "صاحب المحفظة";

  // Dynamic logo & name for selected method
  const dynamicProviderCfg = panelConfig?.providers?.find(
    (p) => p.id === currentMethod?.provider,
  );
  const logoSrc =
    dynamicProviderCfg?.icon ||
    (currentMethod?.provider ? WALLET_LOGOS[currentMethod.provider] : null);

  const walletTitle =
    currentMethod?.name ||
    dynamicProviderCfg?.nameAr ||
    (currentMethod?.provider && WALLET_NAMES[currentMethod.provider]
      ? WALLET_NAMES[currentMethod.provider].ar
      : "محفظة إلكترونية");

  const appName =
    APP_NAMES[currentMethod?.provider] || dynamicProviderCfg?.badge || "المحفظة";

  const handleCopyNumber = () => {
    if (!walletNumber) return;
    navigator.clipboard.writeText(walletNumber.replace(/\s+/g, ""));
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2200);
  };

  const handleShare = async () => {
    const shareTitle = currentMethod
      ? `صفحة الدفع - ${walletTitle}`
      : `وسائل الدفع المتاحة - ${user?.name || "Thenith"}`;
    const shareText = currentMethod
      ? `رابط الدفع المخصص عبر ${walletTitle} (${accountHolder})`
      : `اختر وسيلة الدفع المناسبة للتحويل لصالح ${user?.name || "صاحب الحساب"}`;

    const shareData = {
      title: shareTitle,
      text: shareText,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    // Fallback if Web Share is not supported or rejected
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenPaymentLink = () => {
    const rawLink = currentMethod?.link?.trim();
    if (rawLink) {
      let target = rawLink;
      if (!/^https?:\/\//i.test(target)) {
        target = "https://" + target;
      }
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }

    // Fallback: If no direct URL provided, copy wallet number
    if (walletNumber) {
      handleCopyNumber();
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-start p-3 sm:p-6 selection:bg-emerald-500 selection:text-black font-sans"
    >
      <div className="w-full max-w-md">
        {/* Top Navbar */}
        <div className="flex items-center justify-between py-3 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black tracking-wide text-slate-200">
              Thenith Payment
            </h1>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="مشاركة الرابط"
          >
            {copiedLink ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="rounded-3xl border border-slate-800/90 bg-[#0e131f] p-10 text-center shadow-2xl">
            <div className="relative mb-5 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            </div>
            <h3 className="text-base font-black text-white mb-1.5">
              جاري تحميل وسائل الدفع...
            </h3>
            <p className="text-xs text-slate-400">يرجى الانتظار لحظات</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-slate-800/90 bg-[#0e131f] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-base font-black text-white mb-2">
              تعذر عرض وسائل الدفع
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {error}
            </p>
          </div>
        ) : !currentMethod ? (
          /* ── VIEW A: القائمة الموحدة (جميع وسائل الدفع تحت بعض بالاسم والأيقونة) ── */
          <div className="space-y-4">
            {/* Methods List: تحت بعض بالاسم والأيقونة */}
            <div className="space-y-2.5">
              {allMethods.length === 0 ? (
                <div className="rounded-2xl border border-slate-800/80 bg-[#0e131f] p-6 text-center text-xs text-slate-400">
                  لا توجد وسائل دفع مضافة لهذا المستخدم حالياً.
                </div>
              ) : (
                allMethods.map((m) => {
                  const pCfg = panelConfig?.providers?.find(
                    (p) => p.id === m.provider,
                  );
                  const pLogo = pCfg?.icon || WALLET_LOGOS[m.provider];
                  const pName =
                    m.name ||
                    pCfg?.nameAr ||
                    (WALLET_NAMES[m.provider] ? WALLET_NAMES[m.provider].ar : "محفظة");

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethodId(m.id);
                        setSearchParams({ pay: m.customSlug || m.id });
                      }}
                      className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-800/90 bg-[#0d111a] hover:bg-[#121824] hover:border-slate-700 transition-all text-start cursor-pointer active:scale-[0.99] shadow-md group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Branded Logo Container */}
                        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-white p-1 border border-slate-700/80 shadow-md overflow-hidden group-hover:scale-105 transition-transform">
                          {pLogo ? (
                            <img
                              src={pLogo}
                              alt={pName}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Wallet className="h-6 w-6 text-slate-900" />
                          )}
                        </div>

                        {/* Name & Badge */}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                            {pName}
                          </h3>
                          <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
                            {pCfg?.badge || "محفظة إلكترونية"}
                          </span>
                        </div>
                      </div>

                      {/* Arrow Indicator */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-800 transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Footer Info */}
            <div className="flex items-center justify-center px-2 pt-2 text-[11px] font-bold text-slate-500">
              <span>مدعوم بواسطة Thenith</span>
            </div>
          </div>
        ) : (
          /* ── VIEW B: تفاصيل وسيلة الدفع المختارة ── */
          <div className="space-y-4">
            {/* Back Button to List (يظهر فقط إذا تم الدخول عبر الرابط المجمع ولديه عدة وسائل) */}
            {showBackToAll && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMethodId(null);
                  setSearchParams({});
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
              >
                <ArrowRight className="h-4 w-4" />
                <span>العودة لجميع وسائل الدفع</span>
              </button>
            )}

            {/* Main Dark Branded Payment Card */}
            <div className="rounded-[28px] border border-slate-800/90 bg-[#0d111a] p-6 shadow-2xl relative overflow-hidden">
              {/* Card Header: Thenith Payment */}
              <div className="flex items-center justify-end mb-6">
                <span className="text-xs font-bold text-slate-400 tracking-wide">
                  Thenith Payment
                </span>
              </div>

              {/* Wallet App Tile & Titles */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 border border-slate-700/80 shadow-xl overflow-hidden">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={walletTitle}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Wallet className="h-10 w-10 text-slate-900" />
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white mb-1">
                  {walletTitle}
                </h2>
                <p className="text-xs text-slate-400 mb-5 font-semibold">
                  Payment method
                </p>

                {/* Account Owner Name */}
                <p className="text-sm font-bold text-slate-200 mb-1.5">
                  {accountHolder}
                </p>

                {/* Wallet Number (Highlighted & Bold) */}
                <div className="mb-2">
                  <span
                    dir="ltr"
                    className="text-2xl sm:text-3xl font-black text-white tracking-wider font-mono select-all"
                  >
                    {walletNumber ? formatNumber(walletNumber) : "رقم غير محدد"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {/* 1. Primary Button: نسخ رقم المحفظة */}
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  disabled={!walletNumber}
                  className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-base shadow-lg transition-all active:scale-[0.99] cursor-pointer ${
                    copiedNumber
                      ? "bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-300/40"
                      : "bg-[#16a34a] hover:bg-[#15803d] text-white shadow-emerald-950/40"
                  } disabled:opacity-50`}
                >
                  {copiedNumber ? (
                    <>
                      <Check className="h-5 w-5" />
                      <span>تم نسخ رقم المحفظة بنجاح!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5" />
                      <span>نسخ رقم المحفظة</span>
                    </>
                  )}
                </button>

                {/* 2. Secondary Button: فتح تطبيق المحفظة (يفتح لينك الدفع) */}
                <button
                  type="button"
                  onClick={handleOpenPaymentLink}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-[#131926] hover:bg-[#1a2233] border border-slate-800 text-slate-100 font-bold text-sm transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <Smartphone className="h-4.5 w-4.5 text-emerald-400" />
                  <span>فتح تطبيق {appName}</span>
                </button>
              </div>

              {/* Payment Instructions Accordion (طريقة الدفع) */}
              <div className="mt-6 border-t border-slate-800/80 pt-5">
                <button
                  type="button"
                  onClick={() => setShowGuide((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-black text-sm text-slate-200">
                    <Info className="h-4 w-4 text-emerald-400" />
                    <span>طريقة الدفع</span>
                  </span>
                  {showGuide ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {showGuide && (
                  <div className="mt-3.5 rounded-2xl bg-[#090d14] border border-slate-800/80 p-4 space-y-3 text-xs text-slate-300">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-black text-emerald-400">
                        1
                      </span>
                      <p className="leading-relaxed">
                        اضغط على زر{" "}
                        <strong className="text-white">"نسخ رقم المحفظة"</strong>{" "}
                        للتحويل اليدوي السريع عبر هاتفك.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-black text-emerald-400">
                        2
                      </span>
                      <p className="leading-relaxed">
                        أو اضغط مباشرة على زر{" "}
                        <strong className="text-white">"فتح تطبيق {appName}"</strong>{" "}
                        وسيتم فتح رابط الدفع المباشر فوراً.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-black text-emerald-400">
                        3
                      </span>
                      <p className="leading-relaxed">
                        أدخل المبلغ المراد تحويله واكمل العملية لإتمام الدفع بنجاح.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="flex items-center justify-center px-2 pt-2 text-[11px] font-bold text-slate-500">
              <span>مدعوم بواسطة Thenith</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
