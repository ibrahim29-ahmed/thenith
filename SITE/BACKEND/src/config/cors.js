import _env from "./env.js";

const { env, clientOrigins } = _env;

const normalizeOrigin = (value) => (value || "").trim().replace(/\/+$/, "");
const allowedOrigins = new Set(
  [...clientOrigins, env.APP_URL]
    .map(normalizeOrigin)
    .filter(Boolean),
);

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);
    const isLocalDevOrigin =
      /^(https?:\/\/)(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
        normalizedOrigin,
      );

    if (env.NODE_ENV !== "production" && isLocalDevOrigin) {
      return callback(null, normalizedOrigin);
    }

    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, normalizedOrigin);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Private-Network",
    "access-control-request-private-network",
    "X-Device-IP",
    "x-device-ip",
    "X-Device-Id",
    "x-device-id",
    "X-Client-Device-IP",
    "x-client-device-ip",
    "x-admin-token",
    "x-access-token",
    "X-API-Key",
    "x-api-key",
    "X-Auth-Token",
    "x-auth-token",
    "sec-fetch-dest",
    "sec-fetch-mode",
    "sec-fetch-site",
    "Cache-Control",
    "Pragma",
  ],
  exposedHeaders: ["Set-Cookie", "Authorization", "Content-Disposition", "X-Device-IP", "Access-Control-Allow-Private-Network"],
  optionsSuccessStatus: 204,
};

export default corsOptions;
