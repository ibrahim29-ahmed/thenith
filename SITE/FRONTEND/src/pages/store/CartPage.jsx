import { useGlobalLanguage } from "../../context/GlobalLanguageContext.jsx";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Trash2, Plus, Minus, CreditCard, AlertCircle, Clock, X, ArrowLeft } from "lucide-react";
import { useCart } from "../../context/CartContext";
import GlobalLogo from "../../components/GlobalLogo.jsx";
import { formatMoney } from "./storeApi.js";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../api/index.js";
import { toast } from "../../util/toast";
import MainFooter from "../../components/MainFooter.jsx";

export default function CartPage() {
  const { t, language } = useGlobalLanguage();
  const { cart, updateQuantity, removeFromCart, totalPrice } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isArabic = language === "ar" || !language;

  const [pendingPayment, setPendingPayment] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchPending = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.payment.getPending();
      if (res && res.success) {
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

        const activeSubs = (res.subscriptions || []).filter((s) => !isCard(s));
        const activeOrders = (res.orders || []).filter((o) => !isCard(o));

        if (activeSubs.length > 0) {
          const sub = activeSubs[0];
          setPendingPayment({
            type: "subscription",
            id: sub._id,
            intentKey: sub.transaction?.intentKey,
            amount: sub.transaction?.amount,
            methodName: sub.transaction?.paymentMethodName,
            planName: sub.planId?.name?.ar || sub.planId?.name || "Pro",
          });
        } else if (activeOrders.length > 0) {
          const ord = activeOrders[0];
          setPendingPayment({
            type: "order",
            id: ord._id,
            intentKey: ord.transaction?.intentKey,
            amount: ord.transaction?.amount || ord.totalAmount,
            methodName: ord.transaction?.paymentMethodName,
            orderNumber: ord.orderNumber || ord._id.slice(-6).toUpperCase(),
          });
        } else {
          setPendingPayment(null);
        }
      }
    } catch (err) {
      // Ignore background pending fetch errors
    }
  };

  useEffect(() => {
    fetchPending();
  }, [isAuthenticated]);

  const handleCancelPending = async () => {
    if (!pendingPayment?.intentKey) return;
    const confirmCancel = window.confirm(
      isArabic
        ? "هل أنت متأكد من إلغاء عملية الدفع السابقة غير المكتملة؟"
        : "Are you sure you want to cancel the previous incomplete payment?"
    );
    if (!confirmCancel) return;

    setCancelling(true);
    try {
      const res = await api.payment.cancel(pendingPayment.intentKey);
      if (res.success) {
        toast.success(
          isArabic ? "تم إلغاء عملية الدفع السابقة بنجاح" : "Previous payment cancelled"
        );
        setPendingPayment(null);
      } else {
        toast.error(
          isArabic ? "حدث خطأ أثناء إلغاء الدفع" : "Failed to cancel payment"
        );
      }
    } catch (err) {
      toast.error(
        isArabic ? "حدث خطأ أثناء إلغاء الدفع" : "Failed to cancel payment"
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (pendingPayment) {
      toast.error(
        isArabic
          ? "لديك عملية دفع قيد الانتظار (فوري / محفظة إلكترونية). يجب إكمال الدفع أو إلغاء العملية السابقة أولاً."
          : "You have a pending payment. Please complete or cancel it before placing a new order."
      );
      return;
    }
    if (!isAuthenticated) {
      toast.error(
        isArabic
          ? "يجب تسجيل الدخول أو إنشاء حساب أولاً لمتابعة الشراء"
          : "You must log in or create an account to proceed to checkout"
      );
      navigate("/login?returnTo=/u/checkout");
      return;
    }
    navigate("/u/checkout");
  };

  const handleRemoveItem = async (cartItemId, itemName) => {
    const Swal = (await import("sweetalert2")).default;
    const result = await Swal.fire({
      title: isArabic ? "حذف من السلة" : "Remove from cart",
      text: isArabic
        ? `هل أنت متأكد من حذف "${itemName || "هذا العنصر"}" من سلة المشتريات؟`
        : `Are you sure you want to remove "${itemName || "this item"}" from your cart?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: isArabic ? "نعم، احذف" : "Yes, remove",
      cancelButtonText: isArabic ? "إلغاء" : "Cancel",
      reverseButtons: isArabic,
      customClass: {
        popup: "rounded-3xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800",
        title: "text-slate-800 dark:text-white font-black",
        htmlContainer: "text-slate-600 dark:text-slate-300 text-sm",
        confirmButton: "rounded-xl font-bold px-5 py-2.5",
        cancelButton: "rounded-xl font-bold px-5 py-2.5",
      },
    });

    if (result.isConfirmed) {
      removeFromCart(cartItemId);
      toast.success(isArabic ? "تم حذف العنصر من السلة" : "Item removed from cart");
    }
  };

  const handleDecrement = (item) => {
    const itemId = item.cartItemId || item.id;
    if (item.quantity <= 1) {
      const name = item.rawName?.[language] || item.rawName?.ar || item.name;
      handleRemoveItem(itemId, name);
    } else {
      updateQuantity(itemId, item.quantity - 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/30" dir={isArabic ? "rtl" : "ltr"}>
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-20 pb-28 md:pb-36">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-slate-900">
          {t("store.cartTitle")}
        </h1>

        {/* Pending Payment Blocking Banner */}
        {pendingPayment && (
          <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 dark:text-amber-100 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl mt-0.5">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-amber-900 dark:text-amber-200">
                    {isArabic
                      ? "تنبيه: لديك عملية دفع قيد الانتظار (فوري / محفظة إلكترونية)"
                      : "Notice: You have a pending payment (Fawry / Mobile Wallet)"}
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                    {isArabic
                      ? `لديك طلب ${pendingPayment.type === "subscription" ? "اشتراك" : "متجر"} سابق بمبلغ ${formatMoney(pendingPayment.amount)} لم يكتمل سداده بعد. لا يمكنك إتمام أي عملية شراء جديدة حتى تقوم بإكمال الدفع أو إلغاء العملية السابقة.`
                      : `You have an incomplete pending ${pendingPayment.type} payment (${formatMoney(pendingPayment.amount)}). You cannot start any new purchase until you complete or cancel the pending payment.`}
                  </p>
                </div>
              </div>

              <div className="flex w-full md:w-auto items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleCancelPending}
                  disabled={cancelling}
                  className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>{cancelling ? (isArabic ? "جاري الإلغاء..." : "Cancelling...") : (isArabic ? "إلغاء العملية السابقة" : "Cancel Pending")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({
                      type: pendingPayment.type,
                      id: pendingPayment.id,
                      intentKey: pendingPayment.intentKey || "",
                    });
                    navigate(`/payment?${params.toString()}`);
                  }}
                  className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <span>{isArabic ? "استكمال الدفع" : "Complete Payment"}</span>
                  {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold mb-4 text-slate-700">
              {t("store.emptyCart")}
            </h2>
            <p className="text-slate-500 mb-8">{t("store.noProductsAdded")}.</p>
            <Link
              to={isAuthenticated ? "/u/products" : "/products"}
              className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-3 rounded-full font-bold transition-all shadow-md hover:shadow-lg"
            >
              {t("store.browseProducts")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
              {cart.map((item) => (
                <div
                  key={item.cartItemId || item.id}
                  className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-6"
                >
                  <img
                    src={item.customDesign?.image || item.selectedImage || item.image}
                    alt={item.name}
                    className="w-32 h-20 object-cover rounded-xl shadow-sm border border-slate-100"
                  />
                  <div className="flex-1 text-center sm:text-right">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <h3 className="font-bold text-lg text-slate-900">
                        {item.rawName?.[language] || item.rawName?.ar || item.name}
                      </h3>
                      {item.customDesign && (
                        <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          {language === "ar" ? "تصميم مخصص" : "Custom Card"}
                        </span>
                      )}
                    </div>
                    {item.color && (
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 my-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{
                            backgroundColor:
                              (typeof item.color === "object"
                                ? item.color.colorCode
                                : item.color) || "#000",
                          }}
                        />
                        <span className="text-xs font-bold text-slate-600">
                          {typeof item.color === "object"
                            ? typeof item.color.name === "object"
                              ? item.color.name[language] ||
                                item.color.name.ar ||
                                item.color.name.en
                              : item.color.name || item.color.colorCode
                            : String(item.color)}
                        </span>
                      </div>
                    )}
                    {item.customDesign && (
                      <p className="text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700">{item.customDesign.name}</span>
                        {item.customDesign.jobTitle ? ` - ${item.customDesign.jobTitle}` : ""}
                      </p>
                    )}
                    <p className="text-indigo-600 font-bold">
                      {formatMoney(item.price)}
                    </p>
                  </div>
                    <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-full px-4 py-2 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleDecrement(item)}
                        className="text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold w-4 text-center text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.cartItemId || item.id, item.quantity + 1)
                        }
                        className="text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const name = item.rawName?.[language] || item.rawName?.ar || item.name;
                        handleRemoveItem(item.cartItemId || item.id, name);
                      }}
                      className="text-rose-500 hover:bg-rose-50 p-2 rounded-full transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                      title={language === "ar" ? "حذف من السلة" : "Remove"}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm h-fit sticky top-28">
              <h2 className="text-2xl font-bold mb-6 text-slate-900">
                {t("store.orderSummary")}
              </h2>
              <div className="space-y-4 mb-6 text-slate-600 border-b border-slate-100 pb-6">
                <div className="flex justify-between">
                  <span>{t("store.subtotal")}:</span>
                  <span className="font-medium text-slate-900">
                    {formatMoney(totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("store.shipping")}:</span>
                  <span className="font-medium text-indigo-600">
                    {t("store.calculatedAtCheckout") || "يحدد لاحقاً"}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-2xl font-bold text-slate-900 mb-8">
                <span>{t("store.total")}:</span>
                <span className="text-indigo-600">
                  {formatMoney(totalPrice)}
                </span>
              </div>
              <button
                onClick={handleProceedToCheckout}
                disabled={Boolean(pendingPayment)}
                className={`w-full py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                  pendingPayment
                    ? "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    : "bg-slate-900 hover:bg-indigo-600 text-white hover:shadow-lg active:scale-95"
                }`}
              >
                {t("store.proceedToCheckout")}{" "}
                <CreditCard className="w-5 h-5" />
              </button>
              {pendingPayment && (
                <p className="text-xs text-rose-500 dark:text-rose-400 text-center font-bold mt-2">
                  {isArabic
                    ? "يجب إكمال أو إلغاء الدفع السابق أعلاه أولاً"
                    : "Complete or cancel the pending payment above first"}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
      <MainFooter />
    </div>
  );
}
