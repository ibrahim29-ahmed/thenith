import { Router } from "express";
import _adminController9802 from "../controller/adminController.js";
const { adminLogin,
  getSubscriptionStats,
  getStats,
  getUsers,
  createUser,
  updateUser,
  toggleUserBan,
  changeUserPlan,
  toggleUserPaymentPlus,
  deleteUser,
  getUserCards,
  getCard,
  updateCard,
  deleteCard,
  adminUpload,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getStoreStats,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getAdminPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getStoreSettings,
  updateStoreSettings,
  getLandingSettings,
  updateLandingSettings,
  getCustomCardSettings,
  updateCustomCardSettings,
  getSettings,
  updateSettings,
  getMessages,
  markMessageRead,
  deleteMessage,
  getCustomerServices,
  getCustomerServiceMessages,
  sendCustomerServiceMessage,
  updateCustomerServiceStatus,
  handleInternalSupportEvent,
  getAuditLogs,
  getAuditStats,
  getFilteredUsers,
  getSubscriptionEvents,
  cancelUserSubscriptionByAdmin,
} = _adminController9802;
import notificationsController from "../controller/notificationsController.js";
import _shippingController from "../controller/shippingController.js";
const {
  getShippingRates,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
  bulkUpdateShippingCost,
} = _shippingController;
import _rateLimit5219 from "../middleware/rateLimit.js";
const { adminLoginRateLimit } = _rateLimit5219;
import _admin5886 from "../middleware/admin.js";
const { requireAdminToken, requirePermission, requireSuperAdmin } = _admin5886;
import * as adminUserController from "../controller/adminUserController.js";
import cardManagementController from "../controller/cardManagementController.js";
import PhysicalCard from "../models/PhysicalCard.js";
import paymentMethodsController from "../controller/paymentMethodsController.js";
import * as nfcChipTypeController from "../controller/nfcChipTypeController.js";
import * as smartProductController from "../controller/smartProductController.js";
import * as userWalletsController from "../controller/userWalletsController.js";

const router = Router();

// Public: Login & Internal Service Bridge
router.post("/login", adminLoginRateLimit, adminLogin);
router.post("/customerServices/internal-event", handleInternalSupportEvent);

// All routes below require admin token
router.use(requireAdminToken);

// ── Admin Team Members & Permissions Control ──────────────────────────────────
router.get("/admin-users/permissions", adminUserController.getPermissionsCatalog);
router.get("/admin-users", requireSuperAdmin, adminUserController.getAdminUsers);
router.post("/admin-users", requireSuperAdmin, adminUserController.createAdminUser);
router.patch("/admin-users/:id", requireSuperAdmin, adminUserController.updateAdminUser);
router.patch("/admin-users/:id/toggle-status", requireSuperAdmin, adminUserController.toggleAdminUserStatus);
router.delete("/admin-users/:id", requireSuperAdmin, adminUserController.deleteAdminUser);

// Subscriptions
router.get("/subscriptions/stats", requirePermission("subscriptions_stats"), getSubscriptionStats);
router.get("/subscriptions/events", requirePermission("subscriptions"), getSubscriptionEvents);
router.post("/subscriptions/cancel-user/:userId", requirePermission("subscriptions"), cancelUserSubscriptionByAdmin);
router.get("/subscriptions/filtered-users", requirePermission("subscriptions"), getFilteredUsers);

// Stats
router.get("/stats", requirePermission("overview"), getStats);

// Users
router.get("/users", requirePermission("users"), getUsers);
router.post("/users", requirePermission("users"), createUser);
router.patch("/users/:id", requirePermission("users"), updateUser);
router.patch("/users/:id/ban", requirePermission("users"), toggleUserBan);
router.patch("/users/:id/plan", requirePermission("users"), changeUserPlan);
router.patch("/users/:id/toggle-payment-plus", requirePermission("users"), toggleUserPaymentPlus);
router.delete("/users/:id", requirePermission("users"), deleteUser);
router.get("/users/:id/cards", requirePermission("users"), getUserCards);

// ── User Wallets & Payment Methods Management ────────────────────────────────
router.get("/user-wallets/config", requirePermission("users"), userWalletsController.getPanelPaymentConfig);
router.put("/user-wallets/config", requirePermission("users"), userWalletsController.updatePanelPaymentConfig);
router.get("/user-wallets", requirePermission("users"), userWalletsController.getUserWallets);
router.post("/user-wallets", requirePermission("users"), userWalletsController.addUserWallet);
router.put("/user-wallets/:userId/:methodId", requirePermission("users"), userWalletsController.updateUserWallet);
router.patch("/user-wallets/:userId/:methodId/active", requirePermission("users"), userWalletsController.setActiveUserWallet);
router.delete("/user-wallets/:userId/:methodId", requirePermission("users"), userWalletsController.deleteUserWallet);

