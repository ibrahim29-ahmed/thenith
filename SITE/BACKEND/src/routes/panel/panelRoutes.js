/**
 * src/routes/panel/panelRoutes.js
 *
 * Panel-specific routes for the authenticated user dashboard.
 *   GET  /api/panel/profile   → get current user's profile (name, phone, etc.)
 *   PATCH /api/panel/profile  → update user profile fields
 *   GET  /api/panel/links     → alias: get active card's links
 *   PATCH /api/panel/links    → alias: update active card's links
 */
import { Router } from "express";
import _auth from "../../middleware/auth.js";
const { requireAuth } = _auth;
import _subscription from "../../middleware/subscription.js";
const { requireSubscription } = _subscription;
import _asyncHandler from "../../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler;
import _httpError from "../../util/httpError.js";
const { HttpError } = _httpError;
import User, { emailLookup } from "../../models/User.js";
import Card from "../../models/Card.js";
import Order from "../../models/Order.js";
import Subscription from "../../models/Subscription.js";
import PaymentTransaction from "../../models/PaymentTransaction.js";
import Plan from "../../models/Plan.js";
import OtpCode from "../../models/OtpCode.js";
import _mail from "../../util/mail.js";
const { sendOtpEmail } = _mail;
import _verification from "../../util/verification.js";
const { createOtp, hashOtp, OTP_TTL_MS } = _verification;
import _dashboardNotifications1234 from "../../util/dashboardNotifications.js";
const { notifyUser } = _dashboardNotifications1234;
import _entitlements from "../../util/entitlements.js";
const { canAccess, getFeatureLimit } = _entitlements;
import { invalidateProfileCacheForUser } from "../../controller/publicProfile/publicProfileController.js";

const router = Router();
router.use(requireAuth);
router.use(requireSubscription);

// ── GET /api/panel/profile ────────────────────────────────────────────────────
router.get(
  "/profile",
  asyncHandler(async (request, response) => {
    const user = request.user;
    response.json({
      profile: {
        name: user.name || "",
        email: user.email || "",
        gender: user.gender || "male",
        secondaryEmails: user.secondaryEmails || [],
        phone: user.phone || "",
        address: user.address || "",
        username: user.username || "",
        publicId: user.publicId || "",
        role: user.role || "user",
        isEmailVerified: user.isEmailVerified || false,
      },
    });
  }),
);

// ── PATCH /api/panel/profile ──────────────────────────────────────────────────
router.patch(
  "/profile",
  asyncHandler(async (request, response) => {
    const user = request.user;
    const previousUsername = user.username || null;
    const allowed = ["name", "phone", "address", "username"];

    for (const key of allowed) {
      if (request.body?.[key] !== undefined) {
        user[key] =
          typeof request.body[key] === "string"
            ? request.body[key].trim()
            : request.body[key];
      }
    }

    const usernameChanged = user.username !== previousUsername;
    if (
      usernameChanged &&
      !canAccess(request.subscription.entitlements, "customLink")
    ) {
      user.username = previousUsername;
    }
    if (user.username && !/^[a-z0-9_-]{3,30}$/.test(user.username)) {
      throw new HttpError(
        400,
        "Username must be 3-30 characters: lowercase letters, numbers, _ or -",
      );
    }
    if (!user.username?.trim()) {
      user.username = null;
    } else {
      const taken = await User.exists({
        username: user.username,
        _id: { $ne: user._id },
      });
      if (taken) {
        throw new HttpError(409, "Username is already taken");
      }
    }

    await user.save();

    invalidateProfileCacheForUser(user._id, user.publicId, user.username);

    response.json({
      profile: {
        name: user.name || "",
        email: user.email || "",
        gender: user.gender || "male",
        secondaryEmails: user.secondaryEmails || [],
        phone: user.phone || "",
        address: user.address || "",
        username: user.username || "",
        publicId: user.publicId || "",
      },
    });
  }),
);

// ── POST /api/panel/profile/emails/request ───────────────────────────────────
router.post(
  "/profile/emails/request",
  asyncHandler(async (request, response) => {
    const email = request.body?.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, "A valid email address is required");
    }
    const user = request.user;
    if ((user.secondaryEmails || []).length >= 1) {
      throw new HttpError(409, "Only one secondary email can be added");
    }
    const emailInUse = await User.exists(emailLookup(email));
    if (emailInUse) throw new HttpError(409, "Email is already in use");

    const current = await OtpCode.findOne({
      email,
      purpose: "secondary_email_add",
    });
    if (current && Date.now() - current.lastSentAt.getTime() < 60 * 1000) {
      throw new HttpError(429, "Please wait before requesting another code");
    }
    const code = createOtp();
    await OtpCode.findOneAndUpdate(
      { email, purpose: "secondary_email_add" },
      {
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attempts: 0,
        lastSentAt: new Date(),
      },
      { upsert: true, new: true },
    );
    sendOtpEmail({ email, code }).catch((err) => {
      console.error(
        "[backend] Error sending secondary email OTP:",
        err.message,
      );
    });
    response.json({ success: true, email });
  }),
);

