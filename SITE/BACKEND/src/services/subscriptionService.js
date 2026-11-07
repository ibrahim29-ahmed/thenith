import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import Usage from "../models/Usage.js";
import Card from "../models/Card.js";
import User from "../models/User.js";
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

  // Fetch free plan from memory/DB and query subscription concurrently
  const [freePlan, subscription, usageDoc, cardsTotalStored, userDoc] = await Promise.all([
    getCachedFreePlan(),
    (async () => {
      let sub = await Subscription.findOne({
        userId,
        status: { $in: ["active", "trialing"] },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
        .sort({ updatedAt: -1 })
        .populate("planId")
        .lean();
      if (!sub) {
        sub = await Subscription.findOne({ userId })
          .sort({ updatedAt: -1 })
          .populate("planId")
          .lean();
      }
      return sub;
    })(),
    includeUsage ? Usage.findOne({ userId, month }).lean() : Promise.resolve(null),
    includeUsage ? Card.countDocuments({ userId }) : Promise.resolve(undefined),
    User.findById(userId).select("paymentPlusActive paymentPlusOverride").lean(),
  ]);

  const isExpired =
    subscription?.expiresAt && new Date(subscription.expiresAt) <= new Date();
  const isEntitled =
    subscription &&
    ["active", "trialing"].includes(subscription.status) &&
    !isExpired;
  const plan = isEntitled ? subscription.planId : freePlan;
  const definition = plan
    ? (typeof plan.toObject === "function" ? plan.toObject() : plan)
    : freePlan
      ? (typeof freePlan.toObject === "function" ? freePlan.toObject() : freePlan)
      : { key: "free", features: {}, limits: {} };
  const planKey = (isEntitled && definition.key) ? definition.key : (definition.key === "pro" ? "pro" : "free");

  let isPaymentPlusActive = false;
  if (userDoc?.paymentPlusOverride === "enabled") {
    isPaymentPlusActive = true;
  } else if (userDoc?.paymentPlusOverride === "disabled") {
    isPaymentPlusActive = false;
  } else {
    isPaymentPlusActive = Boolean(
      userDoc?.paymentPlusActive ||
      (isEntitled && (definition.key === "payment_plus" || definition.key === "pro"))
    );
  }

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

  return {
    plan: planKey,
    planDetails: definition,
    status: isExpired ? "expired" : subscription?.status || "active",
    startedAt: subscription?.startedAt || null,
    expiresAt: isExpired ? null : subscription?.expiresAt || null,
    billingPeriod: subscription?.billingPeriod || null,
    daysRemaining: isExpired ? 0 : getDaysRemaining(subscription?.expiresAt),
    usage: { month, businessRequests: brUsed },
    entitlements,
    autoRenew: subscription?.autoRenew ?? false,
    savedCard: subscription?.savedCard || null,
    intentKey: subscription?.intentKey || null,
    paymentMethod: subscription?.paymentMethod || null,
    lastRenewalAt: subscription?.lastRenewalAt || null,
    paymentPlusActive: isPaymentPlusActive,
    hasPaymentPlus: isPaymentPlusActive,
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
