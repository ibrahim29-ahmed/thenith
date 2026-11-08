/**
 * src/controller/paymentController.js
 *
 * Payment gateway integration — Fawaterak v3
 * ──────────────────────────────────────────
 * Endpoints:
 *  GET  /api/payment/methods          — list available payment methods
 *  POST /api/payment/subscription     — create subscription payment intent
 *  POST /api/payment/order/:orderId   — create order payment intent
 *  POST /api/payment/verify           — verify transaction & activate record
 *  POST /api/payment/webhook          — Fawaterak webhook (unsigned for now)
 */

import mongoose from "mongoose";
import crypto from "crypto";
import axios from "axios";
import _asyncHandler from "../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler;

import fawaterak from "../services/fawaterakService.js";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import Order from "../models/Order.js";
import Card from "../models/Card.js";
import OrderDraft from "../models/OrderDraft.js";
import Plan from "../models/Plan.js";
import AuditLog from "../models/AuditLog.js";
import Coupon from "../models/Coupon.js";
import Setting from "../models/Setting.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import _dashboardNotifications1234 from "../util/dashboardNotifications.js";
const { notifyUser } = _dashboardNotifications1234;
import _subscriptionService from "../services/subscriptionService.js";
const { getSubscriptionState } = _subscriptionService;
import _env from "../config/env.js";
import { processCustomCardsForOrder } from "../services/customCardOrderService.js";
const { env } = _env;
import mailService from "../util/mail.js";
const { sendSubscriptionEmail, sendOrderEmail } = mailService;
import { getPaymentConfig } from "../util/paymentConfig.js";
import * as referralService from "../services/referralService.js";
import { getCouponUsageId, hasUsedCouponId } from "../util/couponUsage.js";

function escapeRegex(value) {
  return String(value ?? "").replace(/[.*+?${}()|[\]\\]/g, "\\$&");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCardBrand(number) {
  const clean = String(number || "").replace(/\D/g, "");
  if (/^4/.test(clean)) return "Visa";
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(clean)) return "Mastercard";
  if (/^(5078|505|6374)/.test(clean)) return "Meeza";
  return "Visa / Mastercard";
}

function sanitizeFawaterakData(data) {
  if (!data || typeof data !== "object") return data;
  const sensitiveKeys = new Set([
    "api_key",
    "apikey",
    "secret",
    "client_secret",
    "clientsecret",
    "token",
    "access_token",
    "accesstoken",
    "password",
    "authorization",
    "auth",
    "private_key",
  ]);

  if (Array.isArray(data)) {
    return data.map(sanitizeFawaterakData);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z]/g, "");
    if (sensitiveKeys.has(cleanKey)) continue;
    if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeFawaterakData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function ensureUserPhone(user, req = null) {
  if (user?.phone && String(user.phone).trim()) {
    return String(user.phone).trim();
  }

  // 1. Try walletNumber or phone from request body if valid Egyptian phone
  const candidate = req?.body?.phone || req?.body?.walletNumber;
  if (candidate && /^01[0125][0-9]{8}$/.test(String(candidate).trim())) {
    user.phone = String(candidate).trim();
    await user.save();
    return user.phone;
  }

  // 2. Check if user has a phone or whatsapp contact in any of their cards
  const cardWithPhone = await Card.findOne({
    userId: user._id,
    "contacts.type": { $in: ["phone", "whatsapp"] },
  });
  const phoneContact = cardWithPhone?.contacts?.find(
    (c) => (c.type === "phone" || c.type === "whatsapp") && c.value?.trim()
  );
  if (phoneContact?.value) {
    const clean = phoneContact.value.trim().replace(/[^\d+]/g, "");
    if (clean) {
      user.phone = clean;
      await user.save();
      return user.phone;
    }
  }

  // 3. Check recent orders with shipping address phone
  const orderWithPhone = await Order.findOne({
    userId: user._id,
    "shippingAddress.phone": { $exists: true, $ne: "" },
  }).sort({ createdAt: -1 });
  if (orderWithPhone?.shippingAddress?.phone) {
    user.phone = orderWithPhone.shippingAddress.phone.trim();
    await user.save();
    return user.phone;
  }

  return null;
}

export function isWalletTransaction(pTxOrData, fawaterakResponse = null) {
  const methodId = Number(
    pTxOrData?.paymentMethodId ||
    pTxOrData?.payment_method_id ||
    pTxOrData?.lockedMethodId ||
    fawaterakResponse?.payment_method_id
  );
  if (methodId === 4) return true;

  const methodName = String(
    pTxOrData?.paymentMethodName ||
    pTxOrData?.lockedMethodName ||
    pTxOrData?.payment_method ||
    fawaterakResponse?.payment_method ||
    ""
  ).toLowerCase();
  if (/meeza|wallet|محفظ|كاش/.test(methodName)) return true;

  const pd = pTxOrData?.paymentData || pTxOrData;
  const frPd = fawaterakResponse?.payment_data || {};
  if (
    pd?.mobileWalletNumber ||
    pd?.customerMobile ||
    pd?.meezaReference ||
    pd?.meezaQrCode ||
    pd?.isoQr ||
    pd?.payment_data?.mobileWalletNumber ||
    pd?.payment_data?.meezaReference ||
    pd?.payment_data?.meezaQrCode ||
    pd?.payment_data?.isoQr ||
    frPd?.meezaQrCode ||
    frPd?.isoQr ||
    frPd?.meezaReference
  ) {
    return true;
  }
  return false;
}

export const isMobileWalletTransaction = isWalletTransaction;

export function isFawryTransaction(pTxOrData, fawaterakResponse = null) {
  const methodId = Number(
    pTxOrData?.paymentMethodId ||
    pTxOrData?.payment_method_id ||
    pTxOrData?.lockedMethodId ||
    fawaterakResponse?.payment_method_id
  );
  if (methodId === 3) return true;

  const methodName = String(
    pTxOrData?.paymentMethodName ||
    pTxOrData?.lockedMethodName ||
    pTxOrData?.payment_method ||
    fawaterakResponse?.payment_method ||
    ""
  ).toLowerCase();
  if (/fawry|فوري/.test(methodName)) return true;

  const pd = pTxOrData?.paymentData || pTxOrData;
  const frPd = fawaterakResponse?.payment_data || {};
  if (
    pd?.fawryCode ||
    pd?.fawry_code ||
    pd?.referenceNumber ||
    pd?.payment_data?.fawryCode ||
    pd?.payment_data?.referenceNumber ||
    frPd?.fawryCode ||
    frPd?.referenceNumber
  ) {
    return true;
  }
  return false;
}

export function isCardTransaction(pTxOrData, fawaterakResponse = null) {
  const methodId = Number(
    pTxOrData?.paymentMethodId ||
    pTxOrData?.payment_method_id ||
    pTxOrData?.lockedMethodId ||
    fawaterakResponse?.payment_method_id
  );
  if (methodId === 2) return true;

  const methodName = String(
    pTxOrData?.paymentMethodName ||
    pTxOrData?.lockedMethodName ||
    pTxOrData?.payment_method ||
    fawaterakResponse?.payment_method ||
    ""
  ).toLowerCase();

  return /visa|mastercard|card|فيزا|ماستر|بطاق/.test(methodName);
}

export function extractWalletReference(pTxOrData, fawaterakResponse = null) {
  if (!pTxOrData && !fawaterakResponse) return null;

  const pd = pTxOrData?.paymentData || pTxOrData || {};
  const fr = fawaterakResponse || pTxOrData?.fawaterakResponse || {};
  const frPd = fr?.payment_data || {};

  let histRef = null;
  if (Array.isArray(fr?.transaction_history)) {
    const itemWithRef = fr.transaction_history.find(
      (h) => h?.reference != null && String(h.reference).trim() !== ""
    );
    if (itemWithRef) histRef = itemWithRef.reference;
  }

  const candidate =
    pd.walletReference ||
    pd.meezaReference ||
    pd.wallet_reference ||
    pd.systemReference ||
    pd.payment_data?.walletReference ||
    pd.payment_data?.meezaReference ||
    pd.payment_data?.systemReference ||
    frPd.walletReference ||
    frPd.meezaReference ||
    frPd.systemReference ||
    fr.meezaReference ||
    fr.systemReference ||
    (isWalletTransaction(pTxOrData, fawaterakResponse)
      ? (pd.referenceNumber || frPd.referenceNumber || fr.reference || histRef)
      : (pd.meezaReference || frPd.meezaReference || null));

  return candidate ? String(candidate).trim() : null;
}

export function extractFawaterakDates(fawaterakResponse, paymentData, fallbackCreatedAt = null, extraTx = null) {
  let fawaterakCreatedAt =
    fawaterakResponse?.transaction_created_at ||
    fawaterakResponse?.transaction_history?.[0]?.date ||
    fawaterakResponse?.invoice_date ||
    fawaterakResponse?.created_at ||
    fawaterakResponse?.date ||
    paymentData?.fawaterakCreatedAt ||
    paymentData?.created_at ||
    extraTx?.createdAt ||
    fallbackCreatedAt ||
    null;

  if (fawaterakCreatedAt instanceof Date) {
    fawaterakCreatedAt = fawaterakCreatedAt.toISOString();
  }

  // Fawaterak Invoice Expiration Time (وقت انتهاء الفاتورة الصادر من فواتيرك حصرياً)
  let fawaterakExpireDate =
    fawaterakResponse?.payment_data?.expireDate ||
    fawaterakResponse?.payment_data?.expirationTime ||
    paymentData?.payment_data?.expireDate ||
    paymentData?.payment_data?.expirationTime ||
    paymentData?.expireDate ||
    paymentData?.expirationTime ||
    fawaterakResponse?.expire_date ||
    fawaterakResponse?.expireDate ||
    paymentData?.expire_date ||
    paymentData?.expiryDate ||
    paymentData?.fawaterakExpireDate ||
    null;

  // Check if wallet transaction (Meeza / Mobile Wallets)
  const isWallet = isWalletTransaction(paymentData, fawaterakResponse) || isWalletTransaction(extraTx);

  if (isWallet) {
    const cTime = fawaterakCreatedAt ? new Date(fawaterakCreatedAt).getTime() : Date.now();
    // Mobile wallet Request-to-Pay sessions expire strictly in 5 minutes (300 seconds) from creation.
    const maxWalletValidity = (!isNaN(cTime) ? cTime : Date.now()) + 5 * 60 * 1000;
    const eTime = fawaterakExpireDate ? new Date(fawaterakExpireDate).getTime() : 0;

    // If Fawaterak did not supply an explicit short expireDate or provided a multi-day due_date,
    // enforce the standard 5-minute wallet validity:
    if (!fawaterakExpireDate || isNaN(eTime) || eTime > maxWalletValidity) {
      fawaterakExpireDate = new Date(maxWalletValidity).toISOString();
    }
  }

  if (fawaterakExpireDate instanceof Date) {
    fawaterakExpireDate = fawaterakExpireDate.toISOString();
  }

  return {
    fawaterakCreatedAt,
    fawaterakExpireDate,
  };
}

export function checkIfTransactionExpired(pTx) {
  if (!pTx) return { isExpired: false, expireDate: null, createdAt: null };
  if (pTx.status === "paid") return { isExpired: false, expireDate: null, createdAt: pTx.createdAt };
  if (pTx.status === "expired" || pTx.status === "cancelled" || pTx.status === "failed") {
    return { isExpired: true, expireDate: null, createdAt: pTx.createdAt };
  }

  const { fawaterakCreatedAt, fawaterakExpireDate } = extractFawaterakDates(
    pTx.fawaterakResponse,
    pTx.paymentData,
    pTx.createdAt,
    pTx
  );

  if (!fawaterakExpireDate) {
    return { isExpired: false, expireDate: null, createdAt: fawaterakCreatedAt };
  }

  const expireTime = new Date(fawaterakExpireDate).getTime();
  if (isNaN(expireTime)) {
    return { isExpired: false, expireDate: fawaterakExpireDate, createdAt: fawaterakCreatedAt };
  }

  const isExpired = Date.now() > expireTime;
  return {
    isExpired,
    expireDate: fawaterakExpireDate,
    createdAt: fawaterakCreatedAt,
  };
}

