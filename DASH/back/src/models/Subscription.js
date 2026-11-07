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
      enum: ["manual", "paymob", "stripe", "fawaterak", "free"],
      default: "manual",
    },
    providerSubscriptionId: { type: String, default: null },
    expiryRemindersSent: { type: [Number], default: [] }, // Tracks [7, 3, 1] milestones
  },
  { timestamps: true },
);

subscriptionSchema.index({ userId: 1, status: 1, expiresAt: 1 });
const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
