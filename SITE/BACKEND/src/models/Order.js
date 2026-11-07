import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: mongoose.Schema.Types.Mixed, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    selectedImage: { type: String, default: "" },
    selectedImageId: { type: String, default: "" },
    image: { type: String, default: "" },
    color: { type: mongoose.Schema.Types.Mixed, default: null },
    customDesign: { type: mongoose.Schema.Types.Mixed, default: null },
    generatedCards: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        "ORD-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Can be null for guest checkouts
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
      address: { type: String, required: true },
      city: { type: String, required: true },
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["received", "processing", "shipped", "delivered", "returned", "cancelled"],
      default: "received",
    },
    returnReason: {
      type: String,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "card", "fawry", "meeza", "online"],
      default: "cash_on_delivery",
    },
    paymentMethodName: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed", "cancelled", "expired"],
      default: "pending",
    },
    // Fawaterak intent tracking
    intentKey: { type: String, default: null }, // Fawaterak intent_key UUID
    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      unique: true,
      sparse: true,
    },
    paidAt: { type: Date, default: null },
    fawaterakRef: { type: String, default: null }, // Fawry reference code, etc.
    transactionId: { type: String, default: null }, // Fawaterak invoice_id / transaction_id
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ intentKey: 1 }, { sparse: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;
