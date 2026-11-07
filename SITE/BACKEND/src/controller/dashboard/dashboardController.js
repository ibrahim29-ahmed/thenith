import Card from "../../models/Card.js";
import Setting from "../../models/Setting.js";
import Subscription from "../../models/Subscription.js";
import Appointment from "../../models/Appointment.js";
import ContactRequest from "../../models/ContactRequest.js";
import _asyncHandler5014 from "../../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler5014;
import _httpError2650 from "../../util/httpError.js";
const { HttpError } = _httpError2650;
import _entitlements5136 from "../../util/entitlements.js";
const { getFeatureLimit } = _entitlements5136;
import _dashboardNotifications8195 from "../../util/dashboardNotifications.js";
const { addClient, removeClient } = _dashboardNotifications8195;
import _dashboardResponse2010 from "../../util/dashboardResponse.js";
const { buildActiveCardResponse, buildDashboardResponse } =
  _dashboardResponse2010;
import { invalidateProfileCacheForUser } from "../publicProfile/publicProfileController.js";

// ── GET /api/dashboard/stream (SSE) ──────────────────────────────────────────
const streamNotifications = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": connected\n\n");
  if (typeof res.flush === "function") res.flush();

  const userId = req.user._id.toString();
  addClient(userId, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
      if (typeof res.flush === "function") res.flush();
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
};

// ── GET /api/dashboard ────────────────────────────────────────────────────────
const getDashboard = asyncHandler(async (request, response) => {
  const allCards = await Card.find({ userId: request.user._id }).sort({
    createdAt: 1,
  });

  const totalStored = allCards.length;
  const maxCards = getFeatureLimit(request.subscription.entitlements, "maxCards");

  const selectedCard =
    allCards.find((card) => card._id.equals(request.user.activeCardId)) ||
    allCards.find((card) => card.isActive) ||
    allCards[0];

  if (selectedCard) {
    await Card.updateMany(
      { userId: request.user._id, _id: { $ne: selectedCard._id } },
      { $set: { isActive: false } },
    );
    if (!selectedCard.isActive) {
      selectedCard.isActive = true;
      await selectedCard.save();
    }
    if (!request.user.activeCardId?.equals(selectedCard._id)) {
      request.user.activeCardId = selectedCard._id;
      await request.user.save();
    }
  }

  response.json(
    await buildDashboardResponse({
      user: request.user,
      cards: maxCards !== null ? allCards.slice(0, maxCards) : allCards,
      subscription: request.subscription,
      totalStored,
      activeCard: selectedCard,
    }),
  );
});

// ── PATCH /api/dashboard/active-card ─────────────────────────────────────────
const setActiveCard = asyncHandler(async (request, response) => {
  const card = await Card.findOne({
    _id: request.body?.cardId,
    userId: request.user._id,
  });
  if (!card)
    return response
      .status(404)
      .json({ error: { code: "CARD_NOT_FOUND", message: "Card not found" } });

  const maxCards = getFeatureLimit(request.subscription.entitlements, "maxCards");
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

  await Card.updateMany(
    { userId: request.user._id },
    { $set: { isActive: false } },
  );
  card.isActive = true;
  await card.save();
  request.user.activeCardId = card._id;
  await request.user.save();

  invalidateProfileCacheForUser(
    request.user._id,
    request.user.publicId,
    request.user.username,
    card.publicId,
  );

  const allCards = await Card.find({ userId: request.user._id }).sort({
    createdAt: 1,
  });
  response.json(
    await buildActiveCardResponse({
      user: request.user,
      cards: allCards,
      subscription: request.subscription,
      activeCard: card,
    }),
  );
});

// ── DELETE /api/dashboard/cards/:cardId/requests/:requestId ──────────────────
const deleteRequest = asyncHandler(async (req, res) => {
  const { cardId, requestId } = req.params;
  const card = await Card.findOne({ _id: cardId, userId: req.user._id });
  if (!card) throw new HttpError(404, "Card not found");
  await ContactRequest.deleteOne({ _id: requestId, cardId });
  card.requests = card.requests.filter((r) => r.id !== requestId);
  card.markModified("requests");
  await card.save();
  res.status(204).send();
});

