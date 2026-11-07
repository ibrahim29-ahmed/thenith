import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Wallet,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Trash2,
  Edit2,
  CheckCircle2,
  Check,
  X,
  Loader2,
  Globe,
  User as UserIcon,
  Phone,
  Mail,
  ShieldCheck,
  RefreshCw,
  Filter,
  AlertTriangle,
  Settings,
  Sliders,
  Upload,
  Save,
  ImageIcon,
  Eye,
  Package,
  Clock,
  Truck,
  CreditCard,
  Sparkles,
  ChevronDown,
  FileText,
  PhoneCall,
  Link2,
} from "lucide-react";
import {
  fetchUserWallets,
  createUserWallet,
  updateUserWallet,
  setActiveUserWallet,
  deleteUserWallet,
  fetchUsers,
  fetchPanelPaymentConfig,
  updatePanelPaymentConfig,
  uploadAdminImage,
  fetchOrders,
  updateOrderStatus,
} from "../services/adminApi.js";

const DEFAULT_PROVIDERS = [
  {
    id: "vodafone_cash",
    nameAr: "فودافون كاش",
    nameEn: "Vodafone Cash",
    badge: "فودافون",
    icon: "/wallets/vodafone-cash.png",
    color: "from-red-500 to-rose-600",
    placeholder: "https://...",
    ussdCode: "*9*7#",
    enabled: true,
  },
  {
    id: "instapay",
    nameAr: "انستاباي",
    nameEn: "Instapay",
    badge: "انستاباي",
    icon: "/wallets/instapay.png",
    color: "from-purple-600 to-indigo-600",
    placeholder: "https://instapay.eg/...",
    ussdCode: "",
    enabled: true,
  },
  {
    id: "orange_cash",
    nameAr: "أورنج كاش",
    nameEn: "Orange Cash",
    badge: "أورنج",
    icon: "/wallets/orange-cash.png",
    color: "from-amber-500 to-orange-500",
    placeholder: "https://...",
    ussdCode: "#7115#",
    enabled: true,
  },
  {
    id: "etisalat_cash",
    nameAr: "اتصالات كاش",
    nameEn: "Etisalat Cash",
    badge: "اتصالات",
    icon: "/wallets/etisalat-cash.png",
    color: "from-red-600 to-rose-700",
    placeholder: "https://...",
    ussdCode: "*777*1#",
    enabled: true,
  },
  {
    id: "we_pay",
    nameAr: "وي باي",
    nameEn: "WE Pay",
    badge: "وي",
    icon: "/wallets/we-pay.png",
    color: "from-purple-700 to-indigo-800",
    placeholder: "https://...",
    ussdCode: "*7*2#",
    enabled: true,
  },
];

