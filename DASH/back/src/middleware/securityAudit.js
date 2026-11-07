import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import _envConfig from "../config/env.js";
import geoip from "geoip-lite";

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
  let deviceIp =
    req.headers["x-device-ip"] ||
    req.headers["x-client-device-ip"] ||
    "";

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

let _io = null;

export function setIO(ioInstance) {
  _io = ioInstance;
}

async function emitLog(log) {
  try {
    if (_io) {
      _io.to("admin_room").emit("newAuditLog", log);
      return;
    }
    const socketModule = await import("../services/socketService.js");
    const io = socketModule.default.getIO();
    io.to("admin_room").emit("newAuditLog", log);
  } catch (err) {
    // Silent
  }
}

function getCategory(path) {
  const p = path.toLowerCase();

  if (
    p.includes("wp-admin") ||
    p.includes("phpmyadmin") ||
    p.includes(".env") ||
    p.includes(".git")
  ) {
    return "security";
  }

  if (
    p.includes("/payment-methods") ||
    p.includes("/shipping-rates") ||
    p.includes("/plans") ||
    p.includes("/subscription")
  ) {
    return "payments_subscriptions";
  }

  if (p.includes("/product") || p.includes("/order") || p.includes("/coupon")) {
    return "store";
  }

  if (p.includes("/settings") || p.includes("/seo") || p.includes("/mail-settings")) {
    return "system";
  }

  if (p.startsWith("/api/admin")) {
    return "admin_dashboard";
  }

  return "system";
}

function getAdminActionDescription(method, path, statusCode) {
  const p = path.toLowerCase();

  if (p === "/api/admin/login") return "تسجيل دخول لوحة تحكم الأدمن (Admin Login)";
  if (p === "/api/admin/stats") return "استعراض إحصائيات النظام العامة (Dashboard Stats)";
  if (p.startsWith("/api/admin/users")) {
    if (method === "GET") return "استعراض بيانات وقائمة المستخدمين (Users List)";
    if (method === "POST") return "إضافة مستخدم جديد عبر الأدمن (User Created by Admin)";
    if (method === "PATCH" && p.includes("/ban")) return "تغيير حالة حظر المستخدم (User Ban Toggled)";
    return "تحديث بيانات مستخدم بواسطة الأدمن (User Modified by Admin)";
  }
  if (p.startsWith("/api/admin/cards")) return "إدارة البطاقات والـ NFC عبر الأدمن (Cards Management)";
  if (p.startsWith("/api/admin/products")) return "إدارة منتجات المتجر بواسطة الأدمن (Admin Store Products)";
  if (p.startsWith("/api/admin/orders")) return "إدارة وتحديث طلبات المتجر (Admin Store Orders)";
  if (p.startsWith("/api/admin/plans")) return "تحديث وإدارة باقات الاشتراك (Plans Management)";
  if (p.startsWith("/api/admin/coupons")) return "إدارة كوبونات الخصم (Coupons Management)";
  if (p.startsWith("/api/admin/settings")) return "تحديث إعدادات المنصة والهوية (Platform Settings Updated)";
  if (p.startsWith("/api/admin/seo")) return "تحديث إعدادات السيو والسايت ماب (SEO & Sitemap Updated)";
  if (p.startsWith("/api/admin/mail-settings")) return "تحديث إعدادات وقوالب البريد الإلكتروني (Email Settings Updated)";
  if (p.startsWith("/api/admin/payment-methods")) return "إدارة وسائل الدفع الإلكتروني (Payment Methods Updated)";
  if (p.startsWith("/api/admin/customer-services")) return "إدارة رسائل ومحادثات خدمة العملاء (Customer Support)";

  return `${method} ${path} (${statusCode})`;
}

const securityAudit = async (req, res, next) => {
  const path = req.path.toLowerCase();
  const method = req.method;

  // IMPORTANT: Do NOT log audit log queries or health check to avoid infinite recursion!
  if (
    path.startsWith("/api/admin/audit") ||
    path === "/api/health" ||
    path === "/api/admin/health" ||
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

  // 1. Scanner Detection
  const isScanner = SCANNER_PATHS.some((p) => path.includes(p));
  if (isScanner) {
    AuditLog.create({
      ...logBase,
      level: "critical",
      category: "security",
      message: `فحص مسارات محظورة في لوحة التحكم: ${path}`,
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
      message: `محاولة إدخال حمولة خبيثة XSS/SQLi على مسار الأدمن: ${path}`,
      anomalyScore: 100,
    })
      .then(emitLog)
      .catch(() => {});
    return res.status(403).json({ error: "Access Forbidden: Malicious payload." });
  }

  // 3. Log API Activity (Asynchronous)
  const originalSend = res.send.bind(res);
  res.send = function (data) {
    res.send = originalSend;

    setImmediate(async () => {
      try {
        const category = getCategory(path);
        const level =
          res.statusCode >= 500
            ? "critical"
            : res.statusCode >= 400 || category === "security"
              ? "warning"
              : "info";

        let resolvedUserId = null;
        if (req.admin?.id && mongoose.Types.ObjectId.isValid(req.admin.id)) {
          resolvedUserId = req.admin.id;
        }

        const message = getAdminActionDescription(method, path, res.statusCode);

        const log = await AuditLog.create({
          ...logBase,
          level,
          category,
          userId: resolvedUserId,
          message,
          details: {
            statusCode: res.statusCode,
            adminUsername: req.admin?.username || "Admin",
            ...(req.query && Object.keys(req.query).length > 0 ? { query: req.query } : {}),
          },
          anomalyScore: level === "critical" ? 80 : level === "warning" ? 40 : 0,
        });

        await emitLog(log);
      } catch (err) {
        // Silent
      }
    });

    return originalSend(data);
  };

  next();
};

export default { securityAudit };
export { securityAudit };
