/**
 * src/components/PaymentErrorNotice.jsx
 *
 * Simple & Compact Fawaterak Error Alert (Arabic & English Responsive)
 * ────────────────────────────────────────────────────────────────────
 * Displays the direct payment error concisely and seamlessly in both
 * Arabic and English, with proper text direction, typography, and no
 * mention of "بوابة دفع" / "payment gateway".
 */

import React from "react";
import { CircleAlert } from "lucide-react";
import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";

// Bilingual translations for Fawaterak API error codes & messages
const fawaterakTranslations = [
  {
    pattern: /mobile.*wallet.*11|wallet.*digit|invalid.*wallet.*number|mobilewalletnumber|رقم المحفظة غير صحيح/i,
    ar: "رقم المحفظة الإلكترونية غير صحيح. يجب أن يتكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015.",
    en: "Invalid mobile wallet number. It must be an 11-digit Egyptian mobile number starting with 010, 011, 012, or 015.",
  },
  {
    pattern: /wallet.*not.*registered|wallet.*not.*found|cannot accept transaction|المحفظة غير مسجلة|غير مسجل في خدمة/i,
    ar: "رقم الهاتف غير مسجل في خدمة المحافظ الإلكترونية أو لا يمكنه استلام طلبات الدفع حالياً.",
    en: "This mobile number is not registered for mobile wallet services or cannot accept payments right now.",
  },
  {
    pattern: /insufficient.*(balance|funds)|not enough.*balance|low balance|رصيد.*غير كافٍ|الرصيد غير كاف/i,
    ar: "الرصيد المتوفر غير كافٍ لإتمام هذه المعاملة.",
    en: "Insufficient funds to complete this transaction.",
  },
  {
    pattern: /timeout.*(confirm|customer)|customer.*took too long|wallet.*request.*timeout|انتهت مهلة تأكيد/i,
    ar: "انتهت مهلة تأكيد عملية الدفع على الهاتف (5 دقائق). يرجى إعادة المحاولة والموافقة فوراً.",
    en: "Payment confirmation timed out on your phone (5 minutes). Please try again and approve promptly.",
  },
  {
    pattern: /user.*(rejected|declined)|customer.*declined|transaction rejected|تم رفض عملية الدفع من هاتفك/i,
    ar: "تم رفض عملية الدفع من هاتفك المحمول.",
    en: "The payment request was declined from your phone.",
  },
  {
    pattern: /declined by issuer|do not honor|bank.*decline|transaction declined|تم رفض المعاملة من البنك/i,
    ar: "تم رفض المعاملة من البنك المصدر للبطاقة. يرجى التواصل مع البنك لتفعيل الشراء أونلاين أو تجربة بطاقة أخرى.",
    en: "Card declined by the issuing bank. Please contact your bank to enable online purchases or try another card.",
  },
  {
    pattern: /expired.*card|card.*expired|منتهية الصلاحية/i,
    ar: "تاريخ صلاحية البطاقة البنكية منتهٍ. يرجى استخدام بطاقة سارية.",
    en: "The bank card has expired. Please use a valid card.",
  },
  {
    pattern: /invalid.*cvv|cvv.*failed|security code|كود الأمان/i,
    ar: "كود الأمان (CVV) المكون من 3 أرقام الموجود خلف البطاقة غير صحيح.",
    en: "The 3-digit security code (CVV) on the back of your card is incorrect.",
  },
  {
    pattern: /3d.*secure|otp.*failed|authentication failed|failed.*3ds|فشلت المصادقة البنكية/i,
    ar: "فشلت المصادقة البنكية (رمز OTP). يرجى التأكد من كتابة الرمز بشكل صحيح.",
    en: "3D-Secure authentication (OTP) failed. Please ensure the code is entered correctly.",
  },
  {
    pattern: /limit.*exceeded|withdrawal.*limit|frequency exceeded|تجاوز الحد الأقصى/i,
    ar: "تم تجاوز الحد الأقصى للمشتريات المسموح به للبطاقة أو المحفظة.",
    en: "Transaction limit exceeded for this card or wallet.",
  },
  {
    pattern: /service is unavailable|service unavailable|method.*not available|system.*down|غير متاحة حالياً/i,
    ar: "وسيلة الدفع هذه غير متاحة حالياً للصيانة. يرجى اختيار وسيلة دفع أخرى.",
    en: "This payment method is temporarily unavailable. Please choose another method.",
  },
  {
    pattern: /minimum.*amount|cart.*total.*greater|less than minimum|الحد الأدنى/i,
    ar: "الحد الأدنى لعملية الدفع هو 5 جنيهات مصرية.",
    en: "The minimum payment amount is 5 EGP.",
  },
  {
    pattern: /user.*cancelled|customer.*cancelled|transaction cancelled|تم إلغاء/i,
    ar: "تم إلغاء عملية الدفع بناءً على طلبك.",
    en: "The payment was cancelled.",
  },
  {
    pattern: /econnaborted|timeout|timed out|وقتاً أطول/i,
    ar: "استغرقت العملية وقتاً أطول من المتوقع دون خصم أي مبالغ. يرجى المحاولة مجدداً.",
    en: "The operation took longer than expected. No charges were made, please try again.",
  },
  {
    pattern: /عملية الدفع هذه قيد الانتظار|مقيدة بوسيلة الدفع|لديك طلب.*معلق/i,
    ar: "لديك طلب دفع معلق مسبقاً. يجب إكمال الدفع أو إلغاء الطلب السابق أولاً.",
    en: "You have an active pending payment. Please complete or cancel it first.",
  },
];

