import assert from "node:assert/strict";
import test from "node:test";
import { getCouponUsageId, hasUsedCouponId } from "./couponUsage.js";

test("tracks a redeemed coupon by its immutable couponId after its display code changes", () => {
  const coupon = { _id: "507f1f77bcf86cd799439011", couponId: "CPN-SUMMER-42", code: "SUMMER10" };
  const usedCouponIds = ["CPN-SUMMER-42"];

  coupon.code = "AUTUMN10";

  assert.equal(getCouponUsageId(coupon), "CPN-SUMMER-42");
  assert.equal(hasUsedCouponId(usedCouponIds, getCouponUsageId(coupon)), true);
});

test("uses the immutable database id for legacy coupons without a couponId", () => {
  const coupon = { _id: "507f1f77bcf86cd799439012", code: "LEGACY10" };
  const usageId = getCouponUsageId(coupon);

  assert.equal(usageId, "507f1f77bcf86cd799439012");
  assert.equal(hasUsedCouponId([usageId], usageId), true);
  assert.equal(hasUsedCouponId(["LEGACY10"], usageId), false);
});
