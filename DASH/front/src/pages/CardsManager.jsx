import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard,
  QrCode,
  Plus,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Eye,
  FileSpreadsheet,
  X,
  Sparkles,
  SmartphoneNfc,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
  Package,
  Cpu,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Tag,
  Boxes,
  Key,
  Monitor,
  Briefcase,
  Disc,
  Watch,
  Printer,
} from "lucide-react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import CardQrScannerModal from "../components/CardQrScannerModal.jsx";
import {
  fetchPhysicalCards,
  fetchPhysicalCardDetails,
  updatePhysicalCardDetails,
  fetchPhysicalCardStats,
  createPhysicalCard,
  createBulkPhysicalCards,
  updateBulkPhysicalCardsStatus,
  updatePhysicalCardStatus,
  fetchCardBatches,
  createCardBatch,
  fetchNfcChipTypes,
  createNfcChipType,
  updateNfcChipType,
  deleteNfcChipType,
} from "../services/adminApi.js";

// Helper to generate 6-digit numeric card password (numbers only, e.g. 582194)
export function generate6CharPassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Smart Hardware Form Factors Config ────────────────────────────────────────
export const HARDWARE_TYPES = [
  { id: "card", label: "كارت ذكي", icon: CreditCard, colorClass: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  { id: "keychain", label: "ميدالية ذكية", icon: Key, colorClass: "text-amber-700 bg-amber-50 border-amber-200" },
  { id: "stand", label: "ستاند مكتبي / طاولة", icon: Monitor, colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { id: "kit", label: "كت / باقة متكاملة", icon: Briefcase, colorClass: "text-purple-700 bg-purple-50 border-purple-200" },
  { id: "sticker", label: "ملصق / استيكر ذكي", icon: Disc, colorClass: "text-sky-700 bg-sky-50 border-sky-200" },
  { id: "wristband", label: "سوار / بادج ذكي", icon: Watch, colorClass: "text-rose-700 bg-rose-50 border-rose-200" },
  { id: "custom", label: "منتج مخصص", icon: Boxes, colorClass: "text-slate-700 bg-slate-50 border-slate-200" },
];

function HardwareTypeBadge({ type, customName }) {
  const hw = HARDWARE_TYPES.find((h) => h.id === type) || HARDWARE_TYPES[0];
  const Icon = hw.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${hw.colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      {customName || hw.label}
    </span>
  );
}

// ── Shared UI Badges ──────────────────────────────────────────────────────────
function OwnershipBadge({ status }) {
  switch (status) {
    case "claimed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          مربوط بحساب
        </span>
      );
    case "disabled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          معطّل إدارياً
        </span>
      );
    case "unclaimed":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          غير مربوط (جاهز)
        </span>
      );
  }
}

function NfcProtectionBadge({ status }) {
  switch (status) {
    case "locked":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          مقفول ومحمي
        </span>
      );
    case "unlocked":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
          <SmartphoneNfc className="w-3.5 h-3.5 text-blue-600" />
          مفتوح للكتابة
        </span>
      );
    case "pending_setup":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          بانتظار التجهيز
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          خطأ في التجهيز
        </span>
      );
    case "unknown":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          غير مؤكد
        </span>
      );
  }
}

function ColorDot({ color, orderColor }) {
  if (orderColor) {
    const code = orderColor.colorCode || (typeof orderColor === 'string' && orderColor.startsWith('#') ? orderColor : null);
    const label = orderColor.name?.ar || orderColor.name?.en || (typeof orderColor.name === 'string' ? orderColor.name : (typeof orderColor === 'string' ? orderColor : "لون مخصص"));
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
        <span
          className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs shrink-0"
          style={{ backgroundColor: code || "#000000" }}
        />
        <span>{label}</span>
      </span>
    );
  }

  const colorMap = {
    black: "bg-slate-900 border-slate-700",
    white: "bg-white border-slate-300",
    blue: "bg-blue-600 border-blue-400",
    purple: "bg-purple-600 border-purple-400",
    silver: "bg-slate-300 border-slate-400",
    gold: "bg-amber-400 border-amber-500",
    custom: "bg-gradient-to-tr from-pink-500 to-indigo-500 border-indigo-400",
  };
  const labelMap = {
    black: "أسود",
    white: "أبيض",
    blue: "أزرق",
    purple: "بنفسجي",
    silver: "فضي",
    gold: "ذهبي",
    custom: "مخصص",
  };

  const isHex = typeof color === 'string' && color.startsWith('#');

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
      {isHex ? (
        <span className="w-3 h-3 rounded-full border border-black/10 shadow-xs shrink-0" style={{ backgroundColor: color }} />
      ) : (
        <span className={`w-3 h-3 rounded-full border shadow-xs shrink-0 ${colorMap[color] || "bg-slate-400"}`} />
      )}
      {labelMap[color] || color}
    </span>
  );
}

