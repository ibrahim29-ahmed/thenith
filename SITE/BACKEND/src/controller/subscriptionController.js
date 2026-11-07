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
  const freePlan = await Plan.findOne({ key: "free" });
  const subscription = await Subscription.findOne({
    userId: request.user._id,
    status: { $in: ["active", "trialing"] },
  }).sort({ createdAt: -1 });

  // Always deactivate paymentPlusActive on user document
  await User.findByIdAndUpdate(request.user._id, { $set: { paymentPlusActive: false } });

  if (subscription) {
    const previousPlan = await Plan.findById(subscription.planId).lean();
    const previousPlanName = previousPlan?.name?.ar || previousPlan?.name?.en || previousPlan?.key || "الخطة المدفوعة";
    const previousBillingPeriod = subscription.billingPeriod || "شهري";

    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    subscription.cancelledBy = "user";
    subscription.cancellationReason = request.body?.reason || "إلغاء الاشتراك بواسطة العميل من لوحة التحكم";
    if (freePlan) subscription.planId = freePlan._id;
    subscription.expiresAt = null;
    subscription.billingPeriod = null;
    await subscription.save();

    const Card = (await import("../models/Card.js")).default;
    await Card.updateMany(
      { userId: request.user._id },
      { $set: { actionType: "form" } }
    );

    await AuditLog.create({
      message: "subscription_cancelled_by_user",
      category: "payments_subscriptions",
      userId: request.user._id,
      details: {
        action: "cancelled_by_user",
        subscriptionId: subscription._id,
        previousPlan: previousPlanName,
        billingPeriod: previousBillingPeriod,
        reason: request.body?.reason || "إلغاء الاشتراك بواسطة العميل",
      },
      ip: request.ip,
    });

    notifyUser(request.user._id.toString(), {
      type: "subscription_cancelled",
      payload: { id: subscription._id },
    });
  }

  response.json({
    success: true,
    message: "تم إلغاء الاشتراك بنجاح والعودة للباقة المجانية",
    state: await getSubscriptionState(request.user._id),
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
      const appliedCoupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
      if (appliedCoupon && appliedCoupon.isActive) {
        let isValid = true;
        if (appliedCoupon.expiresAt && new Date() > new Date(appliedCoupon.expiresAt)) isValid = false;
        if (appliedCoupon.maxUses !== null && appliedCoupon.usedCount >= appliedCoupon.maxUses) isValid = false;
        if (appliedCoupon.appliesTo === "store") isValid = false; // "all" or "subscriptions" allowed

        // Strictly enforce one use per user
        if (user) {
          const inUsedBy =
            appliedCoupon.usedBy &&
            appliedCoupon.usedBy.some(
              (id) => id.toString() === user._id.toString()
            );
          const hasUsedInTx = await PaymentTransaction.exists({
            userId: user._id,
            status: "paid",
            "paymentData.couponCode": couponCode.toUpperCase().trim(),
          });
          if (inUsedBy || hasUsedInTx) {
            isValid = false;
          }
        }

        if (isValid) {
          let discountVal = appliedCoupon.discountValue;
          if (appliedCoupon.appliesTo === "subscriptions" || appliedCoupon.appliesTo === "all") {
             if (billingPeriod === "monthly" && appliedCoupon.monthlyDiscountValue != null) {
               discountVal = appliedCoupon.monthlyDiscountValue;
             } else if (billingPeriod === "yearly" && appliedCoupon.yearlyDiscountValue != null) {
               discountVal = appliedCoupon.yearlyDiscountValue;
             } else if (appliedCoupon.appliesTo === "subscriptions") {
               discountVal = 0;
             }
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
    const appliedCoupon = await Coupon.findOne({ code: cleanCode });
    if (appliedCoupon && appliedCoupon.isActive) {
      let isDateValid = true;
      if (appliedCoupon.expiresAt && new Date() > new Date(appliedCoupon.expiresAt)) isDateValid = false;
      if (appliedCoupon.maxUses !== null && appliedCoupon.usedCount >= appliedCoupon.maxUses) isDateValid = false;
      if (appliedCoupon.appliesTo === "store") isDateValid = false; 

      // Strictly enforce one use per user
      let alreadyUsedByUser = false;
      if (req.user) {
        const inUsedBy =
          appliedCoupon.usedBy &&
          appliedCoupon.usedBy.some(
            (id) => id.toString() === req.user._id.toString()
          );
        const hasUsedInTx = await PaymentTransaction.exists({
          userId: req.user._id,
          status: "paid",
          "paymentData.couponCode": cleanCode,
        });
        if (inUsedBy || hasUsedInTx) {
          alreadyUsedByUser = true;
        }
      }

      if (alreadyUsedByUser) {
        return res.json({
          success: true,
          isValid: false,
          message: "لقد قمت باستخدام هذا الكوبون من قبل. يُسمح باستخدام الكوبون مرة واحدة فقط لكل مستخدم.",
          originalPrice,
          discountAmount: 0,
          finalPrice: originalPrice,
          appliedDiscountVal: 0,
          discountType: "percentage",
        });
      }

      if (isDateValid) {
        let discountVal = appliedCoupon.discountValue;
        let canApply = false;

        if (appliedCoupon.appliesTo === "subscriptions" || appliedCoupon.appliesTo === "all") {
           if (billingPeriod === "monthly" && appliedCoupon.monthlyDiscountValue != null) {
             discountVal = appliedCoupon.monthlyDiscountValue;
             canApply = true;
           } else if (billingPeriod === "yearly" && appliedCoupon.yearlyDiscountValue != null) {
             discountVal = appliedCoupon.yearlyDiscountValue;
             canApply = true;
           } else if (appliedCoupon.discountValue > 0) {
             discountVal = appliedCoupon.discountValue;
             canApply = true;
           }
        }

        if (canApply && discountVal > 0) {
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
        } else {
          message = "هذا الكوبون لا ينطبق على هذه الباقة";
        }
      } else {
        message = "كوبون الخصم منتهي الصلاحية أو تجاوز الحد الأقصى للاستخدام";
      }
    }
  }

  // If not matched by a regular coupon, check if it's a referral code
  if (!isValid && cleanCode) {
    try {
      const referrer = await User.findOne({ referralCode: cleanCode });
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
