import { useGlobalLanguage } from "../../context/GlobalLanguageContext.jsx";
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ShoppingCart,
  Sparkles,
  Truck,
  Plus,
  Minus,
  Maximize2,
  X,
  Share2,
} from "lucide-react";
import { useCart } from "../../context/CartContext.jsx";
import api from "../../api/index.js";
import { formatMoney, normalizeProduct } from "./storeApi.js";
import { applyPageSeo, PRODUCTION_DOMAIN, getNotFoundSeoData } from "../../utils/seo.js";

export default function ProductDetailsPage() {
  const { t, language } = useGlobalLanguage();
  const isAr = language === "ar";
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, totalItems } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [zoomModal, setZoomModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!product && error) {
      applyPageSeo(getNotFoundSeoData(language, "product"));
      return;
    }
    if (product) {
      const title = `${product.name || product.title} | Thenith Store`;
      const description =
        product.description ||
        product.desc ||
        (isAr
          ? "بطاقة Thenith الذكية الفاخرة المجهزة بتقنية NFC لمشاركة هويتك وبياناتك باحترافية."
          : "Premium Thenith Smart NFC Business Card to share your identity effortlessly.");
      const canonicalUrl = `${PRODUCTION_DOMAIN}/products/${id}`;
      const image = product.images?.[0] || `${PRODUCTION_DOMAIN}/icon512.png`;

      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name || product.title,
        description,
        image,
        sku: id,
        offers: {
          "@type": "Offer",
          url: canonicalUrl,
          priceCurrency: product.currency || "EGP",
          price: product.price || 0,
          availability:
            (product.quantity ?? 1) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
      };

      applyPageSeo({
        title,
        description,
        canonicalUrl,
        robots: "index, follow",
        openGraph: {
          title,
          description,
          url: canonicalUrl,
          type: "product",
          image,
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          image,
        },
        jsonLd,
        jsonLdId: "product",
        breadcrumbs: [
          { name: isAr ? "الرئيسية" : "Home", url: "/" },
          { name: isAr ? "المتجر" : "Store", url: "/products" },
          { name: product.name || product.title, url: `/products/${id}` },
        ],
        lang: language,
        dir: isAr ? "rtl" : "ltr",
      });
    }
  }, [product, error, id, language, isAr]);

  useEffect(() => {
    window.scrollTo(0, 0);
    let mounted = true;

    api.products
      .get(id)
      .then((data) => {
        if (mounted) {
          const normalized = normalizeProduct(data.product, language);
          const isCustom = Boolean(normalized.isCustomizable);
          if (isCustom) {
            navigate(`/custom-card?productId=${normalized.id}`, { replace: true });
            return;
          }
          setProduct(normalized);
          if (Array.isArray(normalized.colors) && normalized.colors.length > 0) {
            setSelectedColor(normalized.colors[0]);
            if (normalized.colors[0].image && Array.isArray(normalized.images)) {
              const matchedIdx = normalized.images.findIndex((img) => img === normalized.colors[0].image);
              if (matchedIdx !== -1) setSelectedImage(matchedIdx);
            }
          }
        }
      })
      .catch(() => {
        if (mounted) setError(t("store.productNotFound") || (isAr ? "المنتج غير موجود" : "Product not found"));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, language, navigate, t, isAr]);

  const activeImageSrc = useMemo(() => {
    if (!product) return "";
    if (product.images && product.images.length > 0) {
      return product.images[selectedImage] || product.images[0];
    }
    return product.image || "";
  }, [product, selectedImage]);

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    if (color.image && Array.isArray(product?.images)) {
      const idx = product.images.findIndex((img) => img === color.image);
      if (idx !== -1) setSelectedImage(idx);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name || "Thenith Card",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleAddToCart = () => {
    if (!product || product.quantity <= 0) return;
    const currentImg = activeImageSrc;
    const currentColor =
      selectedColor ||
      (Array.isArray(product.colors)
        ? product.colors.find((c) => c.image === currentImg)
        : null);

    addToCart(
      {
        ...product,
        selectedImage: currentImg,
        image: currentImg,
        activeImageIndex: selectedImage,
        selectedColor: currentColor,
      },
      quantity,
      null,
      null,
      currentColor
    );

    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2200);

    toast.success(isAr ? "تمت إضافة المنتج إلى السلة" : (t("store.addedToCart") || "Added to cart"));
  };

  const handleBuyNow = () => {
    if (!product || product.quantity <= 0) return;
    handleAddToCart();
    navigate("/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 text-gray-500">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="text-xs font-medium text-gray-400 animate-pulse">
          {t("store.loadingProduct") || (isAr ? "جاري تحميل المنتج..." : "Loading product...")}
        </p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center flex-col gap-4 px-6 text-center text-[#111827]">
        <h1 className="text-xl font-bold text-[#111827]">
          {t("store.productNotFound") || (isAr ? "عذراً، المنتج غير متوفر" : "Product not found")}
        </h1>
        <button
          onClick={() => navigate("/products")}
          className="bg-[#111827] text-white px-6 py-2.5 rounded-full font-bold text-xs hover:bg-black transition-colors cursor-pointer"
        >
          {t("store.backToStoreLink") || (isAr ? "العودة للمتجر" : "Back to Store")}
        </button>
      </div>
    );
  }

  const isCustomCard = Boolean(product.isCustomizable);
  const inStock = (product.quantity ?? 1) > 0;

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans selection:bg-black selection:text-white pb-32">
      {/* Sleek Top Navigation Bar */}
      <div className="pt-24 pb-6 px-6 max-w-[1240px] mx-auto">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black transition-colors"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isAr ? "العودة لمتجر البطاقات" : "Back to Cards Store"}</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:border-black text-gray-700 text-xs font-bold transition-all cursor-pointer"
              title={isAr ? "مشاركة رابط المنتج" : "Share product link"}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? (isAr ? "تم النسخ!" : "Copied!") : (isAr ? "مشاركة" : "Share")}</span>
            </button>

            <Link
              to="/cart"
              className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-700 hover:border-black hover:text-black transition-all"
              aria-label="Cart"
            >
              <ShoppingCart className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-[1240px] mx-auto px-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* ── Left Column: Card Image Gallery ── */}
          <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-28">
            <div className="relative aspect-square w-full bg-[#EEEEEE] rounded-3xl p-6 sm:p-10 flex items-center justify-center overflow-hidden group">
              {/* Customizable Badge */}
              {isCustomCard && (
                <div className="absolute top-4 start-4 z-10 px-3.5 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-900 shadow-md flex items-center border border-white/60">
                  <span>{language === "ar" ? "تصميم مخصص" : "Custom Card"}</span>
                </div>
              )}

              {/* Zoom Trigger Button */}
              {activeImageSrc && (
                <button
                  type="button"
                  onClick={() => setZoomModal(true)}
                  aria-label="Zoom image"
                  className="absolute top-4 end-4 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-gray-700 shadow-xs backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-105 cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}

              {/* Main Card Image with Smooth Transition */}
              <AnimatePresence mode="wait">
                {activeImageSrc ? (
                  <motion.img
                    key={activeImageSrc}
                    src={activeImageSrc}
                    alt={product.name}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.25 }}
                    fetchPriority="high"
                    className="w-full h-full object-contain drop-shadow-lg group-hover:scale-103 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                    {t("store.noImage")}
                  </div>
                )}
              </AnimatePresence>

              {/* Out of stock overlay */}
              {!inStock && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-20">
                  <span className="bg-[#111827] text-white px-5 py-2 rounded-full font-bold text-xs tracking-wider">
                    {isAr ? "نفذت الكمية مؤقتاً" : "Out of Stock"}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {product.images && product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {product.images.map((img, idx) => {
                  const matchedColor = Array.isArray(product.colors)
                    ? product.colors.find((c) => c.image === img)
                    : null;
                  const isSelected = selectedImage === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedImage(idx);
                        if (matchedColor) {
                          setSelectedColor(matchedColor);
                        }
                      }}
                      className={`relative shrink-0 w-20 h-20 rounded-2xl bg-[#EEEEEE] p-2 border-2 transition-all cursor-pointer overflow-hidden ${
                        isSelected
                          ? "border-[#111827] shadow-sm scale-102"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-contain"
                      />
                      {matchedColor && (
                        <span
                          className="absolute bottom-1.5 end-1.5 w-3 h-3 rounded-full border border-white shadow-2xs"
                          style={{ backgroundColor: matchedColor.colorCode || "#111827" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right Column: Product Info & Actions ── */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            {/* Category */}
            {product.category && (
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {typeof product.category === "object" ? product.category.name : product.category}
                </span>
              </div>
            )}

            {/* Title & Description underneath */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111827] tracking-tight leading-snug">
                {product.name}
              </h1>
              {(product.desc || product.description) && (
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {product.desc || product.description}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="pt-2 border-t border-gray-100 flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight">
                {formatMoney(product.price, product.currency)}
              </span>
              <span className="text-xs text-gray-400">
                {isAr ? "شامل الضريبة" : "VAT included"}
              </span>
            </div>

            {/* Color Swatches */}
            {Array.isArray(product.colors) && product.colors.length > 0 && (
              <div className="space-y-2.5 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">
                    {isAr ? "اختر لون الكارت:" : "Choose Card Color:"}
                  </span>
                  {selectedColor && (
                    <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-full">
                      {selectedColor.name || selectedColor.colorCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {product.colors.map((c, idx) => {
                    const isSelected =
                      selectedColor?.colorCode?.toLowerCase() === c.colorCode?.toLowerCase() ||
                      selectedColor?.name === c.name;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleColorSelect(c)}
                        className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isSelected
                            ? "border-black bg-gray-50 ring-2 ring-black/10 scale-102"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: c.colorCode || "#111827" }}
                        >
                          {isSelected && (
                            <Check
                              className={`w-2.5 h-2.5 ${
                                c.colorCode?.toUpperCase() === "#FFFFFF" || c.colorCode?.toUpperCase() === "#C0C0C0"
                                  ? "text-slate-900"
                                  : "text-white"
                              }`}
                            />
                          )}
                        </span>
                        <span className={`text-xs font-bold ${isSelected ? "text-black" : "text-gray-600"}`}>
                          {c.name || c.colorCode}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity & CTA Buttons */}
            {!isCustomCard ? (
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">
                    {isAr ? "الكمية:" : "Quantity:"}
                  </span>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-7 h-7 rounded-full bg-white text-gray-700 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-black text-gray-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(product.quantity || 99, q + 1))}
                      disabled={quantity >= (product.quantity || 99)}
                      className="w-7 h-7 rounded-full bg-white text-gray-700 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={!inStock}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111827] hover:bg-black px-6 py-3 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-98"
                  >
                    <span>{t("store.buyNow") || (isAr ? "شراء الآن" : "Buy Now")}</span>
                    {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-gray-300 hover:border-black bg-white px-6 py-3 text-sm font-bold text-[#111827] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>
                      {addedFeedback
                        ? (isAr ? "تمت الإضافة ✓" : "Added ✓")
                        : (t("store.addToCart") || (isAr ? "أضف إلى السلة" : "Add to Cart"))}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate(`/custom-card?productId=${product.id}`)}
                  className="w-full flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#111827] hover:bg-black px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <span>{isAr ? "صمّم كارتك الآن" : "Customize Your Card"}</span>
                  {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Features (if any) */}
            {Array.isArray(product.features) && product.features.length > 0 && (
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  {isAr ? "المميزات الرئيسية" : "Key Features"}
                </h3>
                {product.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2.5 text-xs text-gray-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Shipping Note */}
            <div className="pt-4 border-t border-gray-100 flex items-center gap-2.5 text-xs text-gray-500">
              <Truck className="w-4 h-4 text-gray-700 shrink-0" />
              <span>
                {isAr
                  ? "شحن سريع لكافة محافظات مصر وخيارات دفع إلكتروني أو عند الاستلام."
                  : "Fast delivery across Egypt with secure online payment or cash on delivery."}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ── Minimal Zoom Modal ── */}
      <AnimatePresence>
        {zoomModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-3xl max-h-[90vh] bg-white rounded-3xl p-6 overflow-hidden flex flex-col items-center shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setZoomModal(false)}
                className="absolute top-4 end-4 z-10 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-full h-full max-h-[75vh] flex items-center justify-center p-4">
                <img
                  src={activeImageSrc}
                  alt={product.name}
                  className="max-h-[70vh] max-w-full object-contain"
                />
              </div>

              <div className="pt-2 text-center">
                <p className="text-sm font-bold text-gray-900">{product.name}</p>
                {selectedColor && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isAr ? "اللون:" : "Color:"} {selectedColor.name || selectedColor.colorCode}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
