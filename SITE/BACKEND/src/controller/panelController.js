import mongoose from "mongoose";
import Card from "../models/Card.js";
import PhysicalNfcCard from "../models/PhysicalNfcCard.js";
import User from "../models/User.js";
import _subscriptionService5425 from "../services/subscriptionService.js";
const { getSubscriptionState } = _subscriptionService5425;
import _asyncHandler7986 from "../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler7986;
import _httpError5262 from "../util/httpError.js";
const { HttpError } = _httpError5262;
import _entitlements6954 from "../util/entitlements.js";
const {
  getFeatureLimit,
  canAccess,
  buildDashboardCardDTO,
  buildPublicCardDTO,
} = _entitlements6954;
import _dashboardNotifications1234 from "../util/dashboardNotifications.js";
const { notifyUser } = _dashboardNotifications1234;
import { generateGenderAvatar } from "../util/avatarGenerator.js";
import _publicProfileController from "./publicProfile/publicProfileController.js";
const { invalidateProfileCacheForUser } = _publicProfileController;

// ── Helpers ───────────────────────────────────────────────────────────────────

const publicCard = (card) => ({
  ...card.toObject(),
  id: card._id.toString(),
  _id: undefined,
});

const getOwnedCard = async (userId, cardId) => {
  const card = await Card.findOne({ _id: cardId, userId });
  if (!card) throw new HttpError(404, "Card not found");
  return card;
};

function sanitizePersonal(personal, currentPersonal, canUseCoverImage) {
  const editableKeys = [
    "fullName",
    "title",
    "company",
    "jobTitle",
    "bio",
    "avatar",
  ];
  if (canUseCoverImage) editableKeys.push("coverImage");
  const nextPersonal = { ...currentPersonal };
  for (const key of editableKeys) {
    if (personal?.[key] !== undefined) nextPersonal[key] = personal[key];
  }
  return nextPersonal;
}

function normalizeContacts(contacts) {
  const limits = { phone: 2, whatsapp: 2, email: 1, location: 1, website: 1 };
  const counts = {};
  for (const contact of contacts) {
    counts[contact.type] = (counts[contact.type] || 0) + 1;
    if (!limits[contact.type] || counts[contact.type] > limits[contact.type])
      throw new HttpError(400, `Contact type limit exceeded: ${contact.type}`);
  }
  for (const type of ["phone", "whatsapp"]) {
    const typedContacts = contacts.filter((contact) => contact.type === type);
    if (!typedContacts.length) continue;
    const primaryIndex = typedContacts.findIndex((contact) => contact.primary);
    typedContacts.forEach((contact, index) => {
      contact.primary = primaryIndex < 0 ? index === 0 : index === primaryIndex;
    });
  }
  return contacts;
}

// ── GET /api/cards ────────────────────────────────────────────────────────────
const getCards = asyncHandler(async (request, response) => {
  const allCards = await Card.find({ userId: request.user._id })
    .populate("userId", "username publicId")
    .sort({ createdAt: 1 });

  const maxCards = getFeatureLimit(
    request.subscription.entitlements,
    "maxCards",
  );
  const totalStored = allCards.length;
  const accessibleCards =
    maxCards !== null ? allCards.slice(0, maxCards) : allCards;
  const hiddenCount = totalStored - accessibleCards.length;

  response.json({
    cards: accessibleCards.map((c) =>
      buildDashboardCardDTO(publicCard(c), request.subscription.entitlements),
    ),
    entitlement: {
      feature: "cards",
      enabled: true,
      limit: maxCards ?? null,
      used: accessibleCards.length,
      totalStored,
      hiddenCount,
    },
  });
});

