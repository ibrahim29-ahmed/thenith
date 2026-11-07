import { request } from "../client.js";

export const authRoutes = {
  requestCode: (email, purpose = "login") =>
    request("/auth/request-code", {
      method: "POST",
      data: { email, purpose },
    }),

  verifyCode: (email, code, purpose = "login", referralCode = undefined) =>
    request("/auth/verify-code", {
      method: "POST",
      data: { email, code, purpose, referralCode },
    }),

  completeRegistration: (payload = {}) =>
    request("/auth/complete-registration", {
      method: "POST",
      data: payload,
    }),

  login: (credentials = {}) =>
    request("/auth/login", {
      method: "POST",
      data: credentials,
    }),

  register: (payload = {}) =>
    request("/auth/register", {
      method: "POST",
      data: payload,
    }),

  logout: () => request("/auth/logout", { method: "POST" }),

  session: () => request("/auth/session"),

  me: () => request("/auth/me"),

  updateMe: (payload = {}) =>
    request("/auth/me", {
      method: "PATCH",
      data: payload,
    }),

  deleteMe: () => request("/auth/me", { method: "DELETE" }),

  refresh: () => request("/auth/refresh", { method: "POST" }),

  checkUsername: (username) =>
    request("/auth/check-username", {
      method: "POST",
      data: { username },
    }),

  googleAuth: (payload, referralCode = undefined) => {
    const data =
      typeof payload === "string"
        ? { credential: payload, token: payload, referralCode }
        : { ...(payload || {}), referralCode };
    return request("/auth/google", {
      method: "POST",
      data,
    });
  },
};

export default authRoutes;
