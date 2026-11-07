import rateLimit from "express-rate-limit";

// Limits authentication and public submission attempts to reduce abuse.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (request) =>
    ["/session", "/refresh", "/me", "/logout", "/check-username"].includes(
      request.path,
    ),
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many authentication attempts",
    },
  },
});

const usernameRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "Too many username checks" },
  },
});

const publicRequestRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many submissions, please try again later",
    },
  },
});

const supportRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many support requests",
    },
  },
});

const analyticsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many analytics events",
    },
  },
});

const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many admin login attempts",
    },
  },
});

const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many webhook requests",
    },
  },
});

const publicProfileRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many profile requests, please try again in a minute",
    },
  },
});

export {
  authRateLimit,
  usernameRateLimit,
  publicRequestRateLimit,
  supportRateLimit,
  analyticsRateLimit,
  adminLoginRateLimit,
  webhookRateLimit,
  publicProfileRateLimit,
};

export default {
  authRateLimit,
  usernameRateLimit,
  publicRequestRateLimit,
  supportRateLimit,
  analyticsRateLimit,
  adminLoginRateLimit,
  webhookRateLimit,
  publicProfileRateLimit,
};
