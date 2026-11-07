import { useEffect, useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  User,
  Save,
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  Link2,
  AtSign,
  XCircle,
  Trash2,
  Loader2,
  Crown,
  CalendarDays,
  BadgeCheck,
  Ban,
  CreditCard,
} from "lucide-react";
import Field from "../ui/Field.jsx";
import { useConfirm } from "../../context/ConfirmContext";
import { canAccess } from "../../utils/entitlements.js";
import api from "../../../api/index.js";
import { formatMoney } from "../../../pages/store/storeApi.js";
import UnifiedPaymentBox from "./UnifiedPaymentBox.jsx";
import { toast } from "../../../util/toast";
import ErrorNotice from "../../../components/ErrorNotice.jsx";
import { getLocalizedErrorMessage } from "../../../utils/errorHandling.js";
import {
  deleteSecondaryEmail,
  requestSecondaryEmail,
  verifySecondaryEmail,
} from "../../services/authApi.js";

const statusIcon = {
  Received: Clock,
  Processing: Clock,
  Shipped: Package,
  Delivered: CheckCircle2,
  Cancelled: XCircle,
};

const statusColor = {
  Received:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Processing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Shipped: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Delivered:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const statusTranslation = {
  Received: { en: "Pending", ar: "جاري المراجعة" },
  Processing: { en: "Processing", ar: "جاري التجهيز" },
  Shipped: { en: "Shipped", ar: "في الشحن" },
  Delivered: { en: "Delivered", ar: "تم التسليم" },
  Cancelled: { en: "Cancelled", ar: "ملغي" },
  Returned: { en: "Returned", ar: "مرتجع" },
};

const isCashOnDeliveryOrder = (order) => {
  if (!order) return false;
  const pm = String(order.paymentMethod || "").toLowerCase();
  const pmn = String(order.paymentMethodName || "").toLowerCase();
  return (
    pm === "cash_on_delivery" ||
    pm === "cod" ||
    pmn.includes("استلام") ||
    pmn.includes("cash on delivery") ||
    pmn.includes("cod")
  );
};

// Only allow letters, numbers, hyphens, underscores
function sanitizeUsername(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 30);
}

const parseLocalizedName = (name, isArabic) => {
  if (!name) return "";
  if (typeof name === "object") {
    return name[isArabic ? "ar" : "en"] || name.ar || name.en || "";
  }
  if (
    typeof name === "string" &&
    name.startsWith("{") &&
    name.includes("ar:") &&
    name.includes("en:")
  ) {
    try {
      const arMatch = name.match(/ar:\s*['"]([^'"]+)['"]/);
      const enMatch = name.match(/en:\s*['"]([^'"]+)['"]/);
      if (isArabic && arMatch) return arMatch[1];
      if (!isArabic && enMatch) return enMatch[1];
      return arMatch ? arMatch[1] : enMatch ? enMatch[1] : name;
    } catch {
      return name;
    }
  }
  return name;
};

