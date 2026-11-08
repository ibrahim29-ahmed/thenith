import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Plus,
  ExternalLink,
  Copy,
  Trash2,
  X,
  Loader2,
  Check,
  Link2,
  Globe,
  Pencil,
  Sparkles,
  Lock,
  CreditCard,
  Settings,
  Star,
  Upload,
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
  BadgeCheck,
  Calendar,
  ArrowRight,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useGlobalLanguage } from "../../../context/GlobalLanguageContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import {
  fetchPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  setActivePaymentMethod,
  deletePaymentMethod,
  updatePaymentPageSettings,
} from "../../services/dashboardApi.js";
import { uploadRoutes } from "../../../api/routes/upload.js";

function broadcastWalletUpdate() {
  try {
    if (typeof window !== "undefined") {
      const now = String(Date.now());
      localStorage.setItem("thenith_profile_updated_at", now);
      const ch = new BroadcastChannel("thenith_profile_sync");
      ch.postMessage({ type: "wallet_update", timestamp: now });
      ch.close();
    }
  } catch {}
}

// ── Official Normalized Wallet Logos ──────────────────────────────────────────

export function VodafoneLogo({ className = "w-full h-full" }) {
  return (
    <img
      src="/wallets/vodafone-cash.png"
      alt="فودافون كاش"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

export function InstapayLogo({ className = "w-full h-full" }) {
  return (
    <img
      src="/wallets/instapay.png"
      alt="انستاباي"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

export function OrangeLogo({ className = "w-full h-full" }) {
  return (
    <img
      src="/wallets/orange-cash.png"
      alt="أورنج كاش"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

export function EtisalatLogo({ className = "w-full h-full" }) {
  return (
    <img
      src="/wallets/etisalat-cash.png"
      alt="اتصالات كاش"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

export function WePayLogo({ className = "w-full h-full" }) {
  return (
    <img
      src="/wallets/we-pay.png"
      alt="وي باي"
      className={`${className} object-contain`}
      loading="lazy"
    />
  );
}

// ── Exclusive 5 Egyptian Digital Wallets Catalog ──────────────────────────────

export const DEFAULT_PROVIDERS = [
  {
    id: "vodafone_cash",
    nameAr: "فودافون كاش",
    nameEn: "Vodafone Cash",
    badge: "فودافون",
    icon: "/wallets/vodafone-cash.png",
    Logo: VodafoneLogo,
    placeholder: "https://...",
    enabled: true,
  },
  {
    id: "instapay",
    nameAr: "انستاباي",
    nameEn: "Instapay",
    badge: "انستاباي",
    icon: "/wallets/instapay.png",
    Logo: InstapayLogo,
    placeholder: "https://instapay.eg/...",
    enabled: true,
  },
  {
    id: "orange_cash",
    nameAr: "أورنج كاش",
    nameEn: "Orange Cash",
    badge: "أورنج",
    icon: "/wallets/orange-cash.png",
    Logo: OrangeLogo,
    placeholder: "https://...",
    enabled: true,
  },
  {
    id: "etisalat_cash",
    nameAr: "اتصالات كاش",
    nameEn: "Etisalat Cash",
    badge: "اتصالات",
    icon: "/wallets/etisalat-cash.png",
    Logo: EtisalatLogo,
    placeholder: "https://...",
    enabled: true,
  },
  {
    id: "we_pay",
    nameAr: "وي باي",
    nameEn: "WE Pay",
    badge: "وي",
    icon: "/wallets/we-pay.png",
    Logo: WePayLogo,
    placeholder: "https://...",
    enabled: true,
  },
];

export default function PaymentMethodsSection({
  initialPaymentMethods = [],
  initialActivePaymentMethodId = null,
  ownerUsername = "",
  ownerPublicId = "",
  onUpgrade,
}) {
  const { language } = useGlobalLanguage();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const isAr = language === "ar";

  const [paymentMethods, setPaymentMethods] = useState(
    Array.isArray(initialPaymentMethods) ? initialPaymentMethods : [],
  );
  const [activePaymentMethodId, setActivePaymentMethodId] = useState(
    initialActivePaymentMethodId || null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [panelConfig, setPanelConfig] = useState(null);

  // Payment Page Settings State
  const [paymentPageSettings, setPaymentPageSettings] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    avatar: "",
    coverImage: "",
    displayName: "",
    description: "",
  });
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // New Method Form State
  const [addFormData, setAddFormData] = useState({
    name: "",
    provider: "vodafone_cash",
    link: "",
    walletNumber: "",
    accountName: "",
  });

  // Edit Method Form State
  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    provider: "vodafone_cash",
    link: "",
    walletNumber: "",
    accountName: "",
  });

  const [userIdentifier, setUserIdentifier] = useState(
    ownerUsername || ownerPublicId || "",
  );
  const [hasPaymentPlus, setHasPaymentPlus] = useState(false);
  const [paymentPlusDetails, setPaymentPlusDetails] = useState(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (ownerUsername || ownerPublicId) {
      setUserIdentifier(ownerUsername || ownerPublicId);
    }
  }, [ownerUsername, ownerPublicId]);

  // Helper to build direct custom link for each method
  const getCustomMethodLink = (method) => {
    const origin =
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
      window.location.origin;
    const identifier = userIdentifier || ownerUsername || ownerPublicId || "";
    const slug = method.customSlug || method.id;
    return `${origin}/pay/${identifier}?pay=${encodeURIComponent(slug)}`;
  };

  // Helper to build unified all-methods link
  const getUnifiedPaymentLink = () => {
    const origin =
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
      window.location.origin;
    const identifier = userIdentifier || ownerUsername || ownerPublicId || "";
    return `${origin}/pay/${identifier}`;
  };

  // Format wallet number with spaces
  const formatNumber = (num) => {
    if (!num) return "";
    const clean = String(num).replace(/\s+/g, "");
    if (/^01[0125]\d{8}$/.test(clean)) {
      return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
    }
    return clean;
  };

  // Load payment methods on mount
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetchPaymentMethods();
        if (isMounted && res) {
          if (res.user?.username || res.user?.publicId) {
            setUserIdentifier(res.user.username || res.user.publicId);
          }
          if (res.panelConfig) {
            setPanelConfig(res.panelConfig);
          }
          setHasPaymentPlus(Boolean(res.hasPaymentPlus));
          if (res.paymentPlusDetails) {
            setPaymentPlusDetails(res.paymentPlusDetails);
          }
          if (typeof res.isPro !== "undefined") {
            setIsPro(Boolean(res.isPro));
          }
          if (res.paymentPageSettings) {
            setPaymentPageSettings(res.paymentPageSettings);
          }
          const methods = res.paymentMethods || [];
          setPaymentMethods(methods);
          setActivePaymentMethodId(
            res.activePaymentMethodId || (methods[0]?.id ?? null),
          );
        }
      } catch (err) {
        if (isMounted && initialPaymentMethods?.length) {
          setPaymentMethods(initialPaymentMethods);
          setActivePaymentMethodId(initialActivePaymentMethodId);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectActive = async (id) => {
    if (activePaymentMethodId === id) return;
    try {
      setActivePaymentMethodId(id);
      setPaymentMethods((prev) =>
        prev.map((m) => ({
          ...m,
          isActive: m.id === id,
        })),
      );
      await setActivePaymentMethod(id);
      broadcastWalletUpdate();
      toast.success(
        isAr ? "تم تحديد وسيلة الدفع الأساسية" : "Primary payment method set",
      );
    } catch (err) {
      toast.error(
        isAr
          ? "حدث خطأ أثناء تحديد الوسيلة الأساسية"
          : "Failed to set primary method",
      );
    }
  };

  const handleCopy = (text, key) => {
    if (!text || !text.trim()) {
      toast.error(isAr ? "لا يوجد رابط لنسخه" : "No link to copy");
      return;
    }
    navigator.clipboard.writeText(text.trim());
    setCopiedId(key);
    toast.success(isAr ? "تم نسخ الرابط بنجاح" : "Link copied!");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleOpenLink = (link) => {
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleDeleteMethod = async (id, name) => {
    const ok = await confirm({
      title: isAr ? "حذف وسيلة الدفع" : "Delete Payment Method",
      message: isAr
        ? `هل أنت متأكد من رغبتك في حذف "${name}"؟`
        : `Are you sure you want to delete "${name}"?`,
      confirmText: isAr ? "حذف" : "Delete",
      type: "danger",
    });

    if (!ok) return;

    try {
      const res = await deletePaymentMethod(id);
      broadcastWalletUpdate();
      const allowedIds = new Set(PROVIDERS.map((p) => p.id));
      if (res && res.paymentMethods) {
        const filtered = res.paymentMethods.filter((m) =>
          allowedIds.has(m.provider),
        );
        setPaymentMethods(filtered);
        setActivePaymentMethodId(res.activePaymentMethodId);
      } else {
        const remaining = paymentMethods.filter((m) => m.id !== id);
        setPaymentMethods(remaining);
        if (activePaymentMethodId === id) {
          setActivePaymentMethodId(remaining[0]?.id || null);
        }
      }
      toast.success(
        isAr ? "تم حذف وسيلة الدفع بنجاح" : "Payment method deleted",
      );
    } catch (err) {
      toast.error(
        isAr ? "تعذر حذف وسيلة الدفع" : "Failed to delete payment method",
      );
    }
  };

  // Open Edit Modal
  const openEditModal = (method) => {
    setEditFormData({
      id: method.id,
      name: method.name || "",
      provider: method.provider || "vodafone_cash",
      link: method.link || "",
      walletNumber: method.walletNumber || "",
      accountName: method.accountName || "",
    });
    setEditingMethod(method);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      toast.error(isAr ? "يرجى إدخال اسم الوسيلة" : "Please enter a method name");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await updatePaymentMethod(editFormData.id, {
        name: editFormData.name.trim(),
        link: (editFormData.link || "").trim(),
        walletNumber: (editFormData.walletNumber || "").trim(),
        accountName: (editFormData.accountName || "").trim(),
      });

      if (res && res.paymentMethods) {
        setPaymentMethods(res.paymentMethods);
      } else {
        setPaymentMethods((prev) =>
          prev.map((m) =>
            m.id === editFormData.id
              ? {
                  ...m,
                  name: editFormData.name.trim(),
                  link: (editFormData.link || "").trim(),
                  walletNumber: (editFormData.walletNumber || "").trim(),
                  accountName: (editFormData.accountName || "").trim(),
                }
              : m,
          ),
        );
      }

      setEditingMethod(null);
      broadcastWalletUpdate();
      toast.success(
        isAr
          ? "تم تحديث بيانات المحفظة بنجاح"
          : "Wallet details updated successfully",
      );
    } catch (err) {
      toast.error(
        isAr ? "تعذر تحديث بيانات المحفظة" : "Failed to update wallet",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Add
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addFormData.name.trim()) {
      toast.error(isAr ? "يرجى إدخال اسم الوسيلة" : "Please enter a method name");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createPaymentMethod({
        name: addFormData.name.trim(),
        provider: addFormData.provider,
        link: (addFormData.link || "").trim(),
        walletNumber: (addFormData.walletNumber || "").trim(),
        accountName: (addFormData.accountName || "").trim(),
        customSlug: addFormData.provider.replace("_", "-"),
      });

      if (res && res.paymentMethods) {
        setPaymentMethods(res.paymentMethods);
        setActivePaymentMethodId(res.activePaymentMethodId);
      } else if (res && res.paymentMethod) {
        setPaymentMethods((prev) => [...prev, res.paymentMethod]);
        if (!activePaymentMethodId) {
          setActivePaymentMethodId(res.paymentMethod.id);
        }
      }

      setAddFormData({
        name: "",
        provider: "vodafone_cash",
        link: "",
        walletNumber: "",
        accountName: "",
      });
      setIsAddModalOpen(false);
      broadcastWalletUpdate();
      toast.success(
        isAr ? "تم إضافة وسيلة الدفع بنجاح" : "Payment method added successfully",
      );
    } catch (err) {
      toast.error(
        isAr ? "تعذر إضافة وسيلة الدفع" : "Failed to add payment method",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Providers list combined with admin config
  const providersList = useMemo(() => {
    if (!panelConfig?.providers || !Array.isArray(panelConfig.providers)) {
      return DEFAULT_PROVIDERS;
    }
    return DEFAULT_PROVIDERS.map((def) => {
      const cfg = panelConfig.providers.find((p) => p.id === def.id);
      if (!cfg) return def;
      return {
        ...def,
        nameAr: cfg.nameAr || def.nameAr,
        nameEn: cfg.nameEn || def.nameEn,
        badge: cfg.badge || def.badge,
        icon: cfg.icon || def.icon,
        placeholder: cfg.placeholder || def.placeholder,
        enabled: cfg.enabled !== false,
      };
    }).filter((p) => p.enabled);
  }, [panelConfig]);

  // Page Header Info
  const headerInfo = useMemo(() => {
    return {
      titleAr: panelConfig?.header?.titleAr || "وسائل الدفع والمحافظ",
      titleEn: panelConfig?.header?.titleEn || "Wallets & Payment Methods",
      descAr:
        panelConfig?.header?.descAr ||
        "إدارة المحافظ الإلكترونية وروابط الدفع المباشرة الخاصة بك مع توفير لينك مخصص لكل محفظة",
      descEn:
        panelConfig?.header?.descEn ||
        "Manage your digital wallets and direct payment links with dedicated custom links for each",
    };
  }, [panelConfig]);

  const getProviderInfo = (providerId) => {
    const found = providersList.find((p) => p.id === providerId);
    if (found) return found;
    return (
      DEFAULT_PROVIDERS.find((p) => p.id === providerId) || DEFAULT_PROVIDERS[0]
    );
  };

  const handleOrderPaymentCard = (method) => {
    const prov = getProviderInfo(method.provider);
    const skuMap = {
      vodafone_cash: "TH-PAY-VODAFONE",
      instapay: "TH-PAY-INSTAPAY",
      orange_cash: "TH-PAY-ORANGE",
      etisalat_cash: "TH-PAY-ETISALAT",
      we_pay: "TH-PAY-WEPAY",
    };
    const sku = skuMap[method.provider] || "TH-PAY-CARD";
    const primaryLink = getUnifiedPaymentLink(); // اللينك الأساسي للكارت: /pay/:identifier

    const params = new URLSearchParams();
    params.set("category", "وسائل الدفع");
    params.set("sku", sku);
    params.set("wallet", method.provider || method.id);
    params.set("walletId", method.id || "");
    params.set("walletName", method.name || prov.nameAr);
    if (method.walletNumber) params.set("walletNumber", method.walletNumber);
    if (method.accountName) params.set("accountName", method.accountName);
    params.set("targetLink", primaryLink);

    navigate(`/u/products?${params.toString()}`);
  };

  const handleOrderUnifiedCard = () => {
    const params = new URLSearchParams();
    params.set("category", "وسائل الدفع");
    params.set("sku", "TH-PAY-UNIFIED");
    params.set("wallet", "unified");
    params.set(
      "walletName",
      isAr ? "صفحة الدفع الموحدة" : "Unified Payment Page"
    );
    params.set("targetLink", getUnifiedPaymentLink());
    if (ownerUsername || userIdentifier) {
      params.set("accountName", ownerUsername || userIdentifier);
    }
    navigate(`/u/products?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col justify-between gap-4 rounded-[20px] bg-white p-3 shadow-sm dark:bg-slate-950/45 sm:flex-row sm:items-center sm:rounded-[24px] sm:p-4 md:bg-transparent md:p-0 md:shadow-none">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.35rem,5vw,1.5rem)] font-black text-slate-900 dark:text-white">
            <span>{isAr ? headerInfo.titleAr : headerInfo.titleEn}</span>
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {isAr ? headerInfo.descAr : headerInfo.descEn}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setSettingsForm({
                avatar: paymentPageSettings?.avatar || "",
                coverImage: paymentPageSettings?.coverImage || "",
                displayName: paymentPageSettings?.displayName || "",
                description: paymentPageSettings?.description || "",
              });
              setIsSettingsModalOpen(true);
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-sm cursor-pointer"
            title={isAr ? "إعدادات صفحة الدفع" : "Payment Page Settings"}
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex min-h-11 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-sm whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>{isAr ? "إضافة وسيلة دفع" : "Add Payment Method"}</span>
          </button>
        </div>
      </div>


          {/* ── Primary Link + Unified Hub Toggle ── */}
      {!isLoading && paymentMethods.length > 0 && (() => {
        const primaryMethod = paymentMethods.find((m) => m.id === activePaymentMethodId);
        const primaryLink = (() => {
          const origin =
            (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
            window.location.origin;
          const identifier = userIdentifier || ownerUsername || ownerPublicId || "";
          return `${origin}/pay/${identifier}`;
        })();
        const isUnifiedEnabled = paymentPageSettings?.isUnifiedHubEnabled === true;

        return (
          <div className={`rounded-[22px] border p-4 sm:p-5 transition-all shadow-sm ${
            hasPaymentPlus && isUnifiedEnabled
              ? "border-emerald-200/80 bg-gradient-to-r from-emerald-50/30 via-white to-white dark:border-emerald-900/40 dark:from-emerald-950/10 dark:via-slate-950/45 dark:to-slate-950/45"
              : !hasPaymentPlus
              ? "border-amber-200/80 bg-gradient-to-r from-amber-50/40 via-white to-white dark:border-amber-900/30 dark:from-amber-950/15 dark:via-slate-950/45 dark:to-slate-950/45"
              : "border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-950/45"
          }`}>
            <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                {/* Header Row: Title */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    <span>{isAr ? "اللينك الأساسي للكارت" : "Primary Card Link"}</span>
                  </h3>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 leading-relaxed">
                  {hasPaymentPlus && isUnifiedEnabled
                    ? isAr
                      ? "الصفحة المجمعة مفعّلة وتعرض جميع وسائل الدفع المضافة في صفحة واحدة للعميل."
                      : "The unified page is enabled and displays all your added payment methods on one page."
                    : primaryMethod
                    ? isAr
                      ? `هذا الرابط يفتح وسيلة الدفع الأساسية (${primaryMethod.name}) مباشرة للعميل.`
                      : `This link opens your primary payment method (${primaryMethod.name}) directly.`
                    : isAr
                    ? "هذا الرابط يفتح وسيلة الدفع الأساسية المحددة مباشرة للعميل."
                    : "This link opens your designated primary payment method directly."}
                </p>

                {/* Primary Card Link Box */}
                <div className="flex max-w-xl items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <Link2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span
                    dir="ltr"
                    className="truncate text-xs font-mono font-bold text-slate-700 dark:text-slate-300 select-all flex-1"
                  >
                    {primaryLink}
                  </span>
                </div>
              </div>

              {/* Actions: Copy + Preview + Toggle Button */}
              <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(primaryLink, "primary_link")}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                    copiedId === "primary_link"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white"
                  }`}
                >
                  {copiedId === "primary_link" ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{isAr ? "تم النسخ" : "Copied"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>{isAr ? "نسخ الرابط" : "Copy Link"}</span>
                    </>
                  )}
                </button>

                <a
                  href={primaryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>{isAr ? "معاينة" : "Preview"}</span>
                </a>

                {hasPaymentPlus ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const newVal = !isUnifiedEnabled;
                        setPaymentPageSettings((prev) => ({
                          ...prev,
                          isUnifiedHubEnabled: newVal,
                        }));
                        await updatePaymentPageSettings({
                          isUnifiedHubEnabled: newVal,
                        });
                        broadcastWalletUpdate();
                        toast.success(
                          isAr
                            ? newVal
                              ? "تم تفعيل صفحة وسائل الدفع المجمعة"
                              : "تم إيقاف الصفحة المجمعة (سيفتح الوسيلة الأساسية)"
                            : newVal
                            ? "Unified payment page enabled"
                            : "Unified page disabled (opens primary)"
                        );
                      } catch (err) {
                        setPaymentPageSettings((prev) => ({
                          ...prev,
                          isUnifiedHubEnabled: isUnifiedEnabled,
                        }));
                        toast.error(
                          isAr ? "حدث خطأ" : "Something went wrong"
                        );
                      }
                    }}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      isUnifiedEnabled
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {isUnifiedEnabled ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                    <span>
                      {isUnifiedEnabled
                        ? isAr ? "الصفحة المجمعة: مفعّلة" : "Unified: Enabled"
                        : isAr ? "تفعيل الصفحة المجمعة" : "Enable Unified"}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof onUpgrade === "function") {
                        onUpgrade();
                      } else {
                        navigate("/u/subscriptions");
                      }
                    }}
                    className="flex h-10 items-center justify-center rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
                  >
                    <span>{isAr ? "تصفح الباقات" : "Browse Plans"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Payment Methods Grid ── */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : paymentMethods.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-950/45">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <Wallet className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">
            {isAr ? "لا توجد وسائل دفع مضافة بعد" : "No payment methods added yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {isAr
              ? "أضف محافظك الإلكترونية (فودافون كاش، انستاباي، أورنج كاش، اتصالات كاش، وي باي) واحصل على لينك مخصص لكل وسيلة"
              : "Add your digital wallets (Vodafone Cash, Instapay, Orange, Etisalat, WE) and get a dedicated custom link for each"}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-sm font-bold text-white shadow-sm cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? "إضافة أول محفظة" : "Add First Wallet"}</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {paymentMethods.map((method) => {
            const prov = getProviderInfo(method.provider);
            const ProvLogo = prov.Logo;
            const customLink = getCustomMethodLink(method);
            const effectiveMethodLink = customLink;
            const isSelected = method.id === activePaymentMethodId;

            return (
              <div
                key={method.id}
                onClick={() => {
                  if (!isSelected) {
                    handleSelectActive(method.id);
                  }
                }}
                className={`rounded-[22px] border p-4 text-end shadow-sm transition-all hover:shadow-md dark:bg-slate-950/45 sm:p-5 ltr:text-left flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800/60 dark:bg-emerald-950/10 ring-1 ring-emerald-200/50 dark:ring-emerald-900/30"
                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 dark:border-slate-900 dark:hover:border-slate-800 dark:hover:bg-slate-900/20 bg-white"
                }`}
                title={!isSelected ? (isAr ? "اضغط لتعيين هذه الوسيلة كأساسية" : "Click to set as primary") : undefined}
              >
                {/* ── Top Header of Card: Provider Badge + Primary Badge + Actions ── */}
                <div>
                  <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-900">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {prov[isAr ? "badge" : "nameEn"]}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <Star className="h-3 w-3 fill-current" />
                          <span>{isAr ? "الأساسية" : "Primary"}</span>
                        </span>
                      )}
                    </div>

                    {/* Top Actions: زر تعديل + زر حذف */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* زر تعديل من فوق */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(method);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                        title={isAr ? "تعديل بيانات المحفظة" : "Edit Details"}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>{isAr ? "تعديل" : "Edit"}</span>
                      </button>

                      {/* زر حذف */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMethod(method.id, method.name);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title={isAr ? "حذف وسيلة الدفع" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ── Card Main: Icon + Name + Details ── */}
                  <div
                    onClick={(e) => {
                      if (!isSelected) {
                        e.stopPropagation();
                        handleSelectActive(method.id);
                      }
                    }}
                    className="mb-4 flex items-start gap-3.5 group rounded-xl p-1 -m-1"
                  >
                    {/* Large Wallet Icon */}
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-white p-1 sm:p-1.5 border border-slate-200/90 shadow-sm overflow-hidden">
                      {prov.icon && !prov.icon.startsWith("/wallets/") ? (
                        <img
                          src={prov.icon}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : ProvLogo ? (
                        <ProvLogo className="w-full h-full object-contain" />
                      ) : (
                        <img
                          src={prov.icon}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>

                    {/* Name & Wallet Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-black text-slate-900 dark:text-white">
                          {method.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* ── Custom Dedicated Link Box ── */}
                  <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 dark:border-indigo-950/60 dark:bg-indigo-950/25">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        <span>
                          {isAr ? "رابط thenith المخصص للمحفظة" : "Thenith Dedicated Link"}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/80 rounded-lg px-2.5 py-1.5 border border-indigo-200/60 dark:border-indigo-900/50 overflow-hidden">
                      <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span
                        dir="ltr"
                        className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-300 select-all"
                      >
                        {effectiveMethodLink.replace(/^https?:\/\//, "")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Bottom Action Bar: زر نسخ وزر فتح للينك المخصص ── */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-900">
                  {/* زر نسخ لينك thenith المخصص */}
                  <button
                    type="button"
                    onClick={() => handleCopy(effectiveMethodLink, `card_${method.id}`)}
                    className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      copiedId === `card_${method.id}`
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {copiedId === `card_${method.id}` ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>{isAr ? "تم النسخ" : "Copied"}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>{isAr ? "نسخ الرابط" : "Copy Link"}</span>
                      </>
                    )}
                  </button>

                  {/* زر فتح لينك thenith المخصص */}
                  <a
                    href={effectiveMethodLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-3 text-xs font-bold text-white transition-colors shadow-xs"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{isAr ? "فتح الرابط" : "Open Link"}</span>
                  </a>

                  {/* زر اختياري لفتح رابط الدفع المباشر إن وجد */}
                  {method.link && (
                    <button
                      type="button"
                      onClick={() => handleOpenLink(method.link)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 transition-colors cursor-pointer"
                      title={isAr ? "فتح تطبيق/رابط الدفع المباشر" : "Open Direct Payment"}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* ── Modal 1: Add New Wallet / Payment Method ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
            onClick={() => setIsAddModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {isAr ? "إضافة محفظة إلكترونية جديدة" : "Add New Wallet"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={handleAddSubmit}
                className="p-6 space-y-4 overflow-y-auto max-h-[80vh]"
              >
                {/* Method Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "اسم وسيلة الدفع *" : "Payment Method Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={addFormData.name}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, name: e.target.value })
                    }
                    placeholder={
                      isAr
                        ? "مثال: فودافون كاش الرئيسي، انستاباي الشخصي"
                        : "e.g. Vodafone Cash, Personal Instapay"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Direct 5 Wallets Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {isAr ? "اختر نوع المحفظة *" : "Select Wallet *"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {providersList.map((p) => {
                      const isChosen = addFormData.provider === p.id;
                      const Logo = p.Logo;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setAddFormData((prev) => ({
                              ...prev,
                              provider: p.id,
                              name: prev.name || p.nameAr,
                            }));
                          }}
                          className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-start w-full min-w-0 transition-all cursor-pointer ${
                            isChosen
                              ? "border-indigo-500 bg-indigo-50/80 dark:border-indigo-500 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/20"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-200/90 shadow-2xs overflow-hidden">
                            {p.icon && !p.icon.startsWith("/wallets/") ? (
                              <img
                                src={p.icon}
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            ) : Logo ? (
                              <Logo className="w-full h-full object-contain" />
                            ) : (
                              <img
                                src={p.icon}
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                              {p[isAr ? "nameAr" : "nameEn"]}
                            </p>
                            <span className="text-[10px] text-slate-400 font-semibold truncate block">
                              {p.badge}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Account Owner Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "اسم صاحب المحفظة" : "Account Holder Name"}
                  </label>
                  <input
                    type="text"
                    value={addFormData.accountName}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        accountName: e.target.value,
                      })
                    }
                    placeholder={
                      isAr ? "مثال: محمد أحمد" : "e.g. John Doe"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Wallet Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "رقم المحفظة" : "Wallet Phone Number"}
                  </label>
                  <input
                    type="text"
                    value={addFormData.walletNumber}
                    onChange={(e) =>
                      setAddFormData({
                        ...addFormData,
                        walletNumber: e.target.value,
                      })
                    }
                    placeholder="010XXXXXXXX"
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Direct Payment Link */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr
                      ? "رابط الدفع المباشر (مثل رابط أنا فودافون)"
                      : "Direct Payment Link / App URL"}
                  </label>
                  <input
                    type="url"
                    value={addFormData.link}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, link: e.target.value })
                    }
                    placeholder="https://..."
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Submit & Cancel */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !addFormData.name.trim()}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>{isAr ? "إضافة وسيلة الدفع" : "Add Method"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal 2: Edit Wallet Details (تعديل من فوق) ── */}
      <AnimatePresence>
        {editingMethod && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
            onClick={() => setEditingMethod(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <Pencil className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      {isAr ? "تعديل بيانات المحفظة" : "Edit Wallet Details"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isAr
                        ? "تعديل رابط الدفع ورقم المحفظة واسم صاحبها"
                        : "Update payment link, number and holder name"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMethod(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={handleEditSubmit}
                className="p-6 space-y-4 overflow-y-auto max-h-[80vh]"
              >
                {/* Method Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "اسم وسيلة الدفع *" : "Payment Method Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Account Owner Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "اسم صاحب المحفظة" : "Wallet Holder Name"}
                  </label>
                  <input
                    type="text"
                    value={editFormData.accountName}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        accountName: e.target.value,
                      })
                    }
                    placeholder={
                      isAr ? "مثال: محمد أحمد" : "e.g. John Doe"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Wallet Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "رقم المحفظة" : "Wallet Phone Number"}
                  </label>
                  <input
                    type="text"
                    value={editFormData.walletNumber}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        walletNumber: e.target.value,
                      })
                    }
                    placeholder="010XXXXXXXX"
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Direct Payment Link */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr
                      ? "رابط الدفع المباشر (مثل رابط أنا فودافون)"
                      : "Direct Payment Link / App URL"}
                  </label>
                  <input
                    type="url"
                    value={editFormData.link}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, link: e.target.value })
                    }
                    placeholder="https://..."
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Submit & Cancel */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingMethod(null)}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !editFormData.name.trim()}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>{isAr ? "حفظ التعديلات" : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal 3: Payment Page Settings (إعدادات صفحة الدفع) ── */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
            onClick={() => setIsSettingsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      {isAr ? "إعدادات صفحة الدفع" : "Payment Page Settings"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isAr
                        ? "تخصيص الصورة والغلاف والبيانات لصفحة الدفع فقط (منفصلة تماماً عن بروفايلك الشخصي)"
                        : "Customize branding for the payment page only (completely separate from personal profile)"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                {/* Avatar Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {isAr ? "صورة البروفايل لصفحة الدفع" : "Payment Page Avatar"}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                      {isUploadingAvatar ? (
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      ) : settingsForm.avatar ? (
                        <img
                          src={settingsForm.avatar}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error(isAr ? "حجم الصورة يجب ألا يتجاوز 10 ميجابايت" : "Image size must be under 10MB");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = async () => {
                            try {
                              setIsUploadingAvatar(true);
                              const res = await uploadRoutes.uploadBase64("paymentAvatar", reader.result);
                              if (res?.url) {
                                setSettingsForm((prev) => ({ ...prev, avatar: res.url }));
                                toast.success(isAr ? "تم رفع الصورة" : "Image uploaded");
                              }
                            } catch (err) {
                              toast.error(isAr ? "فشل رفع الصورة" : "Upload failed");
                            } finally {
                              setIsUploadingAvatar(false);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <button
                        type="button"
                        disabled={isUploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        <span>{isUploadingAvatar ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "رفع صورة" : "Upload")}</span>
                      </button>
                      {settingsForm.avatar && !isUploadingAvatar && (
                        <button
                          type="button"
                          onClick={() => setSettingsForm((prev) => ({ ...prev, avatar: "" }))}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                        >
                          {isAr ? "إزالة" : "Remove"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {isAr ? "صورة الغلاف لصفحة الدفع" : "Payment Page Cover Image"}
                  </label>
                  <div className="relative w-full h-28 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                    {isUploadingCover ? (
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    ) : settingsForm.coverImage ? (
                      <img
                        src={settingsForm.coverImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-[10px] text-slate-400 mt-1">
                          {isAr ? "صورة الغلاف" : "Cover Image"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error(isAr ? "حجم الصورة يجب ألا يتجاوز 10 ميجابايت" : "Image size must be under 10MB");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = async () => {
                          try {
                            setIsUploadingCover(true);
                            const res = await uploadRoutes.uploadBase64("paymentCover", reader.result);
                            if (res?.url) {
                              setSettingsForm((prev) => ({ ...prev, coverImage: res.url }));
                              toast.success(isAr ? "تم رفع صورة الغلاف" : "Cover uploaded");
                            }
                          } catch (err) {
                            toast.error(isAr ? "فشل رفع الصورة" : "Upload failed");
                          } finally {
                            setIsUploadingCover(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <button
                      type="button"
                      disabled={isUploadingCover}
                      onClick={() => coverInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingCover ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>{isUploadingCover ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "رفع غلاف" : "Upload Cover")}</span>
                    </button>
                    {settingsForm.coverImage && !isUploadingCover && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm((prev) => ({ ...prev, coverImage: "" }))}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                      >
                        {isAr ? "إزالة" : "Remove"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "اسم العرض على صفحة الدفع" : "Display Name on Payment Page"}
                  </label>
                  <input
                    type="text"
                    value={settingsForm.displayName}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                    placeholder={isAr ? "اسم يظهر على صفحة الدفع" : "Name shown on payment page"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isAr ? "وصف صفحة الدفع" : "Payment Page Description"}
                  </label>
                  <textarea
                    value={settingsForm.description}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder={isAr ? "وصف قصير يظهر على صفحة الدفع" : "Short description on payment page"}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white resize-none"
                  />
                </div>

                {/* Save & Cancel */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    disabled={isSettingsSaving}
                    onClick={async () => {
                      try {
                        setIsSettingsSaving(true);
                        await updatePaymentPageSettings({
                          avatar: settingsForm.avatar,
                          coverImage: settingsForm.coverImage,
                          displayName: settingsForm.displayName,
                          description: settingsForm.description,
                        });
                        broadcastWalletUpdate();
                        setPaymentPageSettings((prev) => ({
                          ...prev,
                          avatar: settingsForm.avatar,
                          coverImage: settingsForm.coverImage,
                          displayName: settingsForm.displayName,
                          description: settingsForm.description,
                        }));
                        setIsSettingsModalOpen(false);
                        toast.success(
                          isAr
                            ? "تم حفظ إعدادات صفحة الدفع بنجاح"
                            : "Payment page settings saved"
                        );
                      } catch (err) {
                        toast.error(
                          isAr
                            ? "حدث خطأ أثناء الحفظ"
                            : "Failed to save settings"
                        );
                      } finally {
                        setIsSettingsSaving(false);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {isSettingsSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>{isAr ? "حفظ الإعدادات" : "Save Settings"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
