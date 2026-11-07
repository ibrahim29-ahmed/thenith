import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import geoip from "geoip-lite";
import _tokens from "../util/tokens.js";
const { verifyAccessToken } = _tokens;

const SCANNER_PATHS = [
  ".env",
  ".git",
  "wp-admin",
  "wp-login.php",
  "phpmyadmin",
  "config.php",
  "xmlrpc.php",
  "shell.php",
  "cmd.php",
  "/.aws/",
  "/etc/passwd",
  "/proc/self",
  "/.ssh/",
];

const MALICIOUS_PATTERNS = [
  /<\s*script\b[^>]*>(.*?)<\s*\/\s*script\s*>/is,
  /union\s+(all\s+)?select/i,
  /(\.\.\/)+/i,
  /\/etc\/passwd/i,
  /\bexec\s*\(/i,
  /\beval\s*\(/i,
  /\bsystem\s*\(/i,
  /;\s*(drop|delete|truncate)\s+/i,
];

function isMalicious(payload) {
  if (!payload) return false;
  let str = typeof payload === "string" ? payload : "";
  if (typeof payload === "object") {
    try {
      str = JSON.stringify(payload);
    } catch {
      str = "";
    }
  }
  return MALICIOUS_PATTERNS.some((pattern) => pattern.test(str));
}

function cleanIp(val) {
  if (!val || typeof val !== "string") return "127.0.0.1";
  let c = val.trim();
  if (c === "::1" || c === "localhost") return "127.0.0.1";
  if (c.startsWith("::ffff:")) c = c.replace("::ffff:", "");
  return c;
}

function extractIps(req) {
  // 1. Device IP: from client-reported WebRTC header or first hop of forwarded-for
  let deviceIp =
    req.headers["x-device-ip"] ||
    req.headers["x-client-device-ip"] ||
    "";

  // 2. Network IP: public router/gateway IP from headers or socket
  let networkIp =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    "";

  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded && typeof forwarded === "string") {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      if (!deviceIp) deviceIp = parts[0];
      if (!networkIp) networkIp = parts[parts.length - 1];
    }
  }

  const socketIp = req.socket?.remoteAddress || req.ip || "127.0.0.1";
  if (!networkIp) networkIp = socketIp;
  if (!deviceIp) deviceIp = networkIp;

  return {
    deviceIp: cleanIp(deviceIp),
    networkIp: cleanIp(networkIp),
  };
}

function getCategory(path, req, res) {
  const p = path.toLowerCase();

  // 1. Security incidents
  if (
    p.includes("wp-admin") ||
    p.includes("phpmyadmin") ||
    p.includes(".env") ||
    p.includes(".git") ||
    res?.statusCode === 403 ||
    res?.statusCode === 429
  ) {
    return "security";
  }

  // 2. Admin Dashboard
  if (p.startsWith("/api/admin")) {
    return "admin_dashboard";
  }

  // 3. Payments & Subscriptions
  if (
    p.startsWith("/api/payment") ||
    p.startsWith("/api/subscription") ||
    p.startsWith("/api/plan") ||
    p.startsWith("/api/checkout") ||
    p.startsWith("/api/shipping-rates")
  ) {
    return "payments_subscriptions";
  }

  // 4. Store
  if (
    p.startsWith("/api/product") ||
    p.startsWith("/api/order") ||
    p.startsWith("/api/store") ||
    p.startsWith("/api/coupon")
  ) {
    return "store";
  }

  // 5. Panel & Profile
  if (
    p.startsWith("/api/auth") ||
    p.startsWith("/api/panel") ||
    p.startsWith("/api/dashboard") ||
    p.startsWith("/api/card") ||
    p.startsWith("/api/user") ||
    p.startsWith("/api/profile") ||
    p.startsWith("/api/public") ||
    p.startsWith("/api/p/") ||
    p.startsWith("/p/") ||
    p.startsWith("/api/analytics") ||
    p.startsWith("/api/appointment") ||
    p.startsWith("/api/hire") ||
    p.startsWith("/api/support") ||
    p.startsWith("/api/upload")
  ) {
    return "panel_profile";
  }

  // 6. System
  if (
    p.startsWith("/api/setting") ||
    p.startsWith("/api/notification") ||
    p.startsWith("/api/health") ||
    p.startsWith("/health")
  ) {
    return "system";
  }

  return "system";
}

function getActionDescription(method, path, statusCode) {
  const p = path.toLowerCase();

  if (p === "/api/auth/login") return "تسجيل دخول مستخدم (User Login)";
  if (p === "/api/auth/register") return "إنشاء حساب جديد (User Registration)";
  if (p === "/api/auth/logout") return "تسجيل خروج (User Logout)";
  if (p === "/api/auth/refresh") return "تجديد جلسة الدخول (Session Token Refresh)";
  if (p === "/api/auth/forgot-password") return "طلب استعادة كلمة المرور (Forgot Password Request)";
  if (p === "/api/auth/reset-password") return "إعادة تعيين كلمة المرور (Reset Password)";
  if (p === "/api/auth/google") return "تسجيل دخول عبر Google (Google Auth)";
  if (p.startsWith("/api/dashboard")) return "تصفح لوحة تحكم المستخدم (User Dashboard Access)";
  if (p.startsWith("/api/panel")) return "إدارة البروفايل الرقمي (Digital Profile Management)";
  if (p.startsWith("/api/cards")) return "إدارة البطاقات الذكية والروابط (Smart Cards & Links)";
  if (p.startsWith("/api/public") || p.startsWith("/api/p/") || p.startsWith("/p/")) return "زيارة صفحة بروفايل عامة (Public Profile Visit)";
  if (p.startsWith("/api/hire")) return "إرسال طلب توظيف أو عمل (Hire Request Submitted)";
  if (p.startsWith("/api/appointment")) return "حجز موعد عبر البروفايل (Appointment Booking)";
  if (p.startsWith("/api/support")) return "إرسال رسالة دعم فني (Support Message Sent)";
  if (p.startsWith("/api/products")) return "تصفح منتجات المتجر (Store Products Viewed)";
  if (p.startsWith("/api/checkout")) return "إتمام طلب شراء من المتجر (Store Checkout Completed)";
  if (p.startsWith("/api/shipping-rates")) return "استعلام عن أسعار الشحن (Shipping Rates Query)";
  if (p.startsWith("/api/payment")) return "عملية دفع إلكتروني (Payment Processing)";
  if (p.startsWith("/api/subscription") || p.startsWith("/api/plans")) return "إدارة الباقات والاشتراكات (Subscription Management)";
  if (p.startsWith("/api/settings")) return "استعلام إعدادات النظام (System Settings Access)";
  if (p.startsWith("/api/notifications")) return "تصفح إشعارات الحساب (Notifications Access)";

  return `${method} ${path} (${statusCode})`;
}

async function emitLog(log) {
  try {
    const { getIO, getRoomTarget } = await import("../services/socketService.js");
    const io = getIO();
    const adminRoom = getRoomTarget(io, "admin_room");
    adminRoom?.emit("newAuditLog", log);
  } catch (err) {
    // Ignore socket errors
  }
}

const securityAudit = async (req, res, next) => {
  const path = req.path.toLowerCase();
  const method = req.method;

  // Ignore noisy health, OPTIONS, and static file requests
  if (
    path === "/api/health" ||
    path === "/health" ||
    method === "OPTIONS" ||
    /\.(png|jpe?g|webp|gif|svg|ico|css|js|map|woff2?|ttf|eot)$/i.test(path)
  ) {
    return next();
  }

  const { deviceIp, networkIp } = extractIps(req);
  const userAgent = req.headers["user-agent"] || "";

  // Location via geoip-lite
  const lookupIp = networkIp !== "127.0.0.1" ? networkIp : deviceIp;
  const geo = geoip.lookup(lookupIp);
  const country = geo?.country || "Unknown";
  const governorate = geo?.region || "Unknown";
  const locationParts = [geo?.city, geo?.region, geo?.country].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : "Unknown";

  const origin = req.headers["origin"] || "";
  const referrer = req.headers["referer"] || req.headers["referrer"] || "";
  const queryString = req.url?.includes("?") ? req.url.split("?")[1] : "";
  const protocol = req.protocol || (req.secure ? "https" : "http");
  const host = req.headers["host"] || "";
  const fullUrl = `${protocol}://${host}${req.originalUrl || req.url || path}`;

  const isExternal =
    !origin.includes("localhost") &&
    !origin.includes("127.0.0.1") &&
    !referrer.includes("localhost") &&
    !referrer.includes("127.0.0.1") &&
    !origin.includes("thenith.com");

  const logBase = {
    ip: deviceIp,
    networkIp,
    country,
    governorate,
    location,
    userAgent,
    referrer,
    origin,
    fullUrl,
    queryString,
    isExternal,
    method,
    path,
  };

  // 1. Scanner / Probing Detection
  const isScanner = SCANNER_PATHS.some((p) => path.includes(p));
  if (isScanner) {
    AuditLog.create({
      ...logBase,
      level: "critical",
      category: "security",
      message: `فحص مسارات أمنية محظورة: ${path} (Directory Probing Attempt)`,
      anomalyScore: 80,
    })
      .then(emitLog)
      .catch(() => {});

    return res.status(403).json({ error: "Access Forbidden." });
  }

  // 2. Malicious Payload Detection
  if (method !== "GET" && (isMalicious(req.body) || isMalicious(req.query))) {
    AuditLog.create({
      ...logBase,
      level: "critical",
      category: "security",
      message: `اكتشاف حمولة بيانات خبيثة XSS/SQLi على ${path} (Malicious Payload)`,
      anomalyScore: 100,
    })
      .then(emitLog)
      .catch(() => {});

    return res.status(403).json({ error: "Access Forbidden: Malicious payload." });
  }

  // 3. Log API Activity (Asynchronous interceptor)
  const originalSend = res.send.bind(res);
  res.send = function (data) {
    res.send = originalSend;

    setImmediate(async () => {
      try {
        const category = getCategory(path, req, res);
        const level =
          res.statusCode >= 500
            ? "critical"
            : res.statusCode >= 400 || category === "security"
              ? "warning"
              : "info";

        // Resolve user identity:
        let resolvedUserId = req.user?._id || null;
        if (!resolvedUserId) {
          const authHeader = req.headers.authorization;
          if (authHeader?.startsWith("Bearer ")) {
            try {
              const payload = verifyAccessToken(authHeader.slice(7).trim());
              if (payload?.sub) resolvedUserId = payload.sub;
            } catch {}
          }
        }

        // If login/register just succeeded, extract user from response data
        if (!resolvedUserId && typeof data === "string" && res.statusCode < 400) {
          try {
            const parsed = JSON.parse(data);
            const userObj = parsed?.user || parsed?.data?.user;
            if (userObj?._id) resolvedUserId = userObj._id;
          } catch {}
        }

        const message = getActionDescription(method, path, res.statusCode);

        const log = await AuditLog.create({
          ...logBase,
          level,
          category,
          userId: resolvedUserId,
          message,
          details: {
            statusCode: res.statusCode,
            ...(req.query && Object.keys(req.query).length > 0 ? { query: req.query } : {}),
          },
          anomalyScore: level === "critical" ? 80 : level === "warning" ? 40 : 0,
        });

        await emitLog(log);
      } catch (err) {
        // Silent catch
      }
    });

    return originalSend(data);
  };

  next();
};

export default { securityAudit };
export { securityAudit };
