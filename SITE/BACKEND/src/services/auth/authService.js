import mongoose from "mongoose";
import RefreshToken from "../../models/RefreshToken.js";
import { REFRESH_COOKIE_NAME, getCookieOptions } from "../../config/cookies.js";
import _tokens2058 from "../../util/tokens.js";
const { createAccessToken, createRefreshToken, hashToken } = _tokens2058;
import _env2983 from "../../config/env.js";
const { env } = _env2983;

function durationToMilliseconds(value) {
  const match = String(value)
    .trim()
    .match(/^(\d+)\s*(m|h|d)$/i);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const units = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * units[match[2].toLowerCase()];
}

const refreshTokenMaxAge = durationToMilliseconds(env.REFRESH_TOKEN_TTL);
const cookieOptions = getCookieOptions({ maxAge: refreshTokenMaxAge });

/**
 * Formats a user object for public API responses (no sensitive fields).
 */
function publicUser(user) {
  return {
    id: user._id,
    publicId: user.publicId,
    email: user.email,
    name: user.name,
    gender: user.gender || "male",
    avatar: user.avatar || "",
    coverImage: user.coverImage || "",
    phone: user.phone || "",
    address: user.address || "",
    role: user.role,
    username: user.username,
    isEmailVerified: user.isEmailVerified,
    savedCard: user.savedCard || null,
    referralCode: user.referralCode || "",
    paymentPlusActive: Boolean(user.paymentPlusActive),
  };
}

/**
 * Creates a refresh token, stores it in DB, sets cookie, returns access token.
 */
async function issueSession(user, request, response) {
  const tokenId = new mongoose.Types.ObjectId();
  const refreshToken = await createRefreshToken(user, tokenId);
  await RefreshToken.create({
    _id: tokenId,
    userId: user._id,
    tokenHash: await hashToken(refreshToken),
    expiresAt: new Date(Date.now() + refreshTokenMaxAge),
    userAgent: request.get("user-agent"),
    ipAddress: request.ip,
  });
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
  return await createAccessToken(user);
}

export default {
  REFRESH_COOKIE_NAME,
  cookieOptions,
  publicUser,
  issueSession,
};
