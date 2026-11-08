/**
 * src/services/fawaterakService.js
 *
 * Fawaterak Payment Gateway — OAuth v3 Integration
 * ─────────────────────────────────────────────────
 * Handles:
 *  - OAuth access token acquisition & refresh
 *  - Listing available payment methods
 *  - Creating transaction intents (hosted checkout or direct dispatch)
 *  - Querying transaction status by intent_key
 *
 * All API calls are server-to-server; credentials never reach the client.
 */

import axios from "axios";
import _env from "../config/env.js";
const { env } = _env;

function sanitizeCustomerText(value, fallback, maxLength = 100) {
  const sanitized = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9@._,: -]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return sanitized || fallback;
}

function sanitizeCustomerEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : "customer@thenith.com";
}

function isPublicHttpsUrl(value) {
  try {
    const url = new URL(String(value));
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "::1"
    );
  } catch {
    return false;
  }
}

function getPublicRedirectionUrls({ successUrl, failUrl, pendingUrl, webhookUrl }) {
  return Object.fromEntries(
    Object.entries({ successUrl, failUrl, pendingUrl, webhookUrl }).filter(
      ([, url]) => isPublicHttpsUrl(url),
    ),
  );
}

// ── In-memory token cache (single-process) ────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Returns a valid Bearer access token, fetching a new one if needed.
 */
async function getAccessToken() {
  if (!env.FAWATERAK_CLIENT_ID || !env.FAWATERAK_CLIENT_SECRET) {
    const error = new Error(
      "إعدادات Fawaterak غير مكتملة: يجب ضبط FAWATERAK_CLIENT_ID وFAWATERAK_CLIENT_SECRET في بيئة الخادم.",
    );
    error.code = "FAWATERAK_CONFIG_MISSING";
    throw error;
  }

  const now = Date.now();
  // Return cached token if it's still valid with a 60-second buffer
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const base = env.FAWATERAK_BASE_URL;
  const response = await axios.post(
    `${base}/oauth/token`,
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.FAWATERAK_CLIENT_ID,
      client_secret: env.FAWATERAK_CLIENT_SECRET,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 8_000,
    }
  );

  const { access_token, expires_in } = response.data;
  if (!access_token) {
    throw new Error("Fawaterak: Failed to obtain access token");
  }

  cachedToken = access_token;
  // expires_in is in seconds; convert to ms
  tokenExpiresAt = now + (expires_in || 3600) * 1_000;

  return access_token;
}

