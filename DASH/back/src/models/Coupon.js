import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
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
      required: true,
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

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
