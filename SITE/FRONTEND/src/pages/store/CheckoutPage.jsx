import { useGlobalLanguage } from "../../context/GlobalLanguageContext.jsx";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle, CreditCard, Truck, Phone, Building2, AlertCircle, X, ArrowLeft, Loader2 } from "lucide-react";
import { useCart } from "../../context/CartContext";
import GlobalLogo from "../../components/GlobalLogo.jsx";
import {
  getShippingRates,
  createOrder,
  formatMoney,
  validateCoupon,
} from "./storeApi.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { saveProfile } from "../../panel/services/authApi.js";
import ErrorNotice from "../../components/ErrorNotice.jsx";
import { getLocalizedErrorMessage } from "../../utils/errorHandling.js";
import { toast } from "../../util/toast";
import api from "../../api/index.js";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "./phone-input-overrides.css";

export default function CheckoutPage() {
  const { t, language } = useGlobalLanguage();
  const { cart, totalPrice, clearCart } = useCart();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();
  const [shippingRates, setShippingRates] = useState([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [phone, setPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [codEnabled, setCodEnabled] = useState(true);
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [walletNumber, setWalletNumber] = useState("");
  const [pendingPayment, setPendingPayment] = useState(null);
  const [cancellingPending, setCancellingPending] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [cardPayment, setCardPayment] = useState(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const cardIframeRef = React.useRef(null);

  const isCardMethod = (m) => {
    if (!m) return false;
    if (m.payment_method_id === 2) return true;
    const name = `${m.name_en || ""} ${m.name_ar || ""}`.toLowerCase();
    return (
      name.includes("card") ||
      name.includes("visa") ||
      name.includes("mastercard") ||
      name.includes("بطاق") ||
      name.includes("فيزا")
    );
  };

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
    } catch (err) {}
  };

  const handleCancelPending = async () => {
    if (!pendingPayment?.intentKey) return;
    const confirmCancel = window.confirm(
      isArabic
        ? "هل أنت متأكد من إلغاء عملية الدفع السابقة غير المكتملة؟"
        : "Are you sure you want to cancel the previous incomplete payment?"
    );
    if (!confirmCancel) return;

    setCancellingPending(true);
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
      setCancellingPending(false);
    }
  };

  const isWalletMethod = (m) => m?.payment_method_id === 4 || m?.name_en?.toLowerCase().includes("wallet");
  const isWalletValid = /^01[0125][0-9]{8}$/.test(walletNumber);

  const [isSuccess, setIsSuccess] = useState(false);
  const isArabic = language === "ar";
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigate("/login?returnTo=/checkout");
    }
  }, [isAuthenticated, isInitializing, navigate]);

  // Load all initial data (methods, shipping rates, pending payment, user prefill)
  React.useEffect(() => {
    let mounted = true;

    const loadAllCheckoutData = async () => {
      try {
        const [methodsRes, ratesRes] = await Promise.all([
          api.payment.getMethods().catch(() => ({ methods: [] })),
          getShippingRates().catch(() => []),
        ]);

        if (!mounted) return;

        if (methodsRes?.methods && methodsRes.methods.length > 0) {
          setMethods(methodsRes.methods);
          const wallet = methodsRes.methods.find(
            (m) => m.payment_method_id === 4 || m.name_en?.toLowerCase().includes("wallet")
          );
          setSelectedMethod(wallet || methodsRes.methods[0]);
        }

        if (typeof methodsRes?.cod_enabled === "boolean") {
          setCodEnabled(methodsRes.cod_enabled);
          if (!methodsRes.cod_enabled) {
            setPaymentMethod("online");
          }
        }

        const rates = Array.isArray(ratesRes) ? ratesRes : [];
        setShippingRates(rates);

        if (user) {
          if (user.phone) setPhone((prev) => prev || user.phone);
          if (user.address) setAddress((prev) => prev || user.address);
          if (user.city && rates.length > 0) {
            const matchedRate = rates.find(
              (r) => r.governorate === user.city || r.governorateAr === user.city
            );
            if (matchedRate) {
              setSelectedGovernorate(matchedRate._id);
              setShippingCost(matchedRate.cost);
            }
          }
        }

        if (isAuthenticated) {
          await fetchPending().catch(() => {});
        }
      } catch (err) {
        console.error("Error loading checkout data:", err);
      } finally {
        if (mounted) {
          setPageLoading(false);
        }
      }
    };

    loadAllCheckoutData();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user]);

  React.useEffect(() => {
    if (user && !pageLoading) {
      if (!phone && user.phone) setPhone(user.phone);
      if (!address && user.address) setAddress(user.address);
    }
  }, [user, pageLoading]);

  const handleGovernorateChange = (e) => {
    const govId = e.target.value;
    setSelectedGovernorate(govId);
    const rate = shippingRates.find((r) => r._id === govId);
    setShippingCost(rate ? rate.cost : 0);
  };

  const discount = appliedCoupon
    ? appliedCoupon.type === "percentage"
      ? Math.round((totalPrice * appliedCoupon.value) / 100)
      : Math.min(appliedCoupon.value, totalPrice)
    : 0;
  const finalTotal = totalPrice + shippingCost - discount;

  // Polling removed: Frontend does not poll. It relies entirely on Fawaterak's redirect/webhook flow.

  // Auto-scroll when card payment iframe appears
  useEffect(() => {
    if (cardPayment) {
      setIframeLoading(true);
      const timer = setTimeout(() => {
        cardIframeRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [cardPayment]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponStatus("checking");
    setCouponError("");
    try {
      const result = await validateCoupon(couponCode.trim(), "store");
      if (result.valid) {
        setAppliedCoupon({
          code: result.code,
          type: result.type,
          value: result.value,
        });
        setCouponStatus("valid");
      } else {
        setCouponStatus("invalid");
        setCouponError("الكوبون غير صالح");
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponStatus("invalid");
      setCouponError(getLocalizedErrorMessage(err, language));
      setAppliedCoupon(null);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (pendingPayment) {
      toast.error(
        isArabic
          ? "لديك عملية دفع قيد الانتظار (فوري / محفظة إلكترونية). يجب إكمال الدفع أو إلغاء العملية السابقة أولاً."
          : "You have a pending payment. Please complete or cancel it before placing a new order."
      );
      return;
    }
    setLoading(true);

    const formData = new FormData(e.target);
    const firstName = formData.get("firstName") || "";
    const lastName = formData.get("lastName") || "";
    const email = formData.get("email") || "";

    const selectedRate = shippingRates.find(
      (r) => r._id === selectedGovernorate,
    );
    const cityName = selectedRate
      ? t("home") === "الرئيسية"
        ? selectedRate.governorateAr
        : selectedRate.governorate
      : "";

    try {
      const effectivePaymentMethod = finalTotal <= 0 ? "free" : paymentMethod;
      const result = await createOrder({
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          selectedImage: item.selectedImage || item.image || "",
          selectedImageId: item.selectedImageId || "",
          image: item.selectedImage || item.image || "",
          color: item.color || null,
          customDesign: item.customDesign || null,
          cartItemId: item.cartItemId || item.id,
        })),
        customer: {
          name: `${firstName} ${lastName}`.trim(),
          phone,
          email,
          address,
          city: cityName,
        },
        paymentMethod: effectivePaymentMethod,
        couponCode: appliedCoupon?.code || null,
      });

      if (result?.orderId) {
        try {
          localStorage.removeItem("thenith_custom_card_studio_state_v2");
        } catch (e) {}
        if (effectivePaymentMethod === "cash_on_delivery" || effectivePaymentMethod === "free" || result?.isFree) {
          clearCart();
          setIsSuccess(true);
          return;
        } else {
          const methodParam = selectedMethod
            ? `&method=${selectedMethod.id || (selectedMethod.payment_method_id === 2 ? "card" : selectedMethod.payment_method_id === 4 ? "wallet" : "fawry")}`
            : "";

          if (selectedMethod) {
            try {
              const txData = await api.payment.createOrderIntent(result.orderId, {
                methodId: selectedMethod.payment_method_id,
                walletNumber: walletNumber || null,
              });

              const redirectUrl =
                txData.checkoutUrl ||
                txData.paymentData?.redirectTo ||
                txData.paymentData?.paymentUrl;

              if (redirectUrl) {
                if (isCardMethod(selectedMethod)) {
                  setCardPayment({
                    orderId: result.orderId,
                    orderNumber: result.orderNumber,
                    intentKey: txData.intentKey,
                    iframeUrl: redirectUrl,
                  });
                  return;
                }
                window.location.href = redirectUrl;
                return;
              }

              // Fawry / Wallet: navigate to PaymentPage WITHOUT intentKey in the URL.
              // A stale intentKey from a cancelled/expired tx causes the backend to
              // return HTTP 410. PaymentPage finds the active pending tx via orderId.
              navigate(`/payment?type=order&orderId=${result.orderId}${methodParam}`);
              return;
            } catch (err) {
              toast.error(getLocalizedErrorMessage(err, isArabic ? "ar" : "en"));
              return;
            }
          }

          navigate(`/payment?type=order&orderId=${result.orderId}${methodParam}`);
        }
      }
    } catch (err) {
      toast.error(getLocalizedErrorMessage(err, language));
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center mb-4 shadow-inner">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">
          {isArabic ? "جاري تجهيز صفحة الدفع..." : "Preparing checkout..."}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          {isArabic
            ? "يتم تحميل طرق الدفع وأسعار الشحن وتفاصيل طلبك..."
            : "Loading payment methods, shipping rates and order details..."}
        </p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-center text-slate-900 flex flex-col items-center justify-center">
        <CheckCircle className="mb-6 h-20 w-20 text-emerald-500" />
        <h1 className="mb-4 text-3xl font-black">
          {isArabic ? "تم استلام وسداد طلبك بنجاح" : "Order received & paid successfully"}
        </h1>
        <p className="mb-8 max-w-md text-slate-500">
          {paymentMethod === "cash_on_delivery"
            ? (isArabic
                ? "سيتم الدفع عند استلام الطلب. سنتواصل معك لتأكيد التفاصيل."
                : "Payment is due on delivery. We will contact you to confirm the details.")
            : (isArabic
                ? "تم سداد قيمة طلبك بنجاح وجاري تجهيزه للشحن فوراً!"
                : "Your payment was processed successfully! Your order is being prepared for shipping.")}
        </p>
        <Link
          to={isAuthenticated ? "/u/products" : "/products"}
          className="rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition-colors hover:bg-indigo-600"
        >
          {t("store.backToStore") || (isArabic ? "العودة للمتجر" : "Back to Store")}
        </Link>
      </div>
    );
  }

  if (!cardPayment && (!cart || cart.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">
          {t("store.cartEmptyTitle") || "سلة المشتريات فارغة"}
        </h1>
        <p className="text-slate-500 mb-8 max-w-md">
          {t("store.cartEmptyDesc") || "لم تقم بإضافة أي منتجات للسلة بعد."}
        </p>
        <Link
          to="/products"
          className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-600 transition-colors shadow-md hover:shadow-lg"
        >
          {t("store.backToStore") || "تصفح المنتجات"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/30">
      <main className="max-w-[1200px] mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold mb-8 text-slate-900">
          {t("store.completeOrder")}
        </h1>

        {/* Pending Payment Blocking Banner */}
        {pendingPayment && (
          <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 dark:text-amber-100 shadow-sm" dir={isArabic ? "rtl" : "ltr"}>
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
                  disabled={cancellingPending}
                  className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>{cancellingPending ? (isArabic ? "جاري الإلغاء..." : "Cancelling...") : (isArabic ? "إلغاء العملية السابقة" : "Cancel Pending")}</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {cardPayment ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {isArabic ? "بوابة الدفع البنكي المشفرة (Visa / Mastercard / Meeza)" : "Secure Bank Checkout"}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {isArabic
                      ? `تم إنشاء طلبك بنجاح (${cardPayment.orderNumber || cardPayment.orderId}). يرجى إدخال بيانات البطاقة لإتمام السداد مباشرة في نفس الصفحة:`
                      : `Order created. Please enter card details below to complete payment:`}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (cardPayment.intentKey) {
                        api.payment.cancel(cardPayment.intentKey).catch(() => {});
                      }
                      setCardPayment(null);
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{isArabic ? "إلغاء" : "Cancel"}</span>
                  </button>
                </div>
              </div>

              <div
                ref={cardIframeRef}
                className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner relative"
                style={{ height: "820px", minHeight: "780px" }}
              >
                {iframeLoading && (
                  <div className="absolute inset-0 z-10 bg-white/95 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-xs font-bold text-slate-600">
                      {isArabic ? "جاري تحميل بوابة الدفع البنكي الآمنة..." : "Loading secure payment portal..."}
                    </p>
                  </div>
                )}
                <iframe
                  src={cardPayment.iframeUrl}
                  onLoad={() => setIframeLoading(false)}
                  className="w-full h-full border-0"
                  allow="payment"
                  allowFullScreen
                  title="Secure Payment Portal"
                />
              </div>
            </div>
          ) : (
            <form
              key={user?._id || "guest"}
              onSubmit={handleCheckout}
              className="space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
            >
            {/* Shipping Details */}
            <h2 className="text-xl font-bold mb-4 border-b border-slate-100 pb-4 text-slate-900">
              {t("store.shippingDetails")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-2 font-medium">
                  {t("store.firstName")}
                </label>
                <input
                  required
                  type="text"
                  name="firstName"
                  defaultValue={user?.name?.split(" ")[0] || ""}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-2 font-medium">
                  {t("store.lastName") || "الاسم الأخير"}
                </label>
                <input
                  required
                  type="text"
                  name="lastName"
                  defaultValue={user?.name?.split(" ").slice(1).join(" ") || ""}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-2 font-medium">
                  {t("store.emailAddress") || "البريد الإلكتروني"}
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={user?.email || ""}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-right"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-2 font-medium">
                  رقم التليفون
                </label>
                <div
                  dir="ltr"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-1 text-slate-900 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-colors"
                >
                  <PhoneInput
                    international
                    defaultCountry="EG"
                    value={phone}
                    onChange={setPhone}
                    className="w-full h-10 outline-none"
                    placeholder="رقم التليفون"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-2 font-medium">
                  الدولة
                </label>
                <select
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors opacity-80 cursor-not-allowed"
                >
                  <option value="EG">مصر (Egypt)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-2 font-medium">
                  {t("store.governorate") || "المحافظة"}
                </label>
                <select
                  required
                  value={selectedGovernorate}
                  onChange={handleGovernorateChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                >
                  <option value="" disabled>
                    {t("store.selectGovernorate") || "اختر المحافظة"}
                  </option>
                  {shippingRates.map((rate) => (
                    <option key={rate._id} value={rate._id}>
                      {t("home") === "الرئيسية"
                        ? rate.governorateAr
                        : rate.governorate}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-2 font-medium">
                {t("store.fullAddress") || "العنوان بالتفصيل"}
              </label>
              <textarea
                required
                name="address"
                rows="3"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("store.fullAddress") || "العنوان بالتفصيل"}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              ></textarea>
            </div>

            {/* Payment Methods */}
            <h2 className="text-xl font-bold mb-4 border-b border-slate-100 pb-4 pt-4 text-slate-900">
              {t("store.paymentMethod") || "طريقة الدفع"}
            </h2>
            {finalTotal <= 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="block font-bold text-emerald-900 text-sm">
                    {isArabic ? "هذا الطلب مجاني بالكامل (0 ج.م)" : "This order is 100% Free (0 EGP)"}
                  </span>
                  <span className="block text-xs text-emerald-700 mt-0.5">
                    {isArabic ? "لا يتطلب اختيار وسيلة دفع، سيتم تأكيد طلبك وشحنه فوراً." : "No payment gateway required, your order will be confirmed immediately."}
                  </span>
                </div>
              </div>
            ) : (
            <div className={`grid grid-cols-1 gap-3 ${codEnabled ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
              <label
                className={`cursor-pointer rounded-xl border-2 p-4 transition-colors ${paymentMethod === "online" ? "border-indigo-600 bg-indigo-50/50 shadow-sm" : "border-slate-200 hover:border-indigo-300"}`}
              >
                <span className="flex items-center gap-3 font-bold text-slate-900">
                  <input
                    type="radio"
                    name="checkoutPaymentMethod"
                    value="online"
                    checked={paymentMethod === "online"}
                    onChange={() => setPaymentMethod("online")}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <CreditCard className="h-5 w-5 text-indigo-500" />
                  {t("store.visaOnline") || "دفع أونلاين"}
                </span>
                <span className="mt-2 block text-sm text-slate-500">
                  {t("store.onlinePaymentRequired")}
                </span>
              
                {paymentMethod === "online" && methods.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3 p-4 bg-white rounded-xl border border-slate-100">
                    <p className="text-sm font-bold text-slate-700 mb-2">
                      {isArabic ? "اختر وسيلة الدفع الإلكتروني" : "Select Payment Gateway"}
                    </p>
                    {[...methods].sort((a, b) => {
                      const getWeight = (m) => {
                        if (m.payment_method_id === 4 || m.name_en?.toLowerCase().includes("wallet")) return 1;
                        if (m.payment_method_id === 3 || m.name_en?.toLowerCase().includes("fawry")) return 2;
                        if (m.payment_method_id === 2 || m.name_en?.toLowerCase().includes("card") || m.name_en?.toLowerCase().includes("visa")) return 3;
                        return 4;
                      };
                      return getWeight(a) - getWeight(b);
                    }).map(m => (
                      <label key={m.payment_method_id} className={`cursor-pointer p-3 border rounded-lg flex flex-col ${selectedMethod?.payment_method_id === m.payment_method_id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <input type="radio" name="fawaterak_method" checked={selectedMethod?.payment_method_id === m.payment_method_id} onChange={() => setSelectedMethod(m)} className="h-4 w-4 accent-indigo-600" />
                          <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border shadow-sm">
                            <img src={m.logo} alt={isArabic ? m.name_ar : m.name_en} className="max-w-[24px] max-h-[24px] object-contain" />
                          </div>
                          <span className="font-semibold text-sm">{isArabic ? m.name_ar : m.name_en}</span>
                        </div>
                        {selectedMethod?.payment_method_id === m.payment_method_id && isWalletMethod(m) && (
                          <div className="mt-3 ml-7">
                             <input type="tel" value={walletNumber} onChange={e => setWalletNumber(e.target.value.replace(/\D/g, '').slice(0,11))} placeholder="01XXXXXXXXX" className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${walletNumber.length === 11 ? (isWalletValid ? 'border-emerald-500 ring-emerald-100' : 'border-rose-500 ring-rose-100') : 'border-slate-200 focus:border-indigo-500 ring-indigo-100'}`} />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                )}

              </label>
              {codEnabled && (
                <label
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-colors ${paymentMethod === "cash_on_delivery" ? "border-indigo-600 bg-indigo-50/50 shadow-sm" : "border-slate-200 hover:border-indigo-300"}`}
                >
                  <span className="flex items-center gap-3 font-bold text-slate-900">
                    <input
                      type="radio"
                      name="checkoutPaymentMethod"
                      value="cash_on_delivery"
                      checked={paymentMethod === "cash_on_delivery"}
                      onChange={() => setPaymentMethod("cash_on_delivery")}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <Truck className="h-5 w-5 text-indigo-500" />
                    {t("store.cashOnDelivery")}
                  </span>
                  <span className="mt-2 block text-sm text-slate-500">
                    {t("store.cashOnDeliveryDesc")}
                  </span>
                </label>
              )}
            </div>
            )}

            {pendingPayment && (
              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {isArabic
                    ? "لا يمكن إتمام الطلب لأن لديك عملية دفع سابقة قيد الانتظار. يرجى استكمالها أو إلغاؤها أولاً."
                    : "Cannot place order while you have a pending payment. Please complete or cancel it first."}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || Boolean(pendingPayment) || (finalTotal > 0 && paymentMethod === "online" && (!selectedMethod || (isWalletMethod(selectedMethod) && !isWalletValid)))}
              className="w-full mt-6 bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg text-lg flex justify-center items-center gap-2"
            >
              {loading ? (
                "جاري إتمام الطلب..."
              ) : (
                <>
                  {finalTotal <= 0
                    ? (isArabic ? "تأكيد الطلب مجاناً" : "Confirm Free Order")
                    : paymentMethod === "cash_on_delivery"
                    ? t("store.confirmOrder")
                    : t("store.continueCheckout")}{" "}
                  ({formatMoney(finalTotal)})
                </>
              )}
            </button>
          </form>
          )}

          {/* Cart Summary */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-fit sticky top-28">
            <h2 className="text-xl font-bold mb-6 text-slate-900">
              {t("store.yourProducts")}
            </h2>
            <div className="space-y-4 mb-6">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-slate-600"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-md">
                      {item.quantity}x
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">
                        {item.rawName?.[language] ||
                          item.rawName?.ar ||
                          item.name}
                      </span>
                      {item.color && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block shrink-0"
                            style={{
                              backgroundColor:
                                (typeof item.color === "object"
                                  ? item.color.colorCode
                                  : item.color) || "#000",
                            }}
                          />
                          {typeof item.color === "object"
                            ? typeof item.color.name === "object"
                              ? item.color.name[language] ||
                                item.color.name.ar ||
                                item.color.name.en
                              : item.color.name || item.color.colorCode
                            : String(item.color)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-bold">
                    {formatMoney(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                كوبون الخصم
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponStatus(null);
                    setCouponError("");
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), handleApplyCoupon())
                  }
                  placeholder="أدخل الكوبون هنا"
                  disabled={!!appliedCoupon}
                  className={`flex-1 w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 transition-colors ${
                    couponStatus === "valid"
                      ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500"
                      : couponStatus === "invalid"
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                  }`}
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode("");
                      setCouponStatus(null);
                      setCouponError("");
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 text-sm font-bold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                  >
                    إزالة
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponStatus === "checking" || !couponCode.trim()}
                    className="w-full sm:w-auto px-4 py-2.5 text-sm font-bold rounded-xl bg-slate-900 text-white hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {couponStatus === "checking" ? "..." : "تطبيق"}
                  </button>
                )}
              </div>
              {couponStatus === "valid" && appliedCoupon && (
                <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                  ✓ تم تطبيق الكوبون! خصم{" "}
                  {appliedCoupon.type === "percentage"
                    ? `${appliedCoupon.value}%`
                    : formatMoney(appliedCoupon.value)}
                </p>
              )}
              {couponStatus === "invalid" && (
                <ErrorNotice
                  error={couponError || t("panel.errors.invalidCoupon")}
                  language={language}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-6 pb-6 text-slate-600">
              <div className="flex justify-between items-center">
                <span>{t("store.subtotal") || "المجموع الفرعي"}:</span>
                <span className="font-medium text-slate-900">
                  {formatMoney(totalPrice)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-emerald-600">
                    خصم الكوبون ({appliedCoupon?.code}):
                  </span>
                  <span className="font-bold text-emerald-600">
                    - {formatMoney(discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>{t("store.shipping") || "الشحن"}:</span>
                <span className="font-medium text-indigo-600">
                  {selectedGovernorate
                    ? formatMoney(shippingCost)
                    : t("store.calculatedAtCheckout") || "يحدد لاحقاً"}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-between text-2xl font-bold text-slate-900">
              <span>{t("store.grandTotal") || "الإجمالي"}:</span>
              <span className="text-indigo-600">{formatMoney(finalTotal)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
