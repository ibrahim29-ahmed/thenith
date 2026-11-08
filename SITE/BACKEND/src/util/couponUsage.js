/**
 * The immutable coupon identifier used for redemption tracking.
 *
 * A visible coupon code may be edited by an administrator, so it must never be
 * used as a redemption key. Older documents that predate `couponId` safely fall
 * back to Mongo's immutable document id.
 */
export function getCouponUsageId(coupon) {
  const couponId = String(coupon?.couponId || "").trim();
  if (couponId) return couponId;

  const databaseId = coupon?._id?.toString?.() || coupon?._id;
  return databaseId ? String(databaseId) : null;
}

export function hasUsedCouponId(usedCouponIds, couponUsageId) {
  if (!couponUsageId || !Array.isArray(usedCouponIds)) return false;
  return usedCouponIds.some((usedId) => String(usedId) === String(couponUsageId));
}
