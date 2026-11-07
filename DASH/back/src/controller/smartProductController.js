import SmartProduct, { generateSmartProductSku } from "../models/SmartProduct.js";
import PhysicalCard, {
  generateInternalCardId,
  generateCardPassword6,
} from "../models/PhysicalCard.js";
import _idGenerator from "../util/idGenerator.js";
import { initializeNfcSecurityForCard } from "../services/nfc/nfcService.js";
import CardActivityLog from "../models/CardActivityLog.js";

const { generatePublicId } = _idGenerator;

// Helper to batch-generate physical items for a Smart Product
async function generatePhysicalItemsForProduct(product, count, adminUsername = "admin") {
  const safeCount = Math.min(Math.max(1, parseInt(count, 10) || 1), 500);
  const createdCards = [];
  const usedCardIds = new Set();
  const usedPublicIds = new Set();

  for (let i = 0; i < safeCount; i++) {
    let cardId;
    let publicId;

    while (!cardId || usedCardIds.has(cardId)) {
      cardId = generateInternalCardId();
    }
    usedCardIds.add(cardId);

    while (!publicId || usedPublicIds.has(publicId)) {
      publicId = generatePublicId();
    }
    usedPublicIds.add(publicId);

    const cardPassword = generateCardPassword6();

    const card = await PhysicalCard.create({
      cardId,
      publicId,
      cardPassword,
      smartProductId: product._id,
      productType: product.productType || "card",
      nfcChipType: product.nfcChipType || "NTAG215",
      cardType: product.material === "metal" ? "metal" : product.material === "wood" ? "bamboo" : "standard",
      color: product.color || "black",
      distributionType: "sale",
      status: "unclaimed",
      userId: null,
      profileId: null,
    });

    const nfcSec = await initializeNfcSecurityForCard(
      card,
      product.nfcChipType || "NTAG215",
      adminUsername
    );

    await CardActivityLog.create({
      cardId: card._id,
      action: "CARD_CREATED",
      actorType: "admin",
      actorId: adminUsername,
      details: {
        note: `تم إنشاء القطعة الذكية وربطها بالمنتج: ${product.name} (${product.productType})`,
        smartProductId: product._id,
        nfcChipType: product.nfcChipType,
      },
    });

    createdCards.push({
      ...card.toObject(),
      nfcProtectionStatus: nfcSec.nfcProtectionStatus,
    });
  }

  // Update counts on the product
  const totalCount = await PhysicalCard.countDocuments({ smartProductId: product._id });
  const claimedCount = await PhysicalCard.countDocuments({
    smartProductId: product._id,
    status: "claimed",
  });

  product.generatedCardsCount = totalCount;
  product.claimedCardsCount = claimedCount;
  await product.save();

  return createdCards;
}