// ── POST /api/panel/profile/emails/verify ────────────────────────────────────
router.post(
  "/profile/emails/verify",
  asyncHandler(async (request, response) => {
    const email = request.body?.email?.trim().toLowerCase();
    const { code } = request.body || {};
    if (!email || !code)
      throw new HttpError(400, "Email and code are required");
    const record = await OtpCode.findOne({
      email,
      purpose: "secondary_email_add",
    });
    if (!record || record.expiresAt <= new Date()) {
      throw new HttpError(400, "Invalid or expired code");
    }
    if (record.attempts >= 5) throw new HttpError(429, "Too many attempts");
    if (hashOtp(code) !== record.codeHash) {
      record.attempts += 1;
      await record.save();
      throw new HttpError(400, "Invalid code");
    }

    const user = request.user;
    if ((user.secondaryEmails || []).length >= 1) {
      throw new HttpError(409, "Only one secondary email can be added");
    }
    const emailInUse = await User.exists(emailLookup(email));
    if (emailInUse) throw new HttpError(409, "Email is already in use");
    user.secondaryEmails = [...(user.secondaryEmails || []), email];
    await user.save();

    invalidateProfileCacheForUser(user._id, user.publicId, user.username);
    await OtpCode.deleteOne({ _id: record._id });

    response.json({
      success: true,
      profile: {
        name: user.name || "",
        email: user.email || "",
        secondaryEmails: user.secondaryEmails || [],
        phone: user.phone || "",
        address: user.address || "",
        username: user.username || "",
        publicId: user.publicId || "",
      },
    });
  }),
);

// ── DELETE /api/panel/profile/emails ─────────────────────────────────────────
router.delete(
  "/profile/emails",
  asyncHandler(async (request, response) => {
    const email = request.body?.email?.trim().toLowerCase();
    const user = request.user;
    const secondaryEmails = user.secondaryEmails || [];
    if (
      !user.email ||
      secondaryEmails.length !== 1 ||
      (email !== user.email && !secondaryEmails.includes(email))
    ) {
      throw new HttpError(404, "Email address not found");
    }
    const promotingSecondary = email === user.email;

    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await Order.updateMany(
      {
        userId: null,
        "customer.email": new RegExp(`^\\s*${escapedEmail}\\s*$`, "i"),
      },
      { $set: { userId: user._id } },
    );

    if (promotingSecondary) {
      user.email = secondaryEmails[0];
      user.secondaryEmails = [];
      user.isEmailVerified = true;
    } else {
      user.secondaryEmails = secondaryEmails.filter((item) => item !== email);
    }
    await user.save();

    invalidateProfileCacheForUser(user._id, user.publicId, user.username);
    if (promotingSecondary) {
      await Order.updateMany(
        { userId: user._id },
        { $set: { "customer.email": user.email } },
      );
    }
    response.json({
      success: true,
      profile: {
        name: user.name || "",
        email: user.email || "",
        secondaryEmails: user.secondaryEmails,
        phone: user.phone || "",
        address: user.address || "",
        username: user.username || "",
        publicId: user.publicId || "",
      },
    });
  }),
);

// ── GET /api/panel/links ──────────────────────────────────────────────────────
// Returns the links of the user's active card.
router.get(
  "/links",
  asyncHandler(async (request, response) => {
    const user = request.user;
    const card = await Card.findActiveForUser(user._id, user.activeCardId);

    if (!card) {
      return response.json({ links: [] });
    }
    response.json({ links: card.links || [] });
  }),
);

// ── PATCH /api/panel/links ────────────────────────────────────────────────────
// Updates the links of the user's active card.
router.patch(
  "/links",
  asyncHandler(async (request, response) => {
    const user = request.user;
    const links = request.body?.links;
    if (!Array.isArray(links)) {
      throw new HttpError(400, "links must be an array");
    }

    const maxLinks = getFeatureLimit(
      request.subscription.entitlements,
      "maxLinks",
    );
    if (maxLinks !== null && links.length > maxLinks) {
      throw new HttpError(
        403,
        `PLAN_LIMIT_REACHED: Your current plan allows a maximum of ${maxLinks} links.`,
      );
    }

    const card = await Card.findActiveForUser(user._id, user.activeCardId);

    if (!card) {
      throw new HttpError(404, "No active card found");
    }

    // ── Enforce reorderLinks permission ──────────────────────────────────────
    if (!canAccess(request.subscription.entitlements, "reorderLinks")) {
      const currentIds = card.links.map((l) => l.id || l._id?.toString());
      const incomingIds = links
        .map((l) => l.id || l._id?.toString())
        .filter((id) => currentIds.includes(id));
      const expectedOrder = currentIds.filter((id) => incomingIds.includes(id));
      if (incomingIds.join("|") !== expectedOrder.join("|")) {
        throw new HttpError(403, "Link ordering is available on the Pro plan");
      }
    }

    card.links = links.map((link, index) => ({ ...link, order: index }));
    await card.save();
    response.json({ links: card.links });
  }),
);

