import mongoose from "mongoose";
import Setting from "../../models/Setting.js";
import Subscription from "../../models/Subscription.js";
import Plan from "../../models/Plan.js";
import PhysicalCard from "../../models/PhysicalCard.js";
import _asyncHandler2226 from "../../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler2226;
import _httpError391 from "../../util/httpError.js";
const { HttpError } = _httpError391;
import Card, { ensurePrimaryContacts } from "../../models/Card.js";
import User from "../../models/User.js";
import ContactRequest from "../../models/ContactRequest.js";
import CustomerService from "../../models/CustomerService.js";
import ChatMessage from "../../models/ChatMessage.js";
import {
  broadcastNewMessage,
  broadcastTicketUpdate,
} from "../../services/supportBroadcast.js";
import _subscriptionService4542 from "../../services/subscriptionService.js";
const { getSubscriptionState } = _subscriptionService4542;
import _entitlements1852 from "../../util/entitlements.js";
const { canAccess, getFeatureLimit, buildPublicCardDTO } = _entitlements1852;
import _env1982 from "../../config/env.js";
const { env } = _env1982;
import jwt from "jsonwebtoken";

// ── In-Memory LRU/TTL Caching for Public Profiles ──────────────────────────────
const profileCache = new Map();
const negative404Cache = new Map();
const walletCache = new Map();
const PROFILE_CACHE_TTL_MS = 30 * 1000; // 30 seconds
const WALLET_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const NEGATIVE_CACHE_TTL_MS = 10 * 1000; // 10 seconds for 404 lookups
const MAX_CACHE_ENTRIES = 500;

export function invalidateProfileCache(identifier = null) {
  if (identifier) {
    const key = String(identifier).trim().toLowerCase();
    profileCache.delete(key);
    negative404Cache.delete(key);
    for (const [wKey] of walletCache.entries()) {
      if (wKey.startsWith(key + ":") || wKey.includes(`:${key}`)) {
        walletCache.delete(wKey);
      }
    }
  } else {
    profileCache.clear();
    negative404Cache.clear();
    walletCache.clear();
  }
}

export async function notifyProfileUpdate(userId, publicId = null, username = null, cardPublicId = null) {
  try {
    const socketService = (await import("../../services/socketService.js")).default;
    const io = await socketService.getIO().catch(() => null);
    if (!io) return;

    const payload = {
      userId: String(userId),
      publicId: publicId ? String(publicId).toLowerCase() : null,
      username: username ? String(username).toLowerCase() : null,
      cardPublicId: cardPublicId ? String(cardPublicId).toLowerCase() : null,
      timestamp: Date.now(),
    };

    const targets = new Set();
    if (userId) targets.add(`user_${userId}`);
    if (userId) targets.add(`profile_user_${userId}`);
    if (publicId) targets.add(`profile_${String(publicId).toLowerCase()}`);
    if (username) targets.add(`profile_${String(username).toLowerCase()}`);
    if (cardPublicId) targets.add(`profile_${String(cardPublicId).toLowerCase()}`);

    for (const room of targets) {
      const roomTarget = socketService.getRoomTarget(io, room);
      roomTarget?.emit("profile_updated", payload);
    }
  } catch (err) {
    // Ignore socket error
  }
}