function getRedirectionUrls(req, extraQuery = "") {
  const configuredOrigins = [env.APP_URL, ...(env.CLIENT_ORIGIN || "").split(",")];
  const publicBase = configuredOrigins
    .map((origin) => origin.trim())
    .find((origin) => {
      try {
        const url = new URL(origin);
        return (
          url.protocol === "https:" &&
          !["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
        );
      } catch {
        return false;
      }
    });
  const base =
    publicBase ||
    env.APP_URL ||
    `${req.protocol}://${req.get("host").replace(":4000", ":3000")}`;
  const queryStr = extraQuery
    ? extraQuery.startsWith("?")
      ? extraQuery
      : `?${extraQuery}`
    : "";
  const defaultWebhook =
    base.includes("localhost") || base.includes("127.0.0.1")
      ? (process.env.FAWATERAK_WEBHOOK_URL || `${base.replace(":3000", ":4000")}/api/payment/webhook_json`)
      : `${base}/api/payment/webhook_json`;
  return {
    successUrl: `${base}/payment/success${queryStr}`,
    failUrl: `${base}/payment/fail${queryStr}`,
    pendingUrl: `${base}/payment/pending${queryStr}`,
    webhookUrl: process.env.FAWATERAK_WEBHOOK_URL || defaultWebhook,
  };
}

function buildCustomer(user, extra = {}) {
  const nameParts = (user.name || "").trim().split(" ");
  return {
    firstName: nameParts[0] || "User",
    lastName: nameParts.slice(1).join(" ") || ".",
    email: user.email || "",
    phone: user.phone || extra.phone || "",
    address: user.address || "",
    userId: user._id,
  };
}

async function processVerifiedPayment(pTx, txData) {
  // 1. Check idempotency (Already Paid)
  if (pTx.status === "paid") {
    return { success: true, alreadyProcessed: true };
  }

  // 2. Verify Amount (Crucial Security Check)
  // Expected amount is set server-side when order/intent is created
  const expectedAmount = Number(pTx.amount || 0);
  // Actual amount from Fawaterak verified transaction
  const reportedAmount = Number(
    txData.total ??
    txData.amount ??
    txData.invoice_amount ??
    txData.settlement_amount ??
    txData.financial_breakdown?.original_amount ??
    0
  );

  // If expected amount > 0, ensure reported amount matches expected amount within 1.0 EGP tolerance
  if (expectedAmount > 0 && (reportedAmount <= 0 || Math.abs(expectedAmount - reportedAmount) > 1.0)) {
    // Mark as suspicious
    pTx.status = "suspicious_amount";
    pTx.fawaterakLogs.push({
      action: "verify_amount_failed",
      data: txData,
      note: `Amount mismatch. Expected ${expectedAmount}, got ${reportedAmount}`,
    });
    await pTx.save();
    return { success: false, error: "amount_mismatch" };
  }

  // 3. Mark as paid atomically in MongoDB so only ONE process executes activation
  const updatedTx = await PaymentTransaction.findOneAndUpdate(
    { _id: pTx._id, status: { $ne: "paid" } },
    {
      $set: {
        status: "paid",
        paymentMethodName: txData.payment_method || pTx.paymentMethodName,
        fawaterakResponse: txData,
        paidAt: new Date(txData.paid_at || Date.now()),
      },
      $push: {
        fawaterakLogs: { action: "verify_success", data: txData },
      },
    },
    { new: true }
  );

  if (!updatedTx) {
    // Already marked as paid by concurrent webhook or verify request
    return { success: true, alreadyProcessed: true };
  }

  pTx.status = "paid";
  pTx.paymentMethodName = updatedTx.paymentMethodName;
  pTx.fawaterakResponse = updatedTx.fawaterakResponse;
  pTx.paidAt = updatedTx.paidAt;

  // 4. Activate business logic atomically
  const orderType = txData.pay_load?.order_type || pTx.orderType;
  if (orderType === "subscription") {
    let subscription = pTx.referenceId && mongoose.Types.ObjectId.isValid(pTx.referenceId)
      ? await Subscription.findById(pTx.referenceId)
      : null;
    if (!subscription && pTx.userId) {
      subscription = await Subscription.findOne({ userId: pTx.userId });
    }
    if (!subscription && pTx.userId) {
      const proPlan = await Plan.findOne({ key: "pro" });
      subscription = new Subscription({
        userId: pTx.userId,
        planId: proPlan?._id || pTx.paymentData?.targetPlanId,
      });
    }
    if (subscription) {
      await activateSubscription(subscription, txData, pTx);
    }

    // Process referral attribution & rewards if qualifying purchase
    try {
      await referralService.processQualifyingPurchase(updatedTx || pTx);
    } catch (refErr) {
      console.error("[Referral] Error processing qualifying purchase:", refErr);
    }
  } else if (orderType === "store") {
    await finalizeStoreOrder(pTx, txData);
  }

  return { success: true, alreadyProcessed: false };
}

async function activateSubscription(subscription, txData, pTx) {
  let targetPlanId = pTx?.paymentData?.targetPlanId;
  if (!targetPlanId) {
    const proPlan = (await Plan.findOne({ key: "pro" })) || (await Plan.findOne({ name: /pro/i }));
    if (proPlan) targetPlanId = proPlan._id;
  }
  if (targetPlanId) {
    subscription.planId = targetPlanId;
  }
  subscription.billingPeriod = pTx?.paymentData?.targetBillingPeriod || subscription.billingPeriod || "monthly";
  if (pTx?.paymentData?.targetExpiresAt) {
    subscription.expiresAt = pTx.paymentData.targetExpiresAt;
  } else {
    const now = new Date();
    const hasRemainingActiveDays =
      subscription.status === "active" &&
      subscription.expiresAt &&
      new Date(subscription.expiresAt) > now;
    const baseDate = hasRemainingActiveDays ? new Date(subscription.expiresAt) : now;
    const expiresAt = new Date(baseDate);
    expiresAt.setDate(expiresAt.getDate() + (subscription.billingPeriod === "yearly" ? 365 : 30));
    subscription.expiresAt = expiresAt;
  }
  subscription.startedAt = subscription.startedAt || new Date();

  subscription.status = "active";
  subscription.provider = "fawaterak";
  subscription.expiryRemindersSent = [];
  subscription.paidAt = new Date(txData.paid_at || Date.now());
  subscription.paidAmount = (pTx && pTx.amount) ? pTx.amount : (txData.total || 0);
  subscription.paymentMethod = txData.payment_method || pTx?.paymentMethodName || "Card";
  subscription.intentKey = txData.intent_key || pTx?.intentKey;
  subscription.transactionId = String(txData.transaction_id || txData.invoice_id || "");
  if (txData.transaction_history?.[0]?.reference) {
    subscription.fawaterakRef = txData.transaction_history[0].reference;
  }

  if (pTx?.paymentData?.saveCard !== false) {
    subscription.autoRenew = true;
  }

  const cardToken = txData.customerCardToken || txData.card_token || txData.cardToken;
  const cardBrand = txData.cardBrand || txData.card_brand || "CARD";
  const customerCard = txData.customerCard || txData.card_number || txData.masked_pan || "";
  const cardTokenUniqueId = txData.cardTokenUniqueId || "";

  const isCardPayment =
    pTx?.paymentMethodId === 2 ||
    /visa|mastercard|card|فيزا|ماستر|بطاقة/i.test(pTx?.paymentMethodName || "") ||
    /visa|mastercard|card/i.test(txData.payment_method || "");

  const effectiveCardToken =
    cardToken ||
    pTx?.paymentData?.customerCardToken ||
    (isCardPayment ? `card_token_${pTx?.intentKey || Date.now()}` : null);

  const effectiveCardBrand =
    cardBrand !== "CARD"
      ? cardBrand
      : (pTx?.paymentData?.cardBrand || "Visa / Mastercard");

  const effectiveCustomerCard =
    customerCard ||
    pTx?.paymentData?.customerCard ||
    (pTx?.paymentData?.last4 ? `**** **** **** ${pTx.paymentData.last4}` : "");

  if (effectiveCardToken) {
    const savedCardData = {
      cardToken: effectiveCardToken,
      cardTokenUniqueId: cardTokenUniqueId || "",
      cardBrand: effectiveCardBrand,
      customerCard: effectiveCustomerCard,
      cardHolder: pTx?.paymentData?.cardHolder || "",
      savedAt: new Date(),
    };
    subscription.savedCard = savedCardData;
    await mongoose.model("User").findByIdAndUpdate(subscription.userId, {
      savedCard: savedCardData,
    });
  }

  await subscription.save();

  // Update user model based on plan type
  try {
    const subPlan = await Plan.findById(subscription.planId);
    if (subPlan?.key === "payment_plus") {
      await mongoose.model("User").findByIdAndUpdate(subscription.userId, {
        $set: {
          paymentPlusActive: true,
          hasStandalonePaymentPlus: true,
          paymentPlusOverride: "enabled",
          paymentPlusStartedAt: subscription.startedAt || new Date(),
          paymentPlusExpiresAt: subscription.expiresAt,
          paymentPlusBillingPeriod: subscription.billingPeriod || "monthly",
        },
      });
    } else if (subPlan?.key === "pro") {
      await mongoose.model("User").findByIdAndUpdate(subscription.userId, {
        $set: {
          paymentPlusActive: true,
          paymentPlusOverride: "enabled",
        },
      });
    }
  } catch (err) {
    console.error("Error updating user payment plus status on activation:", err);
  }

  if (pTx?.paymentData?.couponId) {
    try {
      const couponUsageId = String(pTx.paymentData.couponId).trim();
      // The condition makes gateway/webhook retries idempotent: one successful
      // payment consumes this coupon exactly once.
      await Coupon.updateOne(
        { couponId: couponUsageId, usedBy: { $ne: subscription.userId } },
        { $addToSet: { usedBy: subscription.userId }, $inc: { usedCount: 1 } },
      );
      await User.findByIdAndUpdate(subscription.userId, {
        $addToSet: { usedCouponIds: couponUsageId },
      });
    } catch {}
  }

  // Send activation email
  try {
    const subUser = await mongoose.model("User").findById(subscription.userId);
    const subPlan = await Plan.findById(subscription.planId);
    if (subUser && subPlan) {
      sendSubscriptionEmail({
        email: subUser.email,
        name: subUser.name,
        planName:
          subPlan.name?.ar ||
          subPlan.name?.en ||
          (typeof subPlan.name === "string" ? subPlan.name : "Pro"),
        billingPeriod: subscription.billingPeriod || "monthly",
        amount: subscription.paidAmount || txData.total,
        invoiceDate: new Date(
          subscription.paidAt || Date.now(),
        ).toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        startDate: new Date(
          subscription.startedAt || Date.now(),
        ).toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        endDate: subscription.expiresAt
          ? new Date(subscription.expiresAt).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : undefined,
        status: "active",
        paymentMethodName: txData.payment_method || null,
      }).catch(() => {});
    }
  } catch (err) {
  }

  // Update cards to keep their current actionType
  await AuditLog.create({
    message: "subscription_activated_via_fawaterak",
    category: "payments_subscriptions",
    userId: subscription.userId,
    details: {
      subscriptionId: subscription._id,
      intentKey: subscription.intentKey,
      transactionId: subscription.transactionId,
      amount: txData.total,
      method: txData.payment_method,
      fawaterakResponse: txData,
    },
  }).catch(() => {}); // Non-critical

  if (subscription.userId) {
    notifyUser(subscription.userId.toString(), {
      type: "subscription_created",
      payload: { id: subscription._id, planId: subscription.planId },
    });
  }
}

function getOrderPaymentMethod(pTx, txData) {
  const methodName = String(
    txData?.payment_method || pTx?.paymentMethodName || "",
  ).trim();
  const normalizedName = methodName.toLowerCase();
  const methodId = Number(pTx?.paymentMethodId || txData?.payment_method_id);

  if (/fawry|فوري/.test(normalizedName) || methodId === 3) {
    return { paymentMethod: "fawry", paymentMethodName: methodName || "Fawry" };
  }
  if (/meeza|wallet|محفظ/.test(normalizedName) || methodId === 4) {
    return {
      paymentMethod: "meeza",
      paymentMethodName: methodName || "Meeza / Mobile Wallet",
    };
  }
  if (/visa|master|card|بطاقة/.test(normalizedName) || methodId === 2) {
    return {
      paymentMethod: "card",
      paymentMethodName: methodName || "Visa / Mastercard",
    };
  }
  return {
    paymentMethod: "online",
    paymentMethodName: methodName || "Online payment",
  };
}

async function activateOrder(order, txData, pTx) {
  const paymentMethod = getOrderPaymentMethod(pTx, txData);
  order.paymentMethod = paymentMethod.paymentMethod;
  order.paymentMethodName = paymentMethod.paymentMethodName;
  order.paymentStatus = "paid";
  order.paidAt = new Date(txData.paid_at || Date.now());
  order.transactionId = String(txData.transaction_id || txData.invoice_id || "");
  if (txData.transaction_history?.[0]?.reference) {
    order.fawaterakRef = txData.transaction_history[0].reference;
  }
  await order.save();
  await processCustomCardsForOrder(order);

  try {
    const orderUser = await mongoose.model("User").findById(order.userId);
    if (orderUser || order.customer?.email) {
      sendOrderEmail({
        email: order.customer?.email || orderUser?.email,
        name: order.customer?.name || orderUser?.name,
        orderNumber: order.orderNumber,
        items: order.items,
        totalAmount: order.totalAmount,
        shippingCost: order.shippingCost || 0,
        discount: order.discount || 0,
        paymentMethod: order.paymentMethodName,
        customerAddress: order.customer
          ? `${order.customer.address}, ${order.customer.city || ""}`
          : "",
        status: "paid",
      }).catch(() => {});
    }
  } catch (err) {
  }

  await AuditLog.create({
    message: "order_paid_via_fawaterak",
    category: "payments_subscriptions",
    userId: order.userId,
    details: {
      orderId: order._id,
      intentKey: order.intentKey,
      amount: txData.total,
      method: order.paymentMethodName,
      fawaterakResponse: txData,
    },
  }).catch(() => {});
}

async function finalizeStoreOrder(pTx, txData) {
  let order =
    (await Order.findOne({ paymentTransactionId: pTx._id })) ||
    (await Order.findOne({ intentKey: pTx.intentKey }));
  let created = false;

  if (!order) {
    const draft = await OrderDraft.findById(pTx.referenceId);
    if (!draft) return null;

    order = new Order({
      orderNumber: draft.orderNumber,
      userId: draft.userId,
      customer: draft.customer,
      items: draft.items,
      totalAmount: draft.totalAmount,
      shippingCost: draft.shippingCost,
      discount: draft.discount,
      status: "received",
      paymentMethod: "online",
      paymentStatus: "pending",
      intentKey: pTx.intentKey,
      paymentTransactionId: pTx._id,
    });

    try {
      await order.save();
      created = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      order =
        (await Order.findOne({ paymentTransactionId: pTx._id })) ||
        (await Order.findOne({ intentKey: pTx.intentKey }));
      if (!order) throw error;
    }

    await OrderDraft.deleteOne({ _id: draft._id });
    pTx.referenceId = order._id;
    await pTx.save();

    if (created && draft.couponId) {
      await Coupon.updateOne(
        { _id: draft.couponId },
        {
          $inc: { usedCount: 1 },
          ...(draft.userId ? { $addToSet: { usedBy: draft.userId } } : {}),
        },
      );
    }
    if (created && draft.userId) {
      notifyUser(draft.userId.toString(), {
        type: "order_created",
        payload: { id: order._id, name: draft.customer.name },
      });
    }
  }

  if (order.paymentStatus !== "paid") {
    await activateOrder(order, txData, pTx);
  }
  return order;
}

// ── GET /api/payment/methods ──────────────────────────────────────────────────

// In-memory cache for live gateway payment methods to ensure instant response times
let cachedGatewayMethods = null;
let cachedGatewayMethodsExpiresAt = 0;
const GATEWAY_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const getPaymentMethods = asyncHandler(async (req, res) => {
  const config = await getPaymentConfig();
  const enabledConfigMethods = (config.methods || []).filter((m) => m.enabled !== false);

  let gatewayMethods = null;

  // Use cached gateway methods if available and fresh
  if (cachedGatewayMethods && Date.now() < cachedGatewayMethodsExpiresAt) {
    gatewayMethods = cachedGatewayMethods;
  } else {
    try {
      // Enforce a strict 2000ms max timeout so we NEVER block or cause client timeouts
      gatewayMethods = await Promise.race([
        fawaterak.getPaymentMethods(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Gateway fetch timeout")), 2000)
        ),
      ]);

      if (Array.isArray(gatewayMethods) && gatewayMethods.length > 0) {
        cachedGatewayMethods = gatewayMethods;
        cachedGatewayMethodsExpiresAt = Date.now() + GATEWAY_CACHE_TTL_MS;
      }
    } catch {
      // Gateway is slow or unreachable; immediately fall back to the DB-configured methods
    }
  }

  if (Array.isArray(gatewayMethods) && gatewayMethods.length > 0) {
    // Merge live gateway details (logos, redirects) with admin custom configurations
    const mergedMethods = enabledConfigMethods
      .filter((m) => m.type === "online")
      .map((m) => {
        const live = gatewayMethods.find(
          (gm) => Number(gm.payment_method_id) === Number(m.payment_method_id)
        );
        return {
          payment_method_id: m.payment_method_id,
          id: m.id,
          name_en: m.name_en || live?.name_en || "Payment Method",
          name_ar: m.name_ar || live?.name_ar || "طريقة دفع",
          redirect: m.redirect != null ? String(m.redirect) : (live?.redirect != null ? String(live.redirect) : "false"),
          logo: m.logo || live?.logo || "",
          icon: m.icon || "CreditCard",
          badge: m.badge || "",
          commission_on_customer: m.commission_on_customer != null ? m.commission_on_customer : (live?.commission_on_customer || 0),
          fixed_fee: m.fixed_fee || 0,
          integration_status: 1,
          description_ar: m.description_ar || "",
          description_en: m.description_en || "",
          instructions_ar: m.instructions_ar || "",
          instructions_en: m.instructions_en || "",
          allow_for_subscriptions: m.allow_for_subscriptions !== false,
          allow_for_store_orders: m.allow_for_store_orders !== false,
          sort_order: m.sort_order || 0,
        };
      });

    // Include active manual methods (e.g. InstaPay, Vodafone Cash direct)
    const manualMethods = enabledConfigMethods
      .filter((m) => m.type === "manual")
      .map((m) => ({
        payment_method_id: m.payment_method_id || m.id,
        id: m.id,
        name_en: m.name_en,
        name_ar: m.name_ar,
        redirect: "false",
        logo: m.logo || "",
        icon: m.icon || "Wallet",
        badge: m.badge || "تحويل يدوي",
        commission_on_customer: m.commission_on_customer || 0,
        fixed_fee: m.fixed_fee || 0,
        integration_status: 1,
        is_manual: true,
        account_details: m.account_details || "",
        description_ar: m.description_ar || "",
        description_en: m.description_en || "",
        instructions_ar: m.instructions_ar || "",
        instructions_en: m.instructions_en || "",
        allow_for_subscriptions: m.allow_for_subscriptions !== false,
        allow_for_store_orders: m.allow_for_store_orders !== false,
        sort_order: m.sort_order || 99,
      }));

    const allActive = [...mergedMethods, ...manualMethods].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );

    const codMethod = config.methods?.find((m) => m.id === "cash_on_delivery");
    const isCodGloballyEnabled = Boolean(
      config.globalSettings?.cod_enabled !== false &&
      (codMethod ? codMethod.enabled !== false : true)
    );

    return res.json({
      success: true,
      methods: allActive,
      cod_enabled: isCodGloballyEnabled,
      globalSettings: {
        ...config.globalSettings,
        cod_enabled: isCodGloballyEnabled,
      },
    });
  }

  // Resilient fallback from enabled configured methods
  const fallbackActive = enabledConfigMethods
    .filter((m) => m.type !== "offline")
    .map((m) => ({
      payment_method_id: m.payment_method_id || m.id,
      id: m.id,
      name_en: m.name_en,
      name_ar: m.name_ar,
      redirect: m.redirect != null ? String(m.redirect) : "false",
      logo: m.logo || "",
      icon: m.icon || "CreditCard",
      badge: m.badge || "",
      commission_on_customer: m.commission_on_customer || 0,
      fixed_fee: m.fixed_fee || 0,
      integration_status: 1,
      is_manual: m.type === "manual",
      account_details: m.account_details || "",
      description_ar: m.description_ar || "",
      description_en: m.description_en || "",
      instructions_ar: m.instructions_ar || "",
      instructions_en: m.instructions_en || "",
      allow_for_subscriptions: m.allow_for_subscriptions !== false,
      allow_for_store_orders: m.allow_for_store_orders !== false,
      sort_order: m.sort_order || 0,
    }))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const codMethodFallback = config.methods?.find((m) => m.id === "cash_on_delivery");
  const isCodFallbackEnabled = Boolean(
    config.globalSettings?.cod_enabled !== false &&
    (codMethodFallback ? codMethodFallback.enabled !== false : true)
  );

  return res.json({
    success: true,
    methods: fallbackActive,
    cod_enabled: isCodFallbackEnabled,
    globalSettings: {
      ...config.globalSettings,
      cod_enabled: isCodFallbackEnabled,
    },
  });
});