import { sanitizeOrder } from "../../util/apiResponseDTO.js";

// ── GET /api/panel/orders ─────────────────────────────────────────────────────
// Returns the user's orders
router.get(
  "/orders",
  asyncHandler(async (request, response) => {
    const user = request.user;
    const orders = await Order.find({ userId: user._id }).sort({
      createdAt: -1,
    });
    response.json({ orders: orders.map(sanitizeOrder) });
  }),
);

// ── PATCH /api/panel/orders/:id/cancel ────────────────────────────────────────
// Cancel an order only if it is still in "received" status
router.patch(
  "/orders/:id/cancel",
  asyncHandler(async (request, response) => {
    const user = request.user;
    const order = await Order.findOne({
      _id: request.params.id,
      userId: user._id,
    });

    if (!order) {
      throw new HttpError(404, "الطلب غير موجود");
    }

    if (order.status !== "received") {
      throw new HttpError(400, "لا يمكن إلغاء الطلب بعد بدء تجهيزه");
    }

    order.status = "cancelled";
    await order.save();

    if (order.userId) {
      notifyUser(order.userId.toString(), {
        type: "order_cancelled",
        payload: { id: order._id },
      });
    }

    response.json({ success: true, order: sanitizeOrder(order) });
  }),
);

// ── DELETE /api/panel/orders/:id ──────────────────────────────────────────────
// Delete an order entirely from the user's history
router.delete(
  "/orders/:id",
  asyncHandler(async (request, response) => {
    const user = request.user;
    const order = await Order.findOne({
      _id: request.params.id,
      userId: user._id,
    });

    if (!order) {
      throw new HttpError(404, "الطلب غير موجود");
    }

    const allowedStatuses = ["pending", "received", "cancelled"];
    if (!allowedStatuses.includes((order.status || "received").toLowerCase())) {
      throw new HttpError(
        400,
        "لا يمكن حذف هذا الطلب لأنه جاري التجهيز أو تم شحنه",
      );
    }

    await Order.deleteOne({ _id: order._id });

    response.json({ success: true, message: "تم حذف الطلب بنجاح" });
  }),
);

// ── GET /api/panel/subscriptions ─────────────────────────────────────────────
// Returns the user's invoice history (PaymentTransactions)
router.get(
  "/subscriptions",
  asyncHandler(async (request, response) => {
    const user = request.user;

    // Fetch completed (paid) payment transactions for this user (Invoices)
    const transactions = await PaymentTransaction.find({
      userId: user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const subscriptions = transactions.map((tx) => {
      const fawryCode = tx.paymentData?.fawryCode || null;
      const fawryCodeExpiry =
        tx.fawaterakExpireDate ||
        tx.paymentData?.fawaterakExpireDate ||
        tx.paymentData?.expirationTime ||
        tx.paymentData?.expireDate ||
        tx.paymentData?.expiryDate ||
        null;
      const mobileWalletNumber = tx.paymentData?.mobileWalletNumber || null;

      return {
        _id: tx._id,
        status: tx.status,
        createdAt: tx.createdAt,
        intentKey: tx.intentKey,
        paidAmount: tx.amount,
        paymentMethod: tx.paymentMethodName || tx.provider,
        orderType: tx.orderType, // 'subscription' or 'store'
        fawryCode,
        fawryCodeExpiry,
        mobileWalletNumber,
      };
    });

    response.json({ subscriptions });
  }),
);

// ── POST /api/panel/subscriptions/:id/cancel ──────────────────────────────────
// Cancel active/pending subscription
router.post(
  "/subscriptions/:id/cancel",
  asyncHandler(async (request, response) => {
    const user = request.user;
    // Find the invoice (PaymentTransaction) to see if this was just an invoice cancellation
    const invoice = await PaymentTransaction.findOne({
      _id: request.params.id,
      userId: user._id,
    });

    if (invoice) {
      if (invoice.status === "pending") {
        invoice.status = "cancelled";
        await invoice.save();
      }
    } else {
      // If it wasn't an invoice ID, they likely passed the Subscription ID.
      // 1. Mark any pending invoices for this subscription as cancelled
      await PaymentTransaction.updateMany(
        { referenceId: request.params.id, status: "pending", userId: user._id },
        { status: "cancelled" },
      );

      // 2. Revert the subscription to the Free plan and keep it active
      const subscription = await Subscription.findOne({
        _id: request.params.id,
        userId: user._id,
      });
      if (subscription) {
        const freePlan = await Plan.findOne({ key: "free" });
        if (freePlan) {
          subscription.planId = freePlan._id;
          subscription.status = "active";
          await subscription.save();
        }
      }
    }

    response.json({ success: true, message: "تم إلغاء الفاتورة بنجاح" });
  }),
);

export default router;
