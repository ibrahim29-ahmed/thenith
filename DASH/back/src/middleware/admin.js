import jwt from "jsonwebtoken";
import User from "../models/User.js";
import _env5352 from "../config/env.js";
const { env } = _env5352;
import _tokens652 from "../util/tokens.js";
const { verifyAccessToken } = _tokens652;

// Verifies an admin token with strict role enforcement
async function requireAdminToken(request, response, next) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Unauthorized: Admin authentication required" });
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    return response.status(401).json({ error: "Unauthorized: Missing token" });
  }

  // 1. Primary check: Signed with ADMIN_JWT_SECRET
  try {
    const decoded = jwt.verify(token, env.ADMIN_JWT_SECRET);
    if (decoded && (decoded.role === "superadmin" || decoded.role === "admin")) {
      request.admin = decoded;
      return next();
    }
  } catch (err) {
    // 2. Secondary check: Authenticated User with explicit admin role
    try {
      const payload = verifyAccessToken(token);
      if (payload?.sub) {
        const user = await User.findById(payload.sub);
        if (user && user.isActive !== false && user.role === "admin") {
          request.admin = { id: user._id.toString(), username: user.name, role: "admin" };
          return next();
        }
      }
    } catch {}
  }

  return response.status(401).json({ error: "Unauthorized: Invalid or expired admin token" });
}

export default { requireAdminToken };