// ── Smart Physical Cards Management ──────────────────────────────────────────
router.get("/cards", requirePermission("cards"), cardManagementController.getCards);
router.post("/cards", requirePermission("cards"), cardManagementController.createCard);
router.post("/cards/bulk", requirePermission("cards"), cardManagementController.createBulkCards);
router.patch("/cards/bulk-status", requirePermission("cards"), cardManagementController.updateBulkCardsStatus);
router.get("/cards/stats", requirePermission("cards"), cardManagementController.getCardStats);
router.patch("/cards/:id/status", requirePermission("cards"), cardManagementController.updateCardStatus);
router.get("/cards/:id/qr", requirePermission("cards"), cardManagementController.getCardQr);
router.get("/cards/:id/logs", requirePermission("cards"), cardManagementController.getCardLogs);
router.post("/cards/:id/nfc/provision", requirePermission("cards"), cardManagementController.startNfcProvision);
router.post("/cards/:id/nfc/verify", requirePermission("cards"), cardManagementController.verifyNfcProvision);
router.post("/cards/:id/nfc/simulate-test", requirePermission("cards"), cardManagementController.simulateNfcTest);

// Card details resolver (supports Physical Card or fallback to Digital Profile Card)
router.get("/cards/:id", async (req, res, next) => {
  try {
    const rawId = req.params.id;
    let extracted = rawId;
    try {
      if (/^https?:\/\//i.test(rawId)) {
        const u = new URL(rawId);
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.length > 0) extracted = parts[parts.length - 1];
      }
    } catch {}

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(rawId);
    const query = [
      { cardId: rawId.toUpperCase() },
      { cardId: extracted.toUpperCase() },
      { publicId: rawId },
      { publicId: extracted },
      { cardUrl: rawId },
      { targetUrl: rawId },
    ];
    if (isObjectId) query.unshift({ _id: rawId });

    const isPhysical = await PhysicalCard.findOne({ $or: query });
    if (isPhysical) {
      return cardManagementController.getCardDetails(req, res, next);
    }
    return getCard(req, res, next);
  } catch (err) {
    return getCard(req, res, next);
  }
});
router.patch("/cards/:id", async (req, res, next) => {
  try {
    const isPhysical = await PhysicalCard.exists({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { cardId: req.params.id.toUpperCase() },
        { publicId: req.params.id },
      ],
    });
    if (isPhysical) {
      return cardManagementController.updateCardDetails(req, res, next);
    }
    return updateCard(req, res, next);
  } catch (err) {
    return updateCard(req, res, next);
  }
});
router.delete("/cards/:id", async (req, res, next) => {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const query = [{ cardId: req.params.id.toUpperCase() }, { publicId: req.params.id }];
    if (isObjectId) query.unshift({ _id: req.params.id });

    const isPhysical = await PhysicalCard.findOne({ $or: query });
    if (isPhysical) {
      return cardManagementController.deleteCard(req, res, next);
    }
    return deleteCard(req, res, next);
  } catch (err) {
    return deleteCard(req, res, next);
  }
});
router.post("/cards/:id/unlink", cardManagementController.unlinkCard);

// Dedicated aliases
router.get("/physical-cards", cardManagementController.getCards);
router.get("/physical-cards/stats", cardManagementController.getCardStats);
router.post("/physical-cards", cardManagementController.createCard);
router.post("/physical-cards/bulk", cardManagementController.createBulkCards);
router.patch("/physical-cards/bulk-status", cardManagementController.updateBulkCardsStatus);
router.get("/physical-cards/:id", cardManagementController.getCardDetails);
router.patch("/physical-cards/:id", cardManagementController.updateCardDetails);
router.patch("/physical-cards/:id/status", cardManagementController.updateCardStatus);
router.post("/physical-cards/:id/unlink", cardManagementController.unlinkCard);
router.delete("/physical-cards/:id", cardManagementController.deleteCard);
router.get("/physical-cards/:id/qr", cardManagementController.getCardQr);
router.get("/physical-cards/:id/logs", cardManagementController.getCardLogs);
router.post("/physical-cards/:id/nfc/provision", cardManagementController.startNfcProvision);
router.post("/physical-cards/:id/nfc/verify", cardManagementController.verifyNfcProvision);
router.post("/physical-cards/:id/nfc/simulate-test", cardManagementController.simulateNfcTest);

