import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Edit2,
  Trash2,
  ShieldBan,
  ShieldCheck,
  Search,
  Plus,
  X,
  Save,
  Loader2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
  User,
  Phone,
  Mail,
  Globe,
  MapPin,
  Link2,
  QrCode,
  BarChart3,
  CheckCircle2,
  AtSign,
} from "lucide-react";
import {
  fetchUsers,
  createUser,
  updateUser,
  toggleBanUser,
  changeUserPlan,
  toggleUserPaymentPlus,
  deleteUser,
  fetchPlans,
  fetchUserCards,
  fetchCard,
  updateCard,
  deleteCard,
} from "../services/adminApi.js";

// ─── Shared UI ─────────────────────────────────────────────────────────────────
function Badge({ children, variant = "green" }) {
  const v = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    indigo: "bg-indigo-100 text-indigo-700",
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };
  const content =
    typeof children === "object" && children !== null && !React.isValidElement(children)
      ? (children.ar || children.en || "")
      : children;
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${v[variant] || v.slate}`}
    >
      {content}
    </span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center gap-5">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-rose-600" />
        </div>
        <p className="text-slate-700 font-medium">{message}</p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 border border-slate-200 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold hover:bg-rose-700 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}

const CONTACT_ICONS = {
  phone: Phone,
  whatsapp: Phone,
  email: Mail,
  website: Globe,
  location: MapPin,
};

// ─── Card Edit Modal ───────────────────────────────────────────────────────────
function CardEditModal({ cardId, onClose, onSaved }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    fetchCard(cardId)
      .then((c) => {
        setCard(c);
        setForm({
          name: c.name || "",
          personal: {
            fullName: c.personal?.fullName || "",
            title: c.personal?.title || "",
            company: c.personal?.company || "",
            jobTitle: c.personal?.jobTitle || "",
            bio: c.personal?.bio || "",
          },
          contacts: c.contacts || [],
          links: c.links || [],
          isActive: c.isActive !== false,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cardId]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateCard(cardId, form);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "info", label: "المعلومات" },
    { key: "contacts", label: `الاتصال (${form?.contacts?.length || 0})` },
    { key: "links", label: `الروابط (${form?.links?.length || 0})` },
  ];

  return (
    <Modal
      title={`تعديل الكارت: ${card?.name || "..."}`}
      onClose={onClose}
      wide
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      ) : !form ? (
        <p className="text-center text-slate-400 py-8">خطأ في التحميل</p>
      ) : (
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Info Tab */}
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-500">حالة الكارت:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() =>
                      setForm({ ...form, isActive: !form.isActive })
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.isActive ? "start-5" : "start-0.5"}`}
                    />
                  </div>
                  <span
                    className={`text-sm font-bold ${form.isActive ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    {form.isActive ? "نشط" : "موقوف"}
                  </span>
                </label>
              </div>
              {[
                { label: "اسم الكارت", key: "name", root: true },
                { label: "الاسم الكامل", key: "fullName" },
                { label: "المسمى الوظيفي", key: "title" },
                { label: "الشركة", key: "company" },
                { label: "الوظيفة", key: "jobTitle" },
              ].map(({ label, key, root }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={root ? form[key] : form.personal[key]}
                    onChange={(e) =>
                      root
                        ? setForm({ ...form, [key]: e.target.value })
                        : setForm({
                            ...form,
                            personal: {
                              ...form.personal,
                              [key]: e.target.value,
                            },
                          })
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">نبذة</label>
                <textarea
                  value={form.personal.bio}
                  rows={3}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      personal: { ...form.personal, bio: e.target.value },
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 resize-none"
                />
              </div>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === "contacts" && (
            <div className="space-y-3">
              {form.contacts.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">
                  لا توجد جهات اتصال
                </p>
              )}
              {form.contacts.map((c, i) => {
                const Icon = CONTACT_ICONS[c.type] || Link2;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl"
                  >
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs text-slate-400 font-medium">
                        {c.type}{" "}
                        {c.primary && (
                          <span className="text-indigo-500">• رئيسي</span>
                        )}
                      </p>
                      <input
                        type="text"
                        value={c.value}
                        
                        onChange={(e) => {
                          const arr = [...form.contacts];
                          arr[i] = { ...arr[i], value: e.target.value };
                          setForm({ ...form, contacts: arr });
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <button
                      onClick={() =>
                        setForm({
                          ...form,
                          contacts: form.contacts.filter((_, idx) => idx !== i),
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Links Tab */}
          {activeTab === "links" && (
            <div className="space-y-3">
              {form.links.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">
                  لا توجد روابط
                </p>
              )}
              {form.links.map((l, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                    <Link2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs text-slate-400 font-medium">
                      {l.platform || l.type || "رابط"}
                    </p>
                    <input
                      type="text"
                      value={l.url || l.value || ""}
                      
                      onChange={(e) => {
                        const arr = [...form.links];
                        arr[i] = {
                          ...arr[i],
                          url: e.target.value,
                          value: e.target.value,
                        };
                        setForm({ ...form, links: arr });
                      }}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setForm({
                        ...form,
                        links: form.links.filter((_, idx) => idx !== i),
                      })
                    }
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-rose-600 text-sm bg-rose-50 px-4 py-2.5 rounded-xl">
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ التعديلات
          </button>
        </div>
      )}
    </Modal>
  );
}

// ─── User Cards Panel ──────────────────────────────────────────────────────────
function UserCardsPanel({ user, onBack }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCardId, setEditCardId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchUserCards(user.id)
      .then(setCards)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteCard = async () => {
    setDeleting(true);
    try {
      await deleteCard(confirmDelete._id);
      setConfirmDelete(null);
      load();
    } catch (e) {
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" /> المستخدمين
        </button>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{user.name}</span>
        <span>/</span>
        <span>الكروت ({cards.length})</span>
      </div>

      {/* User summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl uppercase shrink-0">
            {(user.name || "?")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-800">{user.name}</p>
              {user.username && (
                <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                  <AtSign className="w-3 h-3" />
                  {user.username}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full font-mono border border-slate-200" >
                ID: {user.id}
              </span>
              {user.publicId && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full font-mono border border-slate-200" >
                  Pub: {user.publicId}
                </span>
              )}
              <Badge variant={user.isActive ? "green" : "red"}>
                {user.isActive ? "نشط" : "محظور"}
              </Badge>
              <Badge variant={user.planKey === "free" ? "slate" : "indigo"}>
                {user.planName}
              </Badge>
              {user.isEmailVerified && <Badge variant="blue">بريد موثّق</Badge>}
            </div>
            <p className="text-sm text-slate-500 mt-0.5" >
              {user.email}
            </p>
            {user.phone && (
              <p className="text-xs text-slate-400 mt-0.5" >
                {user.phone}
              </p>
            )}
          </div>
          <div className="text-xs text-slate-400 shrink-0">
            <p>
              تسجيل:{" "}
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString("ar-EG-u-nu-latn")
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Cards Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">الكروت</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : cards.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
            <QrCode className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-bold text-slate-700">لا توجد كروت</p>
          <p className="text-slate-400 text-sm">
            هذا المستخدم لم يُنشئ أي كارت بعد
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card._id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group"
            >
              {/* Cover */}
              <div className="relative h-20">
                {card.personal?.coverImage ? (
                  <img
                    src={card.personal.coverImage}
                    alt="cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500" />
                )}
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="-mt-8 mb-2">
                  {card.personal?.avatar ? (
                    <img
                      src={card.personal.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full border-2 border-white object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                </div>
                <p className="font-bold text-slate-800 text-sm">
                  {card.personal?.fullName || card.name}
                </p>
                {card.personal?.title && (
                  <p className="text-slate-500 text-xs mt-0.5">
                    {card.personal.title}
                  </p>
                )}
                {card.personal?.company && (
                  <p className="text-slate-400 text-xs">
                    {card.personal.company}
                  </p>
                )}

                {/* Stats row */}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {card.contacts?.filter((c) =>
                      ["phone", "whatsapp"].includes(c.type),
                    ).length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    {card.links?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    {card.requests?.length || 0} طلب
                  </span>
                  {card.isActive !== false ? (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 className="w-3 h-3" />
                      نشط
                    </span>
                  ) : (
                    <span className="text-slate-400">موقوف</span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => setEditCardId(card._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> تعديل
                  </button>
                  <button
                    onClick={() => setConfirmDelete(card)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card Edit Modal */}
      {editCardId && (
        <CardEditModal
          cardId={editCardId}
          onClose={() => setEditCardId(null)}
          onSaved={load}
        />
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <ConfirmModal
          message={`حذف الكارت "${confirmDelete.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          onConfirm={handleDeleteCard}
          onCancel={() => setConfirmDelete(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

// ─── Main UsersManager ────────────────────────────────────────────────────────
export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);

  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [planModal, setPlanModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    planKey: "free",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
  });
  const [selectedPlanKey, setSelectedPlanKey] = useState("free");
  const [paymentPlusEnabled, setPaymentPlusEnabled] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [customDays, setCustomDays] = useState("");
  const [customHours, setCustomHours] = useState("");

  const corePlans = useMemo(() => {
    const filtered = plans.filter((p) => ["free", "pro"].includes(p.key));
    if (filtered.length) return filtered;
    return [
      { key: "free", name: "مجاني", prices: { monthly: 0 } },
      { key: "pro", name: "Pro", prices: { monthly: 149 } },
    ];
  }, [plans]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const data = await fetchUsers(params);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    fetchPlans().then(setPlans).catch(console.error);
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search]);

  if (selectedUser) {
    return (
      <UserCardsPanel
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
      />
    );
  }

  const handleAddUser = async () => {
    setFormError("");
    setActionLoading(true);
    try {
      await createUser(addForm);
      setAddModal(false);
      setAddForm({ name: "", email: "", password: "", planKey: "free" });
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async () => {
    setFormError("");
    setActionLoading(true);
    try {
      await updateUser(editModal.id, editForm);
      setEditModal(null);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      if (confirmModal.type === "ban") await toggleBanUser(confirmModal.userId);
      if (confirmModal.type === "delete") await deleteUser(confirmModal.userId);
      setConfirmModal(null);
      load();
    } catch (e) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async () => {
    setActionLoading(true);
    try {
      await changeUserPlan(planModal.id, {
        planKey: selectedPlanKey,
        billingPeriod: selectedPeriod,
        customDays: customDays ? parseInt(customDays, 10) : null,
        customHours: customHours ? parseInt(customHours, 10) : null,
        paymentPlus: paymentPlusEnabled,
      });
      setPlanModal(null);
      load();
    } catch (e) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePaymentPlus = async (user) => {
    try {
      const res = await toggleUserPaymentPlus(user.id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, hasPaymentPlus: res.hasPaymentPlus } : u
        )
      );
    } catch (e) {
      console.error("Failed to toggle payment plus", e);
    }
  };

  const openEdit = (user) => {
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      username: user.username || "",
    });
    setFormError("");
    setEditModal(user);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            إدارة المستخدمين
          </h2>
          <p className="text-slate-500 mt-1">
            إجمالي {total} مستخدم · اضغط على أي صف لعرض كروته
          </p>
        </div>
        <button
          onClick={() => {
            setFormError("");
            setAddModal(true);
          }}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" /> إضافة مستخدم
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute end-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث بالاسم أو البريد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pe-10 ps-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-end">
              <thead>
                <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-5">المستخدم</th>
                  <th className="py-3 px-5">البريد</th>
                  <th className="py-3 px-5">الباقة</th>
                  <th className="py-3 px-5">الحالة</th>
                  <th className="py-3 px-5">تسجيل</th>
                  <th className="py-3 px-5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-400 text-sm"
                    >
                      لا توجد نتائج
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                            {(user.name || "?")[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">
                              {user.name}
                            </p>
                            {user.username && (
                              <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <AtSign className="w-3 h-3" />
                                {user.username}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5" >
                              ID: {user.id}
                            </p>
                            {user.publicId && (
                              <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5" >
                                Pub: {user.publicId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="py-3 px-5 text-sm text-slate-500"
                        
                      >
                        {user.email}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <Badge
                            variant={user.planKey === "pro" ? "indigo" : "slate"}
                          >
                            {user.planKey === "pro" ? "Pro" : "مجاني"}
                          </Badge>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePaymentPlus(user);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                              user.hasPaymentPlus
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-900/60 dark:text-slate-500"
                            }`}
                            title={user.hasPaymentPlus ? "انقر لتعطيل Payment Plus" : "انقر لتفعيل Payment Plus"}
                          >
                            <span>{user.hasPaymentPlus ? "✓ Payment Plus (مفعل)" : "✕ Payment Plus (معطل)"}</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <Badge variant={user.isActive ? "green" : "red"}>
                          {user.isActive ? "نشط" : "محظور"}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-sm text-slate-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("ar-EG-u-nu-latn")
                          : "—"}
                      </td>
                      <td
                        className="py-3 px-5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(user)}
                            title="تعديل"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPlanKey(user.planKey === "pro" ? "pro" : "free");
                              setPaymentPlusEnabled(Boolean(user.hasPaymentPlus));
                              setPlanModal(user);
                            }}
                            title="تغيير الباقة والخدمات"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmModal({
                                type: "ban",
                                userId: user.id,
                                message: user.isActive
                                  ? `حظر "${user.name}"؟`
                                  : `رفع الحظر عن "${user.name}"؟`,
                              })
                            }
                            className={`p-1.5 rounded-lg transition-colors ${user.isActive ? "text-slate-400 hover:text-orange-600 hover:bg-orange-50" : "text-orange-500 hover:bg-orange-50"}`}
                          >
                            {user.isActive ? (
                              <ShieldBan className="w-4 h-4" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              setConfirmModal({
                                type: "delete",
                                userId: user.id,
                                message: `حذف "${user.name}" نهائياً؟`,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>
              صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD MODAL */}
      {addModal && (
        <Modal title="إضافة مستخدم جديد" onClose={() => setAddModal(false)}>
          <div className="space-y-4">
            {[
              { label: "الاسم", key: "name", type: "text", ph: "محمد أحمد" },
              {
                label: "البريد",
                key: "email",
                type: "email",
                ph: "user@example.com",
              },
              {
                label: "كلمة المرور",
                key: "password",
                type: "password",
                ph: "••••••••",
              },
            ].map(({ label, key, type, ph }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={ph}
                  value={addForm[key]}
                  onChange={(e) =>
                    setAddForm({ ...addForm, [key]: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">الباقة</label>
              <select
                value={addForm.planKey}
                onChange={(e) =>
                  setAddForm({ ...addForm, planKey: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
              >
                {corePlans.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.key === "pro" ? "Pro (الاحترافية)" : "مجاني (Free)"}
                  </option>
                ))}
              </select>
            </div>
            {formError && (
              <p className="text-rose-600 text-sm bg-rose-50 px-4 py-2.5 rounded-xl">
                {formError}
              </p>
            )}
            <button
              onClick={handleAddUser}
              disabled={actionLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-60 mt-2"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}{" "}
              إضافة
            </button>
          </div>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <Modal
          title={`تعديل: ${editModal.name}`}
          onClose={() => setEditModal(null)}
        >
          <div className="space-y-4">
            {[
              { label: "الاسم", key: "name", type: "text" },
              { label: "البريد", key: "email", type: "email" },
              { label: "الهاتف", key: "phone", type: "tel" },
              {
                label: "اسم المستخدم (@username)",
                key: "username",
                type: "text",
              },
            ].map(({ label, key, type }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">
                  {label}
                </label>
                <input
                  type={type}
                  value={editForm[key]}
                  onChange={(e) =>
                    setEditForm({ ...editForm, [key]: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                  dir={key === "username" || key === "email" ? "ltr" : "rtl"}
                />
              </div>
            ))}
            {formError && (
              <p className="text-rose-600 text-sm bg-rose-50 px-4 py-2.5 rounded-xl">
                {formError}
              </p>
            )}
            <button
              onClick={handleEditUser}
              disabled={actionLoading}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-60 mt-2"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              حفظ
            </button>
          </div>
        </Modal>
      )}

      {/* CHANGE PLAN MODAL */}
      {planModal && (
        <Modal
          title={`إدارة باقات واشتراك: ${planModal.name}`}
          onClose={() => setPlanModal(null)}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-xs font-bold">الباقة الأساسية الحالية:</span>
              <Badge variant={planModal.planKey === "pro" ? "indigo" : "slate"}>
                {planModal.planKey === "pro" ? "Pro" : "مجاني"}
              </Badge>
            </div>

            {/* Core Plans: Free / Pro */}
            <div>
              <label className="text-xs font-black text-slate-700 block mb-2">
                1. الباقة الأساسية (Core Plans):
              </label>
              <div className="space-y-2">
                {corePlans.map((plan) => (
                  <label
                    key={plan.key}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${selectedPlanKey === plan.key ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.key}
                      checked={selectedPlanKey === plan.key}
                      onChange={() => {
                        setSelectedPlanKey(plan.key);
                        if (plan.key === "pro") {
                          setPaymentPlusEnabled(true);
                        } else if (plan.key === "free") {
                          setPaymentPlusEnabled(false);
                        }
                      }}
                      className="text-indigo-600"
                    />
                    <div>
                      <p className="font-bold text-sm text-slate-800">
                        {plan.key === "pro" ? "Pro (الاحترافية)" : "مجاني (Free)"}
                      </p>
                      <p className="text-xs text-slate-500" dir="ltr">
                        {plan.prices?.monthly || 0} ج.م / شهر
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Side / Add-on: Thenith Payment Plus */}
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-white to-white p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <h4 className="text-sm font-black text-indigo-950 flex items-center gap-2">
                    <span>2. باقة Thenith Payment Plus</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    صفحة الدفع الموحدة لجميع المحافظ الإلكترونية وروابط الدفع المباشرة.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2.5 border-t border-indigo-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentPlusChoice"
                    checked={paymentPlusEnabled === true}
                    onChange={() => setPaymentPlusEnabled(true)}
                    className="text-emerald-600"
                  />
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${paymentPlusEnabled ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                    ✓ تفعيل الخدمة (مفعل)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentPlusChoice"
                    checked={paymentPlusEnabled === false}
                    onChange={() => setPaymentPlusEnabled(false)}
                    className="text-slate-600"
                  />
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${!paymentPlusEnabled ? "bg-slate-700 text-white border-slate-700 shadow-sm" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                    ✕ تعطيل الخدمة (معطل)
                  </span>
                </label>
              </div>
            </div>
            {selectedPlanKey !== "free" && (
              <div className="space-y-4 mt-4 pt-4 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">دورة الاشتراك</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                  >
                    <option value="monthly">شهري (Monthly)</option>
                    <option value="yearly">سنوي (Yearly)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">أيام مخصصة</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="مثال: 30"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">ساعات مخصصة</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="مثال: 12"
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">إذا تركتها فارغة، سيتم الحساب بناءً على دورة الاشتراك.</p>
              </div>
            )}
            <button
              onClick={handleChangePlan}
              disabled={actionLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-60 mt-2"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              تطبيق
            </button>
          </div>
        </Modal>
      )}

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