function sanitizePaymentError(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/بوابة\s+الدفع/gi, "الخدمة")
    .replace(/بوابة\s+دفع/gi, "وسيلة دفع")
    .replace(/payment\s+gateway/gi, "payment service")
    .trim();
}

function localizeError(raw, isArabic) {
  if (!raw) return "";
  const clean = sanitizePaymentError(raw);
  const lower = clean.toLowerCase();

  // Check matching pattern for bilingual translation
  for (const item of fawaterakTranslations) {
    if (item.pattern.test(lower)) {
      return isArabic ? item.ar : item.en;
    }
  }

  // If already matches desired language alphabet, return as is
  const hasArabic = /[\u0600-\u06FF]/.test(clean);
  if (isArabic && hasArabic) return clean;
  if (!isArabic && !hasArabic) return clean;

  return clean;
}

export default function PaymentErrorNotice({
  error,
  language,
  className = "",
}) {
  const { language: globalLang } = useGlobalLanguage?.() || {};
  if (!error) return null;

  // Determine effective language
  const activeLang = language || globalLang || (typeof document !== "undefined" ? document.documentElement.lang : "ar") || "ar";
  const isArabic = activeLang === "ar";

  // Extract raw error from API response
  let raw = "";
  if (typeof error === "string") {
    raw = error;
  } else if (error) {
    const data = error?.response?.data;
    raw =
      data?.error ||
      data?.message ||
      data?.error_message ||
      data?.errorMessage ||
      error?.message ||
      "";
  }

  if (typeof raw === "object" && raw !== null) {
    raw = raw.message || raw.error || JSON.stringify(raw);
  }

  // Unwrap JSON if present
  if (typeof raw === "string" && raw.includes("{")) {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        raw =
          parsed.error_message ||
          parsed.errorMessage ||
          parsed.message ||
          parsed.error ||
          (parsed.errors ? Object.values(parsed.errors)[0]?.[0] : null) ||
          raw;
      }
    } catch {}
  }

  const cleanRaw = String(raw || "").replace(/^Fawaterak:\s*/i, "").trim();
  const message = localizeError(cleanRaw, isArabic);

  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      dir={isArabic ? "rtl" : "ltr"}
      className={`flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 text-start ${className}`}
    >
      <CircleAlert className="h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
      <span className="leading-relaxed flex-1 break-words">{message}</span>
    </div>
  );
}
