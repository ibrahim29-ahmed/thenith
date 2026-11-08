import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Calendar,
  AlertCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Clock,
  ArrowLeft,
  Tag,
  Sparkles,
  X,
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
  const [expandedSubDetails, setExpandedSubDetails] = useState({});
  const [openCouponPlanKey, setOpenCouponPlanKey] = useState(null);
  const [couponInputs, setCouponInputs] = useState({});
  const [appliedCoupons, setAppliedCoupons] = useState({});
  const [couponLoadingPlanKey, setCouponLoadingPlanKey] = useState(null);
  const [couponCardMessages, setCouponCardMessages] = useState({});
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
  const [showSwitchPeriodConfirm, setShowSwitchPeriodConfirm] = useState(null);
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

  const handleApplyCardCoupon = async (plan) => {
    const code = (couponInputs[plan.key] || "").trim();
    if (!code) return;
    setCouponLoadingPlanKey(plan.key);
    setCouponCardMessages((prev) => ({ ...prev, [plan.key]: null }));

    try {
      const period = isAnnual ? "yearly" : "monthly";
      const { data } = await apiClient.post("/subscription/validate-coupon", {
        planId: plan._id,
        billingPeriod: period,
        couponCode: code,
      });

      if (data?.isValid) {
        setAppliedCoupons((prev) => ({
          ...prev,
          [plan.key]: {
            code: data.code || code,
            result: data,
          },
        }));
        setCouponCardMessages((prev) => ({
          ...prev,
          [plan.key]: {
            type: "success",
            text: isArabic ? "تم تطبيق الكود بنجاح!" : "Coupon applied!",
          },
        }));
        toast.success(isArabic ? "تم تطبيق الكود بنجاح" : "Coupon applied successfully");
      } else {
        setCouponCardMessages((prev) => ({
          ...prev,
          [plan.key]: {
            type: "error",
            text: data?.message || (isArabic ? "كود غير صالح" : "Invalid coupon"),
          },
        }));
        toast.error(data?.message || (isArabic ? "كود الخصم غير صالح" : "Invalid coupon code"));
      }
    } catch (err) {
      setCouponCardMessages((prev) => ({
        ...prev,
        [plan.key]: {
          type: "error",
          text: err.response?.data?.message || err.message,
        },
      }));
    } finally {
      setCouponLoadingPlanKey(null);
    }
  };

  const handleRemoveCardCoupon = (planKey) => {
    setAppliedCoupons((prev) => {
      const copy = { ...prev };
      delete copy[planKey];
      return copy;
    });
    setCouponInputs((prev) => ({ ...prev, [planKey]: "" }));
    setCouponCardMessages((prev) => ({ ...prev, [planKey]: null }));
    setOpenCouponPlanKey(null);
  };

  const getPlanPricing = (plan, customIsAnnual = undefined) => {
    if (!plan) {
      return {
        originalPrice: 0,
        finalPrice: 0,
        discountAmount: 0,
        appliedDiscountVal: 0,
        discountType: "percentage",
        upgradeDiscountAmount: 0,
        ppDaysUsed: 0,
      };
    }
    const annual = customIsAnnual !== undefined ? customIsAnnual : isAnnual;
    const billingKey = annual ? "yearly" : "monthly";
    const serverPrice = plan.calculatedPrice?.[billingKey];
    const originalPrice = Number(serverPrice?.originalPrice ?? (annual ? plan.prices?.yearly : plan.prices?.monthly) ?? 0);
    // A card-specific coupon only affects its own plan. The main coupon applies
    // to Pro, which is the plan it is validated against.
    const planCoupon = appliedCoupons[plan.key] || (plan.key === "pro" ? appliedCoupon : null);

    let discountAmount = Number(serverPrice?.discountAmount || 0);
    let appliedDiscountVal = Number(serverPrice?.appliedDiscountVal || 0);
    let discountType = serverPrice?.discountType || "percentage";
    let couponFinalPrice = Math.max(0, originalPrice - discountAmount);

    if (planCoupon?.result) {
      discountAmount = Number(planCoupon.result.discountAmount || 0);
      appliedDiscountVal = Number(planCoupon.result.appliedDiscountVal || 0);
      discountType = planCoupon.result.discountType || "percentage";
      couponFinalPrice = Number.isFinite(Number(planCoupon.result.finalPrice))
        ? Number(planCoupon.result.finalPrice)
        : Math.max(0, originalPrice - discountAmount);
    }

    // Upgrade discount from Payment Plus to Pro:
    let upgradeDiscountAmount = 0;
    let ppDaysUsed = 0;
    const isProPlan = plan.key === "pro";
    const isAlreadyPro = Boolean(
      userSubscription?.activeSubscriptions?.pro ||
      userSubscription?.isPro ||
      (userSubscription?.plan === "pro" && (userSubscription?.status === "active" || userSubscription?.status === "trialing"))
    );

    if (isProPlan && !isAlreadyPro && isPaymentPlusActive) {
      const ppDetails = userSubscription?.paymentPlusDetails;
      ppDaysUsed = ppDetails?.daysUsed || 0;
      upgradeDiscountAmount = ppDetails?.upgradeDiscount || (ppDaysUsed * 3);
    }

    const finalPrice = Math.max(0, couponFinalPrice - upgradeDiscountAmount);

    return {
      originalPrice,
      finalPrice,
      discountAmount,
      appliedDiscountVal,
      discountType,
      upgradeDiscountAmount,
      ppDaysUsed,
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
    userSubscription
      ? userSubscription.paymentPlusActive || userSubscription.hasPaymentPlus
      : (currentUser?.paymentPlusActive || currentUser?.hasPaymentPlus)
  );

  const isPro = Boolean(
    userSubscription
      ? userSubscription.isPro || (userSubscription.plan === "pro" && (userSubscription.status === "active" || userSubscription.status === "trialing"))
      : (currentUser?.isPro || currentUser?.plan === "pro")
  );

  const checkIsSubscribed = (plan) => {
    if (!plan) return false;
    if (plan.key === "payment_plus") {
      // Standalone Payment Plus subscription only
      if (userSubscription) {
        return Boolean(
          userSubscription.activeSubscriptions?.payment_plus ||
          (userSubscription.plan === "payment_plus" &&
            (userSubscription.status === "active" || userSubscription.status === "trialing")) ||
          (userSubscription.hasStandalonePaymentPlus && userSubscription.paymentPlusActive)
        );
      }
      return Boolean(currentUser?.hasStandalonePaymentPlus && currentUser?.paymentPlusActive);
    }
    if (plan.key === "pro") {
      if (userSubscription) {
        return Boolean(
          userSubscription.activeSubscriptions?.pro ||
          userSubscription.isPro ||
          (userSubscription.plan === "pro" &&
            (userSubscription.status === "active" || userSubscription.status === "trialing"))
        );
      }
      return Boolean(currentUser?.isPro || currentUser?.plan === "pro");
    }
    return Boolean(
      userSubscription?.plan === plan.key &&
      (userSubscription?.status === "active" || userSubscription?.status === "trialing")
    );
  };

  const isCurrentSubscribed = checkIsSubscribed(proPlan);

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
  const hasOpenPlanDetails =
    Object.values(expandedFeatures).some(Boolean) ||
    Object.values(expandedSubDetails).some(Boolean);

  const formatDate = (dateStr) => {
    if (!dateStr) return isArabic ? "غير محدد" : "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString(isArabic ? "ar-EG-u-nu-latn" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const proceedToCheckout = async (targetPlan, targetUser = currentUser, overridePeriod = null) => {
    const plan = targetPlan || displayPlans[0] || proPlan;
    if (!plan) return;
    const planName = typeof plan.name === "object"
      ? (plan.name[isArabic ? "ar" : "en"] || plan.name.ar || plan.name.en || plan.name)
      : plan.name;

    const period = overridePeriod || (isAnnual ? "yearly" : "monthly");
    const pricing = getPlanPricing(plan, period === "yearly");
    const price = pricing.finalPrice;

    const effectiveCoupon = appliedCoupons[plan.key]?.code || appliedCoupon?.code || activeCoupon?.code;
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
          applyUpgradeDiscount: pricing.upgradeDiscountAmount > 0 ? true : undefined,
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

    if (pricing.upgradeDiscountAmount > 0) {
      params.append("applyUpgradeDiscount", "true");
    }

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

    // Check if user is currently active on monthly subscription and switching to yearly
    const planKey = plan.key;
    const planSubDetails =
      planKey === "pro"
        ? userSubscription?.activeSubscriptions?.pro
        : (userSubscription?.activeSubscriptions?.payment_plus || userSubscription?.paymentPlusDetails);
    const existingBillingPeriod = planSubDetails?.billingPeriod || userSubscription?.billingPeriod;
    const isSubscribedToPlan = Boolean(
      (planKey === "pro" && userSubscription?.isPro) ||
      (planKey === "payment_plus" && (userSubscription?.paymentPlusActive || userSubscription?.hasStandalonePaymentPlus))
    );

    const targetPeriod = isAnnual ? "yearly" : "monthly";
    if (isSubscribedToPlan && existingBillingPeriod === "monthly" && targetPeriod === "yearly") {
      setShowSwitchPeriodConfirm({
        plan,
        fromPeriod: "monthly",
        toPeriod: "yearly",
      });
      return;
    }

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


  const handleCancelSubscription = async (targetPlan) => {
    const planKey = targetPlan?.key || (typeof showCancelConfirm === "string" ? showCancelConfirm : undefined);
    setCancelling(true);
    try {
      const token = getAccessToken();
      const { data } = await apiClient.post(
        "/subscription/cancel",
        { planKey },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data.success) {
        setUserSubscription(data.state || null);
        if (data.state) {
          setCurrentUser((prev) => ({
            ...(prev || {}),
            paymentPlusActive: Boolean(data.state.paymentPlusActive),
            hasStandalonePaymentPlus: Boolean(data.state.hasStandalonePaymentPlus),
            isPro: Boolean(data.state.isPro),
          }));
        } else {
          setCurrentUser((prev) => ({
            ...(prev || {}),
            paymentPlusActive: false,
            hasStandalonePaymentPlus: false,
          }));
        }

        try {
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          if (stored && stored._id) {
            stored.paymentPlusActive = Boolean(data.state?.paymentPlusActive);
            stored.hasStandalonePaymentPlus = Boolean(data.state?.hasStandalonePaymentPlus);
            stored.isPro = Boolean(data.state?.isPro);
            localStorage.setItem("user", JSON.stringify(stored));
          }
        } catch {}

        setShowCancelConfirm(null);
        toast.success(data.message || (isArabic ? "تم إلغاء الاشتراك بنجاح" : "Subscription cancelled successfully"));
        window.dispatchEvent(new CustomEvent("thenith_profile_sync"));
        window.dispatchEvent(new CustomEvent("thenith_realtime_sync"));
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
      toast.error(err.response?.data?.message || err.message || (isArabic ? "حدث خطأ أثناء إلغاء الاشتراك" : "Failed to cancel"));
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmSwitchPeriod = async () => {
    if (!showSwitchPeriodConfirm) return;
    const { plan, fromPeriod, toPeriod } = showSwitchPeriodConfirm;
    setCancelling(true);
    try {
      const token = getAccessToken();
      const { data } = await apiClient.post(
        "/subscription/cancel",
        {
          planKey: plan.key,
          reason: `تغيير فترة الاشتراك من ${fromPeriod === "monthly" ? "شهري" : "سنوي"} إلى ${toPeriod === "yearly" ? "سنوي" : "شهري"}`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (data?.success) {
        setUserSubscription(data.state || null);
        if (data.state) {
          setCurrentUser((prev) => ({
            ...(prev || {}),
            paymentPlusActive: Boolean(data.state.paymentPlusActive),
            hasStandalonePaymentPlus: Boolean(data.state.hasStandalonePaymentPlus),
            isPro: Boolean(data.state.isPro),
          }));
        }

        const targetPeriod = toPeriod;
        setShowSwitchPeriodConfirm(null);
        toast.success(
          isArabic
            ? `تم إلغاء الاشتراك ${fromPeriod === "monthly" ? "الشهري" : "السنوي"}، جاري توجيهك لصفحة الدفع...`
            : "Subscription updated, redirecting to payment..."
        );
        proceedToCheckout(plan, currentUser, targetPeriod);
      } else {
        throw new Error(data?.message || "فشل تغيير الاشتراك");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        err.message ||
        (isArabic ? "حدث خطأ أثناء تغيير الاشتراك" : "Failed to change subscription")
      );
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
            <div className="bg-indigo-50/80 dark:bg-slate-900 backdrop-blur-md p-1.5 rounded-full flex items-center border border-indigo-100 dark:border-slate-700/60 shadow-lg shadow-indigo-100/70 dark:shadow-black/20 relative w-[340px] max-w-full">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`flex-1 relative z-10 py-2.5 rounded-full font-bold text-sm sm:text-base transition-all duration-300 ${!isAnnual
                  ? "text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
              >
                {t("monthlyPeriod")}
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`flex-1 relative z-10 py-2.5 rounded-full font-bold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 ${isAnnual
                  ? "text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
              >
                <span>{t("annual")}</span>
                {annualSavingPct > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isAnnual ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400"}`}>
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
                          navigate(`/payment?${params.toString()}`);
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
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 ${hasOpenPlanDetails ? "items-start" : "items-stretch"}`}>
            {displayPlans.map((plan) => {
              const planKey = String(plan.key || plan._id);
              const isThisSubscribed = checkIsSubscribed(plan);
              const planName = typeof plan.name === "object"
                ? (plan.name[isArabic ? "ar" : "en"] || plan.name.ar || plan.name.en || plan.name)
                : plan.name;
              const pricing = getPlanPricing(plan);
              const features = getFeaturesList(plan);
              const isExpanded = Boolean(expandedFeatures[planKey]);
              const isPaymentPlus = plan.key === "payment_plus";
              const initialFeatureCount = isPaymentPlus ? features.length : 9;
              const visibleFeatures = isExpanded ? features : features.slice(0, initialFeatureCount);

              const planSubDetails = plan.key === "pro"
                ? userSubscription?.activeSubscriptions?.pro
                : (userSubscription?.activeSubscriptions?.payment_plus || userSubscription?.paymentPlusDetails);
              const cardExpiresAt = planSubDetails?.expiresAt || userSubscription?.expiresAt;
              const cardBillingPeriod = planSubDetails?.billingPeriod || userSubscription?.billingPeriod;
              const cardDaysLeft = planSubDetails?.daysRemaining ?? daysLeft;

              const isCurrentExpiring = isThisSubscribed && cardDaysLeft !== null && cardDaysLeft <= 3;
              const isSubscribingThis = subscribingPlanKey === plan.key;

              const currentViewPeriod = isAnnual ? "yearly" : "monthly";
              const isSubscribedToCurrentPeriod = isThisSubscribed && (cardBillingPeriod === currentViewPeriod || !cardBillingPeriod);
              const isSwitchingPeriod = isThisSubscribed && Boolean(cardBillingPeriod) && cardBillingPeriod !== currentViewPeriod;

              return (
                <motion.div
                  key={plan._id || plan.key}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`relative rounded-3xl sm:rounded-[32px] p-6 sm:p-8 shadow-2xl border text-slate-900 dark:text-white overflow-hidden flex flex-col justify-between ${
                    plan.key === "pro"
                      ? "bg-indigo-50/80 border-indigo-200 ring-1 ring-indigo-100 shadow-indigo-100 dark:bg-slate-900 dark:border-indigo-500/40 dark:ring-indigo-500/20 dark:shadow-indigo-950/20"
                      : "bg-emerald-50/70 border-emerald-200 shadow-emerald-100 dark:bg-slate-900 dark:border-slate-800 dark:shadow-slate-950/40"
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
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{planName}</span>
                          {isThisSubscribed && (
                            <BadgeCheck className="w-6 h-6 text-emerald-400" />
                          )}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
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
                          isSwitchingPeriod ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                              <span>
                                {cardBillingPeriod === "monthly"
                                  ? (isArabic ? "مشترك شهرياً" : "Monthly Active")
                                  : (isArabic ? "مشترك سنوياً" : "Yearly Active")}
                              </span>
                            </div>
                          ) : isCurrentExpiring ? (
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
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 text-xs font-bold">
                            <span>{isArabic ? "باقة الدفع" : "Payment Hub"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* If Subscribed: Details Banner with Independent Toggle */}
                    {isThisSubscribed && (
                      <div className="mb-6">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSubDetails((prev) => ({
                              ...prev,
                              [planKey]: !prev[planKey],
                            }))
                          }
                          className="w-full flex items-center justify-between p-3.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 rounded-2xl text-xs font-bold text-indigo-700 dark:text-indigo-200 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>{t("currentSubDetails")}</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{expandedSubDetails[planKey] ? (isArabic ? "إخفاء التفاصيل" : "Hide") : (isArabic ? "إظهار التفاصيل" : "Show")}</span>
                            {expandedSubDetails[planKey] ? (
                              <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            )}
                          </span>
                        </button>

                        {/* Collapsible Details Content */}
                        {expandedSubDetails[planKey] && (
                          <div className="mt-2.5 p-4 sm:p-5 bg-white/70 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl space-y-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5">
                              <span className="text-slate-600 dark:text-slate-400 text-xs font-bold">
                                {isArabic ? "حالة الاشتراك" : "Status"}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>{isArabic ? "نشط الآن" : "Active"}</span>
                              </span>
                            </div>

                            <div className="space-y-2.5 pt-0.5">
                              {cardExpiresAt && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-0.5">
                                  <span className="text-slate-600 dark:text-slate-400 text-xs shrink-0">
                                    {t("expiryDate")} / {t("renewalDate")}:
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-black text-xs sm:text-sm ${isCurrentExpiring ? "text-amber-400" : "text-emerald-400"}`}>
                                      {formatDate(cardExpiresAt)}
                                    </span>
                                    {cardDaysLeft !== null && (
                                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                                        isCurrentExpiring 
                                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30" 
                                          : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                      }`}>
                                        {cardDaysLeft === 0
                                          ? (isArabic ? "ينتهي اليوم" : "Expires today")
                                          : (isArabic ? `متبقي ${cardDaysLeft} يوم` : `${cardDaysLeft}d left`)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {cardBillingPeriod && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-0.5 border-t border-slate-200 dark:border-white/5 pt-2">
                                  <span className="text-slate-600 dark:text-slate-400 text-xs shrink-0">{t("billingCycle")}:</span>
                                  <span className="font-bold text-indigo-700 dark:text-indigo-200 text-xs sm:text-sm">
                                    {cardBillingPeriod === "yearly"
                                      ? (isArabic ? "سنوي" : t("annual"))
                                      : (isArabic ? "شهري" : t("monthlyPeriod"))}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Upgrade Discount Banner from Payment Plus */}
                    {pricing.upgradeDiscountAmount > 0 && !isThisSubscribed && (
                      <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-1">
                          <span>{isArabic ? "خصم الترقية من باقة المدفوعات" : "Payment Plus Upgrade Discount"}</span>
                          <span className="bg-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-black">
                            -{pricing.upgradeDiscountAmount} {isArabic ? "ج.م" : "EGP"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                          {isArabic
                            ? `عدد أيام استخدامك لباقة المدفوعات (${pricing.ppDaysUsed} يوم) تم احتسابها كخصم مباشر يُخصم من قيمة اشتراك باقة برو.`
                            : `Your ${pricing.ppDaysUsed} active days on Payment Plus have been applied as a direct discount on Pro.`}
                        </p>
                      </div>
                    )}

                    {/* Price Block */}
                    {(!isThisSubscribed || isCurrentExpiring || isSwitchingPeriod) && (
                      <div className="mb-4">
                        {(pricing.discountAmount > 0 || pricing.upgradeDiscountAmount > 0) && (
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-slate-500 dark:text-slate-400 line-through text-sm sm:text-base" dir="ltr">
                              {pricing.originalPrice} {isArabic ? "ج.م" : "EGP"}
                            </span>
                            {pricing.discountAmount > 0 && (
                              <span className="bg-rose-500/20 text-rose-400 text-[11px] font-bold px-2 py-0.5 rounded-full border border-rose-500/20">
                                {`كوبون خصم: ${pricing.discountAmount} ج.م`}
                              </span>
                            )}
                            {pricing.upgradeDiscountAmount > 0 && (
                              <span className="bg-emerald-500/20 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                {`خصم ترقية: ${pricing.upgradeDiscountAmount} ج.م`}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white" dir="ltr">
                            {pricing.finalPrice}
                            <span className="text-lg ms-1.5">{isArabic ? "ج.م" : "EGP"}</span>
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 font-bold text-xs sm:text-sm">
                            / {isAnnual ? t("perYear") : t("perMonth")}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* In-Card Coupon Code Section (Inside each subscription) */}
                    {(!isThisSubscribed || isCurrentExpiring || isSwitchingPeriod) && (
                      <div className="mb-5 pt-3 border-t border-slate-200 dark:border-slate-800">
                        {appliedCoupons[plan.key] ? (
                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold">
                              <Tag className="w-3.5 h-3.5 shrink-0" />
                              <span>{appliedCoupons[plan.key].code}</span>
                              <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                {pricing.discountType === "percentage"
                                  ? `${pricing.appliedDiscountVal}% ${isArabic ? "خصم" : "OFF"}`
                                  : `-${pricing.discountAmount} ${isArabic ? "ج.م" : "EGP"}`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCardCoupon(plan.key)}
                              className="text-slate-400 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                              title={isArabic ? "إزالة الكود" : "Remove"}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : openCouponPlanKey === plan.key ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={couponInputs[plan.key] || ""}
                                onChange={(e) => {
                                  setCouponInputs((prev) => ({ ...prev, [plan.key]: e.target.value }));
                                  setCouponCardMessages((prev) => ({ ...prev, [plan.key]: null }));
                                }}
                                placeholder={isArabic ? "أدخل كود الخصم" : "Enter coupon code"}
                                disabled={couponLoadingPlanKey === plan.key}
                                className="flex-1 bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleApplyCardCoupon(plan);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleApplyCardCoupon(plan)}
                                disabled={couponLoadingPlanKey === plan.key || !couponInputs[plan.key]?.trim()}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                {couponLoadingPlanKey === plan.key && <Loader2 className="w-3 h-3 animate-spin" />}
                                <span>{isArabic ? "تطبيق" : "Apply"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setOpenCouponPlanKey(null)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {couponCardMessages[plan.key] && (
                              <p className={`text-[11px] font-medium ${couponCardMessages[plan.key]?.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                                {couponCardMessages[plan.key]?.text}
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOpenCouponPlanKey(plan.key)}
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer py-1"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>{isArabic ? "إضافة كود خصم" : "Add discount coupon"}</span>
                          </button>
                        )}
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
                      ) : isSwitchingPeriod ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowSwitchPeriodConfirm({
                              plan,
                              fromPeriod: cardBillingPeriod || "monthly",
                              toPeriod: currentViewPeriod,
                            });
                          }}
                          disabled={isSubscribingThis}
                          className="relative flex items-center justify-center w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm sm:text-base transition-all group overflow-hidden disabled:opacity-50 shadow-lg shadow-indigo-600/30 cursor-pointer"
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            {isSubscribingThis ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              isArabic
                                ? `التحويل إلى ${currentViewPeriod === "yearly" ? "الاشتراك السنوي" : "الاشتراك الشهري"}`
                                : `Switch to ${currentViewPeriod === "yearly" ? "annual" : "monthly"} billing`
                            )}
                            {!isSubscribingThis && <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />}
                          </span>
                        </button>
                      ) : isThisSubscribed ? (
                        <div>
                          {showCancelConfirm === plan.key ? (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-center">
                              <p className="text-rose-200 font-bold text-xs mb-3">
                                {t("confirmCancelSub")}
                              </p>
                              <div className="flex gap-2 justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleCancelSubscription(plan)}
                                  disabled={cancelling}
                                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                  {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  <span>{isArabic ? "تأكيد الإلغاء" : "Confirm"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowCancelConfirm(null)}
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
                              onClick={() => setShowCancelConfirm(plan.key)}
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
                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                    <p className={`text-xs font-bold mb-3.5 ${isPaymentPlus ? "text-emerald-700 dark:text-emerald-300" : "text-indigo-700 dark:text-indigo-300"}`}>
                      {isArabic ? "المميزات المضمنة في الباقة:" : "Included features:"}
                    </p>

                    <div className="space-y-2">
                      {visibleFeatures.map((feature, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2.5 rounded-xl border bg-white/70 dark:bg-white/[0.025] px-3 py-2.5 ${isPaymentPlus ? "border-emerald-500/20" : "border-indigo-500/20"}`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isPaymentPlus ? "bg-emerald-500/15" : "bg-indigo-500/20"}`}>
                            <Check className={`w-3.5 h-3.5 ${isPaymentPlus ? "text-emerald-700 dark:text-emerald-400" : "text-indigo-700 dark:text-indigo-400"}`} />
                          </div>
                          <span className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {features.length > initialFeatureCount && !isPaymentPlus && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFeatures((prev) => ({
                            ...prev,
                            [planKey]: !prev[planKey],
                          }))
                        }
                        className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium text-xs cursor-pointer dark:border-slate-700 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>{t("hideDetails")}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>{`${t("showMoreFeatures")} (${features.length - initialFeatureCount})`}</span>
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

      {/* Confirm Switch Period Modal */}
      <AnimatePresence>
        {showSwitchPeriodConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center"
              dir={isArabic ? "rtl" : "ltr"}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowSwitchPeriodConfirm(null)}
                disabled={cancelling}
                className="absolute top-4 start-4 text-slate-400 hover:text-white p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-black text-white mb-3">
                {isArabic ? "تأكيد تحويل الاشتراك" : "Confirm Subscription Switch"}
              </h3>

              {/* Alert Message in Fluent Arabic as requested */}
              <p className="text-sm text-slate-200 leading-relaxed mb-6 font-medium bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 shadow-inner">
                {isArabic
                  ? "سيتم إلغاء الاشتراك الشهري والذهاب للدفع حال التأكيد."
                  : "Your monthly subscription will be cancelled, and the annual plan will be activated upon payment."}
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleConfirmSwitchPeriod}
                  disabled={cancelling}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{isArabic ? "متابعة الدفع" : "Proceed to Payment"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSwitchPeriodConfirm(null)}
                  disabled={cancelling}
                  className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isArabic ? "تراجع" : "Cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
