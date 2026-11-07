import PhysicalCard, {
  generateInternalCardId,
  generateCardPassword6,
} from "../models/PhysicalCard.js";
import NfcSecurity from "../models/NfcSecurity.js";
import CardBatch from "../models/CardBatch.js";
import CardActivityLog from "../models/CardActivityLog.js";
import SmartProduct from "../models/SmartProduct.js";
import User from "../models/User.js";
import Card from "../models/Card.js";
import _idGenerator from "../util/idGenerator.js";
import {
  initializeNfcSecurityForCard,
  createProvisioningSession,
  verifyProvisioningResult,
  simulateTestProvisioning,
} from "../services/nfc/nfcService.js";
import { generateQrSvg, generateQrDataUrl } from "../services/qrService.js";
import _env from "../config/env.js";

const { env } = _env;
const { generatePublicId } = _idGenerator;

// Helper to find card by ObjectId, cardId, or publicId
async function findCardByIdentifier(identifier) {
  if (!identifier) return null;
  const trimmed = String(identifier).trim();
  let card = null;
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    card = await PhysicalCard.findById(trimmed);
  }
  if (!card) {
    let extracted = trimmed;
    try {
      if (/^https?:\/\//i.test(trimmed)) {
        const u = new URL(trimmed);
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.length > 0) extracted = parts[parts.length - 1];
      }
    } catch {}

    card = await PhysicalCard.findOne({
      $or: [
        { cardId: trimmed.toUpperCase() },
        { cardId: extracted.toUpperCase() },
        { publicId: trimmed },
        { publicId: extracted },
        { cardUrl: trimmed },
        { targetUrl: trimmed },
      ],
    });
  }
  return card;
}

