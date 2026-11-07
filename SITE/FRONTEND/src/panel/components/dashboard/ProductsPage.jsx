import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Check,
  CheckCircle2,
  Package,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Plus,
  Minus,
  X,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Sparkles,
  Lock,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import api from "../../../api/index.js";
import {
  formatMoney,
  normalizeProduct,
} from "../../../pages/store/storeApi.js";
import { useCart } from "../../../context/CartContext.jsx";
import ErrorNotice from "../../../components/ErrorNotice.jsx";
import { fetchPaymentMethods } from "../../services/dashboardApi.js";

// ── Smart NFC Payment Card Visual Component ──────────────────────────────────
export function PaymentCardVisual({
  sku,
  name,
  walletNumber = "",
  accountName = "",
  className = "",
}) {
  const configs = {
    "TH-PAY-VODAFONE": {
      bg: "from-[#dc2626] via-[#991b1b] to-[#18181b]",
      logo: "/wallets/vodafone-cash.png",
      badge: "Vodafone Cash",
      nameAr: "فودافون كاش",
      chipColor: "#eab308",
      border: "border-red-500/30",
    },
    "TH-PAY-INSTAPAY": {
      bg: "from-[#4f46e5] via-[#3730a3] to-[#0f172a]",
      logo: "/wallets/instapay.png",
      badge: "Instapay",
      nameAr: "انستاباي",
      chipColor: "#cbd5e1",
      border: "border-indigo-500/30",
    },
    "TH-PAY-ORANGE": {
      bg: "from-[#ea580c] via-[#9a3412] to-[#18181b]",
      logo: "/wallets/orange-cash.png",
      badge: "Orange Cash",
      nameAr: "أورنج كاش",
      chipColor: "#eab308",
      border: "border-orange-500/30",
    },
    "TH-PAY-ETISALAT": {
      bg: "from-[#059669] via-[#064e3b] to-[#022c22]",
      logo: "/wallets/etisalat-cash.png",
      badge: "Etisalat Cash",
      nameAr: "اتصالات كاش",
      chipColor: "#eab308",
      border: "border-emerald-500/30",
    },
    "TH-PAY-WEPAY": {
      bg: "from-[#701a75] via-[#4a044e] to-[#1e1b4b]",
      logo: "/wallets/we-pay.png",
      badge: "WE Pay",
      nameAr: "وي باي",
      chipColor: "#cbd5e1",
      border: "border-pink-500/30",
    },
    "TH-PAY-UNIFIED": {
      bg: "from-[#0f172a] via-[#1e1b4b] to-[#020617]",
      logo: "/card-logo.png",
      badge: "Payment Plus",
      nameAr: "صفحة الدفع الموحدة",
      chipColor: "#f59e0b",
      border: "border-amber-400/40",
      isUnified: true,
    },
  };

  const cfg = configs[sku] || {
    bg: "from-[#1e293b] via-[#0f172a] to-[#020617]",
    logo: "/card-logo.png",
    badge: "Smart Payment",
    nameAr: name || "كارت وسائل الدفع",
    chipColor: "#f59e0b",
    border: "border-slate-500/30",
  };

  return (
    <div
      className={`relative aspect-[1.586/1] w-full rounded-2xl p-4 sm:p-5 text-white shadow-xl overflow-hidden bg-gradient-to-br ${cfg.bg} flex flex-col justify-between border ${cfg.border} select-none transition-all ${className}`}
    >
      {/* Background Holographic Shimmer */}
      <div className="absolute -top-10 -end-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -start-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Bar: Chip + Contactless Waves + Provider Logo */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          {/* Chip */}
          <div
            className="w-9 h-6 rounded-sm border border-amber-300/40 shadow-inner flex items-center justify-center p-0.5"
            style={{
              background: `linear-gradient(135deg, ${cfg.chipColor} 0%, #78350f 100%)`,
            }}
          >
            <div className="w-full h-full border border-amber-950/40 rounded-2xs grid grid-cols-2 gap-0.5 opacity-60">
              <div className="border-r border-b border-amber-950/40" />
              <div className="border-b border-amber-950/40" />
              <div className="border-r border-amber-950/40" />
              <div />
            </div>
          </div>

          {/* Contactless waves */}
          <svg
            className="w-4 h-4 text-white/80 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M8.5 16.5a5 5 0 0 1 0-7" strokeLinecap="round" />
            <path d="M12 19a8.5 8.5 0 0 0 0-14" strokeLinecap="round" />
            <path d="M15.5 21.5a12 12 0 0 0 0-19" strokeLinecap="round" />
          </svg>
        </div>

        {/* Logo / Badge */}
        <div className="h-7 max-w-[90px] flex items-center justify-end">
          {cfg.isUnified ? (
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-amber-500/40">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-black text-amber-300">THENITH+</span>
            </div>
          ) : cfg.logo ? (
            <div className="h-7 w-7 rounded-lg bg-white/95 p-1 flex items-center justify-center shadow-xs">
              <img src={cfg.logo} alt="" className="w-full h-full object-contain" />
            </div>
          ) : null}
        </div>
      </div>

      {/* Middle Row */}
      <div className="z-10 my-auto py-1">
        {cfg.isUnified ? (
          <div>
            <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">
              Unified Payment Page
            </p>
            <p className="text-xs sm:text-sm font-black text-white/90">
              NFC Contactless Hub
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[9px] font-bold text-white/60 tracking-wider">
              {cfg.nameAr}
            </p>
            <p
              className="font-mono text-xs sm:text-sm font-bold tracking-widest text-white/90"
              dir="ltr"
            >
              {walletNumber || "•••• •••• ••••"}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Bar: Name + Brand */}
      <div className="flex items-end justify-between z-10 pt-1 border-t border-white/10">
        <div className="min-w-0 flex-1 pe-2">
          <p className="text-[8px] uppercase font-bold text-white/50 tracking-wider">
            Cardholder / صاحب الحساب
          </p>
          <p className="truncate text-xs font-black text-white tracking-wide">
            {accountName || "YOUR NAME"}
          </p>
        </div>

        <div className="shrink-0 text-end">
          <span className="text-[10px] font-black tracking-widest text-white/80">
            THENITH
          </span>
          <span className="block text-[7px] font-mono text-white/40">SMART PAY</span>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage({ t, personal, onOrder, onOpenCart, onOpenCustomCard }) {
  const navigate = useNavigate();
  const isArabic = t("home") === "الرئيسية";
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const searchParams = new URLSearchParams(window.location.search);
  const categoryParam = searchParams.get("category");
  const skuParam = searchParams.get("sku");
  const walletParam = searchParams.get("wallet");
  const walletIdParam = searchParams.get("walletId");
  const walletNameParam = searchParams.get("walletName");
  const walletNumberParam = searchParams.get("walletNumber");
  const accountNameParam = searchParams.get("accountName");
  const targetLinkParam = searchParams.get("targetLink");

  const [modalQuantity, setModalQuantity] = useState(1);
  const [selectedCardVariants, setSelectedCardVariants] = useState({});
  const [activeCategory, setActiveCategory] = useState(() => {
    if (categoryParam) {
      if (categoryParam === "payment_methods" || categoryParam.includes("دفع")) {
        return "وسائل الدفع";
      }
      return categoryParam;
    }
    return "all";
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCart, totalItems } = useCart();

  // User Payment Methods & Subscription info
  const [userPaymentData, setUserPaymentData] = useState({
    methods: [],
    hasPaymentPlus: false,
    activeId: null,
    identifier: "",
  });

  // Fetch payment methods for validation
  useEffect(() => {
    let mounted = true;
    fetchPaymentMethods()
      .then((res) => {
        if (!mounted || !res) return;
        setUserPaymentData({
          methods: res.paymentMethods || [],
          hasPaymentPlus: Boolean(res.hasPaymentPlus),
          activeId: res.activePaymentMethodId || null,
          identifier: res.user?.username || res.user?.publicId || "",
        });
      })
      .catch((err) => {
        console.error("Failed to load user payment methods:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    api.products
      .list()
      .then((data) => {
        if (mounted) {
          const list = (data.products || []).map((p) =>
            normalizeProduct(p, isArabic ? "ar" : "en")
          );
          setProducts(list);

          // If SKU is specified in URL, automatically open its details
          if (skuParam) {
            const match = list.find((p) => p.sku === skuParam);
            if (match) {
              openProductDetails(match);
            }
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setError(
            isArabic
              ? t("loadProductsFailed") || "فشل تحميل المنتجات"
              : "Unable to load products right now"
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isArabic, t, skuParam]);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        products
          .map((product) =>
            typeof product.category === "object" && product.category !== null
              ? product.category.name || product.category.slug
              : product.category
          )
          .filter(Boolean)
      )
    );
    return [
      { id: "all", label: isArabic ? "كل البطاقات" : "All Cards" },
      ...unique.map((category) => ({ id: category, label: category })),
    ];
  }, [isArabic, products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((product) => {
      const pCat =
        typeof product.category === "object" && product.category !== null
          ? product.category.name || product.category.slug || product.category._id
          : product.category;
      return pCat === activeCategory;
    });
  }, [products, activeCategory]);

  const getColorDisplayName = (color) => {
    if (!color) return "";
    if (typeof color === "string") return color;
    if (typeof color.name === "object" && color.name !== null) {
      return color.name[isArabic ? "ar" : "en"] || color.name.ar || color.name.en || "";
    }
    return String(color.name || color.colorCode || color.hex || "");
  };

  const openProductDetails = (product) => {
    if (!product) return;
    const currentVariant = selectedCardVariants[product.id];
    setSelectedProduct(product);
    setModalQuantity(1);

    if (currentVariant) {
      setSelectedColor(currentVariant);
      if (currentVariant.image && Array.isArray(product.images)) {
        const idx = product.images.findIndex((img) => img === currentVariant.image);
        setActiveImageIndex(idx !== -1 ? idx : 0);
      } else {
        setActiveImageIndex(0);
      }
    } else if (Array.isArray(product.colors) && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
      if (product.colors[0].image && Array.isArray(product.images)) {
        const idx = product.colors[0].image ? product.images.findIndex((img) => img === product.colors[0].image) : -1;
        setActiveImageIndex(idx !== -1 ? idx : 0);
      } else {
        setActiveImageIndex(0);
      }
    } else {
      setSelectedColor(null);
      setActiveImageIndex(0);
    }
  };

  const handleAddToCart = async (productToAdd, qty = 1, chosenColor = null, chosenImg = null) => {
    if (!productToAdd || productToAdd.quantity <= 0) return false;

    const isPaymentCard =
      productToAdd.category === "وسائل الدفع" ||
      productToAdd.sku?.startsWith("TH-PAY-") ||
      Boolean(walletParam);

    let customDesignPayload = null;

    if (isPaymentCard) {
      // 1. Determine provider from SKU or params
      let targetProvider = walletParam;
      if (!targetProvider) {
        if (productToAdd.sku === "TH-PAY-VODAFONE") targetProvider = "vodafone_cash";
        else if (productToAdd.sku === "TH-PAY-INSTAPAY") targetProvider = "instapay";
        else if (productToAdd.sku === "TH-PAY-ORANGE") targetProvider = "orange_cash";
        else if (productToAdd.sku === "TH-PAY-ETISALAT") targetProvider = "etisalat_cash";
        else if (productToAdd.sku === "TH-PAY-WEPAY") targetProvider = "we_pay";
        else if (productToAdd.sku === "TH-PAY-UNIFIED") targetProvider = "unified";
      }

      const Swal = (await import("sweetalert2")).default;

      // ── CASE 1: UNIFIED PAYMENT PAGE CARD ──
      if (targetProvider === "unified" || productToAdd.sku === "TH-PAY-UNIFIED") {
        // Check if user has at least one configured payment method
        if (!userPaymentData.methods || userPaymentData.methods.length === 0) {
          const result = await Swal.fire({
            title: isArabic ? "بيانات وسائل الدفع غير مكتملة" : "Incomplete Payment Details",
            html: isArabic
              ? "<p class='text-sm leading-relaxed text-slate-300'>لم تقم بإضافة أي وسيلة دفع بعد. يرجى إضافة وسائل الدفع أولاً ليتم ربط الكارت بها.</p>"
              : "<p class='text-sm leading-relaxed text-slate-300'>Please add your payment methods first before ordering the card.</p>",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: isArabic ? "تعديل المحافظ" : "Edit Wallets",
            cancelButtonText: isArabic ? "إلغاء" : "Cancel",
            confirmButtonColor: "#4f46e5",
            cancelButtonColor: "#334155",
            background: "#0f172a",
            color: "#fff",
          });

          if (result.isConfirmed) {
            setSelectedProduct(null);
            navigate("/u/cards?sub=payment");
          }
          return false;
        }

        const origin = window.location.origin;
        const identifier =
          userPaymentData.identifier ||
          personal?.username ||
          personal?.publicId ||
          "";
        const finalTargetLink = targetLinkParam || `${origin}/pay/${identifier}`;
        const finalAccountName =
          accountNameParam ||
          userPaymentData.methods[0]?.accountName ||
          personal?.name ||
          identifier;

        customDesignPayload = {
          isPaymentCard: true,
          walletProvider: "unified",
          walletName: isArabic
            ? "صفحة الدفع الموحدة"
            : "Unified Payment Page",
          walletNumber: isArabic
            ? "صفحة موحدة تضم كافة الوسائل"
            : "Unified Hub",
          accountName: finalAccountName,
          targetLink: finalTargetLink,
          cardDesign:
            typeof productToAdd.name === "object"
              ? productToAdd.name.ar
              : productToAdd.name,
          sku: productToAdd.sku,
        };
      } else {
        // ── CASE 2: SINGLE WALLET (فودافون، انستاباي، أورنج، اتصالات، وي) ──
        const providerNames = {
          vodafone_cash: isArabic ? "فودافون كاش" : "Vodafone Cash",
          instapay: isArabic ? "انستاباي" : "Instapay",
          orange_cash: isArabic ? "أورنج كاش" : "Orange Cash",
          etisalat_cash: isArabic ? "اتصالات كاش" : "Etisalat Cash",
          we_pay: isArabic ? "وي باي" : "WE Pay",
        };
        const provDisplayName =
          providerNames[targetProvider] ||
          (isArabic ? "وسيلة الدفع" : "Payment Method");

        // Look for matching method in user methods (optional match)
        const matchedMethod = (userPaymentData.methods || []).find(
          (m) =>
            m.provider === targetProvider ||
            (walletIdParam && m.id === walletIdParam) ||
            m.name?.includes(provDisplayName)
        );

        // Always use the primary link: /pay/:identifier
        const origin = window.location.origin;
        const identifier =
          userPaymentData.identifier ||
          personal?.username ||
          personal?.publicId ||
          "";

        const effectiveLink = `${origin}/pay/${identifier}`;

        const fallbackAccountName =
          matchedMethod?.accountName ||
          accountNameParam ||
          personal?.name ||
          personal?.username ||
          identifier;

        const fallbackWalletNumber =
          matchedMethod?.walletNumber ||
          walletNumberParam ||
          "";

        customDesignPayload = {
          isPaymentCard: true,
          walletProvider: targetProvider,
          walletName: matchedMethod?.name || walletNameParam || provDisplayName,
          walletNumber: fallbackWalletNumber,
          accountName: fallbackAccountName,
          targetLink: effectiveLink,
          cardDesign:
            typeof productToAdd.name === "object"
              ? productToAdd.name.ar
              : productToAdd.name,
          sku: productToAdd.sku,
        };
      }
    }

    const finalImg =
      chosenImg ||
      productToAdd.images?.[activeImageIndex] ||
      productToAdd.image;
    const finalColor =
      chosenColor ||
      (Array.isArray(productToAdd.colors)
        ? productToAdd.colors.find((c) => c.image === finalImg)
        : null);

    addToCart(
      {
        ...productToAdd,
        selectedImage: finalImg,
        image: finalImg,
        activeImageIndex,
        selectedColor: finalColor,
        customDesign: customDesignPayload,
      },
      qty,
      customDesignPayload,
      null,
      finalColor
    );

    toast.success(isArabic ? "تمت إضافة المنتج إلى السلة" : "Added to cart");

    return true;
  };

  const handleBuyNowFromModal = async () => {
    if (!selectedProduct) return;
    const success = await handleAddToCart(
      selectedProduct,
      modalQuantity,
      selectedColor
    );
    if (success) {
      setSelectedProduct(null);
      if (onOpenCart) onOpenCart();
    }
  };

  return (
    <section className="space-y-6 pb-20">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="space-y-1.5 max-w-xl">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {t("thenithProducts") || (isArabic ? "بطاقات Thenith الذكية" : "Thenith Smart Cards")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {isArabic
              ? "اختر بطاقتك الذكية بتقنية NFC لمشاركة هويتك الرقمية بلمسة واحدة وبدون أي تطبيقات."
              : "Choose your smart NFC card to effortlessly share your digital identity."}
          </p>
        </div>

        {/* Quick Cart Pill */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`${isArabic ? "السلة" : "Cart"}: ${totalItems}`}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-black dark:hover:border-white text-slate-800 dark:text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>{isArabic ? "سلة المشتريات" : "Cart"}</span>
            {totalItems > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Wallet Card Customization Banner ── */}
      {walletNameParam && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-indigo-600/10 border border-emerald-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-400">
                {isArabic ? "طلب وتخصيص كارت دفع لوسيلتك:" : "Customizing Payment Card for:"}
              </p>
              <p className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <span>{walletNameParam}</span>
                {walletNumberParam && (
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {walletNumberParam}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/u/cards?sub=payment")}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-2xs transition-colors cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isArabic ? "صفحة وسائل الدفع" : "Payment Methods"}</span>
            </button>
            <span className="text-xs font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-full shadow-xs">
              {isArabic ? "ربط مباشر بالوسيلة" : "Direct Wallet Link"}
            </span>
          </div>
        </div>
      )}

      {/* ── Categories Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {categories.length > 0 && !loading && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const count =
                cat.id === "all"
                  ? products.length
                  : products.filter((p) => {
                      const pCat =
                        typeof p.category === "object" && p.category !== null
                          ? p.category.name || p.category.slug || p.category._id
                          : p.category;
                      return pCat === cat.id;
                    }).length;

              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                      : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800"
                  }`}
                >
                  {cat.label} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        )}

        {!loading && filteredProducts.length > 0 && (
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap ms-auto">
            {isArabic ? `عرض ${filteredProducts.length} بطاقة` : `Showing ${filteredProducts.length} cards`}
          </span>
        )}
      </div>

      {/* ── Content States ── */}
      {loading ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-16 flex flex-col items-center justify-center gap-3 text-slate-400 border border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin" />
          <p className="text-xs font-medium animate-pulse">
            {isArabic ? t("loadingProducts") || "جاري تحميل البطاقات..." : "Loading products..."}
          </p>
        </div>
      ) : error ? (
        <div className="rounded-3xl bg-white p-5 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
          <ErrorNotice error={error} language={isArabic ? "ar" : "en"} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-16 text-center text-sm font-bold text-slate-500 border border-slate-100 dark:border-slate-800">
          {isArabic ? t("noProductsAvailable") || "لا توجد بطاقات متوفرة في هذا القسم" : "No products available"}
        </div>
      ) : (
        /* ── Grid: Preserving exact store card design ── */
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const isCustom = Boolean(product.isCustomizable);
            const cardColor =
              selectedCardVariants[product.id] ||
              (Array.isArray(product.colors) && product.colors.length > 0
                ? product.colors[0]
                : null);
            const cardImage = cardColor?.image || product.image;

            return (
              <div key={product.id} className="group flex flex-col relative text-start">
                {/* Card Image Container */}
                <div
                  onClick={() => openProductDetails(product)}
                  className="relative block aspect-square w-full bg-[#EEEEEE] dark:bg-slate-900 mb-4 flex items-center justify-center transition-opacity hover:opacity-95 overflow-hidden rounded-2xl cursor-pointer"
                >
                  {isCustom && (
                    <div className="absolute top-3 start-3 z-10 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-900 shadow-md flex items-center border border-white/60">
                      <span>{isArabic ? "تصميم مخصص" : "Custom Card"}</span>
                    </div>
                  )}

                  {cardImage ? (
                    <img
                      src={cardImage}
                      alt={
                        typeof product.name === "object"
                          ? product.name?.ar || product.name?.en
                          : product.name
                      }
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                      {t("store.noImage")}
                    </div>
                  )}
                </div>

                <div className="flex flex-col flex-1 px-1 text-left">
                  <div
                    onClick={() => openProductDetails(product)}
                    className="flex justify-between items-start gap-2 mb-2 cursor-pointer"
                  >
                    <h3 className="text-[15px] font-bold text-[#111827] dark:text-white line-clamp-2 leading-snug hover:underline decoration-2 underline-offset-2">
                      {typeof product.name === "object"
                        ? product.name?.ar || product.name?.en
                        : product.name}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      <span className="text-[13px] text-gray-600 dark:text-gray-400 font-medium">
                        5.0
                      </span>
                      <span className="text-[12px] text-[#FBBF24]">★</span>
                    </div>
                  </div>

                  {Array.isArray(product.colors) && product.colors.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                      {product.colors.map((c, cIdx) => {
                        const isSelected =
                          cardColor?.colorCode?.toLowerCase() === c.colorCode?.toLowerCase() ||
                          cardColor?.name === c.name;
                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedCardVariants((prev) => ({ ...prev, [product.id]: c }));
                            }}
                            className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                              isSelected
                                ? "ring-2 ring-indigo-600 ring-offset-1 scale-110 border-indigo-600 shadow-sm"
                                : "border-slate-300 dark:border-slate-700 hover:scale-110 opacity-70 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: c.colorCode || "#111827" }}
                            title={getColorDisplayName(c)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Price and Action Button Row */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="text-xl font-extrabold text-[#111827] dark:text-white">
                      {formatMoney(product.price, product.currency)}
                    </div>
                    {isCustom ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (onOpenCustomCard) {
                            onOpenCustomCard(product);
                          } else {
                            window.location.href = `/custom-card?productId=${product.id}`;
                          }
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 cursor-pointer"
                      >
                        <span>{isArabic ? "صمّم كارتك" : "Customize"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToCart(product, 1, cardColor, cardImage);
                        }}
                        className="w-10 h-10 rounded-full bg-[#111827] text-white flex items-center justify-center hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-sm relative z-20 cursor-pointer"
                        title={isArabic ? "شراء الآن" : "Buy now"}
                      >
                        <ShoppingCart className="w-4 h-4 pointer-events-none" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Minimal Product Details Modal ("صفحة المنتج في البانيل") ── */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedProduct(null);
              setActiveImageIndex(0);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setActiveImageIndex(0);
                }}
                className="absolute top-4 end-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Left Column: Card Showcase */}
              <div className="w-full md:w-1/2 p-6 sm:p-8 bg-slate-50/60 dark:bg-slate-950/40 flex flex-col items-center justify-center border-b md:border-b-0 md:border-e border-slate-100 dark:border-slate-800">
                <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[320px] bg-[#EEEEEE] dark:bg-slate-900 rounded-2xl p-4 flex items-center justify-center overflow-hidden shadow-xs">
                  {Boolean(selectedProduct.isCustomizable) && (
                    <div className="absolute top-3 start-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 shadow flex items-center border border-white/60">
                      <span>{isArabic ? "تصميم مخصص" : "Custom Card"}</span>
                    </div>
                  )}

                  {selectedProduct.images?.[activeImageIndex] || selectedProduct.image ? (
                    <img
                      src={
                        selectedProduct.images?.[activeImageIndex] ||
                        selectedProduct.image
                      }
                      alt={
                        typeof selectedProduct.name === "object"
                          ? selectedProduct.name?.ar || selectedProduct.name?.en
                          : selectedProduct.name
                      }
                      className="w-full h-full object-contain drop-shadow-sm"
                    />
                  ) : (
                    <Package className="w-16 h-16 text-slate-400" />
                  )}
                </div>

                {/* Thumbnails */}
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none max-w-full">
                    {selectedProduct.images.map((img, idx) => {
                      const matchedColor = Array.isArray(selectedProduct.colors)
                        ? selectedProduct.colors.find((c) => c.image === img)
                        : null;
                      const isSelected = activeImageIndex === idx;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveImageIndex(idx);
                            if (matchedColor) setSelectedColor(matchedColor);
                          }}
                          className={`relative w-14 h-14 rounded-xl bg-[#EEEEEE] p-1 border-2 transition-all cursor-pointer overflow-hidden ${
                            isSelected
                              ? "border-slate-900 dark:border-white shadow-xs scale-102"
                              : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-contain"
                          />
                          {matchedColor && (
                            <span
                              className="absolute bottom-1 end-1 w-2.5 h-2.5 rounded-full border border-white shadow-2xs"
                              style={{ backgroundColor: matchedColor.colorCode || "#111827" }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Details & Actions */}
              <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col overflow-y-auto space-y-4">
                {/* Category */}
                {selectedProduct.category && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {typeof selectedProduct.category === "object"
                        ? selectedProduct.category.name
                        : selectedProduct.category}
                    </span>
                  </div>
                )}

                {/* Title & Description underneath */}
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {typeof selectedProduct.name === "object"
                      ? selectedProduct.name?.ar || selectedProduct.name?.en
                      : selectedProduct.name}
                  </h2>
                  {(selectedProduct.desc || selectedProduct.description) && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                      {typeof selectedProduct.desc === "string"
                        ? selectedProduct.desc
                        : typeof selectedProduct.description === "string"
                          ? selectedProduct.description
                          : (selectedProduct.description?.[isArabic ? "ar" : "en"] || selectedProduct.description?.ar || "")}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {formatMoney(selectedProduct.price, selectedProduct.currency)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isArabic ? "شامل الضريبة" : "VAT included"}
                  </span>
                </div>

                {/* Color Selection */}
                {Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isArabic ? "اختر اللون:" : "Color:"}
                      </span>
                      {selectedColor && (
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {getColorDisplayName(selectedColor)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedProduct.colors.map((c, idx) => {
                        const isSelected =
                          selectedColor?.colorCode?.toLowerCase() === c.colorCode?.toLowerCase() ||
                          selectedColor?.name === c.name;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedColor(c);
                              if (c.image && Array.isArray(selectedProduct.images)) {
                                const i = selectedProduct.images.findIndex((img) => img === c.image);
                                if (i !== -1) setActiveImageIndex(i);
                              }
                            }}
                            className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                              isSelected
                                ? "border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 scale-102"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10 flex items-center justify-center shrink-0"
                              style={{ backgroundColor: c.colorCode || "#111827" }}
                            >
                              {isSelected && (
                                <Check
                                  className={`w-2 h-2 ${
                                    c.colorCode?.toUpperCase() === "#FFFFFF" || c.colorCode?.toUpperCase() === "#C0C0C0"
                                      ? "text-black"
                                      : "text-white"
                                  }`}
                                />
                              )}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                              {getColorDisplayName(c)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity & CTA Buttons */}
                {!Boolean(selectedProduct.isCustomizable) ? (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isArabic ? "الكمية:" : "Quantity:"}
                      </span>
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                        <button
                          type="button"
                          onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                          disabled={modalQuantity <= 1}
                          className="w-6 h-6 rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-900 dark:text-white">
                          {modalQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalQuantity((q) => Math.min(selectedProduct.quantity || 99, q + 1))}
                          disabled={modalQuantity >= (selectedProduct.quantity || 99)}
                          className="w-6 h-6 rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handleBuyNowFromModal}
                        disabled={selectedProduct.quantity <= 0}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#111827] dark:bg-white text-white dark:text-[#111827] hover:bg-black dark:hover:bg-slate-100 px-4 py-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-40"
                      >
                        <span>{isArabic ? "شراء الآن" : "Buy Now"}</span>
                        {isArabic ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleAddToCart(selectedProduct, modalQuantity, selectedColor);
                          setSelectedProduct(null);
                        }}
                        disabled={selectedProduct.quantity <= 0}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-700 hover:border-black dark:hover:border-white bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-98 disabled:opacity-40"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{isArabic ? "أضف للسلة" : "Add to Cart"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        const prod = selectedProduct;
                        setSelectedProduct(null);
                        if (onOpenCustomCard) {
                          onOpenCustomCard(prod);
                        } else {
                          window.location.href = `/custom-card?productId=${prod.id}`;
                        }
                      }}
                      className="w-full flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111827] dark:bg-white text-white dark:text-[#111827] hover:bg-black dark:hover:bg-slate-100 px-5 py-3 text-xs font-black shadow-sm transition-all cursor-pointer active:scale-98"
                    >
                      <span>{isArabic ? "صمّم كارتك الآن" : "Customize Your Card"}</span>
                      {isArabic ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
