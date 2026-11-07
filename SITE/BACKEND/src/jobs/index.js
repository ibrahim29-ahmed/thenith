import _cleanupCustomerServicesjob6570 from "./cleanupCustomerServices.job.js";
const { startCustomerServiceCleanupJob } = _cleanupCustomerServicesjob6570;
import _expireSubscriptionsjob9243 from "./expireSubscriptions.job.js";
const { startSubscriptionExpiryJob } = _expireSubscriptionsjob9243;
import _cleanupSessionsjob6531 from "./cleanupSessions.job.js";
const { startSessionCleanupJob } = _cleanupSessionsjob6531;
import _renewSubscriptionsJob from "./renewSubscriptions.job.js";
const { startSubscriptionRenewalJob } = _renewSubscriptionsJob;

function startJobs() {
  const stopCustomerServiceCleanup = startCustomerServiceCleanupJob();
  const stopSubscriptionRenewal = startSubscriptionRenewalJob();
  const stopSubscriptionExpiry = startSubscriptionExpiryJob();
  const stopSessionCleanup = startSessionCleanupJob();

  return () => {
    stopCustomerServiceCleanup();
    stopSubscriptionRenewal();
    stopSubscriptionExpiry();
    stopSessionCleanup();
  };
}

export default { startJobs };
