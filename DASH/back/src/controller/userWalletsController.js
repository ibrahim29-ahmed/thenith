import User from "../models/User.js";
import Setting from "../models/Setting.js";
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

