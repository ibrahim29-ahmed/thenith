import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId, // Can be Subscription ID or Order ID
      required: true,
      index: true,
    },
    orderType: {
      type: String,
      enum: ["subscription", "store"],
      required: true,
    },
    intentKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "EGP",
    },
    provider: {
      type: String,
      default: "fawaterak",
    },
    paymentMethodId: {
      type: Number,
      default: null,
    },
    paymentMethodName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "cancelled",
        "expired",
        "refunded",
        "suspicious_amount",
      ],
      default: "pending",
      index: true,
    },
    checkoutUrl: {
      type: String,
      default: null,
    },
    paymentData: {
      type: mongoose.Schema.Types.Mixed, // Stores Fawry reference, Meeza details, etc.
      default: null,
    },
    fawaterakResponse: {
      type: mongoose.Schema.Types.Mixed, // Latest raw response
      default: null,
    },
    fawaterakLogs: [
      {
        action: String, // e.g. "create", "verify", "webhook"
        data: mongoose.Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const PaymentTransaction = mongoose.model("PaymentTransaction", paymentTransactionSchema);

export default PaymentTransaction;
