import { Router } from "express";
import * as checkoutController from "../controller/checkoutController.js";
import authMiddleware from "../middleware/auth.js";
const { optionalAuth } = authMiddleware;

const router = Router();

router.post("/validate-coupon", optionalAuth, checkoutController.validateCoupon);
router.post("/order", optionalAuth, checkoutController.createOrder);

export default router;
