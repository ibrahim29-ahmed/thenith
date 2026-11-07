import {
  API_BASE_URL,
  PUBLIC_BASE_URL,
  buildApiUrl,
} from "../../config/runtime.js";

export const apiConfig = {
  baseUrl: PUBLIC_BASE_URL,
  profileEndpoint: import.meta.env.VITE_PROFILE_ENDPOINT || "",
  hireEndpoint: import.meta.env.VITE_HIRE_ENDPOINT || "/api/hire",
  requestTimeout: Number(import.meta.env.VITE_API_TIMEOUT || 45000),
  apiBaseUrl: API_BASE_URL,
};

export { buildApiUrl };
