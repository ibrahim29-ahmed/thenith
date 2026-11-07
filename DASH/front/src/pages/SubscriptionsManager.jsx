import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Save,
  Loader2,
  GripVertical,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  Power,
} from "lucide-react";
import {
  fetchPlans,
  createPlan,
  updatePlan,
  deletePlan,
} from "../services/adminApi.js";

function normalizeFeatures(features) {
  if (Array.isArray(features)) return features.map((f) => String(f));
  if (features && typeof features === "object") {
    const entries = Object.entries(features);
    const hasBooleans = entries.some(([, v]) => typeof v === "boolean");
    if (hasBooleans) {
      return entries.filter(([, v]) => v === true).map(([key]) => key);
    }
    return entries.map(([, v]) => String(v)).filter(Boolean);
  }
  return [];
}

function MarketingFeaturesBuilder({ items = [], onChange }) {
  const [newItemAr, setNewItemAr] = useState("");
  const [newItemEn, setNewItemEn] = useState("");

  const add = () => {
    if (!newItemAr.trim() || !newItemEn.trim()) return;
    onChange([...items, { name: { ar: newItemAr.trim(), en: newItemEn.trim() }, enabled: true }]);
    setNewItemAr("");
    setNewItemEn("");
  };

  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));

  const toggle = (idx) => {
    const next = [...items];
    next[idx].enabled = !next[idx].enabled;
    onChange(next);
  };

  const move = (idx, dir) => {
    if (idx + dir < 0 || idx + dir >= items.length) return;
    const next = [...items];
    const temp = next[idx];
    next[idx] = next[idx + dir];
    next[idx + dir] = temp;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200"
        >
          <div className="flex flex-col gap-1">
            <button
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
            >
              ▲
            </button>
            <button
              onClick={() => move(idx, 1)}
              disabled={idx === items.length - 1}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
            >
              ▼
            </button>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="text"
              value={typeof item.name === 'object' ? (item.name?.ar || '') : (item.name || '')}
              onChange={(e) => {
                const next = [...items];
                const currentEn = typeof next[idx].name === 'object' ? (next[idx].name?.en || '') : '';
                next[idx].name = { ar: e.target.value, en: currentEn };
                onChange(next);
              }}
              placeholder="الاسم بالعربية"
              className="px-3 py-1.5 border border-slate-200 rounded focus:border-indigo-500"
            />
            <input
              type="text"
              value={typeof item.name === 'object' ? (item.name?.en || '') : ''}
              onChange={(e) => {
                const next = [...items];
                const currentAr = typeof next[idx].name === 'object' ? (next[idx].name?.ar || '') : (next[idx].name || '');
                next[idx].name = { ar: currentAr, en: e.target.value };
                onChange(next);
              }}
              placeholder="Name in English"
              className="px-3 py-1.5 border border-slate-200 rounded focus:border-indigo-500"
              dir="ltr"
            />
          </div>
          <button
            onClick={() => toggle(idx)}
            className={`px-3 py-1.5 rounded font-medium text-sm ${item.enabled ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}
          >
            {item.enabled ? "مُفعل" : "معطل"}
          </button>
          <button
            onClick={() => remove(idx)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          value={newItemAr}
          onChange={(e) => setNewItemAr(e.target.value)}
          placeholder="اكتب ميزة جديدة بالعربية..."
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:border-indigo-500"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <input
          type="text"
          value={newItemEn}
          onChange={(e) => setNewItemEn(e.target.value)}
          placeholder="New feature in English..."
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:border-indigo-500"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          dir="ltr"
        />
        <button
          onClick={add}
          type="button"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700"
        >
          إضافة
        </button>
      </div>
    </div>
  );
}

const FEATURE_LABELS = {
  calendarBooking: "كالندر",
  verifiedBadge: "شارة Thenith الموثقة",
  contactMethods: "إضافة وسائل الاتصال",
  socialMediaLinks: "إضافة وسائل الاتصال",
  coverImage: "تغيير صورة الغلاف",
  customLink: "رابط مخصص احترافي",
  reorderLinks: "ترتيب صفحة الروابط",
  themeSelection: "اختيار مظهر",
  saveContact: "حفظ جهة الاتصال",
  qrCode: "QR Code",
  removeBranding: "إزالة شعار Thenith",
  advancedAnalytics: "إحصائيات متقدمة",
  basicAnalytics: "إحصائيات أساسية",
  prioritySupport: "الأولوية في الدعم الفني",
  futureFeatures: "جميع المميزات الجديدة مستقبلًا",
};

function PlanForm({ initial, plans, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(() => {
    let initialFeatures = {};
    if (initial) {
      if (Array.isArray(initial.features)) {
        initialFeatures.forEach((f) => (initialFeatures[f] = true));
      } else if (typeof initial.features === "object") {
        initialFeatures = { ...initial.features };
      }
    }
    return {
      key: initial?.key || "",
      name: typeof initial?.name === 'object' ? initial.name : { ar: initial?.name || "", en: initial?.name || "" },
      prices: initial?.prices || { monthly: "", yearly: "" },
      features: initialFeatures,
      limits: initial?.limits || {
        maxCards: "",
        maxLinks: "",
        monthlyBusinessRequests: "",
      },
      marketingFeatures: initial?.marketingFeatures || [],
      isActive: initial?.isActive ?? true,
    };
  });

  const isPro = form.key === "pro";

  const NAME_TO_KEY = {
    "كالندر": "calendarBooking",
    "شارة thenith الموثقة": "verifiedBadge",
    "شارة thenith": "verifiedBadge",
    "شارة التحقق": "verifiedBadge",
    "إضافة وسائل الاتصال": "contactMethods",
    "وسائل التواصل": "contactMethods",
    "روابط السوشيال ميديا": "contactMethods",
    "تغيير صورة الغلاف": "coverImage",
    "صورة الغلاف": "coverImage",
    "رابط مخصص احترافي": "customLink",
    "رابط مخصص": "customLink",
    "ترتيب صفحة الروابط": "reorderLinks",
    "إعادة ترتيب الروابط": "reorderLinks",
    "اختيار مظهر": "themeSelection",
    "حفظ جهة الاتصال": "saveContact",
    "qr code": "qrCode",
    "إزالة شعار thenith": "removeBranding",
    "إزالة العلامة التجارية": "removeBranding",
    "إحصائيات متقدمة": "advancedAnalytics",
    "إحصائيات أساسية": "basicAnalytics",
    "إحصائيات بسيطة": "basicAnalytics",
    "الأولوية في الدعم الفني": "prioritySupport",
    "دعم أولوية": "prioritySupport",
    "جميع المميزات الجديدة مستقبلًا": "futureFeatures",
    "جميع المميزات الجديدة مستقبلا": "futureFeatures",
    "مميزات مستقبلية": "futureFeatures",
    "حجز المواعيد (كالندر)": "calendarBooking",
    "حجز مواعيد": "calendarBooking",
    "تقويم المواعيد": "calendarBooking",
    "calendar booking": "calendarBooking",
  };

  const handleFormSave = () => {
    const newFeatures = { ...form.features };
    // reset known features
    Object.values(NAME_TO_KEY).forEach((key) => {
      newFeatures[key] = false;
    });
    newFeatures.socialMediaLinks = false;

    form.marketingFeatures.forEach((mf) => {
      const nameToCheck = String((typeof mf.name === 'object' ? (mf.name?.ar || mf.name?.en) : mf.name) || '');
      const normalized = nameToCheck.trim().toLowerCase();
      const sysKey = NAME_TO_KEY[normalized];
      if (sysKey && mf.enabled) {
        newFeatures[sysKey] = true;
        if (sysKey === "contactMethods") {
          newFeatures.socialMediaLinks = true;
        }
      }
    });

    onSave({ ...form, features: newFeatures });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 xl:p-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-800">
          {initial ? "تعديل الباقة" : "إضافة باقة جديدة"}
        </h3>
        {error && (
          <p className="text-red-500 text-sm font-medium bg-red-50 px-3 py-1 rounded-full">
            {error}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                مفتاح الباقة (Key)
              </label>
              <input
                type="text"
                value={form.key}
                disabled={!!initial}
                onChange={(e) =>
                  setForm({ ...form, key: e.target.value.toLowerCase() })
                }
                placeholder="مثال: basic"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  اسم الباقة (عربي)
                </label>
                <input
                  type="text"
                  value={form.name.ar}
                  onChange={(e) => setForm({ ...form, name: { ...form.name, ar: e.target.value } })}
                  placeholder="مثال: الباقة الأساسية"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  اسم الباقة (إنجليزي)
                </label>
                <input
                  type="text"
                  value={form.name.en}
                  onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })}
                  placeholder="Example: Basic Plan"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                السعر الشهري (ج.م)
              </label>
              <input
                type="number"
                value={form.prices.monthly}
                onChange={(e) =>
                  setForm({
                    ...form,
                    prices: { ...form.prices, monthly: Number(e.target.value) },
                  })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                السعر السنوي (ج.م)
              </label>
              <input
                type="number"
                value={form.prices.yearly}
                onChange={(e) =>
                  setForm({
                    ...form,
                    prices: { ...form.prices, yearly: Number(e.target.value) },
                  })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-800">
              حدود النظام (System Limits)
            </h4>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                عدد البطاقات المسموح بها
              </label>
              <input
                type="number"
                value={
                  form.limits.maxCards === null ? "" : form.limits.maxCards
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    limits: {
                      ...form.limits,
                      maxCards: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
                placeholder="فارغ = غير محدود"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                عدد الروابط المسموح بها
              </label>
              <input
                type="number"
                value={
                  form.limits.maxLinks === null ? "" : form.limits.maxLinks
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    limits: {
                      ...form.limits,
                      maxLinks: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
                placeholder="فارغ = غير محدود"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                طلبات العمل الشهرية
              </label>
              <input
                type="number"
                value={
                  form.limits.monthlyBusinessRequests === null
                    ? ""
                    : form.limits.monthlyBusinessRequests
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    limits: {
                      ...form.limits,
                      monthlyBusinessRequests: e.target.value
                        ? Number(e.target.value)
                        : null,
                    },
                  })
                }
                placeholder="فارغ = غير محدود"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
            <h4 className="font-bold text-blue-900 mb-4">
              المميزات والصلاحيات
            </h4>
            <p className="text-xs text-blue-700 mb-4">
              هذه القائمة تظهر للمستخدم في صفحة الأسعار. وتقوم تلقائياً بتحديث
              صلاحيات النظام الفعلية للمستخدم إذا تم تفعيلها أو تعطيلها.
            </p>
            <MarketingFeaturesBuilder
              items={form.marketingFeatures || []}
              onChange={(items) =>
                setForm({ ...form, marketingFeatures: items })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">
              حالة التفعيل (تفعيل أو تعطيل)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: true })}
                className={`p-4 rounded-xl border-2 text-start flex items-center justify-between transition-all cursor-pointer ${
                  form.isActive
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${form.isActive ? "bg-emerald-500" : "border-2 border-slate-300"}`}>
                    {form.isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div>
                    <span className="font-bold text-sm block">تفعيل الخدمة</span>
                    <span className="text-xs text-slate-500">متاحة ونشطة</span>
                  </div>
                </div>
                <Check className={`w-5 h-5 ${form.isActive ? "text-emerald-600" : "opacity-0"}`} />
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: false })}
                className={`p-4 rounded-xl border-2 text-start flex items-center justify-between transition-all cursor-pointer ${
                  !form.isActive
                    ? "border-rose-500 bg-rose-50/50 text-rose-900 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${!form.isActive ? "bg-rose-500" : "border-2 border-slate-300"}`}>
                    {!form.isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div>
                    <span className="font-bold text-sm block">تعطيل الخدمة</span>
                    <span className="text-xs text-slate-500">معطلة ومحجوبة</span>
                  </div>
                </div>
                <X className={`w-5 h-5 ${!form.isActive ? "text-rose-600" : "opacity-0"}`} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              عند التعطيل، لن تظهر هذه الباقة أو الخدمة في صفحة الأسعار ولن يتمكن المستخدمون الجدد من الاشتراك بها.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          إلغاء
        </button>
        <button
          onClick={handleFormSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}{" "}
          حفظ التغييرات
        </button>
      </div>
    </div>
  );
}

export default function SubscriptionsManager() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");
  const [togglingPlanId, setTogglingPlanId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchPlans();
      setPlans(Array.isArray(data) ? data : data.plans || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const corePlans = useMemo(() => {
    const list = plans.filter((p) => p.key === "free" || p.key === "pro");
    // Sort so free comes before pro
    return list.sort((a, b) => (a.key === "free" ? -1 : 1));
  }, [plans]);

  const addonPlans = useMemo(() => {
    return plans.filter((p) => p.key !== "free" && p.key !== "pro");
  }, [plans]);

  const handleToggleActive = async (plan) => {
    setTogglingPlanId(plan._id);
    try {
      await updatePlan(plan._id, { ...plan, isActive: !plan.isActive });
      await load();
    } catch (error) {
      alert(error.message || "حدث خطأ أثناء تغيير حالة التفعيل");
    } finally {
      setTogglingPlanId(null);
    }
  };

  const handleSave = async (form) => {
    setFormError("");
    setSaving(true);
    try {
      if (editModal) {
        await updatePlan(editModal._id, form);
      } else {
        await createPlan(form);
      }
      await load();
      setEditModal(null);
      setAddModal(false);
    } catch (error) {
      setFormError(error.message || "حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (deleteConfirm) {
      const runDelete = async () => {
        setDeleting(true);
        try {
          await deletePlan(deleteConfirm._id);
          await load();
        } catch (error) {
          alert(error.message);
        } finally {
          setDeleting(false);
          setDeleteConfirm(null);
        }
      };
      runDelete();
    }
  }, [deleteConfirm, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const renderPlanCard = (plan, isSide = false) => {
    const isToggling = togglingPlanId === plan._id;
    const planName = typeof plan.name === 'object' ? plan.name.ar : plan.name;
    const isPaymentPlus = plan.key === "payment_plus";

    return (
      <div
        key={plan._id}
        className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden flex flex-col ${
          isSide
            ? isPaymentPlus
              ? "border-indigo-200 ring-1 ring-indigo-100 shadow-indigo-50/50"
              : "border-purple-200 ring-1 ring-purple-100"
            : "border-slate-200"
        }`}
      >
        <div className={`p-6 border-b ${isSide ? "bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 border-indigo-100" : "border-slate-100"}`}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800">
                  {planName}
                </h3>
                {isSide && !isPaymentPlus && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    إضافية
                  </span>
                )}
                {!isSide && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    <ShieldCheck className="w-3 h-3 text-slate-500" />
                    باقة أساسية
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono mt-1 block">
                مفتاح الباقة: {plan.key}
              </span>
            </div>

            {/* Status with quick 1-click Toggle */}
            <button
              type="button"
              onClick={() => handleToggleActive(plan)}
              disabled={isToggling}
              title={plan.isActive ? "اضغط لتعطيل الباقة" : "اضغط لتفعيل الباقة"}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                plan.isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
              }`}
            >
              {isToggling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : plan.isActive ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>مفعل</span>
                </>
              ) : (
                <>
                  <X className="w-3.5 h-3.5 text-slate-400" />
                  <span>معطل</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-baseline gap-1 mt-4">
            <span className="text-3xl font-black text-slate-900" dir="ltr">
              {plan.prices?.monthly || 0}
              <span className="text-xl ms-1">ج.م</span>
            </span>
            <span className="text-slate-500 font-medium">/شهرياً</span>
            {plan.prices?.yearly ? (
              <span className="text-xs text-slate-400 ms-3" dir="ltr">
                ({plan.prices.yearly} ج.م سنوياً)
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-6 flex-1 bg-slate-50/50">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            المميزات المضمنة
          </h4>
          <ul className="space-y-3">
            {plan.marketingFeatures && plan.marketingFeatures.length > 0 ? (
              plan.marketingFeatures.slice(0, 5).map((mf, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm font-medium"
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${mf.enabled ? "text-indigo-500" : "text-slate-300"}`}
                  />
                  <span
                    className={
                      mf.enabled
                        ? "text-slate-700"
                        : "text-slate-400 line-through"
                    }
                  >
                    {typeof mf.name === 'object' ? (mf.name?.ar || mf.name?.en || "") : mf.name}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-400">لا توجد مميزات عرض</li>
            )}
            {plan.marketingFeatures?.length > 5 && (
              <li className="text-sm font-bold text-indigo-600">
                + {plan.marketingFeatures.length - 5} مميزات أخرى
              </li>
            )}
          </ul>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFormError("");
                setEditModal(plan);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4" /> تعديل الإعدادات
            </button>
            <button
              type="button"
              onClick={() => handleToggleActive(plan)}
              disabled={isToggling}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                plan.isActive
                  ? "text-rose-600 bg-rose-50/50 hover:bg-rose-100 border-rose-200"
                  : "text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 border-emerald-200"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{plan.isActive ? "تعطيل" : "تفعيل"}</span>
            </button>
          </div>

          {plan.key !== "free" && plan.key !== "pro" && (
            <button
              onClick={() => {
                const confirmName = typeof plan.name === 'object' ? plan.name.ar : plan.name;
                if (
                  window.confirm(`هل أنت متأكد من حذف باقة '${confirmName}'؟`)
                ) {
                  setDeleteConfirm(plan);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> حذف
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            إدارة الباقات والاشتراكات
          </h2>
          <p className="text-slate-500 mt-1">
            الباقات الأساسية للنظام (Free, Pro) مع الخدمات الإضافية والجانبية (Payment Plus) وخيارات التفعيل والتعطيل
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/subscriptions-stats#subscription-events-log"
            className="bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>سجل أحداث وإلغاءات الاشتراكات</span>
          </Link>
          <button
            onClick={() => {
              setFormError("");
              setAddModal(true);
            }}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" /> إضافة باقة أو خدمة
          </button>
        </div>
      </div>

      {/* SECTION 1: الباقات الأساسية (Free & Pro) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                الباقات الأساسية (Core Plans)
              </h3>
              <p className="text-xs text-slate-500">
                الباقات الرئيسية لحسابات المستخدمين والبروفايل الرقمي (Free & Pro)
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {corePlans.length} باقة أساسية
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {corePlans.map((plan) => renderPlanCard(plan, false))}
        </div>
      </div>

      {/* SECTION 2: الخدمات والباقات الجانبية (Add-on Services / Payment Plus) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>باقات وخدمات الدفع والمحافظ (Payment Plans)</span>
              </h3>
              <p className="text-xs text-slate-500">
                خدمات إضافية مستقلة مثل Thenith Payment Plus (صفحة الدفع الموحدة) مع إمكانية التفعيل أو التعطيل السريع
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            {addonPlans.length} خدمات جانبية
          </span>
        </div>

        {addonPlans.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
            لا توجد خدمات جانبية مضافة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {addonPlans.map((plan) => renderPlanCard(plan, true))}
          </div>
        )}
      </div>

      {(addModal || editModal) && (
        <PlanForm
          initial={editModal}
          plans={plans}
          saving={saving}
          error={formError}
          onSave={handleSave}
          onCancel={() => {
            setAddModal(false);
            setEditModal(null);
            setFormError("");
          }}
        />
      )}
    </div>
  );
}
