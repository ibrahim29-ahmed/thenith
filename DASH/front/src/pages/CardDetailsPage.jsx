import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  CreditCard,
  QrCode,
  ArrowRight,
  Copy,
  Check,
  Download,
  AlertTriangle,
  User,
  UserCheck,
  ExternalLink,
  Loader2,
  Clock,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Unlink,
  Link2,
  Ban,
  ShieldAlert,
  Phone,
  Mail,
  MapPin,
  Globe,
  Briefcase,
  MessageSquare,
  Share2,
  KeyRound,
  Printer,
  Package,
} from "lucide-react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import {
  fetchPhysicalCardDetails,
  fetchPhysicalCardLogs,
  updatePhysicalCardStatus,
  updatePhysicalCardDetails,
  unlinkPhysicalCard,
  deletePhysicalCard,
} from "../services/adminApi.js";

export default function CardDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [card, setCard] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);

  // Edit targetUrl
  const [targetUrlInput, setTargetUrlInput] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState("");

  // Status toggle modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Unlink modal
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Operational status toggle
  const [togglingOperationalStatus, setTogglingOperationalStatus] = useState(false);

  const handleOperationalStatusChange = async (newStatus) => {
    if (!card?._id || togglingOperationalStatus) return;
    const nextStatus = newStatus || "";
    const nextIsPrinting = nextStatus === "in_printing";
    setTogglingOperationalStatus(true);
    setCard((prev) => ({
      ...prev,
      operationalStatus: nextStatus,
      isPrinting: nextIsPrinting,
    }));

    try {
      await updatePhysicalCardDetails(card._id, {
        operationalStatus: nextStatus,
        isPrinting: nextIsPrinting,
      });
    } catch (err) {
      setCard((prev) => ({
        ...prev,
        operationalStatus: card.operationalStatus || (card.isPrinting ? "in_printing" : ""),
        isPrinting: Boolean(card.isPrinting),
      }));
      alert(err.response?.data?.error || err.message || "فشل تحديث الحالة");
    } finally {
      setTogglingOperationalStatus(false);
    }
  };

  const canvasRef = useRef(null);

  const loadCardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [resCard, resLogs] = await Promise.all([
        fetchPhysicalCardDetails(id),
        fetchPhysicalCardLogs(id),
      ]);
      if (resCard.success) {
        setCard(resCard.card);
        setTargetUrlInput(resCard.card.targetUrl || "");
      }
      if (resLogs.success) setLogs(resLogs.logs);
    } catch (err) {
      setError(err.message || "فشل تحميل تفاصيل الكارت");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCardData();
  }, [loadCardData]);

  const handleSaveTargetUrl = async (e) => {
    e.preventDefault();
    try {
      setSavingTarget(true);
      const res = await updatePhysicalCardDetails(id, { targetUrl: targetUrlInput.trim() });
      if (res.success) {
        setCard(res.card);
        setTargetUrlInput(res.card.targetUrl || "");
        setEditSuccessMsg("تم حفظ رابط التوجيه بنجاح!");
        setTimeout(() => setEditSuccessMsg(""), 3000);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message || "فشل حفظ رابط التوجيه";
      alert(msg);
    } finally {
      setSavingTarget(false);
    }
  };

  // Canonical Static URL from .env
  const siteBaseUrl = (import.meta.env.VITE_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const staticUrl = card?.cardUrl || (card?.publicId ? `${siteBaseUrl}/c/${card.publicId}` : "");

  const copyUrl = () => {
    if (!staticUrl) return;
    navigator.clipboard.writeText(staticUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPng = () => {
    const canvas = document.getElementById("qr-details-canvas");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `Thenith-${card?.cardId}-QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSvg = () => {
    const svgEl = document.getElementById("qr-details-svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Thenith-${card?.cardId}-QR.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Toggle Disabled/Enabled Status
  const handleToggleStatus = async () => {
    try {
      setUpdatingStatus(true);
      const nextStatus = card.status === "disabled" ? "unclaimed" : "disabled";
      const res = await updatePhysicalCardStatus(card._id, {
        status: nextStatus,
        disabledReason: disableReason,
      });
      if (res.success) {
        setShowStatusModal(false);
        setDisableReason("");
        loadCardData();
      }
    } catch (err) {
      alert(err.message || "فشل تعديل الحالة");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Unlink Card
  const handleUnlink = async () => {
    try {
      setUnlinking(true);
      const res = await unlinkPhysicalCard(card._id);
      if (res.success) {
        setCard(res.card);
        setTargetUrlInput("");
        setShowUnlinkModal(false);
        setEditSuccessMsg("تم إلغاء ربط الكارت بنجاح وأصبح متاحاً للتفعيل من جديد!");
        setTimeout(() => setEditSuccessMsg(""), 4000);
        const resLogs = await fetchPhysicalCardLogs(id);
        if (resLogs.success) setLogs(resLogs.logs);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message || "فشل إلغاء ربط الكارت";
      alert(msg);
    } finally {
      setUnlinking(false);
    }
  };

  // Delete Card
  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await deletePhysicalCard(card._id);
      if (res.success) {
        setShowDeleteModal(false);
        navigate("/cards");
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message || "فشل حذف الكارت";
      alert(msg);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-3" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">جاري تحميل بيانات الكارت وسجل الأمان...</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-rose-500 gap-4" dir="rtl">
        <AlertTriangle className="w-12 h-12" />
        <h2 className="text-lg font-bold text-slate-800">{error || "الكارت غير موجود"}</h2>
        <Link
          to="/cards"
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
        >
          العودة لإدارة الكروت
        </Link>
      </div>
    );
  }

  const isClaimed = card.status === "claimed" || Boolean(card.userId);
  const user = card.userId;
  const profile = card.profileId;
  const personal = profile?.personal || {};
  const contacts = profile?.contacts || [];
  const links = profile?.links || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto" dir="rtl">
      {/* ── BREADCRUMB & HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <Link
            to="/cards"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 mb-2 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة إلى جدول الكروت
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900">{card.name || card.cardId}</h1>
            {card.name && (
              <span className="font-mono text-sm font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200">
                {card.cardId}
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                card.status === "claimed"
                  ? "bg-emerald-100 text-emerald-800"
                  : card.status === "disabled"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {card.status === "claimed" ? "مربوط بحساب" : card.status === "disabled" ? "معطّل إدارياً" : "غير مربوط (جاهز للربط)"}
            </span>
            {card.orderNumber && (
              <Link
                to={`/store?tab=orders&order=${encodeURIComponent(card.orderNumber.replace(/^#/, ""))}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer shadow-2xs"
                title={`عرض تفاصيل الطلب #${card.orderNumber} في إدارة المتجر`}
              >
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>طلب المتجر: #{card.orderNumber.replace(/^#/, "")}</span>
                <ExternalLink className="w-3 h-3 text-amber-600" />
              </Link>
            )}
          </div>
        </div>

        {/* Action Buttons: Status Toggle, Unlink, Delete */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dashboard Operational Status (In Printing vs Card Received) */}
          {(() => {
            const currentOpStatus = card.operationalStatus || (card.isPrinting ? "in_printing" : "");
            return (
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/90 shrink-0 gap-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() =>
                    handleOperationalStatusChange(currentOpStatus === "in_printing" ? "" : "in_printing")
                  }
                  disabled={togglingOperationalStatus}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentOpStatus === "in_printing"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                  }`}
                  title="تحديد الكارت في الطباعة"
                >
                  <Printer
                    className={`w-3.5 h-3.5 shrink-0 ${
                      currentOpStatus === "in_printing" ? "animate-pulse" : "text-slate-400"
                    }`}
                  />
                  <span>في الطباعة</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleOperationalStatusChange(currentOpStatus === "received" ? "" : "received")
                  }
                  disabled={togglingOperationalStatus}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentOpStatus === "received"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                  }`}
                  title="تحديد تم استلام الكارت"
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      currentOpStatus === "received" ? "text-white" : "text-slate-400"
                    }`}
                  />
                  <span>تم استلام الكارت</span>
                </button>
              </div>
            );
          })()}
          {/* Unlink button if claimed */}
          {isClaimed && (
            <button
              onClick={() => setShowUnlinkModal(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="إلغاء ربط الكارت بالعميل ليصبح متاحاً للربط بحساب آخر"
            >
              <Unlink className="w-3.5 h-3.5" />
              إلغاء ربط الكارت
            </button>
          )}

          {/* Disable / Re-enable button */}
          <button
            onClick={() => setShowStatusModal(true)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              card.status === "disabled"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "border border-rose-200 text-rose-600 hover:bg-rose-50"
            }`}
          >
            {card.status === "disabled" ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                إعادة تفعيل الكارت
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5" />
                تعطيل الكارت إدارياً
              </>
            )}
          </button>

          {/* Delete Card button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-rose-600/20"
            title="حذف هذا الكارت نهائياً من قاعدة البيانات"
          >
            <Trash2 className="w-3.5 h-3.5" />
            حذف الكارت
          </button>
        </div>
      </div>

      {/* ── GRID: CARD INFO & QR CODE ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT/MAIN 2 COLS: Card Specs, Canonical URL, Destination & Full Linked Profile */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Info Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              بيانات ومواصفات الكارت
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-slate-400 mb-1">المعرّف الداخلي (Card ID):</p>
                <p className="font-mono font-bold text-slate-900">{card.cardId}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-slate-400 mb-1">المعرّف العام (Public ID):</p>
                <p className="font-mono font-bold text-indigo-600">{card.publicId}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-slate-400 mb-1">نوع الكارت:</p>
                <p className="font-bold text-slate-900 capitalize">{card.cardType}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-slate-400 mb-1">لون الكارت:</p>
                <p className="font-bold text-slate-900 capitalize">{card.color}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-slate-400 mb-1">نوع التوزيع:</p>
                <p className="font-bold text-slate-900 capitalize">{card.distributionType}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-slate-400 mb-1">دفعة التصنيع:</p>
                <p className="font-mono font-bold text-slate-900">
                  {card.batchId ? card.batchId.batchId : "بدون دفعة"}
                </p>
              </div>

              {card.orderNumber && (
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                  <p className="text-amber-800/80 mb-1 font-medium">طلب المتجر المرتبط:</p>
                  <Link
                    to={`/store?tab=orders&order=${encodeURIComponent(card.orderNumber.replace(/^#/, ""))}`}
                    className="font-mono font-black text-amber-900 hover:text-amber-700 hover:underline flex items-center gap-1.5 transition-colors"
                    title="فتح تفاصيل الطلب في إدارة المتجر"
                  >
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span>#{card.orderNumber.replace(/^#/, "")}</span>
                    <ExternalLink className="w-3 h-3 text-amber-600" />
                  </Link>
                </div>
              )}

              {/* Password Box (Permanent / Immutable - Generated once with card) */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex items-center justify-between col-span-2 sm:col-span-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-slate-600 text-xs font-bold">كلمة مرور الكارت (6 أرقام فقط):</p>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-200/60 text-indigo-800 text-[10px] font-bold">
                      ثابتة مع الكارت ولا تتغير
                    </span>
                  </div>
                  <p className="font-mono font-black text-base tracking-widest text-indigo-950">
                    {card.cardPassword || "—"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    تُنشأ تلقائياً عند توليد الكارت وتُستخدم لمصادقة وتفعيل الكارت بواسطة العميل.
                  </p>
                </div>
                {card.cardPassword && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(card.cardPassword);
                      setCopiedPwd(true);
                      setTimeout(() => setCopiedPwd(false), 2000);
                    }}
                    className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
                    title="نسخ كلمة المرور"
                  >
                    {copiedPwd ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Static URL Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">الرابط العام الثابت (Canonical Static URL):</span>
                <span className="text-[10px] text-slate-400">يقرأ الرابط من ملف الإعدادات (.env) ولا يتغير مطلقاً</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono">
                <a
                  href={staticUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-indigo-600 hover:underline flex items-center gap-1.5"
                  title="الرابط العام الثابت المربوط بالكارت"
                >
                  <span className="truncate">{staticUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={copyUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans font-bold text-xs transition-colors cursor-pointer"
                    title="نسخ الرابط"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "تم النسخ" : "نسخ الرابط"}</span>
                  </button>
                </div>
              </div>
            </div>



            {/* Target URL / Redirect Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    رابط التوجيه المباشر أو معرّف المستخدم (Target Destination / User Public ID)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    عند وضع اسم مستخدم (Username) أو معرّف بروفايل (Public ID) أو رابط مخصص، سيتم توجيه من يمسح الكارت أو الكيو آر كود مباشرة إليه.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveTargetUrl} className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={targetUrlInput}
                  onChange={(e) => setTargetUrlInput(e.target.value)}
                  placeholder="مثال: john أو a8K29xP7 أو https://thenith.com/p/john"
                  className="flex-1 w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  dir="ltr"
                />
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingTarget && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  حفظ التوجيه
                </button>
                {card.targetUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUrlInput("");
                      updatePhysicalCardDetails(id, { targetUrl: "" })
                        .then((res) => {
                          if (res.success) setCard(res.card);
                        })
                        .catch((err) => {
                          alert(err.response?.data?.error?.message || err.message || "فشل إزالة التوجيه");
                        });
                    }}
                    className="w-full sm:w-auto px-3 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                    title="إزالة التوجيه المخصص والعودة للتوجيه الافتراضي"
                  >
                    إلغاء التوجيه
                  </button>
                )}
              </form>

              {card.targetUrl ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    موجّه حالياً إلى: <code className="font-mono">{card.targetUrl}</code>
                  </span>
                  <a
                    href={
                      card.targetUrl.startsWith("http")
                        ? card.targetUrl
                        : card.targetUrl.startsWith("/")
                        ? card.targetUrl
                        : `/p/${card.targetUrl}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 underline flex items-center gap-1 text-[11px]"
                  >
                    معاينة الوجهة
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  لم يتم ضبط رابط توجيه مخصص — سيعمل الكارت بالتوجيه التلقائي (للبروفايل الرقمي المربوط أو صفحة التفعيل).
                </p>
              )}
            </div>

            {editSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {editSuccessMsg}
              </div>
            )}
          </div>

          {/* ── COMPLETE LINKED PROFILE & USER DETAILS ─────────────────────────── */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                معلومات البروفايل الرقمي والحساب المربوط بالكارت
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  card.status === "claimed"
                    ? "bg-emerald-100 text-emerald-800"
                    : card.status === "disabled"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {card.status === "claimed"
                  ? "مربوط بنجاح (Claimed)"
                  : card.status === "disabled"
                  ? "معطّل (Disabled)"
                  : "غير مربوط - متاح (Unclaimed)"}
              </span>
            </div>

            {isClaimed && user ? (
              <div className="space-y-6">
                {/* 1. Profile Hero Card (Cover, Avatar, Bio, Direct Link) */}
                <div className="rounded-2xl border border-slate-200/90 overflow-hidden bg-slate-50 shadow-xs">
                  {personal.coverImage ? (
                    <div className="h-32 sm:h-36 w-full relative">
                      <img
                        src={personal.coverImage}
                        alt="Profile Cover"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="h-24 sm:h-28 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative" />
                  )}

                  <div className="px-6 pb-6 pt-0 relative">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
                      <div className="flex items-end gap-3.5">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 shadow-md shrink-0">
                          {personal.avatar || user.avatar ? (
                            <img
                              src={personal.avatar || user.avatar}
                              alt={personal.fullName || user.name}
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-2xl flex items-center justify-center">
                              {(personal.fullName || user.name || "U")[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="text-lg font-black text-slate-900">
                            {personal.fullName || user.name}
                          </h3>
                          <p className="text-xs text-indigo-600 font-mono font-bold">
                            @{user.username || user.publicId}
                          </p>
                          {(personal.jobTitle || personal.title || personal.company) && (
                            <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                              <span>{personal.jobTitle || personal.title || "عضو"}</span>
                              {personal.company && (
                                <span className="text-slate-400">في {personal.company}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Direct Profile View Link */}
                      <div className="flex items-center gap-2">
                        <a
                          href={`${siteBaseUrl}/p/${user.publicId || profile?.publicId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <span>زيارة البروفايل</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {personal.bio && (
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed mb-4">
                        <p className="text-slate-400 text-[10px] font-bold mb-1">النبذة التعريفية (Bio):</p>
                        <p>{personal.bio}</p>
                      </div>
                    )}

                    {/* Account Details 4-Column Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                      <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                        <span className="text-slate-400 text-[11px] block mb-1">البريد الإلكتروني:</span>
                        <span className="font-mono text-slate-900 font-bold truncate block" title={user.email}>
                          {user.email || "—"}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                        <span className="text-slate-400 text-[11px] block mb-1">رقم الهاتف:</span>
                        <span className="font-mono text-slate-900 font-bold block" dir="ltr">
                          {user.phone || "—"}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                        <span className="text-slate-400 text-[11px] block mb-1">المعرف العام (User Public ID):</span>
                        <span className="font-mono text-indigo-700 font-black block">
                          {user.publicId}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                        <span className="text-slate-400 text-[11px] block mb-1">العنوان:</span>
                        <span className="text-slate-900 font-bold truncate block" title={user.address}>
                          {user.address || "غير مسجل"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Contacts List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    جهات الاتصال المسجلة في البروفايل ({contacts.length})
                  </h4>

                  {contacts && contacts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {contacts.map((c, i) => (
                        <div
                          key={c.id || i}
                          className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                              {c.type === "phone" && <Phone className="w-3.5 h-3.5" />}
                              {c.type === "whatsapp" && <MessageSquare className="w-3.5 h-3.5" />}
                              {c.type === "email" && <Mail className="w-3.5 h-3.5" />}
                              {c.type === "location" && <MapPin className="w-3.5 h-3.5" />}
                              {c.type === "website" && <Globe className="w-3.5 h-3.5" />}
                              {!["phone", "whatsapp", "email", "location", "website"].includes(c.type) && (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <div className="truncate">
                              <span className="text-[10px] text-slate-400 block">{c.label || c.type}</span>
                              <span className="font-mono font-bold text-slate-800 truncate block" dir="ltr">
                                {c.value}
                              </span>
                            </div>
                          </div>
                          {c.primary && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                              أساسي
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      لم يتم إضافة جهات اتصال في البروفايل بعد.
                    </div>
                  )}
                </div>

                {/* 3. Social & Custom Links */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    الروابط وشبكات التواصل المضافة ({links.length})
                  </h4>

                  {links && links.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {links.map((link, i) => (
                        <a
                          key={link.id || i}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="truncate">
                            <span className="font-bold text-slate-800 block truncate">{link.title || link.name || "رابط"}</span>
                            <span className="text-[11px] font-mono text-indigo-600 truncate block" dir="ltr">
                              {link.url}
                            </span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      لم يتم إضافة أي روابط خارجية في هذا البروفايل بعد.
                    </div>
                  )}
                </div>

                {/* 4. Linkage Dates & Unlink Trigger */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-amber-900">فك ارتباط الكارت من هذا البروفايل:</p>
                    <p className="text-amber-700 text-[11px] mt-0.5">
                      تم ربط الكارت بتاريخ:{" "}
                      <strong className="font-mono">
                        {card.claimedAt ? new Date(card.claimedAt).toLocaleString("ar-EG-u-nu-latn") : "—"}
                      </strong>
                      . عند فك الارتباط، سيعود الكارت حراً (Unclaimed) ليتمكن أي عميل آخر من تفعيله.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUnlinkModal(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    إلغاء ربط الكارت الآن
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">الكارت غير مربوط بأي حساب حالياً (Unclaimed)</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    هذا الكارت جاهز ومتاح للتوزيع أو الشراء. يتم الربط تلقائياً عندما يقوم العميل بمسح رمز QR أو إدخال المعرف العام للكارت وكلمة المرور من لوحة التحكم الخاصة به.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-4 text-xs">
                  <div className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-mono">
                    <span className="text-slate-400 ml-1">المعرف العام:</span>
                    <strong className="text-indigo-600">{card.publicId}</strong>
                  </div>
                  <div className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 font-mono">
                    <span className="text-slate-400 ml-1">كلمة المرور الثابتة:</span>
                    <strong className="text-slate-900">{card.cardPassword}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 1 COL: QR Code Display & Exports & Timestamps */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center space-y-5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-indigo-600" />
              رمز QR المطبوع على الكارت
            </h2>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center">
              <QRCodeSVG
                id="qr-details-svg"
                value={staticUrl}
                size={180}
                level="H"
                includeMargin
              />
              <div className="hidden">
                <QRCodeCanvas
                  id="qr-details-canvas"
                  value={staticUrl}
                  size={1080}
                  level="H"
                  includeMargin
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              يوجّه تلقائياً إلى الرابط الثابت ({staticUrl}) دون الحاجة إلى تطبيق.
            </p>

            <div className="w-full space-y-2 pt-2">
              <button
                onClick={downloadPng}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                تحميل صورة عالية الدقة (PNG)
              </button>

              <button
                onClick={downloadSvg}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                تحميل متجهي للطباعة (SVG)
              </button>
            </div>
          </div>



          {/* Quick Dates Timeline Widget */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900">سجل التواريخ</h3>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>تاريخ الإنشاء:</span>
                <span className="font-medium text-slate-900">
                  {new Date(card.createdAt).toLocaleDateString("ar-EG-u-nu-latn")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>تاريخ التصنيع:</span>
                <span className="font-medium text-slate-900">
                  {card.manufacturedAt ? new Date(card.manufacturedAt).toLocaleDateString("ar-EG-u-nu-latn") : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>تاريخ الربط بالعميل:</span>
                <span className="font-medium text-slate-900">
                  {card.claimedAt ? new Date(card.claimedAt).toLocaleDateString("ar-EG-u-nu-latn") : "—"}
                </span>
              </div>
              {card.disabledAt && (
                <div className="flex justify-between text-rose-600">
                  <span>تاريخ التعطيل:</span>
                  <span className="font-medium">
                    {new Date(card.disabledAt).toLocaleDateString("ar-EG-u-nu-latn")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVITY LOGS (AUDIT TRAIL) ─────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          سجل العمليات والنشاط (Activity Logs)
        </h2>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">لا توجد عمليات مسجلة بعد لهذا الكارت.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log._id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                      log.status === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : log.status === "failure"
                        ? "bg-rose-100 text-rose-800"
                        : log.status === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {log.action}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800">{log.message}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      المنفّذ: <span className="font-semibold text-slate-600">{log.actorId || "System"}</span> (
                      {log.actorType})
                    </p>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {new Date(log.timestamp || log.createdAt).toLocaleString("ar-EG-u-nu-latn")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── STATUS TOGGLE MODAL ─────────────────────────────────────────────── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs" dir="rtl">
            <h3 className="text-base font-bold text-slate-900">
              {card.status === "disabled" ? "إعادة تفعيل الكارت" : "تعطيل الكارت إدارياً"}
            </h3>

            {card.status !== "disabled" && (
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">سبب التعطيل (اختياري)</label>
                <textarea
                  rows="2"
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  placeholder="مثال: شكوى فقدان الكارت من العميل..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={updatingStatus}
                className={`px-5 py-2 rounded-xl text-white font-bold cursor-pointer flex items-center gap-1.5 ${
                  card.status === "disabled" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {updatingStatus ? "جاري التحديث..." : "تأكيد الإجراء"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UNLINK CARD MODAL ───────────────────────────────────────────────── */}
      {showUnlinkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs" dir="rtl">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Unlink className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تأكيد إلغاء ربط الكارت</h3>
              <p className="text-slate-500 mt-1 leading-relaxed">
                هل أنت متأكد من فك ارتباط الكارت <strong className="text-slate-800 font-mono">{card.cardId}</strong> من حساب العميل{" "}
                <strong className="text-slate-800">{personal.fullName || user?.name || "المربوط"}</strong>؟
              </p>
              <p className="text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl mt-3 text-[11px] font-medium leading-relaxed">
                ⚠️ بعد فك الربط، سيصبح الكارت غير مربوط (Unclaimed) ومتاحاً للتفعيل والربط مجدداً من قبل أي مستخدم.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setShowUnlinkModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer font-bold"
              >
                تراجع
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {unlinking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {unlinking ? "جاري فك الربط..." : "تأكيد إلغاء الربط"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CARD MODAL ───────────────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs" dir="rtl">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">حذف الكارت نهائياً</h3>
              <p className="text-slate-500 mt-1 leading-relaxed">
                هل أنت متأكد من حذف الكارت <strong className="text-slate-800 font-mono">{card.cardId}</strong> من قاعدة البيانات؟
              </p>
              <p className="text-rose-800 bg-rose-50 border border-rose-200 p-2.5 rounded-xl mt-3 text-[11px] font-medium leading-relaxed">
                🚨 تحذير: هذا الإجراء دائم ولا يمكن التراجع عنه. سيتم مسح الكارت وجميع سجلاته المرتبطة.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deleting ? "جاري الحذف..." : "تأكيد الحذف نهائياً"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
