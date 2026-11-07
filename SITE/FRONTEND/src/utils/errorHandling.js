import { getTranslation } from "../i18n/index.js";

const messageTranslations = [
  [/valid email|invalid email address/, "invalidEmail"],
  [
    /email is already in use|email is already registered|email already exists/,
    "emailInUse",
  ],
  [/email is not registered|email is not found/, "emailNotRegistered"],
  [
    /invalid or expired code|code is invalid or expired|invalid code|كود غير صحيح/,
    "invalidCode",
  ],
  [/too many invalid attempts|too many attempts/, "tooManyAttempts"],
  [/please wait before requesting another code/, "waitBeforeRetry"],
  [/username is already taken|username already exists/, "usernameTaken"],
  [/only one secondary email/, "onlyOneSecondaryEmail"],
  [/invalid coupon|coupon.*expired|الكوبون غير صالح/, "invalidCoupon"],
  [/حجم الصورة أكبر/, "imageTooLarge"],
  [/أبعاد الغلاف غير صالحة/, "invalidCoverDimensions"],
  [/فشل رفع الصورة|image upload failed/, "uploadFailed"],
  [/google authentication failed/, "authenticationFailed"],
  [
    /account_has_pending_payments|cannot delete account while.+(unpaid|pending)/,
    "accountPendingPayments",
  ],
  [/timeout|timed out|econnaborted/, "timeout"],
  [/service is unavailable|service unavailable|غير متاحة حالياً|service_unavailable/i, "serviceUnavailable"],
];

const statusTranslations = {
  400: "badRequest",
  401: "unauthorized",
  403: "forbidden",
  404: "notFound",
  409: "conflict",
  422: "validation",
  429: "rateLimited",
};

function getRawMessage(error) {
  let raw = "";
  if (typeof error === "string") raw = error;
  else if (error) {
    const data = error?.response?.data;
    const apiError = data?.error;
    if (typeof apiError === "string") raw = apiError;
    else {
      const msg = apiError?.message || data?.message || error?.message;
      if (typeof msg === "string") raw = msg;
      else if (typeof error?.error === "string") raw = error.error;
    }
  }

  if (raw && typeof raw === "string") {
    // If raw message contains JSON like {"error_message": "..."}, unwrap it
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const inner = parsed.error_message || parsed.errorMessage || parsed.message || parsed.data;
        if (inner && typeof inner === "string") return inner;
      } catch {}
    }
    return raw.replace(/^Fawaterak:\s*/i, "");
  }
  return "";
}

export function getLocalizedErrorMessage(error, language) {
  const activeLanguage =
    language ||
    (typeof document !== "undefined" ? document.documentElement.lang : "ar") ||
    "ar";
  const t = getTranslation(activeLanguage);
  const translateError = (key) => t(`panel.errors.${key}`);
  const rawMessage = getRawMessage(error).trim();
  const normalizedMessage = rawMessage.toLowerCase();
  const code = String(error?.response?.data?.error?.code || error?.code || "");
  const status = error?.status || error?.response?.status;

  if (code.startsWith("DUPLICATE_") || code === "DUPLICATE_VALUE") {
    return translateError("conflict");
  }
  if (code.includes("TOO_MANY") || code.includes("RATE_LIMIT")) {
    return translateError("rateLimited");
  }

  // If there is a direct raw error message from the API, return it directly
  if (rawMessage) {
    return rawMessage
      .replace(/بوابة\s+الدفع/gi, "الخدمة")
      .replace(/بوابة\s+دفع/gi, "وسيلة دفع")
      .replace(/payment\s+gateway/gi, "payment service")
      .trim();
  }

  const translatedMessage = messageTranslations.find(([pattern]) =>
    pattern.test(normalizedMessage),
  );
  if (translatedMessage) return translateError(translatedMessage[1]);

  if (/^errors\.[a-zA-Z0-9_.]+$/.test(rawMessage)) {
    const translatedKey = t(`panel.${rawMessage}`);
    if (translatedKey !== rawMessage) return translatedKey;
  }

  if (code === "ECONNABORTED" || error?.code === "ECONNABORTED") {
    return translateError("timeout");
  }

  if (rawMessage) {
    return rawMessage;
  }

  const statusKey = statusTranslations[status];
  if (statusKey) return translateError(statusKey);
  if (status >= 500) return translateError("server");
  if (error?.code === "ECONNABORTED") return translateError("timeout");
  if (
    error?.isAxiosError ||
    error?.code === "ERR_NETWORK" ||
    normalizedMessage === "network error"
  ) {
    return translateError("network");
  }
  if (!error?.response && error && rawMessage) return translateError("generic");
  return translateError("generic");
}
