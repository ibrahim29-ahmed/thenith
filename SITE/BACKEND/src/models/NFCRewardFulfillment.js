import mongoose from "mongoose";

const nfcRewardFulfillmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReferralReward",
      required: true,
      unique: true,
    },
    referralCountAtMilestone: {
      type: Number,
      default: 14,
    },
    status: {
      type: String,
      enum: [
        "eligible",
        "issued",
        "awaiting_details",
        "approved",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "awaiting_details",
      index: true,
    },
    shippingAddress: {
      fullName: { type: String, default: "" },
      phone: { type: String, default: "" },
      city: { type: String, default: "" },
      address: { type: String, default: "" },
      notes: { type: String, default: "" },
    },
    cardDesign: {
      printName: { type: String, default: "" },
      cardColor: { type: String, default: "black" },
      notes: { type: String, default: "" },
    },
    carrier: {
      type: String,
      default: "",
    },
    trackingNumber: {
      type: String,
      default: "",
    },
    shippedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      default: "",
    },
    history: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: String, default: "system" },
        note: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

nfcRewardFulfillmentSchema.index({ createdAt: -1 });

const NFCRewardFulfillment = mongoose.model(
  "NFCRewardFulfillment",
  nfcRewardFulfillmentSchema
);

export default NFCRewardFulfillment;

