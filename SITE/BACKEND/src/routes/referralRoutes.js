import { Router } from "express";
import _auth from "../middleware/auth.js";
const { requireAuth } = _auth;
import {
  getMyReferralDashboard,
  claimNfcCardReward,
  getEligibleReferralDiscounts,
  applyReferralCode,
  resolveReferralCode,
} from "../controller/referralController.js";

const router = Router();

// Public route to resolve/validate a referral link
router.get("/resolve/:code", resolveReferralCode);

// Protected routes (require user authentication)
router.use(requireAuth);

router.get("/me", getMyReferralDashboard);
router.get("/my-dashboard", getMyReferralDashboard);
router.post("/nfc-claim", claimNfcCardReward);
router.get("/eligible-discount", getEligibleReferralDiscounts);
router.post("/apply-code", applyReferralCode);

export default router;

