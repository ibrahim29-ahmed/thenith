import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: true, trim: true, maxlength: 200 },
      en: { type: String, default: "", trim: true, maxlength: 200 },
    },
    description: {
      ar: { type: String, default: "", maxlength: 1000 },
      en: { type: String, default: "", maxlength: 1000 },
    },
    slug: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

categorySchema.index({ isActive: 1, order: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;

