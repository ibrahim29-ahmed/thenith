import _asyncHandler6935 from "../util/asyncHandler.js";
const { asyncHandler  } = _asyncHandler6935;
import _subscriptionService3438 from "../services/subscriptionService.js";
const { getSubscriptionState  } = _subscriptionService3438;
import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import AuditLog from "../models/AuditLog.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import * as referralService from "../services/referralService.js";
import { ensureUserPhone } from "./paymentController.js";
import _dashboardNotifications1234 from "../util/dashboardNotifications.js";
const { notifyUser } = _dashboardNotifications1234;
import { getCouponUsageId, hasUsedCouponId } from "../util/couponUsage.js";

function escapeRegex(value) {
  return String(value ?? "").replace(/[.*+?${}()|[\]\\]/g, "\\$&");
}

// ── GET /api/subscription ─────────────────────────────────────────────────────
const getSubscription = asyncHandler(async (request, response) =>
  response.json(request.subscription),
);

// ── GET /api/subscription/status ─────────────────────────────────────────────
const getSubscriptionStatus = asyncHandler(async (request, response) =>
  response.json(request.subscription),
);

// ── POST /api/subscription/cancel ────────────────────────────────────────────
const cancelSubscription = asyncHandler(async (request, response) => {
  const { planKey, reason } = request.body || {};
  const userId = request.user._id;
  const freePlan = await Plan.findOne({ key: "free" });

  const allSubs = await Subscription.find({
    userId,
    status: { $in: ["active", "trialing"] },
  }).populate("planId");

  const userDoc = await User.findById(userId);

  const now = new Date();
  const proSub = allSubs.find((s) => s.planId?.key === "pro" && (!s.expiresAt || new Date(s.expiresAt) > now));
  const ppSub = allSubs.find((s) => s.planId?.key === "payment_plus" && (!s.expiresAt || new Date(s.expiresAt) > now));

  const hasStandalonePP = Boolean(
    ppSub ||
    userDoc?.hasStandalonePaymentPlus ||
    (userDoc?.paymentPlusActive && !proSub)
  );

  let targetSub = null;
  let cancelMessageText = "تم إلغاء الاشتراك بنجاح";

  if (planKey === "pro" || (!planKey && proSub && !ppSub)) {
    // Cancel Pro subscription ONLY - completely independent, do NOT touch Payment Plus
    targetSub = proSub || allSubs[0];
    if (proSub) {
      proSub.status = "cancelled";
      proSub.cancelledAt = new Date();
      proSub.cancelledBy = "user";
      proSub.cancellationReason = reason || "إلغاء اشتراك برو بواسطة العميل";
      if (freePlan) proSub.planId = freePlan._id;
      proSub.expiresAt = null;
      proSub.billingPeriod = null;
      await proSub.save();
    }
    cancelMessageText = "تم إلغاء اشتراك باقة برو بنجاح";
  } else if (planKey === "payment_plus" || (!planKey && ppSub && !proSub)) {
    // Cancel Payment Plus subscription ONLY - completely independent, do NOT touch Pro
    const paymentPlusPlan = await Plan.findOne({ key: "payment_plus" });
    const allPPSubs = await Subscription.find({
      userId,
      $or: [
        { planId: paymentPlusPlan?._id },
        { "planDetails.key": "payment_plus" },
      ],
      status: { $in: ["active", "trialing"] },
    });
    for (const s of allPPSubs) {
      s.status = "cancelled";
      s.cancelledAt = new Date();
      s.cancelledBy = "user";
      s.cancellationReason = reason || "إلغاء باقة المدفوعات بواسطة العميل";
      if (freePlan) s.planId = freePlan._id;
      s.expiresAt = null;
      s.billingPeriod = null;
      await s.save();
    }

    targetSub = allPPSubs[0] || ppSub;

    // Reset user Payment Plus flags only
    await User.findByIdAndUpdate(userId, {
      $set: {
        paymentPlusActive: false,
        hasStandalonePaymentPlus: false,
        paymentPlusOverride: "disabled",
      },
    });

    cancelMessageText = "تم إلغاء باقة المدفوعات بنجاح";
  } else {
    // Fallback: cancel all active subscriptions
    for (const sub of allSubs) {
      sub.status = "cancelled";
      sub.cancelledAt = new Date();
      sub.cancelledBy = "user";
      sub.cancellationReason = reason || "إلغاء الاشتراك بواسطة العميل";
      if (freePlan) sub.planId = freePlan._id;
      sub.expiresAt = null;
      sub.billingPeriod = null;
      await sub.save();
    }
    await User.findByIdAndUpdate(userId, {
      $set: {
        paymentPlusActive: false,
        hasStandalonePaymentPlus: false,
        paymentPlusOverride: "disabled",
      },
    });
  }

  if (targetSub) {
    await AuditLog.create({
      message: "subscription_cancelled_by_user",
      category: "payments_subscriptions",
      userId,
      details: {
        action: "cancelled_by_user",
        planKey: planKey || "unknown",
        reason: reason || "إلغاء الاشتراك بواسطة العميل",
      },
      ip: request.ip,
    });

    notifyUser(userId.toString(), {
      type: "subscription_cancelled",
      payload: { planKey },
    });
  }

  const newState = await getSubscriptionState(userId);

  response.json({
    success: true,
    message: cancelMessageText,
    state: newState,
  });
});


