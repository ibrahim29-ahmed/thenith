import mongoose from "mongoose";
import _idGenerator from "../util/idGenerator.js";
import _env from "../config/env.js";

const { env } = _env;
const { generatePublicId } = _idGenerator;

export function generateInternalCardId() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `THN-C-${random}`;
}

export function generateCardPassword6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const physicalCardSchema = new mongoose.Schema(
  {
    cardId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      default: generateInternalCardId,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      default: () => generatePublicId(),
    },
    // 6-character alphanumeric card password (numbers and letters)
    cardPassword: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: generateCardPassword6,
    },
    // Optional direct redirect destination: user publicId / username / full URL
    targetUrl: {
      type: String,
      default: "",
      trim: true,
    },
    cardType: {
      type: String,
      enum: ["standard", "premium", "metal", "bamboo", "custom"],
      default: "standard",
      index: true,
    },
    color: {
      type: String,
      default: "black",
      trim: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    orderNumber: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    orderColor: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    productName: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["unclaimed", "claimed", "disabled"],
      default: "unclaimed",
      index: true,
    },
    operationalStatus: {
      type: String,
      enum: ["in_printing", "received", "pending", ""],
      default: "",
      index: true,
    },
    isPrinting: {
      type: Boolean,
      default: false,
      index: true,
    },
    printingStartedAt: {
      type: Date,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      default: null,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CardBatch",
      default: null,
      index: true,
    },
    distributionType: {
      type: String,
      enum: ["sale", "gift", "sample", "corporate"],
      default: "sale",
      index: true,
    },
    nfcSecurityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NfcSecurity",
      default: null,
    },
    manufacturedAt: {
      type: Date,
      default: Date.now,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    disabledAt: {
      type: Date,
      default: null,
    },
    disabledReason: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: "physical_cards",
  }
);

physicalCardSchema.virtual("cardUrl").get(function () {
  const rawUrl = env?.APP_URL || env?.SITE_URL || "http://localhost:3000";
  const baseUrl = rawUrl.replace(/\/+$/, "");
  return `${baseUrl}/c/${this.publicId}`;
});

physicalCardSchema.set("toJSON", { virtuals: true });
physicalCardSchema.set("toObject", { virtuals: true });

physicalCardSchema.index({ status: 1, color: 1, cardType: 1 });
physicalCardSchema.index({ batchId: 1, status: 1 });
physicalCardSchema.index({ userId: 1, status: 1 });

const PhysicalCard = mongoose.models.PhysicalCard || mongoose.model("PhysicalCard", physicalCardSchema);

export default PhysicalCard;
