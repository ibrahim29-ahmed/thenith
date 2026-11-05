// Verifies that the user has a valid authenticated session.
// Requires a valid Bearer access token in the Authorization header.
// The refresh token cookie is intentionally NOT accepted here — it belongs
// only in /auth/session and /auth/refresh endpoints.
import User from "../models/User.js";
import _tokens from "../util/tokens.js";
const { verifyAccessToken } = _tokens;
import _httpError from "../util/httpError.js";
const { HttpError } = _httpError;

function getBearerToken(request) {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return null;
}

async function requireAuth(request, _response, next) {
  try {
    const bearerToken = getBearerToken(request);
    if (!bearerToken) {
      throw new HttpError(401, "Authentication required");
    }

    const payload = verifyAccessToken(bearerToken);
    const user = await User.findById(payload.sub);
    if (!user || user.isActive === false) {
      throw new HttpError(401, "Invalid authentication session");
    }

    request.user = user;
    return next();
  } catch (error) {
    return next(
      error?.statusCode
        ? error
        : new HttpError(401, "Invalid or expired authentication session"),
    );
  }
}

async function optionalAuth(request, _response, next) {
  try {
    const bearerToken = getBearerToken(request);
    if (bearerToken) {
      const payload = verifyAccessToken(bearerToken);
      const user = await User.findById(payload.sub);
      if (user && user.isActive !== false) {
        request.user = user;
      }
    }
  } catch {}
  return next();
}

export { requireAuth, optionalAuth };
export default { requireAuth, optionalAuth };
