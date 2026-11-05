import _env from "./env.js";
const { env, clientOrigins } = _env;

const normalizeOrigin = (value) => (value || "").trim().replace(/\/+$/, "");
const allowedOrigins = new Set(
  [...(clientOrigins || []), env.APP_URL, env.SITE_URL]
    .map(normalizeOrigin)
    .filter(Boolean),
);

const BASE_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "Accept",
  "Origin",
  "User-Agent",
  "X-App-Platform",
  "X-App-Version",
  "X-Device-Id",
  "x-device-id",
  "X-Device-IP",
  "x-device-ip",
  "X-Client-Device-IP",
  "x-client-device-ip",
  "x-admin-token",
  "x-access-token",
  "X-API-Key",
  "x-api-key",
  "X-Auth-Token",
  "x-auth-token",
  "x-internal-secret",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "Cache-Control",
  "Pragma",
];

export const corsOptionsDelegate = (req, callback) => {
  const requestHeaders = req.header
    ? req.header("Access-Control-Request-Headers")
    : req.headers?.["access-control-request-headers"];

  const dynamicHeaders = requestHeaders
    ? requestHeaders.split(",").map((h) => h.trim()).filter(Boolean)
    : [];

  const mergedHeaders = Array.from(new Set([...BASE_ALLOWED_HEADERS, ...dynamicHeaders]));
  const reqOrigin = req.header ? req.header("Origin") : req.headers?.origin;

  let isAllowed = false;
  if (!reqOrigin) {
    isAllowed = true;
  } else {
    const normalized = normalizeOrigin(reqOrigin);
    const isLocalDevOrigin =
      /^(https?:\/\/)(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
        normalized,
      );

    if (env.NODE_ENV !== "production" && isLocalDevOrigin) {
      isAllowed = true;
    } else if (allowedOrigins.has(normalized)) {
      isAllowed = true;
    }
  }

  const options = {
    origin: isAllowed ? reqOrigin || true : false,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: mergedHeaders,
    exposedHeaders: ["Set-Cookie", "Authorization", "Content-Disposition", "X-Device-IP"],
    optionsSuccessStatus: 200,
  };

  callback(null, options);
};

export const corsOptions = corsOptionsDelegate;
export default corsOptionsDelegate;
