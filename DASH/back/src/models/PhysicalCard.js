import mongoose from "mongoose";
import _idGenerator from "../util/idGenerator.js";
import _env from "../config/env.js";

const { env } = _env;
const { generatePublicId } = _idGenerator;

// Internal Unique Card ID generator (e.g. THN-C-A9B4C2)
export function generateInternalCardId() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude confusing chars like 0, 1, O, I
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `THN-C-${random}`;
}

// 6-digit numeric Card Password generator (numbers only, e.g. 582194)
export function generateCardPassword6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const physicalCardSchema = new mongoose.Schema(
  {
    // Unique internal identifier (e.g. THN-C-A9B4C2)
    cardId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      default: generateInternalCardId,
    },

    // Public random unique alphanumeric identifier for static URL: https://thenith.com/c/{publicId}
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

    // Product / Item name (e.g. كارت ذكي، ميدالية، ستاند طاولة، كت...)
    name: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    // Smart Product Line reference (optional)
    smartProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SmartProduct",
      default: null,
      index: true,
    },

    // Hardware item type (card, keychain, stand, kit, sticker, etc.)
    productType: {
      type: String,
      default: "card",
      index: true,
    },

    // NFC Chip Type (e.g. NTAG215, NTAG213, NTAG216, Mifare...)
    nfcChipType: {
      type: String,
      default: "NTAG215",
      trim: true,
      index: true,
    },

    // Card material/tier
    cardType: {
      type: String,
      enum: ["standard", "premium", "metal", "bamboo", "custom"],
      default: "standard",
      index: true,
    },

    // Color of the physical card
    color: {
      type: String,
      default: "black",
      trim: true,
      index: true,
    },

    // Order tracking references
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

    // Ownership status
    status: {
      type: String,
      enum: ["unclaimed", "claimed", "disabled"],
      default: "unclaimed",
      index: true,
    },

    // Dashboard internal operational status: is the card currently in printing or received
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

    // Owner user reference (null until claimed)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Linked digital profile (Card model reference, null until claimed/selected)
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      default: null,
      index: true,
    },

    // Optional manufacturing batch reference
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CardBatch",
      default: null,
      index: true,
    },

    // Distribution classification
    distributionType: {
      type: String,
      enum: ["sale", "gift", "sample", "corporate"],
      default: "sale",
      index: true,
    },

    // NFC Security Document reference
    nfcSecurityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NfcSecurity",
      default: null,
    },

    // Manufacturing and lifecycle dates
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

// Virtual for the canonical static card URL
physicalCardSchema.virtual("cardUrl").get(function () {
  const rawUrl = env?.APP_URL || env?.SITE_URL || "http://localhost:3000";
  const baseUrl = rawUrl.replace(/\/+$/, "");
  return `${baseUrl}/c/${this.publicId}`;
});

// Ensure virtuals are included in JSON/Object conversions
physicalCardSchema.set("toJSON", { virtuals: true });
physicalCardSchema.set("toObject", { virtuals: true });

// Compound indexes for fast admin querying and filtering
physicalCardSchema.index({ status: 1, color: 1, cardType: 1 });
physicalCardSchema.index({ batchId: 1, status: 1 });
physicalCardSchema.index({ userId: 1, status: 1 });

const PhysicalCard = mongoose.models.PhysicalCard || mongoose.model("PhysicalCard", physicalCardSchema);

export default PhysicalCard;