export function invalidateProfileCacheForUser(userId, publicId = null, username = null, cardPublicId = null) {
  if (publicId) {
    const pKey = String(publicId).trim().toLowerCase();
    profileCache.delete(pKey);
    negative404Cache.delete(pKey);
  }
  if (username) {
    const uKey = String(username).trim().toLowerCase();
    profileCache.delete(uKey);
    negative404Cache.delete(uKey);
  }
  if (cardPublicId) {
    const cKey = String(cardPublicId).trim().toLowerCase();
    profileCache.delete(cKey);
    negative404Cache.delete(cKey);
  }
  const uIdStr = String(userId);
  for (const [key, val] of profileCache.entries()) {
    if (val.userId === uIdStr || (publicId && val.data?.userPublicId === publicId)) {
      profileCache.delete(key);
    }
  }

  for (const [key, val] of walletCache.entries()) {
    if (val.userId === uIdStr || (publicId && key.includes(String(publicId).toLowerCase())) || (username && key.includes(String(username).toLowerCase()))) {
      walletCache.delete(key);
    }
  }

  // Realtime notification to all connected profile visitors
  notifyProfileUpdate(userId, publicId, username, cardPublicId);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findCardById(identifier) {
  let card = null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    card = await Card.findById(identifier).lean();
  }
  if (!card) {
    const safe = escapeRegex(String(identifier).trim());
    card = await Card.findOne({
      publicId: { $regex: new RegExp(`^${safe}$`, "i") },
    }).lean();
  }
  if (!card) throw new HttpError(404, "Public card not found");
  return card;
}

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findUserByPublicIdentifier(identifier) {
  const normalized = identifier.trim().toLowerCase();
  const safeNormalized = escapeRegex(normalized);
  const user = await User.findOne({
    isActive: { $ne: false },
    $or: [
      { publicId: { $regex: new RegExp(`^${safeNormalized}$`, "i") } },
      { username: { $regex: new RegExp(`^${safeNormalized}$`, "i") } },
      ...(mongoose.Types.ObjectId.isValid(identifier) ? [{ _id: identifier }] : []),
    ],
  })
    .select("_id publicId username activeCardId isActive paymentMethods activePaymentMethodId name avatar")
    .lean();
  if (!user) throw new HttpError(404, "Public profile not found");
  return user;
}

// ── GET /p/:identifier (also /:identifier) ────────────────────────────────────
const getPublicProfile = asyncHandler(async (request, response) => {
  const identifier = request.params.identifier;
  const normalizedId = String(identifier).trim().toLowerCase();
  const now = Date.now();

  // 1. Negative 404 cache check
  const cached404 = negative404Cache.get(normalizedId);
  if (cached404 && now - cached404 < NEGATIVE_CACHE_TTL_MS) {
    throw new HttpError(404, "Public profile not found");
  }

  // 2. Positive cache check
  const cached = profileCache.get(normalizedId);
  if (cached && now - cached.timestamp < PROFILE_CACHE_TTL_MS) {
    response.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
    return response.json(cached.data);
  }

  let user = await findUserByPublicIdentifier(identifier).catch(() => null);
  let subscription = null;
  let card = null;

  if (user) {
    // Parallelize subscription and active card lookup
    [subscription, card] = await Promise.all([
      getSubscriptionState(user._id),
      Card.findActiveForUser(user._id, user.activeCardId),
    ]);

    if (
      user.username &&
      identifier.trim().toLowerCase() === user.username.toLowerCase() &&
      !canAccess(subscription.entitlements, "customLink")
    ) {
      user = null;
      card = null;
    }
  }

  if (!card) {
    card = await findCardById(identifier).catch(() => null);
    if (card) {
      [user, subscription] = await Promise.all([
        User.findOne({ _id: card.userId, isActive: { $ne: false } })
          .select("_id publicId username activeCardId isActive")
          .lean(),
        getSubscriptionState(card.userId),
      ]);
      if (!user) card = null;
    }
  }

  if (!card) {
    negative404Cache.set(normalizedId, now);
    throw new HttpError(404, "Public card not found");
  }

  const maxCards = getFeatureLimit(subscription.entitlements, "maxCards");
  const isActiveCard =
    String(card._id) === String(user?.activeCardId) ||
    card.isActive === true;

  if (maxCards !== null && !isActiveCard) {
    const earlierCards = await Card.countDocuments({
      userId: card.userId,
      createdAt: { $lt: card.createdAt },
    });
    if (earlierCards >= maxCards)
      throw new HttpError(404, "This profile is currently locked");
  }

  let cardObj = buildPublicCardDTO(card, subscription.entitlements);
  cardObj.contacts = ensurePrimaryContacts(cardObj.contacts);

  const canUseUsername =
    user?.username && canAccess(subscription.entitlements, "customLink");
  const baseUrl = env.APP_URL
    ? env.APP_URL.replace(/\/+$/, "")
    : "http://localhost:3000";
  const userIdentifier = canUseUsername
    ? user.username
    : user?.publicId || card.publicId;
  const primaryLink = `${baseUrl}/p/${userIdentifier}`;

  const responsePayload = {
    ...cardObj,
    userPublicId: user?.publicId || null,
    username: canUseUsername ? user.username : null,
    profileUrl: primaryLink,
    paymentMethods: Array.isArray(user?.paymentMethods) ? user.paymentMethods : [],
    activePaymentMethodId: user?.activePaymentMethodId || null,
  };

  // Cache positive response (LRU eviction if limit reached)
  if (profileCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = profileCache.keys().next().value;
    profileCache.delete(oldestKey);
  }
  const uIdStr = String(user?._id || card.userId);
  profileCache.set(normalizedId, { data: responsePayload, timestamp: now, userId: uIdStr });
  if (user?.publicId) {
    profileCache.set(String(user.publicId).toLowerCase(), { data: responsePayload, timestamp: now, userId: uIdStr });
  }
  if (canUseUsername && user?.username) {
    profileCache.set(String(user.username).toLowerCase(), { data: responsePayload, timestamp: now, userId: uIdStr });
  }

  response.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
  response.json(responsePayload);
});

