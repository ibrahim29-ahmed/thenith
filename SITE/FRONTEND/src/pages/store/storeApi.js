import api from "../../api/index.js";

export const formatMoney = (value, currency = "EGP") => {
  let locale = "ar-EG-u-nu-latn";
  try {
    if (localStorage.getItem("global_lang") === "en") {
      locale = "en-EG";
    }
  } catch (e) {
    // Ignore
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

export const normalizeProduct = (product = {}, language = 'ar') => {
  const parseObjStr = (val) => {
    if (!val) return "";
    if (typeof val === "object") return val[language] || val.ar || val.en || "";
    if (typeof val === "string" && val.startsWith("{") && val.includes("ar:") && val.includes("en:")) {
      try {
        const arMatch = val.match(/ar:\s*['"]([^'"]+)['"]/);
        const enMatch = val.match(/en:\s*['"]([^'"]+)['"]/);
        if (language === 'ar' && arMatch) return arMatch[1];
        if (language === 'en' && enMatch) return enMatch[1];
        return (arMatch ? arMatch[1] : (enMatch ? enMatch[1] : val));
      } catch {
        return val;
      }
    }
    return val;
  };

  const getName = (nameObj) => parseObjStr(nameObj);
  const getDesc = (descObj) => parseObjStr(descObj);

  const rawImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : (product.image ? [product.image] : []);

  const cleanImages = rawImages
    .map((img) => (typeof img === "object" && img !== null ? (img.url || "") : String(img || "")))
    .filter(Boolean);

  if (cleanImages.length === 0) {
    if (product.panelImage) cleanImages.push(typeof product.panelImage === "object" ? product.panelImage.url : product.panelImage);
    if (product.mainImage && !cleanImages.includes(product.mainImage)) cleanImages.push(typeof product.mainImage === "object" ? product.mainImage.url : product.mainImage);
    if (product.iconImage && !cleanImages.includes(product.iconImage)) cleanImages.push(typeof product.iconImage === "object" ? product.iconImage.url : product.iconImage);
  }

  const primaryImage =
    (typeof product.image === "object" && product.image !== null ? product.image.url : product.image) ||
    cleanImages[0] ||
    product.panelImage ||
    product.mainImage ||
    "";

  // Derive colors array
  let rawColors = Array.isArray(product.colors) && product.colors.length > 0
    ? product.colors
    : [];

  let colors = rawColors.map((c, idx) => {
    if (!c || typeof c !== "object") {
      return {
        id: `color_${idx + 1}`,
        name: String(c || ""),
        colorCode: String(c || "#111827"),
      };
    }
    const colorName = typeof c.name === "object"
      ? (c.name[language] || c.name.ar || c.name.en || "")
      : String(c.name || c.colorName || "");

    return {
      id: c.id || c._id || `color_${idx + 1}`,
      name: colorName,
      colorCode: c.colorCode || c.hex || c.color || "#111827",
      image: c.image || "",
    };
  });

  const imagesData = Array.isArray(product.imagesData) && product.imagesData.length > 0
    ? product.imagesData
    : rawImages
        .filter((img) => typeof img === "object" && img !== null)
        .map((img) => ({
          url: img.url || "",
          color: img.color || "",
          colorName: img.colorName || "",
        }));

  if (colors.length === 0 && imagesData.length > 0) {
    colors = imagesData
      .filter((img) => Boolean(img.color))
      .map((img, idx) => ({
        id: `color_${idx + 1}`,
        colorCode: img.color,
        name: img.colorName || img.color,
        image: img.url,
      }));
  }

  return {
    id: product.id || product._id,
    name: getName(product.name),
    rawName: product.name,
    price: Number(product.price || 0),
    currency: product.currency || "EGP",
    image: primaryImage,
    panelImage: product.panelImage || primaryImage,
    mainImage: product.mainImage || primaryImage,
    iconImage: product.iconImage || primaryImage,
    images: cleanImages,
    imagesData,
    colors,
    desc: getDesc(product.description),
    features: Array.isArray(product.features) ? product.features : [],
    quantity: Number(product.quantity || 0),
    sku: product.sku || "",
    category: product.category || "",
    isCustomizable: Boolean(product.isCustomizable),
  };
};

export const loadStoreProducts = async (language = 'ar') => {
  const data = await api.products.list();
  return (data.products || []).map(p => normalizeProduct(p, language)).filter((item) => item.id);
};

export const loadStoreCategories = async (language = 'ar') => {
  try {
    const res = await api.client.get("/products/categories");
    return (res.data?.categories || []).map((cat) => ({
      ...cat,
      name: typeof cat.name === "object" ? cat.name[language] || cat.name.ar || cat.name.en || "" : cat.name,
      description: typeof cat.description === "object" ? cat.description[language] || cat.description.ar || cat.description.en || "" : cat.description,
    }));
  } catch {
    return [];
  }
};

export const getShippingRates = async () => {
  try {
    const res = await api.client.get("/shipping-rates");
    return res.data;
  } catch (err) {
    return [];
  }
};

import { getCardDraftImages, clearAllCardDraftImages } from "../../utils/customCardStorage.js";

export const prepareCustomDesignsForOrder = async (items) => {
  const preparedItems = [];
  for (const item of items) {
    if (!item.customDesign) {
      preparedItems.push(item);
      continue;
    }

    const customDesign = { ...item.customDesign };
    const frontIsHosted = typeof customDesign.image === "string" && customDesign.image.startsWith("http");
    const backIsHosted = typeof customDesign.backImage === "string" && customDesign.backImage.startsWith("http");

    if (frontIsHosted && (!customDesign.backImage || backIsHosted)) {
      preparedItems.push({ ...item, customDesign });
      continue;
    }

    // Retrieve high-res images from IndexedDB storage
    const draftImages = (await getCardDraftImages(item.cartItemId || item.id || item.productId)) || {};
    const frontToUpload = draftImages.frontImage || customDesign.image;
    const backToUpload = draftImages.backImage || customDesign.backImage;

    // Upload front high-res design to Cloudinary
    if (frontToUpload && !frontIsHosted) {
      try {
        const uploadRes = await api.client.post("/products/custom-card-design", {
          imageData: frontToUpload,
        });
        if (uploadRes.data?.url) {
          customDesign.image = uploadRes.data.url;
        }
      } catch (err) {
        console.warn("[checkout] Front card design upload failed:", err);
      }
    }

    // Upload back high-res design to Cloudinary
    if (backToUpload && !backIsHosted) {
      try {
        const uploadBackRes = await api.client.post("/products/custom-card-design", {
          imageData: backToUpload,
        });
        if (uploadBackRes.data?.url) {
          customDesign.backImage = uploadBackRes.data.url;
        }
      } catch (err) {
        console.warn("[checkout] Back card design upload failed:", err);
      }
    }

    preparedItems.push({
      ...item,
      customDesign,
    });
  }
  return preparedItems;
};

export const createOrder = async (orderData) => {
  let finalItems = orderData.items;
  if (Array.isArray(finalItems) && finalItems.some((i) => i.customDesign)) {
    finalItems = await prepareCustomDesignsForOrder(finalItems);
  }

  const res = await api.client.post("/checkout/order", {
    ...orderData,
    items: finalItems,
  });

  // Clean up draft storage upon successful order creation
  clearAllCardDraftImages().catch(() => {});

  return res.data;
};

export const validateCoupon = async (code, target = "store") => {
  const res = await api.client.post("/checkout/validate-coupon", { code, target });
  return res.data;
};

