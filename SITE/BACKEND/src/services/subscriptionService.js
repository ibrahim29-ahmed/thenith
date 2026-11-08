import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import Usage from "../models/Usage.js";
import Card from "../models/Card.js";
import User from "../models/User.js";
import Setting from "../models/Setting.js";
import _subscription788 from "../util/subscription.js";
const { getDaysRemaining  } = _subscription788;
import _entitlements6033 from "../util/entitlements.js";
const { buildEntitlements  } = _entitlements6033;

let cachedFreePlan = null;
let cachedFreePlanTime = 0;
const FREE_PLAN_TTL_MS = 10 * 60 * 1000;

export async function getCachedFreePlan() {
  const now = Date.now();
  if (cachedFreePlan && now - cachedFreePlanTime < FREE_PLAN_TTL_MS) {
    return cachedFreePlan;
  }
  const plan = await Plan.findOne({ key: "free" }).lean();
  if (plan) {
    cachedFreePlan = plan;
    cachedFreePlanTime = now;
  }
  return plan || cachedFreePlan;
}

export function invalidateFreePlanCache() {
  cachedFreePlan = null;
  cachedFreePlanTime = 0;
}

/**
 * Returns the full subscription state for a given userId.
 * @param {ObjectId|string} userId
 * @param {boolean} includeUsage - Whether to include card usage counts
 */
