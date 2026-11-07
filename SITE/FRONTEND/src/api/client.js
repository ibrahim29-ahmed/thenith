/**
 * src/api/client.js
 *
 * Central Axios configuration for the entire app.
 * ─────────────────────────────────────────────────
 *  apiClient    → Authenticated requests (adds Bearer token + withCredentials)
 *  publicClient → Public/unauthenticated requests (profile pages, etc.)
 *
 * All other service files should import from here — never create ad-hoc
 * axios instances elsewhere.
 */

import axios from "axios";
import { API_BASE_URL, API_CONFIG } from "../config/runtime.js";
import { getLocalizedErrorMessage } from "../utils/errorHandling.js";

// ─── Token Storage ──────────────────────────────────────────────────────────

const TOKEN_KEY = "access_token";
let _inMemoryToken = "";

export const readAuthToken = () => {
  return _inMemoryToken || "";
};

export const saveAuthToken = (token) => {
  _inMemoryToken = token || "";
  try {
    // Purge any legacy token from localStorage
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Silently ignore storage errors in restricted environments.
  }
};

export const clearAuthToken = () => {
  _inMemoryToken = "";
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Silently ignore storage errors.
  }
};

// ─── Shared defaults ────────────────────────────────────────────────────────

const sharedDefaults = {
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.requestTimeout,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
};

// ─── Authenticated Client ────────────────────────────────────────────────────
//  Used for all panel / dashboard / auth endpoints.
//  Automatically injects Bearer token and sends cookies.

export const apiClient = axios.create({
  ...sharedDefaults,
  withCredentials: true,
});

// Helper to avoid duplicate /api prefix when baseURL already ends with /api
const normalizeRequestConfig = (config) => {
  if (config?.url && config?.baseURL) {
    const base = config.baseURL.replace(/\/+$/, "");
    if (base.endsWith("/api") && config.url.startsWith("/api/")) {
      config.url = config.url.slice(4);
    }
  }
  return config;
};

import { getCachedDeviceIp } from "../utils/deviceNetwork.js";

// Request interceptor — attach token & normalize URL
apiClient.interceptors.request.use((config) => {
  normalizeRequestConfig(config);
  const token = readAuthToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const deviceIp = getCachedDeviceIp();
  if (deviceIp && !config.headers["X-Device-IP"]) {
    config.headers["X-Device-IP"] = deviceIp;
  }
  // FormData should not override Content-Type (let browser set boundary)
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// Response interceptor — silent 401 token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    const is401 = error?.response?.status === 401;
    const isRefreshCall = original?.url?.includes("/auth/refresh");

    if (is401 && !original?._retry && !isRefreshCall) {
      original._retry = true;
      try {
        const { data } = await apiClient.post("/auth/refresh");
        if (data?.accessToken) {
          saveAuthToken(data.accessToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(original);
        }
      } catch {
        clearAuthToken();
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

// ─── Public Client ───────────────────────────────────────────────────────────
//  Used for public-facing endpoints (portfolio pages, hire forms, analytics).
//  No auth headers — but still sends cookies for session tracking.

export const publicClient = axios.create({
  ...sharedDefaults,
  withCredentials: true,
});

publicClient.interceptors.request.use((config) => {
  normalizeRequestConfig(config);
  const deviceIp = getCachedDeviceIp();
  if (deviceIp && !config.headers["X-Device-IP"]) {
    config.headers["X-Device-IP"] = deviceIp;
  }
  return config;
});

publicClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeError(error)),
);

// ─── Error normalizer ────────────────────────────────────────────────────────

export function normalizeError(error) {
  if (error?.response) {
    const normalized = new Error(getLocalizedErrorMessage(error));
    normalized.status = error.response.status;
    normalized.response = error.response;
    return normalized;
  }

  if (error?.code === "ECONNABORTED" || error?.message === "canceled") {
    const timeout = new Error(getLocalizedErrorMessage(error));
    timeout.code = "ECONNABORTED";
    return timeout;
  }

  return error;
}

// Keep legacy export name for backwards compatibility
export const normalizeApiError = normalizeError;

// ─── Convenience request helper ─────────────────────────────────────────────
//  Wraps apiClient for service files that used the old `request()` style.
//  Supports both `data` and `body` options (body is stringified automatically).

export async function request(path, options = {}) {
  const { body, data, method = "GET", ...rest } = options;

  const payload =
    data !== undefined
      ? data
      : body !== undefined
        ? typeof body === "string"
          ? JSON.parse(body) // parse so axios re-serializes cleanly
          : body
        : undefined;

  const response = await apiClient({
    url: path,
    method,
    ...rest,
    ...(payload !== undefined ? { data: payload } : {}),
  });

  return response.data;
}

export default apiClient;
