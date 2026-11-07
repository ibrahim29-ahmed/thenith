import mongoose from "mongoose";
import Referral from "../models/Referral.js";
import ReferralReward from "../models/ReferralReward.js";
import ReferralProgramSettings from "../models/ReferralProgramSettings.js";
import NFCRewardFulfillment from "../models/NFCRewardFulfillment.js";
import User from "../models/User.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import referralService from "../services/referralService.js";

// GET /api/admin/referrals/stats
export async function getReferralStats(req, res) {
  try {
    const totalRegistered = await Referral.countDocuments();
    const totalSuccessful = await Referral.countDocuments({ status: "successful" });
    const conversionRate = totalRegistered > 0 ? Math.round((totalSuccessful / totalRegistered) * 100) : 0;

    // Monthly stats
    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setUTCDate(1);
    startOfCurrentMonth.setUTCHours(0, 0, 0, 0);

    const startOfLastMonth = new Date(startOfCurrentMonth);
    startOfLastMonth.setUTCMonth(startOfLastMonth.getUTCMonth() - 1);

    const currentMonthCount = await Referral.countDocuments({
      status: "successful",
      qualifiedAt: { $gte: startOfCurrentMonth },
    });

    const lastMonthCount = await Referral.countDocuments({
      status: "successful",
      qualifiedAt: { $gte: startOfLastMonth, $lt: startOfCurrentMonth },
    });

    // Revenue from successful referrals
    const successfulReferrals = await Referral.find({ status: "successful" })
      .select("paymentTransactionId inviteeDiscountAmount")
      .lean();

    const txIds = successfulReferrals
      .map((r) => r.paymentTransactionId)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    let totalRevenue = 0;
    if (txIds.length > 0) {
      const txs = await PaymentTransaction.find({ _id: { $in: txIds } }).select("amount").lean();
      totalRevenue = txs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    }

    const totalDiscountsGiven = successfulReferrals.reduce(
      (sum, r) => sum + (Number(r.inviteeDiscountAmount) || 0),
      0
    );

    // NFC fulfillments stats
    const nfcPending = await NFCRewardFulfillment.countDocuments({
      status: { $in: ["awaiting_details", "approved", "preparing"] },
    });
    const nfcDelivered = await NFCRewardFulfillment.countDocuments({ status: "delivered" });

    // Top 5 referrers
    const topReferrers = await User.find({ "referralStats.lifetimeCount": { $gt: 0 } })
      .select("name email referralCode referralStats")
      .sort({ "referralStats.lifetimeCount": -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      stats: {
        totalRegistered,
        totalSuccessful,
        conversionRate,
        currentMonthCount,
        lastMonthCount,
        totalRevenue,
        totalDiscountsGiven,
        nfcPending,
        nfcDelivered,
        topReferrers,
      },
    });
  } catch (err) {
    console.error("Error in getReferralStats:", err);
    res.status(500).json({ error: "تعذر تحميل إحصائيات الإحالات", details: err.message });
  }
}