// ── GET /m/:identifier & /public/wallet/:identifier ──────────────────────────
const resolvePublicWallet = asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const payParam = (req.query.pay || "").trim();

  let rawClean = String(identifier || "").trim();
  rawClean = rawClean.replace(/^https?:\/\/[^/]+/i, ""); // strip domain if full URL was passed
  rawClean = rawClean.replace(/^\/?(pay|m|c|p|u|wallet|public\/wallet)\//i, ""); // strip path prefixes
  rawClean = rawClean.replace(/^\/+|\/+$/g, "").trim(); // strip leading & trailing slashes

  let normalized = rawClean.toLowerCase();
  try {
    normalized = decodeURIComponent(rawClean).trim().toLowerCase();
  } catch {}
  const safeNormalized = escapeRegex(normalized);

  const cacheKey = `${normalized}:${payParam.toLowerCase()}`;
  const now = Date.now();
  if (req.query.redirect !== "true" && walletCache.has(cacheKey)) {
    const cached = walletCache.get(cacheKey);
    if (now - cached.timestamp < WALLET_CACHE_TTL_MS) {
      res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
      return res.json(cached.data);
    }
    walletCache.delete(cacheKey);
  }

  const userSelect = "_id name username publicId paymentMethods activePaymentMethodId avatar coverImage paymentPlusActive hasStandalonePaymentPlus activeCardId paymentPageSettings paymentPlusOverride isActive";

  let user = null;

  // Helper to resolve user from auth token (Bearer header or cookie accessToken / refreshToken)
  const resolveUserFromSession = async () => {
    try {
      const token = (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null) || req.cookies?.accessToken || req.cookies?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
          if (decoded?.userId) {
            const u = await User.findById(decoded.userId).select(userSelect).lean();
            if (u) return u;
          }
        } catch {}
      }
      if (req.cookies?.refreshToken) {
        try {
          const decodedRefresh = jwt.verify(req.cookies.refreshToken, env.JWT_REFRESH_SECRET);
          if (decodedRefresh?.userId) {
            const u = await User.findById(decodedRefresh.userId).select(userSelect).lean();
            if (u) return u;
          }
        } catch {}
      }
    } catch {}
    return null;
  };

  // 0. If "me" or empty identifier, try resolving from authenticated session
  if (!normalized || normalized === "me") {
    user = await resolveUserFromSession();
  }

  // 1. Direct match on User (publicId, username, _id, or any paymentMethod id / customSlug)
  if (!user && safeNormalized) {
    user = await User.findOne({
      $or: [
        { publicId: rawClean },
        { publicId: normalized },
        { publicId: { $regex: new RegExp(`^${safeNormalized}$`, "i") } },
        { username: rawClean },
        { username: normalized },
        { username: { $regex: new RegExp(`^${safeNormalized}$`, "i") } },
        ...(mongoose.Types.ObjectId.isValid(rawClean) ? [{ _id: rawClean }] : []),
        { "paymentMethods.id": rawClean },
        { "paymentMethods.customSlug": { $regex: new RegExp(`^${safeNormalized}$`, "i") } },
      ],
    })
      .select(userSelect)
      .lean();
  }

  // 2. Check if identifier belongs to a Card (Card publicId, id, link, or custom identifier)
  if (!user && safeNormalized) {
    let card = await findCardById(rawClean).catch(() => null);
    if (!card) {
      card = await Card.findOne({
        $or: [
          { publicId: rawClean },
          { publicId: normalized },
          { publicId: { $regex: new RegExp(`^${safeNormalized}$`, "i") } },
          { link: rawClean },
          { link: normalized },
          { link: { $regex: new RegExp(`(^|/)${safeNormalized}(/|$)`, "i") } },
          ...(mongoose.Types.ObjectId.isValid(rawClean) ? [{ _id: rawClean }] : []),
        ],
      }).lean().catch(() => null);
    }

    if (card && card.userId) {
      const uId = card.userId._id || card.userId;
      user = await User.findById(uId).select(userSelect).lean();
    }
  }

  // 3. Check if identifier belongs to a PhysicalCard (e.g. smart NFC / QR card)
  if (!user && safeNormalized) {
    const physCard = await PhysicalCard.findOne({
      $or: [
        { publicId: rawClean },
        { publicId: normalized },
        { publicId: { $regex: new RegExp(`^${safeNormalized}$`, "i") } },
        { cardId: rawClean.toUpperCase() },
        { cardId: { $regex: new RegExp(`^${safeNormalized}$`, "i") } },
      ],
    }).lean().catch(() => null);

    if (physCard) {
      const targetUserId = physCard.userId?._id || physCard.userId;
      if (targetUserId) {
        user = await User.findById(targetUserId).select(userSelect).lean();
      } else if (physCard.profileId) {
        const c = await Card.findById(physCard.profileId).lean().catch(() => null);
        if (c?.userId) {
          const uId = c.userId._id || c.userId;
          user = await User.findById(uId).select(userSelect).lean();
        }
      } else if (physCard.targetUrl) {
        const cleanTarget = physCard.targetUrl.trim();
        const targetParts = cleanTarget.split("/").filter(Boolean);
        const lastPart = targetParts[targetParts.length - 1] || cleanTarget;
        const safeTarget = escapeRegex(lastPart.toLowerCase());
        user = await User.findOne({
          $or: [
            { publicId: { $regex: new RegExp(`^${safeTarget}$`, "i") } },
            { username: { $regex: new RegExp(`^${safeTarget}$`, "i") } },
          ],
        }).select(userSelect).lean();
      }
    }
  }

  // 4. Authenticated session fallback if viewing from browser
  if (!user) {
    user = await resolveUserFromSession();
  }

  if (!user) {
    throw new HttpError(404, "المستخدم أو المحفظة المطلوبة غير موجودة");
  }

  // Track Payment Page Traffic: Card vs Direct Link
  const src = (req.query.src || req.query.source || req.query.ref || "").toLowerCase();
  const isCard = src === "card" || src === "nfc" || src === "qr";
  const incField = isCard ? "paymentPageSettings.analytics.cardVisits" : "paymentPageSettings.analytics.directVisits";

  User.updateOne(
    { _id: user._id },
    {
      $inc: {
        [incField]: 1,
        "paymentPageSettings.analytics.totalVisits": 1,
      },
      $set: {
        "paymentPageSettings.analytics.lastVisitAt": new Date(),
      },
    }
  ).exec().catch(() => {});

  const pageSettings = user.paymentPageSettings || {};
  // Standalone payment page branding: strictly use paymentPageSettings, do NOT fallback to user profile / activeCard
  let effectiveCover = pageSettings.coverImage || "";
  let effectiveAvatar = pageSettings.avatar || "";
  let effectiveDisplayName = pageSettings.displayName || user.name || "";
  let effectiveBio = pageSettings.description || "";

  const methods = Array.isArray(user.paymentMethods) ? user.paymentMethods.filter(Boolean) : [];

  // Check subscription entitlement for unified payment hub
  const activeSub = await Subscription.findOne({
    userId: user._id,
    status: { $in: ["active", "trialing"] },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  })
    .populate("planId")
    .lean()
    .catch(() => null);

  let hasPaymentPlus = false;
  if (user.paymentPlusOverride === "enabled") {
    hasPaymentPlus = true;
  } else if (user.paymentPlusOverride === "disabled") {
    hasPaymentPlus = false;
  } else {
    try {
      const subState = await getSubscriptionState(user._id);
      hasPaymentPlus = Boolean(
        user.paymentPlusActive ||
        user.hasStandalonePaymentPlus ||
        subState?.paymentPlusActive ||
        subState?.activePlan?.key === "payment_plus" ||
        subState?.activePlan?.key === "pro" ||
        subState?.activePlan?.features?.unifiedPaymentHub === true
      );
    } catch {
      hasPaymentPlus = Boolean(
        user.paymentPlusActive ||
        user.hasStandalonePaymentPlus ||
        (activeSub &&
         (activeSub.planId?.key === "payment_plus" ||
          activeSub.planId?.key === "pro" ||
          activeSub.planId?.features?.get?.("unifiedPaymentHub") === true ||
          activeSub.planId?.features?.unifiedPaymentHub === true))
      );
    }
  }

  // Unified hub access policy:
  // Requires user to have enabled unified hub in payment page settings AND has active Payment Plus!
  const isUnifiedHubActive = Boolean(pageSettings.isUnifiedHubEnabled && hasPaymentPlus);
  const canAccessUnifiedHub = isUnifiedHubActive;

  // Match target method by payParam (id, customSlug, provider, or name)
  let targetMethod = null;
  if (payParam) {
    const pLower = payParam.toLowerCase().trim();
    // 1. Exact match by unique ID
    targetMethod = methods.find(
      (m) => m.id && String(m.id).toLowerCase() === pLower
    );
    // 2. Exact match by customSlug
    if (!targetMethod) {
      targetMethod = methods.find(
        (m) => m.customSlug && m.customSlug.toLowerCase() === pLower
      );
    }
    // 3. Match by provider
    if (!targetMethod) {
      targetMethod = methods.find(
        (m) => m.provider && m.provider.toLowerCase() === pLower
      );
    }
    // 4. Match by name
    if (!targetMethod) {
      targetMethod = methods.find(
        (m) => m.name && m.name.toLowerCase() === pLower
      );
    }
  }

  // Fallback to active payment method or first method ONLY when NO payParam was passed
  if (!payParam && !targetMethod) {
    if (user.activePaymentMethodId) {
      targetMethod = methods.find((m) => m.id === user.activePaymentMethodId);
    }
    if (!targetMethod && methods.length > 0) {
      targetMethod = methods[0];
    }
  }

  // If direct browser redirect is requested via ?redirect=true or header
  if (req.query.redirect === "true" && targetMethod?.link) {
    let targetUrl = targetMethod.link.trim();
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = "https://" + targetUrl;
    if (/^(javascript|data|vbscript|file):/i.test(targetUrl)) {
      throw new HttpError(400, "Invalid redirect URL");
    }
    return res.redirect(targetUrl);
  }

  const panelSetting = await Setting.findOne({ key: "panel_payment_methods_config" }).lean().catch(() => null);

  const allFormattedMethods = methods.map((m) => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
    link: m.link,
    walletNumber: m.walletNumber || "",
    accountName: m.accountName || "",
    customSlug: m.customSlug,
    isActive: m.id === user.activePaymentMethodId,
  }));

  const formattedTargetMethod = targetMethod
    ? {
        id: targetMethod.id,
        name: targetMethod.name,
        provider: targetMethod.provider,
        link: targetMethod.link,
        walletNumber: targetMethod.walletNumber || "",
        accountName: targetMethod.accountName || "",
        customSlug: targetMethod.customSlug,
        isActive: targetMethod.id === user.activePaymentMethodId,
      }
    : null;

  // Determine returned methods:
  // - If specific wallet requested via payParam -> return ONLY that single target method!
  // - If user has methods -> return methods so the payment page always opens cleanly!
  let returnedMethods = [];
  if (formattedTargetMethod && payParam) {
    returnedMethods = [formattedTargetMethod];
  } else if (allFormattedMethods.length > 0) {
    returnedMethods = allFormattedMethods;
  } else if (formattedTargetMethod) {
    returnedMethods = [formattedTargetMethod];
  } else {
    returnedMethods = [];
  }

  const responseData = {
    success: true,
    user: {
      id: user._id,
      name: effectiveDisplayName,
      username: user.username,
      publicId: user.publicId,
      avatar: effectiveAvatar,
      coverImage: effectiveCover,
      bio: effectiveBio,
    },
    panelConfig: panelSetting?.value || null,
    hasPaymentPlus,
    canAccessUnifiedHub,
    method: formattedTargetMethod,
    allMethods: returnedMethods,
  };

  if (walletCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = walletCache.keys().next().value;
    walletCache.delete(oldestKey);
  }
  walletCache.set(cacheKey, {
    data: responseData,
    userId: String(user._id),
    timestamp: Date.now(),
  });

  res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
  res.json(responseData);
});

