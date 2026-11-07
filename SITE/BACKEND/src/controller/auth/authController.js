import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import User, { emailLookup, getEmailRegex } from "../../models/User.js";
import Plan from "../../models/Plan.js";
import Subscription from "../../models/Subscription.js";
import Order from "../../models/Order.js";
import OrderDraft from "../../models/OrderDraft.js";
import PaymentTransaction from "../../models/PaymentTransaction.js";
import Card from "../../models/Card.js";
import RefreshToken from "../../models/RefreshToken.js";
import Usage from "../../models/Usage.js";
import OtpCode from "../../models/OtpCode.js";
import _asyncHandler from "../../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler;
import _httpError from "../../util/httpError.js";
const { HttpError } = _httpError;
import { generateGenderAvatar } from "../../util/avatarGenerator.js";
import _tokens from "../../util/tokens.js";
// ✅ All token helpers imported once at the top — no dynamic imports needed
const { verifyRefreshToken, hashToken, createAccessToken } = _tokens;
import _verification from "../../util/verification.js";
const {
  createOtp,
  createVerificationToken,
  hashOtp,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_MS,
  OTP_TTL_MS,
  verifyVerificationToken,
} = _verification;
import _mail from "../../util/mail.js";
const { sendOtpEmail } = _mail;
import _subscriptionService from "../../services/subscriptionService.js";
const { getSubscriptionState } = _subscriptionService;
import _authService from "../../services/auth/authService.js";
const { issueSession, publicUser, REFRESH_COOKIE_NAME, cookieOptions } =
  _authService;
import { OAuth2Client } from "google-auth-library";
import referralService from "../../services/referralService.js";
import _env from "../../config/env.js";
const { env } = _env;
import _entitlements from "../../util/entitlements.js";
const { canAccess } = _entitlements;

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);


async function findUserByEmail(email, includePassword = false) {
  const emailRegex = getEmailRegex(email);
  const secondaryQuery = User.findOne({ secondaryEmails: emailRegex });
  const secondaryUser = await (includePassword
    ? secondaryQuery.select("+passwordHash")
    : secondaryQuery);
  if (secondaryUser) return secondaryUser;

  const primaryQuery = User.findOne({ email: emailRegex });
  return includePassword ? primaryQuery.select("+passwordHash") : primaryQuery;
}

// Helper: clear the refresh token cookie with the correct options
function clearRefreshCookie(response) {
  // Clear with maxAge:0 first (explicit expiry)
  response.clearCookie(REFRESH_COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    maxAge: 0,
  });
}

// Helper: resolve user registration traffic source in English
function resolveTrafficSource(req, explicitReferrer) {
  if (explicitReferrer && typeof explicitReferrer === "string" && explicitReferrer.trim()) {
    const trimmed = explicitReferrer.trim();
    if (trimmed === "مباشر" || trimmed === "مباشرة") return "Direct";
    return trimmed;
  }
  const refHeader = String(req?.headers?.["referer"] || req?.headers?.["referrer"] || "").toLowerCase();
  if (refHeader) {
    if (refHeader.includes("google.")) return "Google";
    if (refHeader.includes("facebook.") || refHeader.includes("fb.")) return "Facebook";
    if (refHeader.includes("instagram.")) return "Instagram";
    if (refHeader.includes("tiktok.")) return "TikTok";
    if (refHeader.includes("linkedin.")) return "LinkedIn";
    if (refHeader.includes("twitter.") || refHeader.includes("t.co") || refHeader.includes("x.com")) return "Twitter / X";
    if (refHeader.includes("youtube.")) return "YouTube";
    if (refHeader.includes("whatsapp.")) return "WhatsApp";
    if (refHeader.includes("telegram.")) return "Telegram";
    try {
      const url = new URL(refHeader);
      if (url.hostname && !url.hostname.includes("thenith") && !url.hostname.includes("localhost") && !url.hostname.includes("127.0.0.1")) {
        return url.hostname;
      }
    } catch {}
  }
  return "Direct";
}

