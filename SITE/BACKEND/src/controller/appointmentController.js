import { isValidObjectId } from "mongoose";
import crypto from "node:crypto";
import _asyncHandler4150 from "../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler4150;
import _httpError7805 from "../util/httpError.js";
const { HttpError } = _httpError7805;
import Card from "../models/Card.js";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import _dashboardNotifications7502 from "../util/dashboardNotifications.js";
const { notifyUser } = _dashboardNotifications7502;
import _subscriptionService4102 from "../services/subscriptionService.js";
const { getSubscriptionState, consumeBusinessRequest } = _subscriptionService4102;
import _entitlements3929 from "../util/entitlements.js";
const { canAccess, getFeatureLimit } = _entitlements3929;
import _env3255 from "../config/env.js";
const { env } = _env3255;

function getVisitorId(req, res) {
  let vid = req.cookies.visitorId;
  if (!vid) {
    vid = crypto.randomUUID();
    res.cookie("visitorId", vid, {
      maxAge: 1000 * 60 * 60 * 24 * 365,
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }
  return vid;
}

// ── POST /api/appointments/:cardId ───────────────────────────────────────────
const createAppointment = asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const {
    startTime,
    name,
    phone,
    email = "",
    message = "",
    durationMinutes = 60,
  } = req.body;

  const rawStart =
    startTime ||
    (req.body?.date && req.body?.time
      ? `${req.body.date}T${req.body.time}`
      : null);

  if (!rawStart)
    throw new HttpError(400, "startTime (or date and time) is required");
  if (!name?.trim()) throw new HttpError(400, "name is required");
  if (!phone?.trim()) throw new HttpError(400, "phone is required");
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15 ||
    durationMinutes > 240
  ) {
    throw new HttpError(
      400,
      "durationMinutes must be an integer between 15 and 240",
    );
  }

  const start = new Date(rawStart);
  if (isNaN(start.getTime())) throw new HttpError(400, "Invalid startTime");
  if (start <= new Date())
    throw new HttpError(400, "Appointment must be in the future");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, "A valid email address is required");
  }
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const card = await Card.findOne({
    $or: [
      { _id: isValidObjectId(cardId) ? cardId : null },
      { publicId: cardId },
    ],
  });
  if (!card) throw new HttpError(404, "Card not found");

  const subscription = await getSubscriptionState(card.userId);
  if (!canAccess(subscription.entitlements, "calendarBooking")) {
    throw new HttpError(
      403,
      "Calendar booking is not available on this profile",
    );
  }
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
  if (!usageResult) {
    throw new HttpError(403, "Monthly business request limit reached");
  }

  const conflict = await Appointment.findOne({
    cardId: card._id,
    status: { $ne: "canceled" },
    startTime: { $lt: end },
    endTime: { $gt: start },
  });
  if (conflict) throw new HttpError(409, "This time slot is already booked");

  const vid = getVisitorId(req, res);
  const appt = await Appointment.create({
    cardId: card._id,
    visitorId: vid,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    message: message.trim(),
    startTime: start,
    endTime: end,
    durationMinutes,
    status: "pending",
  });

  const payload = {
    id: appt._id.toString(),
    name: appt.name,
    email: appt.email,
    phone: appt.phone,
    message: appt.message,
    date: start.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: start.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    createdAt: appt.createdAt.toISOString(),
    read: false,
  };

  await Card.updateOne({ _id: card._id }, { $push: { appointments: payload } });
  notifyUser(card.userId.toString(), {
    type: "new_appointment",
    payload,
    cardId: card._id.toString(),
  });
  res.status(201).json({
    appointment: {
      id: appt._id.toString(),
      name: appt.name,
      email: appt.email,
      phone: appt.phone,
      message: appt.message,
      startTime: appt.startTime.toISOString(),
      endTime: appt.endTime.toISOString(),
      durationMinutes: appt.durationMinutes,
      status: appt.status,
      createdAt: appt.createdAt.toISOString(),
    },
  });
});

// ── GET /api/appointments/:cardId/availability ────────────────────────────────
const getAvailability = asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const { year, month } = req.query;

  if (!year || !month)
    throw new HttpError(400, "year and month query params are required");
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12)
    throw new HttpError(400, "Invalid year or month");

  const from = new Date(y, m - 1, 1, 0, 0, 0);
  const to = new Date(y, m, 1, 0, 0, 0);

  const card = await Card.findOne({
    $or: [
      { _id: isValidObjectId(cardId) ? cardId : null },
      { publicId: cardId },
    ],
  });
  if (!card) throw new HttpError(404, "Card not found");

  const appointments = await Appointment.find({
    cardId: card._id,
    status: { $ne: "canceled" },
    startTime: { $gte: from, $lt: to },
  }).select("startTime endTime -_id");

  const bookedSlots = {};
  for (const appt of appointments) {
    const d = appt.startTime;
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const timeKey = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    if (!bookedSlots[dateKey]) bookedSlots[dateKey] = [];
    bookedSlots[dateKey].push(timeKey);
  }

  res.json({ bookedSlots });
});

// ── DELETE /api/appointments/:appointmentId ───────────────────────────────────
const deleteAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const visitorId = req.cookies.visitorId;
  if (!visitorId) throw new HttpError(403, "Visitor session required");
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    visitorId,
  });
  if (!appointment) throw new HttpError(404, "Appointment not found");

  await Appointment.deleteOne({ _id: appointmentId });
  await Card.updateOne(
    { _id: appointment.cardId },
    { $pull: { appointments: { id: appointmentId } } },
  );
  res.status(204).send();
});

// ── GET /api/appointments/:cardId/my-appointments ─────────────────────────────
const getMyAppointments = asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const vid = req.cookies.visitorId;
  if (!vid) return res.json({ appointments: [] });

  const card = await Card.findOne({
    $or: [
      { _id: isValidObjectId(cardId) ? cardId : null },
      { publicId: cardId },
    ],
  });
  if (!card) return res.json({ appointments: [] });

  const appointments = await Appointment.find({
    cardId: card._id,
    visitorId: vid,
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    appointments: appointments.map((appt) => ({
      id: appt._id.toString(),
      fullName: appt.name,
      email: appt.email,
      phone: appt.phone,
      message: appt.message,
      startTime: appt.startTime.toISOString(),
      endTime: appt.endTime.toISOString(),
      status: appt.status,
    })),
  });
});

export default {
  createAppointment,
  getAvailability,
  deleteAppointment,
  getMyAppointments,
};
