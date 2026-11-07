import mongoose from "mongoose";

const orderDraftSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
      address: { type: String, required: true },
      city: { type: String, required: true },
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: mongoose.Schema.Types.Mixed, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        color: { type: mongoose.Schema.Types.Mixed, default: null },
        customDesign: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    ],
    totalAmount: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    paymentMethod: { type: String, enum: ["online"], default: "online" },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true },
);

orderDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OrderDraft = mongoose.model("OrderDraft", orderDraftSchema);

export default OrderDraft;