// ── Request OTP code ──────────────────────────────────────────────────────────
const requestCode = asyncHandler(async (request, response) => {
  const { email, purpose } = request.body || {};
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    throw new HttpError(400, "A valid email address is required");
  if (!["login", "register", "auto"].includes(purpose))
    throw new HttpError(400, "Invalid verification purpose");

  const existingUser = await findUserByEmail(normalizedEmail);

  let actualPurpose = purpose;
  if (purpose === "auto") {
    actualPurpose = existingUser ? "login" : "register";
  } else {
    if (purpose === "login" && !existingUser)
      throw new HttpError(404, "Email is not registered");
    if (purpose === "register" && existingUser)
      throw new HttpError(409, "Email is already registered");
  }

  const current = await OtpCode.findOne({
    email: normalizedEmail,
    purpose: actualPurpose,
  });
  if (current && Date.now() - current.lastSentAt.getTime() < OTP_RESEND_MS)
    throw new HttpError(429, "Please wait before requesting another code");

  const code = createOtp();

  await OtpCode.findOneAndUpdate(
    { email: normalizedEmail, purpose: actualPurpose },
    {
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      lastSentAt: new Date(),
    },
    { upsert: true, new: true },
  );
  sendOtpEmail({ email: normalizedEmail, code }).catch((err) => {
    console.warn("[mail] Error sending OTP email:", err?.message || err);
  });

  response.json({
    ok: true,
    expiresInSeconds: OTP_TTL_MS / 1000,
    purpose: actualPurpose,
  });
});

// ── Verify OTP code ───────────────────────────────────────────────────────────
const verifyCode = asyncHandler(async (request, response) => {
  const { email, code, purpose } = request.body || {};
  const normalizedEmail = email?.trim().toLowerCase();

  const record = await OtpCode.findOne({ email: normalizedEmail, purpose });
  if (!record || record.expiresAt <= new Date())
    throw new HttpError(400, "Code is invalid or expired");
  if (record.attempts >= OTP_MAX_ATTEMPTS)
    throw new HttpError(429, "Too many invalid attempts");
  if (record.codeHash !== hashOtp(code || "")) {
    record.attempts += 1;
    await record.save();

    throw new HttpError(400, "Code is invalid or expired");
  }
  await record.deleteOne();
  if (purpose === "register") {
    const verificationToken = createVerificationToken(
      normalizedEmail,
      "register",
    );

    response.json({ verificationToken });
    return;
  }
  const user = await findUserByEmail(normalizedEmail);
  if (!user) throw new HttpError(401, "User session is invalid");
  if (!user.isEmailVerified) {
    user.isEmailVerified = true;
    await user.save();
  }

  const { referralCode } = request.body || {};
  if (user && referralCode && !user.referredBy) {
    await referralService.attributeReferralOnRegistration({
      invitee: user,
      referralCode,
      req: request,
    }).catch(() => {});
  }

  const accessToken = await issueSession(user, request, response);

  response.json({
    user: publicUser(user),
    accessToken,
    subscription: await getSubscriptionState(user._id),
  });
});

// ── Complete registration after OTP ──────────────────────────────────────────
const completeRegistration = asyncHandler(async (request, response) => {
  const { verificationToken, name, phone, address, jobTitle, company, bio, referralCode } =
    request.body || {};

  let payload;
  try {
    payload = verifyVerificationToken(verificationToken, "register");
  } catch {
    throw new HttpError(400, "Registration verification has expired");
  }
  if (!name?.trim()) throw new HttpError(400, "Name is required");
  if (!jobTitle?.trim()) throw new HttpError(400, "Job title is required");
  if (!company?.trim()) throw new HttpError(400, "Company is required");
  if (!bio?.trim()) throw new HttpError(400, "Bio is required");
  if (await User.exists(emailLookup(payload.email)))
    throw new HttpError(409, "Email is already registered");

  const userAvatar = generateGenderAvatar(name.trim(), name.trim());

  const user = await User.create({
    email: payload.email,
    name: name.trim(),
    isEmailVerified: true,
    phone: phone?.trim() || "",
    address: address?.trim() || "",
    passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
    avatar: userAvatar,
    referrer: resolveTrafficSource(request, request.body?.referrer || request.body?.source),
  });
  const freePlan = await Plan.findOne({ key: "free" });
  await Subscription.create({
    userId: user._id,
    planId: freePlan._id,
    status: "active",
    startedAt: new Date(),
    provider: "manual",
  });
  const firstCard = await Card.create({
    userId: user._id,
    name: "Card 1",
    personal: {
      fullName: name?.trim() || "",
      jobTitle: jobTitle?.trim() || "",
      company: company?.trim() || "",
      bio: bio?.trim() || "",
      avatar: userAvatar,
    },
    links: [],
    contacts: [],
  });
  user.activeCardId = firstCard._id;
  await user.save();
  await referralService.ensureUserReferralCode(user);
  if (referralCode) {
    await referralService.attributeReferralOnRegistration({
      invitee: user,
      referralCode,
      req: request,
    }).catch(() => {});
  }

  const accessToken = await issueSession(user, request, response);

  response.status(201).json({
    user: publicUser(user),
    accessToken,
    subscription: await getSubscriptionState(user._id),
    profile: { phone: user.phone, address: user.address },
  });
});

