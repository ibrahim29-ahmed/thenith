import React, { useEffect, useState, useRef } from "react";
import {
  AlertCircle,
  Clock,
  ChevronRight,
  Loader2,
  ArrowLeft,
  RefreshCw,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/index.js";
import { useGlobalLanguage } from "../../../context/GlobalLanguageContext.jsx";
import { formatMoney } from "../../../pages/store/storeApi.js";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "../../../util/toast";
import UnifiedPaymentBox from "./UnifiedPaymentBox.jsx";

export default function PendingPaymentAlert() {
  const { language } = useGlobalLanguage();
  const isArabic = language === "ar" || !language;
  const navigate = useNavigate();
  const [pending, setPending] = useState({ subscriptions: [], orders: [] });
  const pendingRef = useRef({ subscriptions: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchPending = async (isPolling = false) => {
    try {
      const data = await api.payment.getPending();
      if (data.success) {
        const isCard = (p) => {
          const tx = p?.transaction || p;
          if (!tx) return false;
          if (tx.paymentMethodId === 2) return true;
          const name = `${tx.paymentMethodName || p?.paymentMethod || ""}`.toLowerCase();
          return (
            name.includes("visa") ||
            name.includes("mastercard") ||
            name.includes("card") ||
            name.includes("فيزا") ||
            name.includes("بطاق")
          );
        };

        const isTxExpired = (item) => {
          const tx = item?.transaction || item;
          if (!tx) return false;
          if (tx.status === "expired" || tx.status === "cancelled" || tx.status === "failed") return true;
          const cTime = new Date(tx.fawaterakCreatedAt || tx.createdAt || Date.now()).getTime();
          const isWallet = Boolean(
            tx.paymentMethodId === 4 ||
            tx.paymentData?.mobileWalletNumber ||
            tx.paymentData?.meezaQrCode ||
            tx.paymentData?.isoQr ||
            /wallet|محفظ|meeza|كاش/i.test(tx.paymentMethodName || "")
          );
          if (isWallet) {
            const maxWallet = (!isNaN(cTime) ? cTime : Date.now()) + 5 * 60 * 1000;
            return Date.now() > maxWallet;
          }
          const expDate =
            tx.fawaterakExpireDate ||
            tx.paymentData?.fawaterakExpireDate ||
            tx.paymentData?.expirationTime ||
            tx.paymentData?.expireDate;
          if (expDate) {
            const expTime = new Date(expDate).getTime();
            if (!isNaN(expTime)) return Date.now() > expTime;
          }
          return false;
        };

        const newSubs = (data.subscriptions || []).filter((s) => !isCard(s) && !isTxExpired(s));
        const newOrders = (data.orders || []).filter((o) => !isCard(o) && !isTxExpired(o));

        // If this is a background poll and a payment was resolved (array length decreased)
        if (isPolling) {
          const prevSubs = pendingRef.current.subscriptions;
          const prevOrders = pendingRef.current.orders;

          if (newSubs.length < prevSubs.length) {
            const resolvedSub =
              prevSubs.find(
                (oldSub) =>
                  !newSubs.some(
                    (s) =>
                      (s._id || s.transaction?.intentKey) ===
                      (oldSub._id || oldSub.transaction?.intentKey),
                  ),
              ) || prevSubs[0];

            const newState = { subscriptions: newSubs, orders: newOrders };
            pendingRef.current = newState;
            setPending(newState);
            return;
          }

          if (newOrders.length < prevOrders.length) {
            const newState = { subscriptions: newSubs, orders: newOrders };
            pendingRef.current = newState;
            setPending(newState);
            return;
          }
        }

        const newState = { subscriptions: newSubs, orders: newOrders };
        pendingRef.current = newState;
        setPending(newState);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(() => {
      fetchPending(true);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPending();

    // If the currently selected tx is no longer in the list (paid or expired), close the modal
    if (selectedTx) {
      const { transaction } = selectedTx;
      let stillPending = false;
      const data = await api.payment.getPending();
      if (data.success) {
        const all = [...(data.subscriptions || []), ...(data.orders || [])];
        stillPending = all.some(
          (item) => item.transaction?._id === transaction._id,
        );
        if (!stillPending) {
          setSelectedTx(null);
          // If it was a subscription that got paid, we could refresh session
          if (selectedTx.type === "subscription") {
            try {
              await api.auth.session();
            } catch {}
          }
        }
      }
    }
    setRefreshing(false);
  };

  const handleCancel = async () => {
    if (!selectedTx || !selectedTx.transaction) return;
    const confirmCancel = window.confirm(
      isArabic
        ? "هل أنت متأكد من إلغاء هذا الدفع؟"
        : "Are you sure you want to cancel this payment?",
    );
    if (!confirmCancel) return;

    setCancelling(true);
    try {
      const res = await api.payment.cancel(selectedTx.transaction.intentKey);
      if (res.success) {
        toast.success(
          isArabic ? "تم إلغاء الدفع بنجاح" : "Payment cancelled successfully",
        );
        setSelectedTx(null);
        await fetchPending();
      } else {
        toast.error(
          isArabic ? "حدث خطأ أثناء الإلغاء" : "Failed to cancel payment",
        );
      }
    } catch (err) {
      toast.error(
        isArabic ? "حدث خطأ أثناء الإلغاء" : "Failed to cancel payment",
      );
    } finally {
      setCancelling(false);
    }
  };

  if (
    loading ||
    (pending.subscriptions.length === 0 && pending.orders.length === 0)
  ) {
    return null;
  }

  // Modal is no longer used; navigation happens on click

  return (
    <>
      <div className="mb-8 space-y-4">
        {pending.subscriptions.map((sub) => {
          const planName =
            typeof sub.planId?.name === "object"
              ? sub.planId.name[isArabic ? "ar" : "en"] || sub.planId.name.ar
              : sub.planId?.name || "Pro";

          return (
            <div
              key={sub._id}
              className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-100 text-sm sm:text-base">
                    {isArabic
                      ? "دفع اشتراك غير مكتمل"
                      : "Incomplete Subscription Payment"}
                  </h4>
                  <p className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm mt-0.5">
                    {isArabic
                      ? `لديك طلب اشتراك في باقة ${planName} قيد الانتظار الدفع.`
                      : `You have a pending subscription payment for ${planName} plan.`}
                  </p>
                </div>
              </div>

              <div className="flex w-full sm:w-auto shrink-0 gap-2">
                <button
                  onClick={async () => {
                    setSelectedTx({ transaction: sub.transaction });
                    const confirmCancel = window.confirm(
                      isArabic
                        ? "هل أنت متأكد من إلغاء هذا الدفع؟"
                        : "Are you sure you want to cancel this payment?"
                    );
                    if (!confirmCancel) return;
                    setCancelling(true);
                    try {
                      const res = await api.payment.cancel(sub.transaction?.intentKey);
                      if (res.success) {
                        toast.success(isArabic ? "تم إلغاء الدفع بنجاح" : "Payment cancelled");
                        await fetchPending();
                      } else {
                        toast.error(isArabic ? "حدث خطأ أثناء الإلغاء" : "Failed to cancel");
                      }
                    } catch (err) {
                      toast.error(isArabic ? "حدث خطأ أثناء الإلغاء" : "Failed to cancel");
                    } finally {
                      setCancelling(false);
                    }
                  }}
                  disabled={cancelling}
                  className="w-1/2 sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>

                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set("type", "subscription");
                    const pId = sub.planId?._id || sub.planId;
                    if (pId) params.set("planId", pId);
                    params.set("id", sub._id);
                    const intent = sub.transaction?.intentKey || sub.intentKey;
                    if (intent && intent !== "undefined" && intent !== "null") {
                      params.set("intentKey", intent);
                    }
                    const period =
                      sub.billingPeriod ||
                      sub.transaction?.paymentData?.targetBillingPeriod ||
                      "monthly";
                    params.set("billingPeriod", period);
                    window.location.href = `/payment?${params.toString()}`;
                  }}
                  className="w-1/2 sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isArabic ? "استكمال الدفع" : "Complete Payment"}
                  {isArabic ? (
                    <ArrowLeft className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {pending.orders.map((order) => (
          <div
            key={order._id}
            className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <AlertCircle className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h4 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm sm:text-base">
                  {isArabic
                    ? "طلب متجر بانتظار الدفع"
                    : "Pending Store Order Payment"}
                </h4>
                <p className="text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm mt-0.5">
                  {isArabic
                    ? `طلب رقم ${order.orderNumber || order._id.slice(-6).toUpperCase()} بمبلغ ${formatMoney(order.totalAmount)} بانتظار إتمام الدفع.`
                    : `Order #${order.orderNumber || order._id.slice(-6).toUpperCase()} for ${formatMoney(order.totalAmount)} is waiting for payment.`}
                </p>
              </div>
            </div>

            <div className="flex w-full sm:w-auto shrink-0 gap-2">
              <button
                onClick={async () => {
                  setSelectedTx({ transaction: order.transaction });
                  const confirmCancel = window.confirm(
                    isArabic
                      ? "هل أنت متأكد من إلغاء هذا الدفع؟"
                      : "Are you sure you want to cancel this payment?"
                  );
                  if (!confirmCancel) return;
                  setCancelling(true);
                  try {
                    const res = await api.payment.cancel(order.transaction?.intentKey);
                    if (res.success) {
                      toast.success(isArabic ? "تم إلغاء الدفع بنجاح" : "Payment cancelled");
                      await fetchPending();
                    } else {
                      toast.error(isArabic ? "حدث خطأ أثناء الإلغاء" : "Failed to cancel");
                    }
                  } catch (err) {
                    toast.error(isArabic ? "حدث خطأ أثناء الإلغاء" : "Failed to cancel");
                  } finally {
                    setCancelling(false);
                  }
                }}
                disabled={cancelling}
                className="w-1/2 sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                {isArabic ? "إلغاء" : "Cancel"}
              </button>

              <button
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("type", "order");
                  params.set("orderId", order._id);
                  params.set("id", order._id);
                  const intent = order.transaction?.intentKey || order.intentKey;
                  if (intent && intent !== "undefined" && intent !== "null") {
                    params.set("intentKey", intent);
                  }
                  window.location.href = `/payment?${params.toString()}`;
                }}
                className="w-1/2 sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isArabic ? "متابعة الدفع" : "Complete Payment"}
                {isArabic ? (
                  <ArrowLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