// GET /api/admin/referrals
export async function getAllReferrals(req, res) {
  try {
    const { status, search, fromDate, toDate, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (fromDate || toDate) {
      query.registeredAt = {};
      if (fromDate) query.registeredAt.$gte = new Date(fromDate);
      if (toDate) query.registeredAt.$lte = new Date(toDate);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    let baseQuery = Referral.find(query)
      .populate("referrerId", "name email phone referralCode")
      .populate("inviteeId", "name email phone createdAt")
      .populate("paymentTransactionId", "amount paymentMethodName intentKey")
      .sort({ createdAt: -1 });

    const [items, total] = await Promise.all([
      baseQuery.skip(skip).limit(Number(limit)).lean(),
      Referral.countDocuments(query),
    ]);

    // In-memory filter for search if requested
    let filteredItems = items;
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      filteredItems = items.filter((r) => {
        const refName = r.referrerId?.name?.toLowerCase() || "";
        const refEmail = r.referrerId?.email?.toLowerCase() || "";
        const invName = r.inviteeId?.name?.toLowerCase() || "";
        const invEmail = r.inviteeId?.email?.toLowerCase() || "";
        const code = r.referralCode?.toLowerCase() || "";
        return (
          refName.includes(s) ||
          refEmail.includes(s) ||
          invName.includes(s) ||
          invEmail.includes(s) ||
          code.includes(s)
        );
      });
    }

    res.json({
      success: true,
      data: filteredItems,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error("Error in getAllReferrals:", err);
    res.status(500).json({ error: "تعذر جلب سجل الإحالات", details: err.message });
  }
}

// GET /api/admin/referrals/rewards
export async function getRewardLedger(req, res) {
  try {
    const { rewardType, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (rewardType && rewardType !== "all") query.rewardType = rewardType;
    if (status && status !== "all") query.status = status;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      ReferralReward.find(query)
        .populate("userId", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReferralReward.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error("Error in getRewardLedger:", err);
    res.status(500).json({ error: "تعذر جلب سجل المكافآت", details: err.message });
  }
}

// POST /api/admin/referrals/rewards/manual
export async function createManualReward(req, res) {
  try {
    const { userId, discountPercent, rewardType = "monthly_discount", reason, validityDays } = req.body;

    if (!userId || !discountPercent) {
      return res.status(400).json({ error: "معرف المستخدم ونسبة الخصم مطلوبان" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

    let expiresAt = null;
    if (validityDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(validityDays));
    }

    const reward = await ReferralReward.create({
      userId: user._id,
      rewardType,
      discountPercent: Number(discountPercent),
      status: "available",
      expiresAt,
      metadata: {
        reason: reason || "منح يدوي من إدارة المنصة",
        grantedByAdmin: req.admin?._id || "admin",
      },
    });

    res.json({
      success: true,
      message: "تم إصدار المكافأة بنجاح",
      reward,
    });
  } catch (err) {
    console.error("Error in createManualReward:", err);
    res.status(500).json({ error: "تعذر إصدار المكافأة اليدوية", details: err.message });
  }
}

// GET /api/admin/referrals/nfc-fulfillments
export async function getNfcFulfillments(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      NFCRewardFulfillment.find(query)
        .populate("userId", "name email phone referralCode")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      NFCRewardFulfillment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error("Error in getNfcFulfillments:", err);
    res.status(500).json({ error: "تعذر جلب طلبات شحن كروت NFC", details: err.message });
  }
}

// PUT /api/admin/referrals/nfc-fulfillments/:id
export async function updateNfcFulfillment(req, res) {
  try {
    const { id } = req.params;
    const { status, trackingNumber, carrier, adminNotes } = req.body;

    const fulfillment = await NFCRewardFulfillment.findById(id);
    if (!fulfillment) {
      return res.status(404).json({ error: "طلب المكافأة غير موجود" });
    }

    if (status) fulfillment.status = status;
    if (trackingNumber !== undefined) fulfillment.trackingNumber = trackingNumber;
    if (carrier !== undefined) fulfillment.carrier = carrier;
    if (adminNotes !== undefined) fulfillment.adminNotes = adminNotes;

    if (status === "approved" && !fulfillment.approvedAt) {
      fulfillment.approvedAt = new Date();
    } else if (status === "shipped" && !fulfillment.shippedAt) {
      fulfillment.shippedAt = new Date();
    } else if (status === "delivered" && !fulfillment.deliveredAt) {
      fulfillment.deliveredAt = new Date();
    }

    await fulfillment.save();

    res.json({
      success: true,
      message: "تم تحديث حالة طلب الشحن بنجاح",
      fulfillment,
    });
  } catch (err) {
    console.error("Error in updateNfcFulfillment:", err);
    res.status(500).json({ error: "تعذر تحديث طلب الشحن", details: err.message });
  }
}

// GET /api/admin/referrals/settings
export async function getProgramSettings(req, res) {
  try {
    const settings = await referralService.getReferralSettings();
    res.json({
      success: true,
      settings,
    });
  } catch (err) {
    console.error("Error in getProgramSettings:", err);
    res.status(500).json({ error: "تعذر جلب إعدادات البرنامج", details: err.message });
  }
}

// PUT /api/admin/referrals/settings
export async function updateProgramSettings(req, res) {
  try {
    const {
      enabled,
      inviteeDiscountPercent,
      monthlyTiers,
      maxMonthlyDiscountPercent,
      milestoneReferralCount,
      milestoneDiscountPercent,
      allowStackingDiscounts,
      rewardValidityDays,
    } = req.body;

    let settings = await ReferralProgramSettings.findOne();
    if (!settings) {
      settings = new ReferralProgramSettings();
    }

    if (enabled !== undefined) settings.enabled = Boolean(enabled);
    if (inviteeDiscountPercent !== undefined) settings.inviteeDiscountPercent = Number(inviteeDiscountPercent);
    if (monthlyTiers !== undefined && Array.isArray(monthlyTiers)) settings.monthlyTiers = monthlyTiers;
    if (maxMonthlyDiscountPercent !== undefined) settings.maxMonthlyDiscountPercent = Number(maxMonthlyDiscountPercent);
    if (milestoneReferralCount !== undefined) settings.milestoneReferralCount = Number(milestoneReferralCount);
    if (milestoneDiscountPercent !== undefined) settings.milestoneDiscountPercent = Number(milestoneDiscountPercent);
    if (allowStackingDiscounts !== undefined) settings.allowStackingDiscounts = Boolean(allowStackingDiscounts);
    if (rewardValidityDays !== undefined) settings.rewardValidityDays = Number(rewardValidityDays);

    settings.updatedBy = req.admin?._id || "admin";
    await settings.save();

    res.json({
      success: true,
      message: "تم حفظ إعدادات برنامج الإحالات بنجاح",
      settings,
    });
  } catch (err) {
    console.error("Error in updateProgramSettings:", err);
    res.status(500).json({ error: "تعذر حفظ إعدادات البرنامج", details: err.message });
  }
}

// GET /api/admin/referrals/user/:userId - Bidirectional tree
export async function getUserReferralProfile(req, res) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate("referredBy", "name email referralCode").lean();
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });

    const [invitees, rewards, nfcFulfillment] = await Promise.all([
      Referral.find({ referrerId: user._id })
        .populate("inviteeId", "name email createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      ReferralReward.find({ userId: user._id }).sort({ createdAt: -1 }).lean(),
      NFCRewardFulfillment.findOne({ userId: user._id }).lean(),
    ]);

    res.json({
      success: true,
      profile: {
        user,
        referredBy: user.referredBy || null,
        invitees,
        rewards,
        nfcFulfillment,
      },
    });
  } catch (err) {
    console.error("Error in getUserReferralProfile:", err);
    res.status(500).json({ error: "تعذر جلب ملف إحالات المستخدم", details: err.message });
  }
}

// GET /api/admin/referrals/export-csv
export async function exportReferralsCsv(req, res) {
  try {
    const referrals = await Referral.find()
      .populate("referrerId", "name email referralCode")
      .populate("inviteeId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      "Referral Code",
      "Referrer Name",
      "Referrer Email",
      "Invitee Name",
      "Invitee Email",
      "Status",
      "Registered At",
      "Qualified At",
      "Invoice Number",
      "Invitee Discount %",
      "Invitee Discount Amount (EGP)",
    ];

    const rows = referrals.map((r) => [
      r.referralCode || "",
      r.referrerId?.name || "",
      r.referrerId?.email || "",
      r.inviteeId?.name || "",
      r.inviteeId?.email || "",
      r.status,
      r.registeredAt ? new Date(r.registeredAt).toISOString().split("T")[0] : "",
      r.qualifiedAt ? new Date(r.qualifiedAt).toISOString().split("T")[0] : "",
      r.invoiceNumber || "",
      r.inviteeDiscountPercent || 10,
      r.inviteeDiscountAmount || 0,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="referrals_report.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    console.error("Error exporting referrals CSV:", err);
    res.status(500).json({ error: "تعذر تصدير تقرير الإحالات" });
  }
}

export default {
  getReferralStats,
  getAllReferrals,
  getRewardLedger,
  createManualReward,
  getNfcFulfillments,
  updateNfcFulfillment,
  getProgramSettings,
  updateProgramSettings,
  getUserReferralProfile,
  exportReferralsCsv,
};

