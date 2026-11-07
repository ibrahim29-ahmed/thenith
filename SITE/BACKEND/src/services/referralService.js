import mongoose from "mongoose";
import crypto from "crypto";
import User from "../models/User.js";
import Referral from "../models/Referral.js";
import ReferralReward from "../models/ReferralReward.js";
import ReferralProgramSettings from "../models/ReferralProgramSettings.js";
import NFCRewardFulfillment from "../models/NFCRewardFulfillment.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import Subscription from "../models/Subscription.js";
import _dashboardNotifications from "../util/dashboardNotifications.js";
const { notifyUser } = _dashboardNotifications;
import _env from "../config/env.js";
const { env } = _env;

// Helper to get calendar month key (YYYY-MM) in UTC / Business time
export function getMonthKey(date = new Date()) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// Generate unique, clean referral code (e.g. THENITH-A7K92)
export async function generateUniqueReferralCode() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    attempts++;
    let rand = "";
    const bytes = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) {
      rand += chars[bytes[i] % chars.length];
    }
    code = `THENITH-${rand}`;
    exists = await User.exists({ referralCode: code });
  }

  return code;
}

// Ensure user has a persistent referral code
export async function ensureUserReferralCode(user) {
  if (!user) return null;
  if (user.referralCode && user.referralCode.trim()) {
    return user.referralCode.trim();
  }
  const code = await generateUniqueReferralCode();
  user.referralCode = code;
  await User.updateOne({ _id: user._id }, { $set: { referralCode: code } });
  return code;
}

// Get or initialize program settings
export async function getReferralSettings() {
  return await ReferralProgramSettings.getSettings();
}

// Calculate current monthly discount percent based on tiers
export function calculateTierDiscount(successfulCount, tiers, maxDiscount = 25) {
  if (!successfulCount || successfulCount < 1) return 0;
  const sortedTiers = [...(tiers || [])].sort((a, b) => b.count - a.count);
  for (const tier of sortedTiers) {
    if (successfulCount >= tier.count) {
      return Math.min(tier.discountPercent, maxDiscount);
    }
  }
  return 0;
}

// Attribute referral on user registration
export async function attributeReferralOnRegistration({
  invitee,
  referralCode,
  req = null,
}) {
  if (!invitee || !referralCode) return null;
  const settings = await getReferralSettings();
  if (!settings.enabled) return null;

  const cleanCode = String(referralCode).trim().toUpperCase();
  if (!cleanCode) return null;

  const referrer = await User.findOne({ referralCode: cleanCode });
  if (!referrer) return null;

  // Prevent self-referral
  if (referrer._id.toString() === invitee._id.toString()) {
    return null;
  }

  // Prevent duplicate attribution
  if (invitee.referredBy) {
    return null;
  }

  const existingReferral = await Referral.findOne({ inviteeId: invitee._id });
  if (existingReferral) {
    return existingReferral;
  }

  // Associate referral
  invitee.referredBy = referrer._id;
  invitee.referrer = `Referral (${cleanCode})`;
  await User.updateOne(
    { _id: invitee._id },
    { $set: { referredBy: referrer._id, referrer: `Referral (${cleanCode})` } }
  );

  const referral = await Referral.create({
    referrerId: referrer._id,
    inviteeId: invitee._id,
    referralCode: cleanCode,
    status: "registered",
    registeredAt: new Date(),
    inviteeDiscountPercent: settings.inviteeDiscountEnabled
      ? settings.inviteeDiscountPercent
      : 0,
  });

  // Issue invitee discount reward if enabled
  if (settings.inviteeDiscountEnabled && settings.inviteeDiscountPercent > 0) {
    await ReferralReward.create({
      userId: invitee._id,
      rewardType: "invitee_discount",
      discountPercent: settings.inviteeDiscountPercent,
      referralId: referral._id,
      status: "available",
      expiresAt: new Date(Date.now() + settings.rewardValidityDays * 24 * 60 * 60 * 1000),
      createdBy: "system",
      adminNote: `خصم 10% للتسجيل عبر كود الإحالة ${cleanCode}`,
    });
  }

  return referral;
}

