import api from "../../api/index.js";
import referralRoutes from "../../api/routes/referrals.js";

export async function fetchMyReferralDashboard() {
  const res = await referralRoutes.getMyDashboard();
  return res?.data || res;
}

export async function claimNfcCardReward(shippingData) {
  return referralRoutes.claimNfcCard(shippingData);
}

export async function fetchEligibleReferralDiscounts(basePrice, rewardId) {
  return referralRoutes.getEligibleDiscounts(basePrice, rewardId);
}