// ── In-Flight Request Deduplication ──────────────────────────────────────────
// Prevents duplicate concurrent calls to Fawaterak if user double-clicks or server lags
const activePaymentCreations = new Map();

function runWithPaymentLock(lockKey, task) {
  if (activePaymentCreations.has(lockKey)) {
    return activePaymentCreations.get(lockKey);
  }

  const promise = (async () => {
    try {
      return await task();
    } finally {
      setTimeout(() => {
        activePaymentCreations.delete(lockKey);
      }, 1500);
    }
  })();

  activePaymentCreations.set(lockKey, promise);
  return promise;
}

// ── POST /api/payment/subscription ───────────────────────────────────────────
// Body: { planId, billingPeriod, methodId?, walletNumber?, couponCode? }

export const createSubscriptionPayment = asyncHandler(async (req, res) => {
  const loggedBody = { ...req.body };
  if (loggedBody.walletNumber) {
    loggedBody.walletNumber = `***${String(loggedBody.walletNumber).slice(-2)}`;
  }
  console.info("[payment.subscription] request body", loggedBody);

  const { planId, billingPeriod, methodId, walletNumber, couponCode, saveCard, referralRewardId, applyReferralDiscount } =
    req.body;
  const user = req.user;

  if (!planId || !billingPeriod) {
    return res
      .status(400)
      .json({ error: "planId and billingPeriod are required" });
  }

  let plan = null;
  if (mongoose.Types.ObjectId.isValid(planId)) {
    plan = await Plan.findById(planId);
  }
  if (!plan) {
    plan = (await Plan.findOne({ key: planId })) || (await Plan.findOne({ key: "pro" }));
  }
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  // Retrieve existing subscription for this plan, or an unused free subscription, or create a new one
  let existingSub = await Subscription.findOne({ userId: user._id, planId: plan._id });
  if (!existingSub) {
    const freePlan = await Plan.findOne({ key: "free" });
    if (freePlan) {
      existingSub = await Subscription.findOne({ userId: user._id, planId: freePlan._id });
    }
  }
  if (!existingSub) {
    existingSub = await Subscription.create({
      userId: user._id,
      planId: plan._id,
      // Do not grant plan access merely because a payment intent was opened.
      // activateSubscription switches this to active after payment confirmation.
      status: "pending",
      startedAt: new Date(),
      provider: "manual",
    });
  }

  let price =
    billingPeriod === "yearly" ? plan.prices.yearly : plan.prices.monthly;
  let discount = 0;
  let appliedCoupon = null;

  // Upgrade discount from Payment Plus to Pro (calculated from latest active days on Payment Plus)
  let upgradeDiscount = 0;
  let ppDaysUsed = 0;
  if (plan.key === "pro") {
    try {
      const subState = await getSubscriptionState(user._id);
      const upDisc = subState?.upgradeDiscount || subState?.paymentPlusDetails?.upgradeDiscount || 0;
      const ppDays = subState?.paymentPlusDaysUsed || subState?.paymentPlusDetails?.daysUsed || 0;
      if (upDisc > 0) {
        upgradeDiscount = Number(upDisc) || 0;
        ppDaysUsed = Number(ppDays) || 0;
        discount += upgradeDiscount;
      }
    } catch (e) {
      console.warn("[createSubscriptionPayment] Error calculating upgrade discount:", e.message);
    }
  }

  // Apply coupon if provided
  if (couponCode) {
    const cleanUpper = couponCode.toUpperCase().trim();
    const safeCode = escapeRegex(cleanUpper);
    appliedCoupon = await Coupon.findOne({
      $or: [
        { code: cleanUpper },
        { code: { $regex: new RegExp(`^${safeCode}$`, "i") } },
        { couponId: cleanUpper },
        { couponId: { $regex: new RegExp(`^${safeCode}$`, "i") } },
      ],
    });
    if (appliedCoupon?.isActive) {
      let valid = true;
      if (
        appliedCoupon.expiresAt &&
        new Date() > new Date(appliedCoupon.expiresAt)
      )
        valid = false;
      const hasMaxLimit = appliedCoupon.maxUses != null && Number(appliedCoupon.maxUses) > 0;
      if (hasMaxLimit && appliedCoupon.usedCount >= appliedCoupon.maxUses)
        valid = false;
      if (appliedCoupon.appliesTo === "store") valid = false;
      if (appliedCoupon.applicablePlan && appliedCoupon.applicablePlan !== "all" && plan.key !== appliedCoupon.applicablePlan) {
        return res.status(400).json({
          error: `هذا الكود مخصص لباقة ${appliedCoupon.applicablePlan === "pro" ? "Pro" : "المدفوعات Payment Plus"} فقط.`,
          code: "COUPON_PLAN_MISMATCH",
        });
      }

      // Strictly enforce one use per user account based on couponId
      const couponTrackingId = getCouponUsageId(appliedCoupon);

      let alreadyUsedByUser = false;
      if (user) {
        const userDoc = await User.findById(user._id).select("usedCouponIds").lean();
        const hasUsedThisId = hasUsedCouponId(userDoc?.usedCouponIds, couponTrackingId);
        const hasUsedInTx = await PaymentTransaction.exists({
          userId: user._id,
          status: "paid",
          "paymentData.couponId": couponTrackingId,
        });

        if (hasUsedThisId || hasUsedInTx) {
          alreadyUsedByUser = true;
          valid = false;
        }
      }

      if (alreadyUsedByUser) {
        return res.status(400).json({
          error: "لقد تم استخدام هذا الكود مسبقاً",
          code: "COUPON_ALREADY_USED",
        });
      }

      if (valid) {
        let discountVal = appliedCoupon.discountValue;
        if (
          billingPeriod === "monthly" &&
          appliedCoupon.monthlyDiscountValue != null
        ) {
          discountVal = appliedCoupon.monthlyDiscountValue;
        } else if (
          billingPeriod === "yearly" &&
          appliedCoupon.yearlyDiscountValue != null
        ) {
          discountVal = appliedCoupon.yearlyDiscountValue;
        }
        discount =
          appliedCoupon.discountType === "percentage"
            ? Math.round((price * discountVal) / 100)
            : Math.min(discountVal, price);
      }
    }
  }

  // Apply eligible referral discount (Invitee 10%, Monthly renewal 10-25%, or Milestone 50%)
  let referralReward = null;
  let referralDiscountAmount = 0;
  let referralDiscountPercent = 0;

  if (referralRewardId || applyReferralDiscount || !appliedCoupon || couponCode) {
    try {
      const refDisc = await referralService.calculateEligibleDiscounts({
        userId: user._id,
        basePrice: price,
        requestedRewardId: referralRewardId,
        referralCode: couponCode || null,
      });
      if (refDisc && refDisc.applied) {
        const refSettings = await referralService.getReferralSettings();
        if (!appliedCoupon || refSettings.allowStackingDiscounts) {
          referralReward = refDisc;
          referralDiscountAmount = refDisc.discountAmount;
          referralDiscountPercent = refDisc.discountPercent;
          discount += referralDiscountAmount;
        } else if (refDisc.discountAmount > discount) {
          discount = refDisc.discountAmount;
          appliedCoupon = null;
          referralReward = refDisc;
          referralDiscountAmount = refDisc.discountAmount;
          referralDiscountPercent = refDisc.discountPercent;
        }
      }
    } catch (refErr) {
      console.error("[Referral] Error calculating checkout discount:", refErr);
    }
  }

  const netAmount = Math.max(0, price - discount);

  // Calculate new expiration date (if user has active days left, carry them over to the new period)
  const now = new Date();
  const hasRemainingActiveDays =
    existingSub &&
    existingSub.status === "active" &&
    existingSub.expiresAt &&
    new Date(existingSub.expiresAt) > now;

  const baseDate = hasRemainingActiveDays ? new Date(existingSub.expiresAt) : now;
  const expiresAt = new Date(baseDate);
  expiresAt.setMonth(
    expiresAt.getMonth() + (billingPeriod === "yearly" ? 12 : 1),
  );

  // 100% Free Subscription: Activate directly without payment gateway or phone requirement
  if (netAmount === 0 || plan.key === "free") {
    // Cancel lingering pending transactions
    await PaymentTransaction.updateMany(
      { userId: user._id, orderType: "subscription", status: "pending" },
      { $set: { status: "cancelled" } }
    );

    existingSub.planId = plan._id;
    existingSub.status = "active";
    existingSub.billingPeriod = plan.key === "free" ? null : billingPeriod;
    existingSub.startedAt = new Date();
    existingSub.expiresAt = plan.key === "free" ? null : expiresAt;
    existingSub.provider = "free";
    existingSub.paidAt = new Date();
    existingSub.paidAmount = 0;
    existingSub.paymentMethod = "free_coupon";
    existingSub.cancelledBy = null;
    existingSub.cancellationReason = "";
    await existingSub.save();

    if (plan.key === "payment_plus") {
      await User.findByIdAndUpdate(user._id, {
        $set: {
          paymentPlusActive: true,
          hasStandalonePaymentPlus: true,
          paymentPlusOverride: "enabled",
          paymentPlusStartedAt: new Date(),
          paymentPlusExpiresAt: expiresAt,
          paymentPlusBillingPeriod: billingPeriod,
        },
      });
    } else if (plan.key === "pro") {
      await User.findByIdAndUpdate(user._id, {
        $set: {
          paymentPlusActive: true,
          paymentPlusOverride: "enabled",
        },
      });
    }

    const couponTrackingId = getCouponUsageId(appliedCoupon);

    if (appliedCoupon) {
      appliedCoupon.usedCount = (appliedCoupon.usedCount || 0) + 1;
      if (!appliedCoupon.usedBy) appliedCoupon.usedBy = [];
      if (!appliedCoupon.usedBy.some((id) => id.toString() === user._id.toString())) {
        appliedCoupon.usedBy.push(user._id);
      }
      await appliedCoupon.save();
    }

    if (couponTrackingId) {
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { usedCouponIds: couponTrackingId },
      });
    }

    if (referralReward && referralReward.rewardId) {
      const ReferralRewardModel = mongoose.model("ReferralReward");
      if (ReferralRewardModel) {
        await ReferralRewardModel.updateOne(
          { _id: referralReward.rewardId, status: "available" },
          {
            $set: {
              status: "redeemed",
              redeemedAt: new Date(),
              redeemedInvoiceNumber: "FREE_PLAN",
            },
          }
        );
      }
    }

    // Create completed free transaction record
    const freeIntentKey = `FREE_SUB_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    await PaymentTransaction.create({
      userId: user._id,
      referenceId: existingSub._id,
      orderType: "subscription",
      intentKey: freeIntentKey,
      amount: 0,
      currency: "EGP",
      provider: "free",
      paymentMethodName: "خصم 100% / مجاني",
      status: "paid",
      paymentData: {
        isFree: true,
        couponCode: appliedCoupon?.code || couponCode || null,
        couponId: couponTrackingId,
        planKey: plan.key,
        billingPeriod,
        discountAmount: discount,
      },
    });

    notifyUser(user._id.toString(), {
      type: "subscription_created",
      payload: { id: existingSub._id, planName: plan.name?.ar || plan.name },
    });

    return res.json({
      success: true,
      isFree: true,
      message: "تم تفعيل الاشتراك مجاناً بنجاح.",
      subscriptionId: existingSub._id,
      plan: plan.key,
      status: "active",
      amount: 0,
    });
  }

  // ── Paid Subscriptions (netAmount > 0): Require phone, active method & gateway ──
  const userPhone = await ensureUserPhone(user, req);
  if (!userPhone) {
    return res.status(400).json({ error: "يجب إضافة رقم هاتف لحسابك من صفحة الملف الشخصي أولاً لتفعيل الاشتراك." });
  }

  // Validate that selected payment method is active in platform configuration
  const paymentConfig = await getPaymentConfig();
  const numericMethodId = methodId == null || methodId === "" ? null : Number(methodId);
  if (methodId != null) {
    const foundMethod = paymentConfig.methods.find(
      (m) =>
        (m.payment_method_id != null && Number(m.payment_method_id) === Number(methodId)) ||
        m.id === String(methodId)
    );
    if (!Number.isInteger(numericMethodId) || numericMethodId <= 0 || !foundMethod || foundMethod.type !== "online") {
      return res.status(400).json({
        error: "معرّف وسيلة الدفع غير صالح أو غير مدعوم للدفع الإلكتروني.",
        code: "INVALID_PAYMENT_METHOD",
      });
    }
    if (foundMethod && !foundMethod.enabled) {
      return res.status(400).json({
        error: `طريقة الدفع '${foundMethod.name_ar || foundMethod.name_en}' غير مفعلة حالياً في المنصة.`,
        code: "PAYMENT_METHOD_DISABLED",
      });
    }
  }

  // Automatically cancel any uncompleted card transactions (cards finish or terminate - no pending/resuming)
  await PaymentTransaction.updateMany(
    {
      userId: user._id,
      status: "pending",
      $or: [
        { paymentMethodId: 2 },
        { paymentMethodName: { $regex: /visa|mastercard|card|فيزا|ماستر|بطاقة/i } },
      ],
    },
    { $set: { status: "cancelled" } }
  );

  // Check if there is an active pending transaction for this user, plan, and method within 3 minutes (Idempotency - offline methods only: Fawry / Wallets)
  let recentSubTx = await PaymentTransaction.findOne({
    userId: user._id,
    referenceId: existingSub._id,
    orderType: "subscription",
    status: "pending",
    $or: [
      { paymentMethodId: { $in: [3, 4] } },
      { paymentMethodName: { $regex: /fawry|فوري|wallet|meeza|محفظ|كاش/i } },
      { "paymentData.fawryCode": { $exists: true, $ne: null } },
      { "paymentData.mobileWalletNumber": { $exists: true, $ne: null } },
      { "paymentData.customerMobile": { $exists: true, $ne: null } },
    ],
    createdAt: { $gte: new Date(Date.now() - 3 * 60 * 1000) },
  }).sort({ createdAt: -1 });

  if (recentSubTx) {
    const expInfo = checkIfTransactionExpired(recentSubTx);
    if (expInfo.isExpired) {
      recentSubTx.status = "expired";
      recentSubTx.fawaterakLogs.push({ action: "auto_expired", note: "Expired before new subscription initiate" });
      await recentSubTx.save();
      recentSubTx = null;
    }
  }

  const isSameSubMethod =
    recentSubTx &&
    ((methodId && Number(recentSubTx.paymentMethodId) === Number(methodId)) ||
      (!methodId && !recentSubTx.paymentMethodId));

  const isSamePlan =
    recentSubTx?.paymentData?.targetPlanId &&
    String(recentSubTx.paymentData.targetPlanId) === String(planId) &&
    recentSubTx.paymentData?.targetBillingPeriod === billingPeriod;

  if (
    recentSubTx &&
    isSameSubMethod &&
    isSamePlan &&
    (recentSubTx.checkoutUrl || recentSubTx.paymentData)
  ) {
    const { fawaterakCreatedAt, fawaterakExpireDate } = extractFawaterakDates(
      recentSubTx.fawaterakResponse,
      recentSubTx.paymentData,
      recentSubTx.createdAt
    );

    return res.json({
      success: true,
      intentKey: recentSubTx.intentKey,
      checkoutUrl: recentSubTx.checkoutUrl || null,
      paymentData: recentSubTx.paymentData,
      walletReference: extractWalletReference(recentSubTx.paymentData, recentSubTx.fawaterakResponse),
      invoiceInfo: sanitizeFawaterakData(recentSubTx.fawaterakResponse),
      subscriptionId: existingSub._id,
      transactionId:
        recentSubTx.fawaterakResponse?.transaction_id ||
        recentSubTx.fawaterakResponse?.invoice_id ||
        recentSubTx.intentKey,
      orderNumber: null,
      amount: recentSubTx.amount,
      fawaterakCreatedAt,
      fawaterakExpireDate,
      lockedMethodId: recentSubTx.paymentMethodId,
      lockedMethodName: recentSubTx.paymentMethodName,
    });
  }

  // ANTI-TAMPERING & STRICT METHOD LOCKING:
  // If user has an active pending transaction for this subscription and attempts to send a different method:
  if (recentSubTx && !isSameSubMethod) {
    return res.status(400).json({
      success: false,
      code: "PAYMENT_METHOD_LOCKED",
      error: `عملية الدفع هذه قيد الانتظار ومقيدة بوسيلة الدفع المحددة مسبقاً (${recentSubTx.paymentMethodName || "المحددة"}). لا يمكن استكمال الدفع بطريقة أخرى. يرجى إتمام العملية بنفس الطريقة أو إلغاء الطلب المعلق أولاً.`,
      lockedMethodId: recentSubTx.paymentMethodId,
      lockedMethodName: recentSubTx.paymentMethodName,
      intentKey: recentSubTx.intentKey,
    });
  }

  // If user changed the plan itself while having an active pending transaction:
  if (recentSubTx && !isSamePlan) {
    return res.status(400).json({
      success: false,
      code: "PENDING_TRANSACTION_EXISTS",
      error: "لديك طلب اشتراك معلق حالياً. يرجى إتمام الدفع أو إلغاء الطلب الحالي أولاً قبل اختيار باقة أخرى.",
      intentKey: recentSubTx.intentKey,
    });
  }

  // Check if there are other pending SUBSCRIPTION transactions (Store orders must NEVER block subscription requests)
  let otherPendingSubTx = await PaymentTransaction.findOne({
    userId: user._id,
    orderType: "subscription",
    status: "pending",
    ...(recentSubTx ? { _id: { $ne: recentSubTx._id } } : {}),
    $or: [
      { paymentMethodId: { $in: [3, 4] } },
      { paymentMethodName: { $regex: /fawry|فوري|wallet|meeza|محفظ|كاش/i } },
      { "paymentData.fawryCode": { $exists: true, $ne: null } },
      { "paymentData.mobileWalletNumber": { $exists: true, $ne: null } },
      { "paymentData.customerMobile": { $exists: true, $ne: null } },
    ],
    createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
  }).sort({ createdAt: -1 });

  if (otherPendingSubTx) {
    const expInfo = checkIfTransactionExpired(otherPendingSubTx);
    if (expInfo.isExpired) {
      otherPendingSubTx.status = "expired";
      otherPendingSubTx.fawaterakLogs.push({ action: "auto_expired", note: "Expired before new subscription check" });
      await otherPendingSubTx.save();
      otherPendingSubTx = null;
    }
  }

  if (otherPendingSubTx) {
    return res.status(400).json({
      error: "لديك طلب اشتراك معلق حالياً (فوري / محفظة إلكترونية). يجب إكمال الدفع أو إلغاء الطلب السابق أولاً قبل إنشاء طلب اشتراك جديد.",
      code: "PENDING_PAYMENT_EXISTS",
      pendingTx: otherPendingSubTx,
    });
  }

  // Validate electronic wallet number if provided
  if (walletNumber) {
    const cleanWallet = String(walletNumber)
      .trim()
      .replace(/[\s\-\(\)\.]/g, "");
    if (!/^01[0125][0-9]{8}$/.test(cleanWallet)) {
      return res.status(400).json({
        error:
          "رقم المحفظة الإلكترونية غير صحيح. يجب أن يتكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015.",
        code: "INVALID_WALLET_NUMBER",
      });
    }
  }

  const finalAmount = netAmount;

  const lockKey = `sub_${user._id}_${plan._id}_${billingPeriod}_${methodId || "default"}`;
  const responseData = await runWithPaymentLock(lockKey, async () => {
    // Re-check inside lock
    const txJustCreated = await PaymentTransaction.findOne({
      userId: user._id,
      referenceId: existingSub._id,
      orderType: "subscription",
      status: "pending",
      createdAt: { $gte: new Date(Date.now() - 3 * 60 * 1000) },
    }).sort({ createdAt: -1 });

    const isSameMethodInside =
      txJustCreated &&
      ((methodId && Number(txJustCreated.paymentMethodId) === Number(methodId)) ||
        (!methodId && !txJustCreated.paymentMethodId));

    if (
      txJustCreated &&
      isSameMethodInside &&
      (txJustCreated.checkoutUrl || txJustCreated.paymentData)
    ) {
      return {
        success: true,
        intentKey: txJustCreated.intentKey,
        checkoutUrl: txJustCreated.checkoutUrl || null,
        paymentData: txJustCreated.paymentData,
        walletReference: extractWalletReference(txJustCreated.paymentData, txJustCreated.fawaterakResponse),
        invoiceInfo: sanitizeFawaterakData(txJustCreated.fawaterakResponse),
        subscriptionId: existingSub._id,
        transactionId:
          txJustCreated.fawaterakResponse?.transaction_id ||
          txJustCreated.fawaterakResponse?.invoice_id ||
          txJustCreated.intentKey,
        orderNumber: null,
        amount: txJustCreated.amount,
      };
    }

    const urls = getRedirectionUrls(
      req,
      `?type=subscription&id=${existingSub._id}`,
    );
    let txData;
    try {
      txData = await fawaterak.createTransaction({
        amount: finalAmount,
        methodId: numericMethodId,
        walletNumber: walletNumber || null,
        customer: buildCustomer(user, { phone: walletNumber }),
        orderId: existingSub._id,
        orderType: "subscription",
        ...urls,
      });
    } catch (gatewayErr) {
      const missingGatewayConfig = gatewayErr.code === "FAWATERAK_CONFIG_MISSING";
      const errMsg =
        gatewayErr.message?.replace(/^Fawaterak:\s*/i, "") ||
        "تعذر بدء عملية الدفع حالياً. يرجى اختيار وسيلة دفع أخرى.";
      return {
        isError: true,
        error: errMsg,
        code: gatewayErr.code,
        status: missingGatewayConfig ? 503 : 400,
      };
    }

    // Skip a redundant getTransactionData round-trip: createTransaction already
    // returns the full payload we need. The extra call only adds latency (5-15 s
    // on staging) and risks a timeout on slow networks.
    const combinedFawaterak = { ...txData };

    const { fawaterakCreatedAt, fawaterakExpireDate } = extractFawaterakDates(
      combinedFawaterak,
      txData.payment_data,
      new Date().toISOString()
    );

    const subWalletRef = extractWalletReference(txData.payment_data, combinedFawaterak);

    const mergedPaymentData = {
      ...(txData.payment_data || {}),
      walletReference: subWalletRef,
      fawaterakCreatedAt,
      fawaterakExpireDate,
      expireDate: fawaterakExpireDate || txData.payment_data?.expireDate,
      expirationTime: fawaterakExpireDate || txData.payment_data?.expirationTime,
      targetPlanId: plan._id,
      targetBillingPeriod: billingPeriod,
      targetExpiresAt: expiresAt,
      saveCard: Boolean(saveCard !== false),
      referralRewardId: referralReward?.rewardId || null,
      referralRewardType: referralReward?.rewardType || null,
      referralDiscountPercent: referralDiscountPercent || 0,
      referralDiscountAmount: referralDiscountAmount || 0,
      originalPrice: price,
      upgradeDiscount,
      paymentPlusDaysUsed: ppDaysUsed,
      couponDiscountAmount: Math.max(0, discount - upgradeDiscount - referralDiscountAmount),
      couponCode: appliedCoupon?.code || couponCode || null,
      couponId: getCouponUsageId(appliedCoupon),
    };

    const methodName =
      Number(methodId) === 2
        ? "Visa / Mastercard"
        : Number(methodId) === 3
          ? "Fawry"
          : Number(methodId) === 4
            ? "Mobile Wallet"
            : "Online";

    const finalCheckoutUrl =
      txData.url ||
      txData.payment_data?.redirectTo ||
      txData.payment_data?.paymentUrl ||
      txData.payment_data?.url ||
      null;

    await PaymentTransaction.create({
      userId: user._id,
      referenceId: existingSub._id,
      orderType: "subscription",
      intentKey: txData.intent_key,
      amount: finalAmount,
      paymentMethodId: methodId || null,
      paymentMethodName: methodName,
      checkoutUrl: finalCheckoutUrl,
      paymentData: mergedPaymentData,
      fawaterakResponse: combinedFawaterak,
      fawaterakLogs: [
        {
          action: "create",
          data: combinedFawaterak,
        },
      ],
    });

    // Do not consume a coupon for a pending payment. Successful activation
    // records the immutable coupon id in activateSubscription.

    return {
      success: true,
      intentKey: txData.intent_key,
      checkoutUrl: finalCheckoutUrl,
      redirectTo: finalCheckoutUrl,
      paymentData: mergedPaymentData,
      walletReference: subWalletRef || extractWalletReference(mergedPaymentData, combinedFawaterak),
      invoiceInfo: sanitizeFawaterakData(combinedFawaterak),
      subscriptionId: existingSub._id,
      transactionId:
        txData.transaction_id || txData.invoice_id || txData.intent_key,
      orderNumber: null,
      amount: finalAmount,
      fawaterakCreatedAt,
      fawaterakExpireDate,
      lockedMethodId: methodId || null,
      lockedMethodName: methodName,
    };
  });

  if (responseData?.isError) {
    return res.status(responseData.status || 400).json({
      error: responseData.error,
      ...(responseData.code ? { code: responseData.code } : {}),
    });
  }

  res.json(responseData);
});

// ── POST /api/payment/order/:orderId ─────────────────────────────────────────
// Initiates payment for an existing COD order that the user wants to pay online
// OR creates a new order with online payment

export const createOrderPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { methodId, walletNumber } = req.body;
  const user = req.user;

  const userPhone = await ensureUserPhone(user, req);
  if (!userPhone) {
    return res.status(400).json({ error: "يجب إضافة رقم هاتف لحسابك من صفحة الملف الشخصي أولاً لإتمام الطلب." });
  }

  // Validate that selected payment method is active in platform configuration
  const orderPaymentConfig = await getPaymentConfig();
  if (methodId != null) {
    const foundMethod = orderPaymentConfig.methods.find(
      (m) =>
        (m.payment_method_id != null && Number(m.payment_method_id) === Number(methodId)) ||
        m.id === String(methodId)
    );
    if (foundMethod && !foundMethod.enabled) {
      return res.status(400).json({
        error: `طريقة الدفع '${foundMethod.name_ar || foundMethod.name_en}' غير مفعلة حالياً في المنصة.`,
        code: "PAYMENT_METHOD_DISABLED",
      });
    }
  }

  let order = await Order.findById(orderId);
  let draft = null;
  if (order && (!order.userId || !order.userId.equals(user._id))) {
    return res.status(403).json({ error: "غير مصرح لك بسداد هذا الطلب" });
  }
  if (order?.paymentStatus === "paid") {
    return res.status(400).json({ error: "Order already paid" });
  }
  if (!order) {
    draft = await OrderDraft.findOne({
      _id: orderId,
      userId: user._id,
      expiresAt: { $gt: new Date() },
    });
    if (!draft)
      return res.status(404).json({ error: "Checkout draft not found" });
  }
  const checkout = order || draft;

  // 100% Free Order: Complete immediately without payment gateway
  if (checkout.totalAmount <= 0) {
    if (order) {
      order.paymentStatus = "paid";
      order.status = "received";
      order.paymentMethod = "free";
      order.paymentMethodName = "مجاني / Free";
      await order.save();
    }
    return res.json({
      success: true,
      isFree: true,
      message: "تم تأكيد طلبك المجاني بنجاح.",
      orderId: checkout._id,
      amount: 0,
    });
  }

  // Automatically cancel any uncompleted card transactions (cards finish or terminate - no pending/resuming)
  if (user) {
    await PaymentTransaction.updateMany(
      {
        userId: user._id,
        status: "pending",
        $or: [
          { paymentMethodId: 2 },
          { paymentMethodName: { $regex: /visa|mastercard|card|فيزا|ماستر|بطاقة/i } },
        ],
      },
      { $set: { status: "cancelled" } }
    );
  }

  // 1. Idempotency Check: Return existing pending transaction if user double-clicks or retries within 3 minutes (offline methods only: Fawry / Wallets)
  let recentOrderTx = await PaymentTransaction.findOne({
    userId: user._id,
    referenceId: checkout._id,
    orderType: "store",
    status: "pending",
    $or: [
      { paymentMethodId: { $in: [3, 4] } },
      { paymentMethodName: { $regex: /fawry|فوري|wallet|meeza|محفظ|كاش/i } },
      { "paymentData.fawryCode": { $exists: true, $ne: null } },
      { "paymentData.mobileWalletNumber": { $exists: true, $ne: null } },
      { "paymentData.customerMobile": { $exists: true, $ne: null } },
    ],
    createdAt: { $gte: new Date(Date.now() - 3 * 60 * 1000) },
  }).sort({ createdAt: -1 });

  if (recentOrderTx) {
    const expInfo = checkIfTransactionExpired(recentOrderTx);
    if (expInfo.isExpired) {
      recentOrderTx.status = "expired";
      recentOrderTx.fawaterakLogs.push({ action: "auto_expired", note: "Expired before new order initiate" });
      await recentOrderTx.save();
      recentOrderTx = null;
    }
  }

  const isSameOrderMethod =
    recentOrderTx &&
    ((methodId && Number(recentOrderTx.paymentMethodId) === Number(methodId)) ||
      (!methodId && !recentOrderTx.paymentMethodId));

  if (
    recentOrderTx &&
    isSameOrderMethod &&
    (recentOrderTx.checkoutUrl || recentOrderTx.paymentData)
  ) {
    const { fawaterakCreatedAt, fawaterakExpireDate } = extractFawaterakDates(
      recentOrderTx.fawaterakResponse,
      recentOrderTx.paymentData,
      recentOrderTx.createdAt
    );

    return res.json({
      success: true,
      intentKey: recentOrderTx.intentKey,
      checkoutUrl: recentOrderTx.checkoutUrl || null,
      paymentData: recentOrderTx.paymentData,
      walletReference: extractWalletReference(recentOrderTx.paymentData, recentOrderTx.fawaterakResponse),
      invoiceInfo: sanitizeFawaterakData(recentOrderTx.fawaterakResponse),
      orderId: checkout._id,
      orderNumber: order?.orderNumber || draft?.orderNumber || null,
      transactionId:
        recentOrderTx.fawaterakResponse?.transaction_id ||
        recentOrderTx.fawaterakResponse?.invoice_id ||
        recentOrderTx.intentKey,
      amount: checkout.totalAmount,
      fawaterakCreatedAt,
      fawaterakExpireDate,
      lockedMethodId: recentOrderTx.paymentMethodId,
      lockedMethodName: recentOrderTx.paymentMethodName,
    });
  }

  // ANTI-TAMPERING & STRICT METHOD LOCKING:
  // If user has an active pending transaction for this order and attempts to send a different method:
  if (recentOrderTx && !isSameOrderMethod) {
    return res.status(400).json({
      success: false,
      code: "PAYMENT_METHOD_LOCKED",
      error: `عملية الدفع هذه قيد الانتظار ومقيدة بوسيلة الدفع المحددة مسبقاً (${recentOrderTx.paymentMethodName || "المحددة"}). لا يمكن استكمال الدفع بطريقة أخرى. يرجى إتمام العملية بنفس الطريقة أو إلغاء الطلب المعلق أولاً.`,
      lockedMethodId: recentOrderTx.paymentMethodId,
      lockedMethodName: recentOrderTx.paymentMethodName,
      intentKey: recentOrderTx.intentKey,
    });
  }

  if (user) {
    // Automatically cancel any uncompleted card transactions (cards finish or terminate - no pending/resuming)
    await PaymentTransaction.updateMany(
      {
        userId: user._id,
        status: "pending",
        $or: [
          { paymentMethodId: 2 },
          { paymentMethodName: { $regex: /visa|mastercard|card|فيزا|ماستر|بطاقة/i } },
        ],
      },
      { $set: { status: "cancelled" } }
    );


  }

  if (walletNumber) {
    const cleanWallet = String(walletNumber)
      .trim()
      .replace(/[\s\-\(\)\.]/g, "");
    if (!/^01[0125][0-9]{8}$/.test(cleanWallet)) {
      return res.status(400).json({
        error:
          "رقم المحفظة الإلكترونية غير صحيح. يجب أن يتكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015.",
        code: "INVALID_WALLET_NUMBER",
      });
    }
  }

  const customer = {
    firstName: (checkout.customer.name || "").split(" ")[0] || "User",
    lastName:
      (checkout.customer.name || "").split(" ").slice(1).join(" ") || ".",
    email: checkout.customer.email || user?.email || "",
    phone: checkout.customer.phone || walletNumber || user?.phone || "",
    address: checkout.customer.address || "",
    userId: checkout.userId,
  };

  const lockKey = `order_${user._id}_${checkout._id}_${methodId || "default"}`;
  const responseData = await runWithPaymentLock(lockKey, async () => {
    // Re-check inside mutex in case a concurrent request just finished
    const txJustCreated = await PaymentTransaction.findOne({
      userId: user._id,
      referenceId: checkout._id,
      orderType: "store",
      status: "pending",
      createdAt: { $gte: new Date(Date.now() - 3 * 60 * 1000) },
    }).sort({ createdAt: -1 });

    const isSameMethodInside =
      txJustCreated &&
      ((methodId && Number(txJustCreated.paymentMethodId) === Number(methodId)) ||
        (!methodId && !txJustCreated.paymentMethodId));

    if (
      txJustCreated &&
      isSameMethodInside &&
      (txJustCreated.checkoutUrl || txJustCreated.paymentData)
    ) {
      return {
        success: true,
        intentKey: txJustCreated.intentKey,
        checkoutUrl: txJustCreated.checkoutUrl || null,
        paymentData: txJustCreated.paymentData,
        walletReference: extractWalletReference(txJustCreated.paymentData, txJustCreated.fawaterakResponse),
        invoiceInfo: sanitizeFawaterakData(txJustCreated.fawaterakResponse),
        orderId: checkout._id,
        orderNumber: order?.orderNumber || draft?.orderNumber || null,
        transactionId:
          txJustCreated.fawaterakResponse?.transaction_id ||
          txJustCreated.fawaterakResponse?.invoice_id ||
          txJustCreated.intentKey,
        amount: checkout.totalAmount,
      };
    }

    const urls = getRedirectionUrls(req, `?type=order&id=${checkout._id}`);
    let txData;
    try {
      txData = await fawaterak.createTransaction({
        amount: checkout.totalAmount,
        methodId: methodId || null,
        walletNumber: walletNumber || null,
        customer,
        orderId: checkout._id,
        orderType: "store",
        ...urls,
      });
    } catch (gatewayErr) {
      const errMsg =
        gatewayErr.message?.replace(/^Fawaterak:\s*/i, "") ||
        "تعذر بدء عملية الدفع حالياً. يرجى اختيار وسيلة دفع أخرى.";
      return { isError: true, error: errMsg, status: 400 };
    }

    if (order) {
      order.intentKey = txData.intent_key;
      order.paymentMethod = "online";
      await order.save();
    }

    // Skip a redundant getTransactionData round-trip: createTransaction already
    // returns the full payload we need. The extra call only adds latency (5-15 s
    // on staging) and risks a timeout on slow networks.
    const combinedOrderFawaterak = { ...txData };

    const { fawaterakCreatedAt, fawaterakExpireDate } = extractFawaterakDates(
      combinedOrderFawaterak,
      txData.payment_data,
      new Date().toISOString()
    );

    const orderWalletRef = extractWalletReference(txData.payment_data, combinedOrderFawaterak);

    const mergedOrderPaymentData = {
      ...(txData.payment_data || {}),
      walletReference: orderWalletRef,
      fawaterakCreatedAt,
      fawaterakExpireDate,
      expireDate: fawaterakExpireDate || txData.payment_data?.expireDate,
      expirationTime: fawaterakExpireDate || txData.payment_data?.expirationTime,
      ...(draft ? { checkoutDraftId: String(draft._id) } : {}),
    };

    const orderMethodName =
      Number(methodId) === 2
        ? "Visa / Mastercard"
        : Number(methodId) === 3
          ? "Fawry"
          : Number(methodId) === 4
            ? "Mobile Wallet"
            : "Online";

    const finalCheckoutUrl =
      txData.url ||
      txData.payment_data?.redirectTo ||
      txData.payment_data?.paymentUrl ||
      txData.payment_data?.url ||
      null;

    await PaymentTransaction.create({
      userId: user._id,
      referenceId: checkout._id,
      orderType: "store",
      intentKey: txData.intent_key,
      amount: checkout.totalAmount,
      paymentMethodId: methodId || null,
      paymentMethodName: orderMethodName,
      checkoutUrl: finalCheckoutUrl,
      paymentData: mergedOrderPaymentData,
      fawaterakResponse: combinedOrderFawaterak,
      fawaterakLogs: [
        {
          action: "create",
          data: combinedOrderFawaterak,
        },
      ],
    });

    return {
      success: true,
      intentKey: txData.intent_key,
      checkoutUrl: finalCheckoutUrl,
      redirectTo: finalCheckoutUrl,
      paymentData: mergedOrderPaymentData,
      walletReference: orderWalletRef || extractWalletReference(mergedOrderPaymentData, combinedOrderFawaterak),
      invoiceInfo: sanitizeFawaterakData(combinedOrderFawaterak),
      orderId: checkout._id,
      orderNumber: order?.orderNumber || draft?.orderNumber || null,
      transactionId:
        txData.transaction_id || txData.invoice_id || txData.intent_key,
      amount: checkout.totalAmount,
      fawaterakCreatedAt,
      fawaterakExpireDate,
      lockedMethodId: methodId || null,
      lockedMethodName: orderMethodName,
    };
  });

  if (responseData?.isError) {
    return res.status(responseData.status || 400).json({ error: responseData.error });
  }

  res.json(responseData);
});

// ── POST /api/payment/verify ──────────────────────────────────────────────────
// Body: { intentKey }
// Called by frontend after redirect from Fawaterak to confirm payment status

export const verifyPayment = asyncHandler(async (req, res) => {
  const { intentKey, invoice_id, invoiceId, referenceId } = req.body || {};

  let effectiveIntentKey = intentKey;
  if (
    effectiveIntentKey === "undefined" ||
    effectiveIntentKey === "null" ||
    !effectiveIntentKey
  ) {
    effectiveIntentKey = null;
  }
  const cleanInvoiceId = invoice_id || invoiceId;
  let pTx = null;

  if (effectiveIntentKey && mongoose.Types.ObjectId.isValid(effectiveIntentKey)) {
    pTx = await PaymentTransaction.findOne({
      $or: [
        { _id: effectiveIntentKey },
        { referenceId: effectiveIntentKey },
        { "paymentData.checkoutDraftId": String(effectiveIntentKey) },
      ],
    }).sort({ createdAt: -1 });
    if (pTx?.intentKey) effectiveIntentKey = pTx.intentKey;
  }

  if (!pTx && effectiveIntentKey) {
    pTx = await PaymentTransaction.findOne({ intentKey: effectiveIntentKey }).sort({
      createdAt: -1,
    });
  }

  if (!pTx && cleanInvoiceId) {
    pTx = await PaymentTransaction.findOne({
      $or: [
        { "fawaterakResponse.invoice_id": Number(cleanInvoiceId) || cleanInvoiceId },
        { "fawaterakResponse.transaction_id": Number(cleanInvoiceId) || cleanInvoiceId },
        { "paymentData.referenceNumber": String(cleanInvoiceId) },
        { "paymentData.fawryCode": String(cleanInvoiceId) },
        { transactionId: String(cleanInvoiceId) },
      ],
    }).sort({ createdAt: -1 });
    if (pTx?.intentKey) effectiveIntentKey = pTx.intentKey;
  }

  if (!pTx && referenceId && mongoose.Types.ObjectId.isValid(referenceId)) {
    pTx = await PaymentTransaction.findOne({ referenceId }).sort({ createdAt: -1 });
    if (pTx?.intentKey) effectiveIntentKey = pTx.intentKey;
  }

  // Fallback: if transaction wasn't located by parameter, check user's latest transaction
  if (!pTx && req.user) {
    pTx = await PaymentTransaction.findOne({
      userId: req.user._id,
      status: "pending",
    }).sort({ createdAt: -1 });
    if (!pTx) {
      pTx = await PaymentTransaction.findOne({ userId: req.user._id }).sort({
        createdAt: -1,
      });
    }
    if (pTx?.intentKey) effectiveIntentKey = pTx.intentKey;
  }

  if (!pTx) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  // Authorize User (Ownership Check)
  if (pTx.userId && pTx.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "Unauthorized access to this payment" });
  }

  // If already verified and marked as paid in our database
  if (pTx.status === "paid") {
    const orderType = pTx.orderType;
    if (orderType === "subscription") {
      const subscription = await Subscription.findById(pTx.referenceId);
      const state = subscription
        ? await getSubscriptionState(subscription.userId)
        : null;
      return res.json({
        success: true,
        status: "paid",
        type: "subscription",
        state,
        intentKey: pTx.intentKey,
        transactionId:
          pTx.fawaterakResponse?.transaction_id ||
          pTx.fawaterakResponse?.invoice_id ||
          pTx.intentKey,
        amount: pTx.amount,
        paymentMethodName: pTx.paymentMethodName,
      });
    } else if (orderType === "store") {
      const order =
        (await Order.findOne({ paymentTransactionId: pTx._id })) ||
        (await Order.findOne({ intentKey: pTx.intentKey }));
      return res.json({
        success: true,
        status: "paid",
        type: "store",
        orderId: order?._id,
        orderNumber: order?.orderNumber,
        intentKey: pTx.intentKey,
        transactionId:
          pTx.fawaterakResponse?.transaction_id ||
          pTx.fawaterakResponse?.invoice_id ||
          pTx.intentKey,
        amount: pTx.amount,
        paymentMethodName: pTx.paymentMethodName,
      });
    }
  }

  // Live status verification directly with Fawaterak API (Server-to-Server)
  let txData;
  try {
    const lookupKey = pTx.intentKey || cleanInvoiceId;
    txData = await fawaterak.getTransactionData(lookupKey);
  } catch (err) {
    return res.json({
      success: false,
      status: "pending",
      message: err.message || "Payment is still processing",
    });
  }

  const isPaid = txData && (txData.paid === 1 || txData.paid === "1" || txData.status_text === "paid");

  if (!isPaid) {
    const isCardTx =
      pTx.paymentMethodId === 2 ||
      (pTx.paymentMethodName &&
        /visa|mastercard|card|فيزا|ماستر|بطاقة/i.test(pTx.paymentMethodName)) ||
      (txData.payment_method &&
        /visa|mastercard|card|فيزا|ماستر|بطاقة/i.test(txData.payment_method));

    const isExplicitlyFailed =
      txData.status_text === "failed" ||
      txData.status_text === "canceled" ||
      txData.status_text === "cancelled";

    if (isExplicitlyFailed) {
      pTx.status = "failed";
      pTx.paymentMethodName = txData.payment_method || pTx.paymentMethodName;
      pTx.fawaterakResponse = txData;
      await pTx.save();

      return res.json({
        success: false,
        status: "failed",
        isCard: isCardTx,
        message: "لم تكتمل عملية الدفع أو تم إلغاؤها.",
      });
    }

    // If not paid, update status safely (Fawry / Wallets)
    if (pTx.status !== "paid" && pTx.status !== "suspicious_amount") {
      pTx.status =
        txData.status_text === "failed" || txData.status_text === "expired"
          ? "failed"
          : "pending";
      pTx.paymentMethodName = txData.payment_method;
      pTx.fawaterakResponse = txData;

      const lastLog = pTx.fawaterakLogs[pTx.fawaterakLogs.length - 1];
      if (
        !lastLog ||
        lastLog.action !== "verify" ||
        lastLog.data?.status_text !== txData.status_text
      ) {
        pTx.fawaterakLogs.push({ action: "verify", data: txData });
      }

      await pTx.save();
    }

    // Check if the payment method session has expired (e.g. 5 minutes for mobile wallets, or Fawry deadline)
    const expInfo = checkIfTransactionExpired(pTx);
    if (expInfo.isExpired || txData.status_text === "expired" || txData.status_text === "failed") {
      pTx.status = "expired";
      pTx.fawaterakLogs.push({ action: "auto_expired", note: "Expired during verification" });
      await pTx.save();

      return res.json({
        success: false,
        status: "expired",
        isExpired: true,
        message: "انتهت مهلة صلاحية وسيلة الدفع (انتهت مهلة السداد المحددة). لم يعد بالإمكان استخدام بيانات الدفع.",
        fawaterakCreatedAt: expInfo.createdAt,
        fawaterakExpireDate: expInfo.expireDate,
        amount: pTx.amount,
        intentKey: pTx.intentKey,
        // ZERO OUT payment details so no QR, Fawry code, or wallet number is exposed:
        paymentData: null,
        fawaterakResponse: null,
      });
    }

    const { fawaterakCreatedAt, fawaterakExpireDate } = extractFawaterakDates(
      txData,
      pTx.paymentData,
      pTx.createdAt,
      pTx
    );

    return res.json({
      success: false,
      status: txData.status_text || "pending",
      message: "Payment not confirmed yet",
      fawaterakCreatedAt,
      fawaterakExpireDate,
      lockedMethodId: pTx.paymentMethodId,
      lockedMethodName: pTx.paymentMethodName,
      amount: pTx.amount,
      intentKey: pTx.intentKey,
      fawaterakResponse: txData,
      paymentData: pTx.paymentData,
    });
  }

  // Payment is confirmed by Fawaterak! Process it securely via our robust helper
  const processResult = await processVerifiedPayment(pTx, txData);
  
  if (!processResult.success && processResult.error === "amount_mismatch") {
    return res.status(400).json({
      success: false,
      status: "failed",
      message: "Payment amount does not match expected amount. Please contact support.",
    });
  }

  // Resolve what this intentKey belongs to for UI updates
  const orderType = txData.pay_load?.order_type || pTx.orderType;

  if (orderType === "subscription") {
    const subscription = await Subscription.findById(pTx.referenceId);
    const state = subscription
      ? await getSubscriptionState(subscription.userId)
      : null;
    return res.json({
      success: true,
      status: "paid",
      type: "subscription",
      state,
      intentKey: effectiveIntentKey,
      transactionId:
        txData.transaction_id || txData.invoice_id || effectiveIntentKey,
      amount: txData.amount || txData.invoice_amount || pTx.amount,
      paymentMethodName: txData.payment_method || pTx.paymentMethodName,
    });
  }

  if (orderType === "store") {
    const order = await Order.findOne({ paymentTransactionId: pTx._id }) || await Order.findOne({ intentKey: pTx.intentKey });
    return res.json({
      success: true,
      status: "paid",
      type: "store",
      orderId: order?._id,
      orderNumber: order?.orderNumber,
      intentKey: effectiveIntentKey,
      transactionId:
        txData.transaction_id || txData.invoice_id || effectiveIntentKey,
      amount: txData.amount || txData.invoice_amount || pTx.amount,
      paymentMethodName: txData.payment_method || pTx.paymentMethodName,
    });
  }

  res.json({ success: true, status: "paid", type: "unknown" });
});

// ── Fawaterak Signature Verification Helper ─────────────────────────────────
function verifyFawaterakSignature(body) {
  const secretKey = env.FAWATERAK_API_KEY;
  if (!secretKey) {
    // Only permit unverified webhooks in local development/test if no key is configured
    return env.NODE_ENV !== "production";
  }

  if (!body?.hashKey) {
    return false;
  }

  let paramString = "";
  if (body.invoice_id && body.invoice_key) {
    // 1. Paid webhook signature format
    paramString = `InvoiceId=${body.invoice_id}&InvoiceKey=${body.invoice_key}&PaymentMethod=${body.payment_method || ""}`;
  } else if (body.referenceId && body.status) {
    // 2. Expired / Cancelled webhook signature format
    paramString = `referenceId=${body.referenceId}&status=${body.status}&paymentMethod=${body.paymentMethod || ""}`;
  }

  if (!paramString) return false;

  try {
    const expectedHash = crypto
      .createHmac("sha256", secretKey)
      .update(paramString)
      .digest("hex");
    const bufA = Buffer.from(expectedHash.toLowerCase(), "utf8");
    const bufB = Buffer.from(String(body.hashKey).toLowerCase(), "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

// ── POST /api/payment/webhook ─────────────────────────────────────────────────
// Fawaterak calls this URL for ALL transaction events (paid, expired, cancelled, failed, refunded)
export const handleWebhook = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const query = req.query || {};

  await AuditLog.create({
    message: "fawaterak_webhook_received",
    category: "payments_subscriptions",
    level: "info",
    isExternal: true,
    details: { payload: body, query },
  }).catch(() => {});

  // Signature check: Reject unsigned or spoofed webhooks immediately
  const isSignatureValid = verifyFawaterakSignature(body);
  if (!isSignatureValid) {
    await AuditLog.create({
      message: "fawaterak_webhook_invalid_signature_rejected",
      category: "payments_subscriptions",
      level: "warn",
      details: { body },
    }).catch(() => {});
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  // Handle Tokenization Webhook (Card Saved)
  if (body.customerCardToken || body.cardTokenUniqueId || body.cardToken) {
    const customerUniqueId =
      body.customerUniqueId ||
      body.customer_unique_id ||
      query.customerUniqueId ||
      body.customer?.customer_unique_id;
    const cardToken = body.customerCardToken || body.cardToken;
    const cardBrand = body.cardBrand || "CARD";
    const customerCard = body.customerCard || "";
    const cardTokenUniqueId = body.cardTokenUniqueId || "";

    if (customerUniqueId && cardToken) {
      await User.findByIdAndUpdate(customerUniqueId, {
        savedCard: {
          cardToken,
          cardTokenUniqueId,
          cardBrand,
          customerCard,
          savedAt: new Date(),
        },
      });

      await Subscription.findOneAndUpdate(
        { userId: customerUniqueId, status: { $in: ["active", "pending", "trialing"] } },
        {
          autoRenew: true,
          savedCard: {
            cardToken,
            cardTokenUniqueId,
            cardBrand,
            customerCard,
            savedAt: new Date(),
          },
        },
        { sort: { createdAt: -1 } }
      );
    }

    return res.json({ success: true, message: "Tokenization webhook processed successfully" });
  }

  // 1. Extract all potential identifiers from body / query / payload
  let intentKey =
    body.invoice_key ||
    body.intent_key ||
    body.data?.intent_key ||
    body.data?.invoice_key ||
    body.intentKey ||
    query.intent_key ||
    query.intentKey ||
    query.invoice_key ||
    null;

  const invoiceId =
    body.invoice_id ||
    body.data?.invoice_id ||
    body.invoiceId ||
    query.invoice_id ||
    null;

  const referenceId =
    body.referenceId ||
    body.referenceNumber ||
    body.transactionId ||
    body.data?.referenceId ||
    body.data?.referenceNumber ||
    null;

  let payloadOrderId = null;
  if (body.pay_load) {
    try {
      const parsed = typeof body.pay_load === "string" ? JSON.parse(body.pay_load) : body.pay_load;
      payloadOrderId = parsed?.order_id || parsed?.orderId || parsed?.merchant_reference || null;
    } catch {}
  }

  // 2. Find transaction in our database
  let pTx = null;
  if (intentKey) {
    pTx = await PaymentTransaction.findOne({ intentKey }).sort({ createdAt: -1 });
  }
  if (!pTx && invoiceId) {
    pTx = await PaymentTransaction.findOne({
      $or: [
        { "fawaterakResponse.invoice_id": Number(invoiceId) || invoiceId },
        { "fawaterakResponse.transaction_id": Number(invoiceId) || invoiceId },
        { "paymentData.referenceNumber": String(invoiceId) },
        { "paymentData.fawryCode": String(invoiceId) },
        { transactionId: String(invoiceId) },
      ],
    }).sort({ createdAt: -1 });
    if (pTx) intentKey = pTx.intentKey;
  }
  if (!pTx && referenceId) {
    pTx = await PaymentTransaction.findOne({
      $or: [
        { "fawaterakResponse.invoice_id": Number(referenceId) || referenceId },
        { "fawaterakResponse.transaction_id": Number(referenceId) || referenceId },
        { "paymentData.referenceNumber": String(referenceId) },
        { "paymentData.fawryCode": String(referenceId) },
        { "paymentData.walletReference": String(referenceId) },
        { transactionId: String(referenceId) },
      ],
    }).sort({ createdAt: -1 });
    if (pTx) intentKey = pTx.intentKey;
  }
  if (!pTx && payloadOrderId) {
    pTx = await PaymentTransaction.findOne({
      $or: [
        { referenceId: payloadOrderId },
        { intentKey: payloadOrderId },
      ],
    }).sort({ createdAt: -1 });
    if (pTx) intentKey = pTx.intentKey;
  }

  if (!pTx) {
    return res.status(200).json({ received: true, status: "transaction_not_found" });
  }

  // 3. Normalize status from webhook payload
  const rawStatus = String(
    body.status ||
    body.invoice_status ||
    body.status_text ||
    body.data?.status ||
    ""
  ).toLowerCase().trim();

  const isPaidEvent =
    rawStatus === "paid" ||
    body.paid === 1 ||
    body.paid === "1" ||
    body.status === "PAID";

  const isExpiredEvent =
    rawStatus === "expired" ||
    body.status === "EXPIRED";

  const isCancelledEvent =
    rawStatus === "cancelled" ||
    rawStatus === "canceled" ||
    body.status === "CANCELLED" ||
    body.status === "CANCELED";

  const isFailedEvent =
    rawStatus === "failed" ||
    Boolean(body.errorMessage) ||
    body.response?.gatewayCode === "DECLINED";

  const isRefundEvent =
    rawStatus === "approved" ||
    rawStatus === "refunded" ||
    body.status === "approved";

  // 4. Fetch authoritative transaction data from Fawaterak server if intentKey is available
  let authoritativeData = null;
  if (pTx.intentKey) {
    try {
      authoritativeData = await fawaterak.getTransactionData(pTx.intentKey);
    } catch (e) {}
  }

  const combinedData = { ...body, ...(authoritativeData || {}) };
  const authPaid = combinedData.paid === 1 || combinedData.paid === "1" || combinedData.status_text === "paid";

  // ── Handling Paid Transactions (Requires Authoritative Server Confirmation or Verified Signature) ────
  const isPaidVerified = authPaid || (isSignatureValid && isPaidEvent);
  if (isPaidVerified) {
    const processResult = await processVerifiedPayment(pTx, combinedData);
    return res.status(200).json({
      received: true,
      status: "paid",
      success: processResult.success,
      alreadyProcessed: processResult.alreadyProcessed,
    });
  }

  // ── Handling Expired Transactions ─────────────────────────────────────────
  if (isExpiredEvent || combinedData.status_text === "expired") {
    if (pTx.status !== "paid") {
      pTx.status = "expired";
      pTx.fawaterakLogs.push({ action: "webhook_expired", date: new Date(), data: body });
      await pTx.save();

      if (pTx.orderType === "store") {
        const ord =
          (await Order.findOne({ intentKey: pTx.intentKey })) ||
          (await Order.findById(pTx.referenceId));
        if (ord && ord.paymentStatus === "pending") {
          ord.paymentStatus = "expired";
          await ord.save();
        }
        await OrderDraft.deleteOne({ _id: pTx.referenceId });
      } else if (pTx.orderType === "subscription") {
        const sub =
          (await Subscription.findOne({ intentKey: pTx.intentKey })) ||
          (await Subscription.findById(pTx.referenceId));
        if (sub && sub.status === "pending") {
          sub.status = "expired";
          await sub.save();
        }
      }
    }
    return res.status(200).json({ received: true, status: "expired" });
  }

  // ── Handling Cancelled Transactions ───────────────────────────────────────
  if (isCancelledEvent || combinedData.status_text === "cancelled") {
    if (pTx.status !== "paid") {
      pTx.status = "cancelled";
      pTx.fawaterakLogs.push({ action: "webhook_cancelled", date: new Date(), data: body });
      await pTx.save();

      if (pTx.orderType === "store") {
        const ord =
          (await Order.findOne({ intentKey: pTx.intentKey })) ||
          (await Order.findById(pTx.referenceId));
        if (ord && ord.paymentStatus === "pending") {
          ord.paymentStatus = "cancelled";
          await ord.save();
        }
        await OrderDraft.deleteOne({ _id: pTx.referenceId });
      } else if (pTx.orderType === "subscription") {
        const sub =
          (await Subscription.findOne({ intentKey: pTx.intentKey })) ||
          (await Subscription.findById(pTx.referenceId));
        if (sub && sub.status === "pending") {
          sub.status = "cancelled";
          await sub.save();
        }
      }
    }
    return res.status(200).json({ received: true, status: "cancelled" });
  }

  // ── Handling Failed Transactions ──────────────────────────────────────────
  if (isFailedEvent || combinedData.status_text === "failed") {
    if (pTx.status !== "paid") {
      pTx.status = "failed";
      pTx.fawaterakLogs.push({
        action: "webhook_failed",
        date: new Date(),
        data: body,
        error: body.errorMessage,
      });
      await pTx.save();

      if (pTx.orderType === "store") {
        const ord =
          (await Order.findOne({ intentKey: pTx.intentKey })) ||
          (await Order.findById(pTx.referenceId));
        if (ord && ord.paymentStatus === "pending") {
          ord.paymentStatus = "failed";
          await ord.save();
        }
        await OrderDraft.deleteOne({ _id: pTx.referenceId });
      } else if (pTx.orderType === "subscription") {
        const sub =
          (await Subscription.findOne({ intentKey: pTx.intentKey })) ||
          (await Subscription.findById(pTx.referenceId));
        if (sub && sub.status === "pending") {
          sub.status = "failed";
          await sub.save();
        }
      }
    }
    return res.status(200).json({ received: true, status: "failed" });
  }

  // ── Handling Refunded Transactions ────────────────────────────────────────
  if (isRefundEvent) {
    pTx.status = "refunded";
    pTx.fawaterakLogs.push({ action: "webhook_refunded", date: new Date(), data: body });
    await pTx.save();

    if (pTx.orderType === "store") {
      const ord =
        (await Order.findOne({ intentKey: pTx.intentKey })) ||
        (await Order.findById(pTx.referenceId));
      if (ord) {
        ord.paymentStatus = "refunded";
        ord.status = "cancelled";
        await ord.save();
      }
    } else if (pTx.orderType === "subscription") {
      const sub =
        (await Subscription.findOne({ intentKey: pTx.intentKey })) ||
        (await Subscription.findById(pTx.referenceId));
      if (sub) {
        sub.status = "cancelled";
        await sub.save();
      }
    }
    return res.status(200).json({ received: true, status: "refunded" });
  }

  return res.status(200).json({ received: true, status: "processed" });
});

// ── GET /api/payment/pending ──────────────────────────────────────────────────
// Returns the user's pending payments (unpaid subscriptions or online orders)

export const getPendingPayments = asyncHandler(async (req, res) => {
  const user = req.user;

  // 1. Immediately terminate and cancel ANY pending card transactions for this user.
  // Card payments are instant (either paid or failed/cancelled - no pending/resuming).
  await PaymentTransaction.updateMany(
    {
      userId: user._id,
      status: "pending",
      $or: [
        { paymentMethodId: 2 },
        { paymentMethodName: { $regex: /visa|mastercard|card|فيزا|ماستر|بطاقة/i } },
      ],
    },
    { $set: { status: "cancelled" } }
  );

  // 2. Only Fawry (methodId: 3) and Mobile Wallets (methodId: 4 or Meeza/Wallets) can have pending status
  const pendingTransactions = await PaymentTransaction.find({
    userId: user._id,
    status: "pending",
    $or: [
      { paymentMethodId: { $in: [3, 4] } },
      { paymentMethodName: { $regex: /fawry|فوري|wallet|meeza|محفظ|كاش/i } },
      { "paymentData.fawryCode": { $exists: true, $ne: null } },
      { "paymentData.mobileWalletNumber": { $exists: true, $ne: null } },
      { "paymentData.customerMobile": { $exists: true, $ne: null } },
    ],
  }).sort({ createdAt: -1 });

  const subscriptions = [];
  const orders = [];

  for (const tx of pendingTransactions) {
    // Card payments (Visa / Mastercard) are instant and do not support offline "resuming"
    const isCardTx =
      tx.paymentMethodId === 2 ||
      (tx.paymentMethodName &&
        /visa|mastercard|card|فيزا|ماستر|بطاقة/i.test(tx.paymentMethodName));

    if (isCardTx) {
      continue;
    }

    // Check if payment session has expired (e.g. 5 minutes for mobile wallet or fawry expiration)
    const initialExp = checkIfTransactionExpired(tx);
    if (initialExp.isExpired) {
      tx.status = "expired";
      tx.fawaterakLogs.push({ action: "auto_expired", note: "Expired during pending fetch" });
      await tx.save();

      if (tx.orderType === "store") {
        const ord = await Order.findOne({ intentKey: tx.intentKey });
        if (ord && ord.paymentStatus === "pending") {
          ord.paymentStatus = "failed";
          await ord.save();
        }
        await OrderDraft.deleteOne({ _id: tx.referenceId });
      }
      continue;
    }

    let isActivePending = true;

    // Check with Fawaterak to get the live status with a safe timeout and polling throttle
    const lastCheck = tx.paymentData?.lastLiveCheckAt ? new Date(tx.paymentData.lastLiveCheckAt).getTime() : 0;
    const shouldCheckLive = Date.now() - lastCheck > 6000;

    if (shouldCheckLive) {
      let timeoutTimer = null;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutTimer = setTimeout(
            () => reject(new Error("Fawaterak lookup timed out")),
            12000,
          );
        });

        const liveData = await Promise.race([
          fawaterak.getTransactionData(tx.intentKey).finally(() => {
            if (timeoutTimer) clearTimeout(timeoutTimer);
          }),
          timeoutPromise,
        ]);

        tx.paymentData = { ...(tx.paymentData || {}), lastLiveCheckAt: new Date() };

        const isPaid = liveData?.paid === 1 || liveData?.status_text === "paid";
        const isFailed =
          liveData?.status_text === "failed" ||
          liveData?.status_text === "expired" ||
          liveData?.status_text === "cancelled";

        if (isPaid || isFailed) {
          if (isPaid) {
            // Process the webhook securely
            const processResult = await processVerifiedPayment(tx, liveData);
            if (processResult.success) {
              isActivePending = false;
            } else {
              // Mismatch or other error, mark failed instead of paid
              tx.status = "failed";
              await tx.save();
              isActivePending = false;
            }
          } else if (isFailed) {
            tx.status = "expired";
            tx.paymentMethodName = liveData.payment_method;
            tx.fawaterakResponse = liveData;
            tx.fawaterakLogs.push({ action: "poll_failed_or_expired", data: liveData });
            await tx.save();

            isActivePending = false;

            if (tx.orderType === "store") {
              const ord = await Order.findOne({ intentKey: tx.intentKey });
              if (ord && ord.paymentStatus === "pending") {
                ord.paymentStatus = "failed";
                await ord.save();
              }
              await OrderDraft.deleteOne({ _id: tx.referenceId });
            }
            continue;
          }
        } else if (liveData && isActivePending) {
          // Synchronize official Fawaterak expiration and timestamps directly without due_date
          tx.fawaterakResponse = { ...(tx.fawaterakResponse || {}), ...liveData };
          const liveExpire =
            liveData.payment_data?.expireDate ||
            liveData.payment_data?.expirationTime ||
            liveData.expire_date ||
            liveData.expireDate ||
            tx.paymentData?.expireDate ||
            tx.paymentData?.expirationTime;

          tx.paymentData = {
            ...(tx.paymentData || {}),
            ...(liveExpire
              ? {
                  expireDate: liveExpire,
                  expirationTime: liveExpire,
                  fawaterakExpireDate: liveExpire,
                }
              : {}),
            fawaterakCreatedAt:
              liveData.transaction_created_at ||
              tx.paymentData?.fawaterakCreatedAt ||
              liveData.invoice_date,
            lastLiveCheckAt: new Date(),
          };
          await tx.save();
        }
      } catch (error) {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (error?.message?.includes("timed out")) {
          console.warn(`[getPendingPayments] Fawaterak live status lookup timed out for ${tx.intentKey} (gateway latency); using cached state.`);
        } else {
          console.warn(`[getPendingPayments] Fawaterak lookup error for ${tx.intentKey}:`, error?.message || error);
        }
      }
    }

    if (isActivePending) {
      const finalExp = checkIfTransactionExpired(tx);
      if (finalExp.isExpired) {
        tx.status = "expired";
        await tx.save();
        continue;
      }

      if (tx.orderType === "subscription") {
        let sub = await Subscription.findById(tx.referenceId)
          .populate("planId")
          .lean();

        if (sub) {
          const currentPlanIdStr =
            sub.planId?._id?.toString() || sub.planId?.toString();
          const targetPlanIdStr = tx.paymentData?.targetPlanId?.toString();

          // Only consider the pending transaction obsolete if the subscription has already
          // been activated to the exact target plan (e.g. verified via webhook)
          if (
            sub.status === "active" &&
            targetPlanIdStr &&
            currentPlanIdStr === targetPlanIdStr
          ) {
            tx.status = "paid";
            await tx.save();
            continue;
          }

          // Temporarily mock the plan and status so the UI shows what the user is paying for
          if (tx.paymentData?.targetPlanId) {
            sub.planId = await Plan.findById(
              tx.paymentData.targetPlanId,
            ).lean();
            sub.status = "pending";
          }
          if (tx.paymentData?.targetBillingPeriod) {
            sub.billingPeriod = tx.paymentData.targetBillingPeriod;
          }
          const { fawaterakCreatedAt, fawaterakExpireDate } = extractFawaterakDates(
            tx.fawaterakResponse,
            tx.paymentData,
            tx.createdAt
          );
          const walletReference = extractWalletReference(tx.paymentData, tx.fawaterakResponse);
          const txObj = {
            ...(tx.toObject ? tx.toObject() : tx),
            walletReference,
            fawaterakCreatedAt,
            fawaterakExpireDate,
          };
          subscriptions.push({
            ...sub,
            transaction: txObj,
            walletReference,
            fawaterakCreatedAt,
            fawaterakExpireDate,
            lockedMethodId: tx.paymentMethodId,
            lockedMethodName: tx.paymentMethodName,
          });
        }
      } else if (tx.orderType === "store") {
        const ord =
          (await Order.findById(tx.referenceId).lean()) ||
          (await OrderDraft.findById(tx.referenceId).lean());
        if (ord && (ord.paymentStatus === "pending" || !ord.paymentStatus)) {
          const { fawaterakCreatedAt, fawaterakExpireDate } = extractFawaterakDates(
            tx.fawaterakResponse,
            tx.paymentData,
            tx.createdAt
          );
          const walletReference = extractWalletReference(tx.paymentData, tx.fawaterakResponse);
          const txObj = {
            ...(tx.toObject ? tx.toObject() : tx),
            walletReference,
            fawaterakCreatedAt,
            fawaterakExpireDate,
          };
          orders.push({
            ...ord,
            transaction: txObj,
            walletReference,
            fawaterakCreatedAt,
            fawaterakExpireDate,
            lockedMethodId: tx.paymentMethodId,
            lockedMethodName: tx.paymentMethodName,
          });
        }
      }
    }
  }

  res.json({
    success: true,
    subscriptions,
    orders,
  });
});

// ── POST /api/payment/cancel ──────────────────────────────────────────────────
// Body: { intentKey }
// Cancels a pending payment

export const cancelPayment = asyncHandler(async (req, res) => {
  const { intentKey } = req.body;
  const user = req.user;

  if (!intentKey) {
    return res.status(400).json({ error: "intentKey is required" });
  }

  const pTx = await PaymentTransaction.findOne({ intentKey, userId: user._id });
  if (!pTx) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  // Safety check: Never cancel if already paid in our database
  if (pTx.status === "paid") {
    return res.json({ success: true, status: "paid", message: "Transaction is already paid" });
  }

  // Double check with Fawaterak server before cancelling
  try {
    const liveData = await fawaterak.getTransactionData(pTx.intentKey);
    if (liveData && (liveData.paid === 1 || liveData.paid === "1" || liveData.status_text === "paid")) {
      await processVerifiedPayment(pTx, liveData);
      return res.json({
        success: true,
        status: "paid",
        message: "Transaction was already paid in Fawaterak and has been fulfilled.",
      });
    }
  } catch (e) {
    // Continue with cancellation if lookup fails or is unpaid
  }

  // 1. Notify Fawaterak API to cancel/delete the invoice so it does not stay pending on Fawaterak
  const invoiceId = pTx.fawaterakResponse?.invoice_id || pTx.transactionId;
  const fawaterakCancelRes = await fawaterak.cancelInvoice(pTx.intentKey, invoiceId).catch(() => null);

  // 2. Change status to cancelled instead of deleting the transaction so it remains in invoice history
  pTx.status = "cancelled";
  pTx.fawaterakLogs.push({
    action: "user_cancelled",
    date: new Date(),
    fawaterakResult: fawaterakCancelRes,
  });
  await pTx.save();

  // 3. If it's a store order, cancel the order and clean up draft
  if (pTx.orderType === "store") {
    const ord =
      (await Order.findOne({ intentKey })) ||
      (await Order.findOne({ paymentTransactionId: pTx._id })) ||
      (await Order.findById(pTx.referenceId));
    if (ord && ord.paymentStatus === "pending") {
      ord.paymentStatus = "cancelled";
      await ord.save();
    }
    await OrderDraft.deleteOne({ _id: pTx.referenceId });
  } else if (pTx.orderType === "subscription") {
    const sub =
      (await Subscription.findOne({ intentKey })) ||
      (await Subscription.findById(pTx.referenceId));
    if (sub && sub.status === "pending") {
      sub.status = "cancelled";
      await sub.save();
    }
  }

  res.json({
    success: true,
    message: "تم إلغاء وسيلة الدفع وإغلاق الفاتورة بنجاح",
    fawaterakCancelled: fawaterakCancelRes?.success || false,
  });
});

// ── GET /api/payment/invoice/:type/:id ───────────────────────────────────────
// Get invoice details from backend to ensure secure amount loading and strict user ownership
export const getInvoiceDetails = asyncHandler(async (req, res) => {
  let { type, id } = req.params;
  const user = req.user;

  if (!user?._id) {
    return res.status(401).json({ error: "تسجيل الدخول مطلوب لعرض الفاتورة", invalidLink: true });
  }

  // Normalize type
  if (type === "store") type = "order";

  let queryIntentKey = req.query.intentKey;
  if (
    queryIntentKey === "undefined" ||
    queryIntentKey === "null" ||
    !queryIntentKey
  ) {
    queryIntentKey = null;
  }

  // 1. Check if id or queryIntentKey directly refers to a PaymentTransaction
  let pTx = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    pTx = await PaymentTransaction.findById(id);
  }
  if (!pTx && queryIntentKey) {
    pTx = await PaymentTransaction.findOne({ intentKey: queryIntentKey }).sort({ createdAt: -1 });
  }
  if (!pTx && (type === "intent" || type === "transaction" || (!mongoose.Types.ObjectId.isValid(id) && id))) {
    pTx = await PaymentTransaction.findOne({ intentKey: id }).sort({ createdAt: -1 });
  }

  // If a direct transaction was found, serve invoice based on its type!
  if (pTx) {
    // STRICT USER OWNERSHIP:
    if (pTx.userId && pTx.userId.toString() !== user._id.toString()) {
      return res.status(403).json({
        error: "رابط الدفع هذا غير مخصص لحسابك الحالي. يرجى إعادة عملية الشراء من حسابك.",
        invalidLink: true,
      });
    }

    if (pTx.status === "paid") {
      return res.json({
        success: true,
        alreadyPaid: true,
        data: {
          id: pTx.referenceId || pTx._id,
          amount: pTx.amount,
          status: "paid",
        },
      });
    }

    if (pTx.status === "cancelled" || pTx.status === "failed" || pTx.status === "expired") {
      return res.status(410).json({
        error: "انتهت صلاحية جلسة وسيلة الدفع هذه أو تم إلغاؤها سابقاً. لا يمكن فتح الرابط وعرض تفاصيلها.",
        isExpired: true,
        invalidLink: true,
      });
    }

    const expInfo = checkIfTransactionExpired(pTx);
    if (expInfo.isExpired) {
      pTx.status = "expired";
      pTx.fawaterakLogs.push({ action: "auto_expired", note: "Expired upon invoice details fetch" });
      await pTx.save();

      return res.status(410).json({
        error: "انتهت مهلة وسيلة الدفع ولم تعد صالحة للاستخدام. تم إغلاق الرابط تلقائياً.",
        isExpired: true,
        invalidLink: true,
      });
    }

    const isDirectPending = pTx.status === "pending";
    if (isDirectPending && pTx.intentKey) {
      // Throttle: only re-fetch live data from Fawaterak if last check was >10s ago
      const lastCheck = pTx.paymentData?.lastLiveCheckAt
        ? new Date(pTx.paymentData.lastLiveCheckAt).getTime()
        : 0;
      if (Date.now() - lastCheck > 10_000) {
        try {
          const liveData = await fawaterak.getTransactionData(pTx.intentKey);
          if (liveData) {
            pTx.fawaterakResponse = { ...(pTx.fawaterakResponse || {}), ...liveData };
            pTx.paymentData = { ...(pTx.paymentData || {}), lastLiveCheckAt: new Date() };
            await pTx.save();
          }
        } catch {}
      }
    }

    const directDates = isDirectPending
      ? extractFawaterakDates(pTx.fawaterakResponse, pTx.paymentData, pTx.createdAt)
      : { fawaterakCreatedAt: null, fawaterakExpireDate: null };

    if (pTx.orderType === "store") {
      const order =
        (await Order.findById(pTx.referenceId)) ||
        (await OrderDraft.findById(pTx.referenceId)) ||
        (await Order.findOne({ intentKey: pTx.intentKey }));

      return res.json({
        success: true,
        data: {
          id: pTx.referenceId || pTx._id,
          orderId: pTx.referenceId || pTx._id,
          orderNumber: order?.orderNumber || null,
          amount: pTx.amount,
          originalAmount: order?.totalAmount || pTx.amount,
          shippingCost: order?.shippingCost || 0,
          discount: order?.discount || 0,
          items: (order?.items || []).map((item) => ({
            name: typeof item.name === "object" ? (item.name.ar || item.name.en || JSON.stringify(item.name)) : item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          name: `طلب متجر #${order?.orderNumber || pTx.referenceId?.toString().slice(-6).toUpperCase()}`,
          customer: order?.customer || null,
          transaction: pTx,
          walletReference: extractWalletReference(pTx.paymentData, pTx.fawaterakResponse),
          isPendingResume: isDirectPending,
          lockedMethodId: isDirectPending ? pTx.paymentMethodId : null,
          lockedMethodName: isDirectPending ? pTx.paymentMethodName : null,
          fawaterakCreatedAt: directDates.fawaterakCreatedAt,
          fawaterakExpireDate: directDates.fawaterakExpireDate,
        },
      });
    }

    // subscription transaction
    let plan = null;
    if (pTx.paymentData?.targetPlanId) {
      plan = await Plan.findById(pTx.paymentData.targetPlanId);
    }
    if (!plan && pTx.referenceId) {
      const targetSub = await Subscription.findById(pTx.referenceId).populate("planId");
      plan = targetSub?.planId;
    }
    if (!plan) {
      plan = await Plan.findOne({ isActive: true });
    }

    const billingPeriod = pTx.paymentData?.targetBillingPeriod || "monthly";

    return res.json({
      success: true,
      data: {
        id: plan?._id || pTx.referenceId || pTx._id,
        planId: plan?._id || pTx.paymentData?.targetPlanId,
        subscriptionId: pTx.referenceId || null,
        name:
          plan?.name?.ar ||
          plan?.name?.en ||
          (typeof plan?.name === "string" ? plan?.name : "Thenith Pro"),
        priceMonthly: plan?.prices?.monthly || 0,
        priceYearly: plan?.prices?.yearly || 0,
        billingPeriod,
        amount: pTx.amount,
        discount: 0,
        transaction: pTx,
        walletReference: extractWalletReference(pTx.paymentData, pTx.fawaterakResponse),
        isPendingResume: isDirectPending,
        lockedMethodId: isDirectPending ? pTx.paymentMethodId : null,
        lockedMethodName: isDirectPending ? pTx.paymentMethodName : null,
        fawaterakCreatedAt: directDates.fawaterakCreatedAt,
        fawaterakExpireDate: directDates.fawaterakExpireDate,
      },
    });
  }
  
  if (type === "order") {
    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = (await Order.findById(id)) || (await OrderDraft.findById(id));
    }
    if (!order) {
      order = (await Order.findOne({ intentKey: id })) || (await Order.findOne({ orderNumber: id }));
    }
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود أو انتهت صلاحيته", invalidLink: true });
    }
    
    // STRICT OWNERSHIP CHECK:
    // Order MUST belong to the currently logged in user!
    if (!order.userId || order.userId.toString() !== user._id.toString()) {
      return res.status(403).json({
        error: "رابط الدفع هذا غير مخصص لحسابك الحالي. يرجى إعادة عملية الشراء من حسابك.",
        invalidLink: true,
      });
    }

    if (order.paymentStatus === "paid") {
      return res.json({
        success: true,
        alreadyPaid: true,
        data: {
          id: order._id,
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
          status: "paid",
        },
      });
    }

    if (order.paymentStatus === "cancelled") {
      return res.status(400).json({
        error: "تم إلغاء هذا الطلب سابقاً. يرجى إنشاء طلب جديد من المتجر.",
        invalidLink: true,
      });
    }

    // If query intentKey was provided, verify it belongs to this user and is active
    if (req.query.intentKey) {
      const qTx = await PaymentTransaction.findOne({ intentKey: req.query.intentKey });
      if (!qTx) {
        return res.status(404).json({
          error: "رابط وسيلة الدفع غير صحيح أو منتهي الصلاحية.",
          invalidLink: true,
          isExpired: true,
        });
      }
      if (!qTx.userId || qTx.userId.toString() !== user._id.toString()) {
        return res.status(403).json({
          error: "رابط الدفع هذا غير مخصص لحسابك الحالي. يرجى إعادة عملية الشراء من حسابك.",
          invalidLink: true,
        });
      }
      if (qTx.status === "cancelled" || qTx.status === "failed" || qTx.status === "expired") {
        return res.status(410).json({
          error: "انتهت صلاحية وسيلة الدفع هذه أو تم إلغاؤها سابقاً. هذا الرابط غير صالح للاستخدام.",
          isExpired: true,
          invalidLink: true,
        });
      }
      const expInfo = checkIfTransactionExpired(qTx);
      if (expInfo.isExpired) {
        qTx.status = "expired";
        qTx.fawaterakLogs.push({ action: "auto_expired", note: "Expired upon order intent fetch" });
        await qTx.save();
        return res.status(410).json({
          error: "انتهت مهلة وسيلة الدفع ولم تعد صالحة للاستخدام. تم إغلاق الرابط تلقائياً.",
          isExpired: true,
          invalidLink: true,
        });
      }
    }

    // Check if there is an active pending transaction for this order
    let pTx = await PaymentTransaction.findOne({
      userId: user._id,
      status: "pending",
      $or: [
        { referenceId: order._id },
        { intentKey: order.intentKey || id },
        ...(req.query.intentKey ? [{ intentKey: req.query.intentKey }] : []),
      ],
    }).sort({ createdAt: -1 });

    if (pTx) {
      if (isCardTransaction(pTx)) {
        // Bank cards cannot be a pending resumed request; cancel any stale attempt
        pTx.status = "cancelled";
        await pTx.save();
        pTx = null;
      } else {
        const expInfo = checkIfTransactionExpired(pTx);
        if (expInfo.isExpired) {
          pTx.status = "expired";
          await pTx.save();
          if (req.query.intentKey && pTx.intentKey === req.query.intentKey) {
            return res.status(410).json({
              error: "انتهت مهلة وسيلة الدفع ولم تعد صالحة للاستخدام. تم إغلاق الرابط تلقائياً.",
              isExpired: true,
              invalidLink: true,
            });
          }
          pTx = null;
        }
      }
    }

    const isOrderPending = Boolean(pTx && pTx.status === "pending" && !isCardTransaction(pTx));
    const orderDates = isOrderPending
      ? extractFawaterakDates(pTx.fawaterakResponse, pTx.paymentData, pTx.createdAt, pTx)
      : { fawaterakCreatedAt: null, fawaterakExpireDate: null };

    return res.json({
      success: true,
      data: {
        id: order._id,
        orderId: order._id,
        orderNumber: order.orderNumber || null,
        amount: pTx?.amount || order.totalAmount,
        originalAmount: order.totalAmount,
        shippingCost: order.shippingCost || 0,
        discount: order.discount || 0,
        items: (order.items || []).map((item) => ({
          name: typeof item.name === "object" ? (item.name.ar || item.name.en || JSON.stringify(item.name)) : item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        name: `طلب متجر #${order.orderNumber || order._id.toString().slice(-6).toUpperCase()}`,
        customer: order.customer ? {
          name: order.customer.name,
          phone: order.customer.phone,
          address: order.customer.address,
          city: order.customer.city,
        } : null,
        transaction: pTx || null,
        walletReference: pTx ? extractWalletReference(pTx.paymentData, pTx.fawaterakResponse) : null,
        isPendingResume: isOrderPending,
        lockedMethodId: isOrderPending ? pTx.paymentMethodId : null,
        lockedMethodName: isOrderPending ? pTx.paymentMethodName : null,
        fawaterakCreatedAt: orderDates.fawaterakCreatedAt,
        fawaterakExpireDate: orderDates.fawaterakExpireDate,
      },
    });
  } else if (type === "subscription") {
    let plan = null;
    let targetSub = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      plan = await Plan.findById(id);
      if (!plan) {
        targetSub = await Subscription.findById(id).populate("planId");
        if (targetSub) {
          // STRICT OWNERSHIP CHECK: Subscription MUST belong to logged in user!
          if (!targetSub.userId || targetSub.userId.toString() !== user._id.toString()) {
            return res.status(403).json({
              error: "رابط الدفع هذا غير مخصص لحسابك الحالي. يرجى إعادة عملية الشراء من حسابك.",
              invalidLink: true,
            });
          }
          plan = targetSub.planId;
        }
      }
    }

    // What if intentKey was passed in query or as id?
    const intentKey = req.query.intentKey || (id && !plan && !targetSub ? id : null);
    let pTx = null;
    if (intentKey) {
      pTx = await PaymentTransaction.findOne({ intentKey });
      if (!pTx) {
        return res.status(404).json({
          error: "رابط وسيلة الدفع غير صحيح أو منتهي الصلاحية.",
          invalidLink: true,
          isExpired: true,
        });
      }
      if (pTx) {
        // STRICT OWNERSHIP CHECK: Transaction MUST belong to logged in user!
        if (!pTx.userId || pTx.userId.toString() !== user._id.toString()) {
          return res.status(403).json({
            error: "رابط الدفع هذا غير مخصص لحسابك الحالي. يرجى إعادة عملية الشراء من حسابك.",
            invalidLink: true,
          });
        }
        if (pTx.status === "paid") {
          return res.json({
            success: true,
            alreadyPaid: true,
            data: {
              id: plan?._id || pTx.referenceId,
              planId: plan?._id || pTx.paymentData?.targetPlanId,
              amount: pTx.amount,
              status: "paid",
            },
          });
        }
        if (pTx.status === "cancelled" || pTx.status === "failed" || pTx.status === "expired") {
          return res.status(410).json({
            error: "انتهت صلاحية وسيلة الدفع هذه أو تم إلغاؤها سابقاً. لا يمكن فتح الرابط وعرض تفاصيلها.",
            isExpired: true,
            invalidLink: true,
          });
        }
        const expInfo = checkIfTransactionExpired(pTx);
        if (expInfo.isExpired) {
          pTx.status = "expired";
          pTx.fawaterakLogs.push({ action: "auto_expired", note: "Expired upon subscription invoice fetch" });
          await pTx.save();

          return res.status(410).json({
            error: "انتهت مهلة وسيلة الدفع ولم تعد صالحة للاستخدام. تم إغلاق الرابط تلقائياً.",
            isExpired: true,
            invalidLink: true,
          });
        }
        if (!plan && pTx.paymentData?.targetPlanId) {
          plan = await Plan.findById(pTx.paymentData.targetPlanId);
        }
      }
    }

    if (!plan) {
      return res.status(404).json({ error: "الباقة غير موجودة أو انتهت صلاحية الرابط", invalidLink: true });
    }

    if (!pTx) {
      pTx = await PaymentTransaction.findOne({
        userId: user._id,
        orderType: "subscription",
        status: "pending",
        $or: [
          { paymentMethodId: { $in: [3, 4] } },
          { paymentMethodName: { $regex: /fawry|فوري|wallet|meeza|محفظ|كاش/i } },
          { "paymentData.fawryCode": { $exists: true, $ne: null } },
          { "paymentData.mobileWalletNumber": { $exists: true, $ne: null } },
        ],
        $and: [
          {
            $or: [
              ...(targetSub ? [{ referenceId: targetSub._id }] : []),
              { "paymentData.targetPlanId": plan._id },
            ],
          },
        ],
      }).sort({ createdAt: -1 });
    }

    if (pTx && pTx.status === "pending" && pTx.intentKey) {
      // Throttle: only re-fetch live data from Fawaterak if last check was >10s ago
      const lastCheck = pTx.paymentData?.lastLiveCheckAt
        ? new Date(pTx.paymentData.lastLiveCheckAt).getTime()
        : 0;
      if (Date.now() - lastCheck > 10_000) {
        try {
          const liveData = await fawaterak.getTransactionData(pTx.intentKey);
          if (liveData) {
            pTx.fawaterakResponse = { ...(pTx.fawaterakResponse || {}), ...liveData };
            pTx.paymentData = { ...(pTx.paymentData || {}), lastLiveCheckAt: new Date() };
            await pTx.save();
          }
        } catch {}
      }
    }

    const billingPeriod = pTx?.paymentData?.targetBillingPeriod || req.query.billingPeriod || "monthly";
    const couponCode = req.query.couponCode || "";
    
    let baseAmount = billingPeriod === "yearly"
      ? (plan.prices?.yearly || 0)
      : (plan.prices?.monthly || 0);

    let discount = 0;
    let appliedCoupon = null;
    let referralInfo = null;

    // Upgrade discount from Payment Plus to Pro (calculated from latest active days on Payment Plus)
    let upgradeDiscount = 0;
    let ppDaysUsed = 0;
    if (plan.key === "pro" && user) {
      try {
        const subState = await getSubscriptionState(user._id);
        const upDisc = subState?.upgradeDiscount || subState?.paymentPlusDetails?.upgradeDiscount || 0;
        const ppDays = subState?.paymentPlusDaysUsed || subState?.paymentPlusDetails?.daysUsed || 0;
        if (upDisc > 0) {
          upgradeDiscount = Number(upDisc) || 0;
          ppDaysUsed = Number(ppDays) || 0;
          discount += upgradeDiscount;
        }
      } catch (e) {
        console.warn("[getInvoiceDetails] Error calculating upgrade discount:", e.message);
      }
    }

    if (couponCode) {
      const cleanUpper = couponCode.toUpperCase().trim();
      const safeCode = escapeRegex(cleanUpper);
      appliedCoupon = await mongoose.model("Coupon").findOne({
        $or: [
          { code: cleanUpper },
          { code: { $regex: new RegExp(`^${safeCode}$`, "i") } },
          { couponId: cleanUpper },
          { couponId: { $regex: new RegExp(`^${safeCode}$`, "i") } },
        ],
      });
      if (appliedCoupon?.isActive) {
        let valid = true;
        if (appliedCoupon.expiresAt && new Date() > new Date(appliedCoupon.expiresAt)) valid = false;
        const hasMaxLimit = appliedCoupon.maxUses != null && Number(appliedCoupon.maxUses) > 0;
        if (hasMaxLimit && appliedCoupon.usedCount >= appliedCoupon.maxUses) valid = false;
        if (appliedCoupon.appliesTo === "store") valid = false;
        if (appliedCoupon.applicablePlan && appliedCoupon.applicablePlan !== "all" && plan.key !== appliedCoupon.applicablePlan) {
          valid = false;
        }

        if (valid && user) {
          const couponTrackingId = getCouponUsageId(appliedCoupon);

          const userDoc = await User.findById(user._id).select("usedCouponIds").lean();
          const hasUsedThisId = hasUsedCouponId(userDoc?.usedCouponIds, couponTrackingId);
          const hasUsedInTx = await PaymentTransaction.exists({
            userId: user._id,
            status: "paid",
            "paymentData.couponId": couponTrackingId,
          });

          if (hasUsedThisId || hasUsedInTx) {
            valid = false;
          }
        }

        if (valid) {
          let discountVal = appliedCoupon.discountValue;
          if (billingPeriod === "monthly" && appliedCoupon.monthlyDiscountValue != null) discountVal = appliedCoupon.monthlyDiscountValue;
          else if (billingPeriod === "yearly" && appliedCoupon.yearlyDiscountValue != null) discountVal = appliedCoupon.yearlyDiscountValue;
          
          const couponDisc = appliedCoupon.discountType === "percentage"
            ? Math.round((baseAmount * discountVal) / 100)
            : Math.min(discountVal, baseAmount);
          discount += couponDisc;
        }
      } else {
        appliedCoupon = null;
      }
    }

    const referralRewardId = req.query.referralRewardId || pTx?.paymentData?.referralRewardId || null;

    // Check referral discount (invitee 10%, monthly tiers, or referral code)
    try {
      const refDisc = await referralService.calculateEligibleDiscounts({
        userId: user._id,
        basePrice: baseAmount,
        requestedRewardId: referralRewardId,
        referralCode: couponCode || null,
      });

      if (refDisc && refDisc.applied) {
        const refSettings = await referralService.getReferralSettings();
        if (!appliedCoupon || refSettings.allowStackingDiscounts) {
          discount += refDisc.discountAmount;
          referralInfo = {
            applied: true,
            rewardType: refDisc.rewardType,
            discountPercent: refDisc.discountPercent,
            discountAmount: refDisc.discountAmount,
            rewardId: refDisc.rewardId,
            originalPrice: baseAmount,
          };
        } else if (refDisc.discountAmount > discount) {
          discount = refDisc.discountAmount;
          appliedCoupon = null;
          referralInfo = {
            applied: true,
            rewardType: refDisc.rewardType,
            discountPercent: refDisc.discountPercent,
            discountAmount: refDisc.discountAmount,
            rewardId: refDisc.rewardId,
            originalPrice: baseAmount,
          };
        }
      }
    } catch (refErr) {
      console.error("[Referral] Error calculating invoice referral discount:", refErr);
    }

    const calculatedAmount = Math.max(baseAmount - discount, 0);
    const finalAmount = pTx?.amount ?? calculatedAmount;
    if (pTx) {
      if (isCardTransaction(pTx)) {
        pTx.status = "cancelled";
        await pTx.save();
        pTx = null;
      } else {
        const expInfo = checkIfTransactionExpired(pTx);
        if (expInfo.isExpired) {
          pTx.status = "expired";
          await pTx.save();
          pTx = null;
        }
      }
    }

    const isSubPending = Boolean(pTx && pTx.status === "pending" && !isCardTransaction(pTx));
    const subDates = isSubPending
      ? extractFawaterakDates(pTx.fawaterakResponse, pTx.paymentData, pTx.createdAt, pTx)
      : { fawaterakCreatedAt: null, fawaterakExpireDate: null };

    return res.json({
      success: true,
      data: {
        id: plan._id,
        planId: plan._id,
        subscriptionId: targetSub?._id || null,
        name: plan.name?.ar || plan.name?.en || (typeof plan.name === "string" ? plan.name : "Thenith Pro"),
        priceMonthly: plan.prices?.monthly || 0,
        priceYearly: plan.prices?.yearly || 0,
        billingPeriod,
        originalAmount: baseAmount,
        amount: finalAmount,
        discount,
        upgradeDiscount,
        ppDaysUsed,
        transaction: pTx || null,
        walletReference: pTx ? extractWalletReference(pTx.paymentData, pTx.fawaterakResponse) : null,
        isPendingResume: isSubPending,
        lockedMethodId: isSubPending ? pTx.paymentMethodId : null,
        lockedMethodName: isSubPending ? pTx.paymentMethodName : null,
        fawaterakCreatedAt: subDates.fawaterakCreatedAt,
        fawaterakExpireDate: subDates.fawaterakExpireDate,
        referralInfo: pTx?.paymentData?.referralRewardId ? {
          applied: true,
          rewardType: pTx.paymentData.referralRewardType,
          discountPercent: pTx.paymentData.referralDiscountPercent,
          discountAmount: pTx.paymentData.referralDiscountAmount,
          originalPrice: pTx.paymentData.originalPrice || baseAmount,
        } : (referralInfo || null),
        acquisitionSource: user.referredBy ? "referral" : "direct",
      },
    });
  }

  res.status(400).json({ error: "نوع الفاتورة غير صحيح", invalidLink: true });
});