// Calculate eligible discount for checkout
export async function calculateEligibleDiscounts({
  userId,
  basePrice,
  requestedRewardId = null,
  referralCode = null,
}) {
  const settings = await getReferralSettings();
  if (!settings.enabled || !basePrice || basePrice <= 0) {
    return {
      applied: false,
      rewardId: null,
      rewardType: null,
      discountPercent: 0,
      discountAmount: 0,
      originalPrice: basePrice,
      finalPrice: basePrice,
      availableRewards: [],
    };
  }

  const user = await User.findById(userId);
  if (!user) {
    return {
      applied: false,
      rewardId: null,
      rewardType: null,
      discountPercent: 0,
      discountAmount: 0,
      originalPrice: basePrice,
      finalPrice: basePrice,
      availableRewards: [],
    };
  }

  // 1. If a referral code was supplied, attribute it if not self-referral and user has no previous paid subscriptions
  if (referralCode) {
    const cleanCode = String(referralCode).trim().toUpperCase();
    const referrer = await User.findOne({ referralCode: cleanCode });
    if (referrer && referrer._id.toString() !== user._id.toString()) {
      await attributeReferralOnRegistration({
        invitee: user,
        referralCode: cleanCode,
      });
    }
  }

  // 2. If user was referred (user.referredBy exists) and has never completed a paid subscription,
  // ensure they have an available invitee discount reward if enabled
  if (user.referredBy && settings.inviteeDiscountEnabled && settings.inviteeDiscountPercent > 0) {
    const hasPaidSub = await PaymentTransaction.exists({
      userId: user._id,
      orderType: "subscription",
      status: "paid",
    });

    if (!hasPaidSub) {
      let inviteeReward = await ReferralReward.findOne({
        userId: user._id,
        rewardType: "invitee_discount",
        status: "available",
      });

      if (!inviteeReward) {
        inviteeReward = await ReferralReward.create({
          userId: user._id,
          rewardType: "invitee_discount",
          discountPercent: settings.inviteeDiscountPercent,
          status: "available",
          expiresAt: new Date(Date.now() + settings.rewardValidityDays * 24 * 60 * 60 * 1000),
          createdBy: "system",
          adminNote: "خصم الترحيب التلقائي على أول اشتراك للمستخدم المدعو",
        });
      }
    }
  }

  // 3. Check for Referrer monthly tier renewal discount
  const currentMonthKey = getMonthKey(new Date());
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const monthlySuccessfulCount = await Referral.countDocuments({
    referrerId: user._id,
    status: "successful",
    $or: [
      { qualifiedAt: { $gte: startOfMonth } },
      { firstPurchaseAt: { $gte: startOfMonth } },
      { registeredAt: { $gte: startOfMonth } },
    ],
  });

  const tierDiscountPercent = calculateTierDiscount(
    monthlySuccessfulCount,
    settings.monthlyTiers,
    settings.maxMonthlyDiscountPercent
  );

  if (tierDiscountPercent > 0) {
    // Check if an existing monthly discount reward exists for this month
    const existingMonthlyReward = await ReferralReward.findOne({
      userId: user._id,
      rewardType: "monthly_discount",
      sourceMonth: currentMonthKey,
    });

    if (!existingMonthlyReward) {
      await ReferralReward.create({
        userId: user._id,
        rewardType: "monthly_discount",
        discountPercent: tierDiscountPercent,
        sourceMonth: currentMonthKey,
        status: "available",
        expiresAt: new Date(Date.now() + (settings.rewardValidityDays || 60) * 24 * 60 * 60 * 1000),
        createdBy: "system",
        adminNote: `مكافأة المستوى الشهري (${monthlySuccessfulCount} إحالات ناجحة)`,
      });
    } else if (existingMonthlyReward.status === "available" && existingMonthlyReward.discountPercent < tierDiscountPercent) {
      existingMonthlyReward.discountPercent = tierDiscountPercent;
      await existingMonthlyReward.save();
    }
  }

  // 4. Find all available rewards for user
  const availableRewards = await ReferralReward.find({
    userId: user._id,
    status: "available",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).sort({ discountPercent: -1, createdAt: -1 });

  if (availableRewards.length === 0) {
    return {
      applied: false,
      rewardId: null,
      rewardType: null,
      discountPercent: 0,
      discountAmount: 0,
      originalPrice: basePrice,
      finalPrice: basePrice,
      availableRewards: [],
    };
  }

  let selectedReward = null;
  if (requestedRewardId) {
    selectedReward = availableRewards.find(
      (r) => r._id.toString() === requestedRewardId.toString()
    );
  }

  // Default to highest discount if not specified
  if (!selectedReward && availableRewards.length > 0) {
    selectedReward = availableRewards[0];
  }

  if (!selectedReward) {
    return {
      applied: false,
      rewardId: null,
      rewardType: null,
      discountPercent: 0,
      discountAmount: 0,
      originalPrice: basePrice,
      finalPrice: basePrice,
      availableRewards,
    };
  }

  const discountPercent = Math.min(100, Math.max(0, selectedReward.discountPercent || 0));
  const discountAmount = Math.round((basePrice * discountPercent) / 100);
  const finalPrice = Math.max(0, basePrice - discountAmount);

  return {
    applied: discountPercent > 0,
    rewardId: selectedReward._id,
    rewardType: selectedReward.rewardType,
    discountPercent,
    discountAmount,
    originalPrice: basePrice,
    finalPrice,
    availableRewards,
  };
}

// Process qualifying purchase when payment is confirmed
export async function processQualifyingPurchase(transaction) {
  if (!transaction || transaction.status !== "paid") return;

  const settings = await getReferralSettings();
  const userId = transaction.userId;
  const paymentData = transaction.paymentData || {};

  // 1. If transaction redeemed a referral reward, mark it redeemed
  const redeemedRewardId = paymentData?.referralRewardId;
  if (redeemedRewardId && mongoose.Types.ObjectId.isValid(redeemedRewardId)) {
    await ReferralReward.updateOne(
      { _id: redeemedRewardId, status: "available" },
      {
        $set: {
          status: "redeemed",
          redeemedAt: new Date(),
          redeemedInvoiceNumber: transaction.intentKey || transaction.paymentData?.invoice_id,
          redeemedTransactionId: transaction._id,
        },
      }
    );
  }

  // 2. Check if buyer was invited through a referral
  const referral = await Referral.findOne({
    inviteeId: userId,
    status: { $in: ["registered", "pending_payment"] },
  });

  if (!referral) {
    return; // Buyer was not referred or referral already processed
  }

  // Mark referral as successful exactly once
  referral.status = "successful";
  referral.qualifiedAt = new Date();
  referral.firstPurchaseAt = new Date();
  referral.paymentTransactionId = transaction._id;
  referral.orderType = transaction.orderType || "subscription";
  referral.referenceId = transaction.referenceId;
  referral.invoiceNumber =
    transaction.intentKey ||
    transaction.paymentData?.invoice_id ||
    `INV-${transaction._id.toString().slice(-6).toUpperCase()}`;

  if (paymentData?.referralDiscountAmount) {
    referral.inviteeDiscountAmount = paymentData.referralDiscountAmount;
    referral.inviteeDiscountPercent = paymentData.referralDiscountPercent || 10;
  }

  await referral.save();

  // 3. Update referrer stats and issue rewards
  const referrer = await User.findById(referral.referrerId);
  if (!referrer) return;

  const currentMonthKey = getMonthKey(new Date());

  // Count successful referrals for this referrer in current calendar month
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const monthlySuccessfulCount = await Referral.countDocuments({
    referrerId: referrer._id,
    status: "successful",
    qualifiedAt: { $gte: startOfMonth },
  });

  const lifetimeSuccessfulCount = await Referral.countDocuments({
    referrerId: referrer._id,
    status: "successful",
  });

  // Calculate current monthly tier discount
  const monthlyDiscountPercent = calculateTierDiscount(
    monthlySuccessfulCount,
    settings.monthlyTiers,
    settings.maxMonthlyDiscountPercent
  );

  // Update referrer document cache
  referrer.referralStats = {
    lifetimeCount: lifetimeSuccessfulCount,
    currentMonthCount: monthlySuccessfulCount,
    currentMonthKey,
    currentTierPercent: monthlyDiscountPercent,
    milestoneReached:
      referrer.referralStats?.milestoneReached ||
      lifetimeSuccessfulCount >= settings.milestoneReferralCount,
    milestoneReachedAt:
      referrer.referralStats?.milestoneReachedAt ||
      (lifetimeSuccessfulCount >= settings.milestoneReferralCount ? new Date() : null),
  };
  await referrer.save();

  // 4. Update / create referrer's monthly renewal discount reward
  if (monthlyDiscountPercent > 0) {
    let monthlyReward = await ReferralReward.findOne({
      userId: referrer._id,
      rewardType: "monthly_discount",
      sourceMonth: currentMonthKey,
      status: "available",
    });

    if (monthlyReward) {
      monthlyReward.discountPercent = monthlyDiscountPercent;
      await monthlyReward.save();
    } else {
      // Check if user already redeemed a monthly reward for this month
      const alreadyRedeemed = await ReferralReward.exists({
        userId: referrer._id,
        rewardType: "monthly_discount",
        sourceMonth: currentMonthKey,
        status: "redeemed",
      });

      if (!alreadyRedeemed) {
        monthlyReward = await ReferralReward.create({
          userId: referrer._id,
          rewardType: "monthly_discount",
          discountPercent: monthlyDiscountPercent,
          sourceMonth: currentMonthKey,
          status: "available",
          expiresAt: new Date(Date.now() + settings.rewardValidityDays * 24 * 60 * 60 * 1000),
          createdBy: "system",
          adminNote: `خصم شهري ${monthlyDiscountPercent}% لشهر ${currentMonthKey}`,
        });
      }
    }

    if (monthlyReward) {
      referral.referrerRewardIssued = {
        rewardId: monthlyReward._id,
        rewardType: "monthly_discount",
        percent: monthlyDiscountPercent,
      };
      await referral.save();
    }
  }

  // 5. Check Lifetime Milestone (14 referrals)
  if (
    lifetimeSuccessfulCount >= settings.milestoneReferralCount &&
    !referrer.referralStats?.milestoneReachedAt
  ) {
    // 5a. Milestone 50% discount (granted once per lifetime)
    const milestoneRewardExists = await ReferralReward.exists({
      userId: referrer._id,
      rewardType: "milestone_discount",
    });

    if (!milestoneRewardExists) {
      await ReferralReward.create({
        userId: referrer._id,
        rewardType: "milestone_discount",
        discountPercent: settings.milestoneDiscountPercent,
        milestoneCount: settings.milestoneReferralCount,
        status: "available",
        createdBy: "system",
        adminNote: `مكافأة إنجاز ${settings.milestoneReferralCount} إحالة ناجحة (خصم 50% على التجديد)`,
      });
    }

    // 5b. Free NFC Card reward
    const nfcRewardExists = await ReferralReward.exists({
      userId: referrer._id,
      rewardType: "free_nfc_card",
    });

    if (!nfcRewardExists) {
      const nfcReward = await ReferralReward.create({
        userId: referrer._id,
        rewardType: "free_nfc_card",
        discountPercent: 100,
        milestoneCount: settings.milestoneReferralCount,
        status: "available",
        createdBy: "system",
        adminNote: `مكافأة كارت NFC مجاني لإنجاز ${settings.milestoneReferralCount} إحالة ناجحة`,
      });

      await NFCRewardFulfillment.create({
        userId: referrer._id,
        rewardId: nfcReward._id,
        referralCountAtMilestone: settings.milestoneReferralCount,
        status: "awaiting_details",
        history: [
          {
            status: "awaiting_details",
            changedAt: new Date(),
            changedBy: "system",
            note: "تم إصدار المكافأة وفي انتظار استلام بيانات الشحن من العميل",
          },
        ],
      });
    }

    // Notify referrer about milestone
    notifyUser(referrer._id, {
      title: "تهانينا! حققت إنجاز 14 إحالة ناجحة 🎉",
      message:
        "حصلت على كارت Thenith NFC مجاني وخصم 50% على تجديد اشتراكك القادم!",
      type: "reward_milestone",
      link: "/u/referrals",
    }).catch(() => {});
  } else {
    // Regular referral notification
    notifyUser(referrer._id, {
      title: "إحالة ناجحة جديدة! 🎁",
      message: `قام صديقك بالاشتراك بنجاح، رصيدك الحالي لشهر ${currentMonthKey}: ${monthlySuccessfulCount} إحالات (خصم مستحق: ${monthlyDiscountPercent}%).`,
      type: "referral_success",
      link: "/u/referrals",
    }).catch(() => {});
  }
}

// User-facing Referral Dashboard data
export async function getUserReferralDashboard(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const settings = await getReferralSettings();
  const referralCode = await ensureUserReferralCode(user);

  const currentMonthKey = getMonthKey(new Date());
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  // Calculate days left in current calendar month
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const daysLeftInMonth = Math.max(1, Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24)));

  // Real-time counts
  const monthlySuccessfulCount = await Referral.countDocuments({
    referrerId: user._id,
    status: "successful",
    qualifiedAt: { $gte: startOfMonth },
  });

  const lifetimeSuccessfulCount = await Referral.countDocuments({
    referrerId: user._id,
    status: "successful",
  });

  // Calculate current tier & next tier
  const currentTierDiscount = calculateTierDiscount(
    monthlySuccessfulCount,
    settings.monthlyTiers,
    settings.maxMonthlyDiscountPercent
  );

  const sortedTiers = [...settings.monthlyTiers].sort((a, b) => a.count - b.count);
  const nextTier = sortedTiers.find((t) => t.count > monthlySuccessfulCount) || null;
  const remainingForNextTier = nextTier ? nextTier.count - monthlySuccessfulCount : 0;

  // Active rewards
  const rewards = await ReferralReward.find({ userId }).sort({ createdAt: -1 });
  const nfcFulfillment = await NFCRewardFulfillment.findOne({ userId }).sort({ createdAt: -1 });

  // Subscription status (determines if user is renewing or new subscriber)
  const activeSub = await Subscription.findOne({
    userId: user._id,
    status: { $in: ["active", "trialing"] },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).populate("planId");
  const isSubscribed = Boolean(activeSub && activeSub.planId?.key !== "free");

  // Referrals history list (privacy-safe invitee identifiers)
  const referralRecords = await Referral.find({ referrerId: user._id })
    .populate("inviteeId", "name email createdAt")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const formattedHistory = referralRecords.map((r) => {
    const inviteeName = r.inviteeId?.name || "صديق مدعو";
    // Privacy safe: display First name + initial
    const parts = inviteeName.trim().split(" ");
    const safeName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];

    return {
      _id: r._id,
      inviteeName: safeName,
      status: r.status,
      registeredAt: r.registeredAt,
      firstPurchaseAt: r.firstPurchaseAt,
      inviteeDiscountPercent: r.inviteeDiscountPercent || 10,
      rewardEarned: r.referrerRewardIssued?.percent
        ? `خصم ${r.referrerRewardIssued.percent}%`
        : r.status === "successful"
        ? "مكافأة مسجلة"
        : "قيد الانتظار",
    };
  });

  // Resolve frontend base URL
  const baseUrl =
    env.APP_URL ||
    env.SITE_URL ||
    (typeof process !== "undefined" && process.env.VITE_APP_URL) ||
    (env.NODE_ENV === "production" ? "https://thenith.com" : "http://localhost:3000");
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const referralUrl = `${cleanBase}/r/${referralCode}`;

  return {
    referralCode,
    referralUrl,
    isSubscribed,
    monthlyProgress: {
      monthKey: currentMonthKey,
      successfulCount: monthlySuccessfulCount,
      currentDiscountPercent: currentTierDiscount,
      nextTierCount: nextTier ? nextTier.count : null,
      nextTierDiscountPercent: nextTier ? nextTier.discountPercent : null,
      remainingForNextTier,
      daysLeftInMonth,
      maxMonthlyDiscountPercent: settings.maxMonthlyDiscountPercent,
      tiers: settings.monthlyTiers,
    },
    lifetimeProgress: {
      lifetimeCount: lifetimeSuccessfulCount,
      targetCount: settings.milestoneReferralCount,
      milestoneReached: lifetimeSuccessfulCount >= settings.milestoneReferralCount,
      milestoneDiscountPercent: settings.milestoneDiscountPercent,
      milestoneDiscountReward: rewards.find((r) => r.rewardType === "milestone_discount") || null,
      nfcReward: nfcFulfillment || null,
    },
    rewards,
    history: formattedHistory,
  };
}