async function getSubscriptionState(userId, includeUsage = false) {
  const month = new Date().toISOString().slice(0, 7);

  // Fetch free plan from memory/DB and query subscriptions concurrently
  const [freePlan, allUserSubs, usageDoc, cardsTotalStored, userDoc] = await Promise.all([
    getCachedFreePlan(),
    Subscription.find({ userId })
      .sort({ createdAt: -1 })
      .populate("planId")
      .lean(),
    includeUsage ? Usage.findOne({ userId, month }).lean() : Promise.resolve(null),
    includeUsage ? Card.countDocuments({ userId }) : Promise.resolve(undefined),
    User.findById(userId)
      .select("paymentPlusActive paymentPlusOverride hasStandalonePaymentPlus paymentPlusStartedAt paymentPlusExpiresAt paymentPlusBillingPeriod createdAt")
      .lean(),
  ]);

  const now = new Date();

  // Find active subscriptions
  const activeSubs = (allUserSubs || []).filter(
    (s) =>
      ["active", "trialing"].includes(s.status) &&
      (!s.expiresAt || new Date(s.expiresAt) > now)
  );

  const activeProSub = activeSubs.find((s) => s.planId?.key === "pro") || null;
  const activePaymentPlusSub = activeSubs.find((s) => s.planId?.key === "payment_plus") || null;

  const isProActive = Boolean(activeProSub);
  const hasStandalonePaymentPlus =
    userDoc?.paymentPlusOverride === "disabled"
      ? false
      : userDoc?.paymentPlusOverride === "enabled"
        ? true
        : Boolean(
            activePaymentPlusSub ||
            (userDoc?.hasStandalonePaymentPlus && userDoc?.paymentPlusActive)
          );

  let isPaymentPlusActive = false;
  if (userDoc?.paymentPlusOverride === "enabled") {
    isPaymentPlusActive = true;
  } else if (userDoc?.paymentPlusOverride === "disabled") {
    isPaymentPlusActive = false;
  } else {
    // Pro automatically activates the payment features!
    // Or standalone payment plus activation
    isPaymentPlusActive = Boolean(
      isProActive ||
      hasStandalonePaymentPlus
    );
  }

  // Calculate days used and upgrade discount (3 EGP per day used) for Payment Plus
  // Strictly calculated from the latest subscription's start date (days used, not days left)
  let paymentPlusDaysUsed = 0;
  let paymentPlusUpgradeDiscount = 0;

  const latestPPSub = (allUserSubs || [])
    .filter((s) => s.planId?.key === "payment_plus" && ["active", "trialing"].includes(s.status))
    .sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0))[0] || activePaymentPlusSub;

  const ppStartDate =
    latestPPSub?.startedAt ||
    userDoc?.paymentPlusStartedAt ||
    userDoc?.createdAt ||
    null;

  if (isPaymentPlusActive && !isProActive) {
    const effectiveStart = ppStartDate ? new Date(ppStartDate) : new Date(userDoc?.createdAt || Date.now());
    const diffMs = Math.max(0, Date.now() - effectiveStart.getTime());
    paymentPlusDaysUsed = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const dayRateSetting = await Setting.findOne({ key: "payment_plus_day_rate" }).lean().catch(() => null);
    const dayRate = typeof dayRateSetting?.value?.dayRate === "number" ? dayRateSetting.value.dayRate : 3;
    paymentPlusUpgradeDiscount = paymentPlusDaysUsed * dayRate;
  }

  // Primary active subscription
  const primarySub = activeProSub || activePaymentPlusSub || (allUserSubs && allUserSubs[0]) || null;
  const isPrimaryExpired = primarySub?.expiresAt && new Date(primarySub.expiresAt) <= now;
  const isEntitled = primarySub && ["active", "trialing"].includes(primarySub.status) && !isPrimaryExpired;

  const plan = isEntitled ? primarySub.planId : freePlan;
  const definition = plan
    ? (typeof plan.toObject === "function" ? plan.toObject() : plan)
    : freePlan
      ? (typeof freePlan.toObject === "function" ? freePlan.toObject() : freePlan)
      : { key: "free", features: {}, limits: {} };

  const planKey = isProActive ? "pro" : (activePaymentPlusSub ? "payment_plus" : (isEntitled && definition.key ? definition.key : "free"));

  const brUsed = usageDoc?.businessRequests || 0;

  let cardsUsed = undefined;
  if (includeUsage && cardsTotalStored !== undefined) {
    const maxCards = definition.limits?.maxCards ?? null;
    cardsUsed =
      maxCards !== null
        ? Math.min(cardsTotalStored, maxCards)
        : cardsTotalStored;
  }

  const entitlements = buildEntitlements(planKey, definition, {
    businessRequests: brUsed,
    cardsUsed,
    cardsTotalStored,
  });

  if (isPaymentPlusActive) {
    entitlements.features = {
      ...(entitlements.features || {}),
      unifiedPaymentHub: true,
      digitalWallets: true,
    };
  }

  return {
    plan: planKey,
    planDetails: definition,
    status: isPrimaryExpired ? "expired" : (primarySub?.status || "active"),
    startedAt: primarySub?.startedAt || null,
    expiresAt: isPrimaryExpired ? null : (primarySub?.expiresAt || null),
    billingPeriod: primarySub?.billingPeriod || null,
    daysRemaining: isPrimaryExpired ? 0 : getDaysRemaining(primarySub?.expiresAt),
    usage: { month, businessRequests: brUsed },
    entitlements,
    autoRenew: primarySub?.autoRenew ?? false,
    savedCard: primarySub?.savedCard || null,
    intentKey: primarySub?.intentKey || null,
    paymentMethod: primarySub?.paymentMethod || null,
    lastRenewalAt: primarySub?.lastRenewalAt || null,
    isPro: isProActive,
    paymentPlusActive: isPaymentPlusActive,
    hasPaymentPlus: isPaymentPlusActive,
    hasStandalonePaymentPlus,
    upgradeDiscount: paymentPlusUpgradeDiscount,
    paymentPlusDaysUsed,
    paymentPlusDetails: {
      active: isPaymentPlusActive,
      isStandalone: hasStandalonePaymentPlus,
      startedAt: ppStartDate,
      expiresAt: activePaymentPlusSub?.expiresAt || userDoc?.paymentPlusExpiresAt || null,
      billingPeriod: activePaymentPlusSub?.billingPeriod || userDoc?.paymentPlusBillingPeriod || "monthly",
      daysUsed: paymentPlusDaysUsed,
      upgradeDiscount: paymentPlusUpgradeDiscount,
    },
    activeSubscriptions: {
      pro: activeProSub
        ? {
            id: activeProSub._id,
            status: activeProSub.status,
            startedAt: activeProSub.startedAt,
            expiresAt: activeProSub.expiresAt,
            billingPeriod: activeProSub.billingPeriod,
            daysRemaining: getDaysRemaining(activeProSub.expiresAt),
          }
        : null,
      payment_plus: activePaymentPlusSub
        ? {
            id: activePaymentPlusSub._id,
            status: activePaymentPlusSub.status,
            startedAt: activePaymentPlusSub.startedAt,
            expiresAt: activePaymentPlusSub.expiresAt,
            billingPeriod: activePaymentPlusSub.billingPeriod,
            daysRemaining: getDaysRemaining(activePaymentPlusSub.expiresAt),
          }
        : (hasStandalonePaymentPlus || userDoc?.paymentPlusActive
          ? {
              status: "active",
              startedAt: userDoc?.paymentPlusStartedAt || null,
              expiresAt: userDoc?.paymentPlusExpiresAt || null,
              billingPeriod: userDoc?.paymentPlusBillingPeriod || "monthly",
              daysRemaining: userDoc?.paymentPlusExpiresAt ? getDaysRemaining(userDoc.paymentPlusExpiresAt) : null,
            }
          : null),
    },
  };
}

/**
 * Consumes one business request for the given user, respecting the monthly limit.
 * Returns the updated Usage doc, or null if the limit is reached.
 */
async function consumeBusinessRequest(userId, limit) {
  const month = new Date().toISOString().slice(0, 7);
  if (limit === null || limit === undefined) {
    return Usage.findOneAndUpdate(
      { userId, month },
      { $inc: { businessRequests: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  try {
    await Usage.create({ userId, month, businessRequests: 1 });
    return Usage.findOne({ userId, month });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  const usage = await Usage.findOneAndUpdate(
    { userId, month, businessRequests: { $lt: limit } },
    { $inc: { businessRequests: 1 } },
    { new: true },
  );
  if (!usage) return null;
  return usage;
}


export default {
  getSubscriptionState,
  consumeBusinessRequest
};