// ── POST /api/subscription/checkout ──────────────────────────────────────────
const createSubscriptionCheckout = asyncHandler(async (req, res) => {
  const { planId, billingPeriod, couponCode } = req.body;
  const user = req.user;

  if (!planId || !billingPeriod) {
    return res.status(400).json({ error: "Missing planId or billingPeriod" });
  }

  const userPhone = await ensureUserPhone(user, req);
  if (!userPhone) {
    return res.status(400).json({ error: "يجب إضافة رقم هاتف لحسابك أولاً لتفعيل الاشتراك." });
  }

  const plan = await Plan.findById(planId);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  let price = billingPeriod === "yearly" ? plan.prices.yearly : plan.prices.monthly;

  // Apply Coupon
  let discount = 0;
  if (couponCode) {
    if (Coupon) {
      const cleanUpper = couponCode.toUpperCase().trim();
      const safeCode = escapeRegex(cleanUpper);
      const appliedCoupon = await Coupon.findOne({
        $or: [
          { code: cleanUpper },
          { code: { $regex: new RegExp(`^${safeCode}$`, "i") } },
          { couponId: cleanUpper },
          { couponId: { $regex: new RegExp(`^${safeCode}$`, "i") } },
        ],
      });
      if (appliedCoupon && appliedCoupon.isActive) {
        let isValid = true;
        if (appliedCoupon.expiresAt && new Date() > new Date(appliedCoupon.expiresAt)) isValid = false;
        const hasMaxLimit = appliedCoupon.maxUses != null && Number(appliedCoupon.maxUses) > 0;
        if (hasMaxLimit && appliedCoupon.usedCount >= appliedCoupon.maxUses) isValid = false;
        if (appliedCoupon.appliesTo === "store") isValid = false; // "all" or "subscriptions" allowed

        // Strictly enforce one use per user based on couponId
        if (user) {
          const couponTrackingId = getCouponUsageId(appliedCoupon);
          const userDoc = await User.findById(user._id).select("usedCouponIds").lean();
          const hasUsedThisId = hasUsedCouponId(userDoc?.usedCouponIds, couponTrackingId);
          const hasUsedInTx = await PaymentTransaction.exists({
            userId: user._id,
            status: "paid",
            "paymentData.couponId": couponTrackingId,
          });
          if (hasUsedThisId || hasUsedInTx) {
            isValid = false;
          }
        }

        if (isValid) {
          let discountVal = appliedCoupon.discountValue;
          if (billingPeriod === "monthly" && appliedCoupon.monthlyDiscountValue != null) {
            discountVal = appliedCoupon.monthlyDiscountValue;
          } else if (billingPeriod === "yearly" && appliedCoupon.yearlyDiscountValue != null) {
            discountVal = appliedCoupon.yearlyDiscountValue;
          }

          if (appliedCoupon.discountType === "percentage") {
            discount = Math.round((price * discountVal) / 100);
          } else {
            discount = Math.min(discountVal, price);
          }
        }
      }
    }
  }

  const existingActiveSub = await Subscription.findOne({
    userId: user._id,
    status: { $in: ["active", "trialing"] },
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });

  const baseDate = existingActiveSub?.expiresAt ? new Date(existingActiveSub.expiresAt) : new Date();
  const expiresAt = new Date(baseDate);
  expiresAt.setMonth(expiresAt.getMonth() + (billingPeriod === "yearly" ? 12 : 1));

  const subscription = new Subscription({
    userId: user._id,
    planId: plan._id,
    status: "pending",
    billingPeriod,
    startedAt: new Date(),
    provider: "manual",
    expiresAt,
  });
  await subscription.save();

  return res.json({ 
    success: true, 
    message: "Subscription created, pending payment",
    subscriptionId: subscription._id
  });
});

