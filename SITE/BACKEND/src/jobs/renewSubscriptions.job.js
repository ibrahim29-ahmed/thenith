import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import Plan from "../models/Plan.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import fawaterakService from "../services/fawaterakService.js";
import _dashboardNotifications from "../util/dashboardNotifications.js";
const { createUserNotification } = _dashboardNotifications;

/**
 * Runs periodically to automatically renew subscriptions for users who have completed 30 days
 * (or their monthly/yearly billing period) using their saved credit/debit card (Visa/Mastercard).
 */
export async function renewDueSubscriptions() {
  const now = new Date();
  // We check for subscriptions that are active, have autoRenew enabled,
  // have a saved card token, and are within 24 hours of expiry or already due (expiresAt <= now + 24h)
  const windowTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dueSubscriptions = await Subscription.find({
    status: "active",
    autoRenew: true,
    expiresAt: { $ne: null, $lte: windowTime },
    "savedCard.cardToken": { $ne: null, $exists: true },
    // Prevent retrying repeatedly within the last 12 hours if failed
    $or: [
      { lastRenewalAt: null },
      { lastRenewalAt: { $lt: new Date(now.getTime() - 12 * 60 * 60 * 1000) } },
    ],
    renewalFailCount: { $lt: 3 }, // stop after 3 failed attempts
  }).populate("planId userId");

  let successCount = 0;
  let failCount = 0;

  for (const sub of dueSubscriptions) {
    const user = sub.userId;
    const plan = sub.planId;
    const cardToken = sub.savedCard?.cardToken;

    if (!user || !plan || !cardToken) continue;

    // Determine amount to charge based on billing period
    const isYearly = sub.billingPeriod === "yearly";
    const amount = isYearly ? plan.prices?.yearly : plan.prices?.monthly;

    if (!amount || amount <= 0) continue;

    const renewalRef = `renewal_${sub._id}_${Date.now()}`;

    try {
      sub.lastRenewalAt = new Date();

      const payResult = await fawaterakService.createTokenizationPayRequest({
        token: cardToken,
        amount,
        customer: {
          userId: user._id,
          firstName: user.firstName || user.name || "Customer",
          lastName: user.lastName || ".",
          email: user.email,
          phone: user.phone,
        },
        orderId: sub._id,
        orderType: "subscription",
      });

      const isSuccess =
        payResult?.status === "success" ||
        payResult?.data?.status === "paid" ||
        payResult?.data?.invoice_status === "paid" ||
        payResult?.invoice_status === "paid";

      if (isSuccess) {
        // Extend subscription by 30 days (or 1 year for yearly)
        const currentExpiry = new Date(sub.expiresAt > now ? sub.expiresAt : now);
        if (isYearly) {
          currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
        } else {
          currentExpiry.setDate(currentExpiry.getDate() + 30);
        }

        sub.expiresAt = currentExpiry;
        sub.paidAt = new Date();
        sub.paidAmount = amount;
        sub.renewalFailCount = 0;
        await sub.save();

        // Create transaction record
        await PaymentTransaction.create({
          userId: user._id,
          referenceId: renewalRef,
          type: "subscription",
          amount,
          status: "paid",
          paymentMethod: sub.savedCard?.cardBrand || "Visa/Mastercard (Saved)",
          paymentData: {
            isRenewal: true,
            billingPeriod: sub.billingPeriod,
            fawaterakResponse: payResult,
          },
          paidAt: new Date(),
        }).catch(() => {});

        // Send user notification
        if (createUserNotification) {
          await createUserNotification({
            userId: user._id,
            type: "subscription_renewed",
            title: "تم تجديد اشتراكك بنجاح",
            message: `تم سحب مبلغ ${amount} ج.م وتجديد باقة ${plan.name?.ar || plan.name || "Pro"} تلقائياً لمدة ${isYearly ? "سنة" : "30 يوماً"}.`,
            metadata: {
              planId: plan._id,
              subscriptionId: sub._id,
              amount,
              nextExpiry: currentExpiry,
            },
          }).catch(() => {});
        }

        successCount++;
      } else {
        // Renewal failed
        sub.renewalFailCount = (sub.renewalFailCount || 0) + 1;
        await sub.save();

        if (createUserNotification) {
          await createUserNotification({
            userId: user._id,
            type: "subscription_renewal_failed",
            title: "فشل تجديد الاشتراك تلقائياً",
            message: `تعذر سحب قيمة تجديد الباقة من بطاقتك المسجلة. يرجى مراجعة البطاقة أو تجديد الاشتراك يدوياً.`,
            metadata: {
              planId: plan._id,
              subscriptionId: sub._id,
              error: payResult?.message,
            },
          }).catch(() => {});
        }

        failCount++;
      }
    } catch (err) {
      sub.renewalFailCount = (sub.renewalFailCount || 0) + 1;
      await sub.save().catch(() => {});

      failCount++;
    }
  }

  return { processed: dueSubscriptions.length, successCount, failCount };
}

export function startSubscriptionRenewalJob() {
  const run = async () => {
    try {
      await renewDueSubscriptions();
    } catch (err) {}
  };

  run();
  // Check every hour for subscriptions that reached 30 days
  const interval = setInterval(run, 60 * 60 * 1000);
  return () => clearInterval(interval);
}

export default {
  renewDueSubscriptions,
  startSubscriptionRenewalJob,
};

