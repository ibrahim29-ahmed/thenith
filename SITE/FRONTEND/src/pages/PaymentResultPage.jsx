/**
 * PaymentResultPage.jsx
 *
 * Handles the three Fawaterak redirect callbacks:
 *   /payment/success?type=subscription|order&id=...
 *   /payment/fail
 *   /payment/pending
 *
 * On success: calls /api/payment/verify with the intentKey from the subscription/order record.
 */

import React, { useEffect, useState } from "react";
import {
  useSearchParams,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowRight,
  Home,
  RefreshCw,
  Smartphone,
  Receipt,
} from "lucide-react";
import api from "../api/index.js";
import GlobalLogo from "../components/GlobalLogo.jsx";
import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import { getLocalizedErrorMessage } from "../utils/errorHandling.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function PaymentResultPage() {
  const { language } = useGlobalLanguage();
  const { clearCart } = useCart();
  const { refreshSession } = useAuth();
  const isArabic = language === "ar" || !language;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const type = searchParams.get("type"); // "subscription" | "order"
  const id = searchParams.get("id"); // subscription or order MongoDB ID
  const invoiceIdParam =
    searchParams.get("invoice_id") ||
    searchParams.get("invoiceId") ||
    "";
  const intentKeyParam =
    searchParams.get("intentKey") ||
    searchParams.get("tokenScreen") ||
    searchParams.get("cardTokenScreen") ||
    searchParams.get("invoice_key") ||
    searchParams.get("intent_key") ||
    invoiceIdParam ||
    "";
  const errorMessageParam =
    searchParams.get("errorMessage") ||
    searchParams.get("error_message") ||
    searchParams.get("error") ||
    "";

  // Determine result from path
  const path = location.pathname;
  const isSuccessRoute = path.includes("/success") && !errorMessageParam;
  const isFail = path.includes("/fail") || Boolean(errorMessageParam);

  const [verifying, setVerifying] = useState(isSuccessRoute);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [verifyError, setVerifyError] = useState(() =>
    errorMessageParam ? getLocalizedErrorMessage(errorMessageParam, language) : ""
  );
  const [orderNumber, setOrderNumber] = useState("");
  const [transactionData, setTransactionData] = useState(null);
  const [paymentTypeState, setPaymentTypeState] = useState(type);

  const isSuccess = isSuccessRoute || verified;
  const isPending = path.includes("/pending") && !verified;

  const verifyKey = intentKeyParam || id || "";

  const runVerification = async (isRetry = false) => {
    // If we are inside an iframe (like the Visa 3DS modal), break out immediately!
    if (window !== window.top) {
      window.top.location.href = window.location.href;
      return;
    }

    if (!isRetry) {
      setVerifying(true);
      setVerifyError("");
    }

    try {
      const result = await api.payment.verify(verifyKey, {
        invoice_id: invoiceIdParam || undefined,
        referenceId: id || undefined,
      });

      if (result.success && result.status === "paid") {
        setVerified(true);
        setVerifyError("");
        if (result.type) setPaymentTypeState(result.type);
        if (result.orderNumber) setOrderNumber(result.orderNumber);
        clearCart();

        setTransactionData({
          intentKey: result.intentKey,
          transactionId: result.transactionId || result.intentKey,
          amount: result.amount,
          paymentMethodName: result.paymentMethodName,
        });

        // The backend has confirmed the payment! Refresh session so Pro plan is immediately active in AuthContext!
        try {
          await refreshSession();
        } catch {}
      } else {
        if (result?.status === "expired" || result?.isExpired) {
          setVerifying(false);
          setVerified(false);
          setTransactionData((prev) => ({
            ...(prev || {}),
            status: "expired",
            isExpired: true,
            fawaterakExpireDate: result.fawaterakExpireDate || prev?.fawaterakExpireDate,
            fawaterakCreatedAt: result.fawaterakCreatedAt || prev?.fawaterakCreatedAt,
            paymentData: null,
            fawaterakResponse: null,
          }));
          return;
        }

        if (result && !verified) {
          setTransactionData((prev) => ({
            ...(prev || {}),
            intentKey: result.intentKey || prev?.intentKey || verifyKey,
            amount: result.amount || prev?.amount,
            paymentMethodName: result.lockedMethodName || prev?.paymentMethodName,
            fawaterakCreatedAt: result.fawaterakCreatedAt || prev?.fawaterakCreatedAt,
            fawaterakExpireDate:
              result.fawaterakExpireDate ||
              result.paymentData?.expirationTime ||
              result.paymentData?.expireDate ||
              result.paymentData?.payment_data?.expirationTime ||
              result.paymentData?.payment_data?.expireDate ||
              result.fawaterakResponse?.payment_data?.expirationTime ||
              result.fawaterakResponse?.payment_data?.expireDate ||
              prev?.fawaterakExpireDate,
            fawaterakResponse: result.fawaterakResponse || prev?.fawaterakResponse,
            paymentData: result.paymentData || prev?.paymentData,
          }));
        }
        if (!isRetry && isSuccessRoute) {
          setVerifyError(
            result.message ||
              (isArabic
                ? "لم يتم تأكيد الدفع بعد. جاري المتابعة تلقائياً..."
                : "Payment not confirmed yet. Monitoring automatically..."),
          );
        }
      }
    } catch (err) {
      if (!isRetry && isSuccessRoute) {
        setVerifyError(getLocalizedErrorMessage(err, language));
      }
    } finally {
      if (!isRetry) {
        setVerifying(false);
      }
    }
  };

  const isSessionExpired = (() => {
    if (transactionData?.status === "expired" || transactionData?.isExpired) return true;

    const cTime = new Date(
      transactionData?.fawaterakCreatedAt ||
      transactionData?.fawaterakResponse?.transaction_created_at ||
      transactionData?.fawaterakResponse?.invoice_date ||
      transactionData?.createdAt ||
      Date.now()
    ).getTime();

    const isWallet = Boolean(
      (transactionData?.paymentMethodName &&
        /wallet|محفظ|meeza|كاش/i.test(transactionData.paymentMethodName)) ||
      transactionData?.paymentData?.mobileWalletNumber ||
      transactionData?.paymentData?.meezaQrCode ||
      transactionData?.paymentData?.isoQr
    );

    const expDate =
      transactionData?.fawaterakExpireDate ||
      transactionData?.paymentData?.fawaterakExpireDate ||
      transactionData?.paymentData?.expirationTime ||
      transactionData?.paymentData?.expireDate;

    if (isWallet) {
      const maxWallet = (!isNaN(cTime) ? cTime : Date.now()) + 5 * 60 * 1000;
      return Date.now() > maxWallet;
    }

    if (expDate) {
      const expTime = new Date(expDate).getTime();
      if (!isNaN(expTime)) return Date.now() > expTime;
    }

    return false;
  })();

  const [, setExpiryTick] = useState(0);
  useEffect(() => {
    if (!isPending || isSessionExpired) return;
    const interval = setInterval(() => {
      setExpiryTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPending, isSessionExpired]);

  useEffect(() => {
    if (isFail || verified || isSessionExpired) return;

    // Run verification once on mount
    runVerification(false);
  }, [isFail, verified, verifyKey, isSessionExpired]);

  // Guarantee cart is completely emptied on payment success or verification
  useEffect(() => {
    if (verified && !isSessionExpired) {
      clearCart();
    }
  }, [verified, isSessionExpired]);

  // Handle countdown and navigation
  useEffect(() => {
    if (verified) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        if (paymentTypeState === "order" || paymentTypeState === "store") {
          navigate(isAuthenticated ? "/u/products" : "/products", { replace: true });
        } else {
          navigate("/u", { replace: true });
        }
      }
    }
  }, [verified, countdown, navigate, paymentTypeState]);

  // Prevent reload while redirecting
  useEffect(() => {
    if (!verified) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [verified]);

  useEffect(() => {
    if (!isPending || !id) return;
    let mounted = true;
    api.payment
      .getPending()
      .then((data) => {
        if (!mounted || !data.success) return;
        const list = type === "subscription" ? data.subscriptions : data.orders;
        const match = list.find((item) => item._id === id);
        if (match && match.transaction) {
          setTransactionData(match.transaction);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isPending, id, type]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
          {isArabic ? "جاري التحقق من الدفع مع السيرفر..." : "Verifying payment with server..."}
        </p>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (isSuccess && !isSessionExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-6">
        <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
          <GlobalLogo />
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 sm:p-10 max-w-md w-full text-center"
          dir={isArabic ? "rtl" : "ltr"}
        >
          {verified && !verifyError ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50 dark:ring-emerald-900/20">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-amber-50 dark:ring-amber-900/20">
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600 dark:text-amber-400" />
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
            {verified
              ? isArabic
                ? "تم تأكيد الدفع بنجاح "
                : "Payment Confirmed Successfully"
              : isArabic
                ? "جاري تأكيد حالة الدفع"
                : "Confirming Payment Status"}
          </h1>

          {verifyError ? (
            <div className="space-y-4 mb-6">
              <ErrorNotice
                error={verifyError}
                language={language}
                className="text-start"
              />
              <button
                type="button"
                onClick={() => runVerification(true)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isArabic ? "التحقق من حالة الدفع الآن" : "Check Payment Status Now"}</span>
              </button>
              <Link
                to="/u"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white text-xs font-bold transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>{isArabic ? "العودة للوحة التحكم" : "Back to Dashboard"}</span>
              </Link>
            </div>
          ) : verifying ? (
            <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-6">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>{isArabic ? "جاري التحقق من عملية الدفع مع البنك..." : "Verifying payment with the bank..."}</span>
            </div>
          ) : verified ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              {paymentTypeState === "subscription"
                ? isArabic
                  ? "تم تفعيل اشتراكك بنجاح في باقة Pro! استمتع بجميع المميزات المتقدمة."
                  : "Your Pro subscription has been activated successfully!"
                : isArabic
                  ? `تم تأكيد دفع طلبك${orderNumber ? ` #${orderNumber}` : ""} بنجاح.`
                  : `Your order${orderNumber ? ` #${orderNumber}` : ""} has been confirmed!`}
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              {isArabic
                ? "في انتظار تأكيد السداد من جهة الدفع..."
                : "Waiting for payment confirmation from provider..."}
            </p>
          )}

          {verified && transactionData && !verifyError && (
            <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-start space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isArabic ? "المرجع" : "Reference"}
                </span>
                <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
                  {transactionData.transactionId &&
                  !String(transactionData.transactionId).match(/[a-z]/i)
                    ? `#${transactionData.transactionId}`
                    : orderNumber
                      ? `#${orderNumber}`
                      : ""}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isArabic ? "طريقة الدفع" : "Payment Method"}
                </span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {transactionData.paymentMethodName ||
                    (isArabic ? "أونلاين" : "Online")}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isArabic ? "المبلغ المدفوع" : "Amount Paid"}
                </span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {transactionData.amount} EGP
                </span>
              </div>
            </div>
          )}

          {!verifyError && verified && (
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p>
                  {isArabic
                    ? `سيتم توجيهك تلقائياً خلال ${countdown} ثوانٍ...`
                    : `Redirecting you automatically in ${countdown} seconds...`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (paymentTypeState === "order" || paymentTypeState === "store") {
                    navigate(isAuthenticated ? "/u/products" : "/products", { replace: true });
                  } else {
                    navigate("/u", { replace: true });
                  }
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 active:scale-95"
              >
                <span>{isArabic ? "الانتقال إلى لوحة التحكم الآن" : "Go to Dashboard Now"}</span>
                <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Fail ──────────────────────────────────────────────────────────────────────
  if (isFail) {
    const rawError = errorMessageParam || verifyError;
    const localized = getLocalizedErrorMessage(rawError, language);
    const sanitizedError = (
      typeof localized === "string" ? localized : (localized?.message || String(localized || ""))
    )
      .replace(/بوابة\s+الدفع/gi, "الخدمة")
      .replace(/بوابة\s+دفع/gi, "وسيلة دفع")
      .replace(/payment\s+gateway/gi, "payment service")
      .trim();

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-slate-50 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-6">
        <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
          <GlobalLogo />
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 sm:p-10 max-w-md w-full text-center"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-rose-500" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
            {isArabic ? "فشل الدفع" : "Payment Failed"}
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-sm mb-8 leading-relaxed">
            {sanitizedError ||
              (isArabic
                ? "لم يتم إتمام الدفع. يرجى المحاولة مرة أخرى أو اختيار طريقة دفع مختلفة."
                : "Payment was not completed. Please try again or choose a different payment method.")}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer"
            >
              {isArabic ? "حاول مرة أخرى" : "Try Again"}
            </button>
            <Link
              to="/u"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>{isArabic ? "لوحة التحكم" : "Dashboard"}</span>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Pending ───────────────────────────────────────────────────────────────────
  const isCardTx =
    transactionData &&
    (transactionData.paymentMethodId === 2 ||
      /visa|mastercard|card|فيزا|ماستر|بطاقة/i.test(
        transactionData.paymentMethodName || "",
      ));

  if (isPending && isCardTx) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-slate-50 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-6">
        <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
          <GlobalLogo />
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-10 max-w-md w-full text-center"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-rose-500" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
            {isArabic ? "لم يكتمل الدفع بالبطاقة" : "Card Payment Incomplete"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
            {isArabic
              ? "لم يتم إتمام عملية الدفع بالبطاقة البنكية أو تم إلغاؤها. الدفع بالبطاقات البنكية إما أن يكتمل بنجاح أو ينتهي فوراً ولا يدعم وضع الانتظار."
              : "Bank card payment was not completed or was cancelled. Card payments must succeed or terminate immediately and do not remain pending."}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isArabic ? "إعادة المحاولة" : "Try Again"}</span>
            </button>
            <Link
              to="/u"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors"
            >
              {isArabic ? "العودة للوحة التحكم" : "Back to Dashboard"}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-6">
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <GlobalLogo />
      </header>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 sm:p-10 max-w-lg w-full text-center relative overflow-hidden"
        dir={isArabic ? "rtl" : "ltr"}
      >
        {isSessionExpired ? (
          <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-rose-50 dark:ring-rose-950/20">
            <XCircle className="w-12 h-12 text-rose-500" />
          </div>
        ) : (
          <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
          </div>
        )}

        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
          {isSessionExpired
            ? (isArabic ? "انتهت صلاحية وسيلة الدفع" : "Payment Session Expired")
            : (isArabic ? "الدفع قيد المعالجة" : "Payment Pending")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          {isSessionExpired
            ? (isArabic
                ? "انتهت مهلة السداد المحددة لعملية الدفع هذه. تم إغلاق رابط الدفع تلقائياً لأسباب أمنية ولم يعد بالإمكان استخدام بيانات الدفع السابقة."
                : "This payment session has expired. The payment link has been closed and earlier details can no longer be used.")
            : (isArabic
                ? "طلبك تحت المعالجة (فوري / محفظة إلكترونية). سيتم تفعيله تلقائياً عند اكتمال الدفع."
                : "Your payment is being processed (Fawry / Mobile Wallet). It will activate automatically once confirmed.")}
        </p>

        {isSessionExpired ? (
          <div className="bg-rose-50/80 dark:bg-rose-950/30 rounded-2xl p-5 mb-8 text-start border border-rose-200 dark:border-rose-900/50 space-y-3">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
              <Clock className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{isArabic ? "تم إنهاء جلسة الدفع تلقائياً" : "Session Automatically Terminated"}</span>
            </div>
            <p className="text-xs text-rose-700/90 dark:text-rose-300/80 leading-relaxed">
              {isArabic
                ? "انتهت مهلة الدفع المحددة (5 دقائق للمحافظ الإلكترونية أو مهلة السداد لفوري). تم إلغاء كود الـ QR وطلب الدفع لأسباب أمنية لحماية حسابك."
                : "The payment window has elapsed. The QR code and payment prompt were cancelled for your security."}
            </p>
            <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-[11px] text-slate-500 dark:text-slate-400">
              {isArabic
                ? "يرجى عدم محاولة إرسال مبالغ بالبيانات القديمة، وبدء عملية دفع جديدة للحصول على كود سداد جديد."
                : "Please do not send funds using the expired data. Start a new payment to generate a fresh code."}
            </div>
          </div>
        ) : (
          transactionData && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-8 text-start border border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                {isArabic ? "تفاصيل الدفع" : "Payment Details"}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isArabic ? "رقم الفاتورة:" : "Transaction ID:"}
                  </span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded select-all">
                    {transactionData.intentKey}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isArabic ? "تاريخ ووقت الإصدار:" : "Issue Date & Time:"}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {(() => {
                      const dateVal =
                        transactionData.fawaterakCreatedAt ||
                        transactionData.fawaterakResponse?.transaction_created_at ||
                        transactionData.fawaterakResponse?.invoice_date ||
                        transactionData.createdAt;
                      if (!dateVal) return "-";
                      const d = new Date(dateVal);
                      return isNaN(d.getTime())
                        ? String(dateVal)
                        : d.toLocaleString(isArabic ? "ar-EG-u-nu-latn" : "en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          });
                    })()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isArabic ? "المبلغ:" : "Amount:"}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {transactionData.amount} EGP
                  </span>
                </div>
                {transactionData.paymentMethodName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isArabic ? "طريقة الدفع:" : "Method:"}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {transactionData.paymentMethodName}
                    </span>
                  </div>
                )}
                {transactionData.paymentData?.fawryCode ? (
                  <>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 font-bold">
                        {isArabic ? "كود فوري المرجعي:" : "Fawry Reference Code:"}
                      </span>
                      <span className="font-black text-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg select-all font-mono">
                        {transactionData.paymentData.fawryCode}
                      </span>
                    </div>
                    {(transactionData.fawaterakExpireDate ||
                      transactionData.paymentData?.expirationTime ||
                      transactionData.paymentData?.expireDate ||
                      transactionData.paymentData?.payment_data?.expirationTime ||
                      transactionData.paymentData?.payment_data?.expireDate ||
                      transactionData.fawaterakResponse?.payment_data?.expirationTime ||
                      transactionData.fawaterakResponse?.payment_data?.expireDate ||
                      transactionData.fawaterakResponse?.expire_date ||
                      transactionData.fawaterakResponse?.expireDate) && (
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold text-rose-500 dark:text-rose-400">
                          {isArabic ? "وقت انتهاء الفاتورة:" : "Invoice Expiry:"}
                        </span>
                        <span className="font-black text-xs text-rose-600 dark:text-rose-400">
                          {(() => {
                            const dateVal =
                              transactionData.fawaterakExpireDate ||
                              transactionData.paymentData?.expirationTime ||
                              transactionData.paymentData?.expireDate ||
                              transactionData.paymentData?.payment_data?.expirationTime ||
                              transactionData.paymentData?.payment_data?.expireDate ||
                              transactionData.fawaterakResponse?.payment_data?.expirationTime ||
                              transactionData.fawaterakResponse?.payment_data?.expireDate ||
                              transactionData.fawaterakResponse?.expire_date ||
                              transactionData.fawaterakResponse?.expireDate;
                            if (!dateVal) return "-";
                            const d = new Date(dateVal);
                            return isNaN(d.getTime())
                              ? String(dateVal)
                              : d.toLocaleString(isArabic ? "ar-EG-u-nu-latn" : "en-US", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                });
                          })()}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-3 bg-slate-100/90 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2 text-start">
                      <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-indigo-500" />
                        <span>{isArabic ? "تعليمات الدفع عبر فوري:" : "Fawry Payment Instructions:"}</span>
                      </p>
                      <ul className="list-disc list-inside space-y-1.5 text-[11px] leading-relaxed">
                        {isArabic ? (
                          <>
                            <li>توجه لأي منفذ أو ماكينة فوري أو عبر تطبيق MyFawry.</li>
                            <li>اختر خدمة <strong>فوري باي (FawryPay)</strong> بكود الخدمة: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">788</strong>.</li>
                            <li>أدخل <strong>كود الدفع المرجعي</strong> الموضح بالأعلى قبل انتهاء وقت الفاتورة وسدد المبلغ.</li>
                            <li>يتم تأكيد الطلب وتفعيله فوراً وتلقائياً بمجرد إتمام السداد.</li>
                          </>
                        ) : (
                          <>
                            <li>Visit any Fawry terminal or use the MyFawry app.</li>
                            <li>Select <strong>FawryPay</strong> with service code: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">788</strong>.</li>
                            <li>Enter the <strong>Reference Code</strong> above before invoice expiration.</li>
                            <li>Your request activates automatically upon successful payment.</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    {(() => {
                      let dateVal =
                        transactionData.fawaterakExpireDate ||
                        transactionData.paymentData?.expirationTime ||
                        transactionData.paymentData?.expireDate ||
                        transactionData.paymentData?.payment_data?.expirationTime ||
                        transactionData.paymentData?.payment_data?.expireDate;

                      const cTime = new Date(
                        transactionData.fawaterakCreatedAt ||
                        transactionData.createdAt ||
                        Date.now()
                      ).getTime();
                      const eTime = dateVal ? new Date(dateVal).getTime() : 0;
                      if (!dateVal || isNaN(eTime) || (eTime - cTime > 60 * 60 * 1000)) {
                        if (!isNaN(cTime)) {
                          dateVal = new Date(cTime + 5 * 60 * 1000).toISOString();
                        }
                      }

                      if (!dateVal) return null;

                      return (
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-bold text-rose-500 dark:text-rose-400">
                            {isArabic ? "وقت انتهاء الفاتورة:" : "Invoice Expiry:"}
                          </span>
                          <span className="font-black text-xs text-rose-600 dark:text-rose-400">
                            {(() => {
                              const d = new Date(dateVal);
                              return isNaN(d.getTime())
                                ? String(dateVal)
                                : d.toLocaleString(isArabic ? "ar-EG-u-nu-latn" : "en-US", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  });
                            })()}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="text-xs text-indigo-900 dark:text-indigo-200 mt-3 bg-indigo-50/80 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-800/60 space-y-2 text-start">
                      <p className="font-bold text-indigo-950 dark:text-white flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{isArabic ? "تعليمات الدفع بالمحفظة الإلكترونية:" : "Mobile Wallet Instructions:"}</span>
                      </p>
                      {transactionData.paymentData?.mobileWalletNumber && (
                        <div className="flex justify-between items-center py-1 border-b border-indigo-200/50 dark:border-indigo-800/50 text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">{isArabic ? "رقم المحفظة:" : "Wallet Number:"}</span>
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{transactionData.paymentData.mobileWalletNumber}</span>
                        </div>
                      )}
                      <ul className="list-disc list-inside space-y-1.5 text-[11px] leading-relaxed">
                        {isArabic ? (
                          <>
                            <li>افتح تطبيق المحفظة الخاص بك (فودافون كاش، اتصالات كاش، أورنج كاش، وي باي، أو المحفظة الذكية).</li>
                            <li>وافق على إشعار طلب الدفع أو اطلب كود التأكيد الخاص بمحفظتك (فودافون: <strong className="font-mono" dir="ltr">*9#</strong>، اتصالات: <strong className="font-mono" dir="ltr">*777#</strong>، أورنج: <strong className="font-mono" dir="ltr">#115#</strong>).</li>
                            <li>أدخل الرقم السري (PIN) لتأكيد العملية قبل انتهاء وقت صلاحية الفاتورة.</li>
                            <li>يتم التفعيل والتأكيد لحظياً وبشكل تلقائي بمجرد الموافقة.</li>
                          </>
                        ) : (
                          <>
                            <li>Open your mobile wallet app (Vodafone Cash, Etisalat Cash, Orange Cash, WE Pay, etc.).</li>
                            <li>Approve the payment prompt or dial the USSD confirmation code (Vodafone: *9#, Etisalat: *777#, Orange: #115#).</li>
                            <li>Enter your wallet PIN to confirm payment before expiration.</li>
                            <li>Instant and automatic activation upon approval.</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </>
                )}
                {transactionData.checkoutUrl && (
                  <div className="mt-4">
                    <a
                      href={transactionData.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors border border-indigo-200 dark:border-indigo-500/30"
                    >
                      {isArabic ? "الذهاب لصفحة الدفع" : "Go to Payment Page"}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        <div className="space-y-3">
          {isSessionExpired ? (
            <>
              {paymentTypeState === "subscription" ? (
                <Link
                  to={isAuthenticated ? "/u/subscriptions" : "/pricing"}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{isArabic ? "بدء اشتراك جديد" : "Start New Subscription"}</span>
                </Link>
              ) : (
                <Link
                  to={isAuthenticated ? "/u/products" : "/products"}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{isArabic ? "العودة للمتجر / السلة" : "Back to Store"}</span>
                </Link>
              )}
              <Link
                to="/u"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors"
              >
                {isArabic ? "العودة للوحة التحكم" : "Back to Dashboard"}
              </Link>
            </>
          ) : (
            <Link
              to="/u"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors"
            >
              {isArabic ? "العودة للوحة التحكم" : "Back to Dashboard"}
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

