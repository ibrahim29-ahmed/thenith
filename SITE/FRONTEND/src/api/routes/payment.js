import { request } from "../client.js";

export const paymentRoutes = {
  /**
   * Get available Fawaterak payment methods for this vendor.
   * Returns array of { payment_method_id, name_ar, name_en, redirect, logo, commission_on_customer }
   */
  getMethods: () => request("/payment/methods"),

  /**
   * Get pending payments for the current user (subscriptions and orders)
   * @returns { subscriptions, orders }
   */
  getPending: () => request("/payment/pending"),

  /**
   * Create a subscription payment intent.
   * @param {object} body - { planId, billingPeriod, methodId?, walletNumber?, couponCode? }
   * @returns { intentKey, checkoutUrl?, paymentData?, subscriptionId, amount }
   */
  createSubscriptionIntent: (body) =>
    request("/payment/subscription", { method: "POST", data: body }),

  /**
   * Create a payment intent for an existing order.
   * @param {string} orderId
   * @param {object} body - { methodId?, walletNumber? }
   * @returns { intentKey, checkoutUrl?, paymentData?, orderId, amount }
   */
  createOrderIntent: (orderId, body) =>
    request(`/payment/order/${orderId}`, { method: "POST", data: body }),

  /**
   * Verify a completed transaction by intentKey or extra identifiers (invoice_id).
   * @param {string} intentKey
   * @param {object} [extraData]
   * @returns { success, status, type, state? }
   */
  verify: (intentKey, extraData = {}) => {
    const cleanKey =
      intentKey && intentKey !== "undefined" && intentKey !== "null"
        ? intentKey
        : undefined;
    return request("/payment/verify", {
      method: "POST",
      data: { intentKey: cleanKey, ...extraData },
    });
  },

  /**
   * Cancel a pending transaction by intentKey.
   * @param {string} intentKey
   * @returns { success, message }
   */
  cancel: (intentKey) =>
    request("/payment/cancel", { method: "POST", data: { intentKey } }),

  /**
   * Get invoice details from backend to ensure secure amount loading
   * @param {string} type - "order" or "subscription"
   * @param {string} id - Order ID, Plan ID, or Transaction ID
   */
  getInvoiceDetails: (type, id, billingPeriod, couponCode, intentKey) => {
    const safeType = type === "store" ? "order" : type;
    let url = `/payment/invoice/${safeType}/${encodeURIComponent(id)}?`;
    if (billingPeriod) url += `billingPeriod=${billingPeriod}&`;
    if (couponCode) url += `couponCode=${encodeURIComponent(couponCode)}&`;
    if (intentKey && intentKey !== "undefined" && intentKey !== "null") {
      url += `intentKey=${encodeURIComponent(intentKey)}&`;
    }
    return request(url.replace(/[?&]$/, ""));
  },
};

export default paymentRoutes;