// ── POST /public/contact ──────────────────────────────────────────────────────
const submitContact = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "")
    .trim()
    .slice(0, 120);
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase()
    .slice(0, 160);
  const phone = String(req.body?.phone || "")
    .trim()
    .slice(0, 40);
  const subject = String(req.body?.subject || "رسالة تواصل من صفحة الهبوط")
    .trim()
    .slice(0, 160);
  const message = String(req.body?.message || "")
    .trim()
    .slice(0, 2000);
  if (!name || !email || !message) {
    throw new HttpError(400, "الاسم، البريد، والرسالة مطلوبة");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, "A valid email address is required");
  }

  // 1. Create ContactRequest for "صندوق الرسائل" (InboxManager)
  await ContactRequest.create({
    type: "platform_contact",
    name,
    email,
    phone: phone || "",
    subject: subject || "رسالة تواصل من صفحة الهبوط",
    message,
    isRead: false,
  });

  // 2. Create Support Ticket and Message for "الدعم الفني" (SupportDesk)
  try {
    let guestId = req.cookies?.supportGuestId || req.body?.guestId;
    if (!guestId) {
      guestId = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    const ticket = await CustomerService.create({
      guestId,
      name,
      email,
      ipAddress: req.ip,
      status: "open",
      unreadAdmin: 1,
      lastMessageAt: new Date(),
    });

    const chatMsg = await ChatMessage.create({
      customerService: ticket._id,
      senderModel: "Guest",
      senderId: guestId,
      content: message,
    });

    broadcastTicketUpdate(ticket, false).catch(() => {});
    broadcastNewMessage(chatMsg, ticket).catch(() => {});
  } catch (supportErr) {
    console.error("[submitContact] Failed to sync to SupportDesk:", supportErr.message);
  }

  res.status(201).json({ success: true, message: "تم إرسال رسالتك بنجاح." });
});

export default {
  getPublicProfile,
  resolvePublicWallet,
  submitContact,
  invalidateProfileCache,
  invalidateProfileCacheForUser,
  notifyProfileUpdate,
};
