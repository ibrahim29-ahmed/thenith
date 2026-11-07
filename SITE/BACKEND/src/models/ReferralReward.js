import mongoose from "mongoose";

const referralRewardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rewardType: {
      type: String,
      enum: [
        "invitee_discount",
        "monthly_discount",
        "milestone_discount",
        "free_nfc_card",
      ],
      required: true,
      index: true,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Referral",
      default: null,
    },
    sourceMonth: {
      type: String, // e.g. "2026-11"
      default: null,
      index: true,
    },
    milestoneCount: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["available", "redeemed", "expired", "cancelled"],
      default: "available",
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    redeemedAt: {
      type: Date,
      default: null,
    },
    redeemedInvoiceNumber: {
      type: String,
      default: null,
    },
    redeemedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      default: null,
    },
    createdBy: {
      type: String,
      enum: ["system", "admin"],
      default: "system",
    },
    adminNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

referralRewardSchema.index({ userId: 1, status: 1, rewardType: 1 });
referralRewardSchema.index({ userId: 1, sourceMonth: 1, rewardType: 1 });

const ReferralReward = mongoose.model("ReferralReward", referralRewardSchema);

export default ReferralReward;

