import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  CreditCard,
  Truck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../../context/CartContext.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";
import {
  formatMoney,
  getShippingRates,
  createOrder,
  validateCoupon,
} from "../../../pages/store/storeApi.js";
import { saveProfile } from "../../services/authApi.js";
import ErrorNotice from "../../../components/ErrorNotice.jsx";
import { getLocalizedErrorMessage } from "../../../utils/errorHandling.js";
import { toast } from "../../../util/toast";
import api from "../../../api/index.js";


export default function PanelCheckout({ t, onBack, onGoToStore }) {
  const navigate = useNavigate();
  const { cart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const [shippingRates, setShippingRates] = useState([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [codEnabled, setCodEnabled] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const isArabic = t("home") === "الرئيسية";

  useEffect(() => {
    let mounted = true;

    const loadAllCheckoutData = async () => {
      try {
        const [methodsRes, ratesRes] = await Promise.all([
          api.payment.getMethods().catch(() => ({})),
          getShippingRates().catch(() => []),
        ]);

        if (!mounted) return;

        // 1. Process payment methods & COD availability
        const isEnabled =
          methodsRes?.cod_enabled !== undefined
            ? Boolean(methodsRes.cod_enabled)
            : Boolean(methodsRes?.globalSettings?.cod_enabled);
        setCodEnabled(isEnabled);
        if (!isEnabled && paymentMethod === "cash_on_delivery") {
          setPaymentMethod("online");
        }

        // 2. Process shipping rates & pre-select user governorate
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
  }, [user]);

  useEffect(() => {
    if (user && !pageLoading) {
      if (user.phone && !phone) setPhone(user.phone);
      if (user.address && !address) setAddress(user.address);
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
        setCouponError(isArabic ? "الكوبون غير صالح" : "Invalid coupon");
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponStatus("invalid");
      setCouponError(getLocalizedErrorMessage(err, isArabic ? "ar" : "en"));
      setAppliedCoupon(null);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!user?.phone) {
      toast.error(isArabic ? "يجب إضافة رقم هاتف لحسابك من صفحة الملف الشخصي أولاً." : "Please add a phone number to your profile first.");
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData(e.target);
    const firstName = formData.get("firstName") || "";
    const lastName = formData.get("lastName") || "";
    const email = formData.get("email") || user?.email || "";

    const selectedRate = shippingRates.find(
      (r) => r._id === selectedGovernorate,
    );
    const cityName = selectedRate
      ? isArabic
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

      if (effectivePaymentMethod === "cash_on_delivery" && !codEnabled) {
        toast.error(
          isArabic
            ? "خيار الدفع عند الاستلام غير متاح حالياً."
            : "Cash on delivery is currently unavailable."
        );
        setIsSubmitting(false);
        return;
      }

      if (result?.orderId) {
        try {
          localStorage.removeItem("thenith_custom_card_studio_state_v2");
        } catch (e) {}
        if (effectivePaymentMethod === "cash_on_delivery" || effectivePaymentMethod === "free" || result?.isFree) {
          clearCart();
          setIsSuccess(true);
          window.dispatchEvent(new CustomEvent("dashboard-action", {
            detail: {
              type: "order_created",
              title: isArabic ? "تم تسجيل طلبك بنجاح" : "Order placed successfully",
            },
          }));
        } else {
          navigate(`/payment?type=order&orderId=${result.orderId}&method=card`);
        }
      }
    } catch (err) {
      toast.error(getLocalizedErrorMessage(err, isArabic ? "ar" : "en"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white py-20 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CheckCircle2 className="mb-6 h-16 w-16 text-emerald-500" />
        <h2 className="mb-3 text-2xl font-black text-slate-900 dark:text-white">
          {isArabic ? "تم استلام طلبك" : "Order received"}
        </h2>
        <p className="mb-8 max-w-md px-6 text-sm text-slate-500 dark:text-slate-400">
          {isArabic
            ? "سيتم الدفع عند استلام الطلب. سنتواصل معك لتأكيد التفاصيل."
            : "Payment is due on delivery. We will contact you to confirm the details."}
        </p>
        <button
          type="button"
          onClick={() => {
            if (onGoToStore) {
              onGoToStore();
            } else if (onBack) {
              onBack();
            } else {
              navigate("/u/products");
            }
          }}
          className="rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition-colors hover:bg-indigo-600 dark:bg-slate-800 cursor-pointer"
        >
          {isArabic ? "العودة للمتجر" : "Back to store"}
        </button>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20 sm:py-28 flex flex-col items-center justify-center text-center">
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

  if (cart.length === 0 && !isSuccess) {
    return (
      <div className="max-w-5xl mx-auto py-16 sm:py-20 text-center bg-white dark:bg-slate-950 rounded-2xl sm:rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <p className="text-slate-600 dark:text-slate-400 font-bold mb-4">
          {isArabic ? "سلة المشتريات فارغة حالياً." : "Your shopping cart is currently empty."}
        </p>
        <button
          type="button"
          onClick={() => {
            if (onGoToStore) {
              onGoToStore();
            } else if (onBack) {
              onBack();
            } else {
              navigate("/u/products");
            }
          }}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer"
        >
          {isArabic ? "تصفح المتجر" : "Browse store"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 font-bold"
      >
        <ArrowRight className={`w-5 h-5 ${!isArabic && "rotate-180"}`} />
        {isArabic ? "عودة للسلة" : "Back to Cart"}
      </button>

      <form
        key={user?._id || "guest"}
        onSubmit={handleCheckout}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-slate-950 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-5 sm:mb-6">
              {isArabic ? "تفاصيل الشحن" : "Shipping Details"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-4">
              <div>
                <label className="block text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isArabic ? "الاسم الأول" : "First Name"}
                </label>
                <input
                  required
                  type="text"
                  name="firstName"
                  defaultValue={user?.name?.split(" ")[0] || ""}
                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isArabic ? "الاسم الأخير" : "Last Name"}
                </label>
                <input
                  required
                  type="text"
                  name="lastName"
                  defaultValue={user?.name?.split(" ").slice(1).join(" ") || ""}
                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 mb-4">
              <div>
                <label className="block text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isArabic ? "البريد الإلكتروني" : "Email"}
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={user?.email || ""}
                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isArabic ? "رقم الهاتف" : "Phone Number"}
                </label>
                <input
                  required
                  type="text"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-left transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 mb-4">
              <div>
                <label className="block text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isArabic ? "الدولة" : "Country"}
                </label>
                <select
                  disabled
                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 opacity-80 cursor-not-allowed"
                >
                  <option value="EG">{isArabic ? "مصر" : "Egypt"}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isArabic ? "المحافظة / المدينة" : "Governorate"}
                </label>
                <select
                  required
                  value={selectedGovernorate}
                  onChange={handleGovernorateChange}
                  className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  <option value="" disabled>
                    {isArabic ? "اختر المحافظة" : "Select Governorate"}
                  </option>
                  {shippingRates.map((rate) => (
                    <option key={rate._id} value={rate._id}>
                      {isArabic ? rate.governorateAr : rate.governorate}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isArabic ? "العنوان بالتفصيل" : "Full Address"}
              </label>
              <textarea
                required
                name="address"
                rows="3"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="block text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isArabic ? "طريقة الدفع" : "Payment Method"}
              </label>
              {finalTotal <= 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="block font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                      {isArabic ? "هذا الطلب مجاني بالكامل (0 ج.م)" : "This order is 100% Free (0 EGP)"}
                    </span>
                    <span className="block text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {isArabic ? "لا يتطلب اختيار وسيلة دفع، سيتم تأكيد طلبك وشحنه فوراً." : "No payment gateway required, your order will be confirmed immediately."}
                    </span>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-colors ${paymentMethod === "online" ? "border-indigo-600 bg-indigo-50/50 shadow-sm dark:bg-indigo-900/30" : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"}`}
                >
                  <span className="flex items-center gap-3 font-bold text-slate-900 dark:text-white">
                    <input
                      type="radio"
                      name="checkoutPaymentMethod"
                      value="online"
                      checked={paymentMethod === "online"}
                      onChange={() => setPaymentMethod("online")}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <CreditCard className="h-5 w-5 text-indigo-500" />
                    {isArabic ? "دفع أونلاين" : "Online Payment"}
                  </span>
                  <span className="mt-2 block text-sm text-slate-500 dark:text-slate-400">
                    {isArabic
                      ? "يتحول الطلب لطلب مؤكد بعد إتمام الدفع."
                      : "The order is confirmed after full payment."}
                  </span>
                </label>
                {codEnabled && (
                  <label
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-colors ${paymentMethod === "cash_on_delivery" ? "border-indigo-600 bg-indigo-50/50 shadow-sm dark:bg-indigo-900/30" : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"}`}
                  >
                    <span className="flex items-center gap-3 font-bold text-slate-900 dark:text-white">
                      <input
                        type="radio"
                        name="checkoutPaymentMethod"
                        value="cash_on_delivery"
                        checked={paymentMethod === "cash_on_delivery"}
                        onChange={() => setPaymentMethod("cash_on_delivery")}
                        className="h-4 w-4 accent-indigo-600"
                      />
                      <Truck className="h-5 w-5 text-indigo-500" />
                      {isArabic ? "دفع عند الاستلام" : "Cash on delivery"}
                    </span>
                    <span className="mt-2 block text-sm text-slate-500 dark:text-slate-400">
                      {isArabic
                        ? "يُحفظ الطلب بحالة غير مدفوعة لحين استلامه."
                        : "The order is saved as unpaid until delivery."}
                    </span>
                  </label>
                )}
              </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl sm:rounded-[32px] p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-5 sm:mb-6">
              {isArabic ? "ملخص الطلب" : "Order Summary"}
            </h2>

            {/* Coupon Code */}
            <div className="mb-6">
              <label className="block text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isArabic ? "كوبون الخصم" : "Discount Coupon"}
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
                  placeholder={
                    isArabic ? "أدخل كود الكوبون" : "Enter coupon code"
                  }
                  disabled={!!appliedCoupon}
                  className={`flex-1 w-full min-h-[44px] bg-slate-50 dark:bg-slate-900 border rounded-xl px-3.5 sm:px-4 py-2.5 text-base sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                    couponStatus === "valid"
                      ? "border-emerald-400 focus:ring-emerald-500/20"
                      : couponStatus === "invalid"
                        ? "border-rose-400 focus:ring-rose-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20"
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
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-sm font-bold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20 transition-colors whitespace-nowrap"
                  >
                    {isArabic ? "إزالة" : "Remove"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponStatus === "checking" || !couponCode.trim()}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-sm font-bold rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-indigo-600 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {couponStatus === "checking"
                      ? "..."
                      : isArabic
                        ? "تطبيق"
                        : "Apply"}
                  </button>
                )}
              </div>
              {couponStatus === "valid" && appliedCoupon && (
                <p className="text-xs text-emerald-500 font-bold mt-1.5">
                  ✓{" "}
                  {isArabic
                    ? `تم تطبيق الكوبون! خصم ${appliedCoupon.type === "percentage" ? `${appliedCoupon.value}%` : formatMoney(appliedCoupon.value)}`
                    : `Coupon applied! Discount: ${appliedCoupon.type === "percentage" ? `${appliedCoupon.value}%` : formatMoney(appliedCoupon.value)}`}
                </p>
              )}
              {couponStatus === "invalid" && (
                <ErrorNotice
                  error={couponError || t("panel.errors.invalidCoupon")}
                  language={isArabic ? "ar" : "en"}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-4 mb-6 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex justify-between">
                <span>{isArabic ? "المجموع الفرعي" : "Subtotal"}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatMoney(totalPrice)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-emerald-500">
                    {isArabic
                      ? `خصم (${appliedCoupon?.code})`
                      : `Discount (${appliedCoupon?.code})`}
                  </span>
                  <span className="font-bold text-emerald-500">
                    - {formatMoney(discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{isArabic ? "الشحن" : "Shipping"}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {shippingCost === 0 && !selectedGovernorate
                    ? isArabic
                      ? "حدد المحافظة"
                      : "Select Gov"
                    : formatMoney(shippingCost)}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-xl font-black text-slate-900 dark:text-white mb-8">
              <span>{isArabic ? "الإجمالي" : "Total"}</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {formatMoney(finalTotal)}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || cart.length === 0}
              className="w-full min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-base shadow-lg shadow-indigo-600/20 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : finalTotal <= 0 ? (
                isArabic ? "تأكيد الطلب مجاناً" : "Confirm Free Order"
              ) : isArabic ? (
                paymentMethod === "cash_on_delivery" ? (
                  "تأكيد الطلب"
                ) : (
                  "متابعة الدفع"
                )
              ) : paymentMethod === "cash_on_delivery" ? (
                "Place order"
              ) : (
                "Continue to Payment"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