// ── Register ──────────────────────────────────────────────────────────────────
const register = asyncHandler(async (request, response) => {
  const { email, password, name } = request.body || {};
  if (!email || !password || !name || password.length < 8)
    throw new HttpError(
      400,
      "Name, email, and a password of at least 8 characters are required",
    );
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists(emailLookup(normalizedEmail)))
    throw new HttpError(409, "Email is already registered");

  const userAvatar = generateGenderAvatar(name.trim(), name.trim());

  const user = await User.create({
    email: normalizedEmail,
    name: name.trim(),
    passwordHash: await bcrypt.hash(password, 12),
    avatar: userAvatar,
    referrer: resolveTrafficSource(request, request.body?.referrer || request.body?.source),
  });
  const freePlan = await Plan.findOne({ key: "free" });
  await Subscription.create({
    userId: user._id,
    planId: freePlan._id,
    status: "active",
    startedAt: new Date(),
    provider: "manual",
  });
  const { referralCode } = request.body || {};
  if (user && referralCode && !user.referredBy) {
    await referralService.attributeReferralOnRegistration({
      invitee: user,
      referralCode,
      req: request,
    }).catch(() => {});
  }

  const accessToken = await issueSession(user, request, response);
  response.status(201).json({
    user: publicUser(user),
    accessToken,
    subscription: await getSubscriptionState(user._id),
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────
const login = asyncHandler(async (request, response) => {
  const { email, password } = request.body || {};
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new HttpError(400, "Email is required");
  }

  if (!password) {
    throw new HttpError(
      400,
      "Password is required for the legacy login route. Use /auth/request-code and /auth/verify-code for OTP login.",
    );
  }

  const user = await findUserByEmail(normalizedEmail, true);

  if (!user) {
    throw new HttpError(
      401,
      "Account not found. Use /auth/request-code and /auth/verify-code for OTP login.",
    );
  }

  if (user.isActive === false) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (!user.passwordHash) {
    throw new HttpError(
      401,
      "This account uses email OTP login. Use /auth/request-code and /auth/verify-code.",
    );
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  const { referralCode } = request.body || {};
  if (user && referralCode && !user.referredBy) {
    await referralService.attributeReferralOnRegistration({
      invitee: user,
      referralCode,
      req: request,
    }).catch(() => {});
  }

  const accessToken = await issueSession(user, request, response);
  response.json({
    user: publicUser(user),
    accessToken,
    subscription: await getSubscriptionState(user._id),
  });
});

// ── Session check ─────────────────────────────────────────────────────────────
// Called on every page load to restore the session from the httpOnly refresh cookie.
const getSession = asyncHandler(async (request, response) => {
  const rawToken = request.cookies[REFRESH_COOKIE_NAME];

  // No cookie → not authenticated
  if (!rawToken) {
    return response.json({ authenticated: false });
  }

  try {
    // 1. Verify JWT signature + expiry
    const payload = verifyRefreshToken(rawToken);

    // 2. ✅ FIX: await hashToken — it is an async function
    const tokenHash = await hashToken(rawToken);

    // 3. Look up the stored token record in DB
    const stored = await RefreshToken.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    // 4. Make sure DB record jti matches JWT jti (rotation guard)
    const user =
      stored && stored._id.toString() === payload.jti
        ? await User.findById(payload.sub)
        : null;

    if (!user || user.isActive === false) {
      clearRefreshCookie(response);
      return response.json({ authenticated: false });
    }

    // 5. ✅ FIX: await createAccessToken — it is also async
    const accessToken = await createAccessToken(user);

    const subscription = await getSubscriptionState(user._id);
    const pubUser = publicUser(user);
    if (!canAccess(subscription.entitlements, "customLink")) {
      pubUser.username = null;
    }

    return response.json({
      authenticated: true,
      user: pubUser,
      accessToken,
      subscription,
    });
  } catch {
    // JWT invalid / expired / any other error → clear cookie and deny
    clearRefreshCookie(response);
    return response.json({ authenticated: false });
  }
});

// ── Refresh token ─────────────────────────────────────────────────────────────
const refreshToken = asyncHandler(async (request, response) => {
  const rawToken = request.cookies[REFRESH_COOKIE_NAME];
  if (!rawToken) throw new HttpError(401, "Refresh session is missing");

  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw new HttpError(401, "Refresh session is invalid or expired");
  }

  // ✅ FIX: await hashToken
  const tokenHash = await hashToken(rawToken);
  const stored = await RefreshToken.findOne({
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!stored || stored._id.toString() !== payload.jti)
    throw new HttpError(401, "Refresh session is invalid");

  // Rotate: revoke old token, issue new one
  stored.revokedAt = new Date();
  await stored.save();

  const user = await User.findById(payload.sub);
  if (!user || user.isActive === false) {
    throw new HttpError(401, "User session is invalid");
  }

  const { referralCode } = request.body || {};
  if (user && referralCode && !user.referredBy) {
    await referralService.attributeReferralOnRegistration({
      invitee: user,
      referralCode,
      req: request,
    }).catch(() => {});
  }

  const accessToken = await issueSession(user, request, response);
  response.json({ accessToken });
});

// ── Logout ────────────────────────────────────────────────────────────────────
const logout = asyncHandler(async (request, response) => {
  const rawToken = request.cookies[REFRESH_COOKIE_NAME];
  if (rawToken) {
    try {
      const payload = verifyRefreshToken(rawToken);
      // Revoke all sessions for this user (logout from all devices)
      await RefreshToken.updateMany(
        { userId: payload.sub, revokedAt: null },
        { revokedAt: new Date() },
      );
    } catch {
      // Token is malformed — still try to revoke by hash
      try {
        // ✅ FIX: await hashToken
        const tokenHash = await hashToken(rawToken);
        await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date() });
      } catch {
        // Ignore — cookie will be cleared regardless
      }
    }
  }
  clearRefreshCookie(response);
  response.status(204).send();
});

// ── Delete account ────────────────────────────────────────────────────────────
const deleteAccount = asyncHandler(async (request, response) => {
  const userId = request.user._id;
  const [unpaidOrder, pendingPayment, pendingSubscription] = await Promise.all([
    Order.exists({
      userId,
      status: { $nin: ["cancelled", "returned"] },
      $or: [
        { status: { $regex: /^(received|pending)$/i } },
        { paymentStatus: { $nin: ["paid", "cancelled", "refunded"] } },
      ],
    }),
    PaymentTransaction.exists({ userId, status: "pending" }),
    Subscription.exists({ userId, status: "pending" }),
  ]);

  if (unpaidOrder || pendingPayment || pendingSubscription) {
    throw new HttpError(409, "ACCOUNT_HAS_PENDING_PAYMENTS");
  }

  await Promise.all([
    Card.deleteMany({ userId }),
    Order.deleteMany({ userId }),
    OrderDraft.deleteMany({ userId }),
    Subscription.deleteMany({ userId }),
    RefreshToken.deleteMany({ userId }),
    Usage.deleteMany({ userId }),
    OtpCode.deleteMany({ email: request.user.email }),
  ]);
  await User.deleteOne({ _id: userId });
  clearRefreshCookie(response);
  response.status(204).send();
});

// ── Check username availability ───────────────────────────────────────────────
const checkUsername = asyncHandler(async (request, response) => {
  const username = request.body?.username?.trim().toLowerCase();
  if (!username || !/^[a-z0-9_-]{3,30}$/.test(username))
    return response.json({ available: false, reason: "invalid" });
  const exists = await User.exists({
    username,
    _id: { $ne: request.user._id },
  });
  response.json({ available: !exists });
});

// ── Get current user ──────────────────────────────────────────────────────────
const getMe = asyncHandler(async (request, response) => {
  const subscription = await getSubscriptionState(request.user._id, true);
  const pubUser = publicUser(request.user);
  if (!canAccess(subscription.entitlements, "customLink")) {
    pubUser.username = null;
  }

  response.json({
    user: pubUser,
    subscription,
  });
});

// ── Update current user ───────────────────────────────────────────────────────
const updateMe = asyncHandler(async (request, response) => {
  const previousUsername = request.user.username || null;
  const previousEmail = request.user.email;
  const allowed = ["name", "phone", "address", "username", "email"];

  for (const key of allowed) {
    if (request.body?.[key] !== undefined)
      request.user[key] = request.body[key];
  }

  // Handle avatar regenerate if requested
  if (request.body?.regenerateAvatar) {
    const newAvatar = generateGenderAvatar(request.user.name, request.user.name);
    request.user.avatar = newAvatar;
    if (request.user.activeCardId) {
      await Card.updateOne(
        { _id: request.user.activeCardId },
        { $set: { "personal.avatar": newAvatar } }
      );
    }
  }

  if (request.user.email && request.user.email !== previousEmail) {
    request.user.isEmailVerified = false;
    const code = createOtp();
    await OtpCode.findOneAndUpdate(
      { email: request.user.email, purpose: "login" },
      {
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attempts: 0,
        lastSentAt: new Date(),
      },
      { upsert: true, new: true },
    );
    sendOtpEmail({ email: request.user.email, code }).catch((err) => {
      console.error(
        "[backend] Error sending OTP email on update:",
        err.message,
      );
    });

    await request.user.save();
    return response.json({
      user: publicUser(request.user),
      emailVerificationRequired: true,
      message: "تم تغيير البريد الإلكتروني. يرجى تأكيده.",
    });
  }
  const subscription = await getSubscriptionState(request.user._id);
  const usernameChanged = request.user.username !== previousUsername;
  if (usernameChanged && !canAccess(subscription.entitlements, "customLink")) {
    request.user.username = previousUsername;
  }
  if (
    request.user.username &&
    !/^[a-z0-9_-]{3,30}$/.test(request.user.username)
  )
    throw new HttpError(
      400,
      "Username must be 3-30 characters: letters, numbers, _ or -",
    );
  if (!request.user.username?.trim()) request.user.username = null;
  await request.user.save();

  const pubUser = publicUser(request.user);
  if (!canAccess(subscription.entitlements, "customLink")) {
    pubUser.username = null;
  }

  response.json({ user: pubUser });
});

// ── Google OAuth ──────────────────────────────────────────────────────────────
const googleAuth = asyncHandler(async (request, response) => {
  const token = request.body?.token || request.body?.credential;

  if (!env.GOOGLE_CLIENT_ID) {
    throw new HttpError(
      500,
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID in the backend environment.",
    );
  }
  if (!token)
    throw new HttpError(400, "Google token or credential is required");

  let googlePayload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    googlePayload = ticket.getPayload();
  } catch (error) {
    if (error.message && error.message.includes("Wrong number of segments in token")) {
      try {
        const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Invalid access token");
        googlePayload = await response.json();
      } catch (fetchErr) {
        throw new HttpError(400, "Invalid Google token or access token");
      }
    } else {
      console.error(
        "[backend] Google ID token verification failed:",
        error?.message || error,
      );
      throw new HttpError(400, "Invalid Google token");
    }
  }

  if (!googlePayload || !googlePayload.email)
    throw new HttpError(400, "Invalid Google token payload");

  const email = googlePayload.email.trim().toLowerCase();
  let user = await findUserByEmail(email);


  if (!user) {
    const verificationToken = createVerificationToken(email, "register");
    response.json({
      requiresRegistration: true,
      verificationToken,
      payload: { name: googlePayload.name || "", email },
    });
    return;
  }

  const { referralCode } = request.body || {};
  if (user && referralCode && !user.referredBy) {
    await referralService.attributeReferralOnRegistration({
      invitee: user,
      referralCode,
      req: request,
    }).catch(() => {});
  }

  const accessToken = await issueSession(user, request, response);

  response.json({
    user: publicUser(user),
    accessToken,
    subscription: await getSubscriptionState(user._id),
  });
});

export default {
  requestCode,
  verifyCode,
  completeRegistration,
  register,
  login,
  getSession,
  refreshToken,
  logout,
  deleteAccount,
  checkUsername,
  getMe,
  updateMe,
  googleAuth,
};
