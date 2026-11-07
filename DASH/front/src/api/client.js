import axios from "axios";

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4001/api";
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    try {
      const u = new URL(envUrl);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        u.hostname = window.location.hostname;
        return u.toString().replace(/\/+$/, "");
      }
    } catch {}
  }
  return envUrl;
};

export const getBackendUrl = () => {
  return getApiBaseUrl().replace(/\/api\/?$/, "");
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

import { getCachedDeviceIp } from "../utils/deviceNetwork.js";

apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const deviceIp = getCachedDeviceIp();
  if (deviceIp && !config.headers["X-Device-IP"]) {
    config.headers["X-Device-IP"] = deviceIp;
  }
  return config;
});

export default apiClient;
