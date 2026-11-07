import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "trialing", "pending", "expired", "cancelled"],
      default: "active",
      index: true,
    },
    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly", null],
      default: null,
    },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, default: null, index: true },
    cancelledAt: { type: Date, default: null },
    cancelledBy: {
      type: String,
      enum: ["user", "admin", "system", null],
      default: null,
    },
    cancellationReason: { type: String, default: "" },
    provider: {
      type: String,
      enum: ["manual", "fawaterak", "free"],
      default: "manual",
    },
    providerSubscriptionId: { type: String, default: null },
    // Fawaterak intent tracking
    intentKey: { type: String, default: null }, // Fawaterak intent_key UUID
    paidAt: { type: Date, default: null },
    paidAmount: { type: Number, default: null },
    paymentMethod: { type: String, default: null }, // "Fawry", "Visa-Mastercard", etc.
    fawaterakRef: { type: String, default: null }, // Fawry reference code, etc.
    transactionId: { type: String, default: null }, // Fawaterak invoice_id / transaction_id
    autoRenew: { type: Boolean, default: true },
    savedCard: {
      cardToken: { type: String, default: null },
      cardTokenUniqueId: { type: String, default: null },
      cardBrand: { type: String, default: null },
      customerCard: { type: String, default: null },
      savedAt: { type: Date, default: null },
    },
    lastRenewalAt: { type: Date, default: null },
    renewalFailCount: { type: Number, default: 0 },
    expiryRemindersSent: { type: [Number], default: [] }, // Tracks [7, 3, 1] days reminders sent
  },
  { timestamps: true },
);

subscriptionSchema.index({ userId: 1, status: 1, expiresAt: 1 });
subscriptionSchema.index({ intentKey: 1 }, { sparse: true });

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
