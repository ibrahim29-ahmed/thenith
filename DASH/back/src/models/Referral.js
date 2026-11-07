import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    inviteeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["registered", "pending_payment", "successful", "ineligible", "cancelled"],
      default: "registered",
      index: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    firstPurchaseAt: {
      type: Date,
      default: null,
    },
    qualifiedAt: {
      type: Date,
      default: null,
    },
    orderType: {
      type: String,
      enum: ["subscription", "store", null],
      default: null,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      default: null,
    },
    invoiceNumber: {
      type: String,
      default: null,
      index: true,
    },
    inviteeDiscountPercent: {
      type: Number,
      default: 0,
    },
    inviteeDiscountAmount: {
      type: Number,
      default: 0,
    },
    referrerRewardIssued: {
      rewardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ReferralReward",
        default: null,
      },
      rewardType: {
        type: String,
        default: null,
      },
      percent: {
        type: Number,
        default: 0,
      },
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

referralSchema.index({ referrerId: 1, status: 1, createdAt: -1 });
referralSchema.index({ createdAt: -1 });

const Referral = mongoose.model("Referral", referralSchema);

export default Referral;

