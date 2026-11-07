import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Save, X, Loader2, AlertTriangle, Tag, Percent, Receipt, Calendar } from "lucide-react";
import { fetchCoupons, createCoupon, updateCoupon, deleteCoupon } from "../services/adminApi.js";

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1"
        >{children}</div>
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
          <button onClick={onCancel} className="flex-1 border border-slate-200 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-50">إلغاء</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 bg-rose-600 text-white py-2.5 rounded-xl font-bold hover:bg-rose-700 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}

function CouponForm({ initial, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(initial ? { ...initial, applyMode: initial.applyMode || "code" } : {
    code: "",
    discountType: "percentage",
    discountValue: "",
    monthlyDiscountValue: "",
    yearlyDiscountValue: "",
    appliesTo: "all",
    applyMode: "code",
    maxUses: "", // empty means unlimited
    expiresAt: "",
    isActive: true,
  });

  const handleSubmit = () => {
    const data = { ...form };
    data.code = data.code.toUpperCase().trim();
    data.applyMode = form.applyMode || "code";

    const numDiscountValue = data.discountValue === "" ? null : Number(data.discountValue);
    const numMonthly = (data.monthlyDiscountValue === "" || data.monthlyDiscountValue === null) ? null : Number(data.monthlyDiscountValue);
    const numYearly = (data.yearlyDiscountValue === "" || data.yearlyDiscountValue === null) ? null : Number(data.yearlyDiscountValue);

    data.monthlyDiscountValue = numMonthly;
    data.yearlyDiscountValue = numYearly;

    // Set discountValue to what the user wrote
    if (numDiscountValue !== null && !isNaN(numDiscountValue)) {
      data.discountValue = numDiscountValue;
    } else if (numMonthly !== null) {
      data.discountValue = numMonthly;
    } else if (numYearly !== null) {
      data.discountValue = numYearly;
    } else {
      data.discountValue = 0;
    }

    if (data.maxUses === "") data.maxUses = null;
    else data.maxUses = Number(data.maxUses);

    if (data.expiresAt === "") data.expiresAt = null;

    onSave(data);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (initial) {
      setForm(f => ({
        ...f,
        ...initial,
        applyMode: initial.applyMode || "code",
        expiresAt: initial.expiresAt ? formatDateForInput(initial.expiresAt) : ""
      }));
    }
  }, [initial]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">كود الخصم (Promo Code)</label>
          <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="مثال: BLACKFRIDAY50"
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">نوع الخصم</label>
            <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
              <option value="percentage">نسبة مئوية (%)</option>
              <option value="fixed">مبلغ ثابت (ج.م)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">
              {form.appliesTo === "subscriptions" ? "قيمة الخصم (العامة)" : "قيمة الخصم"}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={form.discountValue ?? ""}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                className="w-full border border-slate-200 rounded-xl ps-8 pe-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder={form.discountType === "percentage" ? "مثال: 20" : "مثال: 50"}
              />
              <div className="absolute start-3 top-2.5 text-slate-400">
                {form.discountType === "percentage" ? <Percent className="w-4 h-4" /> : <span className="text-xs font-bold font-sans">EGP</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">ينطبق على</label>
          <select value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
            <option value="all">الكل (المتجر والاشتراكات)</option>
            <option value="store">المتجر فقط (المنتجات)</option>
            <option value="subscriptions">الاشتراكات فقط (الباقات)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">طريقة تطبيق الكوبون</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${form.applyMode !== "auto"
                  ? "border-indigo-600 bg-indigo-50/50 text-slate-900"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
            >
              <input
                type="radio"
                name="applyMode"
                value="code"
                checked={form.applyMode !== "auto"}
                onChange={() => setForm({ ...form, applyMode: "code" })}
                className="mt-1 accent-indigo-600"
              />
              <div>
                <span className="block text-sm font-bold">تطبيق ككود فقط</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  يدخل العميل الكود في خانة "هل لديك كوبون خصم؟" لتفعيله
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${form.applyMode === "auto"
                  ? "border-indigo-600 bg-indigo-50/50 text-slate-900"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                }`}
            >
              <input
                type="radio"
                name="applyMode"
                value="auto"
                checked={form.applyMode === "auto"}
                onChange={() => setForm({ ...form, applyMode: "auto" })}
                className="mt-1 accent-indigo-600"
              />
              <div>
                <span className="block text-sm font-bold">تطبيق على الباقة مباشرة</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  يظهر السعر مخفضاً تلقائياً على الباقة دون الحاجة لكتابة كود
                </span>
              </div>
            </label>
          </div>
        </div>

        {form.appliesTo === "subscriptions" && (
          <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">خصم الباقة الشهرية</label>
              <div className="relative">
                <input type="number" min="0" value={form.monthlyDiscountValue} onChange={(e) => setForm({ ...form, monthlyDiscountValue: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl ps-8 pe-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white" placeholder="مثال: 10" />
                <div className="absolute start-3 top-2.5 text-slate-400">
                  {form.discountType === "percentage" ? <Percent className="w-4 h-4" /> : <span className="text-xs font-bold font-sans">EGP</span>}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">خصم الباقة السنوية</label>
              <div className="relative">
                <input type="number" min="0" value={form.yearlyDiscountValue} onChange={(e) => setForm({ ...form, yearlyDiscountValue: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl ps-8 pe-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white" placeholder="مثال: 20" />
                <div className="absolute start-3 top-2.5 text-slate-400">
                  {form.discountType === "percentage" ? <Percent className="w-4 h-4" /> : <span className="text-xs font-bold font-sans">EGP</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">الحد الأقصى للاستخدام</label>
            <input type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="يترك فارغاً لعدد لا نهائي"
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">تاريخ الانتهاء</label>
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>

        <div className="flex items-center pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? "bg-emerald-500" : "bg-slate-300"}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.isActive ? "start-5" : "start-0.5"}`} />
            </div>
            <span className={`text-sm font-bold ${form.isActive ? "text-emerald-600" : "text-slate-500"}`}>
              {form.isActive ? "الكوبون فعال" : "الكوبون معطل"}
            </span>
          </label>
        </div>
      </div>

      {error && <p className="text-rose-600 text-sm bg-rose-50 px-4 py-2.5 rounded-xl">{error}</p>}

      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <button onClick={onCancel} className="flex-1 border border-slate-200 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors">إلغاء</button>
        <button onClick={handleSubmit} disabled={saving}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ الكوبون
        </button>
      </div>
    </div>
  );
}

