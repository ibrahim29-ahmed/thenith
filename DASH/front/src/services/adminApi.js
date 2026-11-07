import apiClient from "../api/client.js";

export async function adminFetch(path, options = {}) {
  const token = localStorage.getItem("admin_token");
  const { data } = await apiClient({
    url: path,
    method: "GET",
    withCredentials: true,
    ...options,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  return data;
}

export async function loginAdmin(username, password) {
  const { data } = await apiClient.post(
    "/admin/login",
    { username, password },
    { withCredentials: true },
  );

  if (data?.token) {
    localStorage.setItem("admin_token", data.token);
  }

  return data;
}

// ===== STATS =====
export async function fetchStats() {
  return adminFetch("/admin/stats");
}

// ===== USERS =====
export async function fetchUsers(params = {}) {
  const query = new URLSearchParams(params).toString();
  return adminFetch(`/admin/users${query ? `?${query}` : ""}`);
}

export async function createUser(data) {
  return adminFetch("/admin/users", {
    method: "POST",
    data,
  });
}

export async function updateUser(id, data) {
  return adminFetch(`/admin/users/${id}`, {
    method: "PATCH",
    data,
  });
}

export async function toggleBanUser(id) {
  return adminFetch(`/admin/users/${id}/ban`, { method: "PATCH" });
}

export async function changeUserPlan(id, data) {
  return adminFetch(`/admin/users/${id}/plan`, {
    method: "PATCH",
    data,
  });
}

export async function toggleUserPaymentPlus(id) {
  return adminFetch(`/admin/users/${id}/toggle-payment-plus`, {
    method: "PATCH",
  });
}

export async function deleteUser(id) {
  return adminFetch(`/admin/users/${id}`, { method: "DELETE" });
}

export async function fetchUserCards(userId) {
  return adminFetch(`/admin/users/${userId}/cards`);
}

export async function fetchCard(cardId) {
  return adminFetch(`/admin/cards/${cardId}`);
}

export async function updateCard(cardId, data) {
  return adminFetch(`/admin/cards/${cardId}`, {
    method: "PATCH",
    data,
  });
}

export async function deleteCard(cardId) {
  return adminFetch(`/admin/cards/${cardId}`, { method: "DELETE" });
}

// ===== PLANS =====
export async function fetchPlans() {
  return adminFetch("/admin/plans");
}

export async function createPlan(data) {
  return adminFetch("/admin/plans", {
    method: "POST",
    data,
  });
}

export async function updatePlan(id, data) {
  return adminFetch(`/admin/plans/${id}`, {
    method: "PUT",
    data,
  });
}

export async function deletePlan(id) {
  return adminFetch(`/admin/plans/${id}`, { method: "DELETE" });
}

export async function fetchSubscriptionStats() {
  return adminFetch("/admin/subscriptions/stats");
}

export async function fetchSubscriptionEvents(params = {}) {
  const query = new URLSearchParams(params).toString();
  return adminFetch(`/admin/subscriptions/events?${query}`);
}

export async function fetchFilteredUsers(filter) {
  return adminFetch(`/admin/subscriptions/filtered-users?filter=${filter}`);
}

export async function cancelUserSubscriptionByAdmin(userId, reason = "إلغاء الاشتراك من قبل الأدمن") {
  return adminFetch(`/admin/subscriptions/cancel-user/${userId}`, {
    method: "POST",
    data: { reason },
  });
}

// ===== UPLOAD =====
export async function uploadAdminImage(base64Image, folder = "thenith_admin") {
  return adminFetch("/admin/upload", {
    method: "POST",
    data: { image: base64Image, folder },
  });
}

// ===== PRODUCTS =====
export async function fetchProducts() {
  return adminFetch("/admin/products");
}

export async function createProduct(data) {
  return adminFetch("/admin/products", {
    method: "POST",
    data,
  });
}

export async function updateProduct(id, data) {
  return adminFetch(`/admin/products/${id}`, {
    method: "PUT",
    data,
  });
}

export async function deleteProduct(id) {
  return adminFetch(`/admin/products/${id}`, { method: "DELETE" });
}

// ===== STORE CATEGORIES =====
export async function fetchCategories() {
  return adminFetch("/admin/categories");
}

export async function createCategory(data) {
  return adminFetch("/admin/categories", {
    method: "POST",
    data,
  });
}

export async function updateCategory(id, data) {
  return adminFetch(`/admin/categories/${id}`, {
    method: "PUT",
    data,
  });
}

export async function deleteCategory(id) {
  return adminFetch(`/admin/categories/${id}`, { method: "DELETE" });
}

// ===== STORE STATS & ORDERS =====
export async function fetchStoreStats() {
  return adminFetch("/admin/store/stats");
}

export async function fetchOrders() {
  return adminFetch("/admin/orders");
}

export async function updateOrderStatus(id, data) {
  return adminFetch(`/admin/orders/${id}/status`, {
    method: "PATCH",
    data,
  });
}

export async function deleteOrder(id) {
  return adminFetch(`/admin/orders/${id}`, { method: "DELETE" });
}

// ===== COUPONS =====
export async function fetchCoupons() {
  return adminFetch("/admin/coupons");
}

export async function createCoupon(data) {
  return adminFetch("/admin/coupons", {
    method: "POST",
    data,
  });
}

export async function updateCoupon(id, data) {
  return adminFetch(`/admin/coupons/${id}`, {
    method: "PUT",
    data,
  });
}

export async function deleteCoupon(id) {
  return adminFetch(`/admin/coupons/${id}`, { method: "DELETE" });
}

// ===== STORE SETTINGS =====
export async function fetchStoreSettings() {
  return adminFetch("/admin/settings/store");
}

export async function updateStoreSettings(data) {
  return adminFetch("/admin/settings/store", {
    method: "PUT",
    data,
  });
}

export async function fetchSiteSettings() {
  return adminFetch("/admin/settings");
}

export async function updateSiteSettings(data) {
  return adminFetch("/admin/settings", {
    method: "PUT",
    data,
  });
}

export async function fetchCmsSettings() {
  return adminFetch("/admin/settings/landing");
}

export async function updateCmsSettings(data) {
  return adminFetch("/admin/settings/landing", {
    method: "PUT",
    data,
  });
}

// ===== CUSTOM CARD STUDIO SETTINGS =====
export async function fetchCustomCardSettings() {
  return adminFetch("/admin/settings/custom-card");
}

export async function updateCustomCardSettings(data) {
  return adminFetch("/admin/settings/custom-card", {
    method: "PUT",
    data,
  });
}

// ===== MESSAGES (INBOX) =====
export async function fetchMessages() {
  return adminFetch("/admin/messages");
}

export async function markMessageRead(id) {
  return adminFetch(`/admin/messages/${id}/read`, { method: "PATCH" });
}

export async function deleteMessage(id) {
  return adminFetch(`/admin/messages/${id}`, { method: "DELETE" });
}

export async function fetchShippingRates() { return adminFetch('/admin/shipping-rates'); }
export async function createShippingRate(data) { return adminFetch('/admin/shipping-rates', { method: 'POST', data }); }
export async function updateShippingRate(id, data) { return adminFetch('/admin/shipping-rates/' + id, { method: 'PUT', data }); }
export async function deleteShippingRate(id) { return adminFetch('/admin/shipping-rates/' + id, { method: 'DELETE' }); }

export async function bulkUpdateShippingCost(data) { return adminFetch('/admin/shipping-rates/bulk-update', { method: 'POST', data }); }

// ===== PHYSICAL SMART CARDS MANAGEMENT =====
export async function fetchPhysicalCards(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return adminFetch(`/admin/cards${qs ? `?${qs}` : ""}`);
}

export async function fetchPhysicalCardStats() {
  return adminFetch("/admin/cards/stats");
}

export async function createPhysicalCard(data) {
  return adminFetch("/admin/cards", {
    method: "POST",
    data,
  });
}

export async function createBulkPhysicalCards(data) {
  return adminFetch("/admin/cards/bulk", {
    method: "POST",
    data,
  });
}

export async function updateBulkPhysicalCardsStatus(cardIds, operationalStatus) {
  return adminFetch("/admin/cards/bulk-status", {
    method: "PATCH",
    data: { cardIds, operationalStatus },
  });
}

export async function fetchPhysicalCardDetails(id) {
  return adminFetch(`/admin/cards/${id}`);
}

export async function updatePhysicalCardDetails(id, data) {
  return adminFetch(`/admin/physical-cards/${id}`, {
    method: "PATCH",
    data,
  });
}

export async function updatePhysicalCardStatus(id, data) {
  return adminFetch(`/admin/cards/${id}/status`, {
    method: "PATCH",
    data,
  });
}

export async function unlinkPhysicalCard(id) {
  return adminFetch(`/admin/cards/${id}/unlink`, {
    method: "POST",
  });
}

export async function deletePhysicalCard(id) {
  return adminFetch(`/admin/physical-cards/${id}`, {
    method: "DELETE",
  });
}

export async function fetchPhysicalCardQr(id, format = "png") {
  return adminFetch(`/admin/cards/${id}/qr?format=${format}`);
}

export async function fetchPhysicalCardLogs(id) {
  return adminFetch(`/admin/cards/${id}/logs`);
}

export async function startNfcProvisioning(id) {
  return adminFetch(`/admin/cards/${id}/nfc/provision`, {
    method: "POST",
  });
}

export async function verifyNfcProvisioning(id, data) {
  return adminFetch(`/admin/cards/${id}/nfc/verify`, {
    method: "POST",
    data,
  });
}

export async function simulateNfcTest(id) {
  return adminFetch(`/admin/cards/${id}/nfc/simulate-test`, {
    method: "POST",
  });
}

// ===== CARD BATCHES & INVENTORY =====
export async function fetchCardBatches() {
  return adminFetch("/admin/card-batches");
}

export async function createCardBatch(data) {
  return adminFetch("/admin/card-batches", {
    method: "POST",
    data,
  });
}

export async function fetchCardBatchDetails(id) {
  return adminFetch(`/admin/card-batches/${id}`);
}

// ===== PAYMENT METHODS CONTROL =====
export async function fetchPaymentMethods() {
  return adminFetch("/admin/payment-methods");
}

export async function updatePaymentMethods(data) {
  return adminFetch("/admin/payment-methods", {
    method: "PUT",
    data,
  });
}

export async function togglePaymentMethod(id) {
  return adminFetch(`/admin/payment-methods/${id}/toggle`, {
    method: "PATCH",
  });
}

export async function createCustomPaymentMethod(data) {
  return adminFetch("/admin/payment-methods", {
    method: "POST",
    data,
  });
}

export async function deleteCustomPaymentMethod(id) {
  return adminFetch(`/admin/payment-methods/${id}`, {
    method: "DELETE",
  });
}

export async function syncFawaterakPaymentMethods() {
  return adminFetch("/admin/payment-methods/sync", {
    method: "POST",
  });
}

export async function resetPaymentMethodsToDefault() {
  return adminFetch("/admin/payment-methods/reset", {
    method: "POST",
  });
}

// ===== SEO & SITEMAP CONTROL =====
export async function fetchSeoSitemapData() {
  return adminFetch("/admin/seo-sitemap");
}

export async function updateSeoSitemapData(data) {
  return adminFetch("/admin/seo-sitemap", {
    method: "PUT",
    data,
  });
}

export async function regenerateSitemap() {
  return adminFetch("/admin/seo-sitemap/regenerate", {
    method: "POST",
  });
}

// ===== MAIL & SMTP SETTINGS =====
export async function fetchMailSettings() {
  return adminFetch("/admin/mail-settings");
}

export async function updateMailSettings(data) {
  return adminFetch("/admin/mail-settings", {
    method: "PUT",
    data,
  });
}

export async function testSmtpConnection(data) {
  return adminFetch("/admin/mail-settings/test", {
    method: "POST",
    data,
  });
}

// ===== NFC CHIP TYPES =====
export async function fetchNfcChipTypes() {
  const res = await adminFetch("/admin/nfc/chip-types");
  return res.chipTypes || [];
}

export async function createNfcChipType(data) {
  return adminFetch("/admin/nfc/chip-types", {
    method: "POST",
    data,
  });
}

export async function updateNfcChipType(id, data) {
  return adminFetch(`/admin/nfc/chip-types/${id}`, {
    method: "PUT",
    data,
  });
}

export async function deleteNfcChipType(id) {
  return adminFetch(`/admin/nfc/chip-types/${id}`, {
    method: "DELETE",
  });
}

// ===== SMART HARDWARE PRODUCTS (Cards, Keychains, Stands, Kits, etc.) =====
export async function fetchSmartProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/admin/smart-products?${query}` : "/admin/smart-products";
  return adminFetch(url);
}

export async function createSmartProduct(data) {
  return adminFetch("/admin/smart-products", {
    method: "POST",
    data,
  });
}

export async function updateSmartProduct(id, data) {
  return adminFetch(`/admin/smart-products/${id}`, {
    method: "PUT",
    data,
  });
}

export async function deleteSmartProduct(id) {
  return adminFetch(`/admin/smart-products/${id}`, {
    method: "DELETE",
  });
}

export async function generateSmartProductUnits(id, count = 10) {
  return adminFetch(`/admin/smart-products/${id}/generate-units`, {
    method: "POST",
    data: { count },
  });
}




// ===== REFERRALS & REWARDS =====
export async function fetchReferralStats() {
  return adminFetch("/admin/referrals/stats");
}

export async function fetchReferrals(params = {}) {
  const query = new URLSearchParams(params).toString();
  return adminFetch(`/admin/referrals${query ? `?${query}` : ""}`);
}

export async function fetchRewardLedger(params = {}) {
  const query = new URLSearchParams(params).toString();
  return adminFetch(`/admin/referrals/rewards${query ? `?${query}` : ""}`);
}

export async function createManualReward(data) {
  return adminFetch("/admin/referrals/rewards/manual", {
    method: "POST",
    data,
  });
}

export async function fetchNfcFulfillments(params = {}) {
  const query = new URLSearchParams(params).toString();
  return adminFetch(`/admin/referrals/nfc-fulfillments${query ? `?${query}` : ""}`);
}

export async function updateNfcFulfillment(id, data) {
  return adminFetch(`/admin/referrals/nfc-fulfillments/${id}`, {
    method: "PUT",
    data,
  });
}

export async function fetchReferralSettings() {
  return adminFetch("/admin/referrals/settings");
}

export async function updateReferralSettings(data) {
  return adminFetch("/admin/referrals/settings", {
    method: "PUT",
    data,
  });
}

export async function exportReferralsCsv() {
  const token = localStorage.getItem("admin_token");
  const res = await fetch("/api/admin/referrals/export-csv", {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `referrals_report_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ===== ADMIN USERS & ROLES =====
export async function fetchAdminUsers() {
  return adminFetch("/admin/admin-users");
}

export async function createAdminUser(data) {
  return adminFetch("/admin/admin-users", {
    method: "POST",
    data,
  });
}

export async function updateAdminUser(id, data) {
  return adminFetch(`/admin/admin-users/${id}`, {
    method: "PATCH",
    data,
  });
}

export async function toggleAdminUserStatus(id) {
  return adminFetch(`/admin/admin-users/${id}/toggle-status`, {
    method: "PATCH",
  });
}

export async function deleteAdminUser(id) {
  return adminFetch(`/admin/admin-users/${id}`, {
    method: "DELETE",
  });
}

export async function fetchPermissionsCatalog() {
  return adminFetch("/admin/admin-users/permissions");
}

// ===== USER WALLETS & PANEL PAYMENT METHODS CONFIG =====
export async function fetchPanelPaymentConfig() {
  return adminFetch("/admin/user-wallets/config");
}

export async function updatePanelPaymentConfig(data) {
  return adminFetch("/admin/user-wallets/config", {
    method: "PUT",
    data,
  });
}

export async function fetchUserWallets(params = {}) {
  const query = new URLSearchParams(params).toString();
  return adminFetch(`/admin/user-wallets${query ? `?${query}` : ""}`);
}

export async function createUserWallet(data) {
  return adminFetch("/admin/user-wallets", {
    method: "POST",
    data,
  });
}

export async function updateUserWallet(userId, methodId, data) {
  return adminFetch(`/admin/user-wallets/${userId}/${methodId}`, {
    method: "PUT",
    data,
  });
}

export async function setActiveUserWallet(userId, methodId) {
  return adminFetch(`/admin/user-wallets/${userId}/${methodId}/active`, {
    method: "PATCH",
  });
}

export async function deleteUserWallet(userId, methodId) {
  return adminFetch(`/admin/user-wallets/${userId}/${methodId}`, {
    method: "DELETE",
  });
}