// ── POST /api/cards ───────────────────────────────────────────────────────────
const createCard = asyncHandler(async (request, response) => {
  let card;
  let count;
  const session = await Card.startSession();
  try {
    await session.withTransaction(async () => {
      count = await Card.countDocuments({ userId: request.user._id }).session(
        session,
      );
      const maxCards = getFeatureLimit(
        request.subscription.entitlements,
        "maxCards",
      );
      if (maxCards !== null && count >= maxCards) {
        throw new HttpError(
          403,
          "Your current plan has reached its card limit",
        );
      }
      const cardName = request.body?.name?.trim() || `Card ${count + 1}`;
      const userName = request.user.name || cardName;
      const seed = `${userName}-${count + 1}-${Date.now().toString().slice(-4)}`;
      const autoAvatar = generateGenderAvatar(seed, seed);

      [card] = await Card.create(
        [
          {
            userId: request.user._id,
            name: cardName,
            isActive: count === 0,
            theme: "default",
            personal: {
              fullName: request.user.name || "",
              avatar: autoAvatar,
            },
            links: [],
            contacts: [],
          },
        ],
        { session },
      );
      if (count === 0) {
        request.user.activeCardId = card._id;
        await request.user.save({ session });
      }
    });
  } finally {
    session.endSession();
  }
  await card.populate("userId", "username publicId");
  invalidateProfileCacheForUser(
    request.user._id,
    request.user.publicId,
    request.user.username,
    updatedCard?.publicId,
  );
  response.status(201).json({
    card: buildDashboardCardDTO(
      publicCard(card),
      request.subscription.entitlements,
    ),
  });
});

// ── PATCH /api/cards/:cardId ──────────────────────────────────────────────────
const updateCard = asyncHandler(async (request, response) => {
  const card = await getOwnedCard(request.user._id, request.params.cardId);
  const maxCards = getFeatureLimit(
    request.subscription.entitlements,
    "maxCards",
  );
  if (maxCards !== null) {
    const earlierCards = await Card.countDocuments({
      userId: request.user._id,
      createdAt: { $lt: card.createdAt },
    });
    if (earlierCards >= maxCards) {
      throw new HttpError(
        403,
        "This card is locked because it exceeds your current plan's limits",
      );
    }
  }
  const allowed = ["name", "personal", "contacts", "links", "actionType", "calendarSettings", "theme"];
  if (
    Array.isArray(request.body?.links) &&
    !canAccess(request.subscription.entitlements, "reorderLinks")
  ) {
    const currentIds = card.links.map((link) => link.id);
    const incomingIds = new Set(request.body.links.map((link) => link.id));
    const expectedOrder = currentIds.filter((id) => incomingIds.has(id));
    const actualOrder = request.body.links
      .map((link) => link.id)
      .filter((id) => currentIds.includes(id));
    if (actualOrder.join("|") !== expectedOrder.join("|"))
      throw new HttpError(403, "Link ordering is available on the Pro plan");
  }
  const updates = {};
  for (const key of allowed) {
    if (request.body?.[key] !== undefined) updates[key] = request.body[key];
  }
  if (updates.links !== undefined) {
    const maxLinks = getFeatureLimit(
      request.subscription.entitlements,
      "maxLinks",
    );
    if (maxLinks !== null) {
      if (updates.links.length > maxLinks) {
        throw new HttpError(
          403,
          `PLAN_LIMIT_REACHED: Your current plan allows a maximum of ${maxLinks} links.`,
        );
      }
      const hiddenIds = new Set(
        card.links.slice(maxLinks).map((link) => link.id),
      );
      for (const incomingLink of updates.links) {
        if (incomingLink.id && hiddenIds.has(incomingLink.id)) {
          throw new HttpError(
            403,
            "You cannot modify or reorder a link that is hidden by your current plan.",
          );
        }
      }
      let hiddenLinks = [];
      if (card.links.length > maxLinks)
        hiddenLinks = card.links.slice(maxLinks);
      updates.links = [...updates.links, ...hiddenLinks];
    }
    updates.links = updates.links.map((item, index) => ({
      ...item,
      order: index,
    }));
  }
  if (updates.contacts !== undefined) {
    if (!canAccess(request.subscription.entitlements, "contactMethods")) {
      delete updates.contacts;
    } else {
      updates.contacts = normalizeContacts(updates.contacts).map(
        (item, index) => ({ ...item, order: index }),
      );
    }
  }
  if (!canAccess(request.subscription.entitlements, "calendarBooking")) {
    if (updates.actionType === "calendar") {
      updates.actionType = "form";
    }
    delete updates.calendarSettings;
  }

  if (!canAccess(request.subscription.entitlements, "themeSelection") && updates.theme !== undefined) {
    delete updates.theme;
  }

  if (!canAccess(request.subscription.entitlements, "coverImage") && updates.personal) {
    updates.personal = { ...updates.personal };
    delete updates.personal.coverImage;
  }
  if (updates.personal !== undefined) {
    updates.personal = sanitizePersonal(
      updates.personal,
      card.personal?.toObject?.() || card.personal || {},
      canAccess(request.subscription.entitlements, "coverImage"),
    );
  }
  const setUpdates = { ...updates };
  if (setUpdates.personal) {
    const personal = setUpdates.personal;
    delete setUpdates.personal;
    for (const [key, value] of Object.entries(personal)) {
      setUpdates[`personal.${key}`] = value;
    }
  }
  const updatedCard = await Card.findOneAndUpdate(
    { _id: request.params.cardId, userId: request.user._id },
    { $set: setUpdates },
    { new: true, runValidators: true },
  ).populate("userId", "username publicId");
  if (!updatedCard) throw new HttpError(404, "Card not found");

  invalidateProfileCacheForUser(
    request.user._id,
    request.user.publicId,
    request.user.username,
    updatedCard?.publicId,
  );

  response.json({
    card: buildDashboardCardDTO(
      publicCard(updatedCard),
      request.subscription.entitlements,
    ),
  });
});

