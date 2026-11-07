/**
 * PaymentPage.jsx
 *
 * Fawaterak Direct API Payment Integration
 * ─────────────────────────────────────────
 * - Professional Visa/Mastercard Card Form with interactive 3D Card Preview
 * - Mobile Wallets (Vodafone Cash, Orange, Etisalat, WE, Meeza Digital)
 * - Fawry with direct reference code, copy button, and live status verification
 * - 100% Iframe-Free: pure Server-to-Server API integration & 3D-Secure
 * - Database is the single source of truth for amounts and entitlements.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Copy,
  Check,
  FileText,
  Receipt,
  Clock,
  Smartphone,
  Wallet,
  RefreshCw,
  Sparkles,
  User,
  Calendar,
  KeyRound,
  Shield,
  QrCode,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import ErrorNotice from "../components/ErrorNotice.jsx";
import api from "../api/index.js";
import GlobalLogo from "../components/GlobalLogo.jsx";
import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import UnifiedPaymentBox from "../panel/components/dashboard/UnifiedPaymentBox.jsx";
import { toast } from "../util/toast";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("en-US")} ج.م`;
}

function isCardMethod(method) {
  if (!method) return false;
  if (Number(method.payment_method_id) === 2) return true;
  const name = `${method.name_en || ""} ${method.name_ar || ""}`.toLowerCase();
  return (
    name.includes("visa") ||
    name.includes("mastercard") ||
    name.includes("فيزا") ||
    name.includes("ماستر") ||
    name.includes("card")
  );
}

function isFawryMethod(method) {
  if (!method) return false;
  if (Number(method.payment_method_id) === 3) return true;
  const name = `${method.name_en || ""} ${method.name_ar || ""}`.toLowerCase();
  return name.includes("fawry") || name.includes("فوري");
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

function getCardBrand(number) {
  const clean = String(number || "").replace(/\D/g, "");
  if (/^4/.test(clean)) return "visa";
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(clean))
    return "mastercard";
  if (/^(5078|505|6374)/.test(clean)) return "meeza";
  return "generic";
}

function getTelecomProvider(number, isArabic) {
  const clean = String(number || "").replace(/\D/g, "");
  if (clean.startsWith("010"))
    return isArabic ? "فودافون كاش" : "Vodafone Cash";
  if (clean.startsWith("011"))
    return isArabic ? "اتصالات كاش" : "Etisalat Cash";
  if (clean.startsWith("012")) return isArabic ? "أورنج كاش" : "Orange Cash";
  if (clean.startsWith("015")) return isArabic ? "وي باي (WE)" : "WE Pay";
  if (clean.length >= 3)
    return isArabic ? "محفظة ذكية (ميزة)" : "Smart Wallet (Meeza)";
  return "";
}

function getWalletUssdCode(number) {
  const clean = String(number || "").replace(/\D/g, "");
  if (clean.startsWith("010")) return "*9*1#"; // Vodafone
  if (clean.startsWith("011")) return "*777#"; // Etisalat
  if (clean.startsWith("012")) return "#115#"; // Orange
  if (clean.startsWith("015")) return "*322#"; // WE
  return null;
}

function WalletCountdown({ expireDate, isArabic }) {
  const [timeLeft, setTimeLeft] = React.useState("");
  const [isExpired, setIsExpired] = React.useState(false);

  React.useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = new Date(expireDate).getTime() - now;
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(isArabic ? "انتهت الصلاحية" : "Expired");
        return;
      }
      setIsExpired(false);
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [expireDate, isArabic]);

  if (isExpired) {
    return (
      <span className="font-mono bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 text-xs font-bold">
        {timeLeft}
      </span>
    );
  }

  return (
    <span className="font-mono bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-bold">
      {timeLeft}
    </span>
  );
}

// ── Interactive Credit Card Preview Component ─────────────────────────────────

function InteractiveCreditCard({
  cardNumber,
  cardHolder,
  expiryMonth,
  expiryYear,
  cvv,
  isFlipped,
}) {
  const brand = getCardBrand(cardNumber);

  // Formatted display: 16 digits grouped into 4
  const cleanNum = cardNumber.replace(/\D/g, "");
  const padded = cleanNum.padEnd(16, "•");
  const grouped = `${padded.slice(0, 4)}  ${padded.slice(4, 8)}  ${padded.slice(
    8,
    12,
  )}  ${padded.slice(12, 16)}`;

  const displayName = cardHolder.trim()
    ? cardHolder.toUpperCase()
    : "CARDHOLDER NAME";
  const displayExpiry = `${(expiryMonth || "MM").padStart(2, "0")}/${
    expiryYear || "YY"
  }`;

  return (
    <div className="w-full max-w-[360px] aspect-[1.586/1] mx-auto mb-6 perspective-1000 select-none">
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.6,
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
        className="relative w-full h-full rounded-2xl shadow-2xl transition-all preserve-3d"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* FRONT OF CARD */}
        <div
          className="absolute inset-0 rounded-2xl p-4 sm:p-5 text-white flex flex-col justify-between overflow-hidden shadow-2xl backface-hidden"
          style={{
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
            backfaceVisibility: "hidden",
          }}
        >
          {/* Subtle Background Patterns */}
          <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-44 h-44 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Top Bar: Chip + Brand */}
          <div className="flex items-center justify-between relative z-10">
            {/* EMV Chip & Contactless */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-7 sm:w-11 sm:h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full border border-amber-600/40 rounded grid grid-cols-2 gap-0.5 p-0.5">
                  <div className="border-r border-amber-600/40" />
                  <div />
                </div>
              </div>
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200/80 rotate-90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                <path d="M15.5 21.5a12 12 0 0 0 0-19" />
              </svg>
            </div>

            {/* Brand Logo */}
            <div className="text-right">
              {brand === "visa" && (
                <span className="font-black italic text-xl sm:text-2xl tracking-wider text-white drop-shadow">
                  VISA
                </span>
              )}
              {brand === "mastercard" && (
                <div className="flex items-center -space-x-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500/90 shadow-sm" />
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400/90 shadow-sm" />
                </div>
              )}
              {brand === "meeza" && (
                <span className="font-black tracking-widest text-base sm:text-lg text-emerald-400">
                  MEEZA
                </span>
              )}
              {brand === "generic" && (
                <span className="text-[10px] sm:text-xs font-bold text-slate-300 tracking-wider">
                  DEBIT / CREDIT
                </span>
              )}
            </div>
          </div>

          {/* Card Number */}
          <div className="relative z-10 py-0.5 sm:py-1">
            <p className="font-mono text-[clamp(0.85rem,4.2vw,1.25rem)] font-bold tracking-wider sm:tracking-widest text-slate-100 drop-shadow-sm text-center truncate">
              {grouped}
            </p>
          </div>

          {/* Bottom Bar: Holder & Expiry */}
          <div className="flex items-end justify-between relative z-10 text-xs">
            <div className="min-w-0 flex-1 me-3">
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
                Cardholder Name
              </p>
              <p className="font-mono font-bold tracking-wide truncate text-slate-200 uppercase">
                {displayName}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
                Expires
              </p>
              <p className="font-mono font-bold text-slate-200">
                {displayExpiry}
              </p>
            </div>
          </div>
        </div>

        {/* BACK OF CARD (CVV) */}
        <div
          className="absolute inset-0 rounded-2xl bg-slate-900 text-white flex flex-col justify-between overflow-hidden shadow-2xl backface-hidden"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
          }}
        >
          {/* Black Magnetic Stripe */}
          <div className="w-full h-11 bg-slate-950 mt-5 border-y border-slate-800" />

          {/* CVV Signature Bar */}
          <div className="px-6 py-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mb-1">
              <span>Authorized Signature</span>
              <span>CVV / CVC</span>
            </div>
            <div className="bg-slate-200 h-9 rounded flex items-center justify-end px-3 font-mono font-black text-slate-900 text-base tracking-widest">
              {cvv ? cvv : "•••"}
            </div>
          </div>

          {/* Back Footer */}
          <div className="px-6 pb-4 flex items-center justify-between text-[9px] text-slate-400 font-medium">
            <span>PCI-DSS Secured & Encrypted</span>
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { useCart } from "../context/CartContext.jsx";

