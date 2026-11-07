import { useState, useEffect, useCallback, useMemo } from "react";
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  Mail,
  User,
  Briefcase,
  KeyRound,
  Check,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  toggleAdminUserStatus,
  deleteAdminUser,
} from "../services/adminApi.js";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";

const PRESET_ROLES = [
  {
    id: "support",
    label: "🎧 مسؤول دعم فني",
    description: "الرد على العملاء ومتابعة صندوق الرسائل",
    permissions: ["support", "inbox"],
  },
  {
    id: "store_manager",
    label: "🛍️ مدير المتجر والطلبات",
    description: "متابعة الطلبات، المنتجات، وصمم كارتك",
    permissions: ["store", "custom_card", "cards"],
  },
  {
    id: "marketing",
    label: "🏷️ التسويق والإحالات",
    description: "إدارة الكوبونات، الإحالات، والإشعارات",
    permissions: ["coupons", "referrals", "push_notifications"],
  },
  {
    id: "operations",
    label: "💳 مسؤول الكروت والـ NFC",
    description: "إدارة الكروت الذكية، الدفعات، والباركود",
    permissions: ["cards", "store"],
  },
  {
    id: "all",
    label: "⭐ مشرف شامل",
    description: "التحكم في كافة الأقسام باستثناء المشرفين",
    permissions: [
      "overview",
      "support",
      "inbox",
      "users",
      "cards",
      "store",
      "custom_card",
      "subscriptions",
      "subscriptions_stats",
      "payment_methods",
      "coupons",
      "referrals",
      "push_notifications",
      "policies",
      "seo_sitemap",
      "security",
      "settings",
    ],
  },
];

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full flex flex-col max-h-[92vh] border border-slate-100 ${
          wide ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-400">تخصيص الحساب والصلاحيات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center gap-5 border border-slate-100">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900 mb-1">تأكيد الإجراء</h4>
          <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onCancel}
            className="flex-1 border border-slate-200 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-lg shadow-rose-600/20"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersManager() {
  const { adminUser: currentAdmin, isSuperAdmin } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    title: "",
    permissions: [],
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAdminUsers();
      if (res?.users) {
        setUsers(res.users);
      }
      if (res?.availablePermissions) {
        setAvailablePermissions(res.availablePermissions);
      }
    } catch (err) {
      console.error("Failed to load admin users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormError("");
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      title: "مشرف دعم فني",
      permissions: ["support", "inbox"],
    });
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    if (user.isRoot) return;
    setEditingUser(user);
    setFormError("");
    setFormData({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      password: "", // Left blank unless changing
      title: user.title || "",
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    });
    setModalOpen(true);
  };

  const handleTogglePermission = (permId) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permId);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter((p) => p !== permId) };
      }
      return { ...prev, permissions: [...prev.permissions, permId] };
    });
  };

  const handleApplyPreset = (presetPerms) => {
    setFormData((prev) => ({ ...prev, permissions: [...presetPerms] }));
  };

  const handleSelectAll = () => {
    const allIds = availablePermissions.map((p) => p.id);
    setFormData((prev) => ({ ...prev, permissions: allIds }));
  };

  const handleDeselectAll = () => {
    setFormData((prev) => ({ ...prev, permissions: [] }));
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("الاسم مطلوب");
      return;
    }
    if (!editingUser && !formData.username.trim()) {
      setFormError("اسم المستخدم مطلوب");
      return;
    }
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setFormError("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }
    if (editingUser && formData.password && formData.password.length < 6) {
      setFormError("كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف");
      return;
    }

    try {
      setActionLoading(true);
      if (editingUser) {
        const payload = {
          name: formData.name,
          email: formData.email,
          title: formData.title,
          permissions: formData.permissions,
        };
        if (formData.password) payload.password = formData.password;
        await updateAdminUser(editingUser._id, payload);
      } else {
        await createAdminUser(formData);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.isRoot) return;
    try {
      await toggleAdminUserStatus(user._id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "فشل تغيير حالة الحساب");
    }
  };

  const handleDeleteUser = (user) => {
    if (user.isRoot) return;
    setConfirmModal({
      message: `هل أنت متأكد من حذف المشرف "${user.name}" نهائياً من النظام؟ لن يتمكن من تسجيل الدخول مجدداً.`,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await deleteAdminUser(user._id);
          setConfirmModal(null);
          loadData();
        } catch (err) {
          alert(err.response?.data?.error || "فشل حذف المشرف");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const groups = {};
    availablePermissions.forEach((p) => {
      const cat = p.category || "عام";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [availablePermissions]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.title?.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "disabled" && !u.isActive);

      return matchSearch && matchStatus;
    });
  }, [users, search, statusFilter]);

  // Metrics
  const activeCount = users.filter((u) => u.isActive).length;
  const disabledCount = users.filter((u) => !u.isActive).length;

  return (
    <div className="p-8 space-y-8" dir="rtl">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <UserCog className="w-8 h-8 text-indigo-600" />
            فريق العمل والمشرفين
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            إدارة حسابات المشرفين، تخصيص الصلاحيات لكل صفحة وقسم في لوحة التحكم، وتعطيل أو تفعيل الحسابات.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
          >
            <Plus className="w-5 h-5" />
            إضافة مشرف جديد
          </button>
        )}
      </div>

      {/* METRIC STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 mb-1">إجمالي فريق العمل</p>
            <h3 className="text-3xl font-black text-slate-900">{users.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <UserCog className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 mb-1">حسابات نشطة</p>
            <h3 className="text-3xl font-black text-emerald-600">{activeCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 mb-1">حسابات معطلة</p>
            <h3 className="text-3xl font-black text-rose-600">{disabledCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، اسم المستخدم، أو المسمى..."
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2.5 ps-11 pe-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            الكل ({users.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            نشط ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("disabled")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === "disabled"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            معطل ({disabledCount})
          </button>
        </div>
      </div>

      {/* USERS LIST / TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-bold">جاري تحميل بيانات المشرفين...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <UserCog className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-bold text-slate-700">لم يتم العثور على أي مشرفين</p>
            <p className="text-xs text-slate-400 mt-1">جرّب تغيير كلمات البحث أو الفلاتر</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((user) => {
              const isSuper = user.isRoot || user.role === "superadmin";
              const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

              return (
                <div
                  key={user._id}
                  className={`p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-colors hover:bg-slate-50/60 ${
                    !user.isActive ? "opacity-60 bg-slate-50/40" : ""
                  }`}
                >
                  {/* User Profile Info */}
                  <div className="flex items-center gap-4 min-w-[280px]">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl uppercase shadow-sm ${
                        isSuper
                          ? "bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-indigo-500/20"
                          : user.isActive
                          ? "bg-slate-900 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {user.name?.[0] || "A"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-900">{user.name}</h4>
                        {isSuper ? (
                          <span className="bg-indigo-50 text-indigo-600 border border-indigo-200/60 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            المدير الرئيسي
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              user.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {user.isActive ? "نشط" : "معطل"}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-mono font-medium text-slate-700">@{user.username}</span>
                        {user.title && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-slate-600">{user.title}</span>
                          </>
                        )}
                        {user.email && (
                          <>
                            <span>•</span>
                            <span>{user.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Assigned Permissions Chips */}
                  <div className="flex-1 w-full lg:w-auto">
                    <p className="text-[11px] font-bold text-slate-400 mb-1.5">الصلاحيات الممنوحة:</p>
                    <div className="flex flex-wrap gap-1.5 max-w-xl">
                      {isSuper ? (
                        <span className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          كافة الصلاحيات (Super Admin)
                        </span>
                      ) : userPerms.length === 0 ? (
                        <span className="text-xs font-medium text-rose-500 bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl">
                          لا توجد أي صلاحيات ممنوحة لهذا المشرف
                        </span>
                      ) : (
                        userPerms.map((permId) => {
                          const def = availablePermissions.find((p) => p.id === permId);
                          return (
                            <span
                              key={permId}
                              className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200/60"
                            >
                              {def?.name || permId}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!user.isRoot && isSuperAdmin && (
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        title={user.isActive ? "تعطيل الحساب مؤقتاً" : "إعادة تفعيل الحساب"}
                        className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors border ${
                          user.isActive
                            ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                            : "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        }`}
                      >
                        {user.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                      </button>

                      <button
                        onClick={() => openEditModal(user)}
                        title="تعديل البيانات والصلاحيات"
                        className="p-2 text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user)}
                        title="حذف المشرف"
                        className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <Modal
          title={editingUser ? `تعديل صلاحيات: ${editingUser.name}` : "إضافة مشرف جديد لفريق العمل"}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSaveForm} className="space-y-6">
            {formError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Basic Info Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المشرف الكامل <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: أحمد مصطفى"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 ps-10 pe-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المستخدم (للدخول) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="text-slate-400 text-sm absolute start-3.5 top-1/2 -translate-y-1/2 font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUser)}
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                      })
                    }
                    placeholder="ahmed_support"
                    className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 border border-slate-200 rounded-xl py-2.5 ps-10 pe-4 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المسمى الوظيفي / القسم
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: مسؤول الدعم الفني وخدمة العملاء"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 ps-10 pe-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  البريد الإلكتروني (اختياري)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ahmed@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 ps-10 pe-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {editingUser ? "كلمة المرور الجديدة (اتركها فارغة إذا لم ترغب بالتغيير)" : "كلمة المرور (6 أحرف على الأقل)"}{" "}
                {!editingUser && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "أدخل كلمة مرور جديدة للتغيير..." : "••••••••"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 ps-10 pe-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* QUICK PRESETS */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  قوالب صلاحيات جاهزة وسريعة:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition-colors"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRESET_ROLES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.permissions)}
                    title={preset.description}
                    className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded-xl transition-all shadow-2xs"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PERMISSIONS SELECTOR BY CATEGORY */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-sm font-black text-slate-900">
                  تحديد الصلاحيات المخصصة ({formData.permissions.length} محددة)
                </h4>
              </div>

              <div className="space-y-4 max-h-[360px] overflow-y-auto pe-1">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} className="space-y-2">
                    <h5 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      {category}
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {perms.map((p) => {
                        const isChecked = formData.permissions.includes(p.id);

                        return (
                          <label
                            key={p.id}
                            className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                              isChecked
                                ? "bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-500/20"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(p.id)}
                              className="mt-0.5 w-4 h-4 accent-indigo-600 rounded"
                            />
                            <div className="flex-1">
                              <span
                                className={`text-xs font-bold block ${
                                  isChecked ? "text-indigo-900" : "text-slate-800"
                                }`}
                              >
                                {p.name}
                              </span>
                              <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                                {p.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FORM FOOTER BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-60"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingUser ? "حفظ التعديلات" : "إنشاء المشرف وتعيين الصلاحيات"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM ACTION MODAL */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

