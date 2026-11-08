import User from "../models/User.js";
import Setting from "../models/Setting.js";
import Subscription from "../models/Subscription.js";
import Plan from "../models/Plan.js";
import _asyncHandler5014 from "../util/asyncHandler.js";
const { asyncHandler } = _asyncHandler5014;
import _httpError2650 from "../util/httpError.js";
const { HttpError } = _httpError2650;

// Default Panel Payment Methods Configuration
export const DEFAULT_PANEL_CONFIG = {
  header: {
    titleAr: "وسائل الدفع والمحافظ",
    titleEn: "Wallets & Payment Methods",
    descAr: "إدارة المحافظ الإلكترونية وروابط الدفع المباشرة الخاصة بك مع توفير لينك مخصص لكل محفظة",
    descEn: "Manage your digital wallets and direct payment links with dedicated custom links for each",
  },
  providers: [
    {
      id: "vodafone_cash",
      nameAr: "فودافون كاش",
      nameEn: "Vodafone Cash",
      badge: "فودافون",
      icon: "/wallets/vodafone-cash.png",
      placeholder: "https://...",
      color: "from-red-500 to-rose-600",
      ussdCode: "*9*7#",
      enabled: true,
    },
    {
      id: "instapay",
      nameAr: "انستاباي",
      nameEn: "Instapay",
      badge: "انستاباي",
      icon: "/wallets/instapay.png",
      placeholder: "https://instapay.eg/...",
      color: "from-purple-600 to-indigo-600",
      ussdCode: "",
      enabled: true,
    },
    {
      id: "orange_cash",
      nameAr: "أورنج كاش",
      nameEn: "Orange Cash",
      badge: "أورنج",
      icon: "/wallets/orange-cash.png",
      placeholder: "https://...",
      color: "from-amber-500 to-orange-500",
      ussdCode: "#7115#",
      enabled: true,
    },
    {
      id: "etisalat_cash",
      nameAr: "اتصالات كاش",
      nameEn: "Etisalat Cash",
      badge: "اتصالات",
      icon: "/wallets/etisalat-cash.png",
      placeholder: "https://...",
      color: "from-red-600 to-rose-700",
      ussdCode: "*777*1#",
      enabled: true,
    },
    {
      id: "we_pay",
      nameAr: "وي باي",
      nameEn: "WE Pay",
      badge: "وي",
      icon: "/wallets/we-pay.png",
      placeholder: "https://...",
      color: "from-purple-700 to-indigo-800",
      ussdCode: "*7*2#",
      enabled: true,
    },
  ],
};

// ── GET /api/admin/user-wallets/config ─────────────────────────────────────────
export const getPanelPaymentConfig = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: "panel_payment_methods_config" }).lean();
  const config = setting?.value || DEFAULT_PANEL_CONFIG;
  res.json({
    success: true,
    config: {
      header: { ...DEFAULT_PANEL_CONFIG.header, ...(config.header || {}) },
      providers: Array.isArray(config.providers) && config.providers.length > 0
        ? config.providers
        : DEFAULT_PANEL_CONFIG.providers,
    },
  });
});

// ── PUT /api/admin/user-wallets/config ─────────────────────────────────────────
export const updatePanelPaymentConfig = asyncHandler(async (req, res) => {
  const { header, providers } = req.body;

  const updatedConfig = {
    header: {
      titleAr: (header?.titleAr || DEFAULT_PANEL_CONFIG.header.titleAr).trim(),
      titleEn: (header?.titleEn || DEFAULT_PANEL_CONFIG.header.titleEn).trim(),
      descAr: (header?.descAr || DEFAULT_PANEL_CONFIG.header.descAr).trim(),
      descEn: (header?.descEn || DEFAULT_PANEL_CONFIG.header.descEn).trim(),
    },
    providers: Array.isArray(providers) ? providers : DEFAULT_PANEL_CONFIG.providers,
  };

  await Setting.findOneAndUpdate(
    { key: "panel_payment_methods_config" },
    { value: updatedConfig },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    message: "تم تحديث إعدادات صفحة وسائل الدفع بنجاح",
    config: updatedConfig,
  });
});

