const normalizeBaseUrl = (value, fallback = "/api") => {
  const raw = (value || fallback).trim();
  if (!raw) return fallback;

  const trimmed = raw.replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return fallback;

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }

  return trimmed;
};

const envApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  (import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, "")}/api`
    : undefined) ||
  "/api";

const rawApiBaseUrl = normalizeBaseUrl(envApiBaseUrl, "/api");

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, "");
export const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "/public");
export const RUNTIME_CONFIG = {
  apiBaseUrl: API_BASE_URL,
  publicBaseUrl: PUBLIC_BASE_URL,
  requestTimeout: Number(import.meta.env.VITE_API_TIMEOUT || 45000),
  withCredentials: true,
};

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  publicBaseUrl: PUBLIC_BASE_URL,
  requestTimeout: RUNTIME_CONFIG.requestTimeout,
  withCredentials: true,
  defaultHeaders: {
    Accept: "application/json",
  },
};

export function buildApiUrl(endpoint = "") {
  if (!endpoint) return API_BASE_URL;
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (endpoint.startsWith("/api/") || endpoint.startsWith("/public/")) {
    return endpoint;
  }

  const normalized = endpoint.replace(/^\/+/, "");
  return `${API_BASE_URL}/${normalized}`;
}

export function buildPublicUrl(endpoint = "") {
  if (!endpoint) return PUBLIC_BASE_URL;
  if (/^https?:\/\//i.test(endpoint)) return endpoint;

  const normalized = endpoint.replace(/^\/+/, "");
  return `${PUBLIC_BASE_URL}/${normalized}`;
}