// DirectPaymentResult was moved to UnifiedPaymentBox

// ── Main Component ────────────────────────────────────────────────────────────

export default function PaymentPage({ overrideParams, onClose }) {
  const { language } = useGlobalLanguage();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = overrideParams || searchParams;
  const isArabic = language === "ar" || !language;

  // URL params
  const paymentType = params.get("type"); // "subscription" | "order" | "intent"
  const planId = params.get("planId");
  const billingPeriod = params.get("billingPeriod") || "monthly";
  const storedReferral = typeof window !== "undefined"
    ? (localStorage.getItem("thenith_referral_code") || localStorage.getItem("referral_code") || "")
    : "";
  const couponCode = (params.get("couponCode") || params.get("ref") || storedReferral || "").trim().toUpperCase();
  const orderId = params.get("orderId");
  const idParam = params.get("id");
  const intentKeyParam = params.get("intentKey");

  const invoiceTargetId = paymentType === "subscription" 
    ? (planId || idParam) 
    : (orderId || idParam || (paymentType === "intent" ? intentKeyParam : null));

  let effectiveType = paymentType;
  let effectiveId = invoiceTargetId;

  if (!effectiveType && intentKeyParam) {
    effectiveType = "intent";
    effectiveId = intentKeyParam;
  }

  const periodLabel =
    billingPeriod === "yearly"
      ? isArabic
        ? "سنوي"
        : "Annual"
      : isArabic
        ? "شهري"
        : "Monthly";

  // Invoice State (from Backend Database - Single Source of Truth)
  const [invoice, setInvoice] = useState(null);
  const amount = invoice?.amount 
    ? invoice.amount 
    : invoice 
      ? (billingPeriod === "yearly" ? invoice.priceYearly : invoice.priceMonthly) 
      : 0;
  const planName = invoice?.name || "";
  const orderNumber = invoice?.orderNumber || "";

  // State
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [walletNumber, setWalletNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [directResult, setDirectResult] = useState(null);
  const [iframeUrl, setIframeUrl] = useState(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [activeCardIntentKey, setActiveCardIntentKey] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [copiedFawry, setCopiedFawry] = useState(false);
  const iframeContainerRef = useRef(null);

  // Auto-scroll when iframe appears
  useEffect(() => {
    if (iframeUrl) {
      setIframeLoading(true);
      const timer = setTimeout(() => {
        iframeContainerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [iframeUrl]);

  // Check pending payments and methods on mount with strict user validation
  useEffect(() => {
    let mounted = true;

    const invoicePromise = (effectiveType && (effectiveId || intentKeyParam))
      ? api.payment
          .getInvoiceDetails(
            effectiveType,
            effectiveId || intentKeyParam,
            billingPeriod,
            couponCode,
            intentKeyParam || undefined
          )
          .then((res) => ({ ok: true, data: res }))
          .catch((err) => ({ ok: false, error: err }))
      : Promise.resolve(null);

    Promise.all([
      api.payment.getMethods().catch(() => ({ methods: [] })),
      api.payment.getPending().catch(() => ({ subscriptions: [], orders: [] })),
      invoicePromise,
    ]).then(async ([methodsRes, pendingRes, invoiceRes]) => {
      if (!mounted) return;

      // 1. Check Invoice Fetch Result & Ownership
      if (invoiceRes && !invoiceRes.ok) {
        const err = invoiceRes.error;
        const errMsg =
          err?.response?.data?.error ||
          err?.message ||
          (isArabic
            ? "رابط الدفع هذا غير صالح أو غير مخصص لحسابك الحالي. يجب إعادة عملية الشراء من البداية."
            : "This payment link is invalid or not associated with your account. Please restart the purchase from the beginning.");
        toast.error(errMsg);
        navigate("/", { replace: true });
        return;
      }

      const invoiceData = invoiceRes?.data?.data || invoiceRes?.data;
      if (invoiceRes?.data?.alreadyPaid || invoiceData?.alreadyPaid || invoiceData?.status === "paid") {
        toast.success(
          isArabic
            ? "تم سداد هذا الطلب بالفعل بنجاح."
            : "This order has already been paid successfully."
        );
        navigate(
          `/payment/success?type=${effectiveType || "order"}&id=${effectiveId || ""}&intentKey=${intentKeyParam || ""}`,
          { replace: true }
        );
        return;
      }

      // 2. Set Methods
      const list = methodsRes.methods || [];
      setMethods(list);

      // 3. Set Pending if exists (exclude card payments, as cards are instant and not resumable)
      const { subscriptions, orders } = pendingRes || {};
      const allPending = [...(subscriptions || []), ...(orders || [])].filter((p) => {
        const tx = p?.transaction || p;
        if (!tx) return false;
        if (tx.paymentMethodId === 2) return false;
        const name = `${tx.paymentMethodName || p.paymentMethod || ""}`.toLowerCase();
        return (
          !name.includes("visa") &&
          !name.includes("mastercard") &&
          !name.includes("card") &&
          !name.includes("فيزا") &&
          !name.includes("بطاق")
        );
      });

      // 4. Verify intentKey ownership if present in URL
      if (intentKeyParam) {
        const inUserPending = allPending.some((p) => p.transaction?.intentKey === intentKeyParam);
        const inInvoice = invoiceData?.transaction?.intentKey === intentKeyParam;

        if (!inUserPending && !inInvoice) {
          // Check if already paid by this user
          try {
            const checkPaid = await api.payment.verify(intentKeyParam);
            if (mounted && checkPaid.success && checkPaid.status === "paid") {
              navigate(
                `/payment/success?type=${checkPaid.type || effectiveType || "subscription"}&intentKey=${intentKeyParam}`,
                { replace: true },
              );
              return;
            }
          } catch (err) {
            // If verify failed with 403 Forbidden (different user) or 404
            toast.error(
              err?.response?.data?.error ||
              (isArabic
                ? "رابط الدفع هذا غير صالح أو غير مخصص لحسابك الحالي. يجب إعادة عملية الشراء من البداية."
                : "This payment link is invalid or not associated with your account. Please restart the purchase from the beginning.")
            );
            navigate("/", { replace: true });
            return;
          }

          // If not in pending, not in invoice, and not paid -> invalid link!
          toast.error(
            isArabic
              ? "رابط الدفع هذا غير صالح أو غير مخصص لحسابك الحالي. يجب إعادة عملية الشراء من البداية."
              : "This payment link is invalid or not associated with your account. Please restart the purchase from the beginning."
          );
          navigate("/", { replace: true });
          return;
        }
      }

      // If user navigated to /payment with no params and has no pending payments -> redirect to home
      if (!effectiveType && !effectiveId && !intentKeyParam && allPending.length === 0) {
        navigate("/", { replace: true });
        return;
      }

      // Check if user's subscription is expiring soon (<= 3 days) or user is renewing
      const subExpiresAt = user?.subscription?.expiresAt;
      const daysLeft = subExpiresAt
        ? Math.ceil((new Date(subExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;
      const isExpiringSoonOrCanRenew =
        daysLeft <= 3 ||
        params.get("renew") === "true" ||
        params.get("checkout") === "true";

      // If already Pro user with plenty of active days (> 3 days) and not explicitly renewing, return to dashboard
      if (
        effectiveType === "subscription" &&
        user?.subscription?.plan === "pro" &&
        !isExpiringSoonOrCanRenew &&
        allPending.length === 0
      ) {
        navigate("/u", { replace: true });
        return;
      }

      let foundPending = false;
      let matchedPendingItem = null;

      if (allPending.length > 0) {
        if (intentKeyParam) {
          matchedPendingItem = allPending.find(
            (p) => p.transaction?.intentKey === intentKeyParam,
          );
        } else if (effectiveType === "subscription") {
          matchedPendingItem =
            allPending.find(
              (p) =>
                (p.type === "subscription" || p.planId) &&
                (!planId ||
                  String(p.planId?._id || p.planId) === String(planId)),
            ) || allPending.find((p) => p.type === "subscription" || p.planId);
        } else if (effectiveType === "order") {
          matchedPendingItem =
            allPending.find(
              (p) =>
                (p.type === "order" || p.orderNumber) &&
                (!orderId || String(p._id) === String(orderId)),
            ) || allPending.find((p) => p.type === "order" || p.orderNumber);
        } else {
          matchedPendingItem = allPending[0];
        }

        const tx = matchedPendingItem?.transaction || invoiceData?.transaction;
        if (tx) {
          const fawryVal =
            tx.paymentData?.fawryCode ||
            tx.paymentData?.fawry_code ||
            tx.paymentData?.referenceNumber ||
            tx.paymentData?.payment_data?.fawryCode ||
            tx.paymentData?.payment_data?.referenceNumber ||
            tx.fawaterakResponse?.payment_data?.fawryCode ||
            tx.fawaterakResponse?.payment_data?.referenceNumber;

          const isFawryTx = Boolean(tx.paymentMethodId === 3 || fawryVal);
          const methodId =
            tx.paymentMethodId ||
            (isFawryTx
              ? 3
              : tx.paymentData?.meezaQrCode ||
                  tx.paymentData?.isoQr ||
                  tx.paymentData?.payment_data?.meezaQrCode ||
                  tx.paymentData?.customerMobile
                ? 4
                : null);
          const methodObj = {
            name_ar:
              tx.paymentMethodName ||
              (methodId === 4
                ? "محفظة إلكترونية"
                : methodId === 3
                  ? "فوري"
                  : "أونلاين"),
            name_en:
              tx.paymentMethodName ||
              (methodId === 4
                ? "Mobile Wallet"
                : methodId === 3
                  ? "Fawry"
                  : "Online"),
            payment_method_id: methodId,
          };
          const mergedPaymentData = {
            ...(tx.paymentData || {}),
            ...(fawryVal ? { fawryCode: fawryVal } : {}),
          };
          setDirectResult({
            createdAt: tx.createdAt,
            paymentData: mergedPaymentData,
            intentKey: tx.intentKey,
            amount: tx.amount,
            method: methodObj,
            returnedId: matchedPendingItem?._id || invoiceData?.id || invoiceData?.orderId,
            orderNumber: matchedPendingItem?.orderNumber || invoiceData?.orderNumber,
            transactionId:
              tx.fawaterakResponse?.transaction_id ||
              tx.fawaterakResponse?.invoice_id,
            type:
              matchedPendingItem?.type ||
              (matchedPendingItem?.planId ? "subscription" : effectiveType || "order"),
          });
          setSelectedMethod(methodObj);
          if (tx.paymentData?.customerMobile) {
            setWalletNumber(tx.paymentData.customerMobile);
          }
          foundPending = true;
        }
      } else if (invoiceData?.transaction) {
        // Active pending transaction returned directly from invoice query
        const tx = invoiceData.transaction;
        const fawryVal =
          tx.paymentData?.fawryCode ||
          tx.paymentData?.fawry_code ||
          tx.paymentData?.referenceNumber ||
          tx.paymentData?.payment_data?.fawryCode ||
          tx.paymentData?.payment_data?.referenceNumber ||
          tx.fawaterakResponse?.payment_data?.fawryCode ||
          tx.fawaterakResponse?.payment_data?.referenceNumber;

        const isFawryTx = Boolean(tx.paymentMethodId === 3 || fawryVal);
        const methodId =
          tx.paymentMethodId ||
          (isFawryTx ? 3 : 4);
        const methodObj = {
          name_ar: tx.paymentMethodName || (methodId === 4 ? "محفظة إلكترونية" : "فوري"),
          name_en: tx.paymentMethodName || (methodId === 4 ? "Mobile Wallet" : "Fawry"),
          payment_method_id: methodId,
        };
        const mergedPaymentData = {
          ...(tx.paymentData || {}),
          ...(fawryVal ? { fawryCode: fawryVal } : {}),
        };
        setDirectResult({
          createdAt: tx.createdAt,
          paymentData: mergedPaymentData,
          intentKey: tx.intentKey,
          amount: tx.amount,
          method: methodObj,
          returnedId: invoiceData.id || invoiceData.orderId,
          orderNumber: invoiceData.orderNumber,
          transactionId:
            tx.fawaterakResponse?.transaction_id ||
            tx.fawaterakResponse?.invoice_id,
          type: effectiveType || "order",
        });
        setSelectedMethod(methodObj);
        if (tx.paymentData?.customerMobile) {
          setWalletNumber(tx.paymentData.customerMobile);
        }
        foundPending = true;
      }

      // 5. Set Invoice Details from Database (single source of truth)
      if (invoiceData) {
        setInvoice(invoiceData);
      } else if (foundPending && matchedPendingItem?.transaction) {
        const tx = matchedPendingItem.transaction;
        const planName =
          typeof matchedPendingItem.planId?.name === "object"
            ? (matchedPendingItem.planId.name[isArabic ? "ar" : "en"] || matchedPendingItem.planId.name.ar)
            : (matchedPendingItem.planId?.name || "Pro");
        setInvoice({
          id: matchedPendingItem._id,
          orderNumber: matchedPendingItem.orderNumber || null,
          name: planName,
          amount: tx.amount,
          items: matchedPendingItem.items || [],
          customer: matchedPendingItem.customer || null,
        });
      } else if (effectiveType && (orderId || planId)) {
        // Invoice fetch failed and no pending transaction, redirect to home
        navigate("/", { replace: true });
        return;
      }

      if (!foundPending && list.length > 0 && !selectedMethod) {
        const methodParam = params.get("method");
        let initialMethod = null;
        if (methodParam === "card") {
          initialMethod = list.find(isCardMethod);
        } else if (methodParam === "fawry") {
          initialMethod = list.find(isFawryMethod);
        } else if (methodParam === "wallet") {
          initialMethod = list.find(isWalletMethod);
        }
        const chosen = initialMethod || list.find(isWalletMethod) || list[0];
        setSelectedMethod(chosen);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []); // Run once on mount

  // Polling removed: Frontend does not poll. It relies entirely on Fawaterak's redirect/webhook flow.

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const type = directResult?.type || paymentType;
      if (type === "order") {
        navigate("/products", { replace: true });
      } else {
        navigate("/u", { replace: true });
      }
    }
  }, [countdown, navigate, paymentType, directResult]);

  const isDirectDispatch = (method) => method?.redirect === "false";
  const needsWallet = (method) => isWalletMethod(method);
  const isCard = (method) => isCardMethod(method);

  // Validations
  const isWalletValid = /^01[0125][0-9]{8}$/.test(walletNumber);

  const isFree = Number(amount) <= 0 || Boolean(invoice?.isFree);

  const handlePay = useCallback(async (targetMethod = null) => {
    const activeMethod = targetMethod || selectedMethod;
    if (!isFree && !activeMethod) {
      setError(
        isArabic ? "اختر طريقة الدفع أولاً" : "Please select a payment method",
      );
      return;
    }

    // Card Form Validation
    if (!isFree && isCard(activeMethod)) {
      // Handled via secure in-page iframe
    }

    // Wallet Validation
    if (!isFree && needsWallet(activeMethod)) {
      const clean = walletNumber.replace(/\D/g, "");
      if (!clean) {
        setError(
          isArabic
            ? "يرجى إدخال رقم المحفظة الإلكترونية."
            : "Please enter mobile wallet number.",
        );
        return;
      }
      if (!/^01[0125][0-9]{8}$/.test(clean)) {
        setError(
          isArabic
            ? "رقم المحفظة غير صحيح. يجب أن يتكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015."
            : "Invalid wallet number. Must be 11 digits starting with 010, 011, 012, or 015.",
        );
        return;
      }
    }

    setError("");
    setSubmitting(true);

    try {
      const methodId = activeMethod ? activeMethod.payment_method_id : null;

      let result;

      if (paymentType === "subscription") {
        result = await api.payment.createSubscriptionIntent({
          planId,
          billingPeriod,
          couponCode: couponCode || undefined,
          referralRewardId: params.get("referralRewardId") || undefined,
          applyReferralDiscount: true,
          methodId,
          walletNumber: needsWallet(activeMethod) ? walletNumber : undefined,
        });
      } else if (paymentType === "order") {
        result = await api.payment.createOrderIntent(orderId, {
          methodId,
          walletNumber: needsWallet(activeMethod) ? walletNumber : undefined,
        });
      }

      if (!result) throw new Error("Invalid payment type");

      if (result.isFree || isFree) {
        navigate(`/payment/result?status=success&type=${paymentType}&isFree=true`);
        return;
      }

      // Hosted / 3D-Secure Bank Authentication URL -> In-page secure iframe for Cards, or direct redirect
      const redirectUrl = result.checkoutUrl || result.paymentData?.redirectTo;
      if (redirectUrl) {
        if (isCard(activeMethod)) {
          setActiveCardIntentKey(result.intentKey);
          setIframeUrl(redirectUrl);
          return;
        }
        window.location.href = redirectUrl;
        return;
      }

      // Direct dispatch (Meeza, Wallets, Fawry without redirect)
      if (result.paymentData || (!result.checkoutUrl && result.invoiceInfo)) {
        if (result.intentKey) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set("intentKey", result.intentKey);
          window.history.replaceState({}, "", newUrl.toString());
        }
        setDirectResult({
          paymentData: result.paymentData,
          invoiceInfo: result.invoiceInfo,
          intentKey: result.intentKey,
          amount: result.amount || amount,
          method: activeMethod,
          returnedId: result.subscriptionId || result.orderId || orderId,
          createdAt: Date.now(),
        });
        return;
      }

      // Fallback
      setError(
        isArabic
          ? "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً."
          : "Unexpected error, please try again.",
      );
    } catch (err) {
      setError(
        err?.message ||
          (isArabic
            ? "حدث خطأ أثناء إنشاء طلب الدفع."
            : "Payment failed, please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedMethod,
    walletNumber,
    paymentType,
    planId,
    billingPeriod,
    couponCode,
    orderId,
    isArabic,
    amount,
  ]);

  // ── Main Payment Selection Flow ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-slate-600 dark:text-slate-300 font-medium text-lg animate-pulse">
          {isArabic
            ? "جاري التجهيز... يرجى الانتظار"
            : "Preparing... Please wait"}
        </p>
      </div>
    );
  }

  const renderDirectResult = () => (
    <>
      {/* DIRECT RESULT DETAILS (Fawry / Wallet) */}
      {directResult && (
        <div className="mb-6 p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-center">
          {(() => {
            const getDisplayReference = () => {
              let t = directResult.transactionId;
              if (!t || String(t).match(/[a-z]/i))
                t = directResult.invoiceInfo?.invoice_id;
              if (!t || String(t).match(/[a-z]/i)) t = directResult.orderNumber;
              return t ? `#${t}` : "";
            };
            const walletQrCode =
              directResult.paymentData?.meezaQrCode ||
              directResult.paymentData?.isoQr ||
              directResult.paymentData?.payment_data?.meezaQrCode ||
              directResult.paymentData?.payment_data?.isoQr ||
              directResult.invoiceInfo?.payment_data?.meezaQrCode ||
              directResult.invoiceInfo?.payment_data?.isoQr;

            return (
              <>
                {directResult.paid ? (
                  <div className="space-y-6">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="text-2xl text-slate-900 dark:text-white font-black mb-2">
                      {isArabic
                        ? "تم تأكيد الدفع بنجاح!"
                        : "Payment Confirmed Successfully!"}
                    </h4>

                    <div className="p-5 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-emerald-200 dark:border-emerald-800 text-start space-y-3 relative overflow-hidden">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                          {isArabic ? "المرجع" : "Reference"}
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                          {directResult.transactionId &&
                          !String(directResult.transactionId).match(/[a-z]/i)
                            ? `#${directResult.transactionId}`
                            : (directResult.invoiceInfo?.invoice_id ||
                                  directResult.invoiceInfo?.invoiceId) &&
                                !String(
                                  directResult.invoiceInfo?.invoice_id ||
                                    directResult.invoiceInfo?.invoiceId,
                                ).match(/[a-z]/i)
                              ? `#${directResult.invoiceInfo.invoice_id || directResult.invoiceInfo.invoiceId}`
                              : directResult.orderNumber
                                ? `#${directResult.orderNumber}`
                                : ""}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                          {isArabic ? "طريقة الدفع" : "Payment Method"}
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {directResult.method?.name_ar || "أونلاين"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-sm text-slate-700 dark:text-slate-300 font-black">
                          {isArabic ? "المبلغ المدفوع" : "Amount Paid"}
                        </span>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                          {formatMoney(directResult.amount)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                      <p className="text-emerald-800 dark:text-emerald-200 text-sm font-bold">
                        {isArabic
                          ? `جاري تحويلك للصفحة المطلوبة خلال ${countdown} ثوانٍ...`
                          : `Redirecting you to the requested page in ${countdown} seconds...`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const activeFawryCode =
                        directResult.paymentData?.fawryCode ||
                        directResult.paymentData?.fawry_code ||
                        directResult.paymentData?.referenceNumber ||
                        directResult.paymentData?.payment_data?.fawryCode ||
                        directResult.paymentData?.payment_data?.referenceNumber ||
                        directResult.invoiceInfo?.payment_data?.fawryCode ||
                        directResult.invoiceInfo?.payment_data?.referenceNumber;

                      const isFawryActive = Boolean(
                        activeFawryCode ||
                        directResult.method?.payment_method_id === 3 ||
                        directResult.method?.name_en?.toLowerCase().includes("fawry") ||
                        directResult.method?.name_ar?.includes("فوري")
                      );

                      if (isFawryActive && activeFawryCode) {
                        return (
                          <div className="w-full max-w-sm mx-auto mb-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/80 p-3 sm:p-4 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-50 dark:border-slate-800 gap-2">
                              <h4 className="text-indigo-900 dark:text-indigo-100 font-bold text-xs sm:text-sm truncate">
                                {isArabic
                                  ? "كود الدفع المرجعي (فوري)"
                                  : "Fawry Reference Code"}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(String(activeFawryCode));
                                  setCopiedFawry(true);
                                  setTimeout(() => setCopiedFawry(false), 2000);
                                }}
                                className="text-xs font-bold px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 flex items-center gap-1 transition-colors shrink-0"
                              >
                                {copiedFawry ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {copiedFawry
                                    ? isArabic
                                      ? "تم النسخ"
                                      : "Copied"
                                    : isArabic
                                    ? "نسخ الكود"
                                    : "Copy"}
                                </span>
                              </button>
                            </div>
                            <div className="my-2 p-2.5 sm:p-3 rounded-xl bg-indigo-50/70 dark:bg-slate-950/70 border border-indigo-100 dark:border-indigo-900/40 max-w-full overflow-hidden">
                              <p className="text-[clamp(1.15rem,5.5vw,1.85rem)] font-black text-indigo-700 dark:text-indigo-400 tracking-normal sm:tracking-wider font-mono select-all [overflow-wrap:anywhere] break-all text-center dir-ltr leading-tight">
                                {activeFawryCode}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Phone className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                          </div>
                          <h4 className="text-indigo-900 dark:text-indigo-100 font-bold mb-4 text-sm sm:text-base">
                            {isArabic
                              ? "بانتظار التأكيد من المحفظة"
                              : "Pending Wallet Confirmation"}
                          </h4>

                          {walletQrCode && (
                            <div className="flex flex-col items-center justify-center mb-6 p-3 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/80 w-full max-w-[240px] mx-auto shadow-md relative overflow-hidden">
                              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-400 to-indigo-600"></div>
                              <div className="flex items-center gap-1.5 mb-3 text-indigo-900 dark:text-indigo-100 font-bold text-xs sm:text-sm bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full text-center">
                                <QrCode className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {isArabic
                                    ? "امسح الكود عبر محفظتك"
                                    : "Scan via Wallet App"}
                                </span>
                              </div>
                              <div className="p-2 sm:p-3 bg-white rounded-xl border border-slate-100 shadow-sm max-w-full">
                                <QRCodeSVG
                                  value={walletQrCode}
                                  size={140}
                                  level="H"
                                  className="max-w-full h-auto"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 text-start space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-[100px] pointer-events-none"></div>

                      <h4 className="text-sm font-black text-amber-500 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-pulse" />
                        {isArabic ? "الدفع قيد الانتظار!" : "Payment Pending!"}
                      </h4>

                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider shrink-0">
                          {isArabic ? "المرجع" : "Reference"}
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-slate-200 break-all text-end">
                          {directResult.transactionId &&
                          !String(directResult.transactionId).match(/[a-z]/i)
                            ? `#${directResult.transactionId}`
                            : (directResult.invoiceInfo?.invoice_id ||
                                  directResult.invoiceInfo?.invoiceId) &&
                                !String(
                                  directResult.invoiceInfo?.invoice_id ||
                                    directResult.invoiceInfo?.invoiceId,
                                ).match(/[a-z]/i)
                              ? `#${directResult.invoiceInfo.invoice_id || directResult.invoiceInfo.invoiceId}`
                              : directResult.orderNumber
                                ? `#${directResult.orderNumber}`
                                : ""}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider shrink-0">
                          {isArabic ? "طريقة الدفع" : "Payment Method"}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 text-end">
                          {directResult.invoiceInfo?.payment_method ||
                            directResult.method?.name_ar ||
                            (isArabic ? "أونلاين" : "Online")}
                        </span>
                      </div>
                      {(() => {
                        const phoneStr =
                          walletNumber ||
                          directResult?.invoiceInfo?.customerMobile ||
                          directResult?.paymentData?.customerMobile ||
                          user?.phone;
                        if (!phoneStr) return null;
                        return (
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider shrink-0">
                              {isArabic
                                ? "رقم الهاتف المحول منه"
                                : "Payer Phone Number"}
                            </span>
                            <span
                              className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200"
                              dir="ltr"
                            >
                              {phoneStr}
                            </span>
                          </div>
                        );
                      })()}
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider shrink-0">
                          {isArabic ? "تاريخ الإنشاء" : "Date Created"}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 text-end">
                          {new Date().toLocaleDateString(
                            isArabic ? "ar-EG-u-nu-latn" : "en-US",
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                        <span className="text-xs text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider shrink-0">
                          {isArabic ? "حالة الدفع" : "Payment Status"}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 text-end">
                          {(() => {
                            const isFawry = Boolean(
                              directResult.paymentData?.fawryCode ||
                              directResult.method?.payment_method_id === 3
                            );

                            if (isFawry) {
                              const fawryExpire =
                                directResult.paymentData?.expireDate ||
                                directResult.paymentData?.expirationTime ||
                                directResult.paymentData?.expire_date ||
                                directResult.paymentData?.expiryDate ||
                                directResult.paymentData?.payment_data?.expireDate ||
                                directResult.paymentData?.payment_data?.expirationTime ||
                                directResult.invoiceInfo?.payment_data?.expireDate ||
                                directResult.invoiceInfo?.expireDate;

                              return fawryExpire ? (
                                new Date(fawryExpire).toLocaleString(
                                  isArabic ? "ar-EG-u-nu-latn" : "en-US",
                                  { dateStyle: "short", timeStyle: "short" },
                                )
                              ) : (
                                new Date(
                                  new Date(
                                    directResult.createdAt || Date.now(),
                                  ).getTime() +
                                    2 * 24 * 60 * 60 * 1000,
                                ).toLocaleString(
                                  isArabic ? "ar-EG-u-nu-latn" : "en-US",
                                  { dateStyle: "short", timeStyle: "short" },
                                )
                              );
                            }

                            // Mobile Wallets (4-minute validity window as per Fawaterak / Meeza response)
                            const walletExpire =
                              directResult.paymentData?.expireDate ||
                              directResult.paymentData?.expire_date ||
                              directResult.paymentData?.expirationTime ||
                              directResult.paymentData?.expiryDate ||
                              directResult.paymentData?.payment_data?.expireDate ||
                              directResult.paymentData?.payment_data?.expire_date ||
                              directResult.paymentData?.payment_data?.expirationTime ||
                              directResult.invoiceInfo?.payment_data?.expireDate ||
                              directResult.invoiceInfo?.payment_data?.expire_date ||
                              directResult.invoiceInfo?.payment_data?.expirationTime ||
                              directResult.invoiceInfo?.expireDate ||
                              new Date(
                                new Date(
                                  directResult.createdAt || Date.now(),
                                ).getTime() +
                                  4 * 60 * 1000,
                              );

                            return (
                              <WalletCountdown
                                expireDate={walletExpire}
                                isArabic={isArabic}
                              />
                            );
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-sm text-slate-700 dark:text-slate-300 font-black">
                          {isArabic
                            ? "المبلغ الإجمالي المستحق"
                            : "Total Amount Due"}
                        </span>
                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                          {formatMoney(directResult.amount)}
                        </span>
                      </div>
                    </div>

                    {directResult.paymentData?.fawryCode && (
                      <div className="mt-6 text-xs text-slate-500 dark:text-slate-400 space-y-2 font-medium text-start bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h5 className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                          {isArabic
                            ? "تعليمات الدفع:"
                            : "Payment Instructions:"}
                        </h5>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                          <span>
                            {isArabic
                              ? "توجه إلى أقرب ماكينة فوري أو استخدم تطبيق MyFawry."
                              : "Go to the nearest Fawry machine or use MyFawry app."}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                          <span>
                            {isArabic
                              ? "اختر الدفع بكود فوري باي (FawryPay)."
                              : "Select payment using FawryPay code."}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                          <span>
                            {isArabic
                              ? "أدخل الكود المرجعي الموضح أعلاه وأتمم عملية الدفع."
                              : "Enter the reference code shown above and complete the payment."}
                          </span>
                        </div>
                      </div>
                    )}

                    {!directResult.paymentData?.fawryCode &&
                      (() => {
                        const phoneStr =
                          walletNumber ||
                          directResult?.invoiceInfo?.customerMobile ||
                          directResult?.paymentData?.customerMobile ||
                          user?.phone ||
                          "";
                        const providerAr =
                          getTelecomProvider(phoneStr, true) ||
                          "المحفظة الإلكترونية";
                        const providerEn =
                          getTelecomProvider(phoneStr, false) || "e-wallet";

                        return (
                          <div className="mt-6 text-xs text-indigo-800 dark:text-indigo-200 space-y-3 font-medium text-start bg-indigo-50/80 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                            <h5 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center gap-2">
                              <Smartphone className="w-4 h-4" />
                              {isArabic
                                ? "تعليمات الدفع عبر المحفظة الإلكترونية:"
                                : "Wallet Payment Instructions:"}
                            </h5>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                                1
                              </div>
                              <p className="mt-1">
                                {isArabic
                                  ? `افتح تطبيق ${providerAr} الخاص بك.`
                                  : `Open your ${providerEn} app.`}
                              </p>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                                2
                              </div>
                              <p className="mt-1">
                                {isArabic
                                  ? "اختر خيار الدفع عبر مسح الرمز (Scan QR) وقم بمسح الكود الموضح أعلاه."
                                  : "Select the Scan QR Code payment option and scan the code above."}
                              </p>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                                3
                              </div>
                              <p className="mt-1">
                                {isArabic ? (
                                  <>
                                    أو قم بطلب كود السحب الخاص بمحفظتك{" "}
                                    {getWalletUssdCode(phoneStr) ? (
                                      <strong
                                        className="font-mono text-indigo-700 bg-indigo-100 px-1 rounded mx-1"
                                        dir="ltr"
                                      >
                                        {getWalletUssdCode(phoneStr)}
                                      </strong>
                                    ) : (
                                      ""
                                    )}{" "}
                                    {getWalletUssdCode(phoneStr)
                                      ? `لـ ${providerAr}`
                                      : ""}{" "}
                                    لتأكيد طلب الدفع المباشر إن وصلك إشعار.
                                  </>
                                ) : (
                                  <>
                                    Alternatively, enter your wallet's PIN code{" "}
                                    {getWalletUssdCode(phoneStr) ? (
                                      <strong className="font-mono text-indigo-700 bg-indigo-100 px-1 rounded mx-1">
                                        {getWalletUssdCode(phoneStr)}
                                      </strong>
                                    ) : (
                                      ""
                                    )}{" "}
                                    {getWalletUssdCode(phoneStr)
                                      ? `for ${providerEn}`
                                      : ""}{" "}
                                    to confirm the direct payment request if you
                                    received a push notification.
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={async () => {
                          setSubmitting(true);
                          try {
                            await api.payment.cancel(directResult.intentKey);
                            setDirectResult(null);
                            setSelectedMethod(null);
                            const newUrl = new URL(window.location.href);
                            newUrl.searchParams.delete("intentKey");
                            window.history.replaceState({}, "", newUrl.toString());
                          } catch (err) {
                            setError(
                              isArabic
                                ? "فشل إلغاء الدفع"
                                : "Failed to cancel payment",
                            );
                          }
                          setSubmitting(false);
                        }}
                        disabled={submitting}
                        className="w-full sm:w-1/2 py-3 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        {submitting ? (
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        ) : isArabic ? (
                          "إلغاء طلب الدفع"
                        ) : (
                          "Cancel Payment Request"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}
    </>
  );

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 dark:from-slate-950 dark:via-indigo-950/10 dark:to-slate-900"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl sticky top-0 z-30">
        <GlobalLogo />
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>
            {isArabic
              ? "بوابة دفع مشفرة وآمنة 100%"
              : "100% Encrypted & Secured"}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3.5 sm:px-4 py-5 sm:py-10">
        {/* Title */}
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-3 shadow-inner">
            <CreditCard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">
            {isArabic ? "إتمام عملية الدفع" : "Complete Payment"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {isArabic
              ? "يرجى مراجعة تفاصيل طلبك واختيار طريقة الدفع المناسبة"
              : "Review your order details and choose a payment method"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Right Column: Order Summary (col-span-4) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                {isArabic ? "ملخص الطلب" : "Order Summary"}
              </h3>

              <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {paymentType === "subscription"
                      ? isArabic
                        ? "نوع الاشتراك"
                        : "Subscription Plan"
                      : isArabic
                        ? "رقم الطلب"
                        : "Order Number"}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {paymentType === "subscription"
                      ? planName
                      : orderNumber || (orderId ? `#${orderId?.slice(-6).toUpperCase()}` : "")}
                  </span>
                </div>
                {paymentType === "subscription" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {isArabic ? "فترة التجديد" : "Billing Period"}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {periodLabel}
                    </span>
                  </div>
                )}
                {couponCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {isArabic ? "كوبون الخصم" : "Discount Coupon"}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">
                      {couponCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Itemized Products from DB */}
              {invoice?.items && invoice.items.length > 0 && (
                <div className="border-t border-b border-slate-100 dark:border-slate-800 py-3 my-3 space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    {isArabic ? "المنتجات المطلوبة" : "Ordered Items"}
                  </span>
                  {invoice.items.map((item, idx) => {
                    const itemName = typeof item.name === "object" ? (item.name[isArabic ? "ar" : "en"] || item.name.ar || item.name.en) : item.name;
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{itemName}</span>
                          <span className="text-slate-400 font-mono">×{item.quantity}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatMoney(item.price * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pricing Breakdown from DB */}
              {(invoice?.originalAmount != null || invoice?.shippingCost != null || invoice?.discount > 0) && (
                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  {invoice?.originalAmount != null && (
                    <div className="flex justify-between">
                      <span>{isArabic ? "المجموع الفرعي" : "Subtotal"}</span>
                      <span className="font-mono">{formatMoney((invoice.originalAmount || amount) - (invoice.shippingCost || 0) + (invoice.discount || 0))}</span>
                    </div>
                  )}
                  {invoice?.shippingCost != null && Number(invoice.shippingCost) > 0 && (
                    <div className="flex justify-between">
                      <span>{isArabic ? "الشحن والتوصيل" : "Shipping"}</span>
                      <span className="font-mono">{formatMoney(invoice.shippingCost)}</span>
                    </div>
                  )}
                  {invoice?.discount != null && Number(invoice.discount) > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>{isArabic ? "قيمة الخصم" : "Discount"}</span>
                      <span className="font-mono">- {formatMoney(invoice.discount)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* REFERRAL ATTRIBUTION & DISCOUNT BREAKDOWN */}
              {invoice?.referralInfo && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 mb-4 border border-emerald-200/60 dark:border-emerald-800/40">
                  <h4 className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isArabic ? "مصدر العميل والخصومات الترويجية" : "Acquisition Source & Referral Discount"}
                  </h4>
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span>{isArabic ? "نوع المكافأة المطبقة:" : "Applied Reward:"}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {invoice.referralInfo.rewardType === "invitee_discount"
                          ? (isArabic ? "خصم دعوة أصدقاء (10%)" : "Invitee Discount (10%)")
                          : invoice.referralInfo.rewardType === "milestone_discount"
                          ? (isArabic ? "خصم إنجاز الإحالات (50%)" : "Milestone Reward (50%)")
                          : (isArabic ? `خصم تجديد شهري (${invoice.referralInfo.discountPercent}%)` : `Monthly Tier (${invoice.referralInfo.discountPercent}%)`)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isArabic ? "قيمة الخصم المقتطع:" : "Discount Amount:"}</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        -{formatMoney(invoice.referralInfo.discountAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CUSTOMER & DELIVERY INFO FROM DATABASE */}
              {(invoice?.customer || user) && (
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {isArabic ? "بيانات العميل والتوصيل" : "Customer & Delivery Details"}
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-bold truncate">
                        {invoice?.customer?.name || user?.name || user?.firstName + " " + user?.lastName}
                      </span>
                    </div>
                    {(invoice?.customer?.phone || user?.phone) && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                        <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span dir="ltr">{invoice?.customer?.phone || user?.phone}</span>
                      </div>
                    )}
                    {invoice?.customer?.address && (
                      <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                        <span className="leading-relaxed">
                          {invoice.customer.city ? `${invoice.customer.city} - ` : ""}
                          {invoice.customer.address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {isArabic ? "المبلغ الإجمالي" : "Total Amount"}
                </span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {formatMoney(amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Left Column: Payment Methods (col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            {isFree ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200 dark:border-emerald-800 p-8 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {isArabic ? "هذه العملية مجانية بالكامل (0 ج.م)" : "This transaction is 100% Free (0 EGP)"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {isArabic
                    ? "لا يتطلب اختيار وسيلة دفع. اضغط على الزر أدناه لتأكيد التفعيل فوراً."
                    : "No payment gateway required. Click below to confirm and activate immediately."}
                </p>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={submitting}
                  className="w-full max-w-sm mx-auto h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>{isArabic ? "تأكيد وتفعيل مجاناً" : "Confirm and Activate Free"}</span>
                  )}
                </button>
              </div>
            ) : methods.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {isArabic
                    ? "لا توجد طرق دفع مفعلة حالياً في المتجر."
                    : "No payment methods available right now."}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isArabic
                    ? "إذا استمرت هذه المشكلة، يرجى إعادة المحاولة أو التواصل مع إدارة المتجر."
                    : "If this persists, please try reloading or reach out to store support."}
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow cursor-pointer transition-all active:scale-95"
                >
                  {isArabic ? "إعادة المحاولة" : "Try Again"}
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                  {isArabic ? "اختر طريقة الدفع" : "Select Payment Method"}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  {[...methods]
                    .sort((a, b) => {
                      const getWeight = (m) => {
                        if (isWalletMethod(m)) return 1;
                        if (isFawryMethod(m)) return 2;
                        if (isCardMethod(m)) return 3;
                        return 4;
                      };
                      return getWeight(a) - getWeight(b);
                    })
                    .map((method) => {
                      const isSelected =
                        selectedMethod?.payment_method_id ===
                        method.payment_method_id;
                      let name = isArabic ? method.name_ar : method.name_en;
                      if (isCardMethod(method))
                        name = isArabic ? "بطاقة بنكية" : "Credit/Debit Card";
                      else if (isFawryMethod(method))
                        name = isArabic ? "فوري" : "Fawry";
                      else if (isWalletMethod(method))
                        name = isArabic ? "محفظة إلكترونية" : "Mobile Wallet";
                      const isWallet = isWalletMethod(method);

                      const isDisabled = Boolean(
                        (iframeUrl || directResult) && !isSelected
                      );

                      return (
                        <button
                          key={method.payment_method_id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (isDisabled) return;
                            if (isSelected && !directResult && !iframeUrl) {
                              setSelectedMethod(null);
                              setIframeUrl(null);
                              setError("");
                              return;
                            }
                            if (!directResult && !iframeUrl) {
                              setSelectedMethod(method);
                              setError("");
                              setIframeUrl(null);
                              if (isCardMethod(method)) {
                                handlePay(method);
                              }
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-3.5 sm:p-5 rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md ring-2 ring-indigo-600/30 dark:ring-indigo-500/40 sm:scale-[1.02]"
                              : isDisabled
                                ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 grayscale"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="w-14 h-12 sm:w-16 sm:h-14 mb-2 flex items-center justify-center shrink-0">
                            {method.logo ? (
                              <img
                                src={method.logo}
                                alt={name}
                                className="w-full h-full object-contain drop-shadow-sm"
                                onError={(e) =>
                                  (e.target.style.display = "none")
                                }
                              />
                            ) : isWallet ? (
                              <Wallet
                                className={`w-8 h-8 sm:w-10 sm:h-10 ${isSelected ? "text-indigo-600" : "text-slate-400"}`}
                              />
                            ) : (
                              <CreditCard
                                className={`w-8 h-8 sm:w-10 sm:h-10 ${isSelected ? "text-indigo-600" : "text-slate-400"}`}
                              />
                            )}
                          </div>
                          <div className="text-center w-full">
                            <p
                              className={`font-bold leading-tight line-clamp-2 transition-colors ${isSelected ? "text-sm sm:text-base text-indigo-700 dark:text-indigo-300" : "text-xs sm:text-sm text-slate-700 dark:text-slate-300"}`}
                            >
                              {name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* ACCORDION CONTENT */}
                <AnimatePresence mode="wait">
                  {selectedMethod && (
                    <motion.div
                      key={selectedMethod.payment_method_id}
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      className="overflow-hidden mb-6"
                    >
                      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900/80 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none mt-2">
                        {/* Iframe for Visa/Mastercard (Visible after Pay or Selection) */}
                        {isCardMethod(selectedMethod) && iframeUrl && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span>{isArabic ? "بوابة الدفع البنكي المشفرة (Visa / Mastercard / Meeza)" : "Secure Bank Checkout (Visa / Mastercard / Meeza)"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeCardIntentKey) {
                                      api.payment.cancel(activeCardIntentKey).catch(() => {});
                                    }
                                    setIframeUrl(null);
                                    setActiveCardIntentKey(null);
                                    setSelectedMethod(null);
                                  }}
                                  className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>{isArabic ? "إلغاء" : "Cancel"}</span>
                                </button>
                              </div>
                            </div>
                            <div
                              ref={iframeContainerRef}
                              className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg relative"
                              style={{ height: "820px", minHeight: "780px" }}
                            >
                              {iframeLoading && (
                                <div className="absolute inset-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    {isArabic ? "جاري تحميل بوابة الدفع البنكي الآمنة..." : "Loading secure payment portal..."}
                                  </p>
                                </div>
                              )}
                              <iframe
                                src={iframeUrl}
                                onLoad={() => setIframeLoading(false)}
                                className="w-full h-full border-0"
                                allow="payment"
                                allowFullScreen
                                title="Secure Payment Portal"
                              />
                            </div>
                          </div>
                        )}

                        {/* Card Loading / Retry before iframeUrl */}
                        {isCardMethod(selectedMethod) && !iframeUrl && !directResult && (
                          <div className="space-y-4">
                            {submitting ? (
                              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                  {isArabic ? "جاري تجهيز بوابة الدفع البنكي الآمنة في نفس الصفحة..." : "Preparing secure bank portal in this page..."}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {isArabic ? "يرجى الانتظار لحظات، لن تغادر الموقع." : "Please wait a moment, you will not leave the website."}
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-start mb-2">
                                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>{isArabic ? "الدفع الآمن عبر البطاقات البنكية" : "Secure Card Payment"}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {isArabic
                                      ? "سيتم فتح بوابة الدفع البنكي المشفرة والآمنة (3D-Secure) الخاصة بفيزا وماستركارد وميزة مباشرة في نفس الصفحة لإتمام السداد بكل سهولة وأمان."
                                      : "The secure 3D-Secure bank portal for Visa, Mastercard, and Meeza will open directly in this page to complete payment."}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handlePay(selectedMethod)}
                                  disabled={submitting}
                                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                                >
                                  <Lock className="w-5 h-5" />
                                  <span>
                                    {isArabic
                                      ? `فتح بوابة الدفع ودفع ${formatMoney(amount)}`
                                      : `Open Bank Portal & Pay ${formatMoney(amount)}`}
                                  </span>
                                  <ArrowRight className={`w-5 h-5 ${isArabic ? "rotate-180" : ""}`} />
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Wallet Input */}
                        {isWalletMethod(selectedMethod) && !directResult && (
                          <div>
                            <div className="flex items-center justify-between mb-2.5">
                              <label className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                {isArabic
                                  ? "رقم المحفظة الإلكترونية"
                                  : "Mobile Wallet Number"}
                              </label>
                              <div className="flex items-center gap-2">
                                {walletNumber.length >= 3 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {getTelecomProvider(walletNumber, isArabic)}
                                  </span>
                                )}
                                {walletNumber.length === 11 && (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                      isWalletValid
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                                    }`}
                                  >
                                    {isWalletValid ? (
                                      <>
                                        <Check className="w-3 h-3" />{" "}
                                        {isArabic ? "رقم صحيح" : "Valid"}
                                      </>
                                    ) : isArabic ? (
                                      "غير صالح"
                                    ) : (
                                      "Invalid"
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={walletNumber}
                              onChange={(e) =>
                                setWalletNumber(
                                  e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 11),
                                )
                              }
                              placeholder="01XXXXXXXXX"
                              dir="ltr"
                              maxLength={11}
                              className={`w-full bg-slate-50 dark:bg-slate-950 border-2 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-start text-base font-mono tracking-wider focus:outline-none transition-all shadow-inner ${
                                walletNumber.length === 11
                                  ? isWalletValid
                                    ? "border-emerald-500 focus:border-emerald-600 focus:ring-4 ring-emerald-500/10"
                                    : "border-rose-500 focus:border-rose-600 focus:ring-4 ring-rose-500/10"
                                  : "border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:ring-4 ring-indigo-600/10"
                              }`}
                            />
                            <div className="mt-2 text-[11px] font-medium text-slate-400">
                              {isArabic
                                ? "مثال: 01012345678"
                                : "Example: 01012345678"}
                            </div>
                          </div>
                        )}

                        <AnimatePresence>
                          {error && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="mt-6"
                            >
                              <ErrorNotice
                                error={error}
                                language={isArabic ? "ar" : "en"}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {directResult && renderDirectResult()}

                        {/* Pay Button inside accordion (for non-card methods: Fawry, Wallets) */}
                        {!iframeUrl && !directResult && !isCardMethod(selectedMethod) && (
                          <button
                            type="button"
                            onClick={() => handlePay()}
                            disabled={
                              submitting ||
                              !selectedMethod ||
                              (needsWallet(selectedMethod) && !isWalletValid)
                            }
                            className="w-full mt-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>
                                  {isArabic
                                    ? "جاري التجهيز..."
                                    : "Processing..."}
                                </span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-5 h-5" />
                                <span>
                                  {isFawryMethod(selectedMethod)
                                    ? isArabic
                                      ? "إنشاء كود الدفع المرجعي"
                                      : "Generate Reference Code"
                                    : isArabic
                                      ? `تأكيد ودفع ${formatMoney(amount)}`
                                      : `Confirm & Pay ${formatMoney(amount)}`}
                                </span>
                                <ArrowRight
                                  className={`w-5 h-5 ${isArabic ? "rotate-180" : ""}`}
                                />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => navigate("/u")}
                  className="w-full mt-4 py-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors text-center"
                >
                  {isArabic
                    ? "إلغاء والعودة للوحة التحكم"
                    : "Cancel & back to dashboard"}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
