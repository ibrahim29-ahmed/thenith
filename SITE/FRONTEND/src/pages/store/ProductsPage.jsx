import { useGlobalLanguage } from "../../context/GlobalLanguageContext.jsx";
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { formatMoney, loadStoreProducts, loadStoreCategories } from "./storeApi.js";
import { useCart } from "../../context/CartContext.jsx";
import { ShoppingCart, ShieldCheck, Zap, Truck } from "lucide-react";
import { applyPageSeo, PRODUCTION_DOMAIN } from "../../utils/seo.js";

export default function ProductsPage() {
  const { t, language } = useGlobalLanguage();
  const isAr = language === "ar";
  const { addToCart, totalItems } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedCardVariants, setSelectedCardVariants] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const title = isAr
      ? "متجر بطاقات Thenith الذكية | Smart NFC Cards Store"
      : "Thenith Smart NFC Cards Store";
    const description = isAr
      ? "استكشف واطلب بطاقات Thenith الذكية الفاخرة بتقنية NFC. بطاقات معدنية وبلاستيكية مخصصة لمشاركة هويتك الرقمية باحترافية."
      : "Explore and buy luxury Thenith smart NFC business cards. Premium metal and matte digital cards to share your identity effortlessly.";

    applyPageSeo({
      title,
      description,
      canonicalUrl: `${PRODUCTION_DOMAIN}/products`,
      robots: "index, follow",
      breadcrumbs: [
        { name: isAr ? "الرئيسية" : "Home", url: "/" },
        { name: isAr ? "المتجر والبطاقات الذكية" : "Store & Smart Cards", url: "/products" },
      ],
      lang: language,
      dir: isAr ? "rtl" : "ltr",
      openGraph: {
        title,
        description,
        url: `${PRODUCTION_DOMAIN}/products`,
        type: "website",
      },
    });
  }, [language, isAr]);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      loadStoreProducts(language),
      loadStoreCategories(language).catch(() => []),
    ])
      .then(([items, cats]) => {
        if (mounted) {
          setProducts(items);
          setCategories(cats || []);
        }
      })
      .catch(() => {
        if (mounted) setError(t("store.loadFailed") || (isAr ? "فشل تحميل المنتجات" : "Failed to load products"));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [language, isAr, t]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((p) => {
      const pCat = typeof p.category === "object" && p.category !== null
        ? (p.category.name || p.category.slug || p.category._id)
        : p.category;
      return pCat === activeCategory;
    });
  }, [products, activeCategory]);

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans selection:bg-black selection:text-white pb-24">
      {/* Sleek Minimalist Header */}
      <header className="pt-28 pb-10 px-6 max-w-[1240px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
          <div className="max-w-2xl space-y-3">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#111827]"
            >
              {t("store.storeTitle") || (isAr ? "متجر البطاقات الذكية" : "Smart Cards Store")}
            </motion.h1>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
              {isAr
                ? "بطاقات أعمال ذكية فاخرة بتقنية NFC لمشاركة هويتك الرقمية باحترافية وبدون أي تطبيقات."
                : "Next-generation smart NFC business cards crafted to elevate your networking with a single tap."}
            </p>
          </div>

          {/* Quick Cart Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/cart"
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-gray-200 bg-white hover:border-black text-gray-800 text-xs font-bold transition-all shadow-2xs hover:shadow-sm"
            >
              <ShoppingCart className="w-4 h-4 text-gray-600" />
              <span>{isAr ? "السلة" : "Cart"}</span>
              {totalItems > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-black text-white text-[11px] font-black">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-6">
        {/* Categories Bar & Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          {categories.length > 0 && !loading && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === "all"
                    ? "bg-[#111827] text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200/80"
                }`}
              >
                {isAr ? "كل البطاقات" : "All Cards"} ({products.length})
              </button>
              {categories.map((cat) => {
                const catName = typeof cat.name === "object" ? cat.name[language] || cat.name.ar || cat.name.en : cat.name;
                const count = products.filter((p) => {
                  const pCat = typeof p.category === "object" && p.category !== null ? (p.category.name || p.category.slug || p.category._id) : p.category;
                  return pCat === catName || pCat === cat.slug || pCat === cat._id;
                }).length;
                return (
                  <button
                    key={cat._id || cat.slug || catName}
                    type="button"
                    onClick={() => setActiveCategory(catName)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeCategory === catName
                        ? "bg-[#111827] text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200/80"
                    }`}
                  >
                    {catName} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>
          )}

          {!loading && filteredProducts.length > 0 && (
            <span className="text-xs font-medium text-gray-400 whitespace-nowrap ms-auto">
              {isAr ? `عرض ${filteredProducts.length} بطاقة` : `Showing ${filteredProducts.length} cards`}
            </span>
          )}
        </div>

        {/* Content States */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 gap-3">
            <div className="w-9 h-9 border-3 border-gray-200 border-t-black rounded-full animate-spin" />
            <p className="text-xs font-medium text-gray-400 animate-pulse">
              {isAr ? "جاري تحميل البطاقات..." : "Loading cards..."}
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-32 text-red-500 text-base font-medium">
            {error}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-gray-50/50 rounded-3xl border border-gray-100">
            <h2 className="text-lg font-bold text-gray-700 mb-1">
              {t("store.noMatchingProducts") || (isAr ? "لا توجد بطاقات مطابقة" : "No matching products found")}
            </h2>
            <p className="text-xs text-gray-400">
              {isAr ? "جرب اختيار فئة أخرى من القائمة أعلاه" : "Try selecting a different category"}
            </p>
          </div>
        ) : (
          /* Products Grid - Preserving exact product card */
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12"
          >
            <AnimatePresence>
              {filteredProducts.map((product, index) => {
                const isCustomCard = Boolean(product.isCustomizable);
                const productUrl = isCustomCard
                  ? `/custom-card?productId=${product.id}`
                  : `/products/${product.id}`;

                const cardColor = selectedCardVariants[product.id] || (Array.isArray(product.colors) && product.colors.length > 0 ? product.colors[0] : null);
                const cardImage = cardColor?.image || product.image;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35, delay: index * 0.04 }}
                    key={product.id}
                    className="group flex flex-col relative"
                  >
                    <Link
                      to={productUrl}
                      className="relative block aspect-square w-full bg-[#EEEEEE] mb-4 flex items-center justify-center transition-opacity hover:opacity-95 overflow-hidden rounded-2xl"
                    >
                      {isCustomCard && (
                        <div className="absolute top-3 start-3 z-10 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-900 shadow-md flex items-center border border-white/60">
                          <span>{language === "ar" ? "تصميم مخصص" : "Custom Card"}</span>
                        </div>
                      )}
                      {cardImage ? (
                        <img
                          src={cardImage}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                          {t("store.noImage")}
                        </div>
                      )}
                    </Link>

                    <div className="flex flex-col flex-1 px-1 text-left">
                      <Link
                        to={productUrl}
                        className="flex justify-between items-start gap-2 mb-2"
                      >
                        <h3 className="text-[15px] font-bold text-[#111827] line-clamp-2 leading-snug hover:underline decoration-2 underline-offset-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <span className="text-[13px] text-gray-600 font-medium">
                            5.0
                          </span>
                          <span className="text-[12px] text-[#FBBF24]">★</span>
                        </div>
                      </Link>

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
                                    : "border-slate-300 hover:scale-110 opacity-70 hover:opacity-100"
                                }`}
                                style={{ backgroundColor: c.colorCode || "#111827" }}
                                title={c.name || c.colorCode}
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* Price and Cart Button Row */}
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="text-xl font-extrabold text-[#111827]">
                          {formatMoney(product.price, product.currency)}
                        </div>
                        {isCustomCard ? (
                          <Link
                            to={productUrl}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md hover:scale-105 active:scale-95 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600"
                          >
                            <span>{language === "ar" ? "صمّم كارتك" : "Customize"}</span>
                          </Link>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const chosenImg = cardImage || product.image;
                              addToCart({
                                ...product,
                                image: chosenImg,
                                selectedImage: chosenImg,
                                selectedColor: cardColor,
                              }, 1, null, null, cardColor);
                              toast.success(language === "ar" ? "تمت إضافة المنتج إلى السلة" : (t("store.addedToCart") || "Added to cart"));
                            }}
                            className="w-10 h-10 rounded-full bg-[#111827] text-white flex items-center justify-center hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-sm relative z-20 cursor-pointer"
                            title={t("store.buyNow")}
                          >
                            <ShoppingCart className="w-4 h-4 pointer-events-none" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Minimalist Trust Features Strip */}
        <section className="mt-24 pt-12 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-start">
            <div className="flex items-center md:items-start gap-4 flex-col md:flex-row">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#111827]">
                  {isAr ? "لمس فوري NFC" : "Instant Tap NFC"}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {isAr
                    ? "مشاركة فورية للمعلومات بنقرة واحدة، متوافقة مع جميع هواتف iPhone وAndroid بدون برامج."
                    : "One tap shares your details instantly. Compatible with all modern iOS and Android devices."}
                </p>
              </div>
            </div>

            <div className="flex items-center md:items-start gap-4 flex-col md:flex-row">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#111827]">
                  {isAr ? "ضمان ذهبي لمدة عام" : "1-Year Warranty"}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {isAr
                    ? "استبدال فوري مجاني ضد عيوب الصناعة، وجودة خامات مقاومة للماء والخدش."
                    : "Full 1-year replacement warranty against manufacturing defects. Waterproof materials."}
                </p>
              </div>
            </div>

            <div className="flex items-center md:items-start gap-4 flex-col md:flex-row">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#111827]">
                  {isAr ? "شحن سريع ودفع عند الاستلام" : "Fast Delivery & COD"}
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {isAr
                    ? "توصيل لكافة محافظات مصر خلال 2-4 أيام عمل مع خيارات دفع إلكتروني أو عند الاستلام."
                    : "Delivery across Egypt in 2-4 business days with secure online payment or cash on delivery."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