// ── POST /api/subscription/validate-coupon ────────────────────────────────────
const validateCoupon = asyncHandler(async (req, res) => {
  const { planId, billingPeriod, couponCode } = req.body;

  if (!planId || !billingPeriod) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const plan = await Plan.findById(planId);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  let originalPrice = billingPeriod === "yearly" ? plan.prices.yearly : plan.prices.monthly;
  let discountAmount = 0;
  let finalPrice = originalPrice;
  let isValid = false;
  let message = "No coupon applied";
  let appliedDiscountVal = 0;
  let discountType = "percentage";
  let isReferral = false;
  let referralRewardId = null;

  const cleanCode = couponCode ? couponCode.trim().toUpperCase() : "";

  if (cleanCode && Coupon) {
    const safeCode = escapeRegex(cleanCode);
    const appliedCoupon = await Coupon.findOne({
      $or: [
        { code: cleanCode },
        { code: { $regex: new RegExp(`^${safeCode}$`, "i") } },
        { couponId: cleanCode },
        { couponId: { $regex: new RegExp(`^${safeCode}$`, "i") } },
      ],
    });

    if (appliedCoupon) {
      if (!appliedCoupon.isActive) {
        return res.json({
          success: true,
          isValid: false,
          message: "كود الخصم غير نشط حالياً",
          originalPrice,
          discountAmount: 0,
          finalPrice: originalPrice,
          appliedDiscountVal: 0,
          discountType: "percentage",
        });
      }

      if (appliedCoupon.expiresAt && new Date() > new Date(appliedCoupon.expiresAt)) {
        return res.json({
          success: true,
          isValid: false,
          message: "كوبون الخصم منتهي الصلاحية",
          originalPrice,
          discountAmount: 0,
          finalPrice: originalPrice,
          appliedDiscountVal: 0,
          discountType: "percentage",
        });
      }

      const hasMaxLimit = appliedCoupon.maxUses != null && Number(appliedCoupon.maxUses) > 0;
      if (hasMaxLimit && appliedCoupon.usedCount >= appliedCoupon.maxUses) {
        return res.json({
          success: true,
          isValid: false,
          message: "تم استنفاد الحد الأقصى لاستخدام هذا الكوبون",
          originalPrice,
          discountAmount: 0,
          finalPrice: originalPrice,
          appliedDiscountVal: 0,
          discountType: "percentage",
        });
      }

      if (appliedCoupon.appliesTo === "store") {
        return res.json({
          success: true,
          isValid: false,
          message: "هذا الكوبون مخصص للمتجر فقط ولا ينطبق على الاشتراكات",
          originalPrice,
          discountAmount: 0,
          finalPrice: originalPrice,
          appliedDiscountVal: 0,
          discountType: "percentage",
        });
      }

      // Check if coupon is restricted to a specific plan
      if (appliedCoupon.applicablePlan && appliedCoupon.applicablePlan !== "all" && plan.key !== appliedCoupon.applicablePlan) {
        const targetPlanName = appliedCoupon.applicablePlan === "pro" ? "Pro" : "المدفوعات Payment Plus";
        return res.json({
          success: true,
          isValid: false,
          message: `هذا الكود مخصص لباقة ${targetPlanName} فقط ولا يمكن استخدامه مع هذه الباقة`,
          originalPrice,
          discountAmount: 0,
          finalPrice: originalPrice,
          appliedDiscountVal: 0,
          discountType: "percentage",
        });
      }

      // Strictly enforce one use per user based on couponId
      let alreadyUsedByUser = false;
      if (req.user?._id) {
        try {
          const couponTrackingId = getCouponUsageId(appliedCoupon);
          const userDoc = await User.findById(req.user._id).select("usedCouponIds").lean();
          const hasUsedThisId = hasUsedCouponId(userDoc?.usedCouponIds, couponTrackingId);
          const hasUsedInTx = await PaymentTransaction.exists({
            userId: req.user._id,
            status: "paid",
            "paymentData.couponId": couponTrackingId,
          }).catch(() => null);

          if (hasUsedThisId || hasUsedInTx) {
            alreadyUsedByUser = true;
          }
        } catch (e) {
          console.warn("[validateCoupon] Error checking coupon usage:", e.message);
        }
      }

      if (alreadyUsedByUser) {
        return res.json({
          success: true,
          isValid: false,
          message: "لقد تم استخدام هذا الكود مسبقاً",
          originalPrice,
          discountAmount: 0,
          finalPrice: originalPrice,
          appliedDiscountVal: 0,
          discountType: "percentage",
        });
      }

      let discountVal = appliedCoupon.discountValue;
      if (billingPeriod === "monthly" && appliedCoupon.monthlyDiscountValue != null) {
        discountVal = appliedCoupon.monthlyDiscountValue;
      } else if (billingPeriod === "yearly" && appliedCoupon.yearlyDiscountValue != null) {
        discountVal = appliedCoupon.yearlyDiscountValue;
      }

      if (discountVal > 0) {
        isValid = true;
        message = "تم تطبيق كوبون الخصم بنجاح";
        appliedDiscountVal = discountVal;
        discountType = appliedCoupon.discountType;

        if (appliedCoupon.discountType === "percentage") {
          discountAmount = Math.round((originalPrice * discountVal) / 100);
        } else {
          discountAmount = Math.min(discountVal, originalPrice);
        }
        finalPrice = Math.max(0, originalPrice - discountAmount);

        return res.json({
          success: true,
          isValid: true,
          couponCode: appliedCoupon.code,
          couponId: appliedCoupon.couponId,
          message,
          originalPrice,
          discountAmount,
          finalPrice,
          appliedDiscountVal,
          discountType,
        });
      } else {
        return res.json({
          success: true,
          isValid: false,
          message: "قيمة الخصم لهذا الكوبون غير صالحة",
          originalPrice,
          discountAmount: 0,
          finalPrice: originalPrice,
          appliedDiscountVal: 0,
          discountType: "percentage",
        });
      }
    }
  }

  // If not matched by a regular coupon, check if it's a referral code
  if (cleanCode) {
    try {
      const safeCode = escapeRegex(cleanCode);
      const referrer = await User.findOne({
        $or: [
          { referralCode: cleanCode },
          { referralCode: { $regex: new RegExp(`^${safeCode}$`, "i") } },
        ],
      });
      if (referrer) {
        if (req.user && referrer._id.toString() === req.user._id.toString()) {
          return res.json({
            success: true,
            isValid: false,
            message: "لا يمكنك استخدام كود الإحالة الخاص بك",
            originalPrice,
            discountAmount: 0,
            finalPrice: originalPrice,
            appliedDiscountVal: 0,
            discountType: "percentage",
          });
        }

        // Check if current user already had a paid subscription
        let hasPaidSub = false;
        if (req.user) {
          hasPaidSub = await PaymentTransaction.exists({
            userId: req.user._id,
            orderType: "subscription",
            status: "paid",
          });
        }

        if (hasPaidSub) {
          return res.json({
            success: true,
            isValid: false,
            message: "خصم كود الإحالة مخصص للمشتركين الجدد على أول اشتراك فقط",
            originalPrice,
            discountAmount: 0,
            finalPrice: originalPrice,
            appliedDiscountVal: 0,
            discountType: "percentage",
          });
        }

        // Attribute referral if user is logged in
        if (req.user) {
          await referralService.attributeReferralOnRegistration({
            invitee: req.user,
            referralCode: cleanCode,
          });
        }

        // Calculate discount
        let refDisc = null;
        if (req.user) {
          refDisc = await referralService.calculateEligibleDiscounts({
            userId: req.user._id,
            basePrice: originalPrice,
            referralCode: cleanCode,
          });
        }

        const discPercent = refDisc?.discountPercent || 10;
        const discAmount = refDisc?.discountAmount || Math.round((originalPrice * discPercent) / 100);

        isValid = true;
        isReferral = true;
        referralRewardId = refDisc?.rewardId || null;
        message = `تم تطبيق كود الإحالة بنجاح (خصم ${discPercent}%)`;
        appliedDiscountVal = discPercent;
        discountType = "percentage";
        discountAmount = discAmount;
        finalPrice = Math.max(0, originalPrice - discAmount);
      } else {
        message = "كود الخصم أو كود الإحالة غير صحيح أو غير نشط";
      }
    } catch (refErr) {
      console.error("[Referral] Error validating referral code:", refErr);
      message = "كود الخصم غير موجود أو غير نشط";
    }
  }

  // If no coupon was passed or entered, check if the authenticated user has an automatic referral discount
  if (!cleanCode && !isValid && req.user) {
    try {
      const refDisc = await referralService.calculateEligibleDiscounts({
        userId: req.user._id,
        basePrice: originalPrice,
      });
      if (refDisc && refDisc.applied) {
        isValid = true;
        isReferral = true;
        referralRewardId = refDisc.rewardId;
        appliedDiscountVal = refDisc.discountPercent;
        discountType = "percentage";
        discountAmount = refDisc.discountAmount;
        finalPrice = refDisc.finalPrice;
        message = refDisc.rewardType === "invitee_discount"
          ? `تم تطبيق خصم الدعوة التلقائي (${refDisc.discountPercent}%)`
          : `تم تطبيق خصم مكافآت الإحالة (${refDisc.discountPercent}%)`;
      }
    } catch (autoErr) {
      console.error("[Referral] Error checking automatic user referral discount:", autoErr);
    }
  }

  return res.json({ 
    success: true, 
    isValid,
    message,
    originalPrice,
    discountAmount,
    finalPrice,
    appliedDiscountVal,
    discountType,
    isReferral,
    referralRewardId,
    code: cleanCode || (isReferral ? "REFERRAL" : ""),
  });
});