// ── Modal Frame ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className={`bg-white rounded-3xl shadow-2xl w-full flex flex-col max-h-[92vh] ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function CardsManager() {
  const navigate = useNavigate();

  // State: Active tab ("cards" | "chips" | "batches")
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "cards";
  });

  // State: Dynamic Chip Types
  const [chipTypes, setChipTypes] = useState([]);
  const [chipsLoading, setChipsLoading] = useState(false);

  // Chip type modal state
  const [showChipModal, setShowChipModal] = useState(false);
  const [editingChip, setEditingChip] = useState(null);
  const [chipForm, setChipForm] = useState({
    name: "",
    title: "",
    memorySize: "504 بايت",
    description: "",
    isActive: true,
    isDefault: false,
  });
  const [savingChip, setSavingChip] = useState(false);
  const [deleteChipConfirm, setDeleteChipConfirm] = useState(null);

  // State: Real Stats
  const [stats, setStats] = useState({
    totalCards: 0,
    unclaimedCards: 0,
    claimedCards: 0,
    disabledCards: 0,
    readyForDistribution: 0,
    nfcSetupPending: 0,
    nfcErrors: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // State: Cards Table
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState("");
  const [distFilter, setDistFilter] = useState("");
  const [nfcFilter, setNfcFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [orderOnlyFilter, setOrderOnlyFilter] = useState(false);
  const [operationalFilter, setOperationalFilter] = useState("");
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  // Quick toggle card operational status ("in_printing" | "received" | "")
  const handleOperationalStatusChange = async (card, newStatus) => {
    if (!card?._id || togglingStatusId) return;
    setTogglingStatusId(card._id);

    const nextStatus = newStatus || "";
    const nextIsPrinting = nextStatus === "in_printing";

    // Optimistic UI update
    setCards((prev) =>
      prev.map((c) =>
        c._id === card._id
          ? {
              ...c,
              operationalStatus: nextStatus,
              isPrinting: nextIsPrinting,
            }
          : c
      )
    );

    try {
      await updatePhysicalCardDetails(card._id, {
        operationalStatus: nextStatus,
        isPrinting: nextIsPrinting,
      });
    } catch (err) {
      // Revert on failure
      setCards((prev) =>
        prev.map((c) =>
          c._id === card._id
            ? {
                ...c,
                operationalStatus: card.operationalStatus || (card.isPrinting ? "in_printing" : ""),
                isPrinting: Boolean(card.isPrinting),
              }
            : c
        )
      );
      alert(err.response?.data?.error || err.message || "فشل تحديث الحالة");
    } finally {
      setTogglingStatusId(null);
    }
  };

  // ── Bulk Selection State & Operational Status Handlers ───────────────────────
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [bulkUpdatingStatus, setBulkUpdatingStatus] = useState(false);

  const toggleSelectCard = (id) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (cards.length === 0) return;
    const allSelectedOnPage = cards.every((c) => selectedCardIds.has(c._id));
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        cards.forEach((c) => next.delete(c._id));
      } else {
        cards.forEach((c) => next.add(c._id));
      }
      return next;
    });
  };

  const handleBulkOperationalStatusChange = async (targetStatus) => {
    if (selectedCardIds.size === 0 || bulkUpdatingStatus) return;
    const idsToUpdate = Array.from(selectedCardIds);
    const nextStatus = targetStatus || "";
    const nextIsPrinting = nextStatus === "in_printing";

    setBulkUpdatingStatus(true);

    // Optimistic UI update
    setCards((prev) =>
      prev.map((c) =>
        selectedCardIds.has(c._id)
          ? {
              ...c,
              operationalStatus: nextStatus,
              isPrinting: nextIsPrinting,
            }
          : c
      )
    );

    try {
      await updateBulkPhysicalCardsStatus(idsToUpdate, nextStatus);
      setSelectedCardIds(new Set());
      loadStats();
    } catch (err) {
      loadCards();
      alert(err.response?.data?.error || err.message || "فشل تحديث حالة الكروت المحددة");
    } finally {
      setBulkUpdatingStatus(false);
    }
  };

  // State: Batches
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [qrModalCard, setQrModalCard] = useState(null);
  const [statusActionCard, setStatusActionCard] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showScanQrModal, setShowScanQrModal] = useState(false);

  const handleQrScanComplete = async (extractedValue, rawDecodedText) => {
    const val = (extractedValue || rawDecodedText || "").trim();
    if (!val) return;

    // 1. Direct match in already loaded cards list
    const foundLocal = cards.find((c) => {
      const matchId = c._id === val || (c.cardId && c.cardId.toLowerCase() === val.toLowerCase());
      const matchPub = c.publicId && c.publicId.toLowerCase() === val.toLowerCase();
      const matchUrl =
        (c.cardUrl && c.cardUrl.toLowerCase().includes(val.toLowerCase())) ||
        (rawDecodedText && c.cardUrl && c.cardUrl.toLowerCase().includes(rawDecodedText.toLowerCase()));
      const matchTarget =
        (c.targetUrl && c.targetUrl.toLowerCase().includes(val.toLowerCase())) ||
        (rawDecodedText && c.targetUrl && c.targetUrl.toLowerCase().includes(rawDecodedText.toLowerCase()));
      return matchId || matchPub || matchUrl || matchTarget;
    });

    if (foundLocal && foundLocal._id) {
      navigate(`/cards/${foundLocal._id}`);
      return;
    }

    // 2. Query backend by identifier or search
    try {
      const details = await fetchPhysicalCardDetails(val);
      if (details && (details.success || details.card) && details.card?._id) {
        navigate(`/cards/${details.card._id}`);
        return;
      }
    } catch {
      // Identifier wasn't direct hit, try searching cards endpoint
    }

    try {
      const searchRes = await fetchPhysicalCards({ search: val, limit: 1 });
      if (searchRes && searchRes.cards && searchRes.cards.length > 0) {
        navigate(`/cards/${searchRes.cards[0]._id}`);
        return;
      }
    } catch {
      // Fallback
    }

    // 3. Fallback: If not found, filter table by the value so user sees what's there
    setStatusFilter("");
    setColorFilter("");
    setTypeFilter("");
    setProductTypeFilter("");
    setDistFilter("");
    setNfcFilter("");
    setBatchFilter("");
    setOrderOnlyFilter(false);
    setOperationalFilter("");
    setSearch(val);
    setPage(1);
    setActiveTab("cards");
  };

  // Form states
  const [newCardForm, setNewCardForm] = useState({
    name: "",
    cardType: "standard",
    productType: "card",
    color: "black",
    distributionType: "sale",
    batchId: "",
    nfcChipType: "",
    targetUrl: "",
    cardPassword: generate6CharPassword(),
  });
  const [submittingCard, setSubmittingCard] = useState(false);

  const [bulkForm, setBulkForm] = useState({
    name: "",
    quantity: 25,
    cardType: "standard",
    productType: "card",
    color: "black",
    distributionType: "sale",
    batchId: "",
    nfcChipType: "",
  });
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const [batchForm, setBatchForm] = useState({
    name: "",
    cardType: "standard",
    color: "black",
    quantity: 100,
    distributionType: "sale",
    notes: "",
  });
  const [submittingBatch, setSubmittingBatch] = useState(false);

  const canvasRef = useRef(null);

  // ── Fetch Stats ─────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetchPhysicalCardStats();
      if (res.success) setStats(res.stats);
    } catch (err) {
      console.error("Failed to fetch card stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch Cards ─────────────────────────────────────────────────────────────
  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchPhysicalCards({
        page,
        limit,
        search,
        status: statusFilter,
        color: colorFilter,
        cardType: typeFilter,
        productType: productTypeFilter,
        distributionType: distFilter,
        nfcProtectionStatus: nfcFilter,
        batchId: batchFilter,
        orderOnly: orderOnlyFilter ? "true" : "",
        operationalStatus: operationalFilter,
      });
      if (res.success) {
        setCards(res.data);
        setTotal(res.pagination.total);
      }
    } catch (err) {
      setError(err.message || "فشل تحميل قائمة الكروت والمنتجات");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, colorFilter, typeFilter, productTypeFilter, distFilter, nfcFilter, batchFilter, orderOnlyFilter, operationalFilter]);

  // ── Fetch Batches ───────────────────────────────────────────────────────────
  const loadBatches = useCallback(async () => {
    try {
      setBatchesLoading(true);
      const res = await fetchCardBatches();
      if (res.success) setBatches(res.batches);
    } catch (err) {
      console.error("Failed to load batches:", err);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  // ── Fetch Chip Types ────────────────────────────────────────────────────────
  const loadChipTypes = useCallback(async () => {
    try {
      setChipsLoading(true);
      const res = await fetchNfcChipTypes();
      const list = res || [];
      setChipTypes(list);
      if (list.length > 0) {
        const def = list.find((c) => c.isDefault) || list[0];
        if (def?.name) {
          setNewCardForm((prev) => (prev.nfcChipType ? prev : { ...prev, nfcChipType: def.name }));
          setBulkForm((prev) => (prev.nfcChipType ? prev : { ...prev, nfcChipType: def.name }));
        }
      }
    } catch (err) {
      console.error("Failed to load chip types:", err);
    } finally {
      setChipsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadBatches();
    loadChipTypes();
  }, [loadStats, loadBatches, loadChipTypes]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // ── Chip Type Handlers ──────────────────────────────────────────────────────
  const handleOpenAddChip = () => {
    setEditingChip(null);
    setChipForm({
      name: "",
      title: "",
      memorySize: "504 بايت",
      description: "",
      isActive: true,
      isDefault: false,
    });
    setShowChipModal(true);
  };

  const handleOpenEditChip = (chip) => {
    setEditingChip(chip);
    setChipForm({
      name: chip.name || "",
      title: chip.title || "",
      memorySize: chip.memorySize || "504 بايت",
      description: chip.description || "",
      isActive: chip.isActive !== undefined ? chip.isActive : true,
      isDefault: Boolean(chip.isDefault),
    });
    setShowChipModal(true);
  };

  const handleSaveChip = async (e) => {
    e.preventDefault();
    if (!chipForm.name || !chipForm.title) {
      alert("كود الشريحة والعنوان مطلوبان");
      return;
    }
    try {
      setSavingChip(true);
      if (editingChip) {
        await updateNfcChipType(editingChip._id, chipForm);
      } else {
        await createNfcChipType(chipForm);
      }
      setShowChipModal(false);
      setEditingChip(null);
      loadChipTypes();
    } catch (err) {
      alert(err.message || "فشل حفظ نوع الشريحة");
    } finally {
      setSavingChip(false);
    }
  };

  const handleDeleteChip = async (id) => {
    try {
      await deleteNfcChipType(id);
      setDeleteChipConfirm(null);
      loadChipTypes();
    } catch (err) {
      alert(err.message || "فشل حذف نوع الشريحة");
    }
  };

  // ── Copy Link Helper ────────────────────────────────────────────────────────
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Download QR as PNG ──────────────────────────────────────────────────────
  const downloadQrPng = (card) => {
    const canvas = document.getElementById(`qr-canvas-${card._id}`);
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `Thenith-${card.cardId}-QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // ── Download QR as SVG ──────────────────────────────────────────────────────
  const downloadQrSvg = (card) => {
    const svgEl = document.getElementById(`qr-svg-${card._id}`);
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `Thenith-${card.cardId}-QR.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  // ── Create Single Card Submit ───────────────────────────────────────────────
  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (!newCardForm.name.trim()) {
      alert("يرجى إدخال اسم المنتج / التسمية");
      return;
    }
    if (!newCardForm.nfcChipType) {
      alert("يرجى اختيار نوع الشريحة من الشرائح المضافة");
      return;
    }
    try {
      setSubmittingCard(true);
      const res = await createPhysicalCard(newCardForm);
      if (res.success) {
        setShowAddModal(false);
        const defChip = chipTypes.find((c) => c.isDefault) || chipTypes[0];
        setNewCardForm({
          name: "",
          cardType: "standard",
          productType: "card",
          color: "black",
          distributionType: "sale",
          batchId: "",
          nfcChipType: defChip?.name || "",
          targetUrl: "",
          cardPassword: generate6CharPassword(),
        });
        loadStats();
        loadCards();
        setQrModalCard(res.card);
      }
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء إنشاء المنتج");
    } finally {
      setSubmittingCard(false);
    }
  };

  // ── Create Bulk Cards Submit ────────────────────────────────────────────────
  const handleCreateBulk = async (e) => {
    e.preventDefault();
    if (!bulkForm.name.trim()) {
      alert("يرجى إدخال اسم أو تسمية المنتجات");
      return;
    }
    if (!bulkForm.nfcChipType) {
      alert("يرجى اختيار نوع الشريحة من الشرائح المضافة");
      return;
    }
    try {
      setSubmittingBulk(true);
      const res = await createBulkPhysicalCards(bulkForm);
      if (res.success) {
        setBulkResult(res);
        loadStats();
        loadCards();
      }
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء إنشاء المنتجات بالجملة");
    } finally {
      setSubmittingBulk(false);
    }
  };

  // ── Create Batch Submit ─────────────────────────────────────────────────────
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      setSubmittingBatch(true);
      const res = await createCardBatch(batchForm);
      if (res.success) {
        setShowAddBatchModal(false);
        setBatchForm({
          name: "",
          cardType: "standard",
          color: "black",
          quantity: 100,
          distributionType: "sale",
          notes: "",
        });
        loadBatches();
      }
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء إنشاء الدفعة");
    } finally {
      setSubmittingBatch(false);
    }
  };

  // ── Toggle Card Status (Disable / Enable) ───────────────────────────────────
  const handleToggleStatus = async (card, reason = "") => {
    try {
      const nextStatus = card.status === "disabled" ? "unclaimed" : "disabled";
      const res = await updatePhysicalCardStatus(card._id, {
        status: nextStatus,
        disabledReason: reason,
      });
      if (res.success) {
        setStatusActionCard(null);
        loadStats();
        loadCards();
      }
    } catch (err) {
      alert(err.message || "فشل تغيير حالة الكارت");
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* ── TOP HEADER & ACTIONS ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">إدارة المنتجات والكروت الذكية</h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm">
            لوحة مركزية لإدارة منتجات Thenith، كروت NFC الذكية، أنواع الشرائح، وكلمات المرور الرقمية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {activeTab === "chips" && (
            <button
              onClick={handleOpenAddChip}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة نوع شريحة جديد
            </button>
          )}

          {activeTab === "cards" && (
            <>
              <button
                onClick={() => setShowScanQrModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold border border-indigo-200/80 transition-all cursor-pointer shadow-xs"
                title="مسح رمز QR والبحث عن الكارت المرتبط به فوراً"
              >
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>مسح QR كارت</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة منتج جديد</span>
              </button>
              <button
                onClick={() => {
                  setBulkResult(null);
                  setShowBulkModal(true);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>إنشاء بالجملة</span>
              </button>
            </>
          )}

          {activeTab === "batches" && (
            <button
              onClick={() => setShowAddBatchModal(true)}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إنشاء دفعة تصنيع جديدة
            </button>
          )}
        </div>
      </div>

      {/* ── 8.1 STATS SUMMARY CARDS (Shown on Cards Tab) ───────────────────────── */}
      {activeTab === "cards" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-xs font-bold text-slate-500 mb-2">إجمالي الكروت</p>
            <p className="text-2xl font-black text-slate-900">{statsLoading ? "..." : stats.totalCards}</p>
            <span className="text-[11px] text-slate-400">كافة الكروت بالمنظومة</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-xs font-bold text-amber-600 mb-2">كروت غير مربوطة</p>
            <p className="text-2xl font-black text-amber-700">{statsLoading ? "..." : stats.unclaimedCards}</p>
            <span className="text-[11px] text-slate-400">بانتظار العميل</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-xs font-bold text-emerald-600 mb-2">كروت مربوطة</p>
            <p className="text-2xl font-black text-emerald-700">{statsLoading ? "..." : stats.claimedCards}</p>
            <span className="text-[11px] text-slate-400">مفعلة لدى العملاء</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-xs font-bold text-indigo-600 mb-2">جاهزة للتوزيع</p>
            <p className="text-2xl font-black text-indigo-700">{statsLoading ? "..." : stats.readyForDistribution}</p>
            <span className="text-[11px] text-slate-400">NFC مجهز وغير مربوط</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-xs font-bold text-blue-600 mb-2">بانتظار تجهيز NFC</p>
            <p className="text-2xl font-black text-blue-700">{statsLoading ? "..." : stats.nfcSetupPending}</p>
            <span className="text-[11px] text-slate-400">تحتاج كتابة وقفل</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-xs font-bold text-rose-600 mb-2">أخطاء NFC</p>
            <p className="text-2xl font-black text-rose-700">{statsLoading ? "..." : stats.nfcErrors}</p>
            <span className="text-[11px] text-slate-400">فشل في التحقق</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-xs font-bold text-slate-600 mb-2">كروت معطلة</p>
            <p className="text-2xl font-black text-slate-700">{statsLoading ? "..." : stats.disabledCards}</p>
            <span className="text-[11px] text-slate-400">موقوفة إدارياً</span>
          </div>
        </div>
      )}

      {/* ── TABS NAVIGATION ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 gap-3 sm:gap-8 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveTab("cards")}
          className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "cards"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>المنتجات والكروت المصنعة ({total})</span>
        </button>

        <button
          onClick={() => setActiveTab("chips")}
          className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "chips"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>أنواع شرائح NFC ({chipTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("batches")}
          className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "batches"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>دفعات التصنيع ({batches.length})</span>
        </button>
      </div>

      {/* ── TAB: NFC CHIP TYPES ──────────────────────────────────────────────── */}
      {activeTab === "chips" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">أنواع شرائح الـ NFC المعتمدة ({chipTypes.length})</h3>
              <p className="text-xs text-slate-500">إدارة أنواع الشرائح (NTAG215, NTAG213, NTAG216, Mifare وغيرها) وربطها بالمنتجات.</p>
            </div>
            <button
              onClick={handleOpenAddChip}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة نوع شريحة جديد
            </button>
          </div>

          {chipsLoading ? (
            <div className="flex justify-center items-center py-20 bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {chipTypes.map((chip) => {
                const productCount = cards.filter((c) => c.nfcChipType === chip.name).length;
                return (
                  <div
                    key={chip._id}
                    className={`bg-white rounded-2xl p-5 border ${
                      chip.isDefault ? "border-indigo-400 ring-2 ring-indigo-50 shadow-sm" : "border-slate-200/80"
                    } space-y-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm font-mono">{chip.name}</h4>
                            {chip.isDefault && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                الافتراضي
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{chip.title}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold">
                        {chip.memorySize || "504B"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                      {chip.description || "شريحة NFC متوافقة مع بطاقات Thenith الذكية."}
                    </p>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        المنتجات المربوطة: <strong className="text-slate-800">{productCount}</strong>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditChip(chip)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="تعديل الشريحة"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!chip.isDefault && (
                          <button
                            onClick={() => setDeleteChipConfirm(chip)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="حذف الشريحة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 1: CARDS MANAGEMENT ─────────────────────────────────────────── */}
      {activeTab === "cards" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full lg:max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="بحث بواسطة اسم المنتج، Card ID، أو Public ID..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 ps-10 pe-9 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* QR Scanner Trigger Button */}
              <button
                type="button"
                onClick={() => setShowScanQrModal(true)}
                title="مسح رمز QR للبحث عن الكارت المرتبط به"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors border border-indigo-200/80 cursor-pointer shrink-0 shadow-xs"
              >
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">مسح QR</span>
                <span className="sm:hidden">QR</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
              {/* Hardware Form Factor */}
              <select
                value={productTypeFilter}
                onChange={(e) => {
                  setProductTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="">جميع أشكال المنتجات</option>
                {HARDWARE_TYPES.map((hw) => (
                  <option key={hw.id} value={hw.id}>
                    {hw.label}
                  </option>
                ))}
              </select>

              {/* Ownership Status */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="">جميع حالات الملكية</option>
                <option value="unclaimed">غير مربوط (Unclaimed)</option>
                <option value="claimed">مربوط (Claimed)</option>
                <option value="disabled">معطّل (Disabled)</option>
              </select>

              {/* NFC Status */}
              <select
                value={nfcFilter}
                onChange={(e) => {
                  setNfcFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="">جميع حالات NFC</option>
                <option value="locked">مقفول ومحمي (Locked)</option>
                <option value="unlocked">مفتوح (Unlocked)</option>
                <option value="pending_setup">بانتظار التجهيز (Pending)</option>
                <option value="error">خطأ (Error)</option>
              </select>

              {/* Color */}
              <select
                value={colorFilter}
                onChange={(e) => {
                  setColorFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="">جميع الألوان</option>
                <option value="black">أسود</option>
                <option value="white">أبيض</option>
                <option value="blue">أزرق</option>
                <option value="purple">بنفسجي</option>
                <option value="silver">فضي</option>
                <option value="gold">ذهبي</option>
              </select>

              {/* Card Type */}
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="">جميع الأنواع والخامات</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="metal">Metal</option>
                <option value="bamboo">Bamboo</option>
              </select>

              {/* Distribution */}
              <select
                value={distFilter}
                onChange={(e) => {
                  setDistFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="">نوع التوزيع</option>
                <option value="sale">بيع (Sale)</option>
                <option value="gift">هدية (Gift)</option>
                <option value="sample">عينة (Sample)</option>
                <option value="corporate">شركات (Corporate)</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setOrderOnlyFilter(!orderOnlyFilter);
                  setPage(1);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  orderOnlyFilter
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
                title="عرض الكروت المربوطة بطلبات المتجر فقط"
              >
                <Package className="w-3.5 h-3.5" />
                طلبات المتجر فقط
              </button>

              {/* Operational Status Filter */}
              <select
                value={operationalFilter}
                onChange={(e) => {
                  setOperationalFilter(e.target.value);
                  setPage(1);
                }}
                className={`border rounded-xl px-3 py-2 text-xs font-bold transition-all outline-none cursor-pointer ${
                  operationalFilter === "in_printing"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : operationalFilter === "received"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <option value="">جميع الحالات التشغيلية</option>
                <option value="in_printing">في الطباعة</option>
                <option value="received">تم استلام الكارت</option>
              </select>

              {cards.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    cards.every((c) => selectedCardIds.has(c._id))
                      ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                  title="تحديد أو إلغاء تحديد جميع الكروت في هذه الصفحة"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {cards.every((c) => selectedCardIds.has(c._id))
                      ? "إلغاء تحديد الصفحة"
                      : "تحديد كل الصفحة"}
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setColorFilter("");
                  setTypeFilter("");
                  setProductTypeFilter("");
                  setDistFilter("");
                  setNfcFilter("");
                  setBatchFilter("");
                  setOrderOnlyFilter(false);
                  setOperationalFilter("");
                  setPage(1);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                title="إعادة تعيين الفلاتر"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cards Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium">جاري جلب الكروت من قاعدة البيانات...</p>
              </div>
            ) : error ? (
              <div className="p-16 flex flex-col items-center justify-center text-rose-500 gap-3">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm font-medium">{error}</p>
                <button
                  onClick={loadCards}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : cards.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                <CreditCard className="w-12 h-12 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">لم يتم العثور على كروت مطابقة</p>
                <p className="text-xs text-slate-400">جرّب تغيير خيارات البحث أو الفلترة، أو أنشئ كروت جديدة.</p>
              </div>
            ) : (
              <>
                {/* ── DESKTOP TABLE VIEW (Visible on >= lg screens) ── */}
                <div className="hidden lg:block overflow-x-auto scrollbar-thin">
                  <table className="w-full text-start text-xs min-w-[1100px]">
                  <thead className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-bold">
                    <tr>
                      <th className="py-4 px-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={cards.length > 0 && cards.every((c) => selectedCardIds.has(c._id))}
                          onChange={toggleSelectAll}
                          aria-label="تحديد جميع الكروت في الصفحة"
                          title="تحديد جميع الكروت في الصفحة"
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer transition-colors"
                        />
                      </th>
                      <th className="py-4 px-6 text-start">المنتج / التسمية</th>
                      <th className="py-4 px-4 text-start">نوع القطعة</th>
                      <th className="py-4 px-4 text-start">شريحة NFC</th>
                      <th className="py-4 px-4 text-start">كلمة المرور (6 أرقام)</th>
                      <th className="py-4 px-4 text-start">رابط التوجيه / Public ID</th>
                      <th className="py-4 px-4 text-start">نوع التوزيع</th>
                      <th className="py-4 px-4 text-start">حالة الملكية</th>
                      <th className="py-4 px-4 text-start">الحالة</th>
                      <th className="py-4 px-4 text-start">المالك / البروفايل</th>
                      <th className="py-4 px-4 text-start">تاريخ الإنشاء</th>
                      <th className="py-4 px-6 text-end">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cards.map((card) => {
                      const siteBaseUrl = (import.meta.env.VITE_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
                      const staticUrl = card.cardUrl || `${siteBaseUrl}/c/${card.publicId}`;
                      const currentOpStatus = card.operationalStatus || (card.isPrinting ? "in_printing" : "");
                      const isSelected = selectedCardIds.has(card._id);

                      return (
                        <tr
                          key={card._id}
                          className={`transition-all border-b ${
                            isSelected
                              ? "bg-indigo-50/70 hover:bg-indigo-100/60 border-b-indigo-200 ring-1 ring-indigo-400/40"
                              : currentOpStatus === "in_printing"
                              ? "bg-amber-100/80 hover:bg-amber-100 border-b-amber-200 border-r-4 border-r-amber-500 shadow-xs"
                              : currentOpStatus === "received"
                              ? "bg-emerald-50/80 hover:bg-emerald-100/70 border-b-emerald-200 border-r-4 border-r-emerald-500 shadow-xs"
                              : "hover:bg-slate-50/60 border-b-slate-100"
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-4 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCard(card._id)}
                              aria-label={`تحديد ${card.name || card.cardId}`}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer transition-colors"
                            />
                          </td>

                          {/* Product Name & Quick QR Trigger */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setQrModalCard(card)}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                title="معاينة وتحميل QR"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Link
                                    to={`/cards/${card._id}`}
                                    className="font-bold text-slate-900 hover:text-indigo-600 transition-colors block truncate max-w-[170px]"
                                    title={card.name || card.productName || card.cardId}
                                  >
                                    {card.name || card.productName || "منتج ذكي"}
                                  </Link>
                                  {card.orderNumber && (
                                    <Link
                                      to={`/store?tab=orders&order=${encodeURIComponent(card.orderNumber.replace(/^#/, ""))}`}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shrink-0 transition-colors cursor-pointer"
                                      title={`عرض تفاصيل الطلب #${card.orderNumber} في إدارة المتجر`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Package className="w-2.5 h-2.5 text-amber-600" />
                                      #{card.orderNumber.replace(/^#/, "")}
                                    </Link>
                                  )}
                                  {currentOpStatus === "in_printing" && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300 shrink-0 animate-pulse">
                                      <Printer className="w-2.5 h-2.5 text-amber-700" />
                                      في الطباعة
                                    </span>
                                  )}
                                  {currentOpStatus === "received" && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                      تم استلام الكارت
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[11px] font-semibold text-slate-500">{card.cardId}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono text-[11px] text-slate-400">c/{card.publicId}</span>
                                  <button
                                    onClick={() => copyToClipboard(staticUrl, card._id)}
                                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                    title="نسخ الرابط الثابت"
                                  >
                                    {copiedId === card._id ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Hardware Type */}
                          <td className="py-4 px-4">
                            <HardwareTypeBadge type={card.productType || "card"} />
                          </td>

                          {/* NFC Chip Type */}
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                              {card.nfcChipType || "—"}
                            </span>
                          </td>

                          {/* Card Password (6 characters) */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded-md text-xs tracking-wider border border-slate-200">
                                {card.cardPassword || "—"}
                              </span>
                              {card.cardPassword && (
                                <button
                                  onClick={() => copyToClipboard(card.cardPassword, `pwd-${card._id}`)}
                                  className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
                                  title="نسخ كلمة مرور الكارت"
                                >
                                  {copiedId === `pwd-${card._id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Target Redirect URL / User Public ID */}
                          <td className="py-4 px-4">
                            {card.targetUrl ? (
                              <div className="flex items-center gap-1.5 max-w-[150px]">
                                <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md truncate" title={card.targetUrl}>
                                  {card.targetUrl}
                                </span>
                                <a
                                  href={card.targetUrl.startsWith("http") ? card.targetUrl : `/p/${card.targetUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-400 hover:text-indigo-700 shrink-0"
                                  title="فتح الرابط"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : card.status === "claimed" ? (
                              <span className="text-[11px] text-emerald-600 font-medium">البروفايل المربوط</span>
                            ) : (
                              <span className="text-[11px] text-slate-400">— غير محدد —</span>
                            )}
                          </td>

                          {/* Distribution */}
                          <td className="py-4 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold capitalize">
                              {card.distributionType === "sale"
                                ? "بيع"
                                : card.distributionType === "gift"
                                ? "هدية"
                                : card.distributionType === "sample"
                                ? "عينة"
                                : "شركات"}
                            </span>
                          </td>

                          {/* Ownership Status */}
                          <td className="py-4 px-4">
                            <OwnershipBadge status={card.status} />
                          </td>

                          {/* Dashboard Operational Status (In Printing vs Card Received) */}
                          <td className="py-4 px-4">
                            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/90 shrink-0 gap-1 shadow-2xs">
                              <button
                                type="button"
                                onClick={() =>
                                  handleOperationalStatusChange(
                                    card,
                                    currentOpStatus === "in_printing" ? "" : "in_printing"
                                  )
                                }
                                disabled={togglingStatusId === card._id}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  currentOpStatus === "in_printing"
                                    ? "bg-amber-500 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                                }`}
                                title="تحديد الكارت في الطباعة"
                              >
                                {togglingStatusId === card._id && currentOpStatus !== "in_printing" ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                                ) : (
                                  <Printer
                                    className={`w-3 h-3 shrink-0 ${
                                      currentOpStatus === "in_printing" ? "animate-pulse" : "text-slate-400"
                                    }`}
                                  />
                                )}
                                <span>في الطباعة</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleOperationalStatusChange(
                                    card,
                                    currentOpStatus === "received" ? "" : "received"
                                  )
                                }
                                disabled={togglingStatusId === card._id}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  currentOpStatus === "received"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                                }`}
                                title="تحديد تم استلام الكارت"
                              >
                                <CheckCircle2
                                  className={`w-3 h-3 shrink-0 ${
                                    currentOpStatus === "received" ? "text-white" : "text-slate-400"
                                  }`}
                                />
                                <span>تم استلام الكارت</span>
                              </button>
                            </div>
                          </td>

                          {/* Owner & Profile */}
                          <td className="py-4 px-4">
                            {card.userId ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                                  {(typeof card.userId === 'object' ? card.userId.name?.[0] : "U") || "U"}
                                </div>
                                <div className="truncate max-w-[120px]">
                                  <p className="font-bold text-slate-800 truncate">
                                    {typeof card.userId === 'object' ? (card.userId.name || card.userId.username || "عميل المتجر") : `مستخدم: ${String(card.userId).slice(-6)}`}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {card.profileId?.name || (card.orderNumber ? `طلب #${card.orderNumber}` : "بروفايل نشط")}
                                  </p>
                                </div>
                              </div>
                            ) : card.orderNumber ? (
                              <Link
                                to={`/store?tab=orders&order=${encodeURIComponent(card.orderNumber.replace(/^#/, ""))}`}
                                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer group"
                                title={`عرض تفاصيل الطلب #${card.orderNumber} في إدارة المتجر`}
                              >
                                <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="text-amber-800 text-[11px] font-bold group-hover:underline">عميل طلب #{card.orderNumber.replace(/^#/, "")}</span>
                              </Link>
                            ) : (
                              <span className="text-slate-400 text-xs">— غير مربوط —</span>
                            )}
                          </td>

                          {/* Created At */}
                          <td className="py-4 px-4 text-slate-500 text-[11px]">
                            {new Date(card.createdAt).toLocaleDateString("ar-EG-u-nu-latn")}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                to={`/cards/${card._id}`}
                                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="عرض التفاصيل الكاملة"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              <button
                                onClick={() => setQrModalCard(card)}
                                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="رمز QR"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setStatusActionCard(card)}
                                className={`p-2 rounded-xl transition-colors ${
                                  card.status === "disabled"
                                    ? "text-emerald-600 hover:bg-emerald-50"
                                    : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                }`}
                                title={card.status === "disabled" ? "إعادة تفعيل الكارت" : "تعطيل الكارت"}
                              >
                                {card.status === "disabled" ? (
                                  <ShieldCheck className="w-4 h-4" />
                                ) : (
                                  <ShieldAlert className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>

                {/* ── MOBILE / SMALL SCREEN CARDS VIEW (Visible on < lg screens) ── */}
                <div className="block lg:hidden divide-y divide-slate-100">
                  {cards.map((card) => {
                    const siteBaseUrl = (import.meta.env.VITE_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
                    const staticUrl = card.cardUrl || `${siteBaseUrl}/c/${card.publicId}`;
                    const currentOpStatus = card.operationalStatus || (card.isPrinting ? "in_printing" : "");

                    return (
                      <div
                        key={`mobile-${card._id}`}
                        className={`p-4 transition-all rounded-2xl ${
                          selectedCardIds.has(card._id)
                            ? "bg-indigo-50/80 ring-2 ring-indigo-500/60 shadow-xs"
                            : currentOpStatus === "in_printing"
                            ? "bg-amber-100/80 border-r-4 border-r-amber-500 shadow-xs"
                            : currentOpStatus === "received"
                            ? "bg-emerald-50/80 border-r-4 border-r-emerald-500 shadow-xs"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        {/* Top Header: Title, Checkbox, QR Button, Type Badge */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedCardIds.has(card._id)}
                              onChange={() => toggleSelectCard(card._id)}
                              aria-label={`تحديد ${card.name || card.cardId}`}
                              className="w-4 h-4 mt-2 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0 transition-colors"
                            />
                            <button
                              onClick={() => setQrModalCard(card)}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-xs hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="معاينة وتحميل QR"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                  to={`/cards/${card._id}`}
                                  className="font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate text-sm"
                                >
                                  {card.name || card.productName || "منتج ذكي"}
                                </Link>
                                {card.orderNumber && (
                                  <Link
                                    to={`/store?tab=orders&order=${encodeURIComponent(card.orderNumber.replace(/^#/, ""))}`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shrink-0 transition-colors cursor-pointer"
                                    title={`عرض تفاصيل الطلب #${card.orderNumber} في إدارة المتجر`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Package className="w-2.5 h-2.5 text-amber-600" />
                                    #{card.orderNumber.replace(/^#/, "")}
                                  </Link>
                                )}
                                {currentOpStatus === "in_printing" && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300 shrink-0 animate-pulse">
                                    <Printer className="w-2.5 h-2.5 text-amber-700" />
                                    في الطباعة
                                  </span>
                                )}
                                {currentOpStatus === "received" && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                    تم استلام الكارت
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                                <span className="font-mono font-bold text-slate-700">{card.cardId}</span>
                                <span>•</span>
                                <span className="font-mono text-slate-400">c/{card.publicId}</span>
                                <button
                                  onClick={() => copyToClipboard(staticUrl, card._id)}
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="نسخ الرابط"
                                >
                                  {copiedId === card._id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          <HardwareTypeBadge type={card.productType || "card"} />
                        </div>

                        {/* Middle: Details Grid (Excluding Color & Type) */}
                        <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-y border-slate-100/90 my-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">الشريحة:</span>
                            <span className="font-mono font-bold text-indigo-700 text-[11px]">{card.nfcChipType || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">كلمة المرور:</span>
                            <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                              {card.cardPassword || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2">
                            <span className="text-[11px] text-slate-400">الملكية:</span>
                            <OwnershipBadge status={card.status} />
                          </div>
                        </div>

                        {/* Bottom Row: Operational Status Buttons & Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          {/* Segmented Operational Status Toggle */}
                          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/90 shrink-0 gap-1 shadow-2xs">
                            <button
                              type="button"
                              onClick={() =>
                                handleOperationalStatusChange(
                                  card,
                                  currentOpStatus === "in_printing" ? "" : "in_printing"
                                )
                              }
                              disabled={togglingStatusId === card._id}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                currentOpStatus === "in_printing"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                              }`}
                              title="تحديد الكارت في الطباعة"
                            >
                              <Printer
                                className={`w-3 h-3 shrink-0 ${
                                  currentOpStatus === "in_printing" ? "animate-pulse" : "text-slate-400"
                                }`}
                              />
                              <span>في الطباعة</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleOperationalStatusChange(
                                  card,
                                  currentOpStatus === "received" ? "" : "received"
                                )
                              }
                              disabled={togglingStatusId === card._id}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                currentOpStatus === "received"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                              }`}
                              title="تحديد تم استلام الكارت"
                            >
                              <CheckCircle2
                                className={`w-3 h-3 shrink-0 ${
                                  currentOpStatus === "received" ? "text-white" : "text-slate-400"
                                }`}
                              />
                              <span>تم استلام الكارت</span>
                            </button>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/cards/${card._id}`}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>التفاصيل</span>
                            </Link>
                            <button
                              onClick={() => setStatusActionCard(card)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                card.status === "disabled"
                                  ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                  : "border-slate-200 text-slate-500 hover:bg-slate-100"
                              }`}
                              title={card.status === "disabled" ? "إعادة تفعيل الكارت" : "تعطيل الكارت"}
                            >
                              {card.status === "disabled" ? (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              ) : (
                                <ShieldAlert className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Pagination Controls */}
            {!loading && total > limit && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <p>
                  عرض <span className="font-bold text-slate-900">{(page - 1) * limit + 1}</span> إلى{" "}
                  <span className="font-bold text-slate-900">{Math.min(page * limit, total)}</span> من أصل{" "}
                  <span className="font-bold text-slate-900">{total}</span> كارت
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-800">
                    صفحة {page} من {Math.ceil(total / limit)}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
                    disabled={page >= Math.ceil(total / limit)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: BATCHES & INVENTORY ──────────────────────────────────────── */}
      {activeTab === "batches" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">دفعات التصنيع وإدارة المخزون</h2>
              <p className="text-xs text-slate-500">سجل دفعات كروت Thenith المجمعة والمصنعة وجرد المخزون الفعلي.</p>
            </div>
            <button
              onClick={() => setShowAddBatchModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              إضافة دفعة تصنيع جديدة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {batches.map((batch) => (
              <div key={batch._id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      {batch.batchId}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-2">{batch.name}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 capitalize">
                    {batch.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl text-xs">
                  <div>
                    <p className="text-slate-400">الكمية المقررة:</p>
                    <p className="font-bold text-slate-800">{batch.quantity} كارت</p>
                  </div>
                  <div>
                    <p className="text-slate-400">النوع واللون:</p>
                    <p className="font-bold text-slate-800 capitalize">
                      {batch.cardType} — {batch.color}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">الكروت المنشأة:</p>
                    <p className="font-bold text-indigo-600">{batch.cardCounts?.total || 0} كارت</p>
                  </div>
                  <div>
                    <p className="text-slate-400">المربوط بالعملاء:</p>
                    <p className="font-bold text-emerald-600">{batch.cardCounts?.claimed || 0} كارت</p>
                  </div>
                </div>

                {batch.notes && <p className="text-xs text-slate-500 italic">ملاحظات: {batch.notes}</p>}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    تاريخ التصنيع: {new Date(batch.manufacturedAt).toLocaleDateString("ar-EG-u-nu-latn")}
                  </span>
                  <button
                    onClick={() => {
                      setBatchFilter(batch._id);
                      setActiveTab("cards");
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-bold"
                  >
                    عرض كروت الدفعة ←
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL: ADD PRODUCT / SMART CARD ─────────────────────────────────── */}
      {showAddModal && (
        <Modal title="إضافة منتج ذكي جديد (NFC Product)" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleCreateCard} className="space-y-4 text-xs font-medium">
            {/* Product Name / Label */}
            <div>
              <label className="block text-slate-800 font-bold mb-1.5 flex items-center justify-between">
                <span>
                  اسم المنتج / التسمية <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  مثال: كارت Thenith أسود فاخر، ميدالية ذكية خشبية، ستاند مكتبي رخام...
                </span>
              </label>
              <input
                type="text"
                required
                value={newCardForm.name}
                onChange={(e) => setNewCardForm({ ...newCardForm, name: e.target.value })}
                placeholder="أدخل اسم أو تسمية المنتج الذكي..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
              />
            </div>

            {/* Hardware Form Factor */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">شكل ونوع القطعة (Form Factor)</label>
              <select
                value={newCardForm.productType}
                onChange={(e) => setNewCardForm({ ...newCardForm, productType: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                {HARDWARE_TYPES.map((hw) => (
                  <option key={hw.id} value={hw.id}>
                    {hw.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">خامة / طراز القطعة</label>
                <select
                  value={newCardForm.cardType}
                  onChange={(e) => setNewCardForm({ ...newCardForm, cardType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="standard">Standard (بلاستيك ذكي مصفح)</option>
                  <option value="premium">Premium (بلاستيك مطفي فاخر)</option>
                  <option value="metal">Metal (معدني فاخر)</option>
                  <option value="bamboo">Bamboo (خشب بامبو طبيعي)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">لون القطعة</label>
                <select
                  value={newCardForm.color}
                  onChange={(e) => setNewCardForm({ ...newCardForm, color: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="black">أسود (Black)</option>
                  <option value="white">أبيض (White)</option>
                  <option value="blue">أزرق (Blue)</option>
                  <option value="purple">بنفسجي (Purple)</option>
                  <option value="silver">فضي (Silver)</option>
                  <option value="gold">ذهبي (Gold)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">نوع التوزيع</label>
                <select
                  value={newCardForm.distributionType}
                  onChange={(e) => setNewCardForm({ ...newCardForm, distributionType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="sale">مخصص للبيع (Sale)</option>
                  <option value="gift">هدية ترويجية (Gift)</option>
                  <option value="sample">عينة تجريبية (Sample)</option>
                  <option value="corporate">شركات ومؤسسات (Corporate)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  شريحة NFC المناسبة <span className="text-rose-500">*</span>
                </label>
                {chipTypes.length === 0 ? (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                    لا توجد شرائح مضافة حالياً. يرجى إضافة شريحة أولاً من تبويب "أنواع شرائح NFC".
                  </div>
                ) : (
                  <select
                    required
                    value={newCardForm.nfcChipType}
                    onChange={(e) => setNewCardForm({ ...newCardForm, nfcChipType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs font-bold text-slate-900"
                  >
                    <option value="" disabled>-- اختر الشريحة من الشرائح المضافة --</option>
                    {chipTypes.map((ct) => (
                      <option key={ct._id || ct.name} value={ct.name}>
                        {ct.title || ct.name} ({ct.name}) {ct.memorySize ? `— ${ct.memorySize}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">ربط بدفعة تصنيع (اختياري)</label>
              <select
                value={newCardForm.batchId}
                onChange={(e) => setNewCardForm({ ...newCardForm, batchId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">بدون دفعة تصنيع محددة</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.batchId} — {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target URL or User Public ID */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                معرّف المستخدم أو رابط التوجيه (User Public ID أو Direct Link) — اختياري
              </label>
              <input
                type="text"
                value={newCardForm.targetUrl}
                onChange={(e) => setNewCardForm({ ...newCardForm, targetUrl: e.target.value })}
                placeholder="مثال: john أو a8K29xP7 أو https://thenith.com/p/john"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                dir="ltr"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                إذا قمت بوضع معرّف أو رابط، سيتم توجيه من يمسح المنتج أو الكيو آر كود تلقائياً إليه.
              </p>
            </div>

            {/* Product Password (6 numeric digits) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 font-bold">
                  كلمة مرور المنتج (6 أرقام فقط)
                </label>
                <button
                  type="button"
                  onClick={() => setNewCardForm({ ...newCardForm, cardPassword: generate6CharPassword() })}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  توليد 6 أرقام جديدة
                </button>
              </div>
              <input
                type="text"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                value={newCardForm.cardPassword}
                onChange={(e) => setNewCardForm({ ...newCardForm, cardPassword: e.target.value.replace(/\D/g, "") })}
                placeholder="مثال: 582194"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm tracking-widest font-bold text-slate-900"
                dir="ltr"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                كلمة المرور تتكون من 6 أرقام حصراً، وتُستخدم في قفل ومصادقة شريحة NFC الخاصة بهذا المنتج.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <p>• سيتم توليد <strong>معرّف المنتج (ID)</strong> و <strong>Public ID</strong> آمن عشوائياً وتلقائياً.</p>
              <p>• سيتم إنشاء الرابط الثابت <code>https://thenith.com/c/&#123;publicId&#125;</code> وتوليد رمز QR الخاص به.</p>
              <p>• سيتم إنشاء سجل بيانات اعتماد NFC مشفّر بكلمة مرور فريدة ومستقلة لهذا المنتج.</p>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submittingCard}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {submittingCard && <Loader2 className="w-4 h-4 animate-spin" />}
                إنشاء وحفظ المنتج
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: BULK CREATION ────────────────────────────────────────────── */}
      {showBulkModal && (
        <Modal title="إنشاء منتجات وقطع ذكية بالجملة (Bulk Products)" onClose={() => setShowBulkModal(false)} wide>
          {bulkResult ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                تم بنجاح إنشاء {bulkResult.count} منتج / قطعة ذكية جديدة!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                تم حفظ جميع سجلات المنتجات وتوليد المعرفات الفريدة والروابط الثابتة وكلمات المرور (6 أرقام فقط) وتجهيز بيانات تشفير NFC لكل قطعة.
              </p>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl p-4 bg-slate-50 text-start text-xs space-y-2">
                {bulkResult.cards.map((c) => (
                  <div key={c._id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900">{c.name || "منتج ذكي"}</span>
                      <span className="font-mono text-slate-500 ms-2 text-[11px]">{c.cardId}</span>
                    </div>
                    <span className="font-mono text-indigo-600">c/{c.publicId}</span>
                    <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                      PIN: {c.cardPassword || "—"}
                    </span>
                    <span className="text-slate-400 capitalize">{c.color}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs"
                >
                  إغلاق والعودة للجدول
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateBulk} className="space-y-4 text-xs font-medium">
              {/* Product Group Name & Hardware Type */}
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5 flex items-center justify-between">
                    <span>
                      تسمية المنتجات / اسم المجموعة <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      مثال: دفعة كروت Thenith سوداء فاخرة، ميداليات المؤتمر السنوي...
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bulkForm.name}
                    onChange={(e) => setBulkForm({ ...bulkForm, name: e.target.value })}
                    placeholder="أدخل اسم أو تسمية مجموعة المنتجات..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">شكل ونوع القطعة (Form Factor)</label>
                  <select
                    value={bulkForm.productType}
                    onChange={(e) => setBulkForm({ ...bulkForm, productType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    {HARDWARE_TYPES.map((hw) => (
                      <option key={hw.id} value={hw.id}>
                        {hw.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">عدد المنتجات المطلوب إنشاؤها</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={bulkForm.quantity}
                    onChange={(e) => setBulkForm({ ...bulkForm, quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-400">بين 1 إلى 500 قطعة في العملية الواحدة</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">دفعة التصنيع</label>
                  <select
                    value={bulkForm.batchId}
                    onChange={(e) => setBulkForm({ ...bulkForm, batchId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">بدون دفعة تصنيع محددة</option>
                    {batches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.batchId} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">خامة / طراز المنتج</label>
                  <select
                    value={bulkForm.cardType}
                    onChange={(e) => setBulkForm({ ...bulkForm, cardType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                  >
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="metal">Metal</option>
                    <option value="bamboo">Bamboo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">اللون</label>
                  <select
                    value={bulkForm.color}
                    onChange={(e) => setBulkForm({ ...bulkForm, color: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                  >
                    <option value="black">أسود</option>
                    <option value="white">أبيض</option>
                    <option value="blue">أزرق</option>
                    <option value="purple">بنفسجي</option>
                    <option value="silver">فضي</option>
                    <option value="gold">ذهبي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">نوع التوزيع</label>
                  <select
                    value={bulkForm.distributionType}
                    onChange={(e) => setBulkForm({ ...bulkForm, distributionType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                  >
                    <option value="sale">بيع (Sale)</option>
                    <option value="gift">هدية (Gift)</option>
                    <option value="sample">عينة (Sample)</option>
                    <option value="corporate">شركات (Corporate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    شريحة NFC المناسبة <span className="text-rose-500">*</span>
                  </label>
                  {chipTypes.length === 0 ? (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                      لا توجد شرائح مضافة حالياً.
                    </div>
                  ) : (
                    <select
                      required
                      value={bulkForm.nfcChipType}
                      onChange={(e) => setBulkForm({ ...bulkForm, nfcChipType: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-mono text-xs font-bold"
                    >
                      <option value="" disabled>-- اختر الشريحة من الشرائح المضافة فقط --</option>
                      {chipTypes.map((ct) => (
                        <option key={ct._id || ct.name} value={ct.name}>
                          {ct.title || ct.name} ({ct.name}) {ct.memorySize ? `— ${ct.memorySize}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 p-4 rounded-2xl text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  ضمان الفرادة والأمان التام
                </p>
                <p className="text-slate-600">
                  سيتم توليد معرّف مستقل ورابط فريد ورمز QR منفصل لكل كارت على حدة، مع إنشاء بيانات اعتماد NFC مشفرة مستقلة تمنع أي تكرار.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingBulk}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submittingBulk && <Loader2 className="w-4 h-4 animate-spin" />}
                  بدء التوليد بالجملة
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ── MODAL: ADD BATCH ────────────────────────────────────────────────── */}
      {showAddBatchModal && (
        <Modal title="إضافة دفعة تصنيع جديدة" onClose={() => setShowAddBatchModal(false)}>
          <form onSubmit={handleCreateBatch} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">اسم الدفعة</label>
              <input
                type="text"
                required
                value={batchForm.name}
                onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                placeholder="مثال: دفعة ربيع 2026 - كروت سوداء معدنية"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">الكمية المقررة</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={batchForm.quantity}
                  onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">النوع</label>
                <select
                  value={batchForm.cardType}
                  onChange={(e) => setBatchForm({ ...batchForm, cardType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="metal">Metal</option>
                  <option value="bamboo">Bamboo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">اللون</label>
                <select
                  value={batchForm.color}
                  onChange={(e) => setBatchForm({ ...batchForm, color: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                >
                  <option value="black">أسود</option>
                  <option value="white">أبيض</option>
                  <option value="blue">أزرق</option>
                  <option value="purple">بنفسجي</option>
                  <option value="silver">فضي</option>
                  <option value="gold">ذهبي</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">ملاحظات إدارية</label>
              <textarea
                rows="3"
                value={batchForm.notes}
                onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                placeholder="أي ملاحظات حول المصنع أو الجودة..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddBatchModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submittingBatch}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {submittingBatch && <Loader2 className="w-4 h-4 animate-spin" />}
                إنشاء الدفعة
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: QR CODE PREVIEW & DOWNLOAD ───────────────────────────────── */}
      {qrModalCard && (
        <Modal
          title={`رمز QR للكارت: ${qrModalCard.cardId}`}
          onClose={() => setQrModalCard(null)}
        >
          {(() => {
            const siteBaseUrl = (import.meta.env.VITE_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
            const modalQrUrl = qrModalCard.cardUrl || `${siteBaseUrl}/c/${qrModalCard.publicId}`;

            return (
              <div className="flex flex-col items-center text-center space-y-6">
                {/* High-res QR Display */}
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-md flex items-center justify-center relative">
                  <QRCodeSVG
                    id={`qr-svg-${qrModalCard._id}`}
                    value={modalQrUrl}
                    size={220}
                    level="H"
                    includeMargin
                  />
                  {/* Hidden canvas for PNG export */}
                  <div className="hidden">
                    <QRCodeCanvas
                      id={`qr-canvas-${qrModalCard._id}`}
                      value={modalQrUrl}
                      size={1080}
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>

                <div className="space-y-1 w-full max-w-sm">
                  <p className="text-xs text-slate-400">الرابط الثابت المضمن داخل الرمز:</p>
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
                    <span className="truncate text-indigo-600">
                      {modalQrUrl}
                    </span>
                    <button
                      onClick={() => copyToClipboard(modalQrUrl, qrModalCard._id)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-800"
                      title="نسخ الرابط"
                    >
                  {copiedId === qrModalCard._id ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex items-center justify-center gap-3 w-full">
              <button
                onClick={() => downloadQrPng(qrModalCard)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                تحميل بدقة عالية (PNG)
              </button>

              <button
                onClick={() => downloadQrSvg(qrModalCard)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                تحميل متجهي (SVG)
              </button>
            </div>

            <Link
              to={`/cards/${qrModalCard._id}`}
              className="text-xs text-indigo-600 hover:underline font-bold"
            >
              فتح صفحة تفاصيل وإدارة الكارت ←
            </Link>
          </div>
            );
          })()}
        </Modal>
      )}

      {/* ── MODAL: STATUS CONFIRMATION (DISABLE / ENABLE) ───────────────────── */}
      {statusActionCard && (
        <Modal
          title={statusActionCard.status === "disabled" ? "إعادة تفعيل الكارت" : "تعطيل الكارت إدارياً"}
          onClose={() => setStatusActionCard(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">
                  {statusActionCard.status === "disabled"
                    ? "هل أنت متأكد من إعادة تفعيل هذا الكارت؟"
                    : "هل أنت متأكد من تعطيل هذا الكارت؟"}
                </p>
                <p className="mt-1 text-slate-600">
                  {statusActionCard.status === "disabled"
                    ? "سيتمكن الزوار مجدداً من فتح البروفايل المرتبط عند مسح رمز QR أو النقر على شريحة NFC."
                    : "سيتم منع الزوار فوراً من الوصول إلى البروفايل عبر هذا الكارت وعرض إشعار بالتعطيل."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setStatusActionCard(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleToggleStatus(statusActionCard)}
                className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-md ${
                  statusActionCard.status === "disabled"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {statusActionCard.status === "disabled" ? "تأكيد إعادة التفعيل" : "تأكيد التعطيل"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: CHIP TYPE (ADD / EDIT) ────────────────────────────────────── */}
      {showChipModal && (
        <Modal
          title={editingChip ? "تعديل نوع الشريحة الذكية" : "إضافة نوع شريحة NFC جديد"}
          onClose={() => {
            setShowChipModal(false);
            setEditingChip(null);
          }}
        >
          <form onSubmit={handleSaveChip} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">كود الشريحة البرمجي (Identifier)</label>
              <input
                type="text"
                required
                value={chipForm.name}
                onChange={(e) => setChipForm({ ...chipForm, name: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                placeholder="مثال: NTAG215 أو MIFARE_DESFIRE"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold text-slate-900"
                dir="ltr"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">يُفضل كتابته بأحرف إنجليزية كبيرة وبدون مسافات</span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">عنوان / اسم الشريحة التوضيحي</label>
              <input
                type="text"
                required
                value={chipForm.title}
                onChange={(e) => setChipForm({ ...chipForm, title: e.target.value })}
                placeholder="مثال: NXP NTAG215 (شريحة قياسية عالية التوافق)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">سعة الذاكرة القابلة للاستخدام</label>
              <input
                type="text"
                value={chipForm.memorySize}
                onChange={(e) => setChipForm({ ...chipForm, memorySize: e.target.value })}
                placeholder="مثال: 504 بايت أو 144 بايت أو 888 بايت"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">وصف وملاحظات الشريحة</label>
              <textarea
                rows="3"
                value={chipForm.description}
                onChange={(e) => setChipForm({ ...chipForm, description: e.target.value })}
                placeholder="توضيح متى تُستخدم هذه الشريحة وأي مواصفات فنية إضافية..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={chipForm.isDefault}
                  onChange={(e) => setChipForm({ ...chipForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="font-bold text-slate-800">تعيين كشريحة افتراضية للمنتجات</span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors">
                <input
                  type="checkbox"
                  checked={chipForm.isActive}
                  onChange={(e) => setChipForm({ ...chipForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="font-bold text-slate-800">مفعلة ومتاحة للاختيار</span>
              </label>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowChipModal(false);
                  setEditingChip(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingChip}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {savingChip && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingChip ? "تحديث الشريحة" : "إضافة الشريحة"}
              </button>
            </div>
          </form>
        </Modal>
      )}



      {/* ── MODAL: CONFIRM DELETE CHIP ───────────────────────────────────────── */}
      {deleteChipConfirm && (
        <Modal title="تأكيد حذف نوع الشريحة" onClose={() => setDeleteChipConfirm(null)}>
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">
                  هل أنت متأكد من حذف شريحة "{deleteChipConfirm.title || deleteChipConfirm.name}"؟
                </p>
                <p className="mt-1 text-slate-600">
                  لن يظهر هذا النوع بعد الآن عند إضافة منتجات أو كروت جديدة.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setDeleteChipConfirm(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteChip(deleteChipConfirm._id)}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── FLOATING BULK ACTIONS BAR (When cards are selected) ──────────────── */}
      {selectedCardIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-2xl bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs">
              {selectedCardIds.size}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>تم تحديد {selectedCardIds.size} {selectedCardIds.size === 1 ? "كارت" : "كروت"}</span>
              </p>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                اختر الحالة لتطبيقها على جميع الكروت المحددة:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
            {/* Choice 1: In Printing */}
            <button
              type="button"
              disabled={bulkUpdatingStatus}
              onClick={() => handleBulkOperationalStatusChange("in_printing")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="تعيين في الطباعة للكروت المحددة"
            >
              {bulkUpdatingStatus ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>في الطباعة</span>
            </button>

            {/* Choice 2: Received */}
            <button
              type="button"
              disabled={bulkUpdatingStatus}
              onClick={() => handleBulkOperationalStatusChange("received")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="تعيين تم استلام الكارت للكروت المحددة"
            >
              {bulkUpdatingStatus ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>تم استلام الكارت</span>
            </button>

            {/* Choice 3: Reset / Normal */}
            <button
              type="button"
              disabled={bulkUpdatingStatus}
              onClick={() => handleBulkOperationalStatusChange("")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white border border-slate-600 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="إلغاء الحالة وإعادة الكروت المحددة للوضع الطبيعي"
            >
              {bulkUpdatingStatus ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>إلغاء الحالة (عادي)</span>
            </button>

            {/* Deselect All */}
            <button
              type="button"
              disabled={bulkUpdatingStatus}
              onClick={() => setSelectedCardIds(new Set())}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="إلغاء التحديد"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: SCAN QR CODE TO SEARCH CARD ─────────────────────────────────── */}
      <CardQrScannerModal
        isOpen={showScanQrModal}
        onClose={() => setShowScanQrModal(false)}
        onScan={handleQrScanComplete}
      />
    </div>
  );
}
