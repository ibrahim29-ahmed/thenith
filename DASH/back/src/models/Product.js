import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: true, trim: true, maxlength: 200 },
      en: { type: String, required: true, trim: true, maxlength: 200 },
    },
    description: {
      ar: { type: String, default: "", maxlength: 2000 },
      en: { type: String, default: "", maxlength: 2000 },
    },
    images: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    panelImage: {
      type: String,
      default: "",
      trim: true,
    },
    mainImage: {
      type: String,
      default: "",
      trim: true,
    },
    iconImage: {
      type: String,
      default: "",
      trim: true,
    },
    colors: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "EGP",
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isCustomizable: {
      type: Boolean,
      default: false,
    },
    nfcChipType: {
      type: String,
      default: "NTAG215",
      trim: true,
    },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productSchema);

export default Product;
