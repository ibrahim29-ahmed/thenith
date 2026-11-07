import { Router } from "express";
import _auth3847 from "../middleware/auth.js";
const { requireAuth, optionalAuth } = _auth3847;
import _subscription4430 from "../middleware/subscription.js";
const { requireSubscription } = _subscription4430;
import _subscriptionController1528 from "../controller/subscriptionController.js";
const { getSubscription,
  getSubscriptionStatus,
  cancelSubscription,
  createSubscriptionCheckout,
  validateCoupon,
  toggleAutoRenew,
 } = _subscriptionController1528;

const router = Router();

router.post("/validate-coupon", optionalAuth, validateCoupon);

router.use(requireAuth);
router.use(requireSubscription);

router.get("/", getSubscription);
router.get("/status", getSubscriptionStatus);
router.post("/cancel", cancelSubscription);
router.post("/checkout", createSubscriptionCheckout);
router.post("/toggle-auto-renew", toggleAutoRenew);

export default router;
