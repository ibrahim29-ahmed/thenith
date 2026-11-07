import mongoose from "mongoose";

const policySectionSchema = new mongoose.Schema(
  {
    heading: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ ar: "", en: "" }),
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ ar: "", en: "" }),
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const policySchema = new mongoose.Schema(
  {
    title: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: () => ({ ar: "", en: "" }),
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ ar: "", en: "" }),
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    sections: {
      type: [policySectionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

policySchema.index({ status: 1, displayOrder: 1 });

const Policy = mongoose.models.Policy || mongoose.model("Policy", policySchema);
export default Policy;
