import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import _cors from "./config/cors.js";
const { default: corsOptions } = _cors;
import _rateLimit8502 from "./middleware/rateLimit.js";
const { authRateLimit } = _rateLimit8502;
import authRoutes from "./routes/auth/authRoutes.js";
import planRoutes from "./routes/plans.js";
import subscriptionRoutes from "./routes/subscription.js";
import cardRoutes from "./routes/cards.js";
import dashboardRoutes from "./routes/dashboard/dashboardRoutes.js";
import publicRoutes from "./routes/publicProfile/publicProfileRoutes.js";
import appointmentRoutes from "./routes/appointments.js";
import hireRoutes from "./routes/hire.js";
import analyticsRoutes from "./routes/analytics.js";

import _errorHandler6588 from "./middleware/errorHandler.js";
const { errorHandler } = _errorHandler6588;
import _securityAudit2411 from "./middleware/securityAudit.js";
const { securityAudit } = _securityAudit2411;
import _apiRequest911 from "./middleware/apiRequest.js";
const { blockDocumentRequests } = _apiRequest911;
import _notFound6324 from "./middleware/notFound.js";
const { notFound } = _notFound6324;
import uploadRoutes from "./routes/upload.js";
import supportRoutes from "./routes/support.js";
import settingsRoutes from "./routes/settings.js";
import productRoutes from "./routes/products.js";
import panelRoutes from "./routes/panel/panelRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";
import shippingRoutes from "./routes/shippingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import notificationsRoutes from "./routes/notifications.js";
import policyRoutes from "./routes/policyRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";

export const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../public/uploads");

app.set("trust proxy", 1);

// Private Network Access (PNA) header support for Chromium browsers
app.use((req, res, next) => {
  if (req.headers["access-control-request-private-network"]) {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors(corsOptions));
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── NoSQL Injection Prevention ──
function sanitizeMongoKeys(obj) {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeMongoKeys(obj[key]);
    }
  }
}
app.use((req, _res, next) => {
  if (req.body) sanitizeMongoKeys(req.body);
  if (req.query) sanitizeMongoKeys(req.query);
  if (req.params) sanitizeMongoKeys(req.params);
  next();
});

// ── 1. Security Audit Logger ──
// MUST be placed here before any blockers so it can intercept their responses and log them!
app.use(securityAudit);

// Blocks direct document navigation to API endpoints.
app.use(blockDocumentRequests);

app.get("/api/health", (_request, response) => response.json({ ok: true }));
app.use("/api/auth", authRateLimit, authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/panel", panelRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/hire", hireRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/shipping-rates", shippingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/referrals", referralRoutes);


app.use("/api/public", publicRoutes);
app.use("/api/p", publicRoutes);
app.use("/api/m", publicRoutes);
app.use("/api/pay", publicRoutes);
app.use("/public", publicRoutes);
app.use("/p", publicRoutes);
app.use("/m", publicRoutes);
app.use("/pay", publicRoutes);
app.use("/", publicRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
