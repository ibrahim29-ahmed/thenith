import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";
import { useSiteSettings } from "../context/SiteSettingsContext.jsx";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { restoreSession } from "../panel/services/authApi.js";
import api from "../api/index.js";
import { applyPageSeo, PRODUCTION_DOMAIN } from "../utils/seo.js";
import MainFooter from "../components/MainFooter.jsx";

// Human-readable names for feature keys
const FEATURE_LABELS = {
  unifiedPaymentHub: {
    ar: "صفحة الدفع الموحدة لجميع المحافظ",
    en: "Unified Payment Page for all Wallets",
  },
  calendarBooking: { ar: "كالندر", en: "Calendar" },
  verifiedBadge: { ar: "شارة Thenith الموثقة", en: "Verified Thenith Badge" },
  contactMethods: { ar: "إضافة وسائل الاتصال", en: "Add Contact Methods" },
  saveContact: { ar: "حفظ جهة الاتصال", en: "Save Contact" },
  qrCode: { ar: "QR Code", en: "QR Code" },
  basicAnalytics: { ar: "إحصائيات أساسية", en: "Basic Analytics" },
  advancedAnalytics: { ar: "إحصائيات متقدمة", en: "Advanced Analytics" },
  coverImage: { ar: "تغيير صورة الغلاف", en: "Cover Image" },
  customLink: { ar: "رابط مخصص احترافي", en: "Professional Custom Link" },
  reorderLinks: { ar: "ترتيب صفحة الروابط", en: "Reorder Links Page" },
  themeSelection: { ar: "اختيار مظهر", en: "Choose Appearance" },
  removeBranding: { ar: "إزالة شعار Thenith", en: "Remove Thenith Branding" },
  prioritySupport: { ar: "الأولوية في الدعم الفني", en: "Priority Support" },
  futureFeatures: { ar: "جميع المميزات الجديدة مستقبلًا", en: "All Future Features" },
};

