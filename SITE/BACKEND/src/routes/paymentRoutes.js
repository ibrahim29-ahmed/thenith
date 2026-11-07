import { Router } from "express";
import _auth from "../middleware/auth.js";
const { requireAuth } = _auth;
import _rateLimit from "../middleware/rateLimit.js";
const { webhookRateLimit } = _rateLimit;
import {
  getPaymentMethods,
  createSubscriptionPayment,
  createOrderPayment,
  verifyPayment,
  handleWebhook,
  getPendingPayments,
  cancelPayment,
  getInvoiceDetails,
  initiateCardSaving,
  confirmCardToken,
} from "../controller/paymentController.js";

const router = Router();

// Public — Fawaterak webhooks (rate-limited, no user auth)
// We provide specific endpoints for each Fawaterak webhook type for clarity,
// but they all funnel into our unified smart handler.
router.post("/webhook", webhookRateLimit, handleWebhook);
router.post("/webhook_json", webhookRateLimit, handleWebhook);
router.post("/webhook/paid", webhookRateLimit, handleWebhook);
router.post("/webhook/failed", webhookRateLimit, handleWebhook);
router.post("/webhook/cancelled", webhookRateLimit, handleWebhook);
router.post("/webhook/refund", webhookRateLimit, handleWebhook);
router.post("/webhook/tokenization", webhookRateLimit, handleWebhook);
router.get("/webhook", (req, res) => res.json({ status: "webhook_active", timestamp: new Date() }));
router.get("/webhook_json", (req, res) => res.json({ status: "webhook_active", timestamp: new Date() }));

// Public methods list (can be viewed before or after login)
router.get("/methods", getPaymentMethods);

// Protected — require user session
router.use(requireAuth);
router.get("/pending", getPendingPayments);
router.post("/subscription", createSubscriptionPayment);
router.post("/order/:orderId", createOrderPayment);
router.get("/invoice/:type/:id", getInvoiceDetails);
router.post("/verify", verifyPayment);
router.post("/cancel", cancelPayment);
router.post("/save-card-screen", initiateCardSaving);
router.post("/confirm-card-token", confirmCardToken);

export default router;
