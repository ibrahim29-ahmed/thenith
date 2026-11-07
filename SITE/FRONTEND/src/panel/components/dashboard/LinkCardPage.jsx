/**
 * LinkCardPage.jsx
 *
 * Physical NFC Card Registry — User Dashboard Page
 * ─────────────────────────────────────────────────
 * Allows the user to:
 *   1. Scan a physical Thenith NFC card → reads the URL written on it
 *   2. Backend verifies the URL belongs to THIS user's profile
 *   3. Card is registered in the user's physical card inventory
 *   4. User can manage (view/delete) their registered physical cards
 *
 * Security:
 *   - Backend validates URL hostname (must be Thenith domain)
 *   - Backend verifies URL path matches authenticated user's username/publicId
 *   - Frontend never decides ownership — only reads and sends the URL
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  XCircle,
  CreditCard,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  Pencil,
} from "lucide-react";
import api from "../../../api/index.js";

// ── NFC Support Detection (feature detection only, never UA sniffing) ─────────
const NFC_SUPPORT = typeof window !== "undefined" && "NDEFReader" in window;

const STATUS = {
  IDLE: "idle",
  SCANNING: "scanning",
  REGISTERING: "registering",
  SUCCESS: "success",
  ERROR: "error",
};

function formatDate(dateStr, isArabic) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(isArabic ? "ar-EG-u-nu-latn" : "en-US", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function resolveError(err, isArabic) {
  const name  = err?.name || "";
  const code  = err?.response?.data?.error || "";
  const msg   = String(err?.message || "").toLowerCase();

  if (code === "URL_NOT_YOURS")
    return isArabic
      ? "الرابط على الكارت لا ينتمي لحسابك. تأكد أنك تسحب كارتك الصحيح."
      : "The URL on this card doesn't belong to your account.";

  if (code === "PROFILE_NOT_FOUND")
    return isArabic
      ? "لم يُعثر على بروفايل مرتبط بهذا الرابط. تأكد من صحة الكارت."
      : "No profile found for this card's URL. Make sure it's a valid Thenith card.";

  if (code === "FOREIGN_DOMAIN")
    return isArabic
      ? "الكارت لا يحتوي على رابط Thenith. تأكد أن الكارت من عندنا."
      : "This card doesn't contain a Thenith link.";

  if (code === "INVALID_PROFILE_URL" || code === "INVALID_URL")
    return isArabic
      ? "الرابط على الكارت غير صالح."
      : "The URL on this card is invalid.";

  if (name === "NotAllowedError" || msg.includes("permission"))
    return isArabic
      ? "تم رفض إذن NFC. اسمح بالوصول في إعدادات المتصفح."
      : "NFC permission denied. Allow access in browser settings.";

  if (name === "AbortError")
    return isArabic ? "تم إلغاء العملية." : "Operation cancelled.";

  if (name === "NotSupportedError")
    return isArabic
      ? "الكارت لا يحتوي على بيانات NFC مدعومة."
      : "Card doesn't contain supported NFC data.";

  return isArabic
    ? "حدث خطأ. حاول مرة أخرى."
    : "An error occurred. Please try again.";
}

export default function LinkCardPage({ t, language }) {
  const isArabic = language === "ar" || !language;

  const [physicalCards, setPhysicalCards] = useState([]);
  const [loadingCards, setLoadingCards]   = useState(true);
  const [scanStatus, setScanStatus]       = useState(STATUS.IDLE);
  const [errorMsg, setErrorMsg]           = useState("");
  const [lastAdded, setLastAdded]         = useState(null);
  const [deletingId, setDeletingId]       = useState(null);
  const [abortCtrl, setAbortCtrl]         = useState(null);
  const [showScanner, setShowScanner]     = useState(false);

  // Load registered physical cards on mount
  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    setLoadingCards(true);
    try {
      const res = await api.cards.listPhysicalCards();
      setPhysicalCards(res?.data || []);
    } catch {
      setPhysicalCards([]);
    } finally {
      setLoadingCards(false);
    }
  };

  // Cleanup NFC on unmount
  useEffect(() => () => abortCtrl?.abort(), [abortCtrl]);

  const handleScan = useCallback(async () => {
    if (!NFC_SUPPORT) return;
    setScanStatus(STATUS.SCANNING);
    setErrorMsg("");
    setLastAdded(null);

    const ac = new AbortController();
    setAbortCtrl(ac);

    try {
      // eslint-disable-next-line no-undef
      const ndef = new NDEFReader();
      await ndef.scan({ signal: ac.signal });

      const scanData = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), 30000);

        ndef.onreadingerror = (e) => {
          clearTimeout(timer);
          reject(e);
        };

        ndef.onreading = (event) => {
          clearTimeout(timer);
          const decoder = new TextDecoder();

          // ── Collect serial number (tag UID) ───────────────────────────
          const serialNumber = event.serialNumber || null;

          // ── Decode all NDEF records ────────────────────────────────────
          const ndefRecords = Array.from(event.message.records).map(record => {
            let data = null;
            try {
              if (
                record.recordType === "url" ||
                record.recordType === "absolute-url" ||
                record.recordType === "text" ||
                record.recordType === "mime"
              ) {
                data = decoder.decode(record.data);
              }
            } catch { /* non-decodable binary record */ }

            return {
              recordType: record.recordType,
              mediaType:  record.mediaType  || null,
              id:         record.id ? decoder.decode(record.id) : null,
              encoding:   record.encoding   || null,
              lang:       record.lang        || null,
              data,
            };
          });

          // ── Find the primary URL record ────────────────────────────────
          const urlRecord = ndefRecords.find(
            r => r.recordType === "url" || r.recordType === "absolute-url"
          );

          if (!urlRecord?.data) {
            reject(new Error("NO_URL_RECORD"));
            return;
          }

          // ── Build scan metadata ────────────────────────────────────────
          const scanMeta = {
            recordCount: ndefRecords.length,
            scannedAt:   new Date().toISOString(),
            userAgent:   navigator.userAgent,
          };

          resolve({ scannedUrl: urlRecord.data, serialNumber, ndefRecords, scanMeta });
        };
      });

      // Send to backend for verification & registration with full card data
      setScanStatus(STATUS.REGISTERING);
      const res = await api.cards.registerPhysicalCard(
        scanData.scannedUrl,
        "",
        scanData.serialNumber,
        scanData.ndefRecords,
        scanData.scanMeta
      );
      const card = res?.data;

      setLastAdded(card);
      setPhysicalCards(prev => {
        const filtered = prev.filter(c => c._id !== card._id);
        return [card, ...filtered];
      });
      setScanStatus(STATUS.SUCCESS);
      setShowScanner(false);
    } catch (err) {
      if (err?.name === "AbortError") {
        setScanStatus(STATUS.IDLE);
        return;
      }
      setErrorMsg(resolveError(err, isArabic));
      setScanStatus(STATUS.ERROR);
    }
  }, [isArabic]);


  const cancelScan = () => {
    abortCtrl?.abort();
    setAbortCtrl(null);
    setScanStatus(STATUS.IDLE);
    setErrorMsg("");
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.cards.deletePhysicalCard(id);
      setPhysicalCards(prev => prev.filter(c => c._id !== id));
    } catch {
      // Silently fail or show toast
    } finally {
      setDeletingId(null);
    }
  };

  const resetScanner = () => {
    setScanStatus(STATUS.IDLE);
    setErrorMsg("");
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6" dir={isArabic ? "rtl" : "ltr"}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          {isArabic ? "كروتي الفيزيائية" : "My Physical Cards"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isArabic
            ? "سجّل كروت NFC الفيزيائية المرتبطة بحسابك وأدرها من هنا."
            : "Register and manage your physical Thenith NFC cards."}
        </p>
      </div>

      {/* ── Add Card Button ─────────────────────────────────────────────── */}
      {!showScanner && (
        <button
          onClick={() => { setShowScanner(true); resetScanner(); }}
          disabled={!NFC_SUPPORT}
          title={!NFC_SUPPORT ? (isArabic ? "NFC غير متوفر على هذا الجهاز" : "NFC not available on this device") : ""}
          className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all border-2 border-dashed
            ${NFC_SUPPORT
              ? "border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-400"
              : "border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
            }`}
        >
          <Plus className="w-5 h-5" />
          {isArabic ? "إضافة كارت جديد" : "Add New Card"}
        </button>
      )}

      {/* ── NFC Unavailable notice ──────────────────────────────────────── */}
      {!NFC_SUPPORT && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <WifiOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {isArabic ? "NFC غير متوفر" : "NFC Not Available"}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              {isArabic
                ? "ميزة NFC غير متوفرة على جهازك أو المتصفح الحالي. استخدم Chrome على Android."
                : "NFC is not available on your device or browser. Use Chrome on Android."}
            </p>
          </div>
        </div>
      )}

      {/* ── Scanner Panel ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm text-center space-y-5"
          >
            {/* IDLE — ready to scan */}
            {scanStatus === STATUS.IDLE && (
              <>
                <div className="mx-auto w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                  <Wifi className="w-9 h-9 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-black text-slate-800 dark:text-white text-lg">
                    {isArabic ? "جاهز لمسح الكارت" : "Ready to Scan"}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {isArabic
                      ? "اضغط «ابدأ المسح» ثم قرّب كارت Thenith من الهاتف"
                      : "Press «Start Scan» then bring your Thenith card close"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleScan}
                    className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition-colors">
                    {isArabic ? "ابدأ المسح" : "Start Scan"}
                  </button>
                  <button onClick={() => setShowScanner(false)}
                    className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-sm transition-colors">
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </>
            )}

            {/* SCANNING */}
            {scanStatus === STATUS.SCANNING && (
              <>
                <div className="mx-auto relative w-24 h-24 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-indigo-100 dark:bg-indigo-900/40 animate-ping opacity-60" />
                  <span className="absolute inset-4 rounded-full bg-indigo-200 dark:bg-indigo-800/50 animate-ping opacity-50" style={{ animationDelay: "200ms" }} />
                  <div className="relative w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                    <Wifi className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <p className="font-black text-slate-800 dark:text-white">
                    {isArabic ? "قرّب الكارت من الهاتف" : "Bring card close to phone"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {isArabic ? "ضع الكارت خلف الهاتف مباشرةً" : "Place card behind your phone"}
                  </p>
                </div>
                <button onClick={cancelScan} className="text-sm text-slate-400 hover:text-slate-600 transition-colors underline">
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
              </>
            )}

            {/* REGISTERING */}
            {scanStatus === STATUS.REGISTERING && (
              <>
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  {isArabic ? "جارٍ التحقق من الكارت..." : "Verifying card..."}
                </p>
              </>
            )}

            {/* SUCCESS */}
            {scanStatus === STATUS.SUCCESS && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                </div>
                <p className="font-black text-slate-800 dark:text-white">
                  {isArabic ? "تم تسجيل الكارت بنجاح! ✅" : "Card registered successfully! ✅"}
                </p>
                <button onClick={resetScanner}
                  className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  {isArabic ? "مسح كارت آخر" : "Scan another card"}
                </button>
              </>
            )}

            {/* ERROR */}
            {scanStatus === STATUS.ERROR && (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
                  <XCircle className="w-9 h-9 text-rose-500" />
                </div>
                <div>
                  <p className="font-black text-slate-800 dark:text-white mb-1">
                    {isArabic ? "فشل التحقق" : "Verification Failed"}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{errorMsg}</p>
                </div>
                <button onClick={resetScanner}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition-colors">
                  {isArabic ? "حاول مرة أخرى" : "Try Again"}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Registered Cards List ───────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {isArabic ? "الكروت المسجلة" : "Registered Cards"}
            {physicalCards.length > 0 && (
              <span className="mr-2 rtl:mr-0 rtl:ml-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-black px-2 py-0.5 rounded-full">
                {physicalCards.length}
              </span>
            )}
          </h2>
          {physicalCards.length > 0 && (
            <button onClick={loadCards} className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              {isArabic ? "تحديث" : "Refresh"}
            </button>
          )}
        </div>

        {loadingCards ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
          </div>
        ) : physicalCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">
              {isArabic ? "لا يوجد كروت مسجلة بعد" : "No cards registered yet"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-600">
              {isArabic ? "أضف كارتك الفيزيائي بالضغط على «إضافة كارت جديد»" : "Add your physical card using the button above"}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {physicalCards.map((card) => (
              <motion.div
                key={card._id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl group"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-white text-sm truncate">
                    {card.label || (isArabic ? "كارت Thenith" : "Thenith Card")}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate font-mono" dir="ltr">
                    {card.scannedUrl}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                    <span className="text-xs text-slate-400 dark:text-slate-600">
                      {formatDate(card.createdAt, isArabic)}
                    </span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(card._id)}
                  disabled={deletingId === card._id}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all shrink-0"
                >
                  {deletingId === card._id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
