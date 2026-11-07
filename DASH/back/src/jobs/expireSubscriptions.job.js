import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import UserNotification from "../models/UserNotification.js";
import Setting from "../models/Setting.js";
import { sendSubscriptionExpiryEmail } from "../util/mail.js";

async function logAutoSentMilestone({ user, planName, milestoneToSend, title, message }) {
  try {
    const setting = await Setting.findOne({ key: "admin_sent_notifications_history" }).lean();
    const history = Array.isArray(setting?.value) ? setting.value : [];
    const newEntry = {
      id: `auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "auto_expiry_reminder",
      target: "user",
      targetName: `${user.name || "مشترك"} (تذكير آلي ${milestoneToSend} أيام)`,
      title,
      message,
      category: "subscription",
      priority: milestoneToSend === 1 ? "urgent" : "high",
      channels: ["push", "email"],
      recipientsCount: 1,
      emailsSent: 1,
      notifsCreated: 1,
      isAutomated: true,
      sentAt: new Date(),
    };
    await Setting.findOneAndUpdate(
      { key: "admin_sent_notifications_history" },
      { value: [newEntry, ...history].slice(0, 100) },
      { new: true, upsert: true }
    );
  } catch (err) {}
}

export async function sendMilestoneExpiryReminders() {
  try {
    const now = new Date();
    const sevenDaysAhead = new Date(now.getTime() + 7.5 * 24 * 60 * 60 * 1000);

    const expiringSubs = await Subscription.find({
      status: { $in: ["active", "trialing"] },
      expiresAt: { $gt: now, $lte: sevenDaysAhead },
    })
      .populate("userId", "name email")
      .populate("planId", "name");

    for (const sub of expiringSubs) {
      if (!sub.userId?.email) continue;

      const msLeft = new Date(sub.expiresAt).getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      const sentMilestones = Array.isArray(sub.expiryRemindersSent) ? sub.expiryRemindersSent : [];

      let milestoneToSend = null;
      let milestoneTitle = "";
      let milestoneMessage = "";

      const planName =
        typeof sub.planId?.name === "object"
          ? sub.planId?.name?.ar || sub.planId?.name?.en || "Pro"
          : sub.planId?.name || "Pro";

      // Milestone 1: At 1 day remaining
      if (daysLeft <= 1 && daysLeft >= 0) {
        if (!sentMilestones.includes(1)) {
          milestoneToSend = 1;
          milestoneTitle = `تنبيه عاجل: متبقي يوم واحد على انتهاء اشتراك باقة ${planName}!`;
          milestoneMessage = `نود تذكيرك بأن اشتراكك في باقة ${planName} ينتهي غداً. سارع بالتجديد لتجنب إيقاف ميزات باقتك وكروتك الذكية.`;
        }
      }
      // Milestone 3: At 3 days remaining
      else if (daysLeft <= 3 && daysLeft > 1) {
        if (!sentMilestones.includes(3)) {
          milestoneToSend = 3;
          milestoneTitle = `تنبيه هام: متبقي 3 أيام على انتهاء اشتراك باقة ${planName}`;
          milestoneMessage = `نود تذكيرك بأن اشتراكك في باقة ${planName} سينتهي خلال 3 أيام. يرجى تجديد الاشتراك لضمان استمرار عمل خدماتك بدون انقطاع.`;
        }
      }
      // Milestone 7: At 7 days remaining
      else if (daysLeft <= 7 && daysLeft > 3) {
        if (!sentMilestones.includes(7)) {
          milestoneToSend = 7;
          milestoneTitle = `تذكير: متبقي 7 أيام على انتهاء اشتراك باقة ${planName}`;
          milestoneMessage = `اشتراكك في باقة ${planName} سينتهي خلال أسبوع (7 أيام). نوصيك بتجديد اشتراكك لتفادي أي انقطاع في ميزاتك المتقدمة.`;
        }
      }

      if (milestoneToSend !== null) {
        await UserNotification.create({
          userId: sub.userId._id,
          type: "subscription_expiring",
          category: "subscription",
          priority: milestoneToSend === 1 ? "urgent" : milestoneToSend === 3 ? "high" : "normal",
          title: milestoneTitle,
          message: milestoneMessage,
          link: "/subscriptions",
          actionLabel: "تجديد الباقة الآن",
        });

        await sendSubscriptionExpiryEmail({
          email: sub.userId.email,
          name: sub.userId.name,
          planName,
          expiresAt: sub.expiresAt,
          daysLeft: milestoneToSend,
        });

        if (!sub.expiryRemindersSent) sub.expiryRemindersSent = [];
        sub.expiryRemindersSent.push(milestoneToSend);
        await sub.save();

        await logAutoSentMilestone({
          user: sub.userId,
          planName,
          milestoneToSend,
          title: milestoneTitle,
          message: milestoneMessage,
        });

        console.log(`[Auto-Reminder] Automated ${milestoneToSend}-day reminder sent to ${sub.userId.email} (Plan: ${planName})`);
      }
    }
  } catch (err) {
    console.error("[Milestone Expiry Reminders Error]:", err.message);
  }
}

export function startSubscriptionExpiryJob() {
  const run = async () => {
    try {
      await sendMilestoneExpiryReminders();
    } catch (err) {}
  };
  run();
  const interval = setInterval(run, 60 * 60 * 1000);
  return () => clearInterval(interval);
}

export default {
  sendMilestoneExpiryReminders,
  startSubscriptionExpiryJob,
};