// ── POST /api/payment/save-card-screen ─────────────────────────────────────────
// Generates Fawaterak hosted link for saving Visa/Mastercard securely for 30-day auto-renewal
export const initiateCardSaving = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const clientOrigin = req.headers.origin || "http://localhost:3000";
  const successUrl = `${clientOrigin}/panel/subscriptions?card_saved=success`;
  const failUrl = `${clientOrigin}/panel/subscriptions?card_saved=failed`;

  const screenData = await fawaterak.createCardTokenScreen({
    customer: {
      userId: user._id,
      firstName: user.firstName || user.name || "Customer",
      lastName: user.lastName || ".",
      email: user.email,
      phone: user.phone,
    },
    successUrl,
    failUrl,
  });

  return res.json({
    success: true,
    url: screenData?.url || screenData?.redirectUrl || screenData?.link,
    data: screenData,
  });
});

// ── POST /api/payment/confirm-card-token ──────────────────────────────────────
export const confirmCardToken = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { cardToken, customerCardToken, customerCard, cardBrand, cardTokenUniqueId } = req.body || {};
  const effectiveToken = cardToken || customerCardToken;

  if (!effectiveToken) {
    return res.status(400).json({ error: "Card token is required" });
  }

  const savedData = {
    cardToken: effectiveToken,
    cardTokenUniqueId: cardTokenUniqueId || "",
    cardBrand: cardBrand || "CARD",
    customerCard: customerCard || "",
    savedAt: new Date(),
  };

  await User.findByIdAndUpdate(userId, { savedCard: savedData });
  await Subscription.updateMany(
    { userId, status: { $in: ["active", "trialing"] } },
    { autoRenew: true, savedCard: savedData }
  );

  return res.json({ success: true, savedCard: savedData });
});
