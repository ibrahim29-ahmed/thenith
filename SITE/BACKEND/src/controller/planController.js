import _asyncHandler9213 from "../util/asyncHandler.js";
const { asyncHandler  } = _asyncHandler9213;
import Plan from "../models/Plan.js";

import Coupon from "../models/Coupon.js";

// Invalidate cache helper
export function invalidatePlansCache() {
  // Realtime queries directly to DB
}

// ── GET /api/plans ────────────────────────────────────────────────────────────
const getPlans = asyncHandler(async (_request, response) => {
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const nowDate = new Date();
  const [plans, activeCoupon] = await Promise.all([
    Plan.find({ isActive: true }).sort({ key: 1 }).lean(),
    Coupon.findOne({
      isActive: true,
      applyMode: "auto", // only coupons designated for automatic direct application on plans
      appliesTo: { $in: ["subscriptions", "all"] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: nowDate } }],
      $expr: {
        $or: [
          { $eq: ["$maxUses", null] },
          { $lt: ["$usedCount", "$maxUses"] },
        ],
      },
    })
      .sort({ discountValue: -1 })
      .lean(),
  ]);

  let effectiveCoupon = activeCoupon;
  if (_request.user && effectiveCoupon?.usedBy) {
    const hasUsed = effectiveCoupon.usedBy.some(
      (id) => id.toString() === _request.user._id.toString()
    );
    if (hasUsed) effectiveCoupon = null;
  }

  // Apply active coupon logic to calculate final prices for each plan
  const plansWithCalculatedPrices = plans.map(plan => {
    let monthlyDiscountVal = 0;
    let yearlyDiscountVal = 0;
    let canApplyMonthly = false;
    let canApplyYearly = false;

    if (effectiveCoupon) {
      if (effectiveCoupon.appliesTo === "subscriptions" || effectiveCoupon.appliesTo === "all") {
        if (effectiveCoupon.monthlyDiscountValue != null) {
          monthlyDiscountVal = effectiveCoupon.monthlyDiscountValue;
          canApplyMonthly = true;
        } else if (effectiveCoupon.appliesTo === "all") {
          monthlyDiscountVal = effectiveCoupon.discountValue;
          canApplyMonthly = true;
        }

        if (effectiveCoupon.yearlyDiscountValue != null) {
          yearlyDiscountVal = effectiveCoupon.yearlyDiscountValue;
          canApplyYearly = true;
        } else if (effectiveCoupon.appliesTo === "all") {
          yearlyDiscountVal = effectiveCoupon.discountValue;
          canApplyYearly = true;
        }
      }
    }

    const calcDiscount = (price, discountVal, discountType, canApply) => {
      if (!canApply || discountVal <= 0) return 0;
      if (discountType === "percentage") {
        return Math.round((price * discountVal) / 100);
      }
      return Math.min(discountVal, price);
    };

    const monthlyPrice = plan.prices?.monthly || 0;
    const yearlyPrice = plan.prices?.yearly || 0;

    const monthlyDiscountAmount = calcDiscount(monthlyPrice, monthlyDiscountVal, effectiveCoupon?.discountType, canApplyMonthly);
    const yearlyDiscountAmount = calcDiscount(yearlyPrice, yearlyDiscountVal, effectiveCoupon?.discountType, canApplyYearly);

    return {
      ...plan,
      calculatedPrice: {
        monthly: {
          originalPrice: monthlyPrice,
          finalPrice: Math.max(0, monthlyPrice - monthlyDiscountAmount),
          discountAmount: monthlyDiscountAmount,
          appliedDiscountVal: monthlyDiscountVal,
          discountType: effectiveCoupon?.discountType || "percentage"
        },
        yearly: {
          originalPrice: yearlyPrice,
          finalPrice: Math.max(0, yearlyPrice - yearlyDiscountAmount),
          discountAmount: yearlyDiscountAmount,
          appliedDiscountVal: yearlyDiscountVal,
          discountType: effectiveCoupon?.discountType || "percentage"
        }
      }
    };
  });

  const result = { plans: plansWithCalculatedPrices, activeCoupon: effectiveCoupon };
  response.json(result);
});

export default { getPlans, invalidatePlansCache };