// ── GET /api/admin/user-wallets ───────────────────────────────────────────────
export const getUserWallets = asyncHandler(async (req, res) => {
  const { q, provider, activeOnly, page = 1, limit = 50 } = req.query;

  // 1. Compute aggregate stats across all users
  const allUsersWithWallets = await User.find({
    "paymentMethods.0": { $exists: true },
  })
    .select("_id name email phone username publicId paymentMethods activePaymentMethodId")
    .lean();

  let totalWallets = 0;
  let activeWallets = 0;
  const providerCounts = {
    vodafone_cash: 0,
    instapay: 0,
    orange_cash: 0,
    etisalat_cash: 0,
    we_pay: 0,
  };

  allUsersWithWallets.forEach((u) => {
    (u.paymentMethods || []).forEach((m) => {
      totalWallets++;
      if (m.isActive || u.activePaymentMethodId === m.id) {
        activeWallets++;
      }
      if (providerCounts[m.provider] !== undefined) {
        providerCounts[m.provider]++;
      }
    });
  });

  // 2. Build flat list of all wallet entries with user details
  let items = [];
  allUsersWithWallets.forEach((u) => {
    (u.paymentMethods || []).forEach((m) => {
      items.push({
        methodId: m.id,
        name: m.name,
        provider: m.provider,
        link: m.link || "",
        walletNumber: m.walletNumber || "",
        accountName: m.accountName || "",
        customSlug: m.customSlug || "",
        isActive: Boolean(m.isActive || u.activePaymentMethodId === m.id),
        createdAt: m.createdAt,
        user: {
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          phone: u.phone,
          username: u.username,
          publicId: u.publicId,
        },
      });
    });
  });

  // 3. Apply filters
  if (provider && provider !== "all") {
    items = items.filter((item) => item.provider === provider);
  }

  if (activeOnly === "true") {
    items = items.filter((item) => item.isActive);
  }

  if (q && q.trim()) {
    const search = q.trim().toLowerCase();
    items = items.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(search)) ||
        (item.link && item.link.toLowerCase().includes(search)) ||
        (item.user.name && item.user.name.toLowerCase().includes(search)) ||
        (item.user.email && item.user.email.toLowerCase().includes(search)) ||
        (item.user.phone && item.user.phone.toLowerCase().includes(search)) ||
        (item.user.username && item.user.username.toLowerCase().includes(search)),
    );
  }

  // Sort by creation date descending
  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.json({
    success: true,
    stats: {
      totalWallets,
      activeWallets,
      usersWithWallets: allUsersWithWallets.length,
      providerCounts,
    },
    items,
    total: items.length,
  });
});