export default function CouponsManager() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setCoupons(await fetchCoupons()); }
    catch (e) { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form) => {
    setActionLoading(true); setFormError("");
    try { await createCoupon(form); setAddModal(false); load(); }
    catch (e) { setFormError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleUpdate = async (form) => {
    setActionLoading(true); setFormError("");
    try { await updateCoupon(editModal._id, form); setEditModal(null); load(); }
    catch (e) { setFormError(e.message); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try { await deleteCoupon(deleteConfirm._id); setDeleteConfirm(null); load(); }
    catch (e) { }
    finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">إدارة الكوبونات والخصومات</h2>
          <p className="text-slate-500 mt-1">إنشاء ومتابعة كوبونات الخصم للمتجر والاشتراكات.</p>
        </div>
        <button onClick={() => { setFormError(""); setAddModal(true); }}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus className="w-5 h-5" /> إضافة كوبون
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : coupons.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center text-center gap-4 shadow-sm">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400">
            <Tag className="w-10 h-10" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">لا توجد كوبونات بعد</h3>
            <p className="text-slate-500 text-sm">ابدأ بإنشاء كوبون الخصم الأول لزيادة المبيعات.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-end">
              <thead>
                <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-5">الكود</th>
                  <th className="py-3 px-5">الخصم</th>
                  <th className="py-3 px-5">الاستخدامات</th>
                  <th className="py-3 px-5">ينطبق على</th>
                  <th className="py-3 px-5">طريقة التطبيق</th>
                  <th className="py-3 px-5">انتهاء الصلاحية</th>
                  <th className="py-3 px-5">الحالة</th>
                  <th className="py-3 px-5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map(c => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  const isExhausted = c.maxUses !== null && c.usedCount >= c.maxUses;
                  const active = c.isActive && !isExpired && !isExhausted;

                  return (
                    <tr key={c._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-5">
                        <span className="font-mono font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{c.code}</span>
                      </td>
                      <td className="py-4 px-5">
                        {(() => {
                          const unit = c.discountType === "percentage" ? "%" : " ج.م";
                          const hasMonthly = c.monthlyDiscountValue !== null && c.monthlyDiscountValue !== undefined && c.monthlyDiscountValue !== "";
                          const hasYearly = c.yearlyDiscountValue !== null && c.yearlyDiscountValue !== undefined && c.yearlyDiscountValue !== "";

                          if (c.appliesTo === "subscriptions") {
                            if (hasMonthly && hasYearly) {
                              if (Number(c.monthlyDiscountValue) === Number(c.yearlyDiscountValue)) {
                                return (
                                  <span className="font-black text-emerald-600">
                                    {c.monthlyDiscountValue}{unit}
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-col text-xs font-bold space-y-0.5">
                                  <span className="text-emerald-600">
                                    شهري: {c.monthlyDiscountValue}{unit}
                                  </span>
                                  <span className="text-indigo-600">
                                    سنوي: {c.yearlyDiscountValue}{unit}
                                  </span>
                                </div>
                              );
                            }
                            if (hasMonthly) {
                              return (
                                <span className="font-black text-emerald-600 text-xs">
                                  شهري: {c.monthlyDiscountValue}{unit}
                                </span>
                              );
                            }
                            if (hasYearly) {
                              return (
                                <span className="font-black text-indigo-600 text-xs">
                                  سنوي: {c.yearlyDiscountValue}{unit}
                                </span>
                              );
                            }
                          }

                          return (
                            <span className="font-black text-emerald-600">
                              {c.discountValue ?? 0}{unit}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-700">{c.usedCount} <span className="text-slate-400 font-normal">/ {c.maxUses === null ? "غير محدود" : c.maxUses}</span></p>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                          {c.appliesTo === "all" ? "الكل" : c.appliesTo === "store" ? "المتجر" : "الاشتراكات"}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {c.applyMode === "auto" ? (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md inline-block">
                            تلقائي على الباقة
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md inline-block">
                            كود يدوي
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {c.expiresAt ? (
                          <div className={`flex items-center gap-1.5 text-sm font-bold ${isExpired ? "text-rose-500" : "text-slate-700"}`}>
                            <Calendar className="w-4 h-4" /> {new Date(c.expiresAt).toLocaleDateString("ar-EG-u-nu-latn")}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        {active ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">فعال</span>
                        ) : (
                          <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-xs font-bold">
                            {!c.isActive ? "معطل" : isExpired ? "منتهي" : "مستنفذ"}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setFormError(""); setEditModal(c); }} className="p-2 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(c)} className="p-2 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {addModal && (
        <Modal title="إضافة كوبون جديد" onClose={() => setAddModal(false)}>
          <CouponForm onSave={handleCreate} onCancel={() => setAddModal(false)} saving={actionLoading} error={formError} />
        </Modal>
      )}

      {editModal && (
        <Modal title="تعديل بيانات الكوبون" onClose={() => setEditModal(null)}>
          <CouponForm initial={editModal} onSave={handleUpdate} onCancel={() => setEditModal(null)} saving={actionLoading} error={formError} />
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmModal
          message={`هل أنت متأكد من حذف الكوبون "${deleteConfirm.code}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          onConfirm={handleDelete} onCancel={() => setDeleteConfirm(null)} loading={actionLoading}
        />
      )}
    </div>
  );
}