// ── DELETE /api/dashboard/cards/:cardId/appointments/:appointmentId ───────────
const deleteAppointment = asyncHandler(async (req, res) => {
  const { cardId, appointmentId } = req.params;
  const card = await Card.findOne({ _id: cardId, userId: req.user._id });
  if (!card) throw new HttpError(404, "Card not found");
  await Appointment.deleteOne({ _id: appointmentId, cardId });
  card.appointments = card.appointments.filter((a) => a.id !== appointmentId);
  card.markModified("appointments");
  await card.save();
  res.status(204).send();
});

// ── PUT /api/dashboard/cards/:cardId/requests/:requestId/read ────────────────
const markRequestRead = asyncHandler(async (req, res) => {
  const { cardId, requestId } = req.params;
  const card = await Card.findOne({ _id: cardId, userId: req.user._id });
  if (!card) throw new HttpError(404, "Card not found");
  let updated = false;
  card.requests = card.requests.map((r) => {
    if (r.id === requestId && !r.read) {
      updated = true;
      return { ...r, read: true };
    }
    return r;
  });
  if (updated) {
    card.markModified("requests");
    await card.save();
  }
  res.json({ success: true });
});

// ── PUT /api/dashboard/cards/:cardId/appointments/:appointmentId/read ─────────
const markAppointmentRead = asyncHandler(async (req, res) => {
  const { cardId, appointmentId } = req.params;
  const card = await Card.findOne({ _id: cardId, userId: req.user._id });
  if (!card) throw new HttpError(404, "Card not found");
  let updated = false;
  card.appointments = card.appointments.map((a) => {
    if (a.id === appointmentId && !a.read) {
      updated = true;
      return { ...a, read: true };
    }
    return a;
  });
  if (updated) {
    card.markModified("appointments");
    await card.save();
  }
  res.json({ success: true });
});

// ── GET /api/dashboard/payment-methods ────────────────────────────────────────
const getPaymentMethods = asyncHandler(async (req, res) => {
  const user = req.user;
  const [panelSetting, activeSub] = await Promise.all([
    Setting.findOne({ key: "panel_payment_methods_config" }).lean().catch(() => null),
    Subscription.findOne({
      userId: user._id,
      status: { $in: ["active", "trialing"] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    })
      .populate("planId")
      .lean()
      .catch(() => null),
  ]);

  let hasPaymentPlus = false;
  if (user.paymentPlusOverride === "enabled") {
    hasPaymentPlus = true;
  } else if (user.paymentPlusOverride === "disabled") {
    hasPaymentPlus = false;
  } else {
    hasPaymentPlus = Boolean(
      user.paymentPlusActive ||
      (activeSub &&
       (activeSub.planId?.key === "payment_plus" ||
        activeSub.planId?.key === "pro" ||
        activeSub.planId?.features?.get?.("unifiedPaymentHub") === true ||
        activeSub.planId?.features?.unifiedPaymentHub === true))
    );
  }

  res.json({
    user: {
      username: user.username,
      publicId: user.publicId,
      name: user.name,
    },
    paymentMethods: user.paymentMethods || [],
    activePaymentMethodId:
      user.activePaymentMethodId ||
      (user.paymentMethods && user.paymentMethods.length > 0
        ? user.paymentMethods[0].id
        : null),
    panelConfig: panelSetting?.value || null,
    hasPaymentPlus,
    paymentPageSettings: user.paymentPageSettings || null,
  });
});

// ── POST /api/dashboard/payment-methods ───────────────────────────────────────
function sanitizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return "";
  }
  return trimmed.slice(0, 500);
}