// ── PATCH /api/cards/:cardId/links/reorder ────────────────────────────────────
const reorderLinks = asyncHandler(async (request, response) => {
  const card = await getOwnedCard(request.user._id, request.params.cardId);
  if (!canAccess(request.subscription.entitlements, "reorderLinks"))
    throw new HttpError(403, "Link ordering is available on the Pro plan");
  const requestedIds = request.body?.linkIds;
  if (!Array.isArray(requestedIds) || requestedIds.length !== card.links.length)
    throw new HttpError(400, "linkIds must contain every card link");
  const existingIds = new Set(card.links.map((link) => link.id));
  if (
    new Set(requestedIds).size !== requestedIds.length ||
    requestedIds.some((id) => !existingIds.has(id))
  ) {
    throw new HttpError(
      400,
      "linkIds must contain each existing card link once",
    );
  }
  const byId = new Map(card.links.map((link) => [link.id, link]));
  const links = requestedIds.map((id, order) => ({ ...byId.get(id), order }));
  const updatedCard = await Card.findOneAndUpdate(
    { _id: request.params.cardId, userId: request.user._id },
    { $set: { links } },
    { new: true, runValidators: true },
  ).populate("userId", "username publicId");
  if (!updatedCard) throw new HttpError(404, "Card not found");
  invalidateProfileCacheForUser(
    request.user._id,
    request.user.publicId,
    request.user.username,
    updatedCard?.publicId,
  );
  response.json({
    card: buildDashboardCardDTO(
      publicCard(updatedCard),
      request.subscription.entitlements,
    ),
  });
});

// ── DELETE /api/cards/:cardId ─────────────────────────────────────────────────
const deleteCard = asyncHandler(async (request, response) => {
  const deletedCard = await Card.findOne({
    _id: request.params.cardId,
    userId: request.user._id,
  });
  const result = await Card.deleteOne({
    _id: request.params.cardId,
    userId: request.user._id,
  });
  if (!result.deletedCount) throw new HttpError(404, "Card not found");
  if (deletedCard?.isActive) {
    const replacement = await Card.findOne({ userId: request.user._id }).sort({
      createdAt: 1,
    });
    if (replacement) {
      replacement.isActive = true;
      await replacement.save();
      request.user.activeCardId = replacement._id;
      await request.user.save();
    } else {
      request.user.activeCardId = null;
      await request.user.save();
    }
  }
  invalidateProfileCacheForUser(
    request.user._id,
    request.user.publicId,
    request.user.username,
    updatedCard?.publicId,
  );
  response.status(204).send();
});