// ── POST /api/admin/user-wallets ──────────────────────────────────────────────
export const addUserWallet = asyncHandler(async (req, res) => {
  const { userId, name, provider, link, walletNumber, accountName } = req.body;

  if (!userId) throw new HttpError(400, "User ID is required");
  if (!name || !name.trim()) throw new HttpError(400, "Wallet name is required");

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "User not found");

  if (!user.paymentMethods) user.paymentMethods = [];
  const isFirst = user.paymentMethods.length === 0;
  const id = `pm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newMethod = {
    id,
    name: name.trim(),
    provider: provider || "vodafone_cash",
    link: (link || "").trim(),
    walletNumber: (walletNumber || "").trim(),
    accountName: (accountName || "").trim(),
    customSlug: (provider || "wallet").replace("_", "-"),
    isActive: isFirst,
    createdAt: new Date(),
  };

  user.paymentMethods.push(newMethod);
  if (isFirst || !user.activePaymentMethodId) {
    user.activePaymentMethodId = id;
  }

  user.markModified("paymentMethods");
  await user.save();

  res.status(201).json({
    success: true,
    message: "Wallet added successfully",
    wallet: newMethod,
  });
});

// ── PUT /api/admin/user-wallets/:userId/:methodId ─────────────────────────────
export const updateUserWallet = asyncHandler(async (req, res) => {
  const { userId, methodId } = req.params;
  const { name, provider, link, walletNumber, accountName, isActive } = req.body;

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "User not found");

  const method = (user.paymentMethods || []).find((m) => m.id === methodId);
  if (!method) throw new HttpError(404, "Payment method not found");

  if (name !== undefined) method.name = name.trim();
  if (provider !== undefined) method.provider = provider;
  if (link !== undefined) method.link = link.trim();
  if (walletNumber !== undefined) method.walletNumber = (walletNumber || "").trim();
  if (accountName !== undefined) method.accountName = (accountName || "").trim();

  if (isActive === true) {
    user.paymentMethods.forEach((m) => {
      m.isActive = m.id === methodId;
    });
    user.activePaymentMethodId = methodId;
  }

  user.markModified("paymentMethods");
  await user.save();

  res.json({
    success: true,
    message: "Wallet updated successfully",
    wallet: method,
  });
});

// ── PATCH /api/admin/user-wallets/:userId/:methodId/active ────────────────────
export const setActiveUserWallet = asyncHandler(async (req, res) => {
  const { userId, methodId } = req.params;

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "User not found");

  const method = (user.paymentMethods || []).find((m) => m.id === methodId);
  if (!method) throw new HttpError(404, "Payment method not found");

  user.paymentMethods.forEach((m) => {
    m.isActive = m.id === methodId;
  });
  user.activePaymentMethodId = methodId;

  user.markModified("paymentMethods");
  await user.save();

  res.json({
    success: true,
    message: "Wallet set as primary",
  });
});

// ── DELETE /api/admin/user-wallets/:userId/:methodId ──────────────────────────
export const deleteUserWallet = asyncHandler(async (req, res) => {
  const { userId, methodId } = req.params;

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "User not found");

  const prevLen = (user.paymentMethods || []).length;
  user.paymentMethods = (user.paymentMethods || []).filter(
    (m) => m.id !== methodId,
  );

  if (user.paymentMethods.length === prevLen) {
    throw new HttpError(404, "Payment method not found");
  }

  if (user.activePaymentMethodId === methodId) {
    if (user.paymentMethods.length > 0) {
      user.paymentMethods[0].isActive = true;
      user.activePaymentMethodId = user.paymentMethods[0].id;
    } else {
      user.activePaymentMethodId = null;
    }
  }

  user.markModified("paymentMethods");
  await user.save();

  res.json({
    success: true,
    message: "Wallet deleted successfully",
  });
});

// ── GET /api/admin/user-wallets/package-settings ──────────────────────────────
export const getPackageSettings = asyncHandler(async (req, res) => {
  const dayRateSetting = await Setting.findOne({ key: "payment_plus_day_rate" }).lean();
  const dayRate = typeof dayRateSetting?.value?.dayRate === "number" ? dayRateSetting.value.dayRate : 3;

  // Fetch all users who have or have had Payment Plus
  const users = await User.find({
    $or: [
      { paymentPlusActive: true },
      { hasStandalonePaymentPlus: true },
      { paymentPlusStartedAt: { $exists: true, $ne: null } },
      { "paymentMethods.0": { $exists: true } },
    ],
  })
    .select("_id name email phone username publicId createdAt paymentPlusActive hasStandalonePaymentPlus paymentPlusStartedAt paymentPlusExpiresAt paymentPlusBillingPeriod paymentPageSettings")
    .lean();

  const plusPlan = await Plan.findOne({ key: "payment_plus" }).lean();
  const proPlan = await Plan.findOne({ key: "pro" }).lean();

  const userIds = users.map((u) => u._id);
  const userSubs = await Subscription.find({
    userId: { $in: userIds },
    status: { $in: ["active", "trialing"] },
  }).lean();

  const usersList = users.map((u) => {
    // Find all active subs for user sorted by startedAt descending
    const subsForUser = userSubs
      .filter((s) => s.userId.toString() === u._id.toString())
      .sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0));

    const activeSub = subsForUser[0];
    const isPro = Boolean(activeSub && proPlan && activeSub.planId.toString() === proPlan._id.toString());
    const plusSub = subsForUser.find((s) => plusPlan && s.planId.toString() === plusPlan._id.toString());
    const isPlusSub = Boolean(plusSub);

    const isActive = Boolean(u.paymentPlusActive || isPlusSub || (isPro && u.paymentPlusActive !== false));
    const startedAt = plusSub?.startedAt || u.paymentPlusStartedAt || (isActive ? activeSub?.startedAt : null) || null;

    let daysUsed = 0;
    if (startedAt && isActive) {
      const diffMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
      daysUsed = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const upgradeDiscount = daysUsed * dayRate;

    let status = "inactive";
    if (isPro) {
      status = "upgraded_to_pro";
    } else if (isActive) {
      status = "active";
    }

    return {
      id: u._id,
      name: u.name || "بدون اسم",
      email: u.email,
      phone: u.phone,
      username: u.username,
      publicId: u.publicId,
      startedAt,
      daysUsed,
      upgradeDiscount,
      status,
      isPro,
      hasStandalonePaymentPlus: Boolean(u.hasStandalonePaymentPlus),
      billingPeriod: u.paymentPlusBillingPeriod || activeSub?.billingPeriod || "monthly",
    };
  });

  // Sort by daysUsed descending
  usersList.sort((a, b) => b.daysUsed - a.daysUsed);

  res.json({
    success: true,
    dayRate,
    users: usersList,
    stats: {
      totalUsersWithPlus: usersList.length,
      activeUsers: usersList.filter((u) => u.status === "active").length,
      upgradedUsers: usersList.filter((u) => u.status === "upgraded_to_pro").length,
      totalDiscountGiven: usersList.reduce((acc, u) => acc + (u.upgradeDiscount || 0), 0),
    },
  });
});

// ── PUT /api/admin/user-wallets/package-settings ──────────────────────────────
export const updatePackageSettings = asyncHandler(async (req, res) => {
  const { dayRate } = req.body;
  const numRate = Number(dayRate);
  if (isNaN(numRate) || numRate < 0) {
    throw new HttpError(400, "سعر اليوم يجب أن يكون رقماً صالحاً (أكبر من أو يساوي 0)");
  }

  await Setting.findOneAndUpdate(
    { key: "payment_plus_day_rate" },
    { value: { dayRate: numRate } },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    message: "تم حفظ سعر اليوم بنجاح",
    dayRate: numRate,
  });
});

// ── GET /api/admin/user-wallets/traffic-analytics ──────────────────────────────
export const getTrafficAnalytics = asyncHandler(async (req, res) => {
  const users = await User.find({
    $or: [
      { "paymentMethods.0": { $exists: true } },
      { "paymentPageSettings.analytics.totalVisits": { $gt: 0 } },
      { paymentPlusActive: true },
    ],
  })
    .select("_id name email phone username publicId avatar paymentMethods paymentPageSettings createdAt")
    .lean();

  let totalCardVisits = 0;
  let totalDirectVisits = 0;
  let totalVisits = 0;

  const userStats = users.map((u) => {
    const analytics = u.paymentPageSettings?.analytics || {};
    const cardVisits = analytics.cardVisits || 0;
    const directVisits = analytics.directVisits || 0;
    const userTotal = analytics.totalVisits || (cardVisits + directVisits);
    const lastVisitAt = analytics.lastVisitAt || null;

    totalCardVisits += cardVisits;
    totalDirectVisits += directVisits;
    totalVisits += userTotal;

    const identifier = u.username || u.publicId || u._id.toString();

    return {
      userId: u._id,
      name: u.name || "مستخدم",
      email: u.email,
      phone: u.phone,
      username: u.username,
      publicId: u.publicId,
      avatar: u.paymentPageSettings?.avatar || u.avatar || "",
      paymentUrl: `/pay/${identifier}`,
      cardVisits,
      directVisits,
      totalVisits: userTotal,
      lastVisitAt,
      walletsCount: (u.paymentMethods || []).length,
    };
  });

  // Sort by highest traffic first
  userStats.sort((a, b) => b.totalVisits - a.totalVisits);

  res.json({
    success: true,
    summary: {
      totalVisits,
      totalCardVisits,
      totalDirectVisits,
      usersCount: userStats.length,
      activeLinksCount: userStats.filter((u) => u.walletsCount > 0).length,
    },
    users: userStats,
  });
});