export default function ProfilePage({
  t,
  language,
  personal,
  entitlements,
  onUpdate,
  onPersistedUpdate,
  onCheckUsername,
  onDeleteAccount,
  onSaveProfile,
  isUploading,
  hasOwnerChanges,
  onUpgrade,
}) {
  const { confirm } = useConfirm();
  const isArabic = language === "ar";
  const canUseCustomLink = canAccess(entitlements, "customLink");
  const isPro = entitlements?.plan === "pro";
  const showUpgradeMessage = () => {
    import("sweetalert2").then((Swal) => {
      Swal.default
        .fire({
          title: isPro ? t("limitReachedTitle") : t("proFeatureOnly"),
          text: isPro ? t("limitReachedText") : t("proFeatureText"),
          icon: "warning",
          showCancelButton: !isPro,
          confirmButtonText: isPro 
            ? (isArabic ? "حسناً" : "OK") 
            : (isArabic ? "تصفح الباقات" : "View Plans"),
          cancelButtonText: isArabic ? "إلغاء" : "Cancel",
          confirmButtonColor: "#4f46e5",
        })
        .then((result) => {
          if (!isPro && result.isConfirmed && onUpgrade) {
            onUpgrade();
          }
        });
    });
  };
  const [saved, setSaved] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [showAllSubscriptions, setShowAllSubscriptions] = useState(false);
  const [selectedSubDetails, setSelectedSubDetails] = useState(null);

  const [showAllOrders, setShowAllOrders] = useState(false);
  const visibleOrders = showAllOrders ? orders : orders.slice(0, 5);
  const visibleSubscriptions = showAllSubscriptions
    ? subscriptions
    : subscriptions.slice(0, 3);
  const username = personal?.username || "";
  const [usernameStatus, setUsernameStatus] = useState("idle");

  useEffect(() => {
    let mounted = true;
    api.panel
      .getOrders()
      .then((res) => {
        if (mounted) {
          setOrders(res.orders || []);
          setLoadingOrders(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingOrders(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    api.panel
      .getSubscriptions()
      .then((res) => {
        if (mounted) {
          // Filter to show Pro subscriptions only
          const allSubs = res.subscriptions || [];
          setSubscriptions(allSubs);
          setLoadingSubscriptions(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingSubscriptions(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleDeleteOrder = async (orderId) => {
    const confirmed = await confirm({
      title: isArabic ? "حذف الطلب" : "Delete Order",
      message: isArabic
        ? "هل أنت متأكد من حذف هذا الطلب نهائياً من سجل طلباتك؟"
        : "Are you sure you want to permanently delete this order from your history?",
      confirmText: isArabic ? "نعم، احذف" : "Yes, Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    setDeletingOrder(orderId);
    try {
      await api.panel.deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
      if (selectedOrderDetails?._id === orderId) {
        setSelectedOrderDetails(null);
      }
    } catch (err) {
      toast.error(getLocalizedErrorMessage(err, language));
    } finally {
      setDeletingOrder(null);
    }
  };

  const [cancellingSub, setCancellingSub] = useState(false);

  const handleCancelSubscription = async (subId) => {
    const confirmed = await confirm({
      title: isArabic ? "إلغاء الاشتراك" : "Cancel Subscription",
      message: isArabic
        ? "هل أنت متأكد من رغبتك في إلغاء هذا الاشتراك؟"
        : "Are you sure you want to cancel this subscription?",
      confirmText: isArabic ? "نعم، إلغاء الاشتراك" : "Yes, Cancel",
      variant: "danger",
    });
    if (!confirmed) return;
    setCancellingSub(subId);
    try {
      const txToCancel = subscriptions.find((s) => s._id === subId);
      if (
        txToCancel &&
        txToCancel.status === "pending" &&
        txToCancel.intentKey
      ) {
        await api.payment.cancel(txToCancel.intentKey);
      } else {
        // Fallback for older data if somehow they call this
        await api.panel.cancelSubscription(subId);
      }
      setSubscriptions((prev) =>
        prev.map((s) => (s._id === subId ? { ...s, status: "cancelled" } : s)),
      );
      if (selectedSubDetails?._id === subId) {
        setSelectedSubDetails((prev) =>
          prev ? { ...prev, status: "cancelled" } : null,
        );
      }
    } catch (err) {
      toast.error(getLocalizedErrorMessage(err, language));
    } finally {
      setCancellingSub(null);
    }
  };

  const handleResumePayment = (item) => {
    if (!item) return;
    const isStore = item.orderType === "store" || item.type === "order";
    const params = new URLSearchParams();
    params.set("type", isStore ? "order" : "subscription");
    params.set("id", item._id);
    if (isStore) {
      params.set("orderId", item.referenceId || item._id);
    } else if (item.planId) {
      params.set("planId", item.planId?._id || item.planId);
    }
    const cleanIntent = item.intentKey;
    if (cleanIntent && cleanIntent !== "undefined" && cleanIntent !== "null") {
      params.set("intentKey", cleanIntent);
    }
    window.location.href = `/payment?${params.toString()}`;
  };

  useEffect(() => {
    if (!username) {
      setUsernameStatus("idle");
      return undefined;
    }
    if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
      setUsernameStatus("invalid");
      return undefined;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const result = await onCheckUsername(username);
        setUsernameStatus(result.available ? "available" : "taken");
      } catch {
        setUsernameStatus("error");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [username, onCheckUsername]);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailActionError, setEmailActionError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  const handleSave = async () => {
    setSaved("saving");
    try {
      await onSaveProfile();
      setSaved("saved");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaved("error");
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleVerifyEmail = async () => {
    if (!otpCode) return;
    setVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await verifySecondaryEmail(pendingEmail, otpCode);
      if (res.profile) {
        onPersistedUpdate(res.profile);
      }
      setShowOtpModal(false);
      setOtpCode("");
      setNewEmail("");
      setShowAddEmail(false);
      setSaved("saved");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setOtpError(getLocalizedErrorMessage(err, language));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRequestSecondaryEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setOtpError(t("emailInvalid"));
      return;
    }
    setEmailBusy(true);
    setOtpError("");
    try {
      await requestSecondaryEmail(email);
      setPendingEmail(email);
      setOtpCode("");
      setShowOtpModal(true);
    } catch (err) {
      setOtpError(getLocalizedErrorMessage(err, language));
    } finally {
      setEmailBusy(false);
    }
  };

  const handleDeleteEmail = async (email) => {
    const removingPrimary = email === personal?.email;
    const confirmed = await confirm({
      title: removingPrimary
        ? isArabic
          ? "حذف البريد الأساسي"
          : "Remove primary email"
        : isArabic
          ? "حذف البريد الإلكتروني"
          : "Remove email address",
      message: removingPrimary
        ? isArabic
          ? `سيصبح ${personal.secondaryEmails[0]} البريد الأساسي. هل تريد المتابعة؟`
          : `${personal.secondaryEmails[0]} will become the primary email. Continue?`
        : isArabic
          ? `هل تريد حذف ${email}؟`
          : `Remove ${email}?`,
      confirmText: isArabic ? "حذف" : "Remove",
      variant: "danger",
    });
    if (!confirmed) return;
    setEmailBusy(true);
    setEmailActionError("");
    try {
      const res = await deleteSecondaryEmail(email);
      if (res.profile) onPersistedUpdate(res.profile);
    } catch (err) {
      setEmailActionError(getLocalizedErrorMessage(err, language));
    } finally {
      setEmailBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: t("deleteAccountTitle"),
      message: t("deleteAccountMessage"),
      confirmText: t("deleteAccount"),
      type: "danger",
    });
    if (confirmed) await onDeleteAccount();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950/45 sm:flex-row sm:items-center sm:rounded-2xl sm:p-5 md:bg-transparent md:p-0 md:shadow-none">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{t("profile")}</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{t("profileIntro")}</p>
        </div>
      </div>

      {/* Username / Card Link */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5 dark:border-indigo-900/30 dark:bg-indigo-950/20">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-800 dark:text-white">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
              <AtSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </span>
            {t("customLinkLabel")}
          </h2>
          {canAccess(entitlements, "customLink") && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
              PRO
            </span>
          )}
        </div>
        <div className="space-y-3">
          <div
            className={`relative flex items-center overflow-hidden rounded-xl border bg-white min-h-[44px] transition-colors dark:bg-slate-900/60 shadow-2xs ${usernameStatus === "taken" || usernameStatus === "invalid" ? "border-rose-500 ring-2 ring-rose-500/20 dark:border-rose-400" : "border-slate-200 dark:border-slate-800 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20"}`}
          >
            <input
              type="text"
              maxLength={30}
              aria-invalid={
                usernameStatus === "taken" || usernameStatus === "invalid"
              }
              value={username}
              onClick={(e) => {
                if (!canUseCustomLink) {
                  e.preventDefault();
                  showUpgradeMessage();
                }
              }}
              readOnly={!canUseCustomLink}
              onChange={(e) =>
                onUpdate({
                  ...personal,
                  username: sanitizeUsername(e.target.value),
                })
              }
              placeholder="username"
              className={`flex-1 bg-transparent px-3.5 py-2.5 text-base sm:text-sm font-bold text-slate-800 outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-white ${usernameStatus === "taken" || usernameStatus === "invalid" ? "text-rose-600 dark:text-rose-400" : ""}`}
            />
          </div>
          {!canUseCustomLink && (
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              {t("proFeatureText")}
            </p>
          )}
          {usernameStatus === "checking" && (
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
              {t("checkingName")}
            </p>
          )}
          {usernameStatus === "available" && (
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("usernameAvailable")}
            </p>
          )}
          {usernameStatus === "taken" && (
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
              <XCircle className="h-3.5 w-3.5" />
              {t("usernameUsed")}
            </p>
          )}
          {usernameStatus === "invalid" && (
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
              <XCircle className="h-3.5 w-3.5" />
              {isArabic
                ? "الاسم من 3 إلى 30 حرفًا أو رقمًا أو _ أو -"
                : "Use 3-30 letters, numbers, _ or -"}
            </p>
          )}
          {username &&
          usernameStatus !== "taken" &&
          usernameStatus !== "invalid" ? (
            <div className="flex items-center gap-2 rounded-xl bg-indigo-100/60 px-3 py-2 dark:bg-indigo-900/20">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[12px] font-bold text-indigo-700 dark:text-indigo-300">
                {(() => {
                  let url =
                    personal?.publicUrl ||
                    `${window.location.origin}/p/${username || user?.publicId}`;
                  const path = url.split("/").filter(Boolean).pop();
                  return `${window.location.origin}/p/${path}`;
                })()}
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">{t("usernameHint")}</p>
          )}
        </div>
      </div>

      {/* Account Info & Subscriptions Grid */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Subscription History */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-900 dark:bg-slate-950/45 flex flex-col">
          <h2 className="mb-5 flex items-center justify-between text-sm font-black text-slate-800 dark:text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </span>
              {isArabic ? "سجل الفواتير" : "Invoices History"}
            </div>
            {subscriptions.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {subscriptions.length}
              </span>
            )}
          </h2>

          {loadingSubscriptions ? (
            <div className="space-y-3 py-2 animate-pulse">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800/50"
                />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center my-auto">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/60">
                <CalendarDays className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {isArabic ? "لا توجد فواتير سابقة" : "No invoices found"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                {visibleSubscriptions.map((sub) => {
                  const planName =
                    sub.orderType === "subscription"
                      ? isArabic
                        ? "اشتراك Pro"
                        : "Pro Subscription"
                      : isArabic
                        ? "طلب متجر"
                        : "Store Order";

                  const isCard =
                    sub.paymentMethodId === 2 ||
                    /visa|mastercard|card|فيزا|ماستر|بطاقة/i.test(
                      sub.paymentMethodName || "",
                    );

                  const isTxExpired = (() => {
                    if (sub.status === "expired") return true;
                    if (sub.status !== "pending") return false;
                    const cTime = new Date(sub.fawaterakCreatedAt || sub.createdAt || Date.now()).getTime();
                    const isWallet = Boolean(
                      sub.paymentMethodId === 4 ||
                      sub.paymentData?.mobileWalletNumber ||
                      sub.paymentData?.meezaQrCode ||
                      sub.paymentData?.isoQr ||
                      /wallet|محفظ|meeza|كاش/i.test(sub.paymentMethodName || "")
                    );
                    if (isWallet) {
                      const maxWallet = (!isNaN(cTime) ? cTime : Date.now()) + 5 * 60 * 1000;
                      return Date.now() > maxWallet;
                    }
                    const expDate =
                      sub.fawaterakExpireDate ||
                      sub.paymentData?.fawaterakExpireDate ||
                      sub.paymentData?.expirationTime ||
                      sub.paymentData?.expireDate;
                    if (expDate) {
                      const expTime = new Date(expDate).getTime();
                      if (!isNaN(expTime)) return Date.now() > expTime;
                    }
                    return false;
                  })();

                  const isActive = sub.status === "paid";
                  const isPending = sub.status === "pending" && !isCard && !isTxExpired;
                  const isCancelled =
                    sub.status === "cancelled" || sub.status === "failed";
                  const isExpired = sub.status === "expired" || isTxExpired;

                  const statusBadge = isActive
                    ? {
                        label: isArabic ? "تم الدفع" : "Paid",
                        cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                        Icon: BadgeCheck,
                      }
                    : isPending
                      ? {
                          label: isArabic ? "بانتظار الدفع" : "Pending",
                          cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                          Icon: Clock,
                        }
                      : isCancelled
                        ? {
                            label: isArabic ? "ملغي" : "Cancelled",
                            cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                            Icon: Ban,
                          }
                        : isExpired
                          ? {
                              label: isArabic ? "منتهي" : "Expired",
                              cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                              Icon: XCircle,
                            }
                          : {
                              label: sub.status,
                              cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                              Icon: Clock,
                            };

                  return (
                    <div
                      key={sub._id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/50 dark:bg-slate-900/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 shadow-sm dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
                          <CalendarDays className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 dark:text-white">
                            {planName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] font-bold text-slate-400">
                              {new Date(sub.createdAt).toLocaleDateString(
                                isArabic ? "ar-EG-u-nu-latn" : "en-US",
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <span
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${statusBadge.cls}`}
                        >
                          <statusBadge.Icon className="h-3 w-3" />
                          {statusBadge.label}
                        </span>

                        {isPending && (
                          <button
                            onClick={() => handleResumePayment(sub)}
                            className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 text-[11px] font-bold transition-colors shadow-sm"
                          >
                            {isArabic ? "استكمال الدفع" : "Pay Now"}
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedSubDetails(sub)}
                          className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                        >
                          {isArabic ? "التفاصيل" : "Details"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {subscriptions.length > 3 && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setShowAllSubscriptions(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 py-1 px-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20 transition-colors"
                  >
                    {isArabic ? "عرض المزيد" : "Show More"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Personal Details */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-900 dark:bg-slate-950/45">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
              <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </span>
            {t("personal")}
          </h2>
          <div className="space-y-4">
            <Field
              label={t("fullName")}
              value={personal?.fullName || ""}
              onChange={(val) => onUpdate({ ...personal, fullName: val })}
            />
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">
                {t("profileEmail")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  readOnly
                  value={personal?.email || ""}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                />
                <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {isArabic ? "أساسي" : "Primary"}
                </span>
                {!!personal?.secondaryEmails?.length && (
                  <button
                    type="button"
                    title={
                      isArabic
                        ? "حذف الأساسي وترقية الآخر"
                        : "Remove primary and promote the other email"
                    }
                    aria-label={
                      isArabic
                        ? "حذف الأساسي وترقية الآخر"
                        : "Remove primary and promote the other email"
                    }
                    disabled={emailBusy}
                    onClick={() => handleDeleteEmail(personal.email)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {(personal?.secondaryEmails || []).map((email) => (
                <div key={email} className="mt-2 flex items-center gap-2">
                  <input
                    type="email"
                    readOnly
                    value={email}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    title={
                      isArabic
                        ? "حذف البريد الإلكتروني"
                        : "Remove email address"
                    }
                    aria-label={
                      isArabic
                        ? "حذف البريد الإلكتروني"
                        : "Remove email address"
                    }
                    disabled={emailBusy}
                    onClick={() => handleDeleteEmail(email)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!personal?.secondaryEmails?.length && !showAddEmail && (
                <button
                  type="button"
                  onClick={() => setShowAddEmail(true)}
                  className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  + {isArabic ? "إضافة بريد إلكتروني آخر" : "Add another email"}
                </button>
              )}
              {!personal?.secondaryEmails?.length && showAddEmail && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder={
                      isArabic ? "البريد الإلكتروني" : "Email address"
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={emailBusy}
                    onClick={handleRequestSecondaryEmail}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isArabic ? "إرسال رمز التحقق" : "Send verification code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEmail(false);
                      setNewEmail("");
                      setOtpError("");
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    {t("cancel")}
                  </button>
                </div>
              )}
              {showAddEmail && (
                <ErrorNotice
                  error={otpError}
                  language={language}
                  className="mt-2"
                />
              )}
              <ErrorNotice
                error={emailActionError}
                language={language}
                className="mt-2"
              />
            </div>
            <Field
              label={t("profilePhone")}
              value={personal?.phone || ""}
              onChange={(val) => onUpdate({ ...personal, phone: val })}
            />
          </div>
        </div>
      </div>

      {/* Save profile button */}
      <div className="mt-4 flex w-full justify-end">
        <button
          onClick={handleSave}
          disabled={saved === "saving" || isUploading || !hasOwnerChanges}
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
            saved === "saved"
              ? "bg-emerald-500 text-white"
              : saved === "error"
                ? "bg-rose-500 text-white"
                : isUploading || !hasOwnerChanges
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-70"
                  : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-md"
          }`}
        >
          {(saved === "saving" || isUploading) && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {saved === "saving"
            ? t("saving")
            : saved === "saved"
              ? t("saved")
              : saved === "error"
                ? t("saveFailed")
                : isUploading
                  ? t("uploading")
                  : t("save")}
        </button>
      </div>

      {/* My Orders */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-900 dark:bg-slate-950/45">
        <h2 className="mb-5 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
            <ShoppingBag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </span>
          {t("myOrders")}
          {orders.length > 0 && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-black text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              {orders.length}
            </span>
          )}
        </h2>

        {loadingOrders ? (
          <div className="space-y-3 py-2 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800/50"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/60">
              <ShoppingBag className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {t("noItems") || "لا توجد طلبات"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((order) => {
              // Format standard enum statuses to title case for mapping
              const mappedStatus =
                (order.status || "received").charAt(0).toUpperCase() +
                (order.status || "received").slice(1);
              const StatusIcon = statusIcon[mappedStatus] || Clock;
              const colorClass =
                statusColor[mappedStatus] || statusColor["Processing"];
              const translatedStatus =
                statusTranslation[mappedStatus]?.[isArabic ? "ar" : "en"] ||
                mappedStatus;

              return (
                <div
                  key={order._id}
                  className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/50 dark:bg-slate-900/30 sm:flex-row sm:items-center sm:p-4 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <ShoppingBag className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <span>#{order.orderNumber}</span>
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 line-clamp-1 mt-0.5">
                        {order.items
                          ?.map((i) => parseLocalizedName(i.name, isArabic))
                          .join(", ")}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString(
                          isArabic ? "ar-EG-u-nu-latn" : "en-US",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-4">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {formatMoney(order.totalAmount)}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${colorClass}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {translatedStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetails(order)}
                      className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                    >
                      {isArabic ? "التفاصيل" : "Details"}
                    </button>
                    {!isCashOnDeliveryOrder(order) && (order.status === "pending" || order.paymentStatus === "pending") && (
                      <button
                        type="button"
                        onClick={() => handleResumePayment({ ...order, orderType: "store" })}
                        className="rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{isArabic ? "دفع الآن" : "Pay Now"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {orders.length > 5 && (
              <button
                onClick={() => setShowAllOrders(!showAllOrders)}
                className="mt-4 w-full rounded-xl bg-slate-50 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-800/80"
              >
                {showAllOrders
                  ? isArabic
                    ? "عرض أقل"
                    : "Show Less"
                  : isArabic
                    ? "عرض المزيد"
                    : "Show More"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* All Subscriptions Modal */}
      {showAllSubscriptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-slate-950 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {isArabic ? "سجل جميع الفواتير" : "All Invoices History"}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    {isArabic
                      ? `إجمالي الفواتير: ${subscriptions.length}`
                      : `Total Invoices: ${subscriptions.length}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllSubscriptions(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 scrollbar-hide flex-1">
              {subscriptions.map((sub) => {
                const planName =
                  sub.orderType === "subscription"
                    ? isArabic
                      ? "اشتراك Pro"
                      : "Pro Subscription"
                    : isArabic
                      ? "طلب متجر"
                      : "Store Order";

                const isActive = sub.status === "paid";
                const isPending = sub.status === "pending";
                const isCancelled =
                  sub.status === "cancelled" || sub.status === "failed";
                const isExpired = sub.status === "expired";

                const statusBadge = isActive
                  ? {
                      label: isArabic ? "تم الدفع" : "Paid",
                      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                      Icon: BadgeCheck,
                    }
                  : isPending
                    ? {
                        label: isArabic ? "بانتظار الدفع" : "Pending",
                        cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                        Icon: Clock,
                      }
                    : isCancelled
                      ? {
                          label: isArabic ? "ملغي" : "Cancelled",
                          cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                          Icon: Ban,
                        }
                      : isExpired
                        ? {
                            label: isArabic ? "منتهي" : "Expired",
                            cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                            Icon: XCircle,
                          }
                        : {
                            label: sub.status,
                            cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                            Icon: Clock,
                          };

                return (
                  <div
                    key={sub._id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800/50 dark:bg-slate-900/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 shadow-sm dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
                        <CalendarDays className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-white">
                          {planName}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {new Date(sub.createdAt).toLocaleDateString(
                            isArabic ? "ar-EG-u-nu-latn" : "en-US",
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <span
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${statusBadge.cls}`}
                      >
                        <statusBadge.Icon className="h-3.5 w-3.5" />
                        {statusBadge.label}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedSubDetails(sub)}
                        className="rounded-lg bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                      >
                        {isArabic ? "التفاصيل" : "Details"}
                      </button>
                      {sub.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleResumePayment(sub)}
                          className="rounded-lg bg-amber-500 hover:bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>{isArabic ? "دفع" : "Pay"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Subscription Details Modal */}
      {/* Subscription Details Modal */}
      {selectedSubDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {selectedSubDetails.orderType === "subscription" 
                      ? (isArabic ? "تفاصيل الاشتراك" : "Subscription Details")
                      : (isArabic ? "تفاصيل الطلب" : "Order Details")}
                  </h3>
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 uppercase">
                    {selectedSubDetails.orderType === "subscription" ? "PRO" : (isArabic ? "متجر" : "STORE")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubDetails(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/30">
                  <p className="text-[11px] font-bold text-slate-400">
                    {isArabic ? "حالة الدفع" : "Status"}
                  </p>
                  <p className="text-sm font-black text-slate-800 dark:text-white mt-1 capitalize">
                    {selectedSubDetails.status === "active" ||
                    selectedSubDetails.status === "paid"
                      ? isArabic
                        ? "تم الدفع"
                        : "Paid"
                      : selectedSubDetails.status === "pending"
                        ? isArabic
                          ? "بانتظار الدفع"
                          : "Pending"
                        : selectedSubDetails.status === "cancelled"
                          ? isArabic
                            ? "ملغي"
                            : "Cancelled"
                          : isArabic
                            ? "منتهي"
                            : "Expired"}
                  </p>
                </div>

                {selectedSubDetails.orderType === "subscription" && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/30">
                    <p className="text-[11px] font-bold text-slate-400">
                      {isArabic ? "فترة الفاتورة" : "Billing Period"}
                    </p>
                    <p className="text-sm font-black text-slate-800 dark:text-white mt-1">
                      {selectedSubDetails.billingPeriod === "yearly"
                        ? isArabic
                          ? "سنوي"
                          : "Yearly"
                        : isArabic
                          ? "شهري"
                          : "Monthly"}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">
                    {isArabic ? "تاريخ الاشتراك:" : "Start Date:"}
                  </span>
                  <span className="font-black text-slate-800 dark:text-white">
                    {new Date(selectedSubDetails.createdAt).toLocaleDateString(
                      isArabic ? "ar-EG-u-nu-latn" : "en-US",
                    )}
                  </span>
                </div>
                {selectedSubDetails.expiresAt && (
                  <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span className="font-bold text-slate-500">
                      {isArabic ? "تاريخ الانتهاء:" : "Expiration Date:"}
                    </span>
                    <span className="font-black text-slate-800 dark:text-white">
                      {new Date(
                        selectedSubDetails.expiresAt,
                      ).toLocaleDateString(
                        isArabic ? "ar-EG-u-nu-latn" : "en-US",
                      )}
                    </span>
                  </div>
                )}
                {selectedSubDetails.paidAmount > 0 && (
                  <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span className="font-bold text-slate-500">
                      {isArabic ? "المبلغ المدفوع:" : "Paid Amount:"}
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {selectedSubDetails.paidAmount} {isArabic ? "ج.م" : "EGP"}
                    </span>
                  </div>
                )}
                {selectedSubDetails.paymentMethod && (
                  <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span className="font-bold text-slate-500">
                      {isArabic ? "طريقة الدفع:" : "Payment Method:"}
                    </span>
                    <span className="font-black text-slate-800 dark:text-white">
                      {selectedSubDetails.paymentMethod}
                    </span>
                  </div>
                )}
              </div>

              {selectedSubDetails.fawryCode && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {isArabic
                      ? "كود الدفع عبر فوري (Fawry Pay):"
                      : "Fawry Reference Code:"}
                  </p>
                  <p className="text-2xl font-black text-amber-900 dark:text-amber-100 tracking-wider font-mono mt-1 select-all">
                    {selectedSubDetails.fawryCode}
                  </p>
                  {selectedSubDetails.fawryCodeExpiry && (
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1">
                      {isArabic ? "صالح حتى:" : "Expires at:"}{" "}
                      {new Date(
                        selectedSubDetails.fawryCodeExpiry,
                      ).toLocaleString(isArabic ? "ar-EG-u-nu-latn" : "en-US")}
                    </p>
                  )}
                </div>
              )}

              {selectedSubDetails.mobileWalletNumber && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800/60 dark:bg-indigo-950/30">
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {isArabic
                      ? "رقم المحفظة الإلكترونية:"
                      : "Mobile Wallet Number:"}
                  </p>
                  <p className="text-lg font-black text-indigo-900 dark:text-indigo-100 font-mono mt-1">
                    {selectedSubDetails.mobileWalletNumber}
                  </p>
                </div>
              )}

              {selectedSubDetails.status === "pending" && (
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => handleResumePayment(selectedSubDetails)}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isArabic ? "استكمال الدفع الآن" : "Complete Payment Now"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  {isArabic ? "تفاصيل الطلب" : "Order Details"}
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  #{selectedOrderDetails.orderNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6 scrollbar-hide">
              <h4 className="mb-3 text-xs font-black text-slate-400 uppercase tracking-wider">
                {isArabic ? "المنتجات" : "Items"}
              </h4>
              <div className="space-y-3 mb-8">
                {selectedOrderDetails.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.customDesign?.image && (
                        <img
                          src={item.customDesign.image}
                          alt="Custom Design"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{parseLocalizedName(item.name, isArabic)}</span>
                          {item.color && (
                            <span
                              className="w-3 h-3 rounded-full border border-black/10 inline-block shrink-0 shadow-2xs"
                              style={{ backgroundColor: item.color.colorCode || "#000" }}
                              title={item.color.name?.ar || item.color.name?.en || ""}
                            />
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.quantity} x {formatMoney(item.price)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                      {formatMoney(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <h4 className="mb-3 text-xs font-black text-slate-400 uppercase tracking-wider">
                {isArabic ? "معلومات الشحن" : "Shipping Info"}
              </h4>
              <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800 mb-8 space-y-2">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">
                    {isArabic ? "الاسم:" : "Name:"}
                  </strong>{" "}
                  {selectedOrderDetails.customer?.name}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">
                    {isArabic ? "الهاتف:" : "Phone:"}
                  </strong>{" "}
                  {selectedOrderDetails.customer?.phone}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">
                    {isArabic ? "طريقة الدفع:" : "Payment method:"}
                  </strong>{" "}
                  {isCashOnDeliveryOrder(selectedOrderDetails)
                    ? (isArabic ? "دفع عند الاستلام (COD)" : "Cash on delivery (COD)")
                    : selectedOrderDetails.paymentMethodName ||
                      selectedOrderDetails.paymentMethod ||
                      (isArabic ? "أونلاين" : "Online")}
                </p>
                {isCashOnDeliveryOrder(selectedOrderDetails) && (
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-2.5 rounded-xl">
                    {isArabic
                      ? "✓ تم تسجيل الطلب بنجاح، ويتم السداد نقداً عند استلام الشحنة."
                      : "✓ Order placed successfully. Payment will be collected in cash upon delivery."}
                  </p>
                )}
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">
                    {isArabic ? "العنوان:" : "Address:"}
                  </strong>{" "}
                  {selectedOrderDetails.customer?.address},{" "}
                  {selectedOrderDetails.customer?.city}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="font-black text-slate-800 dark:text-white">
                  {isArabic ? "الإجمالي" : "Total"}
                </span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {formatMoney(selectedOrderDetails.totalAmount)}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                {!isCashOnDeliveryOrder(selectedOrderDetails) &&
                  (selectedOrderDetails.status === "pending" || selectedOrderDetails.paymentStatus === "pending") && (
                    <button
                      type="button"
                      onClick={() => {
                        const ord = selectedOrderDetails;
                        setSelectedOrderDetails(null);
                        handleResumePayment({ ...ord, orderType: "store" });
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isArabic ? "استكمال الدفع أونلاين" : "Complete Payment Online"}</span>
                    </button>
                )}

                {["pending", "received", "cancelled"].includes(
                  selectedOrderDetails.status?.toLowerCase(),
                ) && (
                  <button
                    onClick={() => handleDeleteOrder(selectedOrderDetails._id)}
                    disabled={deletingOrder === selectedOrderDetails._id}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-sm transition-colors dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 disabled:opacity-50"
                  >
                    {deletingOrder === selectedOrderDetails._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {isArabic ? "إلغاء الطلب" : "Cancel Order"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5 dark:border-rose-900/40 dark:bg-rose-950/20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-rose-700 dark:text-rose-300">
              <Trash2 className="h-4 w-4" />
              {t("deleteAccount")}
            </h2>
            <p className="mt-1 text-xs font-medium text-rose-600/80 dark:text-rose-300/80">
              {t("deleteAccountDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white hover:bg-rose-700"
          >
            {t("deleteAccount")}
          </button>
        </div>
      </div>

      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="mb-2 text-xl font-black text-slate-800 dark:text-white">
              {isArabic ? "تأكيد البريد الإلكتروني" : "Verify Email"}
            </h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {isArabic
                ? `تم إرسال رمز تحقق إلى ${pendingEmail}. أدخله لإضافة البريد.`
                : `A verification code has been sent to ${pendingEmail}. Enter it to add this email.`}
            </p>

            <input
              type="text"
              className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xl font-bold tracking-[0.5em] text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="••••••"
              maxLength={6}
              value={otpCode}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/[^0-9]/g, ""))
              }
            />
            <ErrorNotice
              error={otpError}
              language={language}
              className="mb-4"
            />

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpCode("");
                  setOtpError("");
                }}
                className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleVerifyEmail}
                disabled={verifyingOtp || otpCode.length < 6}
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {verifyingOtp ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : isArabic ? (
                  "تأكيد"
                ) : (
                  "Verify"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