// ── Card Batches & Inventory ─────────────────────────────────────────────────
router.get("/card-batches", cardManagementController.getCardBatches);
router.post("/card-batches", cardManagementController.createCardBatch);
router.get("/card-batches/:id", cardManagementController.getCardBatchDetails);

// Upload
router.post("/upload", adminUpload);

// Products
router.get("/products", getProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

// Store Categories
router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// NFC Chip Types
router.get("/nfc/chip-types", nfcChipTypeController.getNfcChipTypes);
router.post("/nfc/chip-types", nfcChipTypeController.createNfcChipType);
router.put("/nfc/chip-types/:id", nfcChipTypeController.updateNfcChipType);
router.delete("/nfc/chip-types/:id", nfcChipTypeController.deleteNfcChipType);

// Smart Hardware Products (Cards, Keychains, Stands, Kits, etc.)
router.get("/smart-products", smartProductController.getSmartProducts);
router.post("/smart-products", smartProductController.createSmartProduct);
router.put("/smart-products/:id", smartProductController.updateSmartProduct);
router.delete("/smart-products/:id", smartProductController.deleteSmartProduct);
router.post("/smart-products/:id/generate-units", smartProductController.generateUnitsForProduct);

// Store
router.get("/store/stats", requirePermission("store"), getStoreStats);

// Orders
router.get("/orders", requirePermission("store"), getOrders);
router.patch("/orders/:id/status", requirePermission("store"), updateOrderStatus);
router.delete("/orders/:id", requirePermission("store"), deleteOrder);

// Plans
router.get("/plans", requirePermission("subscriptions"), getAdminPlans);
router.post("/plans", requirePermission("subscriptions"), createPlan);
router.put("/plans/:id", requirePermission("subscriptions"), updatePlan);
router.delete("/plans/:id", requirePermission("subscriptions"), deletePlan);

// Coupons
router.get("/coupons", requirePermission("coupons"), getCoupons);
router.post("/coupons", requirePermission("coupons"), createCoupon);
router.put("/coupons/:id", requirePermission("coupons"), updateCoupon);
router.delete("/coupons/:id", requirePermission("coupons"), deleteCoupon);

// Settings
router.get("/settings/store", requirePermission("settings"), getStoreSettings);
router.put("/settings/store", requirePermission("settings"), updateStoreSettings);
router.get("/settings/landing", requirePermission("settings"), getLandingSettings);
router.put("/settings/landing", requirePermission("settings"), updateLandingSettings);
router.get("/settings/custom-card", requirePermission("custom_card"), getCustomCardSettings);
router.put("/settings/custom-card", requirePermission("custom_card"), updateCustomCardSettings);
router.get("/settings", requirePermission("settings"), getSettings);
router.put("/settings", requirePermission("settings"), updateSettings);

// Messages
router.get("/messages", requirePermission("inbox"), getMessages);
router.patch("/messages/:id/read", requirePermission("inbox"), markMessageRead);
router.delete("/messages/:id", requirePermission("inbox"), deleteMessage);

// Support / CustomerServices
router.get("/customerServices", requirePermission("support"), getCustomerServices);
router.get("/customerServices/:id/messages", requirePermission("support"), getCustomerServiceMessages);
router.post("/customerServices/:id/messages", requirePermission("support"), sendCustomerServiceMessage);
router.put("/customerServices/:id/status", requirePermission("support"), updateCustomerServiceStatus);

// Audit Logs
router.get("/audit/logs", requirePermission("security"), getAuditLogs);
router.get("/audit/stats", requirePermission("security"), getAuditStats);

// Shipping Rates
router.get("/shipping-rates", requirePermission("settings"), getShippingRates);
router.post("/shipping-rates", requirePermission("settings"), createShippingRate);
router.post("/shipping-rates/bulk-update", requirePermission("settings"), bulkUpdateShippingCost);
router.put("/shipping-rates/:id", requirePermission("settings"), updateShippingRate);
router.delete("/shipping-rates/:id", requirePermission("settings"), deleteShippingRate);

// Push & System Notifications & Expiry Reminders
router.post("/notifications/push", requirePermission("push_notifications"), notificationsController.sendPushNotification);
router.get("/notifications/users", requirePermission("push_notifications"), notificationsController.getUsers);
router.get("/notifications/expiring-subscriptions", requirePermission("push_notifications"), notificationsController.getExpiringSubscriptions);
router.post("/notifications/send-expiry-reminder", requirePermission("push_notifications"), notificationsController.sendExpiryReminder);
router.get("/notifications/history", requirePermission("push_notifications"), notificationsController.getNotificationHistory);
router.delete("/notifications/history/:id", requirePermission("push_notifications"), notificationsController.deleteNotificationHistoryItem);

// ── Payment Methods Control ──────────────────────────────────────────────────
router.get("/payment-methods", requirePermission("payment_methods"), paymentMethodsController.getPaymentMethods);
router.put("/payment-methods", requirePermission("payment_methods"), paymentMethodsController.updatePaymentMethods);
router.patch("/payment-methods/:id/toggle", requirePermission("payment_methods"), paymentMethodsController.togglePaymentMethod);
router.post("/payment-methods", requirePermission("payment_methods"), paymentMethodsController.createCustomPaymentMethod);
router.delete("/payment-methods/:id", requirePermission("payment_methods"), paymentMethodsController.deleteCustomPaymentMethod);
router.post("/payment-methods/sync", requirePermission("payment_methods"), paymentMethodsController.syncFawaterakMethods);
router.post("/payment-methods/reset", requirePermission("payment_methods"), paymentMethodsController.resetPaymentMethodsToDefault);

// ── SEO & Sitemap Control ────────────────────────────────────────────────────
import seoSitemapController from "../controller/seoSitemapController.js";
router.get("/seo-sitemap", requirePermission("seo_sitemap"), seoSitemapController.getSeoSitemapData);
router.put("/seo-sitemap", requirePermission("seo_sitemap"), seoSitemapController.updateSeoSitemapData);
router.post("/seo-sitemap/regenerate", requirePermission("seo_sitemap"), seoSitemapController.regenerateSitemap);

// ── Mail & SMTP Settings ─────────────────────────────────────────────────────
import * as mailSettingsController from "../controller/mailSettingsController.js";
router.get("/mail-settings", requirePermission("settings"), mailSettingsController.getMailSettings);
router.put("/mail-settings", requirePermission("settings"), mailSettingsController.updateMailSettings);
router.post("/mail-settings/test", requirePermission("settings"), mailSettingsController.testSmtpConnection);

// ── Policies Management ──────────────────────────────────────────────────────
import * as policyController from "../controller/policyController.js";
router.get("/policies", requirePermission("policies"), policyController.getPolicies);
router.post("/policies", requirePermission("policies"), policyController.createPolicy);
router.post("/policies/seed-defaults", requirePermission("policies"), policyController.seedDefaultPolicies);
router.put("/policies/reorder", requirePermission("policies"), policyController.reorderPolicies);
router.get("/policies/:id", requirePermission("policies"), policyController.getPolicyById);
router.put("/policies/:id", requirePermission("policies"), policyController.updatePolicy);
router.delete("/policies/:id", requirePermission("policies"), policyController.deletePolicy);
router.patch("/policies/:id/status", requirePermission("policies"), policyController.togglePolicyStatus);
router.put("/policies/:id/sections/reorder", requirePermission("policies"), policyController.reorderSections);

// ── Referrals & Rewards Management ───────────────────────────────────────────
import * as referralAdminController from "../controller/referralAdminController.js";
router.get("/referrals/stats", requirePermission("referrals"), referralAdminController.getReferralStats);
router.get("/referrals/export-csv", requirePermission("referrals"), referralAdminController.exportReferralsCsv);
router.get("/referrals/settings", requirePermission("referrals"), referralAdminController.getProgramSettings);
router.put("/referrals/settings", requirePermission("referrals"), referralAdminController.updateProgramSettings);
router.get("/referrals/rewards", requirePermission("referrals"), referralAdminController.getRewardLedger);
router.post("/referrals/rewards/manual", requirePermission("referrals"), referralAdminController.createManualReward);
router.get("/referrals/nfc-fulfillments", requirePermission("referrals"), referralAdminController.getNfcFulfillments);
router.put("/referrals/nfc-fulfillments/:id", requirePermission("referrals"), referralAdminController.updateNfcFulfillment);
router.get("/referrals/user/:userId", requirePermission("referrals"), referralAdminController.getUserReferralProfile);
router.get("/referrals", requirePermission("referrals"), referralAdminController.getAllReferrals);

export default router;
