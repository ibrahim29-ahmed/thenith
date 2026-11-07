import _asyncHandler from "../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler;
import referralService from "../services/referralService.js";
import User from "../models/User.js";
import Referral from "../models/Referral.js";
import PaymentTransaction from "../models/PaymentTransaction.js";

// GET /api/referrals/me - Get user's personal referral dashboard
export const getMyReferralDashboard = asyncHandler(async (req, res) => {
  const data = await referralService.getUserReferralDashboard(req.user._id);
  res.json({
    success: true,
    data,
  });
});

// POST /api/referrals/nfc-claim - Submit shipping details for free NFC reward
export const claimNfcCardReward = asyncHandler(async (req, res) => {
  const { fulfillmentId, fullName, phone, city, address, notes, printName, cardColor } =
    req.body || {};

  if (!fulfillmentId) {
    return res.status(400).json({ error: "معرّف طلب المكافأة مطلوب" });
  }

  if (!fullName || !phone || !city || !address) {
    return res.status(400).json({
      error: "يرجى ملء جميع بيانات الشحن المطلوبة (الاسم، الهاتف، المدينة، والعنوان بالتفصيل)",
    });
  }

  const fulfillment = await referralService.submitNfcShippingDetails(
    req.user._id,
    fulfillmentId,
    {
      fullName,
      phone,
      city,
      address,
      notes,
      printName,
      cardColor,
    }
  );

  res.json({
    success: true,
    message: "تم حفظ بيانات الشحن بنجاح وجاري مراجعة وتجهيز كارتك المجاني",
    fulfillment,
  });
});

// GET /api/referrals/eligible-discount - Preview eligible discounts for subscription checkout
export const getEligibleReferralDiscounts = asyncHandler(async (req, res) => {
  const basePrice = Number(req.query.basePrice || 0);
  const rewardId = req.query.rewardId || null;

  const discountData = await referralService.calculateEligibleDiscounts({
    userId: req.user._id,
    basePrice,
    requestedRewardId: rewardId,
  });

  res.json({
    success: true,
    ...discountData,
  });
});

// POST /api/referrals/apply-code - Apply referral code to current logged-in user
export const applyReferralCode = asyncHandler(async (req, res) => {
  const { referralCode } = req.body || {};
  if (!referralCode) {
    return res.status(400).json({ success: false, error: "كود الإحالة مطلوب" });
  }

  const cleanCode = String(referralCode).trim().toUpperCase();
  const user = req.user;

  // 1. Check if user already has a referrer
  if (user.referredBy) {
    const existingRef = await Referral.findOne({ inviteeId: user._id });
    if (existingRef && existingRef.referralCode === cleanCode) {
      return res.json({
        success: true,
        alreadyApplied: true,
        message: "تم تفعيل كود الإحالة هذا لحسابك مسبقاً (خصم 10%)",
        discountPercent: 10,
      });
    }
    return res.status(400).json({
      success: false,
      error: "تم تسجيل حسابك عبر كود إحالة سابق بالفعل ولا يمكن استبداله",
    });
  }

  // 2. Prevent self-referral
  const referrer = await User.findOne({ referralCode: cleanCode });
  if (!referrer) {
    return res.status(404).json({ success: false, error: "كود الإحالة غير صحيح أو غير موجود" });
  }

  if (referrer._id.toString() === user._id.toString()) {
    return res.status(400).json({ success: false, error: "لا يمكنك استخدام كود الإحالة الخاص بك" });
  }

  // 3. Check if user already completed a paid subscription
  const hasPaidSub = await PaymentTransaction.exists({
    userId: user._id,
    orderType: "subscription",
    status: "paid",
  });

  if (hasPaidSub) {
    return res.status(400).json({
      success: false,
      error: "خصم الإحالة مخصص للمشتركين الجدد على أول اشتراك فقط",
    });
  }

  // 4. Attribute referral and generate invitee discount reward
  const referral = await referralService.attributeReferralOnRegistration({
    invitee: user,
    referralCode: cleanCode,
    req,
  });

  const settings = await referralService.getReferralSettings();
  const discountPercent = settings.inviteeDiscountPercent || 10;

  return res.json({
    success: true,
    message: `تم تفعيل كود الإحالة بنجاح! حصلت على خصم ${discountPercent}% على أول اشتراك.`,
    discountPercent,
    referral,
  });
});

// GET /api/referrals/resolve/:code - Publicly validate a referral code and get referrer info
export const resolveReferralCode = asyncHandler(async (req, res) => {
  const code = (req.params.code || "").trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ success: false, error: "Referral code is required" });
  }

  const referrer = await User.findOne({ referralCode: code });
  if (!referrer) {
    return res.status(404).json({ success: false, valid: false, error: "Referral code not found" });
  }

  const settings = await referralService.getReferralSettings();

  return res.json({
    success: true,
    valid: true,
    code,
    referrerName: referrer.name || "عضو Thenith",
    discountPercent: settings.inviteeDiscountPercent || 10,
  });
});

export default {
  getMyReferralDashboard,
  claimNfcCardReward,
  getEligibleReferralDiscounts,
  applyReferralCode,
  resolveReferralCode,
};

