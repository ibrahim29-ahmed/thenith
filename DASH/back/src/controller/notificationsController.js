import UserNotification from "../models/UserNotification.js";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import Setting from "../models/Setting.js";
import { sendSubscriptionExpiryEmail, sendCustomAlertEmail } from "../util/mail.js";
import _socketService from "../services/socketService.js";

const HISTORY_KEY = "admin_sent_notifications_history";

// Helper to safely emit socket notifications
function emitSocketNotification(targetRoom, notifData) {
  try {
    const io = _socketService.getIO();
    if (io) {
      if (targetRoom === "all") {
        io.emit("adminNotification", notifData);
      } else {
        io.to(targetRoom).emit("adminNotification", notifData);
      }
    }
  } catch (err) {
    // Socket service may be dormant in some worker processes
  }
}

// ── GET /admin/notifications/users ──────────────────────────────────────────
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true })
      .select("_id name email username phone avatar createdAt")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/notifications/expiring-subscriptions ──────────────────────────
export const getExpiringSubscriptions = async (req, res, next) => {
  try {
    const maxDays = parseInt(req.query.days || "30", 10);
    const now = new Date();
    const futureLimit = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const subscriptions = await Subscription.find({
      status: { $in: ["active", "trialing"] },
      expiresAt: { $exists: true, $ne: null, $lte: futureLimit },
    })
      .populate("userId", "name email username phone avatar")
      .populate("planId", "name key prices")
      .sort({ expiresAt: 1 })
      .lean();

    const enriched = subscriptions
      .filter((s) => s.userId)
      .map((s) => {
        const exp = new Date(s.expiresAt);
        const diffMs = exp.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const planName =
          typeof s.planId?.name === "object"
            ? s.planId?.name?.ar || s.planId?.name?.en || "Pro"
            : s.planId?.name || "Pro";

        return {
          _id: s._id,
          subscriptionId: s._id,
          user: s.userId,
          plan: s.planId,
          planName,
          status: s.status,
          billingPeriod: s.billingPeriod,
          startedAt: s.startedAt,
          expiresAt: s.expiresAt,
          daysLeft,
          expiryRemindersSent: s.expiryRemindersSent || [],
          isExpired: daysLeft < 0,
          isToday: daysLeft === 0,
          isUrgent: daysLeft <= 3,
        };
      });

    const expiringToday = enriched.filter((s) => s.daysLeft <= 0).length;
    const expiringWithin7Days = enriched.filter((s) => s.daysLeft > 0 && s.daysLeft <= 7).length;

    res.json({
      success: true,
      count: enriched.length,
      expiringToday,
      expiringWithin7Days,
      subscriptions: enriched,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /admin/notifications/send-expiry-reminder ──────────────────────────
export const sendExpiryReminder = async (req, res, next) => {
  try {
    const {
      subscriptionId,
      bulk = false,
      maxDays = 7,
      sendEmail = true,
      sendPush = true,
      customMessage = "",
    } = req.body;

    let targetSubs = [];
    const now = new Date();

    if (bulk) {
      const futureLimit = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
      targetSubs = await Subscription.find({
        status: { $in: ["active", "trialing"] },
        expiresAt: { $exists: true, $ne: null, $lte: futureLimit },
      })
        .populate("userId", "name email username")
        .populate("planId", "name key prices");
    } else {
      if (!subscriptionId) {
        return res.status(400).json({ error: "subscriptionId is required for single reminder" });
      }
      const single = await Subscription.findById(subscriptionId)
        .populate("userId", "name email username")
        .populate("planId", "name key prices");
      if (!single) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      targetSubs = [single];
    }

    let emailsSent = 0;
    let notifsCreated = 0;
    const notifDocs = [];

    for (const sub of targetSubs) {
      if (!sub.userId) continue;
      const user = sub.userId;
      const exp = new Date(sub.expiresAt);
      const daysLeft = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      const planName =
        typeof sub.planId?.name === "object"
          ? sub.planId?.name?.ar || sub.planId?.name?.en || "Pro"
          : sub.planId?.name || "Pro";

      const finalMsg =
        customMessage ||
        (daysLeft === 0
          ? `اشتراكك في باقة ${planName} ينتهي اليوم! يرجى التجديد الآن للحفاظ على عمل كروتك الذكية وتجنب توقف الميزات.`
          : `تذكير: اشتراكك في باقة ${planName} قارب على الانتهاء ومتبقي ${daysLeft} أيام. يرجى التجديد لضمان استمرار خدماتك.`);

      // 1. In-App Notification
      if (sendPush) {
        notifDocs.push({
          userId: user._id,
          type: "subscription_expiring",
          category: "subscription",
          priority: "urgent",
          title: `تذكير: اشتراك باقة ${planName} قارب على الانتهاء`,
          message: finalMsg,
          link: "/subscriptions",
          actionLabel: "تجديد الباقة الآن",
        });
      }

      // 2. Email Reminder
      if (sendEmail && user.email) {
        try {
          const sent = await sendSubscriptionExpiryEmail({
            email: user.email,
            name: user.name,
            planName,
            expiresAt: sub.expiresAt,
            daysLeft,
          });
          if (sent) emailsSent++;
        } catch (e) {
          console.error(`[Expiry Reminder Email Error] for ${user.email}:`, e.message);
        }
      }

      // 3. Socket Event
      emitSocketNotification(`user_${user._id}`, {
        type: "subscription_expiring",
        title: `تذكير: اشتراك باقة ${planName} قارب على الانتهاء`,
        message: finalMsg,
        link: "/subscriptions",
      });
    }

    if (notifDocs.length > 0) {
      await UserNotification.insertMany(notifDocs, { ordered: false });
      notifsCreated = notifDocs.length;
    }

    // Record in history
    await recordSentHistory({
      type: "expiry_reminder",
      target: bulk ? `bulk_expiring_${maxDays}days` : "single_user",
      targetName: bulk ? `المشتركون المنتهية باقاتهم (${targetSubs.length})` : targetSubs[0]?.userId?.name,
      title: "تذكير انتهاء الباقة والتجديد",
      message: customMessage || "إشعار وتذكير رسمي بتجديد الاشتراك",
      channels: [sendPush ? "push" : null, sendEmail ? "email" : null].filter(Boolean),
      recipientsCount: targetSubs.length,
      emailsSent,
      notifsCreated,
      sentAt: new Date(),
    });

    res.json({
      success: true,
      message: `تم إرسال تذكير التجديد بنجاح (${emailsSent} بريد إلكتروني، ${notifsCreated} إشعار داخل المنصة)`,
      recipientsCount: targetSubs.length,
      emailsSent,
      notifsCreated,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /admin/notifications/push (Multi-Channel Advanced Send) ─────────────
export const sendPushNotification = async (req, res, next) => {
  try {
    const {
      target, // "all" | "plan" | "user" | "expiring"
      userId,
      plan,
      title,
      message = "",
      category = "general",
      priority = "normal",
      link = "",
      actionLabel = "",
      sendEmail = false,
      sendPush = true,
    } = req.body;

    if (!title || !target) {
      return res.status(400).json({ error: "title and target are required" });
    }

    let targetUsers = [];

    if (target === "all") {
      targetUsers = await User.find({ isActive: true })
        .select("_id name email username")
        .lean();
    } else if (target === "plan" && plan) {
      const activeSubs = await Subscription.find({
        status: { $in: ["active", "trialing"] },
      })
        .select("userId")
        .lean();
      const proUserIds = activeSubs.map((s) => s.userId);

      if (plan === "pro") {
        targetUsers = await User.find({ isActive: true, _id: { $in: proUserIds } })
          .select("_id name email username")
          .lean();
      } else if (plan === "free") {
        targetUsers = await User.find({ isActive: true, _id: { $nin: proUserIds } })
          .select("_id name email username")
          .lean();
      }
    } else if (target === "user" && userId) {
      const single = await User.findById(userId).select("_id name email username").lean();
      if (!single) return res.status(404).json({ error: "USER_NOT_FOUND" });
      targetUsers = [single];
    } else if (target === "expiring") {
      const limitDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const expiringSubs = await Subscription.find({
        status: { $in: ["active", "trialing"] },
        expiresAt: { $exists: true, $ne: null, $lte: limitDate },
      }).select("userId").lean();
      const userIds = expiringSubs.map((s) => s.userId);
      targetUsers = await User.find({ isActive: true, _id: { $in: userIds } })
        .select("_id name email username")
        .lean();
    } else {
      return res.status(400).json({ error: "INVALID_TARGET" });
    }

    let notifsCreated = 0;
    let emailsSent = 0;

    // 1. Create In-App Notifications
    if (sendPush && targetUsers.length > 0) {
      const docs = targetUsers.map((u) => ({
        userId: u._id,
        type: category === "subscription" ? "subscription_expiring" : "admin_push",
        category,
        priority,
        title,
        message,
        link,
        actionLabel,
      }));
      await UserNotification.insertMany(docs, { ordered: false });
      notifsCreated = docs.length;

      // Socket broadcast or user emission
      if (target === "all") {
        emitSocketNotification("all", {
          type: "admin_push",
          category,
          priority,
          title,
          message,
          link,
          actionLabel,
        });
      } else {
        targetUsers.forEach((u) => {
          emitSocketNotification(`user_${u._id}`, {
            type: "admin_push",
            category,
            priority,
            title,
            message,
            link,
            actionLabel,
          });
        });
      }
    }

    // 2. Dispatch Emails if enabled
    if (sendEmail && targetUsers.length > 0) {
      for (const u of targetUsers) {
        if (!u.email) continue;
        try {
          const sent = await sendCustomAlertEmail({
            email: u.email,
            name: u.name,
            title,
            message,
            actionLabel,
            actionUrl: link ? (link.startsWith("http") ? link : `https://thenith.com${link.startsWith("/") ? "" : "/"}${link}`) : undefined,
            priority,
          });
          if (sent) emailsSent++;
        } catch (e) {
          console.error(`[Alert Email Error] to ${u.email}:`, e.message);
        }
      }
    }

    const targetLabel =
      target === "all"
        ? "جميع المستخدمين"
        : target === "plan"
        ? (plan === "pro" ? "مشتركو باقة برو" : "مشتركو الباقة المجانية")
        : target === "expiring"
        ? "الباقات التي تقترب من الانتهاء"
        : targetUsers[0]?.name || userId;

    await recordSentHistory({
      type: "custom_alert",
      target,
      targetName: targetLabel,
      title,
      message,
      category,
      priority,
      link,
      channels: [sendPush ? "push" : null, sendEmail ? "email" : null].filter(Boolean),
      recipientsCount: targetUsers.length,
      emailsSent,
      notifsCreated,
      sentAt: new Date(),
    });

    res.json({
      ok: true,
      success: true,
      recipientsCount: targetUsers.length,
      emailsSent,
      notifsCreated,
      message: `تم الإرسال بنجاح (${notifsCreated} إشعار داخل الموقع، ${emailsSent} بريد إلكتروني)`,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /admin/notifications/history ─────────────────────────────────────────
export const getNotificationHistory = async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ key: HISTORY_KEY }).lean();
    const history = Array.isArray(setting?.value) ? setting.value : [];
    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /admin/notifications/history/:id ──────────────────────────────────
export const deleteNotificationHistoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const setting = await Setting.findOne({ key: HISTORY_KEY }).lean();
    let history = Array.isArray(setting?.value) ? setting.value : [];
    history = history.filter((item) => String(item.id) !== String(id));

    await Setting.findOneAndUpdate(
      { key: HISTORY_KEY },
      { value: history },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: "تم حذف السجل بنجاح", history });
  } catch (err) {
    next(err);
  }
};

// Helper to persist campaign history in MongoDB
async function recordSentHistory(entry) {
  try {
    const setting = await Setting.findOne({ key: HISTORY_KEY }).lean();
    const history = Array.isArray(setting?.value) ? setting.value : [];
    const newEntry = {
      id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...entry,
    };
    const updated = [newEntry, ...history].slice(0, 100);

    await Setting.findOneAndUpdate(
      { key: HISTORY_KEY },
      { value: updated },
      { new: true, upsert: true }
    );
  } catch (err) {
    console.error("[Sent History Error]:", err.message);
  }
}

export default {
  getUsers,
  getExpiringSubscriptions,
  sendExpiryReminder,
  sendPushNotification,
  getNotificationHistory,
  deleteNotificationHistoryItem,
};
