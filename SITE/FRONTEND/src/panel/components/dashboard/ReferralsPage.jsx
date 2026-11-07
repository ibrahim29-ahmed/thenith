import React from "react";
import ReferralsPageFeature from "../../../features/referrals/ReferralsPage";

export default function ReferralsPage({ language = "ar", user = {}, subscription = null }) {
  const isSubscribed = Boolean(subscription?.plan?.key && subscription.plan.key !== "free" && subscription?.status === "active");
  return <ReferralsPageFeature language={language} isSubscribed={isSubscribed} />;
}
