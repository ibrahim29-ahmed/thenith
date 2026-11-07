import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  QrCode,
  X,
  Camera,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Keyboard,
} from "lucide-react";

/**
 * Parses card QR code text to extract the most useful search identifier:
 * - If URL e.g. https://thenith.com/c/tm13if -> returns 'tm13if'
 * - If URL e.g. https://thenith.com/p/36gq1h -> returns '36gq1h'
 * - If raw code e.g. THN-C-N9ZEAL -> returns 'THN-C-N9ZEAL'
 */
export function extractCardQrValue(raw) {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1];
      }
    }
  } catch {}

  // Handles prefixes like "card:tm13if" or "id: tm13if"
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length === 2 && parts[1].trim()) {
      return parts[1].trim();
    }
  }

  return trimmed;
}

export default function CardQrScannerModal({ isOpen, onClose, onScan }) {
  const [activeTab, setActiveTab] = useState("camera"); // 'camera' | 'file' | 'manual'
  const [cameraError, setCameraError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scannedResult, setScannedResult] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const html5QrCodeRef = useRef(null);
  const containerId = "dash-card-qr-reader";
  const isStoppingRef = useRef(false);

  // Play audio beep upon successful QR detection
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  };

  const handleDetected = useCallback((decodedText) => {
    playBeep();
    const finalValue = extractCardQrValue(decodedText);
    setScannedResult(finalValue);

    // Stop scanner cleanly
    if (html5QrCodeRef.current && isScanning && !isStoppingRef.current) {
      isStoppingRef.current = true;
      html5QrCodeRef.current
        .stop()
        .catch(() => {})
        .finally(() => {
          setIsScanning(false);
          isStoppingRef.current = false;
        });
    }

    setTimeout(() => {
      onScan(finalValue, decodedText);
      onClose();
    }, 400);
  }, [isScanning, onScan, onClose]);

  // Stop camera helper
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch {}
      try {
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setIsStarting(false);
  }, []);

  // Start camera scanner
  const startCamera = useCallback(async (cameraId = null) => {
    try {
      setCameraError("");
      setIsStarting(true);

      // Stop any existing session
      await stopCamera();

      // Wait brief tick for DOM container to exist
      await new Promise((r) => setTimeout(r, 100));

      const elem = document.getElementById(containerId);
      if (!elem) {
        setIsStarting(false);
        return;
      }

      const scanner = new Html5Qrcode(containerId);
      html5QrCodeRef.current = scanner;

      // Enumerate available video inputs
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
        }
      } catch {}

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: "environment" };

      await scanner.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDetected(decodedText);
        },
        () => {
          // Frame misses (expected while seeking QR)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.warn("Camera start failed:", err);
      setCameraError(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "تم رفض إذن الكاميرا. يرجى منح صلاحية الوصول للكاميرا في المتصفح أو استخدام رفع صورة الـ QR."
          : "تعذر تشغيل الكاميرا حالياً. تأكد من عدم استخدامها في تطبيق آخر أو استخدم رفع صورة."
      );
    } finally {
      setIsStarting(false);
    }
  }, [handleDetected, stopCamera]);

  // Switch between back and front camera if multiple are available
  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const nextIdx = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIdx);
    await startCamera(cameras[nextIdx].id);
  };

  // Handle scanning an image file
  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCameraError("");
      await stopCamera();

      const scanner = new Html5Qrcode("dash-qr-file-anchor");
      const decoded = await scanner.scanFile(file, true);
      handleDetected(decoded);
    } catch (err) {
      setCameraError("لم يتم العثور على رمز QR صالح في الصورة المحددة. يرجى تجربة صورة أوضح.");
    }
  };

  // Handle manual submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetected(manualCode);
  };

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCameraError("");
      setScannedResult(null);
      setManualCode("");
      setActiveTab("camera");
      // Does not auto-start camera immediately; user clicks button to open
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden relative">
        {/* Hidden anchor for file scans */}
        <div id="dash-qr-file-anchor" className="hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">مسح رمز QR للكارت</h3>
              <p className="text-xs text-slate-500">امسح كارت NFC أو QR للبحث الفوري عنه</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 m-4 bg-slate-100 rounded-2xl text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab("camera");
              startCamera();
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "camera"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>كاميرا</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("file");
              stopCamera();
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "file"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>رفع صورة</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("manual");
              stopCamera();
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>كتابة الكود</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 pt-0 space-y-4">
          {/* TAB 1: LIVE CAMERA SCANNER */}
          {activeTab === "camera" && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square flex items-center justify-center border-2 border-slate-200 shadow-inner">
                {/* HTML5 QR Container Target */}
                <div id={containerId} className="w-full h-full" />

                {/* Idle / Click to Open Camera Overlay */}
                {!isScanning && !isStarting && !scannedResult && (
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center text-white gap-4 z-10">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400 shadow-inner">
                        <Camera className="w-10 h-10" />
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500"></span>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">المسح عبر كاميرا الجهاز</h4>
                      <p className="text-xs text-slate-400 max-w-[240px]">
                        انقر على الزر بالأسفل لتشغيل الكاميرا وتوجيهها نحو رمز QR الموجود على الكارت
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>فتح الكاميرا للمسح</span>
                    </button>
                  </div>
                )}

                {/* Laser Overlay scanning effect */}
                {isScanning && !scannedResult && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* Viewfinder box */}
                    <div className="w-56 h-56 border-2 border-dashed border-indigo-400/80 rounded-2xl relative shadow-lg">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 rounded-tl" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 rounded-br" />
                      {/* Laser Bar */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-lg shadow-indigo-500 animate-pulse mt-28" />
                    </div>
                  </div>
                )}

                {/* Starting / Loading Overlay */}
                {isStarting && (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-white gap-2 z-20">
                    <RefreshCw className="w-7 h-7 animate-spin text-indigo-400" />
                    <span className="text-xs font-medium text-slate-300">جاري تشغيل الكاميرا...</span>
                  </div>
                )}

                {/* Scanned Success Overlay */}
                {scannedResult && (
                  <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center text-white gap-2 animate-in fade-in z-20">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                    <span className="text-sm font-bold text-emerald-300">تم التعرف على الكارت بنجاح!</span>
                    <span className="text-xs text-emerald-200/80">جاري فتح تفاصيل الكارت مباشرة...</span>
                    <span className="font-mono text-xs bg-emerald-900/60 px-3 py-1 rounded-lg border border-emerald-500/30">
                      {scannedResult}
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Actions & Switch Button */}
              {isScanning && (
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>وجّه الكاميرا نحو رمز QR الموجود على الكارت</span>
                  <div className="flex items-center gap-3">
                    {cameras.length > 1 && (
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>تبديل الكاميرا</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                    >
                      إيقاف الكاميرا
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeTab === "file" && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 hover:bg-indigo-50/30">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800 mb-1">انقر لاختيار صورة من جهازك</span>
                <span className="text-[11px] text-slate-400">يدعم PNG أو JPG تحتوي على رمز QR للكارت</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileScan}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* TAB 3: MANUAL INPUT */}
          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  أدخل رابط الكارت أو المعرف (Public ID / Card ID):
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="مثال: tm13if أو THN-C-N9ZEAL أو https://thenith.com/c/tm13if"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <span>تطبيق البحث</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Error Message */}
          {cameraError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{cameraError}</span>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            يتم فك الرابط تلقائياً والبحث عن الكارت المرتبط به
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

