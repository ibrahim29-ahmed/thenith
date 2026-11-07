import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Calendar,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Clock,
  ArrowLeft,
} from "lucide-react";
import apiClient from "../../../api/client.js";
import { getAccessToken } from "../../services/authApi.js";
import CompleteProfileModal from "./CompleteProfileModal.jsx";
import { useNavigate } from "react-router-dom";
import UnifiedPaymentBox from "./UnifiedPaymentBox.jsx";
import { toast } from "../../../util/toast";
import { useAuth } from "../../../context/AuthContext.jsx";
import SubscriptionsSkeleton from "../skeletons/SubscriptionsSkeleton.jsx";

export default function SubscriptionsPage({
  t,
  subscription: initialSubscription,
  user: initialUser,
  owner: initialOwner,
  onNavigateToProfile,
}) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isArabic = typeof t === "function" ? t("home") === "الرئيسية" : true;

  const searchParams = new URLSearchParams(window.location.search);
  const initialPeriod = searchParams.get("period");
  const defaultIsAnnual = initialPeriod ? initialPeriod === "yearly" : false;
  const [isAnnual, setIsAnnual] = useState(defaultIsAnnual);
  const [plans, setPlans] = useState([]);
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [expandedFeatures, setExpandedFeatures] = useState({});
  const [subscribing, setSubscribing] = useState(false);
  const [subscribingPlanKey, setSubscribingPlanKey] = useState(null);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [userSubscription, setUserSubscription] = useState(
    initialSubscription || null,
  );
  const [currentUser, setCurrentUser] = useState(
    initialUser || initialOwner || authUser || null,
  );

  useEffect(() => {
    if (initialUser || initialOwner || authUser) {
      setCurrentUser((prev) => ({
        ...(prev || {}),
        ...(initialUser || {}),
        ...(initialOwner || {}),
        ...(authUser || {}),
      }));
    }
  }, [initialUser, initialOwner, authUser]);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelMessage, setCancelMessage] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [pendingPayments, setPendingPayments] = useState([]);
  const [selectedPendingDetails, setSelectedPendingDetails] = useState(null);

  // Fetch plans, fresh subscription details and pending payments from backend
  useEffect(() => {
    let mounted = true;

    const loadData = async (isBackground = false) => {
      try {
        const token = getAccessToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const { data: plansData } = await apiClient.get("/plans");
        if (mounted && plansData.plans) {
          setPlans(plansData.plans);
          setActiveCoupon(plansData.activeCoupon || null);
        }

        // Fetch subscription
        try {
          const { data: subData } = await apiClient.get("/subscription", { headers });
          if (mounted && subData) setUserSubscription(subData);
        } catch (e) { }

        // Fetch user profiles to make sure phone and latest details are loaded
        try {
          const { data: pData } = await apiClient.get("/panel/profile", { headers });
          if (mounted && pData?.profile) {
            setCurrentUser((prev) => ({ ...(prev || {}), ...pData.profile }));
          }
        } catch (e) { }

        try {
          const { data: sessionData } = await apiClient.get("/auth/me", { headers });
          if (mounted && sessionData?.user) {
            setCurrentUser((prev) => ({ ...(prev || {}), ...sessionData.user }));
          }
        } catch (e) { }

        // Check pending payments
        try {
          const pendingRes = await apiClient.get("/payment/pending", { headers });
          if (mounted && pendingRes.data?.success) {
            const isTxExpired = (item) => {
              const tx = item?.transaction || item;
              if (!tx) return false;
              if (tx.status === "expired" || tx.status === "cancelled" || tx.status === "failed") return true;
              const cTime = new Date(tx.fawaterakCreatedAt || tx.createdAt || Date.now()).getTime();
              const isWallet = Boolean(
                tx.paymentMethodId === 4 ||
                tx.paymentData?.mobileWalletNumber ||
                tx.paymentData?.meezaQrCode ||
                tx.paymentData?.isoQr ||
                /wallet|محفظ|meeza|كاش/i.test(tx.paymentMethodName || "")
              );
              if (isWallet) {
                const maxWallet = (!isNaN(cTime) ? cTime : Date.now()) + 5 * 60 * 1000;
                return Date.now() > maxWallet;
              }
              const expDate =
                tx.fawaterakExpireDate ||
                tx.paymentData?.fawaterakExpireDate ||
                tx.paymentData?.expirationTime ||
                tx.paymentData?.expireDate;
              if (expDate) {
                const expTime = new Date(expDate).getTime();
                if (!isNaN(expTime)) return Date.now() > expTime;
              }
              return false;
            };

            const filterNonCard = (list) => (list || []).filter((s) => {
              const tx = s.transaction || s;
              const methodId = tx.paymentMethodId;
              const name = `${tx.paymentMethodName || s.paymentMethod || ""}`.toLowerCase();
              return (
                methodId !== 2 &&
                !name.includes("visa") &&
                !name.includes("mastercard") &&
                !name.includes("card") &&
                !name.includes("فيزا") &&
                !name.includes("بطاق") &&
                !isTxExpired(s)
              );
            });
            const pendingSubs = filterNonCard(pendingRes.data.subscriptions).map((s) => ({
              ...s,
              type: "subscription",
            }));
            setPendingPayments(pendingSubs);
          }
        } catch (e) {
        }
      } catch (err) {
      } finally {
        if (mounted && !isBackground) setLoading(false);
      }
    };

    loadData(false);

    // Ultra-fast sync: 4-second background poll
    const timer = setInterval(() => {
      loadData(true);
    }, 4000);

    // Instant refresh on focus, visibility change, or socket update
    const onFocus = () => loadData(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadData(true);
      }
    };
    const onRealtimeSync = () => loadData(true);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("thenith_realtime_sync", onRealtimeSync);
    window.addEventListener("thenith_profile_sync", onRealtimeSync);

    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("thenith_realtime_sync", onRealtimeSync);
      window.removeEventListener("thenith_profile_sync", onRealtimeSync);
    };
  }, []);

  const paidPlans = plans.filter((item) => item.key !== "free" && item.isActive !== false);
  const displayPlans = paidPlans.slice().sort((a, b) => {
    if (a.key === "pro") return -1;
    if (b.key === "pro") return 1;
    return 0;
  });

  const proPlan = displayPlans.find((item) => item.key === "pro") || displayPlans[0] || plans.find((item) => item.key === "pro") || null;

  const getFeaturesList = (plan) => {
    return (plan?.marketingFeatures || [])
      .filter((feature) => feature.enabled)
      .map((feature) => {
        return typeof feature.name === 'object' ? (feature.name[isArabic ? "ar" : "en"] || feature.name.ar || feature.name.en) : feature.name;
      });
  };

  const getPlanPricing = (plan) => {
    if (!plan) {
      return {
        originalPrice: 0,
        finalPrice: 0,
        discountAmount: 0,
        appliedDiscountVal: 0,
        discountType: "percentage",
      };
    }
    const originalPrice = isAnnual ? (plan.prices?.yearly || 0) : (plan.prices?.monthly || 0);

    if (appliedCoupon?.result) {
      const discVal = appliedCoupon.result.appliedDiscountVal || 0;
      if (discVal > 0) {
        const discountAmount = Math.round((originalPrice * discVal) / 100);
        return {
          originalPrice,
          finalPrice: Math.max(0, originalPrice - discountAmount),
          discountAmount,
          appliedDiscountVal: discVal,
          discountType: "percentage",
        };
      }
    }

    if (plan.calculatedPrice) {
      const cp = isAnnual ? plan.calculatedPrice.yearly : plan.calculatedPrice.monthly;
      if (cp) return cp;
    }

    return {
      originalPrice,
      finalPrice: originalPrice,
      discountAmount: 0,
      appliedDiscountVal: 0,
      discountType: "percentage",
    };
  };

  // Re-validate coupon when billing period toggles
  useEffect(() => {
    if (!appliedCoupon?.code || !proPlan?._id) return;

    let isMounted = true;
    const period = isAnnual ? "yearly" : "monthly";
    const codeToSend =
      appliedCoupon.isReferral && !appliedCoupon.code?.startsWith("THENITH-")
        ? ""
        : appliedCoupon.code;

    apiClient
      .post("/subscription/validate-coupon", {
        planId: proPlan._id,
        billingPeriod: period,
        couponCode: codeToSend,
      })
      .then(({ data }) => {
        if (!isMounted) return;
        if (data?.isValid) {
          setAppliedCoupon({
            code: data.code || appliedCoupon.code,
            result: data,
            isReferral: Boolean(data.isReferral),
            referralRewardId: data.referralRewardId || null,
          });
        } else {
          setAppliedCoupon(null);
          setCouponMessage({
            type: "error",
            text: data?.message || (isArabic ? "تم إلغاء الكوبون أو حذفه" : "Coupon is no longer valid"),
          });
        }
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, [isAnnual, proPlan?._id]);

  // Auto-detect referral discount from URL link, localStorage, or client's earned renewal discount
  useEffect(() => {
    if (!proPlan?._id) return;

    let isMounted = true;
    const period = isAnnual ? "yearly" : "monthly";

    const urlParams = new URLSearchParams(window.location.search);
    const linkRef = urlParams.get("ref") ? urlParams.get("ref").trim().toUpperCase() : "";
    let storedRef = "";
    try {
      storedRef = (localStorage.getItem("thenith_referral_code") || localStorage.getItem("referral_code") || "").trim().toUpperCase();
    } catch { }

    const targetCode = linkRef || storedRef || "";
    if (targetCode) {
      try {
        localStorage.setItem("thenith_referral_code", targetCode);
        localStorage.setItem("referral_code", targetCode);
      } catch { }
    }

    apiClient
      .post("/subscription/validate-coupon", {
        planId: proPlan._id,
        billingPeriod: period,
        couponCode: targetCode,
      })
      .then(({ data }) => {
        if (!isMounted) return;
        if (data?.isValid) {
          const discountLabel = targetCode || (isArabic ? "خصم التجديد المكتسب" : "Earned Renewal Discount");
          setAppliedCoupon({
            code: data.code || discountLabel,
            result: data,
            isReferral: Boolean(data.isReferral),
            referralRewardId: data.referralRewardId || null,
          });
          if (data.code || targetCode) {
            setCouponInput(data.code || targetCode);
          }
          setCouponMessage({
            type: "success",
            text:
              data.message ||
              (targetCode
                ? isArabic
                  ? `تم تطبيق كود الخصم تلقائياً (خصم ${data.appliedDiscountVal || 10}%)`
                  : `Referral discount applied automatically (${data.appliedDiscountVal || 10}% off)`
                : isArabic
                  ? "تم تطبيق خصم التجديد المكتسب بنجاح"
                  : "Earned renewal discount applied successfully"),
          });
        }
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, [proPlan?._id]);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    if (!proPlan?._id) return;

    setCouponLoading(true);
    setCouponMessage(null);

    try {
      const period = isAnnual ? "yearly" : "monthly";
      const { data } = await apiClient.post("/subscription/validate-coupon", {
        planId: proPlan._id,
        billingPeriod: period,
        couponCode: code,
      });

      if (data?.isValid) {
        setAppliedCoupon({
          code: data.code || code.toUpperCase(),
          result: data,
          isReferral: Boolean(data.isReferral),
          referralRewardId: data.referralRewardId || null,
        });
        setCouponMessage({
          type: "success",
          text: data.message || (isArabic ? "تم تطبيق كوبون الخصم بنجاح" : "Coupon applied successfully"),
        });
        toast.success(data.message || (isArabic ? "تم تطبيق كوبون الخصم بنجاح" : "Coupon applied successfully"));
      } else {
        setCouponMessage({
          type: "error",
          text: data?.message || (isArabic ? "كوبون الخصم غير صالح" : "Invalid coupon code"),
        });
        toast.error(data?.message || (isArabic ? "كوبون الخصم غير صالح" : "Invalid coupon code"));
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || (isArabic ? "حدث خطأ أثناء فحص الكوبون" : "Failed to validate coupon");
      setCouponMessage({
        type: "error",
        text: errMsg,
      });
      toast.error(errMsg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMessage(null);
  };

  // Calculate real annual saving percentage from backend prices
  const monthlyPrice = proPlan?.prices?.monthly || 0;
  const yearlyPrice = proPlan?.prices?.yearly || 0;
  const annualSavingPct =
    monthlyPrice > 0 && yearlyPrice > 0
      ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100)
      : null;

  const isPaymentPlusActive = Boolean(
    currentUser?.paymentPlusActive ||
    userSubscription?.paymentPlusActive ||
    userSubscription?.hasPaymentPlus ||
    (userSubscription?.plan === "payment_plus" &&
      (userSubscription?.status === "active" || userSubscription?.status === "trialing"))
  );

  const isCurrentSubscribed =
    (userSubscription?.plan === proPlan?.key &&
      (userSubscription?.status === "active" ||
        userSubscription?.status === "trialing")) ||
    (proPlan?.key === "payment_plus" && isPaymentPlusActive);
  const isPro = isCurrentSubscribed;

  const getDaysLeft = () => {
    if (typeof userSubscription?.daysRemaining === "number") {
      return userSubscription.daysRemaining;
    }
    if (!userSubscription?.expiresAt) return null;
    const diff = new Date(userSubscription.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysLeft = getDaysLeft();
  const isExpiringSoon = isCurrentSubscribed && daysLeft !== null && daysLeft <= 3;

  const formatDate = (dateStr) => {
    if (!dateStr) return isArabic ? "غير محدد" : "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString(isArabic ? "ar-EG-u-nu-latn" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const proceedToCheckout = async (targetPlan, targetUser = currentUser) => {
    const plan = targetPlan || displayPlans[0] || proPlan;
    if (!plan) return;
    const planName = typeof plan.name === "object"
      ? (plan.name[isArabic ? "ar" : "en"] || plan.name.ar || plan.name.en || plan.name)
      : plan.name;

    const period = isAnnual ? "yearly" : "monthly";
    const pricing = getPlanPricing(plan);
    const price = pricing.finalPrice;

    const effectiveCoupon = appliedCoupon?.code || activeCoupon?.code;
    const isSpecialCoupon =
      effectiveCoupon === "خصم التجديد المكتسب" ||
      effectiveCoupon === "Earned Renewal Discount" ||
      effectiveCoupon === "خصم الإحالة الترحيبي" ||
      effectiveCoupon === "خصم الإحالة المكتسب";
    const cleanCouponCode = !isSpecialCoupon ? effectiveCoupon : undefined;

    // IF PRICE IS 0 OR PLAN IS FREE -> ACTIVATE DIRECTLY WITHOUT PAYMENT GATEWAY
    if (Number(price) <= 0 || plan.key === "free") {
      setSubscribingPlanKey(plan.key);
      try {
        const payload = {
          planId: plan._id,
          billingPeriod: period,
          couponCode: cleanCouponCode,
          applyReferralDiscount: appliedCoupon?.isReferral ? true : undefined,
          referralRewardId: appliedCoupon?.referralRewardId || undefined,
        };
        const { data } = await apiClient.post("/payment/subscription", payload);
        if (data?.success) {
          toast.success(isArabic ? "تم تفعيل الاشتراك مجاناً بنجاح!" : "Subscription activated for free!");
          window.dispatchEvent(new CustomEvent("thenith_realtime_sync"));
          window.location.reload();
          return;
        }
      } catch (err) {
        toast.error(err?.response?.data?.error || err.message);
      } finally {
        setSubscribingPlanKey(null);
      }
      return;
    }

    // Build payment URL with all needed params
    const params = new URLSearchParams({
      type: "subscription",
      planId: plan._id,
      billingPeriod: period,
      amount: price || "",
      planName: planName || "",
      renew: isExpiringSoon ? "true" : "false",
    });

    if (cleanCouponCode) {
      params.append("couponCode", cleanCouponCode);
    }
    if (appliedCoupon?.isReferral) {
      params.append("applyReferralDiscount", "true");
    }
    if (appliedCoupon?.referralRewardId) {
      params.append("referralRewardId", appliedCoupon.referralRewardId);
    }

    navigate(`/payment?${params.toString()}`);
  };

  const handleSubscribe = async (targetPlan) => {
    const plan = targetPlan || displayPlans[0] || proPlan;
    if (!plan) return;
    const pricing = getPlanPricing(plan);

    // 100% Free / Full Discount: Proceed immediately without phone or payment gateway prompt
    if (Number(pricing.finalPrice) <= 0 || plan.key === "free") {
      proceedToCheckout(plan);
      return;
    }

    let activePhone = currentUser?.phone || initialUser?.phone || initialOwner?.phone || authUser?.phone;

    // If phone is missing in current state, verify directly from backend before showing error
    if (!activePhone) {
      setSubscribingPlanKey(plan.key);
      try {
        const token = getAccessToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
          const { data: pData } = await apiClient.get("/panel/profile", { headers });
          if (pData?.profile?.phone) {
            activePhone = pData.profile.phone;
            setCurrentUser((prev) => ({ ...(prev || {}), ...pData.profile }));
          }
        } catch (e) { }

        if (!activePhone) {
          try {
            const { data: mData } = await apiClient.get("/auth/me", { headers });
            if (mData?.user?.phone) {
              activePhone = mData.user.phone;
              setCurrentUser((prev) => ({ ...(prev || {}), ...mData.user }));
            }
          } catch (e) { }
        }
      } finally {
        setSubscribingPlanKey(null);
      }
    }

    if (!activePhone) {
      setSelectedPlanForCheckout(plan);
      toast.error(isArabic ? "يجب إضافة رقم هاتف لحسابك من صفحة الملف الشخصي أولاً لتفعيل الاشتراك." : "Please add a phone number to your profile first.");
      setShowProfileModal(true);
      return;
    }

    proceedToCheckout(plan);
  };


  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const token = getAccessToken();
      const { data } = await apiClient.post(
        "/subscription/cancel",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        setUserSubscription(data.state || null);
        setCurrentUser((prev) => ({
          ...(prev || {}),
          paymentPlusActive: false,
        }));
        setCancelMessage({
          type: "success",
          text: t("cancelledSuccessfully"),
        });
        setShowCancelConfirm(false);
        window.dispatchEvent(new CustomEvent("thenith_profile_sync"));
        window.dispatchEvent(new CustomEvent("thenith_realtime_sync"));
        // Notify bell notifications
        window.dispatchEvent(
          new CustomEvent("dashboard-action", {
            detail: {
              type: "subscription_cancelled",
              title: isArabic
                ? "تم إلغاء الاشتراك بنجاح"
                : "Subscription cancelled successfully",
            },
          }),
        );
      } else {
        throw new Error(data.message || "فشل إلغاء الاشتراك");
      }
    } catch (err) {
      setCancelMessage({
        type: "error",
        text:
          err.message ||
          (isArabic ? "حدث خطأ أثناء إلغاء الاشتراك" : "Failed to cancel"),
      });
    } finally {
      setCancelling(false);
    }
  };

  if (!loading && !proPlan) {
    return (
      <div
        className="space-y-8 pb-20 p-2 sm:p-0"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="text-center pt-4 pb-2">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {isArabic ? "إدارة الاشتراك" : "Subscription Management"}
          </h1>
          <p className="mt-6 text-slate-500 dark:text-slate-400">
            {t("noPlansAvailable")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 relative" dir={isArabic ? "rtl" : "ltr"}>
      {/* Section Header */}
      <div className="text-center pt-2 sm:pt-4 pb-2">
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {t("subscriptionManagement")}
        </h1>
        <p className="mt-2 sm:mt-3 text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          {t("controlYourPlan")}
        </p>
      </div>

      {loading ? (
        <SubscriptionsSkeleton isArabic={isArabic} />
      ) : (
        <div className="max-w-5xl mx-auto">
          {/* Notification Feedback */}
          {cancelMessage && (
            <div
              className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${cancelMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
            >
              {cancelMessage.type === "success" ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{cancelMessage.text}</span>
            </div>
          )}

          {/* Top Billing Period Toggle (شهري / سنوي) */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="bg-slate-900/90 dark:bg-slate-900 backdrop-blur-md p-1.5 rounded-full flex items-center border border-slate-700/60 shadow-lg relative w-[340px] max-w-full">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`flex-1 relative z-10 py-2.5 rounded-full font-bold text-sm sm:text-base transition-all duration-300 ${!isAnnual
                  ? "text-white"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                {t("monthlyPeriod")}
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`flex-1 relative z-10 py-2.5 rounded-full font-bold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 ${isAnnual
                  ? "text-white"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                <span>{t("annual")}</span>
                {annualSavingPct > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isAnnual ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"}`}>
                    {t("savePct")} {annualSavingPct}%
                  </span>
                )}
              </button>

              {/* Sliding Background */}
              <div
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-full transition-all duration-300 shadow-md bg-indigo-600 border border-indigo-500"
                style={{
                  insetInlineStart: !isAnnual ? "0.375rem" : "calc(50% + 0.1875rem)"
                }}
              />
            </div>

            {/* Global Coupon Code Input */}
            <div className="mt-4 w-full max-w-[340px]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={
                    appliedCoupon
                      ? appliedCoupon.isReferral
                        ? `${isArabic ? "خصم الإحالة / التجديد" : "Discount"} (${appliedCoupon?.result?.appliedDiscountVal || 10}%)`
                        : appliedCoupon.code
                      : couponInput
                  }
                  onChange={(e) => {
                    setCouponInput(e.target.value);
                    if (couponMessage) setCouponMessage(null);
                  }}
                  placeholder="هل لديك كوبون خصم؟"
                  disabled={couponLoading || !!appliedCoupon}
                  className="flex-1 bg-slate-900/60 dark:bg-slate-900 border border-slate-700/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-400 outline-none transition disabled:opacity-60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!appliedCoupon) handleApplyCoupon();
                    }
                  }}
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{isArabic ? "إزالة" : "Remove"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                  >
                    {couponLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isArabic ? "تطبيق" : "Apply"}</span>
                  </button>
                )}
              </div>
              {couponMessage && (
                <p
                  className={`text-xs mt-1.5 font-medium text-center ${couponMessage.type === "success" ? "text-emerald-400" : "text-rose-400"
                    }`}
                >
                  {couponMessage.text}
                </p>
              )}
            </div>
          </div>

          {/* Pending Payments Banner (if any) */}
          {pendingPayments.length > 0 ? (
            <div className="mb-8 space-y-4 text-start">
              {pendingPayments.map((item, idx) => {
                const tx = item.transaction || item;
                const planName = typeof item.planId?.name === "object"
                  ? (item.planId.name[isArabic ? "ar" : "en"] || item.planId.name.ar)
                  : (item.planId?.name || "pro");

                return (
                  <div
                    key={idx}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-black text-amber-200 text-base sm:text-lg">
                          {isArabic ? "دفع اشتراك غير مكتمل" : "Incomplete Subscription Payment"}
                        </h4>
                        <p className="text-slate-300 text-xs sm:text-sm mt-1">
                          {isArabic
                            ? `لديك طلب اشتراك في باقة ${planName} قيد انتظار الدفع.`
                            : `You have a pending subscription payment for ${planName} plan.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full sm:w-auto shrink-0 gap-2">
                      <button
                        onClick={async () => {
                          const confirmCancel = window.confirm(
                            isArabic
                              ? "هل أنت متأكد من إلغاء هذا الدفع؟"
                              : "Are you sure you want to cancel this payment?"
                          );
                          if (!confirmCancel) return;
                          try {
                            const token = getAccessToken();
                            const headers = token ? { Authorization: `Bearer ${token}` } : {};
                            await apiClient.post("/payment/cancel", { intentKey: tx?.intentKey }, { headers });
                            toast.success(isArabic ? "تم إلغاء الدفع بنجاح" : "Payment cancelled");
                            setPendingPayments((prev) => prev.filter(p => (p.transaction || p).intentKey !== tx?.intentKey));
                          } catch (err) {
                            toast.error(isArabic ? "حدث خطأ أثناء الإلغاء" : "Failed to cancel");
                          }
                        }}
                        className="w-1/2 sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-3 rounded-xl text-sm font-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 border border-slate-700 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{isArabic ? "إلغاء" : "Cancel"}</span>
                      </button>

                      <button
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set("type", "subscription");
                          if (item.planId?._id || item.planId) {
                            params.set("planId", item.planId?._id || item.planId);
                          }
                          params.set("id", item._id);
                          const cleanIntent = tx?.intentKey || item.intentKey;
                          if (cleanIntent && cleanIntent !== "undefined" && cleanIntent !== "null") {
                            params.set("intentKey", cleanIntent);
                          }
                          const period =
                            item.billingPeriod ||
                            tx?.paymentData?.targetBillingPeriod ||
                            "monthly";
                          params.set("billingPeriod", period);
                          window.location.href = `/payment?${params.toString()}`;
                        }}
                        className="w-1/2 sm:w-auto shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl text-sm font-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                      >
                        <span>{isArabic ? "استكمال الدفع" : "Complete Payment"}</span>
                        {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* TWO PLAN CARDS SIDE BY SIDE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
            {displayPlans.map((plan) => {
              const isThisSubscribed = checkIsSubscribed(plan);
              const planName = typeof plan.name === "object"
                ? (plan.name[isArabic ? "ar" : "en"] || plan.name.ar || plan.name.en || plan.name)
                : plan.name;
              const pricing = getPlanPricing(plan);
              const features = getFeaturesList(plan);
              const isExpanded = Boolean(expandedFeatures[plan.key]);
              const visibleFeatures = isExpanded ? features : features.slice(0, 5);
              const isCurrentExpiring = isThisSubscribed && daysLeft !== null && daysLeft <= 3;
              const isSubscribingThis = subscribingPlanKey === plan.key;

              return (
                <motion.div
                  key={plan._id || plan.key}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`relative rounded-3xl sm:rounded-[32px] p-6 sm:p-8 shadow-2xl border text-white overflow-hidden flex flex-col justify-between ${
                    plan.key === "pro"
                      ? "bg-slate-900 border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-indigo-950/20"
                      : "bg-slate-900 border-slate-800 shadow-slate-950/40"
                  }`}
                >
                  {/* Background Glow */}
                  <div
                    className={`absolute -top-24 -end-24 w-60 h-60 rounded-full blur-3xl pointer-events-none ${
                      plan.key === "pro" ? "bg-indigo-500/10" : "bg-emerald-500/10"
                    }`}
                  />

                  <div>
                    {/* Header: Title, Description & Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                          <span>{planName}</span>
                          {isThisSubscribed && (
                            <BadgeCheck className="w-6 h-6 text-emerald-400" />
                          )}
                        </h3>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                          {plan.key === "payment_plus"
                            ? (isArabic
                                ? "صفحة ورابط الدفع الموحد لكافة محافظك الإلكترونية"
                                : "Unified smart payment page and link for all your digital wallets")
                            : (isArabic
                                ? "كل ما تحتاجه للنجاح والاحترافية بدون أي قيود"
                                : "Everything you need to succeed without limits")}
                        </p>
                      </div>

                      {/* Status / Feature Pill */}
                      <div className="shrink-0 self-start">
                        {isThisSubscribed ? (
                          isCurrentExpiring ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                              <span>{isArabic ? "ينتهي قريباً" : "Expiring soon"}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span>{isArabic ? "مفعل" : "Active"}</span>
                            </div>
                          )
                        ) : plan.key === "pro" ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
                            <span>{t("mostFeatured")}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
                            <span>{isArabic ? "باقة الدفع" : "Payment Hub"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* If Subscribed: Details Banner */}
                    {isThisSubscribed && (
                      <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 text-indigo-300 font-bold border-b border-white/10 pb-2">
                          <Calendar className="w-4 h-4" />
                          <span>{t("currentSubDetails")}:</span>
                        </div>
                        {userSubscription?.expiresAt && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400">
                              {t("expiryDate")} / {t("renewalDate")}:
                            </span>
                            <span className={`font-bold ${isCurrentExpiring ? "text-amber-400" : "text-emerald-400"}`}>
                              {formatDate(userSubscription.expiresAt)}
                              {daysLeft !== null && (
                                <span className="ms-2 text-[10px] bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                                  {daysLeft === 0
                                    ? (isArabic ? "ينتهي اليوم" : "Expires today")
                                    : (isArabic ? `متبقي ${daysLeft} يوم` : `${daysLeft}d left`)}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {userSubscription?.billingPeriod && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-400">{t("billingCycle")}:</span>
                            <span className="font-bold text-indigo-200">
                              {userSubscription.billingPeriod === "yearly"
                                ? t("annual")
                                : t("monthlyPeriod")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Price Block */}
                    {(!isThisSubscribed || isCurrentExpiring) && (
                      <div className="mb-6">
                        {pricing.discountAmount > 0 && (
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-slate-400 line-through text-sm sm:text-base" dir="ltr">
                              {pricing.originalPrice} {isArabic ? "ج.م" : "EGP"}
                            </span>
                            <span className="bg-rose-500/20 text-rose-400 text-[11px] font-bold px-2 py-0.5 rounded-full border border-rose-500/20">
                              {pricing.discountType === "percentage"
                                ? `خصم ${pricing.appliedDiscountVal}%`
                                : `خصم ${pricing.appliedDiscountVal} ج.م`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-black text-white" dir="ltr">
                            {pricing.finalPrice}
                            <span className="text-lg ms-1.5">{isArabic ? "ج.م" : "EGP"}</span>
                          </span>
                          <span className="text-slate-400 font-bold text-xs sm:text-sm">
                            / {isAnnual ? t("perYear") : t("perMonth")}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="mb-6">
                      {isCurrentExpiring ? (
                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={() => handleSubscribe(plan)}
                            disabled={isSubscribingThis}
                            className="relative flex items-center justify-center w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base transition-all group overflow-hidden disabled:opacity-50 shadow-lg shadow-emerald-600/30 cursor-pointer"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {isSubscribingThis ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                isArabic ? "تجديد الاشتراك الآن" : "Renew Subscription"
                              )}
                              {!isSubscribingThis && (
                                <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                              )}
                            </span>
                          </button>
                        </div>
                      ) : isThisSubscribed ? (
                        <div>
                          {showCancelConfirm ? (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-center">
                              <p className="text-rose-200 font-bold text-xs mb-3">
                                {t("confirmCancelSub")}
                              </p>
                              <div className="flex gap-2 justify-center">
                                <button
                                  type="button"
                                  onClick={handleCancelSubscription}
                                  disabled={cancelling}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                  {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  <span>{isArabic ? "تأكيد الإلغاء" : "Confirm"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowCancelConfirm(false)}
                                  disabled={cancelling}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                                >
                                  {t("revert")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowCancelConfirm(true)}
                              className="w-full py-3 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>{isArabic ? "إلغاء الاشتراك" : "Cancel Subscription"}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSubscribe(plan)}
                          disabled={isSubscribingThis}
                          className={`relative flex items-center justify-center w-full py-3.5 rounded-2xl text-white font-bold text-sm sm:text-base transition-all group overflow-hidden disabled:opacity-50 shadow-lg cursor-pointer ${
                            pricing.finalPrice === 0
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30"
                              : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"
                          }`}
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            {isSubscribingThis ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : pricing.finalPrice === 0 ? (
                              isArabic ? "تفعيل مجاناً (خصم 100%)" : "Activate Free"
                            ) : (
                              t("subscribeNowBtn")
                            )}
                            {!isSubscribingThis && (
                              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            )}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Features Section */}
                  <div className="pt-6 border-t border-slate-800">
                    <p className="text-xs font-bold text-indigo-300 mb-3.5">
                      {isArabic ? "المميزات المضمنة في الباقة:" : "Included features:"}
                    </p>

                    <div className="space-y-3">
                      {visibleFeatures.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                          <span className="text-slate-300 text-xs sm:text-sm font-medium">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {features.length > 5 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFeatures((prev) => ({
                            ...prev,
                            [plan.key]: !prev[plan.key],
                          }))
                        }
                        className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>{t("hideDetails")}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>{`${t("showMoreFeatures")} (${features.length - 5})`}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}          </div>
        </div>
      )}

      {/* Pending Payment Details Modal (Removed) */}

      {/* Complete Missing Profile Details Modal */}
      <CompleteProfileModal
        isOpen={showProfileModal}
        currentUser={currentUser}
        onClose={() => setShowProfileModal(false)}
        onSuccess={(updatedUser) => {
          setCurrentUser(updatedUser);
          setShowProfileModal(false);
          proceedToCheckout(selectedPlanForCheckout || displayPlans[0], updatedUser);
        }}
      />
    </div>
  );
}
