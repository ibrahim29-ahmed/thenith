import { Router } from "express";
import _rateLimit4143 from "../../middleware/rateLimit.js";
const { publicRequestRateLimit, publicProfileRateLimit } = _rateLimit4143;
import _publicProfileController2536 from "../../controller/publicProfile/publicProfileController.js";
const { getPublicProfile, resolvePublicWallet, submitContact } = _publicProfileController2536;

const router = Router();

// Wallet and direct payment routes
router.get("/wallet/:identifier", publicProfileRateLimit, resolvePublicWallet);
router.get("/public/wallet/:identifier", publicProfileRateLimit, resolvePublicWallet);
router.get("/m/:identifier", publicProfileRateLimit, resolvePublicWallet);
router.get("/pay/:identifier", publicProfileRateLimit, resolvePublicWallet);

// Contact route
router.post("/contact", publicRequestRateLimit, submitContact);

// Public profile routes (/p/:identifier and /:identifier)
router.get("/p/:identifier", publicProfileRateLimit, getPublicProfile);
router.get("/:identifier", publicProfileRateLimit, getPublicProfile);

export default router;
