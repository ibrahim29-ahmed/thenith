import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Smartphone,
  Receipt,
  Truck,
  Send,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  ShieldCheck,
  Sliders,
  DollarSign,
  HelpCircle,
  Eye,
  Megaphone,
  Layers,
  Sparkles,
  ChevronDown,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import {
  fetchPaymentMethods,
  updatePaymentMethods,
  togglePaymentMethod,
  createCustomPaymentMethod,
  deleteCustomPaymentMethod,
  syncFawaterakPaymentMethods,
  resetPaymentMethodsToDefault,
  uploadAdminImage,
} from "../services/adminApi.js";

const ICON_MAP = {
  CreditCard: CreditCard,
  Smartphone: Smartphone,
  Receipt: Receipt,
  Truck: Truck,
  Send: Send,
  Wallet: Wallet,
};

export default function PaymentMethodsManager() {
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({
    cod_enabled: true,
    test_mode: false,
    announcement_banner: "",
    announcement_enabled: false,
    currency: "EGP",
    currency_symbol_ar: "ج.م",
    currency_symbol_en: "EGP",
    min_order_amount: 1,
    max_order_amount: 50000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "online" | "manual" | "offline" | "active"
  const [actionLoading, setActionLoading] = useState(null); // method id or string
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [message, setMessage] = useState(null);

  // Edit / Add Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [isNewMethod, setIsNewMethod] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Global Settings Drawer
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    name_ar: "",
    name_en: "",
    type: "online",
    description_ar: "",
    description_en: "",
    instructions_ar: "",
    instructions_en: "",
    account_details: "",
    logo: "",
    icon: "CreditCard",
    badge: "",
    commission_on_customer: 0,
    fixed_fee: 0,
    allow_for_subscriptions: true,
    allow_for_store_orders: true,
    sort_order: 1,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchPaymentMethods();
      if (res && res.methods) {
        setMethods(res.methods);
        if (res.globalSettings) {
          setGlobalSettings(res.globalSettings);
        }
      }
    } catch (err) {
      showNotice("error", "فشل تحميل طرق الدفع من الخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotice = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Quick Toggle Active Status
  const handleToggle = async (method) => {
    const targetId = method.id || method.payment_method_id;
    const willBeEnabled = !method.enabled;
    try {
      setActionLoading(targetId);
      // Optimistic update
      setMethods((prev) =>
        prev.map((m) =>
          (m.id === targetId || m.payment_method_id === targetId)
            ? { ...m, enabled: willBeEnabled }
            : m
        )
      );

      if (targetId === "cash_on_delivery") {
        setGlobalSettings((prev) => ({
          ...prev,
          cod_enabled: willBeEnabled,
        }));
      }

      const res = await togglePaymentMethod(targetId);
      if (res && res.methods) {
        setMethods(res.methods);
        if (res.globalSettings) setGlobalSettings(res.globalSettings);
      }
      showNotice(
        "success",
        `تم ${willBeEnabled ? "تفعيل" : "تعطيل"} طريقة "${method.name_ar}" بنجاح`
      );
    } catch (err) {
      // Revert on error
      loadData();
      showNotice("error", "حدث خطأ أثناء تعديل حالة طريقة الدفع");
    } finally {
      setActionLoading(null);
    }
  };

  // Dedicated Toggle for COD (used across cards and global drawer)
  const handleToggleCodDirect = async () => {
    const codMethod = methods.find((m) => m.id === "cash_on_delivery");
    if (codMethod) {
      await handleToggle(codMethod);
    } else {
      const willBe = !globalSettings.cod_enabled;
      setGlobalSettings((prev) => ({ ...prev, cod_enabled: willBe }));
      try {
        setActionLoading("cash_on_delivery");
        const res = await togglePaymentMethod("cash_on_delivery");
        if (res?.methods) setMethods(res.methods);
        if (res?.globalSettings) setGlobalSettings(res.globalSettings);
        showNotice("success", `تم ${willBe ? "تفعيل" : "تعطيل"} الدفع عند الاستلام (COD) بنجاح`);
      } catch (err) {
        showNotice("error", "فشل تغيير حالة الدفع عند الاستلام");
        loadData();
      } finally {
        setActionLoading(null);
      }
    }
  };

  // Sync Fawaterak Gateway
  const handleSyncFawaterak = async () => {
    try {
      setActionLoading("sync");
      const res = await syncFawaterakPaymentMethods();
      if (res && res.methods) {
        setMethods(res.methods);
      }
      showNotice("success", res?.message || "تمت مزامنة بوابات فواتيرك بنجاح");
    } catch (err) {
      showNotice("error", "فشلت المزامنة مع بوابة فواتيرك");
    } finally {
      setActionLoading(null);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (!window.confirm("هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية لطرق الدفع؟")) {
      return;
    }
    try {
      setActionLoading("reset");
      const res = await resetPaymentMethodsToDefault();
      if (res && res.methods) {
        setMethods(res.methods);
        if (res.globalSettings) setGlobalSettings(res.globalSettings);
      }
      showNotice("success", "تمت استعادة الإعدادات الافتراضية بنجاح");
    } catch (err) {
      showNotice("error", "فشلت استعادة الإعدادات الافتراضية");
    } finally {
      setActionLoading(null);
    }
  };

  // Open Edit Modal
  const openEdit = (method) => {
    setIsNewMethod(false);
    setEditingMethod(method);
    setFormData({
      id: method.id,
      enabled: method.enabled !== false,
      name_ar: method.name_ar || "",
      name_en: method.name_en || "",
      type: method.type || "online",
      description_ar: method.description_ar || "",
      description_en: method.description_en || "",
      instructions_ar: method.instructions_ar || "",
      instructions_en: method.instructions_en || "",
      account_details: method.account_details || "",
      logo: method.logo || "",
      icon: method.icon || "CreditCard",
      badge: method.badge || "",
      commission_on_customer: method.commission_on_customer || 0,
      fixed_fee: method.fixed_fee || 0,
      allow_for_subscriptions: method.allow_for_subscriptions !== false,
      allow_for_store_orders: method.allow_for_store_orders !== false,
      sort_order: method.sort_order || 1,
    });
    setEditModalOpen(true);
  };

  // Open Add Modal
  const openAdd = () => {
    setIsNewMethod(true);
    setEditingMethod(null);
    setFormData({
      id: `custom_${Date.now()}`,
      enabled: true,
      name_ar: "",
      name_en: "",
      type: "manual",
      description_ar: "",
      description_en: "",
      instructions_ar: "",
      instructions_en: "",
      account_details: "",
      logo: "",
      icon: "Wallet",
      badge: "يدوي",
      commission_on_customer: 0,
      fixed_fee: 0,
      allow_for_subscriptions: true,
      allow_for_store_orders: true,
      sort_order: methods.length + 1,
    });
    setEditModalOpen(true);
  };

  // Handle Logo Upload (Upload file or DataURL fallback)
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)");
      return;
    }

    try {
      setUploadingLogo(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const res = await uploadAdminImage(reader.result, "payment_methods");
          const uploadedUrl = res?.url || reader.result;
          setFormData((prev) => ({ ...prev, logo: uploadedUrl }));
          showNotice("success", "تم رفع صورة الشعار بنجاح");
        } catch (err) {
          setFormData((prev) => ({ ...prev, logo: reader.result }));
          showNotice("success", "تم تعيين اللوجو بنجاح");
        } finally {
          setUploadingLogo(false);
        }
      };
    } catch (err) {
      setUploadingLogo(false);
      showNotice("error", "فشل قراءة ملف الصورة");
    }
  };

  // Save Modal Changes
  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formData.name_ar.trim()) {
      alert("يرجى كتابة اسم طريقة الدفع بالعربية");
      return;
    }

    try {
      setActionLoading("saveModal");
      if (isNewMethod) {
        const res = await createCustomPaymentMethod(formData);
        if (res && res.methods) setMethods(res.methods);
        showNotice("success", "تمت إضافة طريقة الدفع الجديدة بنجاح");
      } else {
        const updatedList = methods.map((m) =>
          m.id === formData.id ? { ...m, ...formData } : m
        );
        let updatedGlobal = { ...globalSettings };
        if (formData.id === "cash_on_delivery") {
          updatedGlobal.cod_enabled = Boolean(formData.enabled);
        }
        const res = await updatePaymentMethods({
          methods: updatedList,
          globalSettings: updatedGlobal,
        });
        if (res && res.data) {
          setMethods(res.data.methods || updatedList);
          if (res.data.globalSettings) {
            setGlobalSettings(res.data.globalSettings);
          }
        }
        showNotice("success", "تم حفظ تعديلات طريقة الدفع بنجاح");
      }
      setEditModalOpen(false);
    } catch (err) {
      showNotice("error", "فشل حفظ بيانات طريقة الدفع");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Custom Method
  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف طريقة الدفع "${name}"؟`)) return;
    try {
      setActionLoading(id);
      const res = await deleteCustomPaymentMethod(id);
      if (res && res.methods) setMethods(res.methods);
      showNotice("success", "تم حذف طريقة الدفع بنجاح");
    } catch (err) {
      showNotice("error", err?.response?.data?.error || "فشل حذف طريقة الدفع");
    } finally {
      setActionLoading(null);
    }
  };

  // Save Global Settings
  const handleSaveGlobalSettings = async () => {
    try {
      setSavingGlobal(true);
      const syncedMethods = methods.map((m) =>
        m.id === "cash_on_delivery"
          ? { ...m, enabled: Boolean(globalSettings.cod_enabled) }
          : m
      );
      const res = await updatePaymentMethods({
        methods: syncedMethods,
        globalSettings,
      });
      if (res && res.data) {
        if (res.data.methods) setMethods(res.data.methods);
        if (res.data.globalSettings) setGlobalSettings(res.data.globalSettings);
      }
      showNotice("success", "تم حفظ الإعدادات العامة للمدفوعات بنجاح");
    } catch (err) {
      showNotice("error", "فشل حفظ الإعدادات العامة");
    } finally {
      setSavingGlobal(false);
    }
  };

  // Filtered methods
  const filteredMethods = useMemo(() => {
    return methods.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (m.name_ar && m.name_ar.toLowerCase().includes(q)) ||
        (m.name_en && m.name_en.toLowerCase().includes(q)) ||
        (m.description_ar && m.description_ar.toLowerCase().includes(q)) ||
        (m.id && m.id.toLowerCase().includes(q));

      if (!matchQuery) return false;

      if (filterType === "online") return m.type === "online";
      if (filterType === "manual") return m.type === "manual";
      if (filterType === "offline") return m.type === "offline";
      if (filterType === "active") return Boolean(m.enabled);

      return true;
    });
  }, [methods, searchQuery, filterType]);

  const activeCount = methods.filter((m) => m.enabled).length;
  const inactiveCount = methods.length - activeCount;
  const isCodActive = Boolean(
    globalSettings.cod_enabled &&
      methods.find((m) => m.id === "cash_on_delivery")?.enabled
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Toast Notice */}
      {message && (
        <div
          className={`fixed bottom-6 start-6 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-bold animate-in slide-in-from-bottom duration-300 ${
            message.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20"
              : "bg-rose-600 text-white border-rose-500 shadow-rose-500/20"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-600/10 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">
                التحكم في طرق الدفع والتسوية
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                تفعيل وإلغاء بوابات الدفع الإلكترونية، المحافظ الذكية، الدفع عند الاستلام، والتحويلات اليدوية
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              showPreview
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Eye className="w-4 h-4" />
            معاينة كعميل
          </button>

          <button
            onClick={() => setShowGlobalSettings(!showGlobalSettings)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              showGlobalSettings
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Sliders className="w-4 h-4" />
            الإعدادات العامة
          </button>

          <button
            onClick={handleSyncFawaterak}
            disabled={actionLoading === "sync"}
            className="px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70 text-xs font-bold transition-colors flex items-center gap-1.5"
            title="فحص بوابات فواتيرك وتحديث الشعارات والربط المباشر"
          >
            <RefreshCw
              className={`w-4 h-4 ${actionLoading === "sync" ? "animate-spin" : ""}`}
            />
            مزامنة فواتيرك
          </button>

          <button
            onClick={openAdd}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            إضافة طريقة دفع
          </button>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إجمالي الطرق</span>
            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">
              {methods.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">طريقة مسجلة</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm bg-gradient-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600">طرق الدفع المفعلة</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {activeCount}
            </span>
            <span className="text-xs text-emerald-600 font-medium">متاحة للمستخدمين</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">الطرق المعطلة</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-700">
              {inactiveCount}
            </span>
            <span className="text-xs text-rose-500 font-medium">محجوبة حالياً</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">الدفع عند الاستلام (COD)</span>
            <span
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isCodActive ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
              }`}
            >
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span
              className={`text-base font-black ${
                isCodActive ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              {isCodActive ? "مفعل ومتاح" : "معطل ومحجوب"}
            </span>
            <button
              type="button"
              onClick={handleToggleCodDirect}
              disabled={Boolean(actionLoading) && actionLoading === "cash_on_delivery"}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs active:scale-95 ${
                isCodActive
                  ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
              } ${Boolean(actionLoading) && actionLoading === "cash_on_delivery" ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
            >
              {Boolean(actionLoading) && actionLoading === "cash_on_delivery" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التحديث...</span>
                </>
              ) : isCodActive ? (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  تعطيل
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تفعيل
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* GLOBAL SETTINGS PANEL (COLLAPSIBLE) */}
      {showGlobalSettings && (
        <div className="bg-white rounded-2xl border-2 border-indigo-100 p-6 shadow-sm space-y-6 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-800">
                الإعدادات العامة لمنظومة المدفوعات
              </h2>
            </div>
            <button
              onClick={() => setShowGlobalSettings(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* COD Global Toggle */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  الدفع عند الاستلام (COD)
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${isCodActive ? "text-emerald-600" : "text-slate-400"}`}>
                    {isCodActive ? "مفعل" : "معطل"}
                  </span>
                  <button
                    type="button"
                    dir="ltr"
                    onClick={handleToggleCodDirect}
                    disabled={Boolean(actionLoading) && actionLoading === "cash_on_delivery"}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isCodActive ? "bg-emerald-500" : "bg-slate-300"
                    } ${Boolean(actionLoading) && actionLoading === "cash_on_delivery" ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                    title={isCodActive ? "تعطيل الدفع عند الاستلام" : "تفعيل الدفع عند الاستلام"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isCodActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                تفعيل أو تعطيل خيار الدفع نقداً عند استلام الشحنة لجميع منتجات المتجر الفيزيائية والكروت الذكية.
              </p>
            </div>

            {/* Announcement Banner */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 col-span-1 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-indigo-600" />
                  تنويه يظهر بأعلى صفحة الدفع للعملاء
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(globalSettings.announcement_enabled)}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        announcement_enabled: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-600">
                    تفعيل التنويه
                  </span>
                </label>
              </div>
              <input
                type="text"
                placeholder="مثال: يرجى العلم أن الدفع عبر المحافظ الإلكترونية يعمل بكفاءة لحظية..."
                value={globalSettings.announcement_banner || ""}
                onChange={(e) =>
                  setGlobalSettings({
                    ...globalSettings,
                    announcement_banner: e.target.value,
                  })
                }
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={handleSaveGlobalSettings}
              disabled={savingGlobal}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              {savingGlobal ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              حفظ الإعدادات العامة
            </button>
          </div>
        </div>
      )}

      {/* LIVE CHECKOUT PREVIEW (COLLAPSIBLE) */}
      {showPreview && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-sm">
                معاينة حية: كيف ستظهر طرق الدفع للعميل في صفحة الدفع (/payment)
              </h3>
            </div>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
              معاينة فورية
            </span>
          </div>

          <div className="max-w-xl mx-auto bg-slate-950 p-6 rounded-2xl border border-white/10 space-y-4">
            <p className="text-xs text-slate-400 font-bold mb-2">اختر طريقة الدفع</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {methods
                .filter((m) => m.enabled)
                .map((m) => {
                  const IconComp = ICON_MAP[m.icon] || CreditCard;
                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-indigo-500 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all"
                    >
                      {m.logo ? (
                        <img
                          src={m.logo}
                          alt={m.name_ar}
                          className="h-7 max-w-[80px] object-contain"
                        />
                      ) : (
                        <IconComp className="w-6 h-6 text-indigo-400" />
                      )}
                      <span className="text-xs font-bold text-white leading-tight">
                        {m.name_ar}
                      </span>
                      {m.badge && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                          {m.badge}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم طريقة الدفع أو المعرف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "الكل" },
            { id: "active", label: "المفعلة فقط" },
            { id: "online", label: "بوابات فواتيرك" },
            { id: "manual", label: "تحويل يدوي / إنستاباي" },
            { id: "offline", label: "عند الاستلام" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterType === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* PAYMENT METHODS LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm font-bold">
            جاري تحميل طرق الدفع وإعدادات البوابات...
          </p>
        </div>
      ) : filteredMethods.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <CreditCard className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-700">
            لم يتم العثور على أي طرق دفع مطابقة
          </h3>
          <p className="text-xs text-slate-400">
            جرب تغيير معايير البحث أو الفلتر أعلاه، أو اضغط على استعادة الإعدادات الافتراضية
          </p>
          <button
            onClick={handleResetDefaults}
            className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            استعادة الطرق الافتراضية
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMethods.map((method) => {
            const IconComponent = ICON_MAP[method.icon] || CreditCard;
            const isToggling =
              Boolean(actionLoading) &&
              (String(actionLoading) === String(method.id) ||
                (method.payment_method_id != null &&
                  String(actionLoading) === String(method.payment_method_id)));
            const isSystemMethod = [
              "card",
              "wallet",
              "fawry",
              "cash_on_delivery",
            ].includes(method.id);

            return (
              <div
                key={method.id || method.payment_method_id}
                className={`bg-white rounded-2xl border-2 transition-all p-5 shadow-sm flex flex-col justify-between ${
                  method.enabled
                    ? "border-slate-200 hover:border-indigo-300 hover:shadow-md"
                    : "border-slate-200/60 bg-slate-50/50 opacity-80 grayscale-[30%]"
                }`}
              >
                <div>
                  {/* Card Header with Toggle Switch */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-14 h-14 rounded-2xl border flex items-center justify-center p-2 shrink-0 ${
                          method.enabled
                            ? "bg-slate-50 border-slate-200"
                            : "bg-slate-100 border-slate-200 text-slate-400"
                        }`}
                      >
                        {method.logo ? (
                          <img
                            src={method.logo}
                            alt={method.name_ar}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <IconComponent
                            className={`w-6 h-6 ${
                              method.enabled ? "text-indigo-600" : "text-slate-400"
                            }`}
                          />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-800">
                            {method.name_ar}
                          </h3>
                          {method.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {method.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono" dir="ltr">
                          {method.name_en || method.id}
                        </p>
                      </div>
                    </div>

                    {/* TOGGLE SWITCH */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        type="button"
                        dir="ltr"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(method);
                        }}
                        disabled={isToggling}
                        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          method.enabled ? "bg-emerald-500" : "bg-slate-300"
                        } ${isToggling ? "opacity-50 cursor-wait" : "cursor-pointer hover:opacity-90"}`}
                        title={method.enabled ? "إلغاء التفعيل" : "تفعيل"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            method.enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span
                        className={`text-[10px] font-bold ${
                          method.enabled ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {method.enabled ? "مفعل ومتاح" : "معطل"}
                      </span>
                    </div>
                  </div>

                  {/* Description / Instructions */}
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                    {method.description_ar || method.instructions_ar || "لا يوجد وصف مدخل لهذه الطريقة"}
                  </p>

                  {/* Badges / Properties */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[11px]">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium border border-slate-200">
                      {method.type === "online"
                        ? "بوابة فواتيرك الإلكترونية"
                        : method.type === "manual"
                        ? "تحويل يدوي مباشر"
                        : "دفع نقدي عند الاستلام"}
                    </span>

                    {method.allow_for_subscriptions && (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-100">
                        متاح للاشتراكات
                      </span>
                    )}

                    {method.allow_for_store_orders && (
                      <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-medium border border-purple-100">
                        متاح لطلبات المتجر
                      </span>
                    )}

                    {Number(method.commission_on_customer) > 0 ? (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-medium border border-amber-100">
                        عمولة العميل: {method.commission_on_customer}%
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                        بدون عمولة إضافية
                      </span>
                    )}
                  </div>

                  {/* Account details snippet if manual */}
                  {method.account_details && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono mb-4 whitespace-pre-line">
                      {method.account_details}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <div className="text-[11px] text-slate-400">
                    الترتيب: #{method.sort_order || 1}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Direct explicit Action Button for instant toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggle(method)}
                      disabled={isToggling}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                        method.enabled
                          ? "border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600"
                          : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                      } ${isToggling ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                      title={method.enabled ? "تعطيل هذه الطريقة وإخفائها" : "تفعيل هذه الطريقة وإتاحتها"}
                    >
                      {isToggling ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري الحفظ...</span>
                        </>
                      ) : method.enabled ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>تعطيل</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تفعيل</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEdit(method)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                      تعديل
                    </button>

                    {!isSystemMethod && (
                      <button
                        type="button"
                        onClick={() => handleDelete(method.id, method.name_ar)}
                        disabled={actionLoading === method.id}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT / ADD MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {isNewMethod ? "إضافة طريقة دفع جديدة" : `تعديل طريقة: ${formData.name_ar}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    قم بضبط الاسم، العمولات، التعليمات، وتفعيلها في المنظومة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Status Toggle in Modal */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    حالة تفعيل طريقة الدفع:
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    عند التعطيل، ستُحجب هذه الطريقة فوراً ولن تظهر للعملاء في صفحات الدفع
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                    formData.enabled
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {formData.enabled ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      مفعلة ومتاحة للعملاء
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-slate-500" />
                      معطلة ومحجوبة
                    </>
                  )}
                </button>
              </div>

              {/* Logo Upload Section */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    شعار طريقة الدفع (Logo)
                  </label>
                  {formData.logo && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, logo: "" }))}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      إزالة الشعار
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Logo Preview */}
                  <div className="w-24 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-2.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    {uploadingLogo ? (
                      <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                    ) : formData.logo ? (
                      <img
                        src={formData.logo}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="text-center text-slate-300 flex flex-col items-center">
                        <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400">لا يوجد شعار</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 w-full space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-2 shadow-xs ${
                          uploadingLogo
                            ? "bg-slate-200 text-slate-400 cursor-wait"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
                        }`}
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>جاري رفع الصورة...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>رفع صورة اللوجو من جهازك</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">
                        (PNG, JPG, SVG, WebP)
                      </span>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="text"
                        value={formData.logo}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, logo: e.target.value }))
                        }
                        placeholder="أو الصق رابط صورة الشعار مباشرة (URL)"
                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-600 bg-white"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    الاسم بالعربية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, name_ar: e.target.value })
                    }
                    placeholder="مثال: فودافون كاش تحويل مباشر"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    الاسم بالإنجليزية
                  </label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) =>
                      setFormData({ ...formData, name_en: e.target.value })
                    }
                    placeholder="Example: Vodafone Cash Direct"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    نوع الطريقة
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="online">بوابة إلكترونية (فواتيرك)</option>
                    <option value="manual">تحويل يدوي (إنستاباي / محفظة)</option>
                    <option value="offline">دفع عند الاستلام (COD)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    عمولة العميل (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.commission_on_customer}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commission_on_customer: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    شارة مميزة (Badge)
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) =>
                      setFormData({ ...formData, badge: e.target.value })
                    }
                    placeholder="مثال: الأسرع، شائع"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Scopes */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  نطاق إتاحة طريقة الدفع:
                </span>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.allow_for_subscriptions}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allow_for_subscriptions: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    متاحة لاشتراكات الباقات (Pricing / Plans)
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.allow_for_store_orders}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allow_for_store_orders: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    متاحة لطلبات المتجر والكروت الذكية (Store Checkout)
                  </label>
                </div>
              </div>

              {/* Account Details (for Manual / InstaPay) */}
              {formData.type === "manual" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>بيانات الحساب / المحفظة المحول إليها</span>
                    <span className="text-[10px] text-slate-400">
                      تظهر للعميل لنسخها في صفحة الدفع
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.account_details}
                    onChange={(e) =>
                      setFormData({ ...formData, account_details: e.target.value })
                    }
                    placeholder="عنوان إنستاباي: user@instapay&#10;رقم المحفظة: 010XXXXXXXX&#10;اسم المستلم: Thenith"
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              )}

              {/* Description & Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  وصف مختصر لطريقة الدفع (بالعربية)
                </label>
                <input
                  type="text"
                  value={formData.description_ar}
                  onChange={(e) =>
                    setFormData({ ...formData, description_ar: e.target.value })
                  }
                  placeholder="مثال: الدفع الفوري الآمن ببطاقات الائتمان وميزة"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  تعليمات للعميل عند اختيار هذه الطريقة
                </label>
                <textarea
                  rows={2}
                  value={formData.instructions_ar}
                  onChange={(e) =>
                    setFormData({ ...formData, instructions_ar: e.target.value })
                  }
                  placeholder="مثال: حول المبلغ المطلوب وارسل صورة الإيصال للدعم الفني لتفعيل الطلب فوراً..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "saveModal"}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                >
                  {actionLoading === "saveModal" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isNewMethod ? "إضافة الطريقة" : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
