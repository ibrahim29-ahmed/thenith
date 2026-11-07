import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  Upload,
  RotateCw,
  Download,
  Eye,
  EyeOff,
  Type,
  Palette,
  Image as ImageIcon,
  Sliders,
  Trash2,
  Layers,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  ChevronDown,
  Move,
  Plus,
  RotateCcw,
  Pipette,
  Wifi,
  AlignCenter,
  AlignLeft,
  AlignRight,
  CreditCard,
  QrCode,
  Save,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings,
  HelpCircle,
  Copy,
  X,
  Zap,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  fetchCustomCardSettings,
  updateCustomCardSettings,
  uploadAdminImage,
} from "../services/adminApi.js";
import { analyzeCardImages } from "../utils/cardAnalyzer.js";

// ── Built-in Palette Colors ──────────────────────────────────────────────────
const PURE_EXPLICIT_COLORS = [
  { hex: "#000000", labelAr: "أسود فاحم" },
  { hex: "#ffffff", labelAr: "أبيض ناصع" },
  { hex: "#ff0000", labelAr: "أحمر صريح" },
  { hex: "#ff6600", labelAr: "برتقالي صريح" },
  { hex: "#ffea00", labelAr: "أصفر صريح" },
  { hex: "#00cc44", labelAr: "أخضر صريح" },
  { hex: "#00d4ff", labelAr: "سماوي صريح" },
  { hex: "#0033ff", labelAr: "أزرق صريح" },
  { hex: "#001845", labelAr: "كحلي داكن" },
  { hex: "#7a00ff", labelAr: "بنفسجي صريح" },
  { hex: "#ff007f", labelAr: "فوشيا صريح" },
];

const TEXT_COLORS = [
  { id: "#ffffff", nameAr: "أبيض ناصع", value: "#ffffff", border: "rgba(255,255,255,0.4)" },
  { id: "#d4af37", nameAr: "ذهب معدني", value: "#d4af37", glow: "rgba(212,175,55,0.45)" },
  { id: "#e2e8f0", nameAr: "فضة بلاتين", value: "#e2e8f0", glow: "rgba(226,232,240,0.35)" },
  { id: "#fbbf24", nameAr: "كهرمان دافئ", value: "#fbbf24" },
  { id: "#38bdf8", nameAr: "أزرق ثلجي", value: "#38bdf8", glow: "rgba(56,189,248,0.35)" },
  { id: "#a78bfa", nameAr: "بنفسجي نيون", value: "#a78bfa" },
  { id: "#34d399", nameAr: "أخضر زمردي", value: "#34d399" },
  { id: "#f43f5e", nameAr: "وردي روز", value: "#f43f5e" },
  { id: "#0f172a", nameAr: "أسود داكن", value: "#0f172a", border: "rgba(255,255,255,0.25)" },
];

// ── Background Presets (Exact matches from Panel) ─────────────────────────────
const BACKGROUND_PRESETS = [
  {
    id: "thenith_signature",
    nameAr: "ثينيث الأصلي (Signature)",
    category: "signature",
    style: {
      backgroundColor: "#02040b",
      backgroundImage:
        "radial-gradient(circle at 100% 100%, #0033ff 0%, #0022cc 24%, transparent 48%), radial-gradient(circle at 0% 100%, #0022cc 0%, transparent 42%), radial-gradient(circle at 50% 20%, #070e24 0%, #010206 100%)",
    },
  },
  {
    id: "carbon_fiber",
    nameAr: "ألياف الكربون (Carbon Fiber)",
    category: "texture",
    style: {
      backgroundColor: "#0d0f12",
      backgroundImage:
        "radial-gradient(#1e293b 15%, transparent 16%), radial-gradient(#1e293b 15%, transparent 16%)",
      backgroundSize: "12px 12px",
      backgroundPosition: "0 0, 6px 6px",
    },
  },
  {
    id: "matte_black",
    nameAr: "أسود مطفأ (Matte Black)",
    category: "luxury",
    style: {
      backgroundColor: "#09090b",
      backgroundImage:
        "linear-gradient(135deg, #18181b 0%, #09090b 50%, #000000 100%)",
    },
  },
  {
    id: "brushed_gold",
    nameAr: "ذهب ملكي مصقول (Imperial Gold)",
    category: "luxury",
    style: {
      backgroundColor: "#171307",
      backgroundImage:
        "linear-gradient(135deg, #2d2412 0%, #171307 40%, #0a0802 80%, #1c1709 100%)",
    },
  },
  {
    id: "royal_emerald",
    nameAr: "الزمرد الملكي (Royal Emerald)",
    category: "luxury",
    style: {
      backgroundColor: "#022c22",
      backgroundImage:
        "radial-gradient(circle at 85% 15%, #059669 0%, transparent 40%), linear-gradient(145deg, #064e3b 0%, #022c22 60%, #011612 100%)",
    },
  },
  {
    id: "cyber_neon",
    nameAr: "سايبر نيون (Cyber Sapphire)",
    category: "modern",
    style: {
      backgroundColor: "#020617",
      backgroundImage:
        "radial-gradient(circle at 10% 20%, #38bdf8 0%, transparent 30%), radial-gradient(circle at 90% 80%, #6366f1 0%, transparent 40%), linear-gradient(135deg, #0f172a 0%, #020617 100%)",
    },
  },
  {
    id: "pure_white",
    nameAr: "أبيض رخامي بلاتيني (Pearl White)",
    category: "light",
    isLight: true,
    style: {
      backgroundColor: "#ffffff",
      backgroundImage:
        "linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)",
    },
  },
];

// ── Font Options ─────────────────────────────────────────────────────────────
const FONT_OPTIONS = [
  { id: "Cairo", nameAr: "Cairo (كايرو - عصري وواضح)", cssFamily: "'Cairo', sans-serif" },
  { id: "Tajawal", nameAr: "Tajawal (تجوّل - أنيق وسلس)", cssFamily: "'Tajawal', sans-serif" },
  { id: "Almarai", nameAr: "Almarai (المراعي - هندسي تقني)", cssFamily: "'Almarai', sans-serif" },
  { id: "Alexandria", nameAr: "Alexandria (الإسكندرية - مينيمال حديث)", cssFamily: "'Alexandria', sans-serif" },
  { id: "Noto Kufi Arabic", nameAr: "Noto Kufi (كوفي حديث رسمي)", cssFamily: "'Noto Kufi Arabic', sans-serif" },
  { id: "Amiri", nameAr: "Amiri (أميري - كلاسيكي ملكي)", cssFamily: "'Amiri', serif" },
  { id: "Outfit", nameAr: "Outfit (أوتفت - فاخر ونظيف)", cssFamily: "'Outfit', sans-serif" },
  { id: "Playfair Display", nameAr: "Playfair (سيريف إيطالي فاخر)", cssFamily: "'Playfair Display', serif" },
  { id: "Cinzel", nameAr: "Cinzel (سينزل - روماني فخم)", cssFamily: "'Cinzel', serif" },
  { id: "Montserrat", nameAr: "Montserrat (مونتسرات - عالمي متوازن)", cssFamily: "'Montserrat', sans-serif" },
  { id: "Poppins", nameAr: "Poppins (بوبينز - هندسي جذاب)", cssFamily: "'Poppins', sans-serif" },
  { id: "Inter", nameAr: "Inter (إنتر - تقني تنفيذي)", cssFamily: "'Inter', sans-serif" },
];

// ── Default Coordinates & Visibility (Identical to Customer Panel) ─────────────
const DEFAULT_POSITIONS = {
  name: { x: 50, y: 50 },
  job: { x: 50, y: 64 },
  logo: { x: 84, y: 18 },
  logo2: { x: 16, y: 18 },
  brand: { x: 16, y: 18 },
  tap: { x: 22, y: 88 },
  backTitle: { x: 28, y: 20 },
  backQr: { x: 75, y: 50 },
  backSubtitle: { x: 28, y: 82 },
  backLogo: { x: 20, y: 65 },
  backLogo2: { x: 50, y: 65 },
};