// ── 1. GET ALL SMART PRODUCTS ────────────────────────────────────────────────
export const getSmartProducts = async (req, res, next) => {
  try {
    const { search, productType, nfcChipType, isActive } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { typeName: { $regex: search, $options: "i" } },
      ];
    }
    if (productType) query.productType = productType;
    if (nfcChipType) query.nfcChipType = nfcChipType;
    if (isActive !== undefined && isActive !== "") {
      query.isActive = isActive === "true" || isActive === true;
    }

    const products = await SmartProduct.find(query).sort({ createdAt: -1 }).lean();

    // Aggregate counts of generated cards per product
    const productIds = products.map((p) => p._id);
    const cardStats = await PhysicalCard.aggregate([
      { $match: { smartProductId: { $in: productIds } } },
      {
        $group: {
          _id: "$smartProductId",
          totalGenerated: { $sum: 1 },
          claimedCount: {
            $sum: { $cond: [{ $eq: ["$status", "claimed"] }, 1, 0] },
          },
          unclaimedCount: {
            $sum: { $cond: [{ $eq: ["$status", "unclaimed"] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = {};
    cardStats.forEach((s) => {
      statsMap[s._id.toString()] = s;
    });

    const enrichedProducts = products.map((prod) => {
      const stats = statsMap[prod._id.toString()] || {
        totalGenerated: 0,
        claimedCount: 0,
        unclaimedCount: 0,
      };
      return {
        ...prod,
        generatedCardsCount: stats.totalGenerated,
        claimedCardsCount: stats.claimedCount,
        unclaimedCardsCount: stats.unclaimedCount,
      };
    });

    // Overall summary statistics
    const totalInventory = enrichedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalGenerated = enrichedProducts.reduce((sum, p) => sum + (p.generatedCardsCount || 0), 0);
    const totalClaimed = enrichedProducts.reduce((sum, p) => sum + (p.claimedCardsCount || 0), 0);

    const typeBreakdown = {};
    enrichedProducts.forEach((p) => {
      const t = p.productType || "card";
      typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
    });

    res.json({
      success: true,
      products: enrichedProducts,
      stats: {
        totalProducts: enrichedProducts.length,
        totalInventory,
        totalGenerated,
        totalClaimed,
        typeBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 2. CREATE SMART PRODUCT ──────────────────────────────────────────────────
export const createSmartProduct = async (req, res, next) => {
  try {
    const {
      name,
      productType = "card",
      typeName = "",
      nfcChipType = "NTAG215",
      quantity = 0,
      color = "black",
      material = "plastic",
      price = 0,
      description = "",
      image = "",
      sku = "",
      autoGenerateUnits = false,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "اسم المنتج مطلوب" });
    }

    const finalSku = (sku || "").trim().toUpperCase() || generateSmartProductSku(productType);

    const product = await SmartProduct.create({
      name: name.trim(),
      productType,
      typeName: typeName.trim(),
      nfcChipType: (nfcChipType || "NTAG215").trim(),
      quantity: Math.max(0, parseInt(quantity, 10) || 0),
      color: (color || "black").trim(),
      material: (material || "plastic").trim(),
      price: Math.max(0, parseFloat(price) || 0),
      description: (description || "").trim(),
      image: (image || "").trim(),
      sku: finalSku,
      isActive: true,
    });

    let generatedCards = [];
    if (autoGenerateUnits && product.quantity > 0) {
      const countToGenerate = Math.min(product.quantity, 100); // cap initial auto-gen to 100 for responsiveness
      generatedCards = await generatePhysicalItemsForProduct(
        product,
        countToGenerate,
        req.admin?.username || "admin"
      );
    }

    res.status(201).json({
      success: true,
      product,
      generatedCardsCount: generatedCards.length,
    });
  } catch (error) {
    next(error);
  }
};

// ── 3. UPDATE SMART PRODUCT ──────────────────────────────────────────────────
export const updateSmartProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      productType,
      typeName,
      nfcChipType,
      quantity,
      color,
      material,
      price,
      description,
      image,
      sku,
      isActive,
    } = req.body;

    const product = await SmartProduct.findById(id);
    if (!product) {
      return res.status(404).json({ error: "المنتج الذكي غير موجود" });
    }

    if (name !== undefined) product.name = name.trim();
    if (productType !== undefined) product.productType = productType;
    if (typeName !== undefined) product.typeName = typeName.trim();
    if (nfcChipType !== undefined) product.nfcChipType = nfcChipType.trim();
    if (quantity !== undefined) product.quantity = Math.max(0, parseInt(quantity, 10) || 0);
    if (color !== undefined) product.color = color.trim();
    if (material !== undefined) product.material = material.trim();
    if (price !== undefined) product.price = Math.max(0, parseFloat(price) || 0);
    if (description !== undefined) product.description = description.trim();
    if (image !== undefined) product.image = image.trim();
    if (sku !== undefined && sku.trim()) product.sku = sku.trim().toUpperCase();
    if (isActive !== undefined) product.isActive = Boolean(isActive);

    await product.save();

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

// ── 4. DELETE SMART PRODUCT ──────────────────────────────────────────────────
export const deleteSmartProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await SmartProduct.findById(id);
    if (!product) {
      return res.status(404).json({ error: "المنتج الذكي غير موجود" });
    }

    // Detach physical cards from this product
    await PhysicalCard.updateMany({ smartProductId: id }, { $set: { smartProductId: null } });

    await SmartProduct.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "تم حذف المنتج بنجاح وفصل ارتباطه بالقطع التابعة",
    });
  } catch (error) {
    next(error);
  }
};

// ── 5. GENERATE UNITS FOR PRODUCT ────────────────────────────────────────────
export const generateUnitsForProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { count = 10 } = req.body;

    const product = await SmartProduct.findById(id);
    if (!product) {
      return res.status(404).json({ error: "المنتج الذكي غير موجود" });
    }

    const unitsCount = Math.min(Math.max(1, parseInt(count, 10) || 1), 300);

    const generatedItems = await generatePhysicalItemsForProduct(
      product,
      unitsCount,
      req.admin?.username || "admin"
    );

    res.json({
      success: true,
      count: generatedItems.length,
      items: generatedItems,
      product,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getSmartProducts,
  createSmartProduct,
  updateSmartProduct,
  deleteSmartProduct,
  generateUnitsForProduct,
};