// ── GET /api/cards/public/:cardId ─────────────────────────────────────────────
const getPublicCard = asyncHandler(async (request, response) => {
  const { cardId } = request.params;
  let card = null;
  if (mongoose.Types.ObjectId.isValid(cardId)) {
    card = await Card.findById(cardId);
  }
  if (!card) card = await Card.findOne({ publicId: cardId });
  if (!card) throw new HttpError(404, "Card not found");
  const subscription = await getSubscriptionState(card.userId);
  response.json({
    card: buildPublicCardDTO(publicCard(card), subscription.entitlements),
  });
});

// ── POST /api/cards/nfc-payload ───────────────────────────────────────────────
// Returns the safe canonical NFC URL for the authenticated user's active card.
// Backend is the sole authority: determines URL from authenticated session.
export const getNfcPayload = asyncHandler(async (request, response) => {
  const user = request.user;
  const subscription = request.subscription;

  // 1. Verify account is active
  if (!user.isActive) {
    throw new HttpError(403, "ACCOUNT_INACTIVE");
  }

  // 2. Verify subscription allows NFC linking (any active subscriber can link)
  const planKey = subscription?.entitlements?.plan;
  if (!planKey) {
    throw new HttpError(403, "NO_ACTIVE_SUBSCRIPTION");
  }

  // 3. Find the user's active card
  const maxCards = getFeatureLimit(subscription.entitlements, "maxCards");
  const allCards = await Card.find({ userId: user._id }).sort({ createdAt: 1 }).lean();
  const allowedCards = maxCards !== null ? allCards.slice(0, maxCards) : allCards;

  if (allowedCards.length === 0) {
    throw new HttpError(404, "NO_CARD_FOUND");
  }

  // 4. Determine canonical public URL (same logic as frontend useDashboardData)
  // Username takes priority, then publicId from the active card
  const activeCardId = user.activeCardId;
  const activeCard = activeCardId
    ? allowedCards.find(c => String(c._id) === String(activeCardId)) || allowedCards[0]
    : allowedCards[0];

  const username = user.username?.trim();
  const publicId = user.publicId?.trim() || activeCard?.publicId;

  // Determine base URL from request origin or env
  const appBaseUrl = process.env.APP_URL?.trim().replace(/\/$/, "") || `${request.protocol}://${request.get("host")}`;
  const nfcUrl = username
    ? `${appBaseUrl}/p/${username}`
    : `${appBaseUrl}/p/${publicId}`;

  // 5. Return ONLY the sanitized NFC URL — no user data, no tokens, no secrets
  response.json({
    success: true,
    data: {
      nfcUrl,
      cardName: activeCard?.name || null,
    },
  });
});

// ── POST /api/cards/nfc-linked ────────────────────────────────────────────────
// Records that the NFC write was successful. Called AFTER the write is verified.
export const recordNfcLinked = asyncHandler(async (request, response) => {
  const user = request.user;
  const subscription = request.subscription;

  if (!user.isActive) throw new HttpError(403, "ACCOUNT_INACTIVE");
  if (!subscription?.entitlements?.plan) throw new HttpError(403, "NO_ACTIVE_SUBSCRIPTION");

  // Find active card and mark it as NFC-linked
  const card = await Card.findActiveForUser(user._id, user.activeCardId);

  if (!card) throw new HttpError(404, "NO_CARD_FOUND");

  card.nfcLinkedAt = new Date();
  await card.save();

  response.json({ success: true });
});

// ── Physical NFC Card Registry ────────────────────────────────────────────────

// GET /api/cards/physical — List all registered physical NFC cards for user
export const listPhysicalCards = asyncHandler(async (request, response) => {
  const cards = await PhysicalNfcCard.find({ userId: request.user._id })
    .sort({ createdAt: -1 })
    .lean();
  response.json({ success: true, data: cards });
});