async function executeWithRetry(fn, retries = 1, delay = 1000) {
  try {
    return await fn();
  } catch (err) {
    if (
      retries > 0 &&
      (err.code === "ECONNABORTED" ||
        err.message?.includes("timeout") ||
        !err.response)
    ) {
      await new Promise((res) => setTimeout(res, delay));
      return executeWithRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

/**
 * Returns an authenticated Axios instance pre-configured for Fawaterak API v3.
 */
async function fawaterakClient(options = {}) {
  const token = await getAccessToken();
  return axios.create({
    baseURL: `${env.FAWATERAK_BASE_URL}/api/v3`,
    timeout: options.timeout || 12_000,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the list of integration-enabled payment methods for this vendor.
 * Each item has: payment_method_id, name_en, name_ar, redirect, logo, commission_on_customer
 */
async function getPaymentMethods(options = {}) {
  let response;
  try {
    response = await executeWithRetry(async () => {
      const client = await fawaterakClient({ timeout: options.timeout || 3_000 });
      return client.get("/getTrPaymentmethods");
    }, options.retries ?? 0, 500);
  } catch (err) {
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      throw new Error("استغرقت العملية وقتاً أطول من المتوقع في الاستجابة. يرجى المحاولة مرة أخرى.");
    }
    throw err;
  }

  const { data } = response;
  if (data?.status !== "success") {
    throw new Error("Fawaterak: Failed to fetch payment methods");
  }

  return data.data || [];
}

function normalizeEgyptianPhone(phone) {
  if (!phone) return "";
  let cleaned = String(phone).trim().replace(/[\s\-\(\)\.]/g, "");
  if (cleaned.startsWith("+20")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("+2")) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith("0020")) cleaned = cleaned.slice(4);
  else if (cleaned.startsWith("002")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("20") && cleaned.length === 12) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith("2") && cleaned.length === 12) cleaned = cleaned.slice(1);
  return cleaned;
}

function extractFawaterakErrorMessage(data, fallback = "تعذر بدء عملية الدفع حالياً. يرجى المحاولة مرة أخرى.") {
  if (!data) return fallback;

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return extractFawaterakErrorMessage(parsed, fallback);
    } catch {
      // Continue with string analysis below
    }
  }

  // 1. Extract raw text from various API shapes (Laravel errors, direct message, data payload)
  let raw = "";

  if (typeof data === "string") {
    raw = data;
  } else if (typeof data === "object") {
    // Check Laravel-style validation errors: { errors: { field: ["message"] } }
    if (data.errors && typeof data.errors === "object") {
      const errorValues = Object.values(data.errors);
      if (errorValues.length > 0) {
        const first = errorValues[0];
        if (Array.isArray(first) && first[0]) {
          raw = String(first[0]);
        } else if (typeof first === "string") {
          raw = first;
        }
      }
    }

    if (!raw) {
      raw =
        data.error_message ||
        data.errorMessage ||
        data.message ||
        data.status_text ||
        (typeof data.data === "string" ? data.data : null);
    }

    // Check nested data object if raw is still empty
    if (!raw && data.data && typeof data.data === "object") {
      raw =
        data.data.error_message ||
        data.data.errorMessage ||
        data.data.message ||
        data.data.error ||
        "";
    }
  }

  if (!raw || typeof raw !== "string") {
    return fallback;
  }

  const clean = raw.trim();

  // Return the exact error string from Fawaterak API, removing only the phrase "بوابة دفع" if present
  return clean
    .replace(/بوابة\s+الدفع/gi, "الخدمة")
    .replace(/بوابة\s+دفع/gi, "وسيلة دفع")
    .replace(/payment\s+gateway/gi, "payment service")
    .trim();
}

/**
 * Creates a transaction intent on Fawaterak.
 *
 * @param {object} opts
 * @param {number}  opts.amount        - Total amount in EGP
 * @param {number}  [opts.methodId]    - payment_method_id (omit for hosted checkout)
 * @param {string}  [opts.walletNumber]- Mobile wallet number (Meeza / Electronic wallets)
 * @param {object}  opts.customer      - { firstName, lastName, email, phone, address, userId }
 * @param {string}  opts.orderId       - Internal order/subscription ID (stored in pay_load)
 * @param {string}  opts.orderType     - "store" | "subscription"
 * @param {string}  opts.successUrl
 * @param {string}  opts.failUrl
 * @param {string}  opts.pendingUrl
 * @param {string}  opts.webhookUrl
 *
 * @returns {object} Fawaterak response data:
 *   Hosted:  { intent_key, url, expires_in }
 *   Direct:  { intent_key, payment_data }
 */
async function createTransaction(opts) {
  const {
    amount,
    methodId,
    walletNumber,
    customer = {},
    orderId,
    orderType,
    successUrl,
    failUrl,
    pendingUrl,
    webhookUrl,
  } = opts;

  const cleanWallet = normalizeEgyptianPhone(walletNumber);
  const cleanPhone =
    normalizeEgyptianPhone(customer.phone) ||
    cleanWallet ||
    "01000000000";
  const redirectionUrls = getPublicRedirectionUrls({
    successUrl,
    failUrl,
    pendingUrl,
    webhookUrl,
  });

  const payload = {
    cartTotal: Number(amount),
    currency: "EGP",
    customer: {
      first_name: sanitizeCustomerText(customer.firstName, "Customer", 60),
      last_name: sanitizeCustomerText(customer.lastName, "Customer", 60),
      email: sanitizeCustomerEmail(customer.email),
      phone: cleanPhone,
      address: sanitizeCustomerText(customer.address, "Egypt", 150),
      ...(customer.userId
        ? { customer_unique_id: String(customer.userId) }
        : {}),
    },
    cartItems: [
      {
        name: orderType === "subscription" ? "Thenith Pro Subscription" : "Thenith Store Order",
        price: Number(amount),
        quantity: 1,
      },
    ],
    payLoad: {
      order_id: String(orderId),
      order_type: orderType, // "store" | "subscription"
    },
    ...(Object.keys(redirectionUrls).length > 0 ? { redirectionUrls } : {}),
    sendEmail: false,
    sendSMS: false,
    lang: "ar",
  };

  // Direct payment method selected
  if (methodId) {
    payload.payment_method_id = Number(methodId);
    if (cleanWallet) {
      payload.mobileWalletNumber = cleanWallet;
    }
  }

  let response;
  try {
    response = await executeWithRetry(async () => {
      const client = await fawaterakClient();
      return client.post("/createTransaction", payload);
    }, 1, 1500);
  } catch (err) {
    console.error("[Fawaterak] createTransaction failed", {
      status: err.response?.status || null,
      response: err.response?.data ?? null,
      code: err.code || null,
      message: err.message,
    });
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      throw new Error("استغرقت العملية وقتاً أطول من المتوقع في معالجة طلبك. يرجى المحاولة مرة أخرى.");
    }
    const errData = err.response?.data;
    const cleanMsg = extractFawaterakErrorMessage(errData, err.message);
    const gatewayError = new Error(cleanMsg);
    if (err.code) gatewayError.code = err.code;
    throw gatewayError;
  }

  const { data } = response;
  if (data?.status !== "success") {
    const cleanMsg = extractFawaterakErrorMessage(data, "Transaction creation failed");
    throw new Error(cleanMsg);
  }

  return data.data;
}

/**
 * Creates a hosted Card Tokenization screen link to securely save a customer's Visa/Mastercard.
 */
