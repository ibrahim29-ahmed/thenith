import mongoose from "mongoose";

// SKU generator for Smart Hardware Products (e.g. THN-CRD-8421, THN-MED-5920, THN-STN-1049)
export function generateSmartProductSku(type = "CRD") {
  const typeMap = {
    card: "CRD",
    keychain: "KEY",
    medal: "KEY",
    stand: "STN",
    kit: "KIT",
    sticker: "STK",
    wristband: "WRS",
    badge: "BDG",
    custom: "CST",
  };
  const prefix = typeMap[type] || (type || "PRD").toUpperCase().slice(0, 3);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `THN-${prefix}-${random}`;
}

const smartProductSchema = new mongoose.Schema(
  {
    // Product Name (e.g. كارت Thenith الذكي، ميدالية Thenith الجلدية، ستاند مكتبي أكريليك، كت رجال الأعمال)
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // Hardware Category / Form Factor
    productType: {
      type: String,
      enum: ["card", "keychain", "stand", "kit", "sticker", "wristband", "badge", "custom"],
      default: "card",
      index: true,
    },

    // Custom Type label (if custom or localized label)
    typeName: {
      type: String,
      trim: true,
      default: "",
    },

    // NFC Chip Type (e.g. NTAG215, NTAG213, NTAG216, MIFARE_CLASSIC, NTAG424_DNA)
    nfcChipType: {
      type: String,
      required: true,
      trim: true,
      default: "NTAG215",
      index: true,
    },

    // Total quantity of units in stock / manufactured
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Unique SKU / Item Code
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      default: function () {
        return generateSmartProductSku(this.productType);
      },
    },

    // Color or finishes (e.g. black, white, gold, custom)
    color: {
      type: String,
      trim: true,
      default: "black",
    },

    // Material (e.g. plastic, metal, wood/bamboo, leather, acrylic, silicone)
    material: {
      type: String,
      trim: true,
      default: "plastic",
    },

    // Optional unit price (for cost/value tracking)
    price: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Product description & manufacturing notes
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Image URL
    image: {
      type: String,
      trim: true,
      default: "",
    },

    // Status: active / discontinued
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Track generated individual cards/items in database
    generatedCardsCount: {
      type: Number,
      default: 0,
    },

    // Track claimed items
    claimedCardsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "smart_products",
  }
);

// Indexes
smartProductSchema.index({ productType: 1, nfcChipType: 1 });
smartProductSchema.index({ sku: 1 }, { unique: true, sparse: true });

const SmartProduct = mongoose.models.SmartProduct || mongoose.model("SmartProduct", smartProductSchema);

export default SmartProduct;