// POST /api/cards/physical/register — Verify & register a physical card by its scanned URL
export const registerPhysicalCard = asyncHandler(async (request, response) => {
  const {
    scannedUrl,
    label,
    serialNumber,   // NFC tag UID  e.g. "04:ab:cd:12:34:56:78"
    tagType,        // chip type if detectable  e.g. "NTAG215"
    signature,      // ECC originality signature (native apps only)
    ndefRecords,    // full NDEF records array from the scan
    scanMeta,       // any extra metadata from the browser
  } = request.body;

  const authenticatedUser = request.user;

  if (!scannedUrl || typeof scannedUrl !== "string") {
    throw new HttpError(400, "scannedUrl is required");
  }

  const cleanUrl = scannedUrl.trim();

  // 1. Extract the identifier segment from the URL path
  let identifier;
  try {
    const parsed = new URL(cleanUrl);
    const parts  = parsed.pathname.replace(/^\//, "").split("/").filter(Boolean);
    identifier = parts.length >= 2 && ["p", "u"].includes(parts[0])
      ? parts[1]
      : parts[0];
  } catch {
    identifier = cleanUrl.replace(/^\//, "").split("/").filter(Boolean)[0] || "";
  }

  if (!identifier) throw new HttpError(400, "INVALID_PROFILE_URL");


  // 2. Query DB — find user by username OR publicId
  const profileUser = await User.findOne({
    $or: [
      { username: identifier.toLowerCase() },
      { publicId: identifier.toLowerCase() },
    ],
  }).select("_id username publicId email");



  if (!profileUser) throw new HttpError(404, "PROFILE_NOT_FOUND");

  // 3. Verify ownership
  if (String(profileUser._id) !== String(authenticatedUser._id)) {
    throw new HttpError(403, "URL_NOT_YOURS");
  }

  // 4. Sanitize ndefRecords array (only keep safe string fields)
  const safeRecords = Array.isArray(ndefRecords)
    ? ndefRecords.map(r => ({
        recordType: r.recordType ? String(r.recordType).slice(0, 50)   : undefined,
        mediaType:  r.mediaType  ? String(r.mediaType).slice(0, 100)   : undefined,
        id:         r.id         ? String(r.id).slice(0, 100)          : undefined,
        encoding:   r.encoding   ? String(r.encoding).slice(0, 20)     : undefined,
        lang:       r.lang       ? String(r.lang).slice(0, 10)         : undefined,
        data:       r.data       ? String(r.data).slice(0, 2048)       : undefined,
      }))
    : [];

  // 5. Idempotent — update if already registered
  const existing = await PhysicalNfcCard.findOne({ userId: authenticatedUser._id, scannedUrl: cleanUrl });
  if (existing) {
    existing.lastScannedAt = new Date();
    if (label        !== undefined) existing.label        = String(label).slice(0, 80);
    if (serialNumber !== undefined) existing.serialNumber = String(serialNumber).slice(0, 100);
    if (tagType      !== undefined) existing.tagType      = String(tagType).slice(0, 50);
    if (signature    !== undefined) existing.signature    = String(signature).slice(0, 500);
    if (safeRecords.length)         existing.ndefRecords  = safeRecords;
    if (scanMeta     !== undefined) existing.scanMeta     = scanMeta;
    await existing.save();
    return response.json({ success: true, data: existing, alreadyRegistered: true });
  }

  // 6. Create new registration with full card data
  const card = await PhysicalNfcCard.create({
    userId:       authenticatedUser._id,
    scannedUrl:   cleanUrl,
    label:        label        ? String(label).slice(0, 80)          : "",
    serialNumber: serialNumber ? String(serialNumber).slice(0, 100)  : null,
    tagType:      tagType      ? String(tagType).slice(0, 50)        : null,
    signature:    signature    ? String(signature).slice(0, 500)     : null,
    ndefRecords:  safeRecords,
    scanMeta:     scanMeta     || null,
    lastScannedAt: new Date(),
  });

  response.status(201).json({ success: true, data: card });
});


// DELETE /api/cards/physical/:id — Remove a registered physical card
export const deletePhysicalCard = asyncHandler(async (request, response) => {
  const { id } = request.params;
  const card = await PhysicalNfcCard.findOne({ _id: id, userId: request.user._id });
  if (!card) throw new HttpError(404, "CARD_NOT_FOUND");
  await card.deleteOne();
  response.json({ success: true });
});

export default {
  publicCard,
  getCards,
  createCard,
  updateCard,
  reorderLinks,
  deleteCard,
  getPublicCard,
  getNfcPayload,
  recordNfcLinked,
  listPhysicalCards,
  registerPhysicalCard,
  deletePhysicalCard,
};
