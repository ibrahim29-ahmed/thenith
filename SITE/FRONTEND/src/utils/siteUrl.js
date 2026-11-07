/**
 * src/utils/siteUrl.js
 * Centralized Single Source of Truth for the site's canonical base URL.
 * Reads from VITE_SITE_URL in .env, falling back to window.location.origin in browsers.
 */

export const SITE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SITE_URL) ||
  (typeof window !== "undefined" && window.location && window.location.origin) ||
  "http://localhost:3000"
).replace(/\/+$/, "");

export function getSiteUrl() {
  return SITE_URL;
}

export function buildProfileUrl(identifier = "") {
  const cleanId = String(identifier || "").trim().replace(/^\/+/, "");
  return cleanId ? `${SITE_URL}/p/${cleanId}` : `${SITE_URL}/p/preview`;
}

export function buildCardUrl(cardIdentifier = "") {
  const cleanId = String(cardIdentifier || "").trim().replace(/^\/+/, "");
  return cleanId ? `${SITE_URL}/c/${cleanId}` : SITE_URL;
}

export default SITE_URL;