// User submits shipping address for free NFC card
export async function submitNfcShippingDetails(userId, fulfillmentId, shippingData) {
  const fulfillment = await NFCRewardFulfillment.findOne({
    _id: fulfillmentId,
    userId,
  });

  if (!fulfillment) {
    throw new Error("طلب مكافأة الكارت غير موجود أو لا تملك صلاحية الوصول إليه");
  }

  if (["shipped", "delivered", "cancelled"].includes(fulfillment.status)) {
    throw new Error("لا يمكن تعديل بيانات الشحن لهذا الطلب في حالته الحالية");
  }

  fulfillment.shippingAddress = {
    fullName: String(shippingData.fullName || "").trim(),
    phone: String(shippingData.phone || "").trim(),
    city: String(shippingData.city || "").trim(),
    address: String(shippingData.address || "").trim(),
    notes: String(shippingData.notes || "").trim(),
  };

  if (shippingData.printName) {
    fulfillment.cardDesign.printName = String(shippingData.printName).trim();
  }
  if (shippingData.cardColor) {
    fulfillment.cardDesign.cardColor = String(shippingData.cardColor).trim();
  }

  fulfillment.status = "approved";
  fulfillment.history.push({
    status: "approved",
    changedAt: new Date(),
    changedBy: "user",
    note: "تم استلام وتأكيد بيانات الشحن من العميل بنجاح",
  });

  await fulfillment.save();
  return fulfillment;
}

export default {
  getMonthKey,
  generateUniqueReferralCode,
  ensureUserReferralCode,
  getReferralSettings,
  calculateTierDiscount,
  attributeReferralOnRegistration,
  calculateEligibleDiscounts,
  processQualifyingPurchase,
  getUserReferralDashboard,
  submitNfcShippingDetails,
};