const createPaymentMethod = asyncHandler(async (req, res) => {
  const { name, provider, link, walletNumber, accountName, customSlug, customLink } = req.body;
  if (!name || !name.trim()) {
    throw new HttpError(400, "Name is required");
  }

  const user = req.user;
  if (!user.paymentMethods) user.paymentMethods = [];
  if (user.paymentMethods.length >= 25) {
    throw new HttpError(400, "وصلت للحد الأقصى لوسائل الدفع (25 وسيلة)");
  }

  const isFirst = user.paymentMethods.length === 0;
  const id = `pm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const cleanSlug = (customSlug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);

  const newMethod = {
    id,
    name: name.trim().slice(0, 80),
    provider: (provider || "vodafone_cash").trim().slice(0, 50),
    link: sanitizeUrl(link),
    walletNumber: (walletNumber || "").trim().slice(0, 50),
    accountName: (accountName || "").trim().slice(0, 100),
    customSlug: cleanSlug,
    customLink: sanitizeUrl(customLink),
    isActive: isFirst,
    createdAt: new Date(),
  };

  user.paymentMethods.push(newMethod);

  if (isFirst || !user.activePaymentMethodId) {
    user.activePaymentMethodId = id;
  }

  user.markModified("paymentMethods");
  await user.save();

  res.status(201).json({
    success: true,
    paymentMethod: newMethod,
    paymentMethods: user.paymentMethods,
    activePaymentMethodId: user.activePaymentMethodId,
  });
});

// ── PUT /api/dashboard/payment-methods/:id ────────────────────────────────────
const updatePaymentMethod = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, provider, link, walletNumber, accountName, customSlug, customLink } = req.body;

  const user = req.user;
  const methods = user.paymentMethods || [];
  const method = methods.find((m) => m.id === id);

  if (!method) {
    throw new HttpError(404, "Payment method not found");
  }

  if (name !== undefined) method.name = name.trim().slice(0, 80);
  if (provider !== undefined) method.provider = provider.trim().slice(0, 50);
  if (link !== undefined) method.link = sanitizeUrl(link);
  if (walletNumber !== undefined) method.walletNumber = (walletNumber || "").trim().slice(0, 50);
  if (accountName !== undefined) method.accountName = (accountName || "").trim().slice(0, 100);
  if (customSlug !== undefined) {
    method.customSlug = customSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 50);
  }
  if (customLink !== undefined) method.customLink = sanitizeUrl(customLink);

  user.markModified("paymentMethods");
  await user.save();

  res.json({
    success: true,
    paymentMethod: method,
    paymentMethods: user.paymentMethods,
    activePaymentMethodId: user.activePaymentMethodId,
  });
});

// ── PATCH /api/dashboard/payment-methods/:id/active ───────────────────────────
const setActivePaymentMethod = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const methods = user.paymentMethods || [];
  const method = methods.find((m) => m.id === id);

  if (!method) {
    throw new HttpError(404, "Payment method not found");
  }

  user.paymentMethods.forEach((m) => {
    m.isActive = m.id === id;
  });
  user.activePaymentMethodId = id;

  user.markModified("paymentMethods");
  await user.save();

  res.json({
    success: true,
    activePaymentMethodId: id,
    paymentMethods: user.paymentMethods,
  });
});

// ── DELETE /api/dashboard/payment-methods/:id ─────────────────────────────────
const deletePaymentMethod = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const methods = user.paymentMethods || [];
  const initialLength = methods.length;

  user.paymentMethods = methods.filter((m) => m.id !== id);
  if (user.paymentMethods.length === initialLength) {
    throw new HttpError(404, "Payment method not found");
  }

  if (user.activePaymentMethodId === id) {
    if (user.paymentMethods.length > 0) {
      user.paymentMethods[0].isActive = true;
      user.activePaymentMethodId = user.paymentMethods[0].id;
    } else {
      user.activePaymentMethodId = null;
    }
  }

  user.markModified("paymentMethods");
  await user.save();

  res.json({
    success: true,
    paymentMethods: user.paymentMethods,
    activePaymentMethodId: user.activePaymentMethodId,
  });
});

// ── PUT /api/dashboard/payment-page-settings ──────────────────────────────────
const updatePaymentPageSettings = asyncHandler(async (req, res) => {
  const { avatar, coverImage, displayName, description, isUnifiedHubEnabled } = req.body;
  const user = req.user;

  if (!user.paymentPageSettings) {
    user.paymentPageSettings = {};
  }

  if (avatar !== undefined) user.paymentPageSettings.avatar = sanitizeUrl(avatar) || "";
  if (coverImage !== undefined) user.paymentPageSettings.coverImage = sanitizeUrl(coverImage) || "";
  if (displayName !== undefined) user.paymentPageSettings.displayName = String(displayName || "").trim().slice(0, 100);
  if (description !== undefined) user.paymentPageSettings.description = String(description || "").trim().slice(0, 500);
  if (isUnifiedHubEnabled !== undefined) user.paymentPageSettings.isUnifiedHubEnabled = Boolean(isUnifiedHubEnabled);

  user.markModified("paymentPageSettings");
  await user.save();

  res.json({
    success: true,
    message: "تم حفظ إعدادات صفحة وسائل الدفع بنجاح",
    paymentPageSettings: user.paymentPageSettings,
  });
});

export default {
  streamNotifications,
  getDashboard,
  setActiveCard,
  deleteRequest,
  deleteAppointment,
  markRequestRead,
  markAppointmentRead,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  setActivePaymentMethod,
  deletePaymentMethod,
  updatePaymentPageSettings,
};
