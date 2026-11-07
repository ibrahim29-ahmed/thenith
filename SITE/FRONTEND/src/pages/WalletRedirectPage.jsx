import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Copy,
  Check,
  Share2,
  Wallet,
  Smartphone,
  PhoneCall,
  QrCode,
  BadgeCheck,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Lock,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
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

// Default USSD Dial Codes as configured by admin
const DEFAULT_USSD_CODES = {
  vodafone_cash: "*9*7#",
  orange_cash: "#7115#",
  etisalat_cash: "*777*1#",
  we_pay: "*7*2#",
  instapay: "",
};

export default function WalletRedirectPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Extract identifier from params or pathname (supports /pay/:identifier and /m/:identifier)
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const identifier =
    params.identifier ||
    (["m", "pay"].includes(pathParts[0]?.toLowerCase())
      ? pathParts[1]
      : pathParts[0]) ||
    "";
  const payParam =
    searchParams.get("pay") ||
    (["m", "pay"].includes(pathParts[0]?.toLowerCase()) && pathParts[2]
      ? pathParts[2]
      : "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Expanded wallet cards state: { [methodId]: boolean }
  const [expandedMap, setExpandedMap] = useState({});

  // Active expanded QR codes map: { [methodId]: boolean }
  const [activeQrMap, setActiveQrMap] = useState({});

  // Copy feedback states
  const [copiedMap, setCopiedMap] = useState({});
  const [copiedShareLink, setCopiedShareLink] = useState(false);

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
          const methods = Array.isArray(res.data.allMethods) && res.data.allMethods.length > 0
            ? res.data.allMethods
            : res.data.method ? [res.data.method] : [];

          // Default: all wallet cards remain closed/collapsed until tapped
          setExpandedMap({});
        } else {
          setError(res.data?.message || "تعذر العثور على وسائل الدفع المطلوبة");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "تعذر العثور على حساب المستفيد أو وسائل الدفع المطلوبة"
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
  const canAccessUnifiedHub = Boolean(data?.canAccessUnifiedHub);
  const allMethods = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data.allMethods) && data.allMethods.length > 0) {
      return data.allMethods;
    }
    if (data.method) return [data.method];
    return [];
  }, [data]);

  // Determine if we should open the single-wallet system (لو وسيلة دفع واحدة أو رابط محدد لوسيلة بعينها)
  const isSingleMethod = useMemo(() => {
    if (!data) return false;
    // If specific method requested via payParam -> ALWAYS single wallet system!
    if (payParam) return true;
    // If only 1 method in total exists -> always open single wallet system directly!
    if (allMethods.length === 1) return true;
    return false;
  }, [data, allMethods.length, payParam]);

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

  const handleCopy = (id, textToCopy) => {
    if (!textToCopy) return;
    const clean = String(textToCopy).replace(/\s+/g, "");
    navigator.clipboard.writeText(clean);
    setCopiedMap((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [id]: false }));
    }, 2200);
  };

  const handleShare = async () => {
    const title = user?.name
      ? `وسائل الدفع المعتمدة - ${user.name}`
      : "وسائل الدفع المعتمدة | Thenith";
    const text = `الصفحة الموحدة لوسائل الدفع والمحافظ الإلكترونية الخاصة بـ ${user?.name || "المستفيد"}`;
    const url = window.location.href.split("?")[0];

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    navigator.clipboard.writeText(url);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2200);
  };

  const handleOpenLink = (method) => {
    const rawLink = method?.link?.trim();
    if (rawLink) {
      let target = rawLink;
      if (!/^https?:\/\//i.test(target)) {
        target = "https://" + target;
      }
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }

    const num = method?.walletNumber || method?.link?.replace(/[^0-9]/g, "");
    if (num) {
      handleCopy(method.id, num);
    }
  };

  // Get Egyptian Mobile Wallet USSD transfer code (with dynamic Admin override support)
  const getUssdCode = (provider, number, configuredTemplate) => {
    // If explicitly disabled or empty string, or instapay without custom code
    if (configuredTemplate === "" || (!configuredTemplate && provider === "instapay")) {
      return null;
    }

    const cleanNum = number ? String(number).replace(/[^0-9]/g, "") : "";

    // 1. If an admin configured code exists, use it (and replace {number} if template uses it)
    if (configuredTemplate && typeof configuredTemplate === "string") {
      let code = configuredTemplate.trim();
      if (!code) return null;
      if (code.includes("{number}")) {
        code = code.replace(/\{number\}/g, cleanNum);
      }
      return code;
    }

    // 2. Default fallback codes:
    // Vodafone Cash: *9*7#
    if (provider === "vodafone_cash" || (!provider && cleanNum.startsWith("010"))) {
      return "*9*7#";
    }
    // Orange Cash: #7115#
    if (provider === "orange_cash" || (!provider && cleanNum.startsWith("012"))) {
      return "#7115#";
    }
    // Etisalat Cash: *777*1#
    if (provider === "etisalat_cash" || (!provider && cleanNum.startsWith("011"))) {
      return "*777*1#";
    }
    // WE Pay: *7*2#
    if (provider === "we_pay" || (!provider && cleanNum.startsWith("015"))) {
      return "*7*2#";
    }

    return null;
  };

  const handleUssdDial = (code) => {
    if (!code) return;
    // Encode # as %23 for tel URI protocol so dialer receives it properly
    const encoded = code.replace(/#/g, "%23");
    window.location.href = `tel:${encoded}`;
  };

  const toggleExpand = (methodId) => {
    // Exclusive accordion: clicking an open wallet closes it; clicking another closes previous and opens selected
    setExpandedMap((prev) => (prev[methodId] ? {} : { [methodId]: true }));
  };

  const toggleQr = (methodId) => {
    setActiveQrMap((prev) => ({
      ...prev,
      [methodId]: !prev[methodId],
    }));
  };

  const getMethodDetails = (method) => {
    if (!method) return {};
    const pCfg = panelConfig?.providers?.find((p) => p.id === method.provider);
    const logo = pCfg?.icon || (method.provider ? WALLET_LOGOS[method.provider] : null);
    const title =
      method.name ||
      pCfg?.nameAr ||
      (WALLET_NAMES[method.provider] ? WALLET_NAMES[method.provider].ar : "محفظة إلكترونية");
    const app = APP_NAMES[method.provider] || pCfg?.badge || "المحفظة";
    const number =
      method.walletNumber || method.link?.replace(/[^0-9]/g, "") || "";
    const holder = method.accountName || user?.name || "صاحب الحساب";
    const badge = pCfg?.badge || (method.provider ? WALLET_NAMES[method.provider]?.ar : "محفظة معتمدة");

    // Dynamic Admin-configured USSD code with fallback to DEFAULT_USSD_CODES
    let configuredCode = pCfg?.ussdCode;
    if (configuredCode === undefined || configuredCode === null) {
      configuredCode = method.provider ? DEFAULT_USSD_CODES[method.provider] : null;
    }
    const ussdCode = getUssdCode(method.provider, number, configuredCode);

    const qrValue =
      method.link && /^https?:\/\//i.test(method.link)
        ? method.link
        : `${window.location.origin}/pay/${identifier}?pay=${method.customSlug || method.id}`;

    return { pCfg, logo, title, app, number, holder, badge, ussdCode, qrValue };
  };

  return (
    <div
      id="profile-themed-root"
      dir="rtl"
      className="min-h-screen bg-slate-50/50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-300 font-sans relative"
    >
      {/* ── TOP CONTAINER ── */}
      <main className="max-w-5xl mx-auto px-4 lg:px-4 pt-4 lg:pt-8">
        {/* Loading State */}
        {loading ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-8">
            <div className="h-12 w-12 rounded-full border-3 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              جاري تحميل وسائل الدفع المعتمدة...
            </p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-slate-900/60 rounded-3xl border border-rose-200 dark:border-rose-900/50 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">
              تعذر عرض وسائل الدفع
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {error}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        ) : (
          /* ── EXACT PROFILE 2-COLUMN RESPONSIVE LAYOUT ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start relative">
            {/* ════════════════════════════════════════════════════════════════════
                RIGHT COLUMN (lg:col-span-5 in RTL):
                EXACT PROFILE HEADER CARD:
                Cover + Avatar + Name + Verified Badge + @username (NO CONTACT ACTIONS)
               ════════════════════════════════════════════════════════════════════ */}
            <div className="col-span-1 lg:col-span-5 p-4 sm:p-6 lg:sticky lg:top-8 lg:self-start z-20 profile-card bg-white dark:bg-slate-900/40 dark:backdrop-blur-xl rounded-[1.5rem] sm:rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg sm:shadow-xl dark:shadow-slate-950/20 transition-colors duration-300 relative overflow-hidden flex flex-col items-center text-center">
              {/* Share Profile Button (Top Corner) */}
              <button
                type="button"
                onClick={handleShare}
                className="absolute top-4 end-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
                title="مشاركة الرابط"
              >
                {copiedShareLink ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </button>

              {/* Profile Cover Banner (Exact Profile Component styling, blur, contrast & dimensions) */}
              <div className="absolute top-0 start-0 end-0 h-44 sm:h-52 lg:h-56 profile-gradient -mx-4 lg:-mx-6 rounded-none lg:rounded-t-3xl -mt-4 lg:-mt-6 overflow-hidden flex items-center justify-center pointer-events-none">
                {user?.coverImage ? (
                  <img
                    src={user.coverImage}
                    alt={user.name ? `صورة غلاف بروفايل ${user.name}` : "صورة غلاف بروفايل Thenith"}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] dark:bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px] opacity-10 dark:opacity-15" />
                    <span className="relative z-10 text-3xl sm:text-5xl md:text-6xl lg:text-5xl font-black tracking-[0.2em] sm:tracking-[0.28em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-900/35 via-indigo-900/45 to-slate-900/35 dark:from-white/35 dark:via-indigo-200/45 dark:to-white/25 select-none font-sans drop-shadow-sm text-center">
                      {user?.name || "THENITH"}
                    </span>
                  </>
                )}
              </div>

              {/* Profile Avatar (Exact Profile Dimensions and Spacing) */}
              <div className="relative z-10 mt-20 sm:mt-24 lg:mt-28 mb-3 flex justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "User"}
                    className="w-32 h-32 lg:w-36 lg:h-36 rounded-full object-cover border-[6px] border-white dark:border-slate-900 shadow-lg shadow-slate-200/80 dark:shadow-slate-950/50"
                  />
                ) : (
                  <div className="w-32 h-32 lg:w-36 lg:h-36 rounded-full border-[6px] border-white dark:border-slate-900 shadow-lg shadow-slate-200/80 dark:shadow-slate-950/50 bg-indigo-600 flex items-center justify-center text-white text-5xl lg:text-6xl font-black select-none">
                    {(user?.name || "T").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Profile Identity (Name, Verified Badge, @username - NO CONTACT ACTIONS) */}
              <div className="relative z-10 px-2 w-full pb-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1 flex items-center justify-center gap-1.5">
                  <span>{user?.name || "المستفيد"}</span>
                  <BadgeCheck
                    className="w-5 h-5 text-sky-500 dark:text-sky-400 fill-sky-500/15 dark:fill-sky-400/20 shrink-0"
                    title="حساب معتمد"
                  />
                </h1>

                {user?.username && (
                  <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
                    @{user.username}
                  </p>
                )}

                {user?.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto mt-2">
                    {user.bio}
                  </p>
                )}
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════
                LEFT COLUMN (lg:col-span-7 in RTL):
                "الحتة الي عالشمال"
                Contains:
                1. Single Desktop Tab: "وسائل الدفع" (with Wallet icon)
                2. ContentCard displaying the wallets:
                   - Outside: ONLY the wallet icon and the wallet name!
                   - When clicked: Expands in the exact same spot with payment details,
                     "فتح تطبيق [App]", and "التحويل من خلال الكود" (USSD)!
               ════════════════════════════════════════════════════════════════════ */}
            {/* ════════════════════════════════════════════════════════════════════
                LEFT COLUMN (lg:col-span-7 in RTL):
                1. If user has no Thenith Payment Plus and tries to access unified hub:
                   → Block access with locked notice and direct wallet button.
                2. If visiting a single wallet link (or non-subscriber):
                   → Dedicated single-wallet view with direct details.
                3. If Thenith Payment Plus subscriber on unified hub:
                   → Full unified hub with all wallets list.
               ════════════════════════════════════════════════════════════════════ */}
            {!canAccessUnifiedHub && !payParam && !isSingleMethod ? (
              /* ── CASE 1: BLOCKED UNIFIED HUB (Requires Thenith Payment Plus) ── */
              <section className="col-span-1 lg:col-span-7 flex flex-col gap-4 lg:gap-6">
                <nav className="flex items-center gap-2 p-1.5 bg-white/95 dark:bg-slate-900/40 dark:backdrop-blur-xl border border-slate-100 dark:border-slate-800/60 rounded-2xl shadow-sm lg:sticky lg:top-4 z-30 relative transition-colors duration-300">
                  <div className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm transition-colors">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>صفحة وسائل الدفع</span>
                  </div>
                </nav>

                <div className="profile-card bg-white dark:bg-slate-900/40 dark:backdrop-blur-xl rounded-[1.5rem] sm:rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg sm:shadow-xl dark:shadow-slate-950/20 p-8 sm:p-12 min-h-[460px] flex flex-col items-center justify-center text-center relative transition-colors duration-300">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/20 shadow-xs">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                    صفحة الدفع الموحدة غير مفعلة
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                    هذا الرابط الموحد يتطلب اشتراكاً فعالاً في خدمة Thenith Payment Plus. لإتمام التحويل، يرجى استخدام رابط المحفظة المباشر الخاص بالمستفيد.
                  </p>
                </div>
              </section>
            ) : (isSingleMethod || !canAccessUnifiedHub) && (allMethods[0] || data?.method) ? (
              /* ── CASE 2: DEDICATED SINGLE WALLET SYSTEM (سيستم لوسيلة الدفع الواحدة) ── */
              (() => {
                const targetM =
                  (payParam && allMethods.find((m) =>
                    (m.id && String(m.id).toLowerCase() === payParam.toLowerCase()) ||
                    (m.customSlug && m.customSlug.toLowerCase() === payParam.toLowerCase()) ||
                    (m.provider && m.provider.toLowerCase() === payParam.toLowerCase())
                  )) ||
                  data?.method ||
                  allMethods[0];
                const singleDetails = getMethodDetails(targetM);
                const isCopied = copiedMap[targetM.id];
                const isQrOpen = Boolean(activeQrMap[targetM.id]);

                return (
                  <section className="col-span-1 lg:col-span-7 flex flex-col gap-4 lg:gap-6">
                    {/* Single Method Header Tab */}
                    <nav className="flex items-center gap-2 p-1.5 bg-white/95 dark:bg-slate-900/40 dark:backdrop-blur-xl border border-slate-100 dark:border-slate-800/60 rounded-2xl shadow-sm lg:sticky lg:top-4 z-30 relative transition-colors duration-300">
                      <div className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm transition-colors">
                        {singleDetails.logo ? (
                          <img src={singleDetails.logo} alt="" className="w-4 h-4 object-contain" />
                        ) : (
                          <Wallet className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                        )}
                        <span>{singleDetails.title}</span>
                      </div>
                    </nav>

                    {/* Dedicated Single Wallet Content Card */}
                    <div className="profile-card bg-white dark:bg-slate-900/40 dark:backdrop-blur-xl rounded-[1.5rem] sm:rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg sm:shadow-xl dark:shadow-slate-950/20 p-5 sm:p-7 min-h-[460px] flex flex-col justify-start relative transition-colors duration-300 space-y-4">
                      {/* Top Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-3.5">
                          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0">
                            {singleDetails.logo ? (
                              <img src={singleDetails.logo} alt={singleDetails.title} className="w-full h-full object-contain" />
                            ) : (
                              <Wallet className="w-7 h-7 text-slate-800 dark:text-slate-200" />
                            )}
                          </div>
                          <div>
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                              {singleDetails.title}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              المستلم المعتمد: <strong className="text-slate-800 dark:text-slate-200">{singleDetails.holder}</strong>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleQr(targetM.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                        >
                          <QrCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          <span>{isQrOpen ? "إخفاء الـ QR" : "رمز QR"}</span>
                        </button>
                      </div>

                      {/* Formatted Number Bar with 1-Click Copy */}
                      {singleDetails.number && (
                        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 shadow-2xs">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] text-slate-400 block font-semibold mb-0.5">
                              رقم المحفظة / الحساب:
                            </span>
                            <span
                              dir="ltr"
                              className="text-xl sm:text-2xl font-black font-mono tracking-wider text-slate-900 dark:text-white select-all inline-block truncate"
                            >
                              {formatNumber(singleDetails.number)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopy(targetM.id, singleDetails.number)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0 shadow-xs ${
                              isCopied
                                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-4 w-4" />
                                <span>تم النسخ!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                <span>نسخ الرقم</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Action 1: فتح تطبيق المحفظة */}
                      <button
                        type="button"
                        onClick={() => handleOpenLink(targetM)}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-sm active:scale-95"
                      >
                        <Smartphone className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
                        <span>فتح تطبيق {singleDetails.app}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
                      </button>

                      {/* Action 2: التحويل من خلال الكود */}
                      {singleDetails.ussdCode && (
                        <a
                          href={`tel:${singleDetails.ussdCode.replace(/#/g, "%23")}`}
                          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs active:scale-95 no-underline"
                          title="فتح شاشة الاتصال مع كود التحويل جاهزاً"
                        >
                          <PhoneCall className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          <span>التحويل من خلال الكود</span>
                        </a>
                      )}

                      {/* Inline QR Code View if Toggled */}
                      {isQrOpen && (
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start animate-fadeIn">
                          <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0">
                            <QRCodeSVG
                              value={singleDetails.qrValue}
                              size={120}
                              level="H"
                              includeMargin={false}
                            />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex-1 space-y-1">
                            <p className="font-bold text-slate-900 dark:text-white">
                              امسح رمز QR بكاميرا الهاتف
                            </p>
                            <p className="text-[11px] leading-relaxed">
                              للتحويل المباشر لحساب {singleDetails.holder}.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()
            ) : (
              /* ── CASE 3: UNIFIED PAYMENT HUB (For Thenith Payment Plus Subscribers) ── */
              <section className="col-span-1 lg:col-span-7 flex flex-col gap-4 lg:gap-6">
                {/* Single Navigation Tab */}
                <nav className="flex items-center gap-2 p-1.5 bg-white/95 dark:bg-slate-900/40 dark:backdrop-blur-xl border border-slate-100 dark:border-slate-800/60 rounded-2xl shadow-sm lg:sticky lg:top-4 z-30 relative transition-colors duration-300">
                  <div className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm transition-colors">
                    <Wallet className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                    <span>المحافظ</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/20 dark:bg-slate-900/10 text-white dark:text-slate-900 ms-1">
                      {allMethods.length}
                    </span>
                  </div>
                </nav>

                {/* Main ContentCard with the Wallets List */}
                <div className="profile-card bg-white dark:bg-slate-900/40 dark:backdrop-blur-xl rounded-[1.5rem] sm:rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-lg sm:shadow-xl dark:shadow-slate-950/20 p-4 sm:p-6 min-h-[460px] flex flex-col justify-start relative transition-colors duration-300">
                  {/* ── WALLETS LIST (اسم المحفظة والأيقونة فقط من برا، وتفتح في نفس الحتة) ── */}
                  <div className="space-y-3">
                    {allMethods.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400">
                        لا توجد وسائل دفع مضافة لهذا الحساب حالياً.
                      </div>
                    ) : (
                    allMethods.map((m, idx) => {
                      const { logo, title, app, number, holder, ussdCode, qrValue } =
                        getMethodDetails(m);
                      const isExpanded = Boolean(expandedMap[m.id]);
                      const isCopied = copiedMap[m.id];
                      const isQrOpen = Boolean(activeQrMap[m.id]);

                      return (
                        <div
                          key={m.id || idx}
                          className={`w-full rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${
                            isExpanded
                              ? "bg-slate-50/90 dark:bg-slate-800/60 border-indigo-500/60 dark:border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20"
                              : "bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border-slate-100 dark:border-slate-800/80"
                          }`}
                        >
                          {/* ── OUTSIDE: اسم المحفظة والأيقونة بس! ── */}
                          <div
                            onClick={() => toggleExpand(m.id)}
                            className="w-full p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none group"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {/* Icon Container */}
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 p-1 shadow-sm border border-slate-200/80 dark:border-slate-700/80 shrink-0 group-hover:scale-105 transition-transform">
                                {logo ? (
                                  <img
                                    src={logo}
                                    alt={title}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <Wallet className="h-6 w-6 text-slate-800 dark:text-slate-200" />
                                )}
                              </div>

                              {/* Wallet Name Only! */}
                              <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                                {title}
                              </span>
                            </div>

                            {/* Chevron Toggle */}
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>

                          {/* ── INSIDE (في نفس الحتة): بيانات الدفع والتحويل ── */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.22, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-slate-200/70 dark:border-slate-700/70 space-y-3">
                                  {/* Recipient Notice */}
                                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                                    <span>
                                      المستلم المعتمد:{" "}
                                      <strong className="text-slate-800 dark:text-slate-200">
                                        {holder}
                                      </strong>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleQr(m.id)}
                                      className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                    >
                                      <QrCode className="h-3.5 w-3.5" />
                                      <span>{isQrOpen ? "إخفاء الـ QR" : "عرض رمز QR"}</span>
                                    </button>
                                  </div>

                                  {/* Formatted Number Bar with 1-Click Copy */}
                                  {number && (
                                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 shadow-2xs">
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[10px] text-slate-400 block font-semibold">
                                          رقم المحفظة / الحساب:
                                        </span>
                                        <span
                                          dir="ltr"
                                          className="text-lg sm:text-xl font-black font-mono tracking-wider text-slate-900 dark:text-white select-all inline-block truncate"
                                        >
                                          {formatNumber(number)}
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleCopy(m.id, number)}
                                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0 shadow-xs ${
                                          isCopied
                                            ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        }`}
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check className="h-3.5 w-3.5" />
                                            <span>تم النسخ!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="h-3.5 w-3.5" />
                                            <span>نسخ الرقم</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {/* ── ACTION 1: فتح تطبيق المحفظة ── */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenLink(m)}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-sm active:scale-95"
                                  >
                                    <Smartphone className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
                                    <span>فتح تطبيق {app}</span>
                                    <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
                                  </button>

                                  {/* ── ACTION 2 (تحت زر التطبيق): التحويل من خلال الكود ── */}
                                  {ussdCode && (
                                    <a
                                      href={`tel:${ussdCode.replace(/#/g, "%23")}`}
                                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs active:scale-95 no-underline"
                                      title="فتح شاشة الاتصال مع كود التحويل جاهزاً"
                                    >
                                      <PhoneCall className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                      <span>التحويل من خلال الكود</span>
                                    </a>
                                  )}

                                  {/* Inline QR Code View if Toggled */}
                                  {isQrOpen && (
                                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start animate-fadeIn">
                                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0">
                                        <QRCodeSVG
                                          value={qrValue}
                                          size={115}
                                          level="H"
                                          includeMargin={false}
                                        />
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400 flex-1 space-y-1">
                                        <p className="font-bold text-slate-900 dark:text-white">
                                          امسح رمز QR بكاميرا الهاتف
                                        </p>
                                        <p className="text-[11px] leading-relaxed">
                                          للتحويل السريع مباشرة لحساب {holder}.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </main>

      {/* ── FOOTER (EXACT PROFILE FOOTER) ── */}
      <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-slate-400 flex items-center justify-center border-t border-slate-100 dark:border-slate-800/40 mt-12">
        <span className="text-slate-400 dark:text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} Thenith • All rights reserved
        </span>
      </footer>
    </div>
  );
}