export default function UserWalletsManager() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalWallets: 0,
    activeWallets: 0,
    usersWithWallets: 0,
    providerCounts: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active View Tab: "wallets" (محافظ المستخدمين) | "payment_orders" (طلبات كروت وسائل الدفع) | "panel_settings" (إعدادات صفحة البانيل)
  const [activeTab, setActiveTab] = useState("wallets");

  // Payment Cards Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Panel Page Configuration State
  const [panelConfig, setPanelConfig] = useState({
    header: {
      titleAr: "وسائل الدفع والمحافظ",
      titleEn: "Wallets & Payment Methods",
      descAr: "إدارة المحافظ الإلكترونية وروابط الدفع المباشرة الخاصة بك مع توفير لينك مخصص لكل محفظة",
      descEn: "Manage your digital wallets and direct payment links with dedicated custom links for each",
    },
    providers: DEFAULT_PROVIDERS,
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [activeOnly, setActiveOnly] = useState(false);

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    userId: "",
    name: "",
    provider: "vodafone_cash",
    link: "",
    walletNumber: "",
    accountName: "",
  });

  // User picker state for Add Modal
  const [userSearchText, setUserSearchText] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserObj, setSelectedUserObj] = useState(null);

  // Edit Modal State
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    provider: "vodafone_cash",
    link: "",
    walletNumber: "",
    accountName: "",
    isActive: false,
  });

  // Copy state
  const [copiedKey, setCopiedKey] = useState(null);

  // Toast & Confirm Modal states
  const [toast, setToast] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load Wallets Data
  const loadData = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedProvider !== "all") params.provider = selectedProvider;
      if (activeOnly) params.activeOnly = "true";

      const [walletsRes, configRes, ordersRes] = await Promise.all([
        fetchUserWallets(params),
        fetchPanelPaymentConfig().catch(() => null),
        fetchOrders().catch(() => []),
      ]);

      if (walletsRes && walletsRes.success) {
        setItems(walletsRes.items || []);
        if (walletsRes.stats) setStats(walletsRes.stats);
      }

      if (Array.isArray(ordersRes)) {
        setOrders(ordersRes);
      }

      if (configRes && configRes.success && configRes.config) {
        setPanelConfig({
          header: {
            titleAr: configRes.config.header?.titleAr || "وسائل الدفع والمحافظ",
            titleEn: configRes.config.header?.titleEn || "Wallets & Payment Methods",
            descAr: configRes.config.header?.descAr || "إدارة المحافظ الإلكترونية وروابط الدفع المباشرة الخاصة بك مع توفير لينك مخصص لكل محفظة",
            descEn: configRes.config.header?.descEn || "Manage your digital wallets and direct payment links with dedicated custom links for each",
          },
          providers: Array.isArray(configRes.config.providers) && configRes.config.providers.length > 0
            ? configRes.config.providers
            : DEFAULT_PROVIDERS,
        });
      }
    } catch (err) {
      console.error("Failed to load user wallets:", err);
      showToast("تعذر تحميل بيانات المحافظ", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProvider, activeOnly]);

  // Payment Orders Memo & Handlers
  const paymentOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    return orders.filter((order) => {
      if (!order.items || !Array.isArray(order.items)) return false;
      return order.items.some((item) => {
        const cd = item.customDesign;
        const nameStr = typeof item.name === "object" ? (item.name.ar || item.name.en || "") : String(item.name || "");
        const isCardPay = cd?.isPaymentCard === true || Boolean(cd?.walletProvider) || Boolean(cd?.walletNumber);
        const isPayName = nameStr.includes("دفع") || nameStr.toLowerCase().includes("payment");
        const isPayCat = item.category === "وسائل الدفع" || item.category === "payment_methods";
        return isCardPay || isPayName || isPayCat;
      });
    });
  }, [orders]);

  const filteredPaymentOrders = useMemo(() => {
    return paymentOrders.filter((order) => {
      if (orderStatusFilter !== "all" && order.status !== orderStatusFilter) {
        return false;
      }
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase().trim();
        const numMatch = (order.orderNumber || "").toLowerCase().includes(q);
        const custName = (order.customer?.name || "").toLowerCase().includes(q);
        const custPhone = (order.customer?.phone || "").toLowerCase().includes(q);
        const walletMatch = (order.items || []).some((item) => {
          const cd = item.customDesign;
          return (
            (cd?.walletNumber || "").toLowerCase().includes(q) ||
            (cd?.walletName || "").toLowerCase().includes(q) ||
            (cd?.walletProvider || "").toLowerCase().includes(q) ||
            (cd?.accountName || "").toLowerCase().includes(q)
          );
        });
        return numMatch || custName || custPhone || walletMatch;
      }
      return true;
    });
  }, [paymentOrders, orderStatusFilter, orderSearchQuery]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, { status: newStatus });
      showToast("تم تحديث حالة الطلب بنجاح", "success");
      const res = await fetchOrders();
      if (Array.isArray(res)) setOrders(res);
    } catch (err) {
      showToast(err.message || "فشل تحديث حالة الطلب", "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Search users for the Add Modal picker
  useEffect(() => {
    if (!isAddOpen) return;
    let isCurrent = true;
    const fetchCandidateUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const res = await fetchUsers({ q: userSearchText.trim(), limit: 10 });
        if (isCurrent && res && res.users) {
          setUsersList(res.users);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        if (isCurrent) setIsLoadingUsers(false);
      }
    };

    const timer = setTimeout(fetchCandidateUsers, 300);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [userSearchText, isAddOpen]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenPayment = (link) => {
    if (!link) return;
    let url = link.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSetActive = async (item) => {
    try {
      await setActiveUserWallet(item.user.id, item.methodId);
      showToast(`تم تحديد "${item.name}" كوسيلة أساسية للمستخدم ${item.user.name}`, "success");
      loadData(true);
    } catch (err) {
      showToast("تعذر تعيين الوسيلة كأساسية", "error");
    }
  };

  const handleDelete = (item) => {
    setDeleteConfirmItem(item);
  };

  const confirmDeleteExecution = async () => {
    if (!deleteConfirmItem) return;
    try {
      setIsDeleting(true);
      await deleteUserWallet(deleteConfirmItem.user.id, deleteConfirmItem.methodId);
      showToast("تم حذف المحفظة بنجاح", "success");
      setDeleteConfirmItem(null);
      loadData(true);
    } catch (err) {
      showToast("تعذر حذف المحفظة", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.userId) {
      showToast("يرجى اختيار المستخدم أولاً", "warning");
      return;
    }
    if (!addForm.name.trim()) {
      showToast("يرجى كتابة اسم المحفظة", "warning");
      return;
    }
    if (addForm.link && /^\d+$/.test(addForm.link.trim())) {
      showToast("رابط الدفع يجب أن يكون رابط موقع يبدأ بـ https:// وليس مجرد رقم هاتف", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      await createUserWallet({
        userId: addForm.userId,
        name: addForm.name.trim(),
        provider: addForm.provider,
        link: addForm.link.trim(),
        walletNumber: (addForm.walletNumber || "").trim(),
        accountName: (addForm.accountName || "").trim(),
      });
      showToast("تم إضافة المحفظة للمستخدم بنجاح", "success");
      setIsAddOpen(false);
      setAddForm({ userId: "", name: "", provider: "vodafone_cash", link: "", walletNumber: "", accountName: "" });
      setSelectedUserObj(null);
      setUserSearchText("");
      loadData(true);
    } catch (err) {
      showToast(err?.response?.data?.message || "تعذر إضافة المحفظة", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOpen = (item) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      provider: item.provider,
      link: item.link || "",
      walletNumber: item.walletNumber || "",
      accountName: item.accountName || "",
      isActive: item.isActive,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;

    if (editForm.link && /^\d+$/.test(editForm.link.trim())) {
      showToast("رابط الدفع يجب أن يكون رابط موقع يبدأ بـ https:// وليس مجرد رقم هاتف", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateUserWallet(editItem.user.id, editItem.methodId, {
        name: editForm.name.trim(),
        provider: editForm.provider,
        link: editForm.link.trim(),
        walletNumber: (editForm.walletNumber || "").trim(),
        accountName: (editForm.accountName || "").trim(),
        isActive: editForm.isActive,
      });
      showToast("تم تحديث بيانات المحفظة بنجاح", "success");
      setEditItem(null);
      loadData(true);
    } catch (err) {
      showToast("تعذر تحديث المحفظة", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Provider config helpers
  const currentProviders = panelConfig.providers || DEFAULT_PROVIDERS;

  const getProviderInfo = (provId) => {
    return currentProviders.find((p) => p.id === provId) || DEFAULT_PROVIDERS.find((p) => p.id === provId) || DEFAULT_PROVIDERS[0];
  };

  // Save Panel Config
  const handleSavePanelConfig = async () => {
    try {
      setSavingConfig(true);
      await updatePanelPaymentConfig(panelConfig);
      showToast("تم حفظ إعدادات وتخصيصات صفحة وسائل الدفع بنجاح!", "success");
    } catch (err) {
      console.error("Failed to save panel config:", err);
      showToast(err.response?.data?.message || "فشل حفظ الإعدادات", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  // Upload Logo for provider
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingProvider) return;

    try {
      setUploadingLogo(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await uploadAdminImage(reader.result, "wallets");
          if (res?.url) {
            setEditingProvider((prev) => ({ ...prev, icon: res.url }));
            showToast("تم رفع الأيقونة بنجاح!", "success");
          } else {
            showToast("فشل رفع الأيقونة", "error");
          }
        } catch (uploadErr) {
          showToast("حدث خطأ أثناء رفع الصورة", "error");
        } finally {
          setUploadingLogo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadingLogo(false);
      showToast("فشل قراءة الملف", "error");
    }
  };

  // Save Provider Modal Edits
  const handleSaveProviderModal = () => {
    if (!editingProvider) return;
    setPanelConfig((prev) => ({
      ...prev,
      providers: prev.providers.map((p) =>
        p.id === editingProvider.id ? editingProvider : p
      ),
    }));
    setEditingProvider(null);
    showToast(`تم تحديث إعدادات وسيلة "${editingProvider.nameAr}". لا تنسَ النقر على "حفظ التعديلات".`, "success");
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Page Header & Top Tabs ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800">
                إدارة صفحة وسائل الدفع (البانيل)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                التحكم الكامل في وسائل الدفع وأسمائها وأيقوناتها، وإدارة كافة محافظ العملاء وروابط الدفع المباشرة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === "wallets" && (
            <>
              <button
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
              </button>

              <button
                onClick={() => setIsAddOpen(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة محفظة لمستخدم</span>
              </button>
            </>
          )}

          {activeTab === "payment_orders" && (
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="تحديث الطلبات"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
              <span>تحديث الطلبات</span>
            </button>
          )}

          {activeTab === "panel_settings" && (
            <button
              onClick={handleSavePanelConfig}
              disabled={savingConfig}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ تعديلات البانيل</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Mode Navigation Tabs ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveTab("wallets")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === "wallets"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Wallet className="w-4 h-4 text-indigo-600" />
          <span>محافظ المستخدمين ({items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payment_orders")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === "payment_orders"
              ? "bg-white text-emerald-700 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package className="w-4 h-4 text-emerald-600" />
          <span>طلبات كروت وسائل الدفع ({paymentOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("panel_settings")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === "panel_settings"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>تخصيص أسماء وأيقونات الوسائل</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: USER WALLETS LIST & MANAGEMENT
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "wallets" && (
        <>
          {/* ── Stats Overview ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold text-slate-500">إجمالي المحافظ المضافة</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalWallets}</p>
              <p className="text-[11px] text-slate-400 mt-1">عبر جميع المستخدمين</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold text-slate-500">المحافظ الأساسية النشطة</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{stats.activeWallets}</p>
              <p className="text-[11px] text-slate-400 mt-1">الوسيلة الأساسية للعملاء</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold text-slate-500">مستخدمين لديهم محافظ</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.usersWithWallets}</p>
              <p className="text-[11px] text-slate-400 mt-1">حسابات نشطة</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center">
              <p className="text-xs font-bold text-slate-500 mb-2">توزيع الشبكات والمحافظ</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentProviders.map((p) => (
                  <span
                    key={p.id}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center gap-1"
                  >
                    <img src={p.icon} alt="" className="w-3.5 h-3.5 object-contain" />
                    <span>{p.badge}:</span>
                    <span className="font-black text-indigo-600">{stats.providerCounts?.[p.id] || 0}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Search & Filter Controls ── */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، البريد، الهاتف، يوزرنيم العميل، أو رابط المحفظة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 ps-10 pe-20 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="absolute end-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                >
                  بحث
                </button>
              </form>

              {/* Provider Quick Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedProvider("all")}
                  className={`text-xs font-bold px-3 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                    selectedProvider === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  الكل
                </button>
                {currentProviders.map((p) => {
                  const isSelected = selectedProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id)}
                      className={`text-xs font-bold px-2.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <img src={p.icon} alt="" className="w-4 h-4 object-contain rounded-sm" />
                      <span>{p.nameAr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>عرض المحافظ الأساسية النشطة فقط</span>
              </label>

              <span className="text-slate-400 font-bold">
                عرض {items.length} محفظة
              </span>
            </div>
          </div>

          {/* ── Wallets Cards Grid ── */}
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
              <p className="text-xs font-bold text-slate-500">جاري تحميل بيانات محافظ المستخدمين...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-700">لا توجد محافظ مطابقة</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                لم يتم العثور على أي محافظ أو وسائل دفع تطابق معايير البحث والفلترة الحالية.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((item) => {
                const prov = getProviderInfo(item.provider);
                const baseUrl = typeof window !== "undefined" && window.location.origin.includes("localhost")
                  ? "http://localhost:3000"
                  : "https://thenith.com";
                const publicLink = `${baseUrl}/m/${item.user.username || item.user.publicId}?pay=${item.methodId || item.customSlug || item.provider}`;

                return (
                  <div
                    key={`${item.user.id}_${item.methodId}`}
                    className={`bg-white rounded-2xl p-5 border shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                      item.isActive
                        ? "border-indigo-300 ring-2 ring-indigo-100"
                        : "border-slate-200"
                    }`}
                  >
                    <div>
                      {/* Top Header: User Info & Status */}
                      <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs shrink-0 overflow-hidden">
                            {item.user.avatar ? (
                              <img src={item.user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                              <span>{item.user.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium font-mono">
                                (@{item.user.username || item.user.publicId})
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span>{item.user.email}</span>
                            </p>
                            {item.user.phone && (
                              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 shrink-0" />
                                <span>{item.user.phone}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {item.isActive ? (
                            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              الأساسية
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetActive(item)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                            >
                              تعيين كأساسية
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Wallet Details: Branded Logo + Name + Provider */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-white p-1 sm:p-1.5 border border-slate-200/90 shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={prov.icon} alt="" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-800 truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {prov.nameAr}
                            </span>
                            {item.accountName && (
                              <span className="text-[10px] font-semibold text-slate-500">
                                صاحب المحفظة: {item.accountName}
                              </span>
                            )}
                            {item.walletNumber && (
                              <span dir="ltr" className="text-[10px] font-mono font-bold text-indigo-600">
                                {item.walletNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payment URL Box */}
                      <div className="space-y-2 mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 block mb-1">
                            رابط الدفع المباشر:
                          </span>
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 overflow-hidden">
                            <span dir="ltr" className="text-xs font-semibold text-slate-700 truncate flex-1 select-all">
                              {item.link || "لم يحدد رابط بعد"}
                            </span>
                            {item.link && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleCopy(item.link, `pay_${item.methodId}`)}
                                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                  title="نسخ رابط الدفع"
                                >
                                  {copiedKey === `pay_${item.methodId}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleOpenPayment(item.link)}
                                  className="text-indigo-600 hover:text-indigo-800 p-1 cursor-pointer"
                                  title="فتح الرابط"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dedicated Public Link */}
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 block mb-1">
                            اللينك المخصص للعميل:
                          </span>
                          <div className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100 rounded-xl px-2.5 py-1.5 overflow-hidden">
                            <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span dir="ltr" className="text-[11px] font-bold text-indigo-700 truncate flex-1 select-all">
                              {publicLink.replace(/^https?:\/\//, "")}
                            </span>
                            <button
                              onClick={() => handleCopy(publicLink, `pub_${item.methodId}`)}
                              className="text-indigo-500 hover:text-indigo-800 p-1 cursor-pointer"
                              title="نسخ اللينك المخصص"
                            >
                              {copiedKey === `pub_${item.methodId}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleEditOpen(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="حذف المحفظة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: PAYMENT CARDS ORDERS (طلبات كروت وسائل الدفع)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "payment_orders" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* ── Stats Overview ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">إجمالي طلبات كروت الدفع</p>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-800 mt-2">{paymentOrders.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">طلب كارت وسيلة دفع</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">قيد المراجعة والانتظار</p>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">
                {paymentOrders.filter((o) => o.status === "received").length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">بانتظار التأكيد والتجهيز</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">جاري التجهيز والشحن</p>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-600 mt-2">
                {paymentOrders.filter((o) => o.status === "processing" || o.status === "shipped").length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">في مرحلة الطباعة أو الشحن</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">تم التوصيل بنجاح</p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {paymentOrders.filter((o) => o.status === "delivered").length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">طلبات مكتملة ومسلّمة</p>
            </div>
          </div>

          {/* ── Filters & Search Bar ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="ابحث برقم الطلب، اسم العميل، الهاتف، أو رقم المحفظة..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 ps-9 pe-4 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
              {orderSearchQuery && (
                <button
                  onClick={() => setOrderSearchQuery("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: "all", label: "الكل" },
                { id: "received", label: "قيد المراجعة" },
                { id: "processing", label: "جاري التجهيز" },
                { id: "shipped", label: "تم الشحن" },
                { id: "delivered", label: "تم التوصيل" },
                { id: "cancelled", label: "ملغي" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setOrderStatusFilter(st.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    orderStatusFilter === st.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st.label}
                  {st.id !== "all" && (
                    <span className="ms-1.5 opacity-70">
                      ({paymentOrders.filter((o) => o.status === st.id).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Orders List ── */}
          {filteredPaymentOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-800 mb-1">
                {orderSearchQuery ? "لم يتم العثور على طلبات مطابقة للبحث" : "لا توجد طلبات لكروت وسائل الدفع حالياً"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                عندما يطلب المستخدمون كارت دفع ذكي لوسيلتهم (فودافون كاش، انستاباي، وغيرها) من لوحة التحكم، ستظهر الطلبات هنا مباشرة بكامل تفاصيلها.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPaymentOrders.map((order) => {
                const isUpdating = updatingOrderId === order._id;
                const statusConfig = {
                  received: { label: "قيد المراجعة", color: "bg-amber-50 text-amber-700 border-amber-200" },
                  processing: { label: "جاري التجهيز", color: "bg-blue-50 text-blue-700 border-blue-200" },
                  shipped: { label: "تم الشحن", color: "bg-purple-50 text-purple-700 border-purple-200" },
                  delivered: { label: "تم التوصيل", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                  cancelled: { label: "ملغي", color: "bg-rose-50 text-rose-700 border-rose-200" },
                  returned: { label: "مرتجع", color: "bg-slate-100 text-slate-700 border-slate-200" },
                }[order.status] || { label: order.status, color: "bg-slate-100 text-slate-700 border-slate-200" };

                // Extract payment card items
                const paymentItems = (order.items || []).filter((item) => {
                  const cd = item.customDesign;
                  const nameStr = typeof item.name === "object" ? (item.name.ar || item.name.en || "") : String(item.name || "");
                  return cd?.isPaymentCard === true || Boolean(cd?.walletProvider) || Boolean(cd?.walletNumber) || nameStr.includes("دفع") || item.category === "وسائل الدفع";
                });

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition-all overflow-hidden"
                  >
                    {/* Order Top Bar */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {new Date(order.createdAt).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Payment Status */}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            order.paymentStatus === "paid"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {order.paymentStatus === "paid" ? "تم الدفع" : "الدفع عند الاستلام / معلق"}
                        </span>

                        {/* Order Status Select */}
                        <div className="relative">
                          <select
                            value={order.status}
                            disabled={isUpdating}
                            onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                            className={`text-xs font-bold px-3 py-1.5 pe-7 rounded-xl border appearance-none cursor-pointer outline-none transition-colors ${statusConfig.color}`}
                          >
                            <option value="received">قيد المراجعة</option>
                            <option value="processing">جاري التجهيز</option>
                            <option value="shipped">تم الشحن</option>
                            <option value="delivered">تم التوصيل</option>
                            <option value="cancelled">ملغي</option>
                          </select>
                          {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Body: Customer Info + Card Details */}
                    <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Customer Details (4 cols) */}
                      <div className="lg:col-span-4 bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
                        <p className="font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          <span>بيانات العميل والشحن</span>
                        </p>
                        <div className="space-y-1.5">
                          <p className="font-black text-slate-900 text-sm">{order.customer?.name}</p>
                          <p className="text-slate-600 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <a href={`tel:${order.customer?.phone}`} className="hover:text-indigo-600 font-bold" dir="ltr">
                              {order.customer?.phone}
                            </a>
                          </p>
                          {order.customer?.email && (
                            <p className="text-slate-500 truncate flex items-center gap-1.5" dir="ltr">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{order.customer.email}</span>
                            </p>
                          )}
                          <p className="text-slate-600 text-[11px] leading-relaxed pt-1">
                            <span className="font-bold text-slate-700">{order.customer?.city}:</span> {order.customer?.address}
                          </p>
                        </div>
                      </div>

                      {/* Payment Card Details (8 cols) */}
                      <div className="lg:col-span-8 space-y-3">
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <span>تفاصيل كارت وسيلة الدفع المطلوب:</span>
                        </p>

                        <div className="space-y-2.5">
                          {paymentItems.map((item, idx) => {
                            const cd = item.customDesign || {};
                            const itemName = typeof item.name === "object" ? (item.name.ar || item.name.en) : item.name;

                            return (
                              <div
                                key={idx}
                                className="bg-gradient-to-r from-emerald-50/50 via-indigo-50/30 to-white rounded-xl p-3.5 border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-white p-1.5 border border-slate-200/90 shadow-2xs overflow-hidden shrink-0 flex items-center justify-center">
                                    <img
                                      src={item.image || item.selectedImage || "/card-logo.png"}
                                      alt=""
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black text-slate-900">{itemName}</h4>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {cd.walletName && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-black bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-md">
                                          <Sparkles className="w-3 h-3 text-indigo-600" />
                                          {cd.walletName}
                                        </span>
                                      )}
                                      {cd.walletNumber && (
                                        <span className="font-mono text-xs font-bold bg-white text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                                          <span>رقم: {cd.walletNumber}</span>
                                          <button
                                            onClick={() => handleCopy(cd.walletNumber, `order_w_${order._id}`)}
                                            className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                                            title="نسخ رقم المحفظة"
                                          >
                                            {copiedKey === `order_w_${order._id}` ? (
                                              <Check className="w-3 h-3 text-emerald-600" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        </span>
                                      )}
                                      {cd.accountName && (
                                        <span className="text-[11px] text-slate-600 font-medium">
                                          صاحب الحساب: <strong>{cd.accountName}</strong>
                                        </span>
                                      )}
                                      {cd.cardDesign && (
                                        <span className="text-[11px] text-slate-500 font-medium">
                                          التصميم: <strong>{cd.cardDesign}</strong>
                                        </span>
                                      )}
                                    </div>

                                    {/* Dedicated NFC Programming Link Box */}
                                    {cd.targetLink && (
                                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 bg-white/95 p-2 rounded-lg text-xs border border-indigo-100">
                                        <div className="flex items-center gap-1.5 shrink-0 text-indigo-700 font-bold">
                                          <Link2 className="w-3.5 h-3.5" />
                                          <span>رابط برمجة NFC:</span>
                                        </div>
                                        <span
                                          dir="ltr"
                                          className="font-mono text-[11px] font-bold text-slate-700 truncate select-all flex-1"
                                        >
                                          {cd.targetLink}
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleCopy(
                                                cd.targetLink,
                                                `order_link_${order._id}_${idx}`
                                              )
                                            }
                                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                            title="نسخ رابط البرمجة"
                                          >
                                            {copiedKey ===
                                            `order_link_${order._id}_${idx}` ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-600" />
                                                <span>تم النسخ</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" />
                                                <span>نسخ</span>
                                              </>
                                            )}
                                          </button>
                                          <a
                                            href={cd.targetLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md border border-slate-200 cursor-pointer transition-colors"
                                            title="فتح ومعاينة الرابط"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="text-start sm:text-end shrink-0 ps-3 sm:ps-0 sm:border-s sm:border-slate-200 sm:pe-2">
                                  <p className="text-xs text-slate-400">الكمية: {item.quantity}</p>
                                  <p className="text-sm font-black text-slate-900 mt-0.5" dir="ltr">
                                    {item.price * item.quantity} ج.م
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Order Bottom Footer */}
                    <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-medium">
                          طريقة الدفع: <strong>{order.paymentMethodName || order.paymentMethod}</strong>
                        </span>
                        {order.shippingCost > 0 && (
                          <span className="text-slate-500">
                            الشحن: <strong>{order.shippingCost} ج.م</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-600">إجمالي الطلب:</span>
                        <span className="text-base font-black text-indigo-700" dir="ltr">
                          {order.totalAmount} ج.م
                        </span>
                        <button
                          onClick={() => setSelectedOrderDetails(order)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>عرض الفاتورة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Order Details / Invoice ── */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span>تفاصيل طلب كارت الدفع: {selectedOrderDetails.orderNumber}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  تاريخ الطلب: {formatOrderDate(selectedOrderDetails.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Customer Box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <p className="font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span>بيانات العميل والشحن</span>
                </p>
                <p className="font-black text-sm text-slate-900">{selectedOrderDetails.customer?.name}</p>
                <p className="text-slate-600">الهاتف: <strong dir="ltr">{selectedOrderDetails.customer?.phone}</strong></p>
                {selectedOrderDetails.customer?.email && (
                  <p className="text-slate-600">البريد: {selectedOrderDetails.customer?.email}</p>
                )}
                <p className="text-slate-600">
                  العنوان: {selectedOrderDetails.customer?.city} - {selectedOrderDetails.customer?.address}
                </p>
              </div>

              {/* Items Box */}
              <div className="space-y-3">
                <p className="font-bold text-slate-700">المنتجات المطلوبة:</p>
                {(selectedOrderDetails.items || []).map((item, i) => {
                  const cd = item.customDesign || {};
                  return (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-slate-800">{typeof item.name === "object" ? (item.name.ar || item.name.en) : item.name}</p>
                        <p className="font-black text-indigo-700" dir="ltr">{item.price} ج.م × {item.quantity}</p>
                      </div>
                      {cd.walletName && (
                        <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-1">
                          <p className="text-indigo-700 font-bold">وسيلة الدفع المخصصة: {cd.walletName}</p>
                          {cd.walletNumber && <p className="text-slate-700 font-mono">رقم المحفظة: {cd.walletNumber}</p>}
                          {cd.accountName && <p className="text-slate-700">اسم صاحب المحفظة: {cd.accountName}</p>}
                          {cd.targetLink && (
                            <p className="text-slate-700 text-xs flex items-center gap-1.5 pt-1 border-t border-slate-100">
                              <span className="font-bold text-indigo-700">رابط برمجة NFC:</span>
                              <span dir="ltr" className="font-mono text-indigo-600 select-all truncate">{cd.targetLink}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Order Totals */}
              <div className="border-t border-slate-200 pt-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">طريقة الدفع:</span>
                  <span className="font-bold text-slate-800">{selectedOrderDetails.paymentMethodName || selectedOrderDetails.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">تكلفة الشحن:</span>
                  <span className="font-bold text-slate-800">{selectedOrderDetails.shippingCost || 0} ج.م</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                  <span>الإجمالي الكلي:</span>
                  <span className="text-indigo-600" dir="ltr">{selectedOrderDetails.totalAmount} ج.م</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: PANEL CONFIGURATION (تخصيص أسماء وأيقونات وسائل الدفع)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "panel_settings" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header Texts Config */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <span>نصوص وعناوين صفحة وسائل الدفع في البانيل</span>
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              يمكنك هنا تغيير العنوان الرئيسي والوصف الذي يظهر للعملاء في لوحة التحكم (البانيل).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  عنوان الصفحة (بالعربية)
                </label>
                <input
                  type="text"
                  value={panelConfig.header.titleAr}
                  onChange={(e) =>
                    setPanelConfig({
                      ...panelConfig,
                      header: { ...panelConfig.header, titleAr: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  عنوان الصفحة (بالإنجليزية)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={panelConfig.header.titleEn}
                  onChange={(e) =>
                    setPanelConfig({
                      ...panelConfig,
                      header: { ...panelConfig.header, titleEn: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none text-left"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الوصف الإرشادي تحت العنوان (بالعربية)
                </label>
                <textarea
                  rows={2}
                  value={panelConfig.header.descAr}
                  onChange={(e) =>
                    setPanelConfig({
                      ...panelConfig,
                      header: { ...panelConfig.header, descAr: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الوصف الإرشادي تحت العنوان (بالإنجليزية)
                </label>
                <textarea
                  rows={2}
                  dir="ltr"
                  value={panelConfig.header.descEn}
                  onChange={(e) =>
                    setPanelConfig({
                      ...panelConfig,
                      header: { ...panelConfig.header, descEn: e.target.value },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none text-left"
                />
              </div>
            </div>
          </div>

          {/* Providers Configuration (تغيير اسم وأيقونة وشارة كل وسيلة) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600" />
                  <span>تخصيص وسائل الدفع الإلكترونية المتاحة</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يمكنك تعديل الاسم، الشارة، والأيقونة لكل وسيلة دفع إلكترونية تظهر للمستخدمين في البانيل وصفحة التحويل.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSavePanelConfig}
                disabled={savingConfig}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ التعديلات</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentProviders.map((prov) => (
                <div
                  key={prov.id}
                  className={`rounded-2xl border p-4 bg-slate-50/60 transition-all hover:bg-white hover:shadow-sm ${
                    prov.enabled ? "border-slate-200" : "border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-white p-1.5 border border-slate-200/90 shadow-2xs overflow-hidden shrink-0 flex items-center justify-center">
                        <img src={prov.icon} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">{prov.nameAr}</p>
                        <p className="text-[11px] text-slate-400 font-bold truncate">{prov.nameEn}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                          {prov.badge}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingProvider({ ...prov })}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 space-y-1">
                    <p className="truncate">
                      <span className="font-bold text-slate-600">المعرف:</span>{" "}
                      <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-[10px]">{prov.id}</code>
                    </p>
                    <p className="truncate flex items-center gap-1.5">
                      <span className="font-bold text-slate-600">كود التحويل (USSD):</span>{" "}
                      {prov.ussdCode ? (
                        <code className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold">
                          {prov.ussdCode}
                        </code>
                      ) : (
                        <span className="text-slate-400 italic">معطل / غير متاح</span>
                      )}
                    </p>
                    <p className="truncate">
                      <span className="font-bold text-slate-600">الأيقونة:</span>{" "}
                      <span className="text-[10px] font-mono text-slate-400 truncate">{prov.icon}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Provider Details (الاسم والأيقونة) ── */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>تعديل وسيلة: {editingProvider.nameAr}</span>
              </h3>
              <button
                onClick={() => setEditingProvider(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Icon Preview & Custom Upload / URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  أيقونة / شعار الوسيلة
                </label>
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-16 h-16 rounded-2xl bg-white p-2 border border-slate-300 shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={editingProvider.icon} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-indigo-600" />
                      )}
                      <span>رفع أيقونة جديدة</span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">
                      PNG أو SVG أو JPG بدقة عالية
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">
                    أو أدخل مسار / رابط الصورة مباشرة:
                  </span>
                  <input
                    type="text"
                    value={editingProvider.icon}
                    onChange={(e) =>
                      setEditingProvider({ ...editingProvider, icon: e.target.value })
                    }
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none text-left"
                  />
                </div>
              </div>

              {/* Arabic Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الاسم بالعربية *
                </label>
                <input
                  type="text"
                  required
                  value={editingProvider.nameAr}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, nameAr: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* English Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الاسم بالإنجليزية
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingProvider.nameEn}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, nameEn: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none text-left"
                />
              </div>

              {/* Badge / Short label */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الشارة المختصرة (Badge)
                </label>
                <input
                  type="text"
                  value={editingProvider.badge}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, badge: e.target.value })
                  }
                  placeholder="مثال: فودافون، انستاباي، أورنج..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Default Placeholder */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نص الرابط التوضيحي (Placeholder)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingProvider.placeholder || ""}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, placeholder: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none text-left"
                />
              </div>

              {/* USSD Dial Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>كود التحويل المباشر (USSD)</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    اتركه فارغاً لتعطيل خيار الكود (مثل انستاباي)
                  </span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingProvider.ussdCode ?? ""}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, ussdCode: e.target.value })
                  }
                  placeholder="مثال: *9*7# أو #7115#"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none text-left font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  يتم فتح شاشة الاتصال بهذا الكود عند نقر الزائر على زر "التحويل من خلال الكود" (مثل *9*7# أو #7115#).
                </p>
              </div>

              {/* Enable / Disable */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enableProvCheck"
                  checked={editingProvider.enabled !== false}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, enabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="enableProvCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  تفعيل هذه الوسيلة وإتاحتها للمستخدمين في البانيل
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveProviderModal}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>تطبيق التعديلات</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add Wallet for User ── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                <span>إضافة محفظة لمستخدم</span>
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* User Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اختر المستخدم *
                </label>
                {selectedUserObj ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                    <div>
                      <p className="text-xs font-black text-indigo-900">{selectedUserObj.name}</p>
                      <p className="text-[11px] text-indigo-600">{selectedUserObj.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserObj(null);
                        setAddForm({ ...addForm, userId: "" });
                      }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                    >
                      تغيير
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={userSearchText}
                      onChange={(e) => setUserSearchText(e.target.value)}
                      placeholder="ابحث باسم أو بريد المستخدم..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                    />
                    <div className="mt-2 max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {isLoadingUsers ? (
                        <div className="p-3 text-center text-xs text-slate-400">جاري البحث...</div>
                      ) : usersList.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">لا يوجد مستخدمين</div>
                      ) : (
                        usersList.map((u) => (
                          <div
                            key={u._id}
                            onClick={() => {
                              setSelectedUserObj(u);
                              setAddForm({ ...addForm, userId: u._id });
                            }}
                            className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-start"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{u.name}</p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                              اختيار
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المحفظة *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="مثال: فودافون كاش، انستاباي الرئيسي"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  نوع المحفظة *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {currentProviders.map((p) => {
                    const isChosen = addForm.provider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAddForm({ ...addForm, provider: p.id })}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-start cursor-pointer transition-all ${
                          isChosen
                            ? "border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white p-1 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={p.icon} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate">{p.nameAr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallet Holder Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم صاحب المحفظة
                </label>
                <input
                  type="text"
                  value={addForm.accountName}
                  onChange={(e) => setAddForm({ ...addForm, accountName: e.target.value })}
                  placeholder="مثال: محمد أحمد"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Wallet Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم المحفظة
                </label>
                <input
                  type="text"
                  value={addForm.walletNumber}
                  onChange={(e) => setAddForm({ ...addForm, walletNumber: e.target.value })}
                  placeholder="010XXXXXXXX"
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none font-mono"
                />
              </div>

              {/* Direct Payment Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رابط الدفع المباشر (رابط ويب فقط)
                </label>
                <input
                  type="url"
                  value={addForm.link}
                  onChange={(e) => setAddForm({ ...addForm, link: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">يجب أن يبدأ الرابط بـ https://</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>إضافة المحفظة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Wallet ── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <span>تعديل محفظة: {editItem.user.name}</span>
              </h3>
              <button
                onClick={() => setEditItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المحفظة
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  نوع المحفظة
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {currentProviders.map((p) => {
                    const isChosen = editForm.provider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, provider: p.id })}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-start cursor-pointer transition-all ${
                          isChosen
                            ? "border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white p-1 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={p.icon} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate">{p.nameAr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallet Holder Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم صاحب المحفظة
                </label>
                <input
                  type="text"
                  value={editForm.accountName}
                  onChange={(e) => setEditForm({ ...editForm, accountName: e.target.value })}
                  placeholder="مثال: محمد أحمد"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Wallet Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم المحفظة
                </label>
                <input
                  type="text"
                  value={editForm.walletNumber}
                  onChange={(e) => setEditForm({ ...editForm, walletNumber: e.target.value })}
                  placeholder="010XXXXXXXX"
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رابط الدفع المباشر
                </label>
                <input
                  type="url"
                  value={editForm.link}
                  onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  تعيين هذه المحفظة كوسيلة أساسية للمستخدم
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ── */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-2">تأكيد حذف المحفظة</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              هل أنت متأكد من حذف محفظة &quot;{deleteConfirmItem.name}&quot; التابعة للمستخدم {deleteConfirmItem.user.name}؟ لن يتمكن العميل من استقبال التحويلات عليها.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteExecution}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>نعم، حذف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Alert ── */}
      {toast && (
        <div className="fixed bottom-6 start-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 text-xs font-bold animate-in fade-in slide-in-from-bottom-5">
          {toast.type === "success" && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
