import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  FileCode,
  Search,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Plus,
  Trash2,
  Eye,
  Sliders,
  Check,
  ShieldCheck,
  Code2,
  Layers,
  Sparkles,
  Monitor,
  Smartphone,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  fetchSeoSitemapData,
  updateSeoSitemapData,
  regenerateSitemap,
} from "../services/adminApi.js";

// Smart recommended templates for 11 core pages emphasizing "All-in-One Smart Digital Profile" + optional NFC card
const SMART_RECOMMENDED_SEO = {
  home: {
    ar: {
      title: "Thenith — بروفايلك الرقمي الذكي المتكامل وهويتك الاحترافية",
      description: "أنشئ بروفايلك الرقمي الذكي المتكامل مع Thenith. صفحة شخصية موحدة تجمع كل روابطك، أعمالك، وسائل التواصل، حجز المواعيد واستقبال العملاء، مع إمكانية ربط كارت NFC ذكي اختياري لمشاركة ملفك بلمسة واحدة.",
      keywords: "بروفايل رقمي, هوية رقمية, صفحة روابط ذكية, بورتفوليو احترافي, لينك ان بايو, كارت ذكي NFC, كروت أعمال إلكترونية, Thenith",
    },
    en: {
      title: "Thenith — All-in-One Smart Digital Profile & Interactive Bio",
      description: "Create your all-in-one smart digital profile with Thenith. One unified page to showcase your links, portfolio, contacts, and calendar booking — with optional NFC smart business cards for instant sharing.",
      keywords: "smart digital profile, link in bio, digital portfolio, digital identity, NFC business card, smart business card, interactive portfolio, Thenith",
    },
  },
  products: {
    ar: {
      title: "متجر كروت NFC الذكية | Thenith",
      description: "اطلب كارتك الذكي الفاخر بتقنية NFC لربطه مباشرة ببروفايلك الرقمي في Thenith. كروت معدنية وبلاستيكية فاخرة لمشاركة هويتك الرقمية بلمسة واحدة على أي هاتف.",
      keywords: "كروت ذكية, كارت NFC, بطاقات معدنية فاخرة, متجر كروت Thenith, كارت أعمال إلكتروني",
    },
    en: {
      title: "Smart NFC Cards Store | Thenith",
      description: "Order your premium NFC smart business card to connect seamlessly with your Thenith digital profile. Luxury metal and matte cards for tap-to-share networking.",
      keywords: "smart NFC cards, metal business cards, NFC store, digital business cards, Thenith store",
    },
  },
  pricing: {
    ar: {
      title: "باقات وأسعار البروفايل الرقمي | Thenith",
      description: "اختر الباقة المناسبة لبروفايلك الرقمي في Thenith. استمتع بمميزات متقدمة لإدارة هويتك الرقمية، تحليلات الزيارات، النماذج المخصصة، وحجز المواعيد، مع إمكانية ربط كارت NFC ذكي.",
      keywords: "باقات Thenith, أسعار البروفايل الرقمي, اشتراكات كروت الأعمال, خطط الأسعار",
    },
    en: {
      title: "Digital Profile Plans & Pricing | Thenith",
      description: "Choose the perfect plan for your smart digital profile on Thenith. Advanced profile customization, analytics, lead generation forms, calendar booking, and optional smart NFC card integration.",
      keywords: "digital profile plans, pricing, digital identity subscription, Thenith plans",
    },
  },
  custom_card: {
    ar: {
      title: "تصميم كارت ذكي مخصص بشعارك | Thenith",
      description: "صمم كارتك الذكي بتقنية NFC بهويتك وشعارك وألوانك الخاصة ليرتبط مباشرة ببروفايلك الرقمي على منصة Thenith.",
      keywords: "تصميم كارت ذكي, كارت NFC مخصص, كروت أعمال مطبوعة, تخصيص كروت",
    },
    en: {
      title: "Custom Smart NFC Card Designer | Thenith",
      description: "Design your custom NFC smart business card with your branding, logo, and colors, connected directly to your Thenith digital profile.",
      keywords: "custom NFC card, custom smart card, personalized business card, Thenith designer",
    },
  },
  suggest: {
    ar: {
      title: "اقتراح ميزة جديدة | Thenith",
      description: "شاركنا أفكارك واقتراحاتك لتطوير منصة Thenith للبروفايل الرقمي والهوية الذكية.",
      keywords: "اقتراحات Thenith, تطوير المنصة, ميزات جديدة",
    },
    en: {
      title: "Suggest a Feature | Thenith",
      description: "Share your ideas and feature requests to help improve the Thenith digital profile platform.",
      keywords: "feature request, suggest feature, feedback, Thenith ideas",
    },
  },
  login: {
    ar: {
      title: "تسجيل الدخول | Thenith",
      description: "تسجيل الدخول إلى حسابك في منصة Thenith لإدارة بروفايلك الرقمي وكروتك وتحليلاتك.",
      keywords: "دخول Thenith, تسجيل الدخول",
    },
    en: {
      title: "Sign In | Thenith",
      description: "Sign in to your Thenith account to manage your smart digital profile, cards, and analytics.",
      keywords: "sign in, login, Thenith portal",
    },
  },
  signup: {
    ar: {
      title: "إنشاء بروفايل رقمي جديد | Thenith",
      description: "انضم إلى Thenith الآن وأنشئ بروفايلك الرقمي الذكي المتكامل واجمع كل بياناتك في رابط واحد.",
      keywords: "تسجيل Thenith, حساب جديد, بروفايل جديد",
    },
    en: {
      title: "Create Your Digital Profile | Thenith",
      description: "Join Thenith now and create your all-in-one smart digital profile to share all your links effortlessly.",
      keywords: "create account, register, new digital profile, sign up Thenith",
    },
  },
  cart: {
    ar: {
      title: "سلة المشتريات | Thenith",
      description: "راجع كروتك الذكية ومنتجاتك المختارة وأكمل طلبك بسهولة وأمان.",
      keywords: "",
    },
    en: {
      title: "Shopping Cart | Thenith",
      description: "Review your selected smart cards and products and complete your order securely.",
      keywords: "",
    },
  },
  profile_template: {
    ar: {
      title: "البروفايل الرقمي المهني | Thenith",
      description: "استعرض الروابط المهنية، وسائل التواصل، معرض الأعمال، واحجز موعداً مباشرة عبر البروفايل الرقمي.",
      keywords: "بروفايل مهني, صفحة شخصية, بورتفوليو, كارت رقمي",
    },
    en: {
      title: "Professional Digital Profile | Thenith",
      description: "Explore professional links, social profiles, portfolio, and book appointments directly on this smart digital profile.",
      keywords: "digital profile, bio link, portfolio, online card",
    },
  },
  card_resolver: {
    ar: {
      title: "جاري فتح البروفايل الرقمي... | Thenith",
      description: "إعادة توجيه ذكية فورية إلى البروفايل الرقمي المرتبط بالكارت الذكي.",
      keywords: "",
    },
    en: {
      title: "Connecting to Digital Profile... | Thenith",
      description: "Instant smart redirect to the digital profile connected to this smart card.",
      keywords: "",
    },
  },
  not_found: {
    ar: {
      title: "الصفحة غير موجودة 404 | Thenith",
      description: "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
      keywords: "",
    },
    en: {
      title: "Page Not Found 404 | Thenith",
      description: "Sorry, the page you are looking for does not exist or has been moved.",
      keywords: "",
    },
  },
};