// ── POST /api/subscription/toggle-auto-renew ─────────────────────────────────
const toggleAutoRenew = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const sub = await Subscription.findOne({
    userId,
    status: { $in: ["active", "trialing"] },
  }).sort({ createdAt: -1 });

  if (!sub) return res.status(404).json({ error: "لا يوجد اشتراك نشط حالياً" });

  sub.autoRenew = req.body.autoRenew !== undefined ? Boolean(req.body.autoRenew) : !sub.autoRenew;
  await sub.save();

  await AuditLog.create({
    message: sub.autoRenew ? "subscription_auto_renew_enabled" : "subscription_auto_renew_disabled",
    category: "payments_subscriptions",
    userId,
    details: {
      action: sub.autoRenew ? "auto_renew_enabled" : "auto_renew_disabled",
      subId: sub._id,
      by: "user",
      reason: sub.autoRenew ? "تفعيل التجديد التلقائي بواسطة العميل" : "إيقاف التجديد التلقائي بواسطة العميل",
    },
    ip: req.ip,
  }).catch(() => {});

  return res.json({
    success: true,
    autoRenew: sub.autoRenew,
    message: sub.autoRenew ? "تم تفعيل التجديد التلقائي للاشتراك" : "تم إيقاف التجديد التلقائي للاشتراك",
  });
});

export default {
  getSubscription,
  getSubscriptionStatus,
  cancelSubscription,
  createSubscriptionCheckout,
  validateCoupon,
  toggleAutoRenew,
};
