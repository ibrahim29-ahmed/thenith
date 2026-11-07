import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import corsOptions from "./config/cors.js";
import adminRoutes from "./routes/adminRoutes.js";
import _errorHandler from "./middleware/errorHandler.js";
const { errorHandler } = _errorHandler;
import _securityAudit from "./middleware/securityAudit.js";
const { securityAudit } = _securityAudit;
import _notFound from "./middleware/notFound.js";
const { notFound } = _notFound;
import _env from "./config/env.js";
const { env } = _env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.set("trust proxy", 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Serve static uploaded files
const uploadsDir = path.resolve(__dirname, "../public/uploads");
app.use("/uploads", express.static(uploadsDir));

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

// ── Security Audit Logger (non-blocking monitoring) ──
app.use(securityAudit);

// Root route: Redirect browser to frontend dashboard or return status JSON
app.get("/", (req, res) => {
  const host = req.hostname || "localhost";
  if (req.accepts("html")) {
    return res.redirect(`http://${host}:3001`);
  }
  return res.json({
    ok: true,
    service: "Thenith Standalone Admin Dashboard Backend",
    dashboard: `http://${host}:3001`,
    port: env.PORT,
    status: "Online",
  });
});

app.get("/api", (_request, response) =>
  response.json({
    ok: true,
    service: "Thenith Admin API",
    routes: "/api/admin/*",
    health: "/api/admin/health",
  }),
);

// Health check
app.get("/api/admin/health", (_request, response) =>
  response.json({
    ok: true,
    service: "Thenith Standalone Admin Dashboard",
    port: env.PORT,
    timestamp: new Date(),
  }),
);

// Mount Admin Routes
app.use("/api/admin", adminRoutes);

// Fallbacks
app.use(notFound);
app.use(errorHandler);

export default app;
