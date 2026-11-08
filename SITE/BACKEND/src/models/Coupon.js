import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    couponId: {
      type: String,
      trim: true,
      default: function () {
        return "CPN-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      },
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyDiscountValue: {
      type: Number,
      default: null,
      min: 0,
    },
    yearlyDiscountValue: {
      type: Number,
      default: null,
      min: 0,
    },
    appliesTo: {
      type: String,
      enum: ["all", "store", "subscriptions"],
      default: "all",
    },
    applicablePlan: {
      type: String,
      enum: ["all", "pro", "payment_plus"],
      default: "all",
    },
    applyMode: {
      type: String,
      enum: ["code", "auto"],
      default: "code",
    },
    maxUses: {
      type: Number,
      default: null, // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    expiresAt: {
      type: Date,
      default: null, // null means it never expires
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

couponSchema.methods.calculateDiscount = function (
  baseAmount,
  target = "all",
  billingPeriod = null,
  userId = null,
) {
  if (!this.isActive) return 0;
  if (this.expiresAt && new Date() > new Date(this.expiresAt)) return 0;
  if (this.maxUses !== null && this.usedCount >= this.maxUses) return 0;
  if (this.appliesTo !== "all" && this.appliesTo !== target) return 0;

  let val = this.discountValue;
  if (billingPeriod === "monthly" && this.monthlyDiscountValue != null) {
    val = this.monthlyDiscountValue;
  } else if (billingPeriod === "yearly" && this.yearlyDiscountValue != null) {
    val = this.yearlyDiscountValue;
  }

  if (this.discountType === "percentage") {
    return Math.round((baseAmount * val) / 100);
  }
  return Math.min(val, baseAmount);
};

couponSchema.index({ isActive: 1, appliesTo: 1, expiresAt: 1 });
couponSchema.index({ couponId: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;

