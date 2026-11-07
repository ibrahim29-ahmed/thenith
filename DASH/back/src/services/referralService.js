import mongoose from "mongoose";
import crypto from "crypto";
import User from "../models/User.js";
import Referral from "../models/Referral.js";
import ReferralReward from "../models/ReferralReward.js";
import ReferralProgramSettings from "../models/ReferralProgramSettings.js";
import NFCRewardFulfillment from "../models/NFCRewardFulfillment.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import UserNotification from "../models/UserNotification.js";
const notifyUser = async (userId, payload) => {
  try {
    if (UserNotification) {
      await UserNotification.create({
        userId,
        title: payload?.title || "إشعار إحالة",
        message: payload?.message || "",
        type: payload?.type || "referral",
        data: payload?.data || {},
      });
    }
  } catch (err) {
    console.error("[Referral] Notification error:", err?.message);
  }
};
const env = process.env || {};

export function getMonthKey(date = new Date()) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

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

export async function getReferralSettings() {
  return await ReferralProgramSettings.getSettings();
}

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

export default {
  getMonthKey,
  generateUniqueReferralCode,
  ensureUserReferralCode,
  getReferralSettings,
  calculateTierDiscount,
};