const DEFAULT_VISIBILITY = {
  name: true,
  job: true,
  logo: true,
  logo2: true,
  brand: false,
  tap: false,
  backLogo: true,
  backLogo2: true,
  backTitle: true,
  backSubtitle: true,
  backQr: true,
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomCardManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'bg' | 'images' | 'back' | 'admin_settings'
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState("name");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showElementPins, setShowElementPins] = useState(true);

  // ── Card Content State (Default Name is "NAME" as requested) ───────────────
  const [cardName, setCardName] = useState("NAME");
  const [cardJob, setCardJob] = useState("");
  const [selectedFont, setSelectedFont] = useState("Cairo");
  const [nameFont, setNameFont] = useState("Cairo");
  const [jobFont, setJobFont] = useState("Cairo");
  const [nameSize, setNameSize] = useState(24);
  const [nameColor, setNameColor] = useState("#ffffff");
  const [jobSize, setJobSize] = useState(13);
  const [jobColor, setJobColor] = useState("#94a3b8");
  const [textAlign, setTextAlign] = useState("center");
  const [customTexts, setCustomTexts] = useState([]);

  // ── Background State ───────────────────────────────────────────────────────
  const [selectedBg, setSelectedBg] = useState("thenith_signature");
  const [bgSubTab, setBgSubTab] = useState("presets"); // 'presets' | 'pure_color' | 'custom_card'
  const [customSolidBgColor, setCustomSolidBgColor] = useState("#0f172a");
  const [customBgDataUrl, setCustomBgDataUrl] = useState(null);
  const [customBackBgDataUrl, setCustomBackBgDataUrl] = useState(null);

  // ── Front & Back Images State (وش وضهر) ────────────────────────────────────
  // الوجه الأمامي: صورة 1 وصورة 2
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [logoSize, setLogoSize] = useState(55);
  const [logoFilter, setLogoFilter] = useState("none");
  const [logo2DataUrl, setLogo2DataUrl] = useState(null);
  const [logo2Size, setLogo2Size] = useState(55);
  const [logo2Filter, setLogo2Filter] = useState("none");

  // الوجه الخلفي: صورة 1 وصورة 2
  const [backLogoDataUrl, setBackLogoDataUrl] = useState(null);
  const [backLogoSize, setBackLogoSize] = useState(55);
  const [backLogoFilter, setBackLogoFilter] = useState("none");
  const [backLogo2DataUrl, setBackLogo2DataUrl] = useState(null);
  const [backLogo2Size, setBackLogo2Size] = useState(55);
  const [backLogo2Filter, setBackLogo2Filter] = useState("none");

  // ── Positions & Visibility (Independent for every element) ─────────────────
  const [elementsPos, setElementsPos] = useState(DEFAULT_POSITIONS);
  const [elementsVisibility, setElementsVisibility] = useState(DEFAULT_VISIBILITY);

  // ── Back Face State ────────────────────────────────────────────────────────
  const [backTitle, setBackTitle] = useState("Digital Identity Card");
  const [backTitleFont, setBackTitleFont] = useState("Cairo");
  const [backTitleSize, setBackTitleSize] = useState(13);
  const [backTitleColor, setBackTitleColor] = useState("#ffffff");
  const [backSubtitle, setBackSubtitle] = useState("thenith.com");
  const [backSubtitleFont, setBackSubtitleFont] = useState("Cairo");
  const [backSubtitleSize, setBackSubtitleSize] = useState(12);
  const [backSubtitleColor, setBackSubtitleColor] = useState("#94a3b8");
  const [backQrValue, setBackQrValue] = useState("https://thenith.com/p/preview");
  const [backQrSize, setBackQrSize] = useState(88);
  const [qrColor, setQrColor] = useState("#000000");
  const [backQrContainerBg, setBackQrContainerBg] = useState("white");

  // ── Admin & Store Page Settings State ──────────────────────────────────────
  const [pageSettings, setPageSettings] = useState({
    pageTitleAr: "صمم كارتك الذكي بنفسك",
    pageTitleEn: "Design Your Smart Card",
    pageSubtitleAr: "خصص تفاصيل هويتك، اللوجو، ورمز الاستجابة السريعة بطباعة فائقة الدقة وشريحة NFC المدمجة",
    basePrice: 450,
    doubleSidedExtraPrice: 150,
    currency: "EGP",
    ctaButtonTextAr: "إضافة للسلة والطلب",
    allowLogoUpload: true,
    allowQrCode: true,
    allowBackSideDesign: true,
  });

  // Canvas Refs for Drag & Drop
  const cardRef = useRef(null);
  const frontFaceRef = useRef(null);
  const backFaceRef = useRef(null);
  const draggingRef = useRef(null);

  // ── Load Server Defaults on Mount ──────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchCustomCardSettings();
        if (data) {
          if (data.cardName !== undefined) setCardName(data.cardName || "NAME");
          if (data.cardJob !== undefined) setCardJob(data.cardJob || "");
          if (data.selectedBg) {
            setSelectedBg(data.selectedBg);
            if (data.selectedBg === "custom") {
              setBgSubTab("custom_card");
            } else if (data.selectedBg === "custom_solid_color") {
              setBgSubTab("pure_color");
            } else {
              setBgSubTab("presets");
            }
          }
          if (data.customSolidBgColor) setCustomSolidBgColor(data.customSolidBgColor);
          if (data.customBgDataUrl !== undefined) setCustomBgDataUrl(data.customBgDataUrl);
          if (data.customBackBgDataUrl !== undefined) setCustomBackBgDataUrl(data.customBackBgDataUrl);
          if (data.nameFont) setNameFont(data.nameFont);
          if (data.nameSize) setNameSize(data.nameSize);
          if (data.nameColor) setNameColor(data.nameColor);
          if (data.jobFont) setJobFont(data.jobFont);
          if (data.jobSize) setJobSize(data.jobSize);
          if (data.jobColor) setJobColor(data.jobColor);
          if (data.textAlign) setTextAlign(data.textAlign);
          if (data.customTexts) setCustomTexts(data.customTexts);

          // Front images
          if (data.logoDataUrl !== undefined) setLogoDataUrl(data.logoDataUrl);
          if (data.logoSize) setLogoSize(data.logoSize);
          if (data.logoFilter) setLogoFilter(data.logoFilter);
          if (data.logo2DataUrl !== undefined) setLogo2DataUrl(data.logo2DataUrl);
          if (data.logo2Size) setLogo2Size(data.logo2Size);
          if (data.logo2Filter) setLogo2Filter(data.logo2Filter);

          // Back images
          if (data.backLogoDataUrl !== undefined) setBackLogoDataUrl(data.backLogoDataUrl);
          if (data.backLogoSize) setBackLogoSize(data.backLogoSize);
          if (data.backLogoFilter) setBackLogoFilter(data.backLogoFilter);
          if (data.backLogo2DataUrl !== undefined) setBackLogo2DataUrl(data.backLogo2DataUrl);
          if (data.backLogo2Size) setBackLogo2Size(data.backLogo2Size);
          if (data.backLogo2Filter) setBackLogo2Filter(data.backLogo2Filter);

          // Back elements
          if (data.backTitle !== undefined) setBackTitle(data.backTitle);
          if (data.backTitleFont) setBackTitleFont(data.backTitleFont);
          if (data.backTitleSize) setBackTitleSize(data.backTitleSize);
          if (data.backTitleColor) setBackTitleColor(data.backTitleColor);
          if (data.backSubtitle !== undefined) setBackSubtitle(data.backSubtitle);
          if (data.backSubtitleFont) setBackSubtitleFont(data.backSubtitleFont);
          if (data.backSubtitleSize) setBackSubtitleSize(data.backSubtitleSize);
          if (data.backSubtitleColor) setBackSubtitleColor(data.backSubtitleColor);
          if (data.backQrValue) setBackQrValue(data.backQrValue);
          if (data.backQrSize) setBackQrSize(data.backQrSize);
          if (data.qrColor) setQrColor(data.qrColor);
          if (data.backQrContainerBg) setBackQrContainerBg(data.backQrContainerBg);

          if (data.elementsPos) {
            setElementsPos({ ...DEFAULT_POSITIONS, ...data.elementsPos });
          }
          if (data.elementsVisibility) {
            setElementsVisibility({ ...DEFAULT_VISIBILITY, ...data.elementsVisibility });
          }

          setPageSettings({
            pageTitleAr: data.pageTitleAr || "صمم كارتك الذكي بنفسك",
            pageTitleEn: data.pageTitleEn || "Design Your Smart Card",
            pageSubtitleAr: data.pageSubtitleAr || "خصص تفاصيل هويتك، اللوجو، ورمز الاستجابة السريعة",
            basePrice: data.basePrice ?? 450,
            doubleSidedExtraPrice: data.doubleSidedExtraPrice ?? 150,
            currency: data.currency || "EGP",
            ctaButtonTextAr: data.ctaButtonTextAr || "إضافة للسلة والطلب",
            allowLogoUpload: data.allowLogoUpload ?? true,
            allowQrCode: data.allowQrCode ?? true,
            allowBackSideDesign: data.allowBackSideDesign ?? true,
          });
        }
      } catch (err) {
        console.warn("Could not load custom card settings", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Drag & Drop Engine (Freeform movement for each element on its own) ─────
  const startDrag = (id, e) => {
    e.stopPropagation();
    setSelectedElementId(id);

    if (id === "name" || id === "job") setActiveTab("text");
    if (id === "logo" || id === "logo2" || id === "backLogo" || id === "backLogo2") {
      setActiveTab("images");
    }
    if (id === "backTitle" || id === "backSubtitle" || id === "backQr") {
      setActiveTab("back");
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const currentFaceEl = isFlipped ? backFaceRef.current : frontFaceRef.current;
    const rect = (currentFaceEl || cardRef.current)?.getBoundingClientRect();
    if (!rect) return;

    draggingRef.current = {
      id,
      startX: clientX,
      startY: clientY,
      startPosX: elementsPos[id]?.x ?? DEFAULT_POSITIONS[id]?.x ?? 50,
      startPosY: elementsPos[id]?.y ?? DEFAULT_POSITIONS[id]?.y ?? 50,
      cardWidth: rect.width,
      cardHeight: rect.height,
    };

    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("touchend", onDragEnd);
    window.addEventListener("touchcancel", onDragEnd);
  };

  const onDragMove = (e) => {
    if (!draggingRef.current) return;
    if (e.cancelable) e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const { id, startX, startY, startPosX, startPosY, cardWidth, cardHeight } = draggingRef.current;
    const deltaXPercent = ((clientX - startX) / cardWidth) * 100;
    const deltaYPercent = ((clientY - startY) / cardHeight) * 100;

    const newX = Math.round(Math.max(4, Math.min(96, startPosX + deltaXPercent)) * 10) / 10;
    const newY = Math.round(Math.max(4, Math.min(96, startPosY + deltaYPercent)) * 10) / 10;

    setElementsPos((prev) => ({
      ...prev,
      [id]: { x: newX, y: newY },
    }));
  };

  const onDragEnd = () => {
    draggingRef.current = null;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);
    window.removeEventListener("touchmove", onDragMove);
    window.removeEventListener("touchend", onDragEnd);
    window.removeEventListener("touchcancel", onDragEnd);
  };

  // Nudge individual element position
  const nudgeElement = (id, deltaX, deltaY) => {
    if (!id) return;
    setElementsPos((prev) => {
      const current = prev[id] || DEFAULT_POSITIONS[id] || { x: 50, y: 50 };
      const newX = Math.round(Math.max(4, Math.min(96, current.x + deltaX)) * 10) / 10;
      const newY = Math.round(Math.max(4, Math.min(96, current.y + deltaY)) * 10) / 10;
      return { ...prev, [id]: { x: newX, y: newY } };
    });
  };

  // ── Save Current Setup as Global Studio Default ────────────────────────────
  const handleSaveAsDefault = async () => {
    try {
      setSaving(true);
      const newVersion = Date.now();
      const payload = {
        adminVersion: newVersion, // Bump version so customer panel adopts it immediately
        cardName,
        cardJob,
        selectedBg,
        customSolidBgColor,
        customBgDataUrl,
        customBackBgDataUrl,
        nameFont,
        jobFont,
        nameSize,
        nameColor,
        jobSize,
        jobColor,
        textAlign,
        customTexts,
        // Front Face Images
        logoDataUrl,
        logoSize,
        logoFilter,
        logo2DataUrl,
        logo2Size,
        logo2Filter,
        // Back Face Images
        backLogoDataUrl,
        backLogoSize,
        backLogoFilter,
        backLogo2DataUrl,
        backLogo2Size,
        backLogo2Filter,
        // Positions & Visibilities
        elementsPos,
        elementsVisibility,
        // Back Face
        backTitle,
        backTitleFont,
        backTitleSize,
        backTitleColor,
        backSubtitle,
        backSubtitleFont,
        backSubtitleSize,
        backSubtitleColor,
        backQrValue,
        backQrSize,
        qrColor,
        backQrContainerBg,
        ...pageSettings,
      };

      await updateCustomCardSettings(payload);

      // Clear local draft in this browser so preview matches immediately
      try {
        localStorage.removeItem("thenith_custom_card_studio_state_v2");
      } catch {}

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save error", err);
      alert("حدث خطأ أثناء الحفظ، يرجى المحاولة مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  // Reset to initial panel state
  const handleResetToPanelDefault = () => {
    if (!window.confirm("هل أنت متأكد من استعادة القيم الافتراضية الأصلية؟")) return;
    setCardName("NAME");
    setCardJob("");
    setSelectedBg("thenith_signature");
    setCustomSolidBgColor("#0f172a");
    setCustomBgDataUrl(null);
    setCustomBackBgDataUrl(null);
    setBgSubTab("presets");
    setNameFont("Cairo");
    setNameSize(24);
    setNameColor("#ffffff");
    setJobFont("Cairo");
    setJobSize(13);
    setJobColor("#94a3b8");
    setTextAlign("center");
    setLogoDataUrl(null);
    setLogo2DataUrl(null);
    setBackLogoDataUrl(null);
    setBackLogo2DataUrl(null);
    setElementsPos(DEFAULT_POSITIONS);
    setElementsVisibility(DEFAULT_VISIBILITY);
    setBackTitle("Digital Identity Card");
    setBackSubtitle("thenith.com");
    setBackQrSize(88);
    setQrColor("#000000");
  };

  // Compute Active Background (Supports presets, pure colors, and uploaded custom front/back reference card)
  const cardBgStyle = useMemo(() => {
    if (selectedBg === "custom") {
      const bgImg = isFlipped ? (customBackBgDataUrl || customBgDataUrl) : customBgDataUrl;
      if (bgImg) {
        return {
          backgroundImage: `url(${bgImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#000000",
        };
      }
      return { backgroundColor: "#0f172a" };
    }
    if (selectedBg === "custom_solid_color") {
      return { backgroundColor: customSolidBgColor };
    }
    const preset = BACKGROUND_PRESETS.find((p) => p.id === selectedBg) || BACKGROUND_PRESETS[0];
    return preset.style;
  }, [selectedBg, customSolidBgColor, customBgDataUrl, customBackBgDataUrl, isFlipped]);

  // Helper for reference card design upload (وش وضهر)
  const handleUploadCardDesign = (face, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result;
      if (face === "front") {
        setCustomBgDataUrl(dataUrl);
        setSelectedBg("custom");
        setBgSubTab("custom_card");
        setIsFlipped(false);
        // إخفاء/تعطيل عناصر الوجه الأمامي تلقائياً لعرض تصميم الكارت المرفوع نظيفاً
        setElementsVisibility((prev) => ({
          ...prev,
          name: false,
          job: false,
          logo: false,
          logo2: false,
          brand: false,
          tap: false,
        }));
        handleAutoAnalyzeCard(dataUrl, customBackBgDataUrl);
      } else if (face === "back") {
        setCustomBackBgDataUrl(dataUrl);
        setSelectedBg("custom");
        setBgSubTab("custom_card");
        setIsFlipped(true);
        // إخفاء/تعطيل عناصر الوجه الخلفي تلقائياً لعرض تصميم الظهر نظيفاً
        setElementsVisibility((prev) => ({
          ...prev,
          backTitle: false,
          backSubtitle: false,
          backQr: false,
          backLogo: false,
          backLogo2: false,
        }));
        handleAutoAnalyzeCard(customBgDataUrl, dataUrl);
      }
    };
  };

  // ── Smart Card Layout & Element Analyzer ──────────────────────────────────
  const handleAutoAnalyzeCard = async (overrideFront, overrideBack) => {
    const frontUrl = overrideFront !== undefined ? overrideFront : customBgDataUrl;
    const backUrl = overrideBack !== undefined ? overrideBack : customBackBgDataUrl;

    if (!frontUrl && !backUrl) {
      alert("يرجى رفع صورة وجه الكارت أو ظهره أولاً للتحليل.");
      return;
    }

    try {
      setIsAnalyzing(true);
      const res = await analyzeCardImages(frontUrl, backUrl);

      if (res.success) {
        // 1. Apply coordinates
        if (res.combinedPositions) {
          setElementsPos((prev) => ({
            ...prev,
            ...res.combinedPositions,
          }));
        }

        // 2. Note: Visibility remains disabled as requested by admin, togglable manually

        // 3. Apply colors
        if (res.dominantBgColor) setCustomSolidBgColor(res.dominantBgColor);
        if (res.nameColor) setNameColor(res.nameColor);
        if (res.jobColor) setJobColor(res.jobColor);
        if (res.backTitleColor) setBackTitleColor(res.backTitleColor);
        if (res.backSubtitleColor) setBackSubtitleColor(res.backSubtitleColor);
        if (res.qrColor) setQrColor(res.qrColor);
        if (res.textAlign) setTextAlign(res.textAlign);

        // 4. Ensure custom card background mode is active
        setSelectedBg("custom");
        setBgSubTab("custom_card");
        setShowElementPins(true);

        setAnalysisResult({
          status: "success",
          summary: res.summary,
        });

        setTimeout(() => setAnalysisResult(null), 9000);
      } else {
        alert(res.error || "تعذر تحليل صورة الكارت.");
      }
    } catch (err) {
      console.error("Card analysis failed", err);
      alert("حدث خطأ أثناء تحليل الصورة: " + (err.message || err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper for image upload
  const handleUploadImageSlot = (slot, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result;
      if (slot === "logo") {
        setLogoDataUrl(dataUrl);
        setElementsVisibility((p) => ({ ...p, logo: true }));
        setSelectedElementId("logo");
      } else if (slot === "logo2") {
        setLogo2DataUrl(dataUrl);
        setElementsVisibility((p) => ({ ...p, logo2: true }));
        setSelectedElementId("logo2");
      } else if (slot === "backLogo") {
        setBackLogoDataUrl(dataUrl);
        setElementsVisibility((p) => ({ ...p, backLogo: true }));
        setSelectedElementId("backLogo");
      } else if (slot === "backLogo2") {
        setBackLogo2DataUrl(dataUrl);
        setElementsVisibility((p) => ({ ...p, backLogo2: true }));
        setSelectedElementId("backLogo2");
      }
    };
  };

  // Helper to render enable/disable toggle switch for card elements
  const renderElementToggle = (key, label, subtitle) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
      <div className="flex flex-col">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>
        {subtitle && <span className="text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</span>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(elementsVisibility[key])}
          onChange={(e) =>
            setElementsVisibility((prev) => ({
              ...prev,
              [key]: e.target.checked,
            }))
          }
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-sm font-semibold text-slate-400">
          جاري تحميل استوديو صمم كارتك...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 select-none">
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                إدارة استوديو صمم كارتك (وش وضهر)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  مزامنة حية مع البانيل
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                خصص تصميم الكارت بالكامل، أضف صوراً للوجهين، وحرك كل عنصر بمفرده، ثم احفظ كافتراضي للمتجر والبانيل.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleResetToPanelDefault}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="إعادة التعيين للوضع الافتراضي الأصلي"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>

          <a
            href="http://localhost:3000/custom-card"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>معاينة في المتجر</span>
          </a>

          <button
            type="button"
            onClick={handleSaveAsDefault}
            disabled={saving}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              saveSuccess
                ? "bg-emerald-600 text-white shadow-emerald-500/30"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 hover:scale-[1.02]"
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>
              {saving
                ? "جاري الحفظ..."
                : saveSuccess
                ? "تم الحفظ بنجاح ومزامنته مع البانيل!"
                : "حفظ كإعداد افتراضي للبانيل"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Main Layout: Canvas & Studio Panel ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT: The Interactive Live Card Canvas (7 cols) ───────────────── */}
        <div className="lg:col-span-7 flex flex-col items-center gap-4">
          <div className="w-full rounded-3xl p-6 bg-slate-900/90 dark:bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center">
            {/* Top Canvas Controls */}
            <div className="w-full flex items-center justify-between gap-2 mb-4 z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">الوجه المعروض:</span>
                <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setSelectedElementId("name");
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !isFlipped
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    الوجه الأمامي (وش)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(true);
                      setSelectedElementId("backQr");
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isFlipped
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    الوجه الخلفي (ضهر)
                  </button>
                </div>
              </div>

              {/* 3D Flip Quick Button */}
              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>قلب الكارت 3D</span>
              </button>
            </div>

            {/* Instruction Tip */}
            <div className="w-full text-center mb-3 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-[11px] font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                اسحب وحرك كل عنصر أو صورة بالماوس على انفراد لتحديد موضعه بحرية
              </span>
            </div>

            {/* ── THE CARD (CR-80 Dimensions: 85.6mm x 53.98mm = 1.586 aspect) ── */}
            <div
              ref={cardRef}
              className="w-full max-w-[500px] aspect-[1.586/1] relative rounded-[22px] shadow-2xl transition-all duration-300 overflow-hidden cursor-default select-none border border-white/10"
              style={cardBgStyle}
            >
              {/* Card Sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />

              {/* ── FRONT FACE (وش) ───────────────────────────────────────── */}
              {!isFlipped && (
                <div ref={frontFaceRef} className="absolute inset-0 p-5 overflow-hidden">
                  {/* Front Image / Logo 1 */}
                  {elementsVisibility.logo && logoDataUrl && (
                    <div
                      onMouseDown={(e) => startDrag("logo", e)}
                      onTouchStart={(e) => startDrag("logo", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId("logo");
                        setActiveTab("images");
                      }}
                      className={`absolute cursor-move transition-transform ${
                        selectedElementId === "logo"
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-105 z-30"
                          : "hover:scale-105 z-20"
                      }`}
                      style={{
                        left: `${elementsPos.logo?.x ?? 84}%`,
                        top: `${elementsPos.logo?.y ?? 18}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <img
                        src={logoDataUrl}
                        alt="Front Image 1"
                        style={{
                          width: `${logoSize}px`,
                          filter:
                            logoFilter === "invert_white"
                              ? "brightness(0) invert(1)"
                              : logoFilter === "gold_tint"
                              ? "sepia(1) saturate(3) hue-rotate(5deg)"
                              : "none",
                        }}
                        className="object-contain pointer-events-none"
                      />
                    </div>
                  )}

                  {/* Front Image / Logo 2 (صورة أمامية ثانية) */}
                  {elementsVisibility.logo2 && logo2DataUrl && (
                    <div
                      onMouseDown={(e) => startDrag("logo2", e)}
                      onTouchStart={(e) => startDrag("logo2", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId("logo2");
                        setActiveTab("images");
                      }}
                      className={`absolute cursor-move transition-transform ${
                        selectedElementId === "logo2"
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-105 z-30"
                          : "hover:scale-105 z-20"
                      }`}
                      style={{
                        left: `${elementsPos.logo2?.x ?? 16}%`,
                        top: `${elementsPos.logo2?.y ?? 18}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <img
                        src={logo2DataUrl}
                        alt="Front Image 2"
                        style={{
                          width: `${logo2Size}px`,
                          filter:
                            logo2Filter === "invert_white"
                              ? "brightness(0) invert(1)"
                              : logo2Filter === "gold_tint"
                              ? "sepia(1) saturate(3) hue-rotate(5deg)"
                              : "none",
                        }}
                        className="object-contain pointer-events-none"
                      />
                    </div>
                  )}

                  {/* Smart EMV Chip / Contactless Wave */}
                  {elementsVisibility.tap && (
                    <div
                      onMouseDown={(e) => startDrag("tap", e)}
                      onTouchStart={(e) => startDrag("tap", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId("tap");
                      }}
                      className={`absolute cursor-move transition-transform ${
                        selectedElementId === "tap"
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-105 z-30"
                          : "hover:scale-105 z-20"
                      }`}
                      style={{
                        left: `${elementsPos.tap?.x ?? 22}%`,
                        top: `${elementsPos.tap?.y ?? 88}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 opacity-80">
                        <Wifi className="w-5 h-5 text-white rotate-90" />
                        <span className="text-[9px] font-bold tracking-widest text-white/70">
                          NFC
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cardholder Name (Default "NAME") */}
                  {elementsVisibility.name && (
                    <div
                      onMouseDown={(e) => startDrag("name", e)}
                      onTouchStart={(e) => startDrag("name", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId("name");
                        setActiveTab("text");
                      }}
                      className={`absolute cursor-move px-2 py-0.5 rounded-lg transition-transform ${
                        selectedElementId === "name"
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-102 bg-indigo-500/10 z-30"
                          : "hover:bg-white/5 z-20"
                      }`}
                      style={{
                        left: `${elementsPos.name?.x ?? 50}%`,
                        top: `${elementsPos.name?.y ?? 50}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <h2
                        className="font-bold tracking-wide pointer-events-none whitespace-nowrap"
                        style={{
                          fontSize: `${nameSize}px`,
                          color: nameColor,
                          fontFamily: `'${nameFont}', sans-serif`,
                          textAlign,
                          textShadow: "0 2px 10px rgba(0,0,0,0.6)",
                        }}
                      >
                        {cardName || "NAME"}
                      </h2>
                      {showElementPins && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-indigo-600/90 text-[8px] font-bold text-white shadow pointer-events-none whitespace-nowrap">
                          الاسم ({elementsPos.name?.x}%, {elementsPos.name?.y}%)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Card Job / Title */}
                  {elementsVisibility.job && (
                    <div
                      onMouseDown={(e) => startDrag("job", e)}
                      onTouchStart={(e) => startDrag("job", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId("job");
                        setActiveTab("text");
                      }}
                      className={`absolute cursor-move px-2 py-0.5 rounded-lg transition-transform ${
                        selectedElementId === "job"
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-102 bg-indigo-500/10 z-30"
                          : "hover:bg-white/5 z-20"
                      }`}
                      style={{
                        left: `${elementsPos.job?.x ?? 50}%`,
                        top: `${elementsPos.job?.y ?? 64}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <p
                        className="font-medium pointer-events-none whitespace-nowrap"
                        style={{
                          fontSize: `${jobSize}px`,
                          color: jobColor,
                          fontFamily: `'${jobFont}', sans-serif`,
                          textAlign,
                        }}
                      >
                        {cardJob || (selectedElementId === "job" ? "المسمى الوظيفي" : "")}
                      </p>
                      {showElementPins && (
                        <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-indigo-600/90 text-[8px] font-bold text-white shadow pointer-events-none whitespace-nowrap">
                          الوظيفة ({elementsPos.job?.x}%, {elementsPos.job?.y}%)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Custom Extra Texts */}
                  {customTexts.map((item) => (
                    <div
                      key={item.id}
                      onMouseDown={(e) => startDrag(item.id, e)}
                      onTouchStart={(e) => startDrag(item.id, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId(item.id);
                        setActiveTab("text");
                      }}
                      className={`absolute cursor-move px-2 py-0.5 rounded-lg transition-transform ${
                        selectedElementId === item.id
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-102 bg-indigo-500/10 z-30"
                          : "hover:bg-white/5 z-20"
                      }`}
                      style={{
                        left: `${elementsPos[item.id]?.x ?? item.x ?? 50}%`,
                        top: `${elementsPos[item.id]?.y ?? item.y ?? 75}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <span
                        className="pointer-events-none whitespace-nowrap"
                        style={{
                          fontSize: `${item.size || 14}px`,
                          color: item.color || "#ffffff",
                          fontFamily: `'${item.font || "Cairo"}', sans-serif`,
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── BACK FACE (ضهر) ───────────────────────────────────────── */}
              {isFlipped && (
                <div ref={backFaceRef} className="absolute inset-0 p-5 overflow-hidden">
                  {/* Back Title */}
                  {elementsVisibility.backTitle && (
                    <div
                      onMouseDown={(e) => startDrag("backTitle", e)}
                      onTouchStart={(e) => startDrag("backTitle", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId("backTitle");
                        setActiveTab("back");
                      }}
                      className={`absolute cursor-move px-2 py-0.5 rounded-lg transition-transform ${
                        selectedElementId === "backTitle"
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-102 bg-indigo-500/10 z-30"
                          : "hover:bg-white/5 z-20"
                      }`}
                      style={{
                        left: `${elementsPos.backTitle?.x ?? 28}%`,
                        top: `${elementsPos.backTitle?.y ?? 20}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <p
                        className="font-bold pointer-events-none whitespace-nowrap"
                        style={{
                          fontSize: `${backTitleSize}px`,
                          color: backTitleColor,
                          fontFamily: `'${backTitleFont}', sans-serif`,
                        }}
                      >
                        {backTitle}
                      </p>
                      {showElementPins && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-blue-600/90 text-[8px] font-bold text-white shadow pointer-events-none whitespace-nowrap">
                          عنوان الظهر
                        </span>
                      )}
                    </div>
                  )}

                  {/* QR Code */}
                  {elementsVisibility.backQr && (
                    <div
                      onMouseDown={(e) => startDrag("backQr", e)}
                      onTouchStart={(e) => startDrag("backQr", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId("backQr");
                        setActiveTab("back");
                      }}
                      className={`absolute cursor-move p-2 rounded-2xl shadow-xl transition-transform ${
                        selectedElementId === "backQr"
                          ? "ring-4 ring-indigo-500 ring-offset-2 ring-offset-slate-950 scale-105 z-30"
                          : "hover:scale-105 z-20"
                      }`}
                      style={{
                        left: `${elementsPos.backQr?.x ?? 75}%`,
                        top: `${elementsPos.backQr?.y ?? 50}%`,
                        transform: "translate(-50%, -50%)",
                        backgroundColor:
                          backQrContainerBg === "transparent"
                            ? "transparent"
                            : backQrContainerBg === "dark"
                            ? "#0f172a"
                            : "#ffffff",
                      }}
                    >
                      <QRCodeSVG
                        value={backQrValue || "https://thenith.com/p/preview"}
                        size={backQrSize}
                        fgColor={qrColor}
                        bgColor="transparent"
                        level="M"
                      />
                      {showElementPins && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-emerald-600/90 text-[8px] font-bold text-white shadow pointer-events-none whitespace-nowrap">
                          كود QR ({elementsPos.backQr?.x}%, {elementsPos.backQr?.y}%)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Back Subtitle */}
                  {elementsVisibility.backSubtitle && (
                    <div
                      onMouseDown={(e) => startDrag("backSubtitle", e)}
                      onTouchStart={(e) => startDrag("backSubtitle", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId("backSubtitle");
                        setActiveTab("back");
                      }}
                      className={`absolute cursor-move px-2 py-0.5 rounded-lg transition-transform ${
                        selectedElementId === "backSubtitle"
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-102 bg-indigo-500/10 z-30"
                          : "hover:bg-white/5 z-20"
                      }`}
                      style={{
                        left: `${elementsPos.backSubtitle?.x ?? 28}%`,
                        top: `${elementsPos.backSubtitle?.y ?? 82}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <p
                        className="font-medium pointer-events-none whitespace-nowrap"
                        style={{
                          fontSize: `${backSubtitleSize}px`,
                          color: backSubtitleColor,
                          fontFamily: `'${backSubtitleFont}', sans-serif`,
                        }}
                      >
                        {backSubtitle}
                      </p>
                      {showElementPins && (
                        <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-slate-600/90 text-[8px] font-bold text-white shadow pointer-events-none whitespace-nowrap">
                          العنوان الفرعي
                        </span>
                      )}
                    </div>
                  )}

                  {/* Back Image 1 (صورة الوجه الخلفي 1) */}
                  {elementsVisibility.backLogo && backLogoDataUrl && (
                    <div
                      onMouseDown={(e) => startDrag("backLogo", e)}
                      onTouchStart={(e) => startDrag("backLogo", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId("backLogo");
                        setActiveTab("images");
                      }}
                      className={`absolute cursor-move transition-transform ${
                        selectedElementId === "backLogo"
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-105 z-30"
                          : "hover:scale-105 z-20"
                      }`}
                      style={{
                        left: `${elementsPos.backLogo?.x ?? 20}%`,
                        top: `${elementsPos.backLogo?.y ?? 65}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <img
                        src={backLogoDataUrl}
                        alt="Back Image 1"
                        style={{
                          width: `${backLogoSize}px`,
                          filter:
                            backLogoFilter === "invert_white"
                              ? "brightness(0) invert(1)"
                              : backLogoFilter === "gold_tint"
                              ? "sepia(1) saturate(3) hue-rotate(5deg)"
                              : "none",
                        }}
                        className="object-contain pointer-events-none"
                      />
                    </div>
                  )}

                  {/* Back Image 2 (صورة الوجه الخلفي 2) */}
                  {elementsVisibility.backLogo2 && backLogo2DataUrl && (
                    <div
                      onMouseDown={(e) => startDrag("backLogo2", e)}
                      onTouchStart={(e) => startDrag("backLogo2", e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId("backLogo2");
                        setActiveTab("images");
                      }}
                      className={`absolute cursor-move transition-transform ${
                        selectedElementId === "backLogo2"
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 scale-105 z-30"
                          : "hover:scale-105 z-20"
                      }`}
                      style={{
                        left: `${elementsPos.backLogo2?.x ?? 50}%`,
                        top: `${elementsPos.backLogo2?.y ?? 65}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <img
                        src={backLogo2DataUrl}
                        alt="Back Image 2"
                        style={{
                          width: `${backLogo2Size}px`,
                          filter:
                            backLogo2Filter === "invert_white"
                              ? "brightness(0) invert(1)"
                              : backLogo2Filter === "gold_tint"
                              ? "sepia(1) saturate(3) hue-rotate(5deg)"
                              : "none",
                        }}
                        className="object-contain pointer-events-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Canvas Nudge & Selected Element Controls */}
            {selectedElementId && (
              <div className="mt-4 flex items-center justify-between w-full max-w-[500px] p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 z-10 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>العنصر المحدد:</span>
                  <span className="text-indigo-400 font-black">
                    {selectedElementId === "name"
                      ? "الاسم"
                      : selectedElementId === "job"
                      ? "المسمى الوظيفي"
                      : selectedElementId === "logo"
                      ? "صورة الوجه الأمامي 1"
                      : selectedElementId === "logo2"
                      ? "صورة الوجه الأمامي 2"
                      : selectedElementId === "backLogo"
                      ? "صورة الوجه الخلفي 1"
                      : selectedElementId === "backLogo2"
                      ? "صورة الوجه الخلفي 2"
                      : selectedElementId === "backQr"
                      ? "رمز QR"
                      : selectedElementId === "backTitle"
                      ? "العنوان الخلفي"
                      : selectedElementId === "backSubtitle"
                      ? "العنوان الفرعي"
                      : selectedElementId}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-bold me-1">تحريك:</span>
                  <button
                    type="button"
                    onClick={() => nudgeElement(selectedElementId, 0, -2)}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white transition-colors cursor-pointer"
                    title="رفع للأعلى"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeElement(selectedElementId, 0, 2)}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white transition-colors cursor-pointer"
                    title="خفض للأسفل"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeElement(selectedElementId, 2, 0)}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white transition-colors cursor-pointer"
                    title="إزاحة لليمين"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeElement(selectedElementId, -2, 0)}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white transition-colors cursor-pointer"
                    title="إزاحة لليسار"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: The Studio Inspector & Admin Settings Panel (5 cols) ────── */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Studio Panel Tabs */}
          <div className="grid grid-cols-5 gap-1 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === "text"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Type className="w-4 h-4" />
              <span className="text-[10px]">النصوص</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("bg")}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === "bg"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Palette className="w-4 h-4" />
              <span className="text-[10px]">الخلفيات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("images")}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === "images"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-[10px]">الصور (وش/ضهر)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("back");
                setIsFlipped(true);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === "back"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span className="text-[10px]">الضهر / QR</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("admin_settings")}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === "admin_settings"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-[10px]">الإدارة</span>
            </button>
          </div>

          {/* Panel Tab Content Container */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[500px]">
            {/* ── TAB 1: TEXTS ────────────────────────────────────────────── */}
            {activeTab === "text" && (
              <div className="space-y-5">
                {/* Name Controls */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 dark:text-white">
                      اسم حامل الكارت (Default: NAME)
                    </label>
                    <span className="text-[10px] font-mono text-indigo-500 font-bold">
                      {nameSize}px
                    </span>
                  </div>

                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    placeholder="NAME"
                  />

                  {/* Font & Size */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        الخط
                      </label>
                      <select
                        value={nameFont}
                        onChange={(e) => setNameFont(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        حجم الخط
                      </label>
                      <input
                        type="range"
                        min="14"
                        max="36"
                        value={nameSize}
                        onChange={(e) => setNameSize(parseInt(e.target.value))}
                        className="w-full accent-indigo-600 mt-2 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Color Swatches */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">
                      لون الاسم
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {TEXT_COLORS.map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setNameColor(col.value)}
                          className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                            nameColor === col.value
                              ? "scale-120 border-indigo-500 shadow-sm"
                              : "border-slate-300 dark:border-slate-600 hover:scale-105"
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.nameAr}
                        />
                      ))}
                      <input
                        type="color"
                        value={nameColor}
                        onChange={(e) => setNameColor(e.target.value)}
                        className="w-6 h-6 rounded-md cursor-pointer border border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Job Title Controls */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 dark:text-white">
                      المسمى الوظيفي (Job Title)
                    </label>
                    <span className="text-[10px] font-mono text-indigo-500 font-bold">
                      {jobSize}px
                    </span>
                  </div>

                  <input
                    type="text"
                    value={cardJob}
                    onChange={(e) => setCardJob(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    placeholder="Founder & CEO"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        الخط
                      </label>
                      <select
                        value={jobFont}
                        onChange={(e) => setJobFont(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        حجم الخط
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="24"
                        value={jobSize}
                        onChange={(e) => setJobSize(parseInt(e.target.value))}
                        className="w-full accent-indigo-600 mt-2 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">
                      لون المسمى الوظيفي
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {TEXT_COLORS.map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setJobColor(col.value)}
                          className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                            jobColor === col.value
                              ? "scale-120 border-indigo-500 shadow-sm"
                              : "border-slate-300 dark:border-slate-600 hover:scale-105"
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.nameAr}
                        />
                      ))}
                      <input
                        type="color"
                        value={jobColor}
                        onChange={(e) => setJobColor(e.target.value)}
                        className="w-6 h-6 rounded-md cursor-pointer border border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Add Extra Custom Text Button */}
                <button
                  type="button"
                  onClick={() => {
                    const newId = `custom_text_${Date.now()}`;
                    const newItem = {
                      id: newId,
                      text: `نص إضافي ${customTexts.length + 1}`,
                      size: 13,
                      color: "#ffffff",
                      font: "Cairo",
                      x: 50,
                      y: Math.min(88, 70 + customTexts.length * 6),
                    };
                    setCustomTexts((prev) => [...prev, newItem]);
                    setElementsPos((prev) => ({
                      ...prev,
                      [newId]: { x: 50, y: newItem.y },
                    }));
                    setSelectedElementId(newId);
                  }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة نص إضافي مخصص</span>
                </button>
              </div>
            )}

            {/* ── TAB 2: BACKGROUNDS & COLORS ─────────────────────────────── */}
            {activeTab === "bg" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setBgSubTab("presets")}
                    className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer truncate text-center ${
                      bgSubTab === "presets"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    خامات وقوالب
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBgSubTab("pure_color");
                      setSelectedBg("custom_solid_color");
                    }}
                    className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer truncate text-center ${
                      bgSubTab === "pure_color"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    ألوان مخصصة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBgSubTab("custom_card");
                      setSelectedBg("custom");
                    }}
                    className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer truncate text-center ${
                      bgSubTab === "custom_card"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    كارت مرجعي (وش وضهر)
                  </button>
                </div>

                {bgSubTab === "presets" && (
                  <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pe-1">
                    {BACKGROUND_PRESETS.map((p) => {
                      const isActive = selectedBg === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedBg(p.id)}
                          className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                            isActive
                              ? "ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50 dark:bg-slate-800/40"
                          }`}
                        >
                          <div
                            className="w-12 h-8 rounded-lg shrink-0 border border-white/20 shadow-xs"
                            style={p.style}
                          />
                          <div className="flex-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                              <span>{p.nameAr}</span>
                              {isActive && (
                                <Check className="w-3.5 h-3.5 text-indigo-500" />
                              )}
                            </h4>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {bgSubTab === "pure_color" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        الألوان الصريحة السريعة
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {PURE_EXPLICIT_COLORS.map((col) => (
                          <button
                            key={col.hex}
                            type="button"
                            onClick={() => {
                              setSelectedBg("custom_solid_color");
                              setCustomSolidBgColor(col.hex);
                            }}
                            className={`h-8 rounded-xl border-2 transition-transform cursor-pointer ${
                              customSolidBgColor === col.hex
                                ? "scale-110 border-indigo-500 shadow-md"
                                : "border-slate-300 dark:border-slate-700 hover:scale-105"
                            }`}
                            style={{ backgroundColor: col.hex }}
                            title={col.labelAr}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        كود اللون المخصص (Hex Color)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customSolidBgColor}
                          onChange={(e) => {
                            setSelectedBg("custom_solid_color");
                            setCustomSolidBgColor(e.target.value);
                          }}
                          className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700"
                        />
                        <input
                          type="text"
                          value={customSolidBgColor}
                          onChange={(e) => {
                            setSelectedBg("custom_solid_color");
                            setCustomSolidBgColor(e.target.value);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {bgSubTab === "custom_card" && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      💡 <strong>كارت مرجعي للبانيل:</strong> ارفع صورة جاهزة لوجه وظهر الكارت لتكون هي المرجع والتصميم الافتراضي للعملاء في البانيل. يمكنك بعدها سحب العناصر (الاسم، الوظيفة، اللوجو، و QR) لضبط محاذاتها فوق تصميم الكارت المرجعي.
                    </div>

                    {/* Front Card Design Upload (وش الكارت) */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-indigo-500" />
                          تصميم وجه الكارت (الأمامي / وش)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsFlipped(false)}
                            className="text-[10px] text-indigo-500 font-bold hover:underline cursor-pointer"
                          >
                            معاينة الوجه
                          </button>
                          {customBgDataUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomBgDataUrl(null);
                                if (!customBackBgDataUrl) setSelectedBg("thenith_signature");
                              }}
                              className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                            >
                              إزالة
                            </button>
                          )}
                        </div>
                      </div>

                      <label className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                        {customBgDataUrl ? (
                          <div className="flex items-center gap-3 w-full">
                            <img
                              src={customBgDataUrl}
                              alt="Front Reference Card"
                              className="h-12 w-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs"
                            />
                            <div className="flex-1">
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                                تم تعيين كارت الوجه
                              </span>
                              <span className="text-[10px] text-indigo-500 font-bold">
                                اضغط لتغيير الصورة
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 py-2">
                            <Upload className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold">رفع كارت الوجه الأمامي (وش)</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadCardDesign("front", e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Back Card Design Upload (ظهر الكارت) */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <RotateCw className="w-4 h-4 text-indigo-500" />
                          تصميم ظهر الكارت (الخلفي / ضهر)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsFlipped(true)}
                            className="text-[10px] text-indigo-500 font-bold hover:underline cursor-pointer"
                          >
                            معاينة الظهر
                          </button>
                          {customBackBgDataUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomBackBgDataUrl(null);
                                if (!customBgDataUrl) setSelectedBg("thenith_signature");
                              }}
                              className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                            >
                              إزالة
                            </button>
                          )}
                        </div>
                      </div>

                      <label className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                        {customBackBgDataUrl ? (
                          <div className="flex items-center gap-3 w-full">
                            <img
                              src={customBackBgDataUrl}
                              alt="Back Reference Card"
                              className="h-12 w-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs"
                            />
                            <div className="flex-1">
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                                تم تعيين كارت الظهر
                              </span>
                              <span className="text-[10px] text-indigo-500 font-bold">
                                اضغط لتغيير الصورة
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 py-2">
                            <Upload className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold">رفع كارت الوجه الخلفي (ضهر)</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadCardDesign("back", e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Auto-Analyze & Detect Elements Section */}
                    <div className="pt-1 space-y-2.5">
                      <button
                        type="button"
                        onClick={() => handleAutoAnalyzeCard()}
                        disabled={isAnalyzing || (!customBgDataUrl && !customBackBgDataUrl)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>جاري فحص وتحليل الكارت وتحديد العناصر...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                            <span>⚡ فحص وتحليل الكارت وتحديد كافة العناصر تلقائياً</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 px-1">
                        <span>إظهار مؤشرات تحديد العناصر على الكارت</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showElementPins}
                            onChange={(e) => setShowElementPins(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {analysisResult && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2 animate-fadeIn">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تم فحص وتحليل الكارت وتحديد مواضع كافة العناصر بنجاح!</span>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                            {analysisResult.summary}
                          </p>
                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                            <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-emerald-500/20 text-slate-800 dark:text-slate-200">
                              👤 الاسم: {elementsPos.name?.x}%, {elementsPos.name?.y}%
                            </div>
                            <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-emerald-500/20 text-slate-800 dark:text-slate-200">
                              💼 الوظيفة: {elementsPos.job?.x}%, {elementsPos.job?.y}%
                            </div>
                            <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-emerald-500/20 text-slate-800 dark:text-slate-200">
                              🖼️ اللوجو: {elementsPos.logo?.x}%, {elementsPos.logo?.y}%
                            </div>
                            <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-emerald-500/20 text-slate-800 dark:text-slate-200">
                              📱 كود QR: {elementsPos.backQr?.x}%, {elementsPos.backQr?.y}%
                            </div>
                          </div>
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold pt-1">
                            💡 اضغط الآن على «حفظ كافتراضي للبانيل» بالأسفل لتعميمها للعملاء فوراً.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: IMAGES & LOGOS (وش وضهر) ─────────────────────────── */}
            {activeTab === "images" && (
              <div className="space-y-5">
                {/* ── القسم الأول: صور الوجه الأمامي (وش) ── */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      صور الوجه الأمامي (وش الكارت)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFlipped(false)}
                      className="text-[10px] text-indigo-500 font-bold hover:underline cursor-pointer"
                    >
                      عرض الوجه الأمامي
                    </button>
                  </div>

                  {/* Front Image Slot 1 */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                      <span>صورة الوجه الأمامي 1 (اللوجو الرئيسي)</span>
                      {logoDataUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoDataUrl(null);
                            setElementsVisibility((p) => ({ ...p, logo: false }));
                          }}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          إزالة
                        </button>
                      )}
                    </div>

                    <label className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                      {logoDataUrl ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={logoDataUrl}
                            alt="Front 1"
                            className="h-10 object-contain"
                          />
                          <span className="text-[10px] text-indigo-500 font-bold">
                            تغيير الصورة
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Upload className="w-4 h-4 text-indigo-500" />
                          <span className="text-[11px] font-bold">رفع صورة 1 (PNG شفاف)</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadImageSlot("logo", e.target.files[0])}
                        className="hidden"
                      />
                    </label>

                    {logoDataUrl && (
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>حجم الصورة</span>
                          <span>{logoSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="25"
                          max="120"
                          value={logoSize}
                          onChange={(e) => setLogoSize(parseInt(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            فلتر المظهر
                          </label>
                          <select
                            value={logoFilter}
                            onChange={(e) => setLogoFilter(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-900 dark:text-white"
                          >
                            <option value="none">بدون فلتر (الألوان الأصلية)</option>
                            <option value="invert_white">أبيض ناصع (Invert to White)</option>
                            <option value="gold_tint">توهج ذهبي معدني (Gold Tint)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Front Image Slot 2 */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                      <span>صورة إضافية للوجه الأمامي 2</span>
                      {logo2DataUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogo2DataUrl(null);
                            setElementsVisibility((p) => ({ ...p, logo2: false }));
                          }}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          إزالة
                        </button>
                      )}
                    </div>

                    <label className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                      {logo2DataUrl ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={logo2DataUrl}
                            alt="Front 2"
                            className="h-10 object-contain"
                          />
                          <span className="text-[10px] text-indigo-500 font-bold">
                            تغيير الصورة
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Upload className="w-4 h-4 text-indigo-500" />
                          <span className="text-[11px] font-bold">رفع صورة إضافية 2</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadImageSlot("logo2", e.target.files[0])}
                        className="hidden"
                      />
                    </label>

                    {logo2DataUrl && (
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>حجم الصورة 2</span>
                          <span>{logo2Size}px</span>
                        </div>
                        <input
                          type="range"
                          min="25"
                          max="120"
                          value={logo2Size}
                          onChange={(e) => setLogo2Size(parseInt(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── القسم الثاني: صور الوجه الخلفي (ضهر) ── */}
                <div className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      صور الوجه الخلفي (ضهر الكارت)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFlipped(true)}
                      className="text-[10px] text-amber-500 font-bold hover:underline cursor-pointer"
                    >
                      عرض الوجه الخلفي
                    </button>
                  </div>

                  {/* Back Image Slot 1 */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                      <span>صورة الوجه الخلفي 1</span>
                      {backLogoDataUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setBackLogoDataUrl(null);
                            setElementsVisibility((p) => ({ ...p, backLogo: false }));
                          }}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          إزالة
                        </button>
                      )}
                    </div>

                    <label className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                      {backLogoDataUrl ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={backLogoDataUrl}
                            alt="Back 1"
                            className="h-10 object-contain"
                          />
                          <span className="text-[10px] text-indigo-500 font-bold">
                            تغيير الصورة
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Upload className="w-4 h-4 text-indigo-500" />
                          <span className="text-[11px] font-bold">رفع صورة للوجه الخلفي 1</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadImageSlot("backLogo", e.target.files[0])}
                        className="hidden"
                      />
                    </label>

                    {backLogoDataUrl && (
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>حجم الصورة</span>
                          <span>{backLogoSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="25"
                          max="120"
                          value={backLogoSize}
                          onChange={(e) => setBackLogoSize(parseInt(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Back Image Slot 2 */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-white">
                      <span>صورة إضافية للوجه الخلفي 2</span>
                      {backLogo2DataUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setBackLogo2DataUrl(null);
                            setElementsVisibility((p) => ({ ...p, backLogo2: false }));
                          }}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          إزالة
                        </button>
                      )}
                    </div>

                    <label className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                      {backLogo2DataUrl ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={backLogo2DataUrl}
                            alt="Back 2"
                            className="h-10 object-contain"
                          />
                          <span className="text-[10px] text-indigo-500 font-bold">
                            تغيير الصورة
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Upload className="w-4 h-4 text-indigo-500" />
                          <span className="text-[11px] font-bold">رفع صورة إضافية للظهر 2</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadImageSlot("backLogo2", e.target.files[0])}
                        className="hidden"
                      />
                    </label>

                    {backLogo2DataUrl && (
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>حجم الصورة</span>
                          <span>{backLogo2Size}px</span>
                        </div>
                        <input
                          type="range"
                          min="25"
                          max="120"
                          value={backLogo2Size}
                          onChange={(e) => setBackLogo2Size(parseInt(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: BACK FACE & QR ───────────────────────────────────── */}
            {activeTab === "back" && (
              <div className="space-y-4">
                {/* QR Code Section */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 dark:text-white">
                      رمز الاستجابة السريعة (QR Code)
                    </label>
                    <span className="text-[10px] font-mono text-indigo-500 font-bold">
                      {backQrSize}px
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      الرابط التوجيهي للـ QR
                    </label>
                    <input
                      type="text"
                      value={backQrValue}
                      onChange={(e) => setBackQrValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        حجم الرمز
                      </label>
                      <input
                        type="range"
                        min="60"
                        max="130"
                        value={backQrSize}
                        onChange={(e) => setBackQrSize(parseInt(e.target.value))}
                        className="w-full accent-indigo-600 mt-2 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        لون نقاط الـ QR
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={qrColor}
                          onChange={(e) => setQrColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                        />
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {qrColor}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back Texts */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white mb-1">
                      العنوان الخلفي (Back Title)
                    </label>
                    <input
                      type="text"
                      value={backTitle}
                      onChange={(e) => setBackTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-white mb-1">
                      العنوان الفرعي (Back Subtitle)
                    </label>
                    <input
                      type="text"
                      value={backSubtitle}
                      onChange={(e) => setBackSubtitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: ADMIN & STORE SETTINGS ───────────────────────────── */}
            {activeTab === "admin_settings" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    إعدادات صفحة المتجر والأسعار
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-3">
                    التحكم في الأسعار الافتراضية وصلاحيات التصميم المتاحة للعميل.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      السعر الأساسي للكارت (Base Price)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={pageSettings.basePrice}
                        onChange={(e) =>
                          setPageSettings((prev) => ({
                            ...prev,
                            basePrice: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 pe-10"
                      />
                      <span className="absolute inset-y-0 end-2 flex items-center text-[10px] font-bold text-slate-400">
                        {pageSettings.currency}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      سعر الوجه الخلفي (Double Sided)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={pageSettings.doubleSidedExtraPrice}
                        onChange={(e) =>
                          setPageSettings((prev) => ({
                            ...prev,
                            doubleSidedExtraPrice: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 pe-10"
                      />
                      <span className="absolute inset-y-0 end-2 flex items-center text-[10px] font-bold text-slate-400">
                        {pageSettings.currency}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    عنوان الصفحة بالمتجر
                  </label>
                  <input
                    type="text"
                    value={pageSettings.pageTitleAr}
                    onChange={(e) =>
                      setPageSettings((prev) => ({
                        ...prev,
                        pageTitleAr: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الوصف الترويجي
                  </label>
                  <textarea
                    rows={2}
                    value={pageSettings.pageSubtitleAr}
                    onChange={(e) =>
                      setPageSettings((prev) => ({
                        ...prev,
                        pageSubtitleAr: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Feature Toggles */}
                <div className="pt-2 space-y-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>السماح برفع لوجو شخصي للعميل</span>
                    <input
                      type="checkbox"
                      checked={pageSettings.allowLogoUpload}
                      onChange={(e) =>
                        setPageSettings((prev) => ({
                          ...prev,
                          allowLogoUpload: e.target.checked,
                        }))
                      }
                      className="accent-indigo-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>السماح بإنشاء رمز QR للعميل</span>
                    <input
                      type="checkbox"
                      checked={pageSettings.allowQrCode}
                      onChange={(e) =>
                        setPageSettings((prev) => ({
                          ...prev,
                          allowQrCode: e.target.checked,
                        }))
                      }
                      className="accent-indigo-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>السماح بتصميم وطباعة الوجه الخلفي</span>
                    <input
                      type="checkbox"
                      checked={pageSettings.allowBackSideDesign}
                      onChange={(e) =>
                        setPageSettings((prev) => ({
                          ...prev,
                          allowBackSideDesign: e.target.checked,
                        }))
                      }
                      className="accent-indigo-600 rounded"
                    />
                  </div>
                </div>

                {/* Big Button: Set as Default */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleSaveAsDefault}
                    disabled={saving}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01]"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ التصميم الحالي كإعداد افتراضي يظهر في البانيل</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