export default function SeoSitemapManager() {
  const [activeTab, setActiveTab] = useState("pages"); // "pages" | "sitemap" | "robots" | "verification"
  const [selectedLang, setSelectedLang] = useState("ar"); // "ar" | "en"
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "mobile"
  const [pagesSearch, setPagesSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [notice, setNotice] = useState(null);
  const [copied, setCopied] = useState(false);

  // Core Data
  const [pagesSeo, setPagesSeo] = useState({});
  const [selectedPageKey, setSelectedPageKey] = useState("home");
  const [sitemapConfig, setSitemapConfig] = useState({
    includeProducts: true,
    customUrls: [],
    lastGenerated: null,
  });
  const [sitemapUrls, setSitemapUrls] = useState([]);
  const [sitemapXmlRaw, setSitemapXmlRaw] = useState("");
  const [robotsTxt, setRobotsTxt] = useState("");
  const [verification, setVerification] = useState({
    googleSiteVerification: "",
    googleAnalyticsId: "",
    bingVerification: "",
  });
  const [siteName, setSiteName] = useState("Thenith");

  // Custom Page Modal
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageForm, setNewPageForm] = useState({
    key: "",
    name: "",
    path: "",
    priority: "0.8",
    changefreq: "weekly",
  });

  // Sitemap custom URL form
  const [newUrlPath, setNewUrlPath] = useState("");
  const [newUrlPriority, setNewUrlPriority] = useState("0.8");
  const [newUrlFreq, setNewUrlFreq] = useState("weekly");

  const showNotice = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchSeoSitemapData();
      if (res) {
        if (res.pagesSeo) setPagesSeo(res.pagesSeo);
        if (res.sitemapConfig) setSitemapConfig(res.sitemapConfig);
        if (res.sitemapUrls) setSitemapUrls(res.sitemapUrls);
        if (res.sitemapXmlRaw) setSitemapXmlRaw(res.sitemapXmlRaw);
        if (res.robotsTxt) setRobotsTxt(res.robotsTxt);
        if (res.verification) setVerification(res.verification);
        if (res.siteName) setSiteName(res.siteName);
      }
    } catch (err) {
      showNotice("error", "فشل تحميل بيانات السيو والسايت ماب");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update localized field for current page (ar / en)
  const handleLocalizedFieldChange = (field, val) => {
    setPagesSeo((prev) => {
      const page = prev[selectedPageKey] || {};
      const langObj = page[selectedLang] || {};
      const updatedLangObj = { ...langObj, [field]: val };

      const updatedPage = {
        ...page,
        [selectedLang]: updatedLangObj,
      };

      // Also maintain top-level fallback for Arabic
      if (selectedLang === "ar") {
        if (field === "title") updatedPage.title = val;
        if (field === "description") updatedPage.description = val;
        if (field === "keywords") updatedPage.keywords = val;
      }

      return {
        ...prev,
        [selectedPageKey]: updatedPage,
      };
    });
  };

  // Update shared page field (robots, ogImage, priority, changefreq, path)
  const handleSharedFieldChange = (field, val) => {
    setPagesSeo((prev) => ({
      ...prev,
      [selectedPageKey]: {
        ...(prev[selectedPageKey] || {}),
        [field]: val,
      },
    }));
  };

  // Populate smart suggestion for the current page & language
  const handleApplySmartSuggestion = () => {
    const suggestion = SMART_RECOMMENDED_SEO[selectedPageKey]?.[selectedLang];
    if (!suggestion) {
      showNotice("error", "لا توجد نصوص مقترحة جاهزة لهذه الصفحة المخصصة");
      return;
    }

    setPagesSeo((prev) => {
      const page = prev[selectedPageKey] || {};
      const updatedLangObj = {
        title: suggestion.title,
        description: suggestion.description,
        keywords: suggestion.keywords,
      };

      const updatedPage = {
        ...page,
        [selectedLang]: updatedLangObj,
      };

      if (selectedLang === "ar") {
        updatedPage.title = suggestion.title;
        updatedPage.description = suggestion.description;
        updatedPage.keywords = suggestion.keywords;
      }

      return {
        ...prev,
        [selectedPageKey]: updatedPage,
      };
    });

    showNotice(
      "success",
      `تم استعادة النصوص المقترحة الذكية للنسخة ${selectedLang === "ar" ? "العربية" : "الإنجليزية"} بنجاح!`
    );
  };

  // Save all settings
  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        pagesSeo,
        sitemapConfig,
        robotsTxt,
        verification,
      };
      await updateSeoSitemapData(payload);
      showNotice("success", "تم حفظ كافة إعدادات السيو وعناوين اللغات والسايت ماب بنجاح!");
    } catch (err) {
      showNotice("error", "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  // Regenerate XML Sitemap
  const handleRegenerateSitemap = async () => {
    try {
      setRegenerating(true);
      const res = await regenerateSitemap();
      if (res?.urls) {
        setSitemapUrls(res.urls);
        setSitemapXmlRaw(res.xml || "");
        setSitemapConfig((prev) => ({
          ...prev,
          lastGenerated: res.lastGenerated,
        }));
        showNotice("success", res.message || "تم توليد وتحديث خريطة الموقع بنجاح!");
      }
    } catch (err) {
      showNotice("error", "فشل إعادة توليد خريطة الموقع");
    } finally {
      setRegenerating(false);
    }
  };

  // Add custom URL to sitemap
  const handleAddCustomUrl = () => {
    if (!newUrlPath.trim()) return;
    const cleanPath = newUrlPath.trim().startsWith("/")
      ? newUrlPath.trim()
      : `/${newUrlPath.trim()}`;

    const newEntry = {
      path: cleanPath,
      priority: newUrlPriority,
      changefreq: newUrlFreq,
      lastmod: new Date().toISOString().split("T")[0],
    };

    setSitemapConfig((prev) => ({
      ...prev,
      customUrls: [...(prev.customUrls || []), newEntry],
    }));

    setNewUrlPath("");
    showNotice("success", "تمت إضافة الرابط المخصص! لا تنسَ حفظ التغييرات ثم توليد السايت ماب.");
  };

  const handleDeleteCustomUrl = (index) => {
    setSitemapConfig((prev) => {
      const updated = [...(prev.customUrls || [])];
      updated.splice(index, 1);
      return { ...prev, customUrls: updated };
    });
  };

  // Add custom page to pagesSeo
  const handleCreateCustomPage = (e) => {
    e.preventDefault();
    const cleanKey = newPageForm.key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    if (!cleanKey) {
      showNotice("error", "يرجى إدخال مفتاح الصفحة (ID)");
      return;
    }
    if (pagesSeo[cleanKey]) {
      showNotice("error", "هذا المفتاح مستخدم بالفعل لصفحة أخرى");
      return;
    }

    const cleanPath = newPageForm.path.trim().startsWith("/")
      ? newPageForm.path.trim()
      : `/${newPageForm.path.trim()}`;

    const newPageObj = {
      name: newPageForm.name.trim() || cleanKey,
      path: cleanPath,
      priority: newPageForm.priority || "0.8",
      changefreq: newPageForm.changefreq || "weekly",
      robots: "index, follow",
      ogImage: "",
      isCustom: true,
      ar: {
        title: `${newPageForm.name.trim()} | Thenith`,
        description: `تعرف على صفحة ${newPageForm.name.trim()} في منصة Thenith للبروفايل الرقمي الذكي المتكامل.`,
        keywords: "",
      },
      en: {
        title: `${newPageForm.name.trim()} | Thenith`,
        description: `Explore ${newPageForm.name.trim()} on Thenith all-in-one smart digital profile platform.`,
        keywords: "",
      },
    };

    setPagesSeo((prev) => ({
      ...prev,
      [cleanKey]: newPageObj,
    }));

    setSelectedPageKey(cleanKey);
    setShowAddPageModal(false);
    setNewPageForm({
      key: "",
      name: "",
      path: "",
      priority: "0.8",
      changefreq: "weekly",
    });
    showNotice("success", `تمت إضافة صفحة (${cleanKey}) بنجاح! اضغط حفظ التغييرات.`);
  };

  const handleDeleteCustomPage = (key) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذه الصفحة المخصصة؟")) return;
    setPagesSeo((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setSelectedPageKey("home");
    showNotice("success", "تم حذف الصفحة المخصصة بنجاح.");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Active page helpers
  const currentPage = pagesSeo[selectedPageKey] || {};
  const currentLangData = currentPage[selectedLang] || {};
  const activeTitle =
    currentLangData.title || (selectedLang === "ar" ? currentPage.title : "") || "";
  const activeDesc =
    currentLangData.description || (selectedLang === "ar" ? currentPage.description : "") || "";
  const activeKeywords =
    currentLangData.keywords || (selectedLang === "ar" ? currentPage.keywords : "") || "";

  // Filtered pages for sidebar
  const filteredPages = useMemo(() => {
    const list = Object.entries(pagesSeo);
    if (!pagesSearch.trim()) return list;
    const q = pagesSearch.toLowerCase();
    return list.filter(([key, page]) => {
      const name = (page.name || "").toLowerCase();
      const path = (page.path || "").toLowerCase();
      const arTitle = (page.ar?.title || "").toLowerCase();
      const enTitle = (page.en?.title || "").toLowerCase();
      return (
        key.toLowerCase().includes(q) ||
        name.includes(q) ||
        path.includes(q) ||
        arTitle.includes(q) ||
        enTitle.includes(q)
      );
    });
  }, [pagesSeo, pagesSearch]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {notice && (
        <div
          className={`fixed bottom-6 start-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-bold animate-in slide-in-from-bottom duration-300 ${
            notice.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20"
              : "bg-rose-600 text-white border-rose-500 shadow-rose-500/20"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">
                إدارة السايت ماب والسيو (SEO & Sitemap)
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                تحكم احترافي منفصل باللغتين العربية والإنجليزية لكافة صفحات المنصة وخريطة الموقع
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={handleSaveAll}
            disabled={saving || loading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ كافة التغييرات
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm font-bold">جاري تحميل بيانات السيو والسايت ماب...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Navigation Tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab("pages")}
              className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "pages"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Sliders className="w-4 h-4" />
              عناوين الصفحات والـ Meta ({Object.keys(pagesSeo).length} صفحة)
            </button>

            <button
              onClick={() => setActiveTab("sitemap")}
              className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "sitemap"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <FileCode className="w-4 h-4" />
              خريطة الموقع (Sitemap XML)
            </button>

            <button
              onClick={() => setActiveTab("robots")}
              className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "robots"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Code2 className="w-4 h-4" />
              ملف robots.txt
            </button>

            <button
              onClick={() => setActiveTab("verification")}
              className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "verification"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              أكواد التتبع والتحقق
            </button>
          </div>

          {/* TAB 1: PAGES SEO & LOCALIZATION */}
          {activeTab === "pages" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* SIDEBAR: Pages list */}
              <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-800">
                      قائمة الصفحات ({Object.keys(pagesSeo).length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddPageModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    صفحة مخصصة
                  </button>
                </div>

                {/* Search in pages */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pagesSearch}
                    onChange={(e) => setPagesSearch(e.target.value)}
                    placeholder="ابحث باسم الصفحة أو المسار..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                {/* Pages List */}
                <div className="space-y-1.5 max-h-[620px] overflow-y-auto pe-1">
                  {filteredPages.map(([key, page]) => {
                    const isSelected = selectedPageKey === key;
                    const hasAr = Boolean(page.ar?.title);
                    const hasEn = Boolean(page.en?.title);
                    const isFullyConfigured = hasAr && hasEn;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedPageKey(key)}
                        className={`w-full text-start p-3 rounded-2xl transition-all cursor-pointer border flex flex-col gap-1.5 ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-300 text-indigo-950 shadow-xs"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold truncate max-w-[190px]">
                            {page.name || key}
                          </span>
                          <div className="flex items-center gap-1">
                            {page.isCustom && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                مخصص
                              </span>
                            )}
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isFullyConfigured
                                  ? "bg-emerald-500"
                                  : "bg-amber-400"
                              }`}
                              title={
                                isFullyConfigured
                                  ? "مكتمل باللغتين العربية والإنجليزية"
                                  : "يحتاج لمراجعة إحدى اللغات"
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono" dir="ltr">
                          <span className="truncate max-w-[160px]">{page.path}</span>
                          <span className="text-[10px] text-slate-500 font-sans font-bold">
                            {page.priority || "0.8"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {filteredPages.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400">
                      لا توجد صفحات مطابقة للبحث
                    </div>
                  )}
                </div>
              </div>

              {/* MAIN FORM: Page Settings */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                  {/* Page Title & Status Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-800">
                          {currentPage.name || selectedPageKey}
                        </h2>
                        {currentPage.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomPage(selectedPageKey)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                            title="حذف هذه الصفحة المخصصة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono mt-0.5 block" dir="ltr">
                        المسار: {currentPage.path}
                      </span>
                    </div>

                    {/* Quick Smart Suggestion Button */}
                    <button
                      type="button"
                      onClick={handleApplySmartSuggestion}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 text-xs font-bold border border-indigo-200/60 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto hover:shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      استعادة النص المقترح الذكي ({selectedLang === "ar" ? "العربية" : "English"})
                    </button>
                  </div>

                  {/* PROMINENT LANGUAGE SWITCHER (Arabic vs English) */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">
                        لغة تحرير السيو وعناوين التابات (Language Mode):
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {selectedLang === "ar"
                          ? "أنت الآن تعدل النسخة العربية النقية التي تظهر عند تصفح الموقع بالعربية"
                          : "You are currently editing the pure English version shown when browsing in English"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedLang("ar")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          selectedLang === "ar"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span>🇪🇬</span>
                        <span>النسخة العربية (AR)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedLang("en")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          selectedLang === "en"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span>🇬🇧</span>
                        <span>English Version (EN)</span>
                      </button>
                    </div>
                  </div>

                  {/* REALISTIC BROWSER TAB MOCKUP */}
                  <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200/80">
                    <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-slate-400" />
                        معاينة لسان المتصفح المباشر (Browser Tab Preview):
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedLang === "ar" ? "اللغة الحالية: العربية (نقية)" : "Current: English (Pure)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="bg-white px-3.5 py-1.5 rounded-t-xl border-t border-x border-slate-200 shadow-2xs flex items-center gap-2 max-w-md w-full text-xs font-semibold text-slate-800"
                        dir={selectedLang === "ar" ? "rtl" : "ltr"}
                      >
                        <img
                          src="/favicon.svg"
                          alt="favicon"
                          className="w-3.5 h-3.5 shrink-0"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <span className="truncate text-xs font-medium">
                          {activeTitle ||
                            (selectedLang === "ar"
                              ? "عنوان الصفحة في لسان المتصفح..."
                              : "Page title in browser tab...")}
                        </span>
                        <span className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer ms-auto ps-1 shrink-0">
                          ×
                        </span>
                      </div>
                      <div className="h-4 w-4 rounded-full bg-slate-200/70 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                        +
                      </div>
                    </div>
                  </div>

                  {/* FORM INPUTS */}
                  <div className="space-y-4">
                    {/* Page Title */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span>
                            {selectedLang === "ar"
                              ? "عنوان الصفحة في التاب ومحركات البحث (Title Tag - بالعربية)"
                              : "Page / Tab Title (Title Tag - in English)"}
                          </span>
                        </label>
                        <span
                          className={`text-[11px] font-bold ${
                            activeTitle.length >= 40 && activeTitle.length <= 65
                              ? "text-emerald-600"
                              : activeTitle.length > 65
                              ? "text-rose-600"
                              : "text-slate-400"
                          }`}
                        >
                          {activeTitle.length} حرف{" "}
                          {activeTitle.length > 65 ? "(قد يتم اقتطاعه في جوجل)" : ""}
                        </span>
                      </div>

                      <input
                        type="text"
                        value={activeTitle}
                        onChange={(e) => handleLocalizedFieldChange("title", e.target.value)}
                        placeholder={
                          selectedLang === "ar"
                            ? "أدخل عنوان الصفحة بالعربية..."
                            : "Enter page title in English..."
                        }
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                        dir={selectedLang === "ar" ? "rtl" : "ltr"}
                      />
                      <p className="text-[11px] text-slate-400">
                        {selectedLang === "ar"
                          ? "سيظهر هذا العنوان في لسان المتصفح (Tab Title) وفي جوجل عندما يتصفح المستخدم الموقع باللغة العربية."
                          : "This title appears on the browser tab and in Google when browsing in English."}
                      </p>
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          {selectedLang === "ar"
                            ? "الوصف التعريفي (Meta Description - بالعربية)"
                            : "Meta Description (in English)"}
                        </label>
                        <span
                          className={`text-[11px] font-bold ${
                            activeDesc.length >= 120 && activeDesc.length <= 165
                              ? "text-emerald-600"
                              : activeDesc.length > 165
                              ? "text-amber-600"
                              : "text-slate-400"
                          }`}
                        >
                          {activeDesc.length} / 160 حرف
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={activeDesc}
                        onChange={(e) =>
                          handleLocalizedFieldChange("description", e.target.value)
                        }
                        placeholder={
                          selectedLang === "ar"
                            ? "اكتب وصفاً جذاباً وموجزاً يصف محتوى الصفحة ويشجع الزوار على النقر..."
                            : "Write a compelling meta description summarizing this page for search results..."
                        }
                        className="w-full border border-slate-200 rounded-xl p-3.5 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                        dir={selectedLang === "ar" ? "rtl" : "ltr"}
                      />
                    </div>

                    {/* Meta Keywords */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        {selectedLang === "ar"
                          ? "الكلمات المفتاحية (Meta Keywords - مفصولة بفواصل)"
                          : "Meta Keywords (Comma separated)"}
                      </label>
                      <input
                        type="text"
                        value={activeKeywords}
                        onChange={(e) => handleLocalizedFieldChange("keywords", e.target.value)}
                        placeholder={
                          selectedLang === "ar"
                            ? "بروفايل رقمي, هوية رقمية, بورتفوليو, كارت NFC..."
                            : "digital profile, link in bio, portfolio, nfc smart card..."
                        }
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                        dir={selectedLang === "ar" ? "rtl" : "ltr"}
                      />
                    </div>

                    {/* Shared Page Settings: Robots, OG Image, Priority, Changefreq */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                        إعدادات الفهرسة والوسائط المشتركة
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Robots Directive */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            أوامر الفهرسة (Robots Directive)
                          </label>
                          <select
                            value={currentPage.robots || "index, follow"}
                            onChange={(e) => handleSharedFieldChange("robots", e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
                          >
                            <option value="index, follow">index, follow (فهرسة ومتابعة الروابط)</option>
                            <option value="noindex, follow">noindex, follow (عدم الفهرسة ومتابعة الروابط)</option>
                            <option value="noindex, nofollow">noindex, nofollow (حجب تام عن محركات البحث)</option>
                          </select>
                        </div>

                        {/* OG Image URL */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            صورة المشاركة المخصصة (OG Image URL)
                          </label>
                          <input
                            type="url"
                            value={currentPage.ogImage || ""}
                            onChange={(e) => handleSharedFieldChange("ogImage", e.target.value)}
                            placeholder="https://example.com/cover.jpg"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            dir="ltr"
                          />
                        </div>

                        {/* Priority in Sitemap */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            أولوية الصفحة في السايت ماب (Priority)
                          </label>
                          <select
                            value={currentPage.priority || "0.8"}
                            onChange={(e) => handleSharedFieldChange("priority", e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
                          >
                            <option value="1.0">1.0 (أعلى أولوية - مثل الرئيسية)</option>
                            <option value="0.9">0.9 (أولوية مرتفعة - مثل المتجر)</option>
                            <option value="0.8">0.8 (أولوية قياسية - مثل الباقات)</option>
                            <option value="0.7">0.7</option>
                            <option value="0.5">0.5</option>
                            <option value="0.3">0.3</option>
                            <option value="0.1">0.1 (أقل أولوية - مثل 404)</option>
                          </select>
                        </div>

                        {/* Change Frequency in Sitemap */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            معدل التحديث في السايت ماب (Changefreq)
                          </label>
                          <select
                            value={currentPage.changefreq || "weekly"}
                            onChange={(e) =>
                              handleSharedFieldChange("changefreq", e.target.value)
                            }
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
                          >
                            <option value="always">always (مستمر دائماً)</option>
                            <option value="hourly">hourly (كل ساعة)</option>
                            <option value="daily">daily (يومي)</option>
                            <option value="weekly">weekly (أسبوعي)</option>
                            <option value="monthly">monthly (شهري)</option>
                            <option value="yearly">yearly (سنوي)</option>
                            <option value="never">never (أبداً)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LIVE PREVIEW SIMULATOR (Google & Social Cards) */}
                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-indigo-600" />
                        محاكي المعاينة الحية في جوجل ومواقع التواصل:
                      </h4>

                      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("desktop")}
                          className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            previewDevice === "desktop"
                              ? "bg-white text-indigo-600 shadow-2xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                          title="عرض سطح المكتب"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("mobile")}
                          className={`p-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            previewDevice === "mobile"
                              ? "bg-white text-indigo-600 shadow-2xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                          title="عرض الهاتف"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Google Search Snippet */}
                    <div
                      className={`p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5 ${
                        previewDevice === "mobile" ? "max-w-md mx-auto" : ""
                      }`}
                      dir={selectedLang === "ar" ? "rtl" : "ltr"}
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                          G
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-800 leading-none">
                            Thenith
                          </p>
                          <span
                            className="font-mono text-[10px] text-emerald-700 block leading-tight"
                            dir="ltr"
                          >
                            https://thenith.com{currentPage.path}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-base font-semibold text-[#1a0dab] hover:underline cursor-pointer leading-tight pt-1">
                        {activeTitle ||
                          (selectedLang === "ar"
                            ? "عنوان الصفحة في نتائج بحث جوجل"
                            : "Page Title in Google Search")}
                      </h4>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {activeDesc ||
                          (selectedLang === "ar"
                            ? "الوصف التعريفي للصفحة كما سيظهر لمستخدمي جوجل ومحركات البحث..."
                            : "The meta description of the page as it will appear on search results...")}
                      </p>
                    </div>

                    {/* Social Media Share Card */}
                    <div
                      className={`max-w-md border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-2xs ${
                        previewDevice === "mobile" ? "mx-auto" : ""
                      }`}
                      dir={selectedLang === "ar" ? "rtl" : "ltr"}
                    >
                      {currentPage.ogImage ? (
                        <img
                          src={currentPage.ogImage}
                          alt="Cover"
                          className="w-full h-36 object-cover bg-slate-200"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gradient-to-r from-indigo-900 to-slate-900 flex items-center justify-center text-white/60 text-xs font-bold gap-2">
                          <Globe className="w-4 h-4" />
                          <span>
                            {selectedLang === "ar"
                              ? "صورة المشاركة الافتراضية"
                              : "Default Share Image"}
                          </span>
                        </div>
                      )}
                      <div className="p-3 bg-white">
                        <span
                          className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block mb-1"
                          dir="ltr"
                        >
                          THENITH.COM
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 truncate">
                          {activeTitle || "Thenith"}
                        </h5>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {activeDesc ||
                            (selectedLang === "ar"
                              ? "وصف المشاركة على وسائل التواصل الاجتماعي"
                              : "Social media share card description")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SITEMAP XML */}
          {activeTab === "sitemap" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                      <FileCode className="w-5 h-5 text-indigo-600" />
                      خريطة الموقع الحالية (Sitemap XML)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      ملف XML قياسي متوافق مع معايير Google, Bing, ومحركات البحث الذكية
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href="/sitemap.xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      فتح sitemap.xml
                    </a>

                    <button
                      onClick={handleRegenerateSitemap}
                      disabled={regenerating}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
                      {regenerating ? "جاري التوليد..." : "إعادة توليد السايت ماب الآن"}
                    </button>
                  </div>
                </div>

                {/* Sitemap Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      إجمالي الروابط المفهرسة
                    </span>
                    <span className="text-2xl font-black text-slate-800 mt-1 block">
                      {sitemapUrls.length} رابط
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      آخر تحديث وتوليد
                    </span>
                    <span className="text-xs font-bold text-slate-700 mt-2 block font-mono">
                      {sitemapConfig.lastGenerated
                        ? new Date(sitemapConfig.lastGenerated).toLocaleString("ar-EG-u-nu-latn")
                        : "تم التوليد في البناء الأخير"}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      تضمين منتجات المتجر
                    </span>
                    <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sitemapConfig.includeProducts !== false}
                        onChange={(e) =>
                          setSitemapConfig((prev) => ({
                            ...prev,
                            includeProducts: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">تضمين المنتجات تلقائياً</span>
                    </label>
                  </div>
                </div>

                {/* Add Custom URL Form */}
                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    إضافة رابط مخصص إلى السايت ماب (Custom URL)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">المسار (Path)</label>
                      <input
                        type="text"
                        value={newUrlPath}
                        onChange={(e) => setNewUrlPath(e.target.value)}
                        placeholder="/custom-page أو /special-offer"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                        dir="ltr"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">الأولوية (Priority)</label>
                      <select
                        value={newUrlPriority}
                        onChange={(e) => setNewUrlPriority(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      >
                        <option value="1.0">1.0 (أعلى شيء)</option>
                        <option value="0.9">0.9</option>
                        <option value="0.8">0.8</option>
                        <option value="0.7">0.7</option>
                        <option value="0.5">0.5</option>
                        <option value="0.3">0.3</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">التحديث (Freq)</label>
                      <select
                        value={newUrlFreq}
                        onChange={(e) => setNewUrlFreq(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      >
                        <option value="daily">daily (يومي)</option>
                        <option value="weekly">weekly (أسبوعي)</option>
                        <option value="monthly">monthly (شهري)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddCustomUrl}
                        className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        إضافة
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom URLs list */}
                {sitemapConfig.customUrls && sitemapConfig.customUrls.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-700">الروابط المخصصة المضافة:</h5>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                      {sitemapConfig.customUrls.map((u, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 text-xs"
                        >
                          <span className="font-mono text-indigo-600 font-bold" dir="ltr">
                            {u.path}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500 font-mono">
                              Priority: {u.priority} | Freq: {u.changefreq}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomUrl(i)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* URLs Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700">
                    قائمة الروابط المفهرسة في ملف السايت ماب ({sitemapUrls.length} رابط):
                  </h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-start text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-start">الرابط (URL Location)</th>
                          <th className="p-3 text-center">الأولوية</th>
                          <th className="p-3 text-center">معدل التحديث</th>
                          <th className="p-3 text-center">آخر تعديل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {sitemapUrls.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 font-mono text-indigo-600 font-bold" dir="ltr">
                              {item.loc}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px]">
                                {item.priority}
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-500 font-mono text-[11px]">
                              {item.changefreq}
                            </td>
                            <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                              {item.lastmod || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Raw XML Viewer */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-slate-400" />
                      الكود الخام لملف sitemap.xml
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sitemapXmlRaw)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "تم النسخ!" : "نسخ الكود"}
                    </button>
                  </div>
                  <pre
                    className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60"
                    dir="ltr"
                  >
                    {sitemapXmlRaw || "<!-- لا يوجد كود خريطة موقع حالي -->"}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROBOTS.TXT */}
          {activeTab === "robots" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                    <Code2 className="w-5 h-5 text-indigo-600" />
                    محرر ملف robots.txt
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    توجيه محركات البحث (Googlebot, Bingbot...) إلى المسارات المسموح والمحظور فهرستها
                  </p>
                </div>

                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  معاينة robots.txt الحالي
                </a>
              </div>

              {/* Quick Template Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 me-2">قوالب جاهزة:</span>
                <button
                  type="button"
                  onClick={() =>
                    setRobotsTxt(
                      `# Standard robots.txt for Thenith\nUser-agent: *\nAllow: /\nDisallow: /u/\nDisallow: /panel/\nDisallow: /login\nDisallow: /signup\nDisallow: /cart\nDisallow: /payment/\n\nSitemap: https://thenith.com/sitemap.xml`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  القالب الموصى به للمنصة
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRobotsTxt(
                      `User-agent: *\nAllow: /\n\nSitemap: https://thenith.com/sitemap.xml`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  السماح للكل (Allow All)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRobotsTxt(
                      `# Block AI Crawlers & Scrapers\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /\n\nUser-agent: anthropic-ai\nDisallow: /\n\nUser-agent: Claude-Web\nDisallow: /\n\nUser-agent: *\nAllow: /\nDisallow: /panel/\nDisallow: /cart\n\nSitemap: https://thenith.com/sitemap.xml`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  حجب روبوتات الذكاء الاصطناعي (Block AI Scrapers)
                </button>
              </div>

              {/* Textarea Editor */}
              <div className="space-y-1.5">
                <textarea
                  rows={14}
                  value={robotsTxt}
                  onChange={(e) => setRobotsTxt(e.target.value)}
                  className="w-full p-4 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none"
                  dir="ltr"
                  placeholder="# User-agent: *&#10;Allow: /"
                />
                <p className="text-[11px] text-slate-400">
                  يتم حفظ التعديلات مباشرة في ملف{" "}
                  <code className="text-indigo-600 font-bold">/robots.txt</code> في الموقع عند الضغط
                  على حفظ التغييرات.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: VERIFICATION & TRACKING */}
          {activeTab === "verification" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  أكواد إثبات الملكية والتتبع (Search Console & Verification)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  ربط المنصة بأدوات مشرفي المواقع في Google و Microsoft لإثبات الملكية وتحليل حركة الزوار
                </p>
              </div>

              <div className="space-y-5">
                {/* Google Site Verification */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                      G
                    </span>
                    رمز إثبات ملكية Google Search Console (Verification Token)
                  </label>
                  <input
                    type="text"
                    value={verification.googleSiteVerification || ""}
                    onChange={(e) =>
                      setVerification((prev) => ({
                        ...prev,
                        googleSiteVerification: e.target.value,
                      }))
                    }
                    placeholder="مثال: google-site-verification=abc123xyz... أو رمز التحقق فقط"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    dir="ltr"
                  />
                  <p className="text-[11px] text-slate-400">
                    يتم تضمين كود{" "}
                    <code className="text-indigo-600 font-bold">
                      &lt;meta name="google-site-verification" content="..."&gt;
                    </code>{" "}
                    تلقائياً في رأس كل صفحات الموقع.
                  </p>
                </div>


                {/* Google Analytics GA4 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">
                      GA
                    </span>
                    معرف جوجل أناليتكس (Google Analytics GA4 Measurement ID)
                  </label>
                  <input
                    type="text"
                    value={verification.googleAnalyticsId || ""}
                    onChange={(e) =>
                      setVerification((prev) => ({
                        ...prev,
                        googleAnalyticsId: e.target.value,
                      }))
                    }
                    placeholder="مثال: G-XXXXXXXXXX"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    dir="ltr"
                  />
                </div>

                {/* Bing Webmaster Verification */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px]">
                      B
                    </span>
                    رمز إثبات ملكية Bing Webmaster Tools
                  </label>
                  <input
                    type="text"
                    value={verification.bingVerification || ""}
                    onChange={(e) =>
                      setVerification((prev) => ({
                        ...prev,
                        bingVerification: e.target.value,
                      }))
                    }
                    placeholder="رمز التحقق الخاص بـ Bing"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ كافة التغييرات
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM PAGE */}
      {showAddPageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                إضافة صفحة مخصصة جديدة
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPageModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomPage} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">
                  مفتاح الصفحة البرمجي (Page ID)
                </label>
                <input
                  type="text"
                  required
                  value={newPageForm.key}
                  onChange={(e) =>
                    setNewPageForm((prev) => ({ ...prev, key: e.target.value }))
                  }
                  placeholder="terms أو privacy أو about"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">اسم الصفحة</label>
                <input
                  type="text"
                  required
                  value={newPageForm.name}
                  onChange={(e) =>
                    setNewPageForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="مثال: الشروط والأحكام"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">
                  المسار (Route Path)
                </label>
                <input
                  type="text"
                  required
                  value={newPageForm.path}
                  onChange={(e) =>
                    setNewPageForm((prev) => ({ ...prev, path: e.target.value }))
                  }
                  placeholder="/terms أو /privacy"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">الأولوية</label>
                  <select
                    value={newPageForm.priority}
                    onChange={(e) =>
                      setNewPageForm((prev) => ({ ...prev, priority: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-white"
                  >
                    <option value="1.0">1.0</option>
                    <option value="0.9">0.9</option>
                    <option value="0.8">0.8</option>
                    <option value="0.5">0.5</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">التحديث</label>
                  <select
                    value={newPageForm.changefreq}
                    onChange={(e) =>
                      setNewPageForm((prev) => ({ ...prev, changefreq: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-white"
                  >
                    <option value="daily">daily</option>
                    <option value="weekly">weekly</option>
                    <option value="monthly">monthly</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPageModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  إنشاء الصفحة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
