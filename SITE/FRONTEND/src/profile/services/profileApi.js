/**
 * src/profile/services/profileApi.js
 *
 * Public profile fetcher — uses modular publicProfileRoutes.
 */

import api from "../../api/index.js";
import { normalizePortfolio } from "../utils/normalizePortfolio.js";

/**
 * Fetch a portfolio profile from the backend.
 * @param {string} publicId - The public identifier used in the URL.
 * @param {Object} [options] - Optional settings (e.g. { force: true } to bypass cache).
 * @returns {Promise<Object>} Normalized profile object.
 */
export async function fetchProfile(publicId, options = {}) {
  const data = await api.publicProfile.getPublicProfile(publicId, options);
  return normalizePortfolio(data);
}