const PricingPage = () => {
  const { t, language } = useGlobalLanguage();
  const { settings } = useSiteSettings();
  const siteName = settings?.site_name || "Thenith";
  const [isAnnual, setIsAnnual] = useState(false);
  const [plans, setPlans] = useState([]);
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllFeatures, setShowAllFeatures] = useState({});
  const [subscribingTo, setSubscribingTo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const isAr = language === "ar";
    const brand = siteName || "Thenith";
    const title = isAr
      ? `باقات وأسعار البروفايل الرقمي | ${brand}`
      : `Digital Profile Plans & Pricing | ${brand}`;
    const description = isAr
      ? `اختر الباقة المناسبة لبروفايلك الرقمي الذكي في ${brand}. مميزات متقدمة تشمل بورتفوليو احترافي، روابط مخصصة، تحليلات، وحجز مواعيد، مع إمكانية ربط كارت NFC ذكي.`
      : `Choose the perfect plan for your smart digital profile on ${brand}. Advanced profile customization, analytics, lead generation forms, calendar booking, and optional smart NFC card integration.`;

    applyPageSeo({
      pageKey: "pricing",
      title,
      description,
      canonicalUrl: `${PRODUCTION_DOMAIN}/pricing`,
      robots: "index, follow",
      breadcrumbs: [
        { name: isAr ? "الرئيسية" : "Home", url: "/" },
        { name: isAr ? "الأسعار والباقات" : "Pricing & Plans", url: "/pricing" },
      ],
      lang: language,
      dir: isAr ? "rtl" : "ltr",
      openGraph: {
        title,
        description,
        url: `${PRODUCTION_DOMAIN}/pricing`,
        type: "website",
      },
    });
  }, [language, siteName]);

  const handleSubscribe = async (plan) => {
    setSubscribingTo(plan.key);
    try {
      const session = await restoreSession();
      if (!session.authenticated) {
        window.location.href = "/login?returnTo=/pricing";
        return;
      }

      const hasPaidPrice = isAnnual
        ? Number(plan.prices?.yearly) > 0
        : Number(plan.prices?.monthly) > 0;

      if (!hasPaidPrice) {
        window.location.href = "/u";
        return;
      }

      // Check if user has an active pending Fawry or Mobile Wallet payment
      try {
        const pendingData = await api.payment.getPending();
        if (pendingData?.success) {
          const isCard = (p) => {
            const tx = p?.transaction || p;
            if (!tx) return false;
            if (tx.paymentMethodId === 2) return true;
            const name = `${tx.paymentMethodName || p?.paymentMethod || ""}`.toLowerCase();
            return (
              name.includes("visa") ||
              name.includes("mastercard") ||
              name.includes("card") ||
              name.includes("فيزا") ||
              name.includes("بطاق")
            );
          };
          const nonCardSubs = (pendingData.subscriptions || []).filter((s) => !isCard(s));
          const nonCardOrders = (pendingData.orders || []).filter((o) => !isCard(o));
          if (nonCardSubs.length > 0 || nonCardOrders.length > 0) {
            alert(
              language === "ar"
                ? "لديك عملية دفع قيد الانتظار (فوري / محفظة إلكترونية). يرجى استكمال الدفع أو إلغاؤه أولاً من لوحة التحكم قبل الاشتراك في باقة جديدة."
                : "You have a pending payment (Fawry / Mobile Wallet). Please complete or cancel it from your dashboard before subscribing."
            );
            window.location.href = "/u?tab=subscriptions";
            return;
          }
        }
      } catch (e) {}

      const period = isAnnual ? "yearly" : "monthly";
      const refParam = new URLSearchParams(window.location.search).get("ref");
      const refQuery = refParam ? `&ref=${encodeURIComponent(refParam)}` : "";
      window.location.href = `/u?tab=subscriptions&checkout=true&period=${period}${refQuery}`;
    } catch (err) {
      window.location.href = "/login?returnTo=/pricing";
    } finally {
      setSubscribingTo(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    api.plans
      .getPlans()
      .then((data) => {
        if (mounted) {
          setPlans(data.plans || []);
          setActiveCoupon(data.activeCoupon || null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const getFeaturesList = (plan) => {
    // Prefer marketingFeatures if populated
    if (plan.marketingFeatures && plan.marketingFeatures.length > 0) {
      return plan.marketingFeatures.filter((f) => f.enabled).map((f) => {
        return typeof f.name === 'object' ? (f.name[language] || f.name.ar) : f.name;
      });
    }
    // Fallback: generate from features map
    if (plan.features) {
      return Object.entries(plan.features)
        .filter(([, enabled]) => enabled)
        .map(([key]) => {
          const label = FEATURE_LABELS[key];
          return label ? (language === "ar" ? label.ar : label.en) : key;
        });
    }
    return [];
  };

  const isPaidPlan = (plan) =>
    Number(plan.prices?.monthly) > 0 || Number(plan.prices?.yearly) > 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-500/30 text-slate-900">
      <main className="flex-1 relative pt-32 pb-28 md:pb-36 px-6 md:px-12 max-w-[1440px] w-full mx-auto z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight"
          >
            {t("store.pricingTitle")}
          </motion.h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {t("store.noPricingAvailable")}
          </div>
        ) : (
          <>


            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-start">
            {plans.map((plan, index) => {
              const features = getFeaturesList(plan);
              const showAll = showAllFeatures[plan._id] || false;
              const visibleFeatures = showAll ? features : features.slice(0, 5);
              const paid = isPaidPlan(plan);
              
              const mPrice = Number(plan.prices?.monthly) || 0;
              const yPrice = Number(plan.prices?.yearly) || 0;
              const price = isAnnual ? yPrice : mPrice;
              const isPaid = price > 0;
              
              let discountPercent = 0;
              if (mPrice > 0 && yPrice > 0 && yPrice < mPrice * 12) {
                discountPercent = Math.round((1 - (yPrice / (mPrice * 12))) * 100);
              }

              return (
                <motion.div
                  key={plan._id || plan.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className={`relative rounded-[32px] p-8 md:p-10 shadow-xl flex flex-col justify-between ${
                    index === 0
                      ? "bg-white border border-slate-200/60 text-slate-900"
                      : plan.key === "payment_plus"
                      ? "bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/80 border-2 border-indigo-500/50 text-white ring-1 ring-indigo-500/30"
                      : "bg-slate-900 border border-slate-800 text-white"
                  }`}
                >
                  {plan.key === "payment_plus" && (
                    <div className="absolute -top-3.5 inset-x-0 flex justify-center pointer-events-none">
                      <span className="rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 px-3.5 py-1 text-[11px] font-black text-white shadow-md">
                        {language === "ar" ? "خدمة الدفع الموحد الذكي" : "Smart Unified Pay"}
                      </span>
                    </div>
                  )}

                  {/* Plan name */}
                  <div className="mb-6">
                    <h3
                      className={`text-2xl font-black mb-2 ${index === 0 ? "text-slate-900" : "text-white"}`}
                    >
                      {typeof plan.name === 'object' ? plan.name[language] || plan.name.ar : plan.name}
                    </h3>
                  </div>

                  {paid && (
                    <div className="mb-6">
                      <div className={`backdrop-blur-sm p-1.5 rounded-full flex items-center border shadow-sm relative w-full ${
                        index === 0 ? "bg-slate-100 border-slate-200" : "bg-white/10 border-white/10"
                      }`}>
                        <button
                          onClick={() => setIsAnnual(false)}
                          className={`flex-1 relative z-10 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
                            !isAnnual
                              ? (index === 0 ? "text-slate-900" : "text-white")
                              : (index === 0 ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")
                          }`}
                        >
                          {t("store.billedMonthly")}
                        </button>
                        <button
                          onClick={() => setIsAnnual(true)}
                          className={`flex-1 relative z-10 py-2.5 rounded-full font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                            isAnnual
                              ? "text-white"
                              : (index === 0 ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")
                          }`}
                        >
                          {t("store.billedYearly")}
                          {discountPercent > 0 && (
                            <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-black ${isAnnual ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-500"}`}>
                              {language === "ar" ? `وفر ${discountPercent}%` : `Save ${discountPercent}%`}
                            </span>
                          )}
                        </button>
                        
                        {/* Sliding Background */}
                        <div 
                          className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-full transition-all duration-300 shadow-md ${
                            !isAnnual 
                              ? (index === 0 ? "bg-white border border-slate-200" : "bg-slate-800 border border-slate-700") 
                              : "bg-indigo-600 border border-indigo-500"
                          }`}
                          style={{
                            insetInlineStart: !isAnnual ? "0.375rem" : "calc(50% + 0.1875rem)"
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-8">
                    {(() => {
                      const calcData = isAnnual ? plan.calculatedPrice?.yearly : plan.calculatedPrice?.monthly;
                      
                      if (!calcData || !isPaid) {
                        return (
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`text-5xl font-black flex items-baseline gap-1 ${index === 0 ? "text-slate-900" : "text-white"}`}
                              dir="ltr"
                            >
                              {isPaid ? (
                                <>
                                  {price} <span className="text-2xl font-bold">{language === "ar" ? "ج.م" : "EGP"}</span>
                                </>
                              ) : (
                                language === "ar" ? "مجاناً" : "Free"
                              )}
                            </span>
                            {isPaid && (
                              <span
                                className={`font-bold text-lg ${index === 0 ? "text-slate-500" : "text-slate-400"}`}
                              >
                                /{" "}
                                {isAnnual
                                  ? t("store.billedYearly")
                                  : t("store.billedMonthly")}
                              </span>
                            )}
                          </div>
                        );
                      }

                      if (calcData.discountAmount > 0) {
                        return (
                          <div className="mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`line-through text-lg ${index === 0 ? "text-slate-400" : "text-slate-400"}`} dir="ltr">
                                {calcData.originalPrice} {language === "ar" ? "ج.م" : "EGP"}
                              </span>
                              <span className="bg-rose-500/20 text-rose-500 text-xs font-bold px-2 py-1 rounded-full border border-rose-500/20">
                                {calcData.discountType === "percentage" 
                                  ? (language === "ar" ? `خصم ${calcData.appliedDiscountVal}%` : `${calcData.appliedDiscountVal}% OFF`) 
                                  : (language === "ar" ? `خصم ${calcData.appliedDiscountVal} ج.م` : `${calcData.appliedDiscountVal} EGP OFF`)}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className={`text-5xl font-black flex items-baseline gap-1 ${index === 0 ? "text-slate-900" : "text-white"}`} dir="ltr">
                                {calcData.finalPrice} <span className="text-2xl font-bold">{language === "ar" ? "ج.م" : "EGP"}</span>
                              </span>
                              <span className={`font-bold text-lg ${index === 0 ? "text-slate-500" : "text-slate-400"}`}>
                                / {isAnnual ? t("store.billedYearly") : t("store.billedMonthly")}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-5xl font-black flex items-baseline gap-1 ${index === 0 ? "text-slate-900" : "text-white"}`}
                            dir="ltr"
                          >
                            {calcData.finalPrice} <span className="text-2xl font-bold">{language === "ar" ? "ج.م" : "EGP"}</span>
                          </span>
                          <span
                            className={`font-bold text-lg ${index === 0 ? "text-slate-500" : "text-slate-400"}`}
                          >
                            /{" "}
                            {isAnnual
                              ? t("store.billedYearly")
                              : t("store.billedMonthly")}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={subscribingTo === plan.key}
                    className={`flex items-center justify-center w-full py-4 rounded-2xl font-bold text-lg transition-colors mb-8 disabled:opacity-50 ${
                      index === 0
                        ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {subscribingTo === plan.key ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPaid ? (
                      t("store.subscribeNow")
                    ) : (
                      t("store.startNow")
                    )}
                  </button>

                  {/* Features list */}
                  <div className="space-y-3">
                    {visibleFeatures.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${index === 0 ? "bg-slate-100" : "bg-indigo-500/20"}`}
                        >
                          <Check
                            className={`w-3.5 h-3.5 ${index === 0 ? "text-slate-600" : "text-indigo-400"}`}
                          />
                        </div>
                        <span
                          className={`font-medium ${index === 0 ? "text-slate-700" : "text-slate-200"}`}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Show more/less */}
                  {features.length > 5 && (
                    <button
                      onClick={() =>
                        setShowAllFeatures((prev) => ({
                          ...prev,
                          [plan._id]: !showAll,
                        }))
                      }
                      className={`mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl border font-medium transition-colors ${
                        index === 0
                          ? "border-slate-200 text-slate-500 hover:bg-slate-50"
                          : "border-slate-700 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {showAll ? (
                        <>
                          <ChevronUp className="w-4 h-4" />{" "}
                          {t("store.hideDetails")}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />{" "}
                          {t("store.showMore")}
                        </>
                      )}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
          </>
        )}
      </main>
      <MainFooter />
    </div>
  );
};

export default PricingPage;
