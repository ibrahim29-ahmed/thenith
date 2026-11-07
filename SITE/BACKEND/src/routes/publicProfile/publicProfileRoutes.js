import { Router } from "express";
import _rateLimit4143 from "../../middleware/rateLimit.js";
const { publicRequestRateLimit, publicProfileRateLimit } = _rateLimit4143;
import _publicProfileController2536 from "../../controller/publicProfile/publicProfileController.js";
const { getPublicProfile, resolvePublicWallet, submitContact } = _publicProfileController2536;

const router = Router();

router.get("/wallet/:identifier", publicProfileRateLimit, resolvePublicWallet);
router.get("/m/:identifier", publicProfileRateLimit, resolvePublicWallet);
router.get("/pay/:identifier", publicProfileRateLimit, resolvePublicWallet);
router.get("/:identifier", publicProfileRateLimit, getPublicProfile);
router.post("/contact", publicRequestRateLimit, submitContact);

export default router;
