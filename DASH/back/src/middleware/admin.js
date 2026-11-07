import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AdminUser from "../models/AdminUser.js";
import _env5352 from "../config/env.js";
const { env } = _env5352;
import _tokens652 from "../util/tokens.js";
const { verifyAccessToken } = _tokens652;

// Verifies an admin token with strict role enforcement & active check
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
    const decoded = jwt.verify(token, env.ADMIN_JWT_SECRET, { algorithms: ["HS256"] });
    if (decoded && (decoded.role === "superadmin" || decoded.role === "admin")) {
      // If it's a database AdminUser, verify they are still active
      if (decoded.id && decoded.id !== "superadmin") {
        const adminDoc = await AdminUser.findById(decoded.id).lean();
        if (!adminDoc || adminDoc.isActive === false) {
          return response.status(403).json({ error: "تم تعطيل هذا الحساب أو حذفه" });
        }
        request.admin = {
          ...decoded,
          name: adminDoc.name,
          role: adminDoc.role || "admin",
          title: adminDoc.title,
          permissions: adminDoc.permissions || [],
        };
        return next();
      }

      request.admin = {
        ...decoded,
        permissions: decoded.permissions || ["*"],
      };
      return next();
    }
  } catch (err) {
    // 2. Secondary check: Authenticated User with explicit admin role
    try {
      const payload = verifyAccessToken(token);
      if (payload?.sub) {
        const user = await User.findById(payload.sub);
        if (user && user.isActive !== false && user.role === "admin") {
          request.admin = { id: user._id.toString(), username: user.name, role: "admin", permissions: ["*"] };
          return next();
        }
      }
    } catch {}
  }

  return response.status(401).json({ error: "Unauthorized: Invalid or expired admin token" });
}

// Checks if current admin has permission for a specific module/page
function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: "Unauthorized: Admin authentication required" });
    }
    if (req.admin.role === "superadmin") {
      return next();
    }
    const perms = req.admin.permissions || [];
    if (perms.includes("*") || perms.includes(permissionKey)) {
      return next();
    }
    return res.status(403).json({
      error: "Forbidden: ليس لديك صلاحية للوصول إلى هذا القسم",
      requiredPermission: permissionKey,
    });
  };
}

// Restricts route strictly to Super Admin
function requireSuperAdmin(req, res, next) {
  if (!req.admin) {
    return res.status(401).json({ error: "Unauthorized: Admin authentication required" });
  }
  if (req.admin.role === "superadmin" || (req.admin.permissions || []).includes("*")) {
    return next();
  }
  return res.status(403).json({
    error: "Forbidden: هذه العملية تتطلب صلاحيات المدير العام (Super Admin)",
  });
}

export default { requireAdminToken, requirePermission, requireSuperAdmin };
export { requireAdminToken, requirePermission, requireSuperAdmin };

