import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Copy,
  Check,
  FileText,
  Receipt,
  Smartphone,
  Wallet,
  RefreshCw,
  Sparkles,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/index.js";
import { useCart } from "../../../context/CartContext.jsx";

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("en-US")} ج.م`;
}

function isWalletMethod(method) {
  if (!method) return false;
  if (Number(method.payment_method_id) === 4) return true;
  const name = `${method.name_en || ""} ${method.name_ar || ""}`.toLowerCase();
  return (
    name.includes("meeza") ||
    name.includes("wallet") ||
    name.includes("cash") ||
    name.includes("محفظ") ||
    name.includes("كاش") ||
    name.includes("ميزة") ||
    name.includes("vodafone") ||
    name.includes("orange") ||
    name.includes("etisalat") ||
    name.includes("we pay")
  );
}

export default function UnifiedPaymentBox({
  paymentData,
  invoiceInfo,
  intentKey,
  amount,
  method,
  isArabic = true,
  onBack,
  backLabel,
  onSuccess,
  onCancel,
  isCancelling = false,
}) {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedWalletRef, setCopiedWalletRef] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [checkMessage, setCheckMessage] = useState("");
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const pollTimerRef = useRef(null);

  const isWallet =
    isWalletMethod(method) ||
    Boolean(paymentData?.mobileWalletNumber) ||
    Boolean(invoiceInfo?.payment_data?.mobileWalletNumber) ||
    Number(method?.payment_method_id) === 4;

  const isFawry =
    !isWallet &&
    (method?.name_en?.toLowerCase().includes("fawry") ||
      Number(method?.payment_method_id) === 3);

  const methodName =
    method?.name_ar ||
    method?.name_en ||
    invoiceInfo?.payment_method ||
    (isWallet ? "محفظة إلكترونية" : isFawry ? "فوري" : "دفع إلكتروني");

  const ref =
    paymentData?.fawryCode ||
    paymentData?.referenceNumber ||
    paymentData?.payment_data?.fawryCode ||
    paymentData?.payment_data?.referenceNumber ||
    invoiceInfo?.payment_data?.fawryCode ||
    invoiceInfo?.payment_data?.referenceNumber ||
    intentKey ||
    invoiceInfo?.intent_key;

  const walletRef =
    paymentData?.walletReference ||
    paymentData?.meezaReference ||
    paymentData?.systemReference ||
    paymentData?.payment_data?.walletReference ||
    paymentData?.payment_data?.meezaReference ||
    paymentData?.payment_data?.systemReference ||
    invoiceInfo?.payment_data?.walletReference ||
    invoiceInfo?.payment_data?.meezaReference ||
    invoiceInfo?.payment_data?.systemReference ||
    invoiceInfo?.transaction_history?.[0]?.reference;

  const fawaterakCreatedAt =
    paymentData?.fawaterakCreatedAt ||
    invoiceInfo?.invoice_date ||
    invoiceInfo?.created_at ||
    invoiceInfo?.date ||
    paymentData?.created_at;

  const rawExpiry =
    paymentData?.fawaterakExpireDate ||
    invoiceInfo?.fawaterakExpireDate ||
    paymentData?.expirationTime ||
    paymentData?.expireDate ||
    paymentData?.payment_data?.expirationTime ||
    paymentData?.payment_data?.expireDate ||
    paymentData?.expiryDate ||
    paymentData?.expire_date ||
    invoiceInfo?.payment_data?.expirationTime ||
    invoiceInfo?.payment_data?.expireDate ||
    invoiceInfo?.expirationTime ||
    invoiceInfo?.expireDate;

  const expiry = (() => {
    if (isWallet) {
      const cTime = fawaterakCreatedAt ? new Date(fawaterakCreatedAt).getTime() : Date.now();
      const eTime = rawExpiry ? new Date(rawExpiry).getTime() : 0;
      if (!rawExpiry || isNaN(eTime) || (eTime - cTime > 60 * 60 * 1000)) {
        if (!isNaN(cTime)) {
          return new Date(cTime + 5 * 60 * 1000).toISOString();
        }
      }
    }
    return rawExpiry;
  })();

  const submittedWallet =
    paymentData?.mobileWalletNumber ||
    invoiceInfo?.payment_data?.mobileWalletNumber ||
    invoiceInfo?.customer?.phone;

  const walletQrCode =
    paymentData?.meezaQrCode ||
    paymentData?.isoQr ||
    paymentData?.payment_data?.meezaQrCode ||
    paymentData?.payment_data?.isoQr ||
    invoiceInfo?.payment_data?.meezaQrCode ||
    invoiceInfo?.payment_data?.isoQr;

  const handleCopyCode = () => {
    if (!ref) return;
    navigator.clipboard.writeText(String(ref));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyWalletRef = () => {
    if (!walletRef) return;
    navigator.clipboard.writeText(String(walletRef));
    setCopiedWalletRef(true);
    setTimeout(() => setCopiedWalletRef(false), 2000);
  };

  useEffect(() => {
    if (!expiry) return;
    const checkExpiry = () => {
      const eTime = new Date(expiry).getTime();
      if (!isNaN(eTime) && Date.now() >= eTime) {
        setIsSessionExpired(true);
      }
    };
    checkExpiry();
    const timer = setInterval(checkExpiry, 1000);
    return () => clearInterval(timer);
  }, [expiry]);

  const checkStatus = useCallback(
    async (isManual = false) => {
      const activeIntent = intentKey || invoiceInfo?.intent_key;
      if (!activeIntent || isSuccess || isSessionExpired) return;

      if (isManual) {
        setVerifying(true);
        setCheckMessage("");
      }

      try {
        const res = await api.payment.verify(activeIntent);
        if (res.isExpired || res.status === "expired") {
          setIsSessionExpired(true);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          return;
        }
        if (res.success && (res.status === "paid" || res.status === "success")) {
          setIsSuccess(true);
          try {
            clearCart();
          } catch (e) {}
          setCheckMessage(
            isArabic
              ? "🎉 تم تأكيد الدفع بنجاح!"
              : "🎉 Payment confirmed successfully!"
          );
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          const targetType =
            invoiceInfo?.order_type || paymentData?.type || "subscription";
          const targetId =
            invoiceInfo?.invoice_id || paymentData?.returnedId || "";
          navigate(
            `/payment/success?type=${targetType}&id=${targetId}&intentKey=${activeIntent}`,
            { replace: true },
          );
          return;
        }
      } catch (err) {
        if (err.response?.status === 410 || err.response?.data?.isExpired) {
          setIsSessionExpired(true);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          return;
        }
        if (isManual) {
          setCheckMessage(
            isArabic
              ? "تعذر التحقق حالياً، يرجى المحاولة بعد لحظات."
              : "Verification check failed. Please try again shortly."
          );
        }
      } finally {
        if (isManual) setVerifying(false);
      }
    },
    [intentKey, invoiceInfo, isSuccess, isSessionExpired, isArabic, navigate, paymentData]
  );

  // Polling removed: Frontend does not poll. It relies entirely on Fawaterak's redirect/webhook flow.

  // Handle countdown and success callback
  useEffect(() => {
    if (isSuccess) {
      try {
        clearCart();
      } catch (e) {}
      if (onSuccess) {
        onSuccess();
      } else {
        if (countdown > 0) {
          const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
          return () => clearTimeout(timer);
        } else {
          // Fallback if no onSuccess provided (e.g. from standalone payment page)
          navigate("/u", { replace: true });
        }
      }
    }
  }, [isSuccess, countdown, onSuccess, navigate]);

  // Prevent reload while success is animating
  useEffect(() => {
    if (!isSuccess) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSuccess]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 text-center shadow-lg border border-slate-200 dark:border-slate-800 w-full max-w-sm mx-auto"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {isSuccess ? (
        <div className="py-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-emerald-200/50 dark:ring-emerald-800/40">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">
            {isArabic ? "تم تأكيد السداد بنجاح!" : "Payment Successfully Confirmed!"}
          </h2>
          <div className="flex items-center justify-center gap-1.5 mt-3 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p>
              {isArabic 
                ? `جاري تحويلك لتفعيل حسابك خلال ${countdown} ثواني...` 
                : `Redirecting to your account in ${countdown} seconds...`}
            </p>
          </div>
        </div>
      ) : isSessionExpired ? (
        <div className="py-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-rose-200/50 dark:ring-rose-800/40">
            <Clock className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-2">
            {isArabic ? "انتهت صلاحية وسيلة الدفع" : "Payment Session Expired"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 max-w-[280px] mx-auto leading-relaxed">
            {isArabic
              ? "انتهت مهلة السداد المحددة لعملية الدفع هذه. تم إغلاق وتأمين وسيلة الدفع تلقائياً."
              : "This payment session has elapsed and was closed for your security."}
          </p>

          <div className="space-y-2 mt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isCancelling}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {isCancelling ? (
                  isArabic ? "جاري الإلغاء..." : "Cancelling..."
                ) : (
                  isArabic ? "طلب وسيلة دفع جديدة" : "Request New Payment"
                )}
              </button>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
              >
                {backLabel || (isArabic ? "إغلاق" : "Close")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/60 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-indigo-200 dark:ring-indigo-800/60">
            {isWallet ? (
              <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            ) : isFawry ? (
              <Receipt className="w-5 h-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            )}
          </div>

          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1.5">
            {isWallet
              ? isArabic
                ? "تم إرسال طلب الدفع للمحفظة"
                : "Payment Request Sent to Mobile Wallet"
              : isArabic
              ? "طلب استكمال الدفع"
              : "Payment Request Created"}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-[11px] mb-4 max-w-[280px] mx-auto leading-relaxed">
            {isWallet
              ? isArabic
                ? "تم إرسال إشعار الدفع لمراجعتك. يرجى تأكيد الخصم من هاتفك الآن."
                : "Payment request sent. Please approve the charge on your phone."
              : isFawry
              ? isArabic
                ? "ادفع بهذا الكود من خلال أي ماكينة أو تطبيق فوري."
                : "Pay using this code at any Fawry machine or app."
              : isArabic
              ? "اتبع التعليمات لإتمام الدفع."
              : "Follow instructions to complete payment."}
          </p>

          {/* WALLET BOX */}
          {isWallet && (
            <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/20 rounded-xl p-3 mb-4 border border-indigo-200 dark:border-indigo-800/60 text-start shadow-inner">
              <div className="flex items-center justify-between mb-3 border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {isArabic ? "خطوات التأكيد على الهاتف" : "Confirmation Steps"}
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      {submittedWallet
                        ? `${isArabic ? "مرسل إلى:" : "Sent to:"} ${submittedWallet}`
                        : isArabic
                        ? "المحافظ الإلكترونية (كاش)"
                        : "Mobile Wallets"}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                  <Clock className="w-3 h-3 animate-spin" />
                  {isArabic ? "بانتظار التأكيد" : "Pending Approval"}
                </span>
              </div>

              {walletQrCode && (
                <div className="mb-3 flex flex-col items-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 mb-2">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{isArabic ? "امسح رمز الـ QR (ميزة)" : "Scan QR Code"}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded shadow-sm border border-slate-200">
                    <QRCodeSVG
                      value={walletQrCode}
                      size={100}
                      level={"M"}
                      includeMargin={false}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2.5 text-[11px] text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {isArabic
                        ? "افتح تطبيق محفظتك"
                        : "Open your wallet app"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isArabic
                        ? "(فودافون كاش، أورنج كاش، اتصالات كاش، وي باي، أو المحفظة الذكية)"
                        : "(Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, etc.)"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {isArabic ? "راجع إشعار طلب الدفع أو اطلب كود التأكيد" : "Review Request or Dial USSD"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isArabic
                        ? `وافق على دفع ${formatMoney(amount)} أو اطلب كود التأكيد (فودافون: *9#، اتصالات: *777#، أورنج: #115#).`
                        : `Confirm payment of ${formatMoney(amount)} or dial USSD (Vodafone: *9#, Etisalat: *777#, Orange: #115#).`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {isArabic
                        ? "أدخل الرقم السري للتأكيد"
                        : "Enter Wallet PIN"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isArabic
                        ? "سيتم تأكيد اشتراكك تلقائياً فور موافقتك دون الحاجة لإعادة تحميل الصفحة."
                        : "Your payment will be auto-detected instantly upon confirmation."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FAWRY BOX */}
          {isFawry && ref && (
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/30 rounded-xl p-3 mb-4 border border-indigo-200 dark:border-indigo-700/60 shadow-inner">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5" />
                  {isArabic ? "كود فوري المرجعي" : "Fawry Code"}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-200/60 dark:bg-indigo-800/60 hover:bg-indigo-300 dark:hover:bg-indigo-700 text-indigo-700 dark:text-indigo-200 transition-colors flex items-center gap-1"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedCode
                    ? isArabic
                      ? "تم النسخ"
                      : "Copied"
                    : isArabic
                    ? "نسخ الكود"
                    : "Copy"}
                </button>
              </div>

              <div className="my-2 p-2.5 sm:p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-200/70 dark:border-indigo-800/70 shadow-sm max-w-full overflow-hidden">
                <p className="text-[clamp(1.15rem,5.5vw,1.65rem)] font-black text-indigo-700 dark:text-indigo-300 tracking-normal sm:tracking-wider dir-ltr select-all font-mono drop-shadow-sm [overflow-wrap:anywhere] break-all text-center leading-tight">
                  {ref}
                </p>
              </div>

              {expiry && (
                <div className="mt-2 bg-white/70 dark:bg-slate-900/60 rounded px-2.5 py-1.5 inline-flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-900/50">
                  <Clock className="w-3 h-3 text-rose-500" />
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    {isArabic ? "وقت انتهاء الفاتورة:" : "Invoice Expiry:"}{" "}
                    {(() => {
                      const d = new Date(expiry);
                      return isNaN(d.getTime())
                        ? String(expiry)
                        : d.toLocaleString(isArabic ? "ar-EG-u-nu-latn" : "en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          });
                    })()}
                  </p>
                </div>
              )}

              <div className="mt-2.5 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 text-[10px] text-indigo-900/80 dark:text-indigo-200/80 space-y-1 text-start">
                <p className="font-bold flex items-center gap-1 text-indigo-950 dark:text-indigo-100">
                  <Receipt className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>{isArabic ? "تعليمات سداد فوري:" : "Fawry Instructions:"}</span>
                </p>
                <p className="leading-relaxed">
                  {isArabic
                    ? "ادفع عبر أي ماكينة فوري أو تطبيق MyFawry بكود الخدمة 788 (فوري باي) باستخدام الكود الموضح أعلاه قبل انتهاء الصلاحية."
                    : "Pay at any Fawry machine or MyFawry app via service code 788 (FawryPay) using the code above before expiration."}
                </p>
              </div>
            </div>
          )}

          {/* Structured Invoice Details */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800 mb-4 text-start">
            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-indigo-500" />
              {isArabic ? "بيانات الطلب" : "Request Details"}
            </h4>

            <div className="space-y-1.5 text-[11px]">
              {fawaterakCreatedAt && (
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {isArabic ? "تاريخ ووقت الإنشاء:" : "Created:"}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-[10px]">
                    {(() => {
                      const d = new Date(fawaterakCreatedAt);
                      return isNaN(d.getTime())
                        ? String(fawaterakCreatedAt)
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
              {intentKey && (
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {isArabic
                      ? "رقم العملية:"
                      : "Ref Key:"}
                  </span>
                  <span
                    className="font-mono font-bold text-slate-700 dark:text-slate-200 select-all max-w-[120px] truncate"
                    title={intentKey}
                  >
                    {intentKey}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {isArabic ? "وسيلة الدفع:" : "Method:"}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {methodName}
                </span>
              </div>

              {walletRef && (
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    {isArabic ? "الرقم المرجعي للمحفظة:" : "Wallet Ref:"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 select-all" dir="ltr">
                      {walletRef}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyWalletRef}
                      className="p-0.5 rounded text-slate-400 hover:text-indigo-600"
                      title={isArabic ? "نسخ" : "Copy"}
                    >
                      {copiedWalletRef ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {isArabic ? "المبلغ المستحق:" : "Total:"}
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatMoney(
                    amount || invoiceInfo?.total || paymentData?.total || 0
                  )}
                </span>
              </div>
            </div>
          </div>

          {checkMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>{checkMessage}</span>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => checkStatus(true)}
              disabled={verifying}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[13px] transition-colors shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {isArabic ? "جاري التحقق..." : "Checking Status..."}
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isArabic
                    ? "تحقق من الدفع"
                    : "Check Status"}
                </>
              )}
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[13px] transition-colors"
              >
                {backLabel || (isArabic ? "الرئيسية" : "Dashboard")}
              </button>
            )}
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isCancelling}
              className="mt-3 w-full py-1.5 rounded-lg text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:underline font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isArabic ? "جاري الإلغاء..." : "Cancelling..."}
                </>
              ) : (
                isArabic ? "إلغاء الطلب نهائياً" : "Cancel Order Permanently"
              )}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
