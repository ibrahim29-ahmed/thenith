import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import _env7838 from "../config/env.js";
const { env } = _env7838;

async function createAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_TTL,
    },
  );
}

async function createRefreshToken(user, tokenId) {
  return jwt.sign(
    { sub: user._id.toString(), jti: tokenId },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.REFRESH_TOKEN_TTL,
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] });
}

async function hashToken(token) {
  const value = typeof token === "string" ? token : String(token ?? "");
  return crypto.createHash("sha256").update(value).digest("hex");
}

export {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};

export default {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
