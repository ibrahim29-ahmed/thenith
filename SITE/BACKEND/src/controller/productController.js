import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import _asyncHandler4553 from "../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler4553;
import _httpError8715 from "../util/httpError.js";
const { HttpError } = _httpError8715;

const toPublicProduct = (product) => {
  const rawImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [];

  const cleanImages = rawImages
    .map((img) => (typeof img === "object" && img !== null ? (img.url || "") : String(img || "")))
    .filter(Boolean);

  const imagesData = rawImages
    .map((img) => {
      if (typeof img === "object" && img !== null) {
        return {
          url: img.url || "",
          color: img.color || "",
          colorName: img.colorName || "",
        };
      }
      return {
        url: String(img || ""),
        color: "",
        colorName: "",
      };
    })
    .filter((img) => Boolean(img.url));

  if (cleanImages.length === 0) {
    if (product.panelImage) cleanImages.push(product.panelImage);
    if (product.mainImage && !cleanImages.includes(product.mainImage)) cleanImages.push(product.mainImage);
    if (product.iconImage && !cleanImages.includes(product.iconImage)) cleanImages.push(product.iconImage);
    if (product.image && !cleanImages.includes(product.image)) cleanImages.push(product.image);
  }

  const primaryImage =
    cleanImages[0] ||
    product.panelImage ||
    product.mainImage ||
    product.image ||
    "";

  // Derive colors from product.colors OR from images that have colors
  let resolvedColors = Array.isArray(product.colors) && product.colors.length > 0
    ? product.colors
    : [];

  if (resolvedColors.length === 0 && imagesData.length > 0) {
    resolvedColors = imagesData
      .filter((img) => Boolean(img.color))
      .map((img, idx) => ({
        id: `color_${idx + 1}`,
        colorCode: img.color,
        name: img.colorName || img.color,
        image: img.url,
      }));
  }

  return {
    id: product._id.toString(),
    name: product.name,
    description: product.description || "",
    images: cleanImages,
    imagesData,
    colors: resolvedColors,
    image: primaryImage,
    panelImage: product.panelImage || primaryImage,
    mainImage: product.mainImage || primaryImage,
    iconImage: product.iconImage || primaryImage,
    price: product.price,
    currency: product.currency || "EGP",
    quantity: product.quantity,
    category: product.category || "",
    sku: product.sku || "",
    isCustomizable: Boolean(product.isCustomizable),
  };
};

export function invalidateProductsCache(id = null) {
  // Cleared
}

const getPublicProducts = asyncHandler(async (_request, response) => {
  response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  const products = await Product.find({ isActive: true })
    .sort({ createdAt: -1 })
    .select("name description images panelImage mainImage iconImage colors price currency quantity sku category isCustomizable")
    .lean();

  const result = { products: products.map(toPublicProduct) };
  response.json(result);
});

const getPublicProduct = asyncHandler(async (request, response) => {
  const { id } = request.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "Product not found");
  }

  response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  const product = await Product.findOne({ _id: id, isActive: true })
    .select("name description images panelImage mainImage iconImage colors price currency quantity sku category isCustomizable")
    .lean();

  if (!product) throw new HttpError(404, "Product not found");

  const result = { product: toPublicProduct(product) };
  response.json(result);
});

const getPublicCategories = asyncHandler(async (_request, response) => {
  response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const categories = await Category.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .lean();
  response.json({ categories });
});

const uploadCustomCardDesign = asyncHandler(async (request, response) => {
  const { imageData } = request.body || {};
  if (!imageData) {
    throw new HttpError(400, "Image data is required");
  }

  let base64 = String(imageData);
  const dataUriMatch = base64.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
  if (dataUriMatch) {
    base64 = base64.slice(dataUriMatch[0].length);
  }
  const cleanBase64 = base64.trim().replace(/\s+/g, "");
  const buffer = Buffer.from(cleanBase64, "base64");

  if (!buffer.length || buffer.length > 15 * 1024 * 1024) {
    throw new HttpError(400, "Image must be between 1 byte and 15 MB");
  }

  // Security Validation: Verify magic bytes header
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isWebp = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  const isGif = buffer.length >= 4 && buffer.toString("ascii", 0, 3) === "GIF";
  const isSvg = buffer.length >= 4 && buffer.toString("utf8", 0, Math.min(buffer.length, 500)).toLowerCase().includes("<svg");

  if (!isJpeg && !isPng && !isWebp && !isGif && !isSvg) {
    throw new HttpError(400, "Only genuine, safe image files (JPEG, PNG, WebP, GIF, SVG) are allowed");
  }

  if (isSvg) {
    const svgStr = buffer.toString("utf8").toLowerCase();
    if (
      svgStr.includes("<script") ||
      svgStr.includes("javascript:") ||
      svgStr.includes("onload=") ||
      svgStr.includes("onerror=") ||
      svgStr.includes("<foreignobject") ||
      svgStr.includes("<iframe")
    ) {
      throw new HttpError(400, "Unsafe script code detected in SVG");
    }
  }

  try {
    const { uploadToCloudinary } = await import("../services/uploadService.js");
    const filename = `custom_card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const uploadRes = await uploadToCloudinary(buffer, "thenith/custom_card_orders", filename);
    if (uploadRes?.secure_url) {
      return response.json({ url: uploadRes.secure_url });
    }
  } catch (err) {
    console.warn("[upload] Cloudinary upload fallback for custom card:", err?.message || err);
  }

  return response.json({ url: imageData.startsWith("data:") ? imageData : `data:image/png;base64,${cleanBase64}` });
});

export default {
  getPublicProducts,
  getPublicProduct,
  getPublicCategories,
  invalidateProductsCache,
  uploadCustomCardDesign,
};
