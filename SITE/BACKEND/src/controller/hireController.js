import { isValidObjectId } from "mongoose";
import crypto from "node:crypto";
import _asyncHandler997 from "../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler997;
import _httpError8920 from "../util/httpError.js";
const { HttpError } = _httpError8920;
import Card from "../models/Card.js";
import User from "../models/User.js";
import ContactRequest from "../models/ContactRequest.js";
import _dashboardNotifications3762 from "../util/dashboardNotifications.js";
const { notifyUser } = _dashboardNotifications3762;
import _subscriptionService3920 from "../services/subscriptionService.js";
const { getSubscriptionState, consumeBusinessRequest } =
  _subscriptionService3920;
import _entitlements2633 from "../util/entitlements.js";
const { getFeatureLimit } = _entitlements2633;
import _env8944 from "../config/env.js";
const { env } = _env8944;

function getVisitorId(req, res) {
  let vid = req.cookies.visitorId;
  if (!vid) {
    vid = crypto.randomUUID();
    res.cookie("visitorId", vid, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }
  return vid;
}

// ── POST /api/hire/:cardId ────────────────────────────────────────────────────
const createHireRequest = asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const { name, phone, email = "", message } = req.body;
  const messageContent = (message || req.body?.details || "").trim();

  if (!name?.trim()) throw new HttpError(400, "name is required");
  if (!phone?.trim()) throw new HttpError(400, "phone is required");
  if (!messageContent) throw new HttpError(400, "message is required");
  if (messageContent.length < 10)
    throw new HttpError(400, "message must be at least 10 characters");
  if (email && !/^\S+@\S+\.\S+$/.test(email))
    throw new HttpError(400, "A valid email address is required");

  const card = await Card.findOne({
    $or: [
      { _id: isValidObjectId(cardId) ? cardId : null },
      { publicId: cardId },
    ],
  });
  if (!card) throw new HttpError(404, "Card not found");

  const subscription = await getSubscriptionState(card.userId);
  const maxCards = getFeatureLimit(subscription.entitlements, "maxCards");
  const user = await User.findById(card.userId).select("activeCardId").lean();
  const isActiveCard =
    card.isActive === true || String(card._id) === String(user?.activeCardId);

  if (maxCards !== null && !isActiveCard) {
    const earlierCards = await Card.countDocuments({
      userId: card.userId,
      createdAt: { $lt: card.createdAt },
    });
    if (earlierCards >= maxCards) {
      throw new HttpError(404, "This profile is currently locked");
    }
  }
  const brLimit = getFeatureLimit(
    subscription.entitlements,
    "monthlyBusinessRequests",
  );
  const usageResult = await consumeBusinessRequest(card.userId, brLimit);
  if (!usageResult)
    throw new HttpError(403, "Monthly business request limit reached");

  const vid = getVisitorId(req, res);
  const hireRequest = await ContactRequest.create({
    cardId: card._id,
    visitorId: vid,
    type: "card_contact",
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    message: messageContent,
  });

  const payload = {
    id: hireRequest._id.toString(),
    name: hireRequest.name,
    email: hireRequest.email,
    phone: hireRequest.phone,
    message: hireRequest.message,
    date: hireRequest.createdAt.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: hireRequest.createdAt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    createdAt: hireRequest.createdAt.toISOString(),
    read: false,
  };

  await Card.updateOne({ _id: card._id }, { $push: { requests: payload } });
  notifyUser(card.userId.toString(), {
    type: "new_request",
    payload,
    cardId: card._id.toString(),
  });
  res.status(201).json({
    request: {
      id: hireRequest._id.toString(),
      name: hireRequest.name,
      email: hireRequest.email,
      phone: hireRequest.phone,
      message: hireRequest.message,
      createdAt: hireRequest.createdAt,
    },
  });
});

// ── DELETE /api/hire/:requestId ───────────────────────────────────────────────
const deleteHireRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const visitorId = req.cookies.visitorId;
  if (!visitorId) throw new HttpError(403, "Visitor session required");
  const request = await ContactRequest.findOne({
    _id: requestId,
    visitorId,
  });
  if (!request) throw new HttpError(404, "Request not found");

  await ContactRequest.deleteOne({ _id: requestId });
  await Card.updateOne(
    { _id: request.cardId },
    { $pull: { requests: { id: requestId } } },
  );
  res.status(204).send();
});

// ── GET /api/hire/:cardId/my-requests ─────────────────────────────────────────
const getMyRequests = asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const vid = req.cookies.visitorId;
  if (!vid) return res.json({ requests: [] });

  const card = await Card.findOne({
    $or: [
      { _id: isValidObjectId(cardId) ? cardId : null },
      { publicId: cardId },
    ],
  });
  if (!card) return res.json({ requests: [] });

  const requests = await ContactRequest.find({ cardId: card._id, visitorId: vid })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    requests: requests.map((req) => ({
      id: req._id.toString(),
      fullName: req.name,
      email: req.email,
      phone: req.phone,
      message: req.message,
      timestamp: req.createdAt.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
  });
});

export default {
  createHireRequest,
  deleteHireRequest,
  getMyRequests,
};
