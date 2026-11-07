/**
 * src/panel/services/authApi.js
 *
 * Authentication service layer for the user panel.
 * All calls go through the central api client & routes.
 */

import api from "../../api/index.js";
import {
  clearAuthToken,
  saveAuthToken,
  request as apiRequest,
} from "../../api/client.js";

// ─── In-memory token mirror (optional fast-read) ────────────────────────────
let _memToken = null;

export const getAccessToken = () => _memToken || null;

export function saveAccessToken(token) {
  _memToken = token || null;
  saveAuthToken(token);
}

export function clearAccessToken() {
  _memToken = null;
  clearAuthToken();
}

// ─── Session ─────────────────────────────────────────────────────────────────

/**
 * Restore session from server.
 * Works with both cookie-based and token-based auth:
 *  - If the server returns an accessToken, we store it locally.
 *  - If the server only uses httpOnly cookies, we just trust the response.
 */
export async function restoreSession() {
  try {
    const data = await api.auth.session();
    if (data?.authenticated && data?.accessToken) {
      saveAccessToken(data.accessToken);
    }
    return data ?? { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}

// ─── Email OTP flow ───────────────────────────────────────────────────────────

export async function requestEmailCode(email, purpose) {
  return api.auth.requestCode(email, purpose);
}

export async function verifyEmailCode(email, code, purpose, referralCode) {
  const data = await api.auth.verifyCode(email, code, purpose, referralCode);
  if (data?.accessToken) saveAccessToken(data.accessToken);
  return data;
}

export async function completeRegistration(payload) {
  const data = await api.auth.completeRegistration(payload);
  if (data?.accessToken) saveAccessToken(data.accessToken);
  return data;
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function googleLogin(credentialOrToken, referralCode) {
  const data = await api.auth.googleAuth(credentialOrToken, referralCode);
  if (data?.accessToken) saveAccessToken(data.accessToken);
  return data;
}

// ─── Username ─────────────────────────────────────────────────────────────────

export async function checkUsername(username) {
  return api.auth.checkUsername(username);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile() {
  return api.panel.getProfile();
}

export async function saveProfile(profile) {
  const payload = {
    name: profile.fullName || profile.name || "",
    phone: profile.phone || "",
    address: profile.address || "",
    username: profile.username || "",
    orders: profile.orders || [],
  };

  return api.panel.updateProfile(payload);
}

export async function requestSecondaryEmail(email) {
  return api.panel.requestSecondaryEmail({ email });
}

export async function verifySecondaryEmail(email, code) {
  return api.panel.verifySecondaryEmail({ email, code });
}

export async function deleteSecondaryEmail(email) {
  return api.panel.deleteSecondaryEmail({ email });
}

// ─── Logout / Delete ─────────────────────────────────────────────────────────

export async function logout() {
  try {
    await api.auth.logout();
  } finally {
    clearAccessToken();
    localStorage.removeItem("thenith_support_guest_id");
  }
}

export async function deleteAccount() {
  await api.auth.deleteMe();
  clearAccessToken();
  localStorage.removeItem("thenith_support_guest_id");
}

// Re-export for consumers that import directly
export { apiRequest };