// ── 1. List Cards with Filtering, Pagination, Search ──────────────────────────
export const getCards = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      color,
      cardType,
      distributionType,
      nfcProtectionStatus,
      batchId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { cardId: { $regex: s, $options: "i" } },
        { publicId: { $regex: s, $options: "i" } },
        { name: { $regex: s, $options: "i" } },
        { orderNumber: { $regex: s, $options: "i" } },
        { productName: { $regex: s, $options: "i" } },
        { targetUrl: { $regex: s, $options: "i" } },
        { cardUrl: { $regex: s, $options: "i" } },
      ];
    }

    if (status) query.status = status;
    if (color) query.color = color;
    if (cardType) query.cardType = cardType;
    const { productType, smartProductId, orderOnly, isPrinting, operationalStatus } = req.query;
    if (productType) query.productType = productType;
    if (smartProductId) query.smartProductId = smartProductId;
    if (orderOnly === "true") {
      query.orderNumber = { $exists: true, $ne: null };
    }
    if (operationalStatus !== undefined && operationalStatus !== "") {
      query.operationalStatus = operationalStatus;
    } else if (isPrinting !== undefined && isPrinting !== "") {
      query.isPrinting = isPrinting === "true";
    }
    if (distributionType) query.distributionType = distributionType;
    if (batchId) query.batchId = batchId;

    // Filter by NFC status if provided
    if (nfcProtectionStatus) {
      const matchingSecs = await NfcSecurity.find({
        nfcProtectionStatus,
      }).select("cardId");
      const cardIds = matchingSecs.map((s) => s.cardId);
      query._id = { $in: cardIds };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [cards, total] = await Promise.all([
      PhysicalCard.find(query)
        .populate("userId", "name email username avatar publicId")
        .populate("profileId", "name publicId personal.avatar")
        .populate("orderId", "orderNumber customer totalAmount status")
        .populate("batchId", "batchId name")
        .populate("smartProductId", "name productType nfcChipType sku quantity")
        .populate("nfcSecurityId")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      PhysicalCard.countDocuments(query),
    ]);

    // Format safe response
    const formattedCards = cards.map((c) => {
      const nfcSec = c.nfcSecurityId;
      return {
        ...c,
        nfcProtectionStatus: nfcSec ? nfcSec.nfcProtectionStatus : "unknown",
        nfcChipType: nfcSec ? nfcSec.nfcChipType : "NTAG215",
        nfcLastVerifiedAt: nfcSec ? nfcSec.nfcLastVerifiedAt : null,
        nfcSecurityId: undefined, // remove full security doc
        isReadyForDistribution:
          c.status === "unclaimed" &&
          nfcSec &&
          ["locked", "unlocked"].includes(nfcSec.nfcProtectionStatus),
      };
    });

    res.json({
      success: true,
      data: formattedCards,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 2. Real Statistics from MongoDB Aggregation ───────────────────────────────
export const getCardStats = async (req, res, next) => {
  try {
    const [statusAgg, nfcStatusAgg, readyAgg] = await Promise.all([
      // Aggregation by card ownership status
      PhysicalCard.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Aggregation by NFC protection status
      NfcSecurity.aggregate([
        { $group: { _id: "$nfcProtectionStatus", count: { $sum: 1 } } },
      ]),

      // Aggregation for Ready for Distribution: unclaimed + NFC locked/unlocked
      PhysicalCard.aggregate([
        { $match: { status: "unclaimed" } },
        {
          $lookup: {
            from: "nfc_securities",
            localField: "nfcSecurityId",
            foreignField: "_id",
            as: "nfcSec",
          },
        },
        { $unwind: { path: "$nfcSec", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            "nfcSec.nfcProtectionStatus": { $in: ["locked", "unlocked"] },
          },
        },
        { $count: "readyCount" },
      ]),
    ]);

    let totalCards = 0;
    let unclaimedCards = 0;
    let claimedCards = 0;
    let disabledCards = 0;

    statusAgg.forEach((s) => {
      totalCards += s.count;
      if (s._id === "unclaimed") unclaimedCards = s.count;
      if (s._id === "claimed") claimedCards = s.count;
      if (s._id === "disabled") disabledCards = s.count;
    });

    let nfcSetupPending = 0;
    let nfcErrors = 0;
    let nfcLocked = 0;

    nfcStatusAgg.forEach((n) => {
      if (n._id === "pending_setup") nfcSetupPending = n.count;
      if (n._id === "error") nfcErrors = n.count;
      if (n._id === "locked") nfcLocked = n.count;
    });

    const readyForDistribution = readyAgg[0]?.readyCount || 0;

    res.json({
      success: true,
      stats: {
        totalCards,
        unclaimedCards,
        claimedCards,
        disabledCards,
        readyForDistribution,
        nfcSetupPending,
        nfcErrors,
        nfcLocked,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 3. Create a Single Card ───────────────────────────────────────────────────
export const createCard = async (req, res, next) => {
  try {
    const {
      name = "",
      cardType = "standard",
      productType = "card",
      smartProductId = null,
      color = "black",
      distributionType = "sale",
      batchId = null,
      manufacturedAt = new Date(),
      nfcChipType = "NTAG215",
      targetUrl = "",
      cardPassword = "",
    } = req.body;

    // Generate guaranteed unique IDs
    let cardId;
    let publicId;
    let isUnique = false;

    while (!isUnique) {
      cardId = generateInternalCardId();
      publicId = generatePublicId();
      const existing = await PhysicalCard.findOne({
        $or: [{ cardId }, { publicId }],
      });
      if (!existing) isUnique = true;
    }

    const cleanPassword = (cardPassword || "").trim().replace(/\D/g, "");
    const finalPassword =
      cleanPassword.length === 6 ? cleanPassword : generateCardPassword6();

    const card = await PhysicalCard.create({
      name: (name || "").trim(),
      cardId,
      publicId,
      cardPassword: finalPassword,
      targetUrl: (targetUrl || "").trim(),
      cardType,
      productType,
      smartProductId: smartProductId || null,
      nfcChipType,
      color,
      distributionType,
      batchId: batchId || null,
      manufacturedAt,
      status: "unclaimed",
      userId: null,
      profileId: null,
    });

    // Initialize NFC security record with encrypted unique credentials
    const nfcSec = await initializeNfcSecurityForCard(
      card,
      nfcChipType,
      req.admin?.username || "admin"
    );

    // Update parent smart product count if linked
    if (smartProductId) {
      await SmartProduct.findByIdAndUpdate(smartProductId, {
        $inc: { generatedCardsCount: 1 },
      }).catch(() => {});
    }

    // Log action in audit log
    await CardActivityLog.create({
      cardId: card._id,
      action: "CARD_CREATED",
      actorType: "admin",
      actorId: req.admin?.username || "admin",
      actorIp: req.ip,
      status: "success",
      message: `Card ${card.cardId} created successfully`,
      safeMetadata: {
        cardId: card.cardId,
        publicId: card.publicId,
        cardType,
        color,
        distributionType,
        chipType: nfcChipType,
      },
    });

    const populatedCard = await PhysicalCard.findById(card._id)
      .populate("batchId", "batchId name")
      .populate("smartProductId", "name productType nfcChipType sku quantity")
      .lean({ virtuals: true });

    res.status(201).json({
      success: true,
      card: {
        ...populatedCard,
        nfcProtectionStatus: nfcSec.nfcProtectionStatus,
        nfcChipType: nfcSec.nfcChipType,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 4. Bulk Create Cards ──────────────────────────────────────────────────────
export const createBulkCards = async (req, res, next) => {
  try {
    const {
      name = "",
      quantity = 10,
      cardType = "standard",
      productType = "card",
      smartProductId = null,
      color = "black",
      distributionType = "sale",
      batchId = null,
      nfcChipType = "NTAG215",
    } = req.body;

    const count = parseInt(quantity, 10);
    if (isNaN(count) || count < 1 || count > 500) {
      return res.status(400).json({ error: "الكمية يجب أن تكون بين 1 و 500" });
    }

    const createdCards = [];
    const usedCardIds = new Set();
    const usedPublicIds = new Set();

    for (let i = 0; i < count; i++) {
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
        name: (name || "").trim(),
        cardId,
        publicId,
        cardPassword,
        cardType,
        productType,
        smartProductId: smartProductId || null,
        nfcChipType,
        color,
        distributionType,
        batchId: batchId || null,
        status: "unclaimed",
        userId: null,
        profileId: null,
      });

      const nfcSec = await initializeNfcSecurityForCard(
        card,
        nfcChipType,
        req.admin?.username || "admin"
      );

      await CardActivityLog.create({
        cardId: card._id,
        action: "CARD_CREATED",
        actorType: "admin",
        actorId: req.admin?.username || "admin",
        actorIp: req.ip,
        status: "success",
        message: `Bulk card ${card.cardId} created (${i + 1}/${count})`,
        safeMetadata: {
          cardId: card.cardId,
          publicId: card.publicId,
          batchId,
          chipType: nfcChipType,
        },
      });

      createdCards.push({
        _id: card._id,
        cardId: card.cardId,
        publicId: card.publicId,
        cardPassword: card.cardPassword,
        cardUrl: card.cardUrl,
        cardType: card.cardType,
        color: card.color,
        status: card.status,
        nfcProtectionStatus: nfcSec.nfcProtectionStatus,
      });
    }

    if (smartProductId && createdCards.length > 0) {
      await SmartProduct.findByIdAndUpdate(smartProductId, {
        $inc: { generatedCardsCount: createdCards.length },
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      count: createdCards.length,
      cards: createdCards,
    });
  } catch (error) {
    next(error);
  }
};

// ── 4.1. Bulk Update Cards Operational Status ─────────────────────────────────
export const updateBulkCardsStatus = async (req, res, next) => {
  try {
    const { cardIds, operationalStatus } = req.body;
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ error: "يجب تحديد كارت واحد على الأقل" });
    }

    const nextStatus = operationalStatus || "";
    const isPrinting = nextStatus === "in_printing";

    const updateFields = {
      operationalStatus: nextStatus,
      isPrinting,
    };
    if (isPrinting) {
      updateFields.printingStartedAt = new Date();
    }

    const result = await PhysicalCard.updateMany(
      { _id: { $in: cardIds } },
      { $set: updateFields }
    );

    try {
      await CardActivityLog.create({
        action: "CARDS_BULK_STATUS_UPDATED",
        actorType: "admin",
        actorId: req.admin?.username || "admin",
        actorIp: req.ip,
        status: "success",
        message: `Bulk operational status set to "${nextStatus || "none"}" for ${cardIds.length} cards`,
        safeMetadata: { cardIds, operationalStatus: nextStatus },
      });
    } catch (logErr) {
      console.warn("CardActivityLog bulk update failed:", logErr.message);
    }

    res.json({
      success: true,
      message: `تم تحديث حالة ${result.modifiedCount || cardIds.length} كارت بنجاح`,
      modifiedCount: result.modifiedCount,
      operationalStatus: nextStatus,
    });
  } catch (error) {
    next(error);
  }
};

// ── 5. Get Card Details ───────────────────────────────────────────────────────
export const getCardDetails = async (req, res, next) => {
  try {
    const card = await findCardByIdentifier(req.params.id);
    if (!card) return res.status(404).json({ error: "الكارت غير موجود" });

    const [populatedCard, nfcSec] = await Promise.all([
      PhysicalCard.findById(card._id)
        .populate("userId", "name email username avatar phone address role isEmailVerified createdAt publicId")
        .populate("profileId")
        .populate("batchId", "batchId name quantity")
        .lean({ virtuals: true }),
      NfcSecurity.findOne({ cardId: card._id }),
    ]);

    let profileData = populatedCard.profileId;
    if (!profileData && populatedCard.userId) {
      const uId = populatedCard.userId._id || populatedCard.userId;
      profileData =
        (await Card.findOne({ userId: uId, isActive: true }).lean({ virtuals: true })) ||
        (await Card.findOne({ userId: uId }).lean({ virtuals: true }));
    }

    res.json({
      success: true,
      card: {
        ...populatedCard,
        profileId: profileData || null,
        nfcSecurity: nfcSec ? nfcSec.toSafeObject() : null,
        isReadyForDistribution:
          populatedCard.status === "unclaimed" &&
          nfcSec &&
          ["locked", "unlocked"].includes(nfcSec.nfcProtectionStatus),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 6. Update Card Status (Disable / Re-enable) ───────────────────────────────
export const updateCardStatus = async (req, res, next) => {
  try {
    const card = await findCardByIdentifier(req.params.id);
    if (!card) return res.status(404).json({ error: "الكارت غير موجود" });

    const { status, disabledReason } = req.body;
    const oldStatus = card.status;

    if (!["unclaimed", "claimed", "disabled"].includes(status)) {
      return res.status(400).json({ error: "حالة الكارت غير صالحة" });
    }

    if (status === "disabled") {
      card.status = "disabled";
      card.disabledAt = new Date();
      card.disabledReason = disabledReason || "Administrative hold";
    } else {
      card.status = status;
      card.disabledAt = null;
      card.disabledReason = "";
    }

    await card.save();

    await CardActivityLog.create({
      cardId: card._id,
      action: status === "disabled" ? "STATUS_DISABLED" : "STATUS_REENABLED",
      actorType: "admin",
      actorId: req.admin?.username || "admin",
      actorIp: req.ip,
      status: "warning",
      message: `Card status changed from ${oldStatus} to ${status}`,
      safeMetadata: {
        previousStatus: oldStatus,
        newStatus: status,
        reason: disabledReason || "",
      },
    });

    res.json({
      success: true,
      card,
    });
  } catch (error) {
    next(error);
  }
};

// ── 6.5. Update Card Details (Target URL, Specs) ──────────────────────────────
export const updateCardDetails = async (req, res, next) => {
  try {
    const card = await findCardByIdentifier(req.params.id);
    if (!card) return res.status(404).json({ error: "الكارت غير موجود" });

    const { targetUrl, color, cardType, distributionType, batchId, isPrinting, operationalStatus } = req.body;

    if (targetUrl !== undefined) {
      card.targetUrl = (targetUrl || "").trim();
    }
    // Card password is intentionally immutable after card creation!
    // Ensure legacy cards without password get a generated 6-char password
    if (!card.cardPassword) {
      card.cardPassword = generateCardPassword6();
    }
    if (color) card.color = color;
    if (cardType) card.cardType = cardType;
    if (distributionType) card.distributionType = distributionType;
    if (batchId !== undefined) card.batchId = batchId || null;
    if (operationalStatus !== undefined) {
      card.operationalStatus = operationalStatus || "";
      card.isPrinting = operationalStatus === "in_printing";
      card.printingStartedAt = card.isPrinting ? (card.printingStartedAt || new Date()) : null;
    } else if (isPrinting !== undefined) {
      card.isPrinting = Boolean(isPrinting);
      card.operationalStatus = card.isPrinting ? "in_printing" : "";
      card.printingStartedAt = card.isPrinting ? (card.printingStartedAt || new Date()) : null;
    }

    await card.save();

    try {
      await CardActivityLog.create({
        cardId: card._id,
        action: "CARD_UPDATED",
        actorType: "admin",
        actorId: req.admin?.username || "admin",
        actorIp: req.ip,
        status: "success",
        message: `Card ${card.cardId} details updated by admin`,
        safeMetadata: {
          cardId: card.cardId,
          targetUrl: card.targetUrl,
          hasPassword: Boolean(card.cardPassword),
          isPrinting: card.isPrinting,
        },
      });
    } catch (logErr) {
      console.warn("CardActivityLog failed:", logErr.message);
    }

    const populatedCard = await PhysicalCard.findById(card._id)
      .populate("userId", "name email username avatar phone publicId")
      .populate("profileId", "name publicId personal contacts links")
      .populate("batchId", "batchId name quantity")
      .lean({ virtuals: true });

    res.json({
      success: true,
      card: populatedCard,
    });
  } catch (error) {
    next(error);
  }
};

// ── 6.8. Unlink Physical Card (Reset ownership to unclaimed) ─────────────────
export const unlinkCard = async (req, res, next) => {
  try {
    const card = await findCardByIdentifier(req.params.id);
    if (!card) return res.status(404).json({ error: "الكارت غير موجود" });

    const previousUserId = card.userId;
    const previousProfileId = card.profileId;
    const previousTargetUrl = card.targetUrl;

    card.status = "unclaimed";
    card.userId = null;
    card.profileId = null;
    card.targetUrl = "";
    card.claimedAt = null;

    await card.save();

    try {
      await CardActivityLog.create({
        cardId: card._id,
        action: "CARD_UNLINKED",
        actorType: "admin",
        actorId: req.admin?.username || "admin",
        actorIp: req.ip,
        status: "warning",
        message: `Card ${card.cardId} was unlinked from user by admin`,
        safeMetadata: {
          cardId: card.cardId,
          previousUserId,
          previousProfileId,
          previousTargetUrl,
        },
      });
    } catch (logErr) {
      console.warn("CardActivityLog failed:", logErr.message);
    }

    const populatedCard = await PhysicalCard.findById(card._id)
      .populate("userId", "name email username avatar phone address role isEmailVerified createdAt publicId")
      .populate("profileId")
      .populate("batchId", "batchId name quantity")
      .lean({ virtuals: true });

    res.json({
      success: true,
      message: "تم إلغاء ربط الكارت بنجاح وأصبح متاحاً للربط مجدداً",
      card: populatedCard,
    });
  } catch (error) {
    next(error);
  }
};

// ── 6.9. Delete Physical Card Permanently ─────────────────────────────────────
export const deleteCard = async (req, res, next) => {
  try {
    const card = await findCardByIdentifier(req.params.id);
    if (!card) return res.status(404).json({ error: "الكارت غير موجود" });

    const cardInternalId = card.cardId;
    const cardMongoId = card._id;
    const parentProductId = card.smartProductId;

    await Promise.all([
      NfcSecurity.deleteOne({ cardId: cardMongoId }),
      CardActivityLog.deleteMany({ cardId: cardMongoId }),
      PhysicalCard.deleteOne({ _id: cardMongoId }),
    ]);

    if (parentProductId) {
      await SmartProduct.findByIdAndUpdate(parentProductId, {
        $inc: { generatedCardsCount: -1 },
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: `تم حذف الكارت ${cardInternalId} نهائياً`,
    });
  } catch (error) {
    next(error);
  }
};

// ── 7. Get QR Code for Card (SVG or PNG) ──────────────────────────────────────
export const getCardQr = async (req, res, next) => {
  try {
    const card = await findCardByIdentifier(req.params.id);
    if (!card) return res.status(404).json({ error: "الكارت غير موجود" });

    const { format = "svg", download = "false" } = req.query;
    const rawUrl = env?.APP_URL || env?.SITE_URL || "http://localhost:3000";
    const baseUrl = rawUrl.replace(/\/+$/, "");
    const targetUrl = `${baseUrl}/c/${card.publicId}`;

    if (format === "svg") {
      const svg = await generateQrSvg(targetUrl);
      if (download === "true") {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="thenith-card-${card.cardId}-qr.svg"`
        );
      }
      res.setHeader("Content-Type", "image/svg+xml");
      return res.send(svg);
    }

    const dataUrl = await generateQrDataUrl(targetUrl);
    res.json({
      success: true,
      cardId: card.cardId,
      publicId: card.publicId,
      targetUrl,
      dataUrl,
    });
  } catch (error) {
    next(error);
  }
};

// ── 8. Get Card Activity Logs ─────────────────────────────────────────────────
export const getCardLogs = async (req, res, next) => {
  try {
    const card = await findCardByIdentifier(req.params.id);
    if (!card) return res.status(404).json({ error: "الكارت غير موجود" });

    const logs = await CardActivityLog.find({ cardId: card._id })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

// ── 9. NFC Provisioning: Start Session ────────────────────────────────────────
export const startNfcProvision = async (req, res, next) => {
  try {
    const card = await findCardByIdentifier(req.params.id);
    if (!card) return res.status(404).json({ error: "الكارت غير موجود" });

    const session = await createProvisioningSession(
      card._id,
      req.admin?.username || "admin",
      req.ip
    );

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
};

// ── 10. NFC Provisioning: Verify Hardware Result ──────────────────────────────
export const verifyNfcProvision = async (req, res, next) => {
  try {
    const card = await findCardByIdentifier(req.params.id);
    if (!card) return res.status(404).json({ error: "الكارت غير موجود" });

    const result = await verifyProvisioningResult({
      cardId: card._id,
      verificationData: req.body,
      actorId: req.admin?.username || "admin",
      clientIp: req.ip,
    });

    res.json({
      success: result.success,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// ── 11. NFC Simulated Test (For testing without hardware) ──────────────────────
export const simulateNfcTest = async (req, res, next) => {
  try {
    const card = await findCardByIdentifier(req.params.id);
    if (!card) return res.status(404).json({ error: "الكارت غير موجود" });

    const result = await simulateTestProvisioning(
      card._id,
      req.admin?.username || "admin",
      req.ip
    );

    res.json({
      success: result.success,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// ── 12. Card Batches: List Batches ────────────────────────────────────────────
export const getCardBatches = async (req, res, next) => {
  try {
    const batches = await CardBatch.find().sort({ createdAt: -1 }).lean();

    // Attach card stats per batch
    const batchesWithCounts = await Promise.all(
      batches.map(async (batch) => {
        const [total, unclaimed, claimed, disabled] = await Promise.all([
          PhysicalCard.countDocuments({ batchId: batch._id }),
          PhysicalCard.countDocuments({ batchId: batch._id, status: "unclaimed" }),
          PhysicalCard.countDocuments({ batchId: batch._id, status: "claimed" }),
          PhysicalCard.countDocuments({ batchId: batch._id, status: "disabled" }),
        ]);
        return {
          ...batch,
          cardCounts: {
            total,
            unclaimed,
            claimed,
            disabled,
          },
        };
      })
    );

    res.json({
      success: true,
      batches: batchesWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

// ── 13. Card Batches: Create Batch ────────────────────────────────────────────
export const createCardBatch = async (req, res, next) => {
  try {
    const {
      name,
      cardType = "standard",
      color = "black",
      quantity = 100,
      distributionType = "sale",
      notes = "",
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "اسم الدفعة مطلوب" });
    }

    const batch = await CardBatch.create({
      name: name.trim(),
      cardType,
      color,
      quantity: parseInt(quantity, 10),
      distributionType,
      notes,
    });

    res.status(201).json({
      success: true,
      batch,
    });
  } catch (error) {
    next(error);
  }
};

// ── 14. Card Batches: Batch Details & Associated Cards ────────────────────────
export const getCardBatchDetails = async (req, res, next) => {
  try {
    const batch = await CardBatch.findById(req.params.id).lean();
    if (!batch) return res.status(404).json({ error: "الدفعة غير موجودة" });

    const cards = await PhysicalCard.find({ batchId: batch._id })
      .populate("userId", "name email")
      .populate("nfcSecurityId", "nfcProtectionStatus nfcChipType")
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    res.json({
      success: true,
      batch,
      cards,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getCards,
  getCardStats,
  createCard,
  createBulkCards,
  updateBulkCardsStatus,
  getCardDetails,
  updateCardStatus,
  updateCardDetails,
  unlinkCard,
  deleteCard,
  getCardQr,
  getCardLogs,
  startNfcProvision,
  verifyNfcProvision,
  simulateNfcTest,
  getCardBatches,
  createCardBatch,
  getCardBatchDetails,
};