async function createCardTokenScreen(opts) {
  const {
    customer = {},
    amount = 0,
    deductTotalAmount = false,
    orderId = "",
    orderType = "subscription",
    successUrl,
    failUrl,
    webhookUrl,
  } = opts;
  const base = env.FAWATERAK_BASE_URL;

  const payload = {
    order: {
      currency: "EGP",
      ...(amount > 0 ? {
        cartTotal: Number(amount),
        cartItems: [
          {
            name: orderType === "subscription" ? "Pro Subscription" : "Order Payment",
            price: Number(amount),
            quantity: 1,
          },
        ],
      } : {}),
    },
    ...(deductTotalAmount ? { deduct_total_amount: true } : {}),
    customerData: {
      customer_unique_id: String(customer.userId || customer.email || "customer_1"),
      customer_first_name: customer.firstName || "Customer",
      customer_last_name: customer.lastName || ".",
      customer_email: customer.email || "customer@thenith.com",
      customer_phone: normalizeEgyptianPhone(customer.phone) || "01000000000",
    },
    redirectionUrls: {
      success_url: successUrl,
      fail_url: failUrl,
      ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
    },
  };

  let tokenAuth = env.FAWATERAK_API_KEY;
  if (!tokenAuth) {
    try {
      tokenAuth = await getAccessToken();
    } catch {}
  }

  const response = await axios.post(`${base}/api/v2/createCardTokenScreen`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenAuth}`,
    },
    timeout: 30_000,
  });

  const { data } = response;
  if (data?.status !== "success") {
    throw new Error(data?.message || "Failed to create card token screen");
  }

  const screenUrl = data.redirectUrl || data.url || data.link || (data.data?.url);
  return {
    url: screenUrl,
    redirectUrl: screenUrl,
    ...data,
  };
}

/**
 * Charges a saved card token directly for subscription auto-renewal (e.g. after 30 days).
 */
async function createTokenizationPayRequest(opts) {
  const {
    token,
    amount,
    customer = {},
    orderId,
    orderType = "subscription",
  } = opts;

  const base = env.FAWATERAK_BASE_URL;
  const payload = {
    token,
    order: {
      currency: "EGP",
      cartTotal: Number(amount),
      cartItems: [
        {
          name: "Thenith Subscription Renewal",
          price: Number(amount),
          quantity: 1,
        },
      ],
    },
    customerData: {
      customer_unique_id: String(customer.userId || ""),
      customer_first_name: customer.firstName || "Customer",
      customer_last_name: customer.lastName || ".",
      customer_email: customer.email || "customer@thenith.com",
      customer_phone: normalizeEgyptianPhone(customer.phone) || "01000000000",
    },
    payLoad: {
      order_id: String(orderId),
      order_type: orderType,
      is_renewal: true,
      timestamp: Date.now(),
    },
  };

  let tokenAuth = env.FAWATERAK_API_KEY;
  if (!tokenAuth) {
    try {
      tokenAuth = await getAccessToken();
    } catch {}
  }

  const response = await axios.post(`${base}/api/v2/createTokenizationPayRequest`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenAuth}`,
    },
    timeout: 45_000,
  });

  return response.data;
}

/**
 * Fetches the current status of a transaction by its intent_key.
 * Returns { paid, status_text, payment_method, total, pay_load, transaction_history, ... }
 */
async function getTransactionData(intentKey) {
  let response;
  try {
    response = await executeWithRetry(async () => {
      const client = await fawaterakClient();
      return client.post("/getTransactionData", { intent_key: intentKey });
    }, 1, 1000);
  } catch (err) {
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      throw new Error("استغرقت العملية وقتاً أطول من المتوقع في الاستجابة. يرجى المحاولة مرة أخرى.");
    }
    throw new Error(`Fawaterak: ${err.message}`);
  }

  const { data } = response;
  if (data?.status !== "success") {
    throw new Error(`Fawaterak: Failed to fetch transaction — ${data?.message}`);
  }

  return data.data;
}

/**
 * Cancels or deletes an invoice on Fawaterak API so it does not stay pending.
 * @param {string} intentKey - Transaction intent_key
 * @param {string|number} [invoiceId] - Fawaterak invoice_id / reference
 */
async function cancelInvoice(intentKey, invoiceId) {
  if (!intentKey && !invoiceId) return { success: false, message: "No identifier provided" };
  try {
    const client = await fawaterakClient();
    const payload = {};
    if (invoiceId) payload.invoice_id = Number(invoiceId) || invoiceId;
    if (intentKey) payload.intent_key = intentKey;

    // Try Fawaterak endpoints in order of API v3/v2 spec
    const endpoints = ["/deleteInvoice", "/cancelInvoice", "/cancelTransaction", "/invoice/delete"];
    for (const ep of endpoints) {
      try {
        const res = await client.post(ep, payload);
        if (res.data?.status === "success" || res.status === 200) {
          return { success: true, endpoint: ep, data: res.data };
        }
      } catch (e) {
        // Continue to next endpoint if 404 or unsupported
      }
    }
    return { success: false, notSupported: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default {
  getAccessToken,
  getPaymentMethods,
  createTransaction,
  getTransactionData,
  cancelInvoice,
  createCardTokenScreen,
  createTokenizationPayRequest,
};
