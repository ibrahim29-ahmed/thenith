import { request } from "../client.js";

export const referralRoutes = {
  getMyDashboard: () => request("/referrals/me"),

  claimNfcCard: (data) =>
    request("/referrals/nfc-claim", {
      method: "POST",
      data,
    }),

  getEligibleDiscounts: (basePrice, rewardId) =>
    request(
      `/referrals/eligible-discount?basePrice=${encodeURIComponent(
        basePrice || 0
      )}${rewardId ? `&rewardId=${encodeURIComponent(rewardId)}` : ""}`
    ),

  applyReferralCode: (referralCode) =>
    request("/referrals/apply-code", {
      method: "POST",
      data: { referralCode },
    }),

  resolveReferralCode: (code) =>
    request(`/referrals/resolve/${encodeURIComponent(code)}`),
};

export default referralRoutes;

