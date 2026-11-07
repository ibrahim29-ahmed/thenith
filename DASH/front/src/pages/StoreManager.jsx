import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  Image as ImageIcon,
  Store,
  AlertTriangle,
  Check,
  XCircle,
  TrendingUp,
  PackageSearch,
  PackageX,
  Package,
  ShoppingBag,
  Truck,
  CheckCircle2,
  RotateCcw,
  LayoutGrid,
  List,
  User,
  FileText,
  Edit3,
  CreditCard,
  Sparkles,
  Copy,
  ExternalLink,
  Palette,
  KeyRound,
  Printer,
  Download,
  QrCode,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadAdminImage,
  fetchStoreStats,
  fetchOrders,
  updateOrderStatus,
  deleteOrder,
  fetchStoreSettings,
  updateStoreSettings,
  fetchShippingRates,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
  bulkUpdateShippingCost,
  fetchNfcChipTypes,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../services/adminApi.js";

// ─── Reusable Components ────────────────────────────────────────────────────────

const parseLocalizedName = (name) => {
  if (!name) return "";
  if (typeof name === "object") return name.ar || name.en || "";
  if (typeof name === "string" && name.startsWith("{") && name.includes("ar:") && name.includes("en:")) {
    try {
      const arMatch = name.match(/ar:\s*['"]([^'"]+)['"]/);
      if (arMatch) return arMatch[1];
    } catch {
      return name;
    }
  }
  return name;
};

function Badge({ children, variant = "slate" }) {
  const v = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    indigo: "bg-indigo-100 text-indigo-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${v[variant] || v.slate}`}
    >
      {children}
    </span>
  );
}

function Modal({ title, onClose, children, wide, extraWide, headerActions }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[92vh] ${
          extraWide ? "max-w-4xl" : wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 truncate">{title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
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

// ─── Shipping Tab ─────────────────────────────────────────────────────────────
function ShippingRateForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(
    initial || {
      governorate: "",
      governorateAr: "",
      cost: 0,
      isActive: true,
    }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">المحافظة (En)</label>
          <input
            value={form.governorate}
            onChange={(e) => setForm({ ...form, governorate: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">المحافظة (Ar)</label>
          <input
            value={form.governorateAr}
            onChange={(e) => setForm({ ...form, governorateAr: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">تكلفة الشحن (ج.م)</label>
        <input
          type="number"
          value={form.cost}
          onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="w-4 h-4 text-indigo-600 rounded"
        />
        <span className="text-sm font-bold text-slate-700">مفعل</span>
      </label>
      <div className="flex gap-3 justify-end mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          إلغاء
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          حفظ المحافظة
        </button>
      </div>
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

const QUICK_COLOR_PRESETS = [
  { name: "أسود", color: "#111827" },
  { name: "ذهبي", color: "#D4AF37" },
  { name: "فضي", color: "#C0C0C0" },
  { name: "أبيض", color: "#FFFFFF" },
  { name: "كحلي", color: "#1E3A8A" },
  { name: "أخضر", color: "#065F46" },
  { name: "عنابي", color: "#831843" },
];

function ProductForm({ initial, categories = [], onCategoryCreated, onSave, onCancel, saving, error }) {
  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  const [quickCatNameAr, setQuickCatNameAr] = useState("");
  const [quickCatNameEn, setQuickCatNameEn] = useState("");
  const [savingQuickCat, setSavingQuickCat] = useState(false);

  const getSafeForm = (init) => {
    if (!init)
      return {
        name: { ar: "", en: "" },
        description: { ar: "", en: "" },
        images: [],
        colors: [],
        price: 0,
        quantity: 0,
        sku: "",
        category: "",
        isActive: true,
        isCustomizable: false,
      };

    const rawImages = Array.isArray(init.images) ? init.images : [];
    const existingColors = Array.isArray(init.colors) ? init.colors : [];

    const normalizedImages = rawImages.map((img) => {
      if (typeof img === "object" && img !== null) {
        return {
          url: img.url || "",
          color: img.color || "",
          colorName: img.colorName || "",
        };
      }
      const urlStr = String(img || "");
      const matched = existingColors.find((c) => c.image === urlStr);
      return {
        url: urlStr,
        color: matched?.colorCode || "",
        colorName: matched?.name || "",
      };
    });

    return {
      ...init,
      name:
        typeof init.name === "string"
          ? { ar: init.name, en: init.name }
          : { ar: init.name?.ar || "", en: init.name?.en || "" },
      description:
        typeof init.description === "string"
          ? { ar: init.description, en: init.description }
          : { ar: init.description?.ar || "", en: init.description?.en || "" },
      images: normalizedImages,
      category: init.category || "",
      isCustomizable: Boolean(init.isCustomizable),
    };
  };
  const [form, setForm] = useState(getSafeForm(initial));
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return alert("الرجاء اختيار صورة صالحة");

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const { url } = await uploadAdminImage(
            reader.result,
            "thenith_store",
          );
          setForm((prev) => ({
            ...prev,
            images: [...prev.images, { url, color: "", colorName: "" }],
          }));
        } catch (err) {
          alert("فشل رفع الصورة");
        } finally {
          setUploading(false);
        }
      };
    } catch (err) {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">
                اسم المنتج (عربي)
              </label>
              <input
                type="text"
                value={form.name.ar}
                onChange={(e) => setForm({ ...form, name: { ...form.name, ar: e.target.value } })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">
                اسم المنتج (إنجليزي)
              </label>
              <input
                type="text"
                value={form.name.en}
                onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                dir="ltr"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">فئة المنتج (القسم)</label>
              <button
                type="button"
                onClick={() => setShowQuickAddCat(!showQuickAddCat)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {showQuickAddCat ? "إلغاء الإضافة" : "+ إضافة فئة جديدة للمتجر"}
              </button>
            </div>

            {showQuickAddCat && (
              <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 mb-2 animate-in fade-in duration-200">
                <p className="text-xs font-bold text-indigo-900">إضافة فئة جديدة واختيارها مباشرة:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="اسم الفئة بالعربي *"
                    value={quickCatNameAr}
                    onChange={(e) => setQuickCatNameAr(e.target.value)}
                    className="border border-indigo-200 rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Category name (EN) - اختياري"
                    value={quickCatNameEn}
                    onChange={(e) => setQuickCatNameEn(e.target.value)}
                    className="border border-indigo-200 rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={savingQuickCat || !quickCatNameAr.trim()}
                    onClick={async () => {
                      if (!quickCatNameAr.trim()) return;
                      setSavingQuickCat(true);
                      try {
                        const newCat = await createCategory({
                          name: { ar: quickCatNameAr.trim(), en: quickCatNameEn.trim() || quickCatNameAr.trim() },
                          isActive: true,
                        });
                        if (onCategoryCreated) {
                          onCategoryCreated(newCat);
                        }
                        setForm((prev) => ({ ...prev, category: quickCatNameAr.trim() }));
                        setQuickCatNameAr("");
                        setQuickCatNameEn("");
                        setShowQuickAddCat(false);
                      } catch (err) {
                        alert(err.message || "فشل إضافة الفئة");
                      } finally {
                        setSavingQuickCat(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {savingQuickCat && <Loader2 className="w-3 h-3 animate-spin" />}
                    حفظ الفئة واختيارها للمنتج
                  </button>
                </div>
              </div>
            )}

            <select
              value={form.category || ""}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
            >
              <option value="">بدون فئة (منتج عام)</option>
              {categories.map((c) => {
                const cName = typeof c.name === "object" ? c.name.ar || c.name.en : c.name;
                return (
                  <option key={c._id || c.id || cName} value={cName}>
                    {cName} {c.name?.en && c.name?.ar !== c.name?.en ? `(${c.name.en})` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">الوصف (عربي)</label>
            <textarea
              value={form.description.ar}
              rows={3}
              onChange={(e) =>
                setForm({ ...form, description: { ...form.description, ar: e.target.value } })
              }
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">الوصف (إنجليزي)</label>
            <textarea
              value={form.description.en}
              rows={3}
              onChange={(e) =>
                setForm({ ...form, description: { ...form.description, en: e.target.value } })
              }
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">السعر</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">
                الكمية بالمخزن
              </label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: Number(e.target.value) })
                }
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">
                SKU (اختياري)
              </label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}

                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.isActive ? "start-5" : "start-0.5"}`}
                  />
                </div>
                <span
                  className={`text-sm font-bold ${form.isActive ? "text-emerald-600" : "text-slate-500"}`}
                >
                  {form.isActive ? "متاح" : "مخفي"}
                </span>
              </label>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-slate-800">
                  منتج قابل للتخصيص (كارت بتصميم مخصص)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                عند تفعيله، سيتم توجيه العميل إلى استوديو التصميم ثلاثي الأبعاد لتخصيص كارت الاسم واللوجو قبل الطلب.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0 me-1">
              <div
                onClick={() => setForm({ ...form, isCustomizable: !form.isCustomizable })}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${form.isCustomizable ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${form.isCustomizable ? "start-6" : "start-1"}`}
                />
              </div>
            </label>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700">
              صور المنتج
            </label>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}{" "}
              إضافة صورة
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pe-1">
            {form.images.map((img, i) => {
              const imgUrl = typeof img === "object" && img !== null ? img.url : String(img || "");
              const imgColor = typeof img === "object" && img !== null ? (img.color || "") : "";
              const imgColorName = typeof img === "object" && img !== null ? (img.colorName || "") : "";

              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col gap-2 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 border border-slate-100 group">
                    <img
                      src={imgUrl}
                      alt="Product"
                      className="w-full h-full object-contain p-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="absolute top-1.5 end-1.5 p-1.5 bg-white/95 text-rose-500 rounded-lg shadow-sm hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف الصورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1.5 start-1.5 px-2 py-0.5 bg-slate-900/80 text-white text-[10px] font-bold rounded-md backdrop-blur-xs">
                        الرئيسية
                      </span>
                    )}
                  </div>

                  {/* Color selection row */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shadow-2xs"
                          style={{ backgroundColor: imgColor || "#ffffff" }}
                        />
                        <span className="text-xs font-bold text-slate-700">
                          {imgColor ? (imgColorName || "لون محدد") : "ربط لون:"}
                        </span>
                      </div>
                      {imgColor ? (
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...form.images];
                            next[i] = { ...next[i], color: "", colorName: "" };
                            setForm({ ...form, images: next });
                          }}
                          className="text-[10px] text-rose-500 font-semibold hover:underline cursor-pointer"
                        >
                          إلغاء
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">بدون لون</span>
                      )}
                    </div>

                    {/* Quick color preset dots */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {QUICK_COLOR_PRESETS.map((p) => {
                        const isMatch = imgColor.toLowerCase() === p.color.toLowerCase();
                        return (
                          <button
                            key={p.color}
                            type="button"
                            onClick={() => {
                              const next = [...form.images];
                              next[i] = {
                                ...next[i],
                                color: p.color,
                                colorName: next[i].colorName || p.name,
                              };
                              setForm({ ...form, images: next });
                            }}
                            title={p.name}
                            className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                              isMatch
                                ? "ring-2 ring-indigo-500 ring-offset-1 scale-110 border-indigo-600"
                                : "border-slate-300 hover:scale-110"
                            }`}
                            style={{ backgroundColor: p.color }}
                          >
                            {isMatch && (
                              <span
                                className={`text-[9px] font-black leading-none ${
                                  p.color === "#FFFFFF" || p.color === "#C0C0C0"
                                    ? "text-slate-900"
                                    : "text-white"
                                }`}
                              >
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Color Picker input */}
                      <label
                        title="اختيار لون مخصص"
                        className="w-5 h-5 rounded-full border border-dashed border-slate-400 flex items-center justify-center cursor-pointer hover:border-indigo-500 hover:scale-110 transition-all bg-white relative overflow-hidden"
                      >
                        <span className="text-[10px] font-bold text-slate-500 leading-none">+</span>
                        <input
                          type="color"
                          value={imgColor || "#111827"}
                          onChange={(e) => {
                            const next = [...form.images];
                            next[i] = {
                              ...next[i],
                              color: e.target.value,
                              colorName: next[i].colorName || "لون مخصص",
                            };
                            setForm({ ...form, images: next });
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>

                    {/* Color name input if color is selected */}
                    {imgColor && (
                      <input
                        type="text"
                        value={imgColorName}
                        placeholder="اسم اللون (مثل: أسود، ذهبي)"
                        onChange={(e) => {
                          const next = [...form.images];
                          next[i] = { ...next[i], colorName: e.target.value };
                          setForm({ ...form, images: next });
                        }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {form.images.length === 0 && (
              <div className="col-span-full aspect-video flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm">لا توجد صور للمنتج</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p className="text-rose-600 text-sm bg-rose-50 px-4 py-2.5 rounded-xl">
          {error}
        </p>
      )}
      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <button
          onClick={onCancel}
          className="flex-1 border border-slate-200 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
        >
          إلغاء
        </button>
        <button
          onClick={() => {
            const cleanImages = form.images
              .map((img) =>
                typeof img === "object" && img !== null
                  ? img
                  : { url: String(img || ""), color: "", colorName: "" },
              )
              .filter((img) => Boolean(img.url));

            const generatedColors = cleanImages
              .filter((img) => Boolean(img.color))
              .map((img, idx) => ({
                id: `color_${idx + 1}_${Date.now()}`,
                colorCode: img.color,
                name: img.colorName?.trim() || img.color,
                image: img.url,
              }));

            onSave({
              ...form,
              images: cleanImages,
              colors: generatedColors,
            });
          }}
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}{" "}
          حفظ
        </button>
      </div>
    </div>
  );
}

// ─── Categories Form ──────────────────────────────────────────────────────────

function CategoryForm({ initial, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(() => {
    if (!initial) {
      return {
        name: { ar: "", en: "" },
        description: { ar: "", en: "" },
        slug: "",
        image: "",
        order: 0,
        isActive: true,
      };
    }
    return {
      ...initial,
      name:
        typeof initial.name === "string"
          ? { ar: initial.name, en: initial.name }
          : { ar: initial.name?.ar || "", en: initial.name?.en || "" },
      description:
        typeof initial.description === "string"
          ? { ar: initial.description, en: initial.description }
          : { ar: initial.description?.ar || "", en: initial.description?.en || "" },
      slug: initial.slug || "",
      image: initial.image || "",
      order: Number(initial.order) || 0,
      isActive: initial.isActive !== undefined ? Boolean(initial.isActive) : true,
    };
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const { url } = await uploadAdminImage(reader.result, "thenith_store_categories");
          setForm((prev) => ({ ...prev, image: url }));
        } catch {
          alert("فشل رفع صورة الفئة");
        } finally {
          setUploading(false);
        }
      };
    } catch {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">اسم الفئة (عربي) *</label>
          <input
            type="text"
            required
            placeholder="مثلاً: كروت عادية، كروت ذكية، إكسسوارات"
            value={form.name.ar}
            onChange={(e) => setForm({ ...form, name: { ...form.name, ar: e.target.value } })}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">اسم الفئة (إنجليزي)</label>
          <input
            type="text"
            dir="ltr"
            placeholder="e.g. Smart Cards, Accessories"
            value={form.name.en}
            onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">الوصف (عربي)</label>
          <textarea
            rows={2}
            value={form.description.ar}
            onChange={(e) => setForm({ ...form, description: { ...form.description, ar: e.target.value } })}
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            placeholder="نبذة مختصرة عن منتجات هذه الفئة..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">الوصف (إنجليزي)</label>
          <textarea
            rows={2}
            dir="ltr"
            value={form.description.en}
            onChange={(e) => setForm({ ...form, description: { ...form.description, en: e.target.value } })}
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            placeholder="Short description of this category..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">الرابط المخصص / Slug (اختياري)</label>
          <input
            type="text"
            dir="ltr"
            placeholder="smart-cards"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">الترتيب في العرض</label>
          <input
            type="number"
            min="0"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Image / Thumbnail */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">صورة الفئة (اختياري)</label>
        <div className="flex items-center gap-4">
          {form.image ? (
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
              <img src={form.image} alt="Category" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setForm({ ...form, image: "" })}
                className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 bg-slate-50">
              <ImageIcon className="w-6 h-6 opacity-40" />
            </div>
          )}
          <div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {form.image ? "تغيير الصورة" : "رفع صورة للفئة"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>
      </div>

      {/* Active Toggle */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
        <span className="text-sm font-bold text-slate-700">حالة الفئة في المتجر</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setForm({ ...form, isActive: !form.isActive })}
            className={`w-11 h-6 rounded-full transition-colors relative ${form.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${form.isActive ? "start-6" : "start-1"}`}
            />
          </div>
          <span className={`text-xs font-bold ${form.isActive ? "text-emerald-600" : "text-slate-500"}`}>
            {form.isActive ? "مفعلة وتظهر بالمتجر" : "مخفية مؤقتاً"}
          </span>
        </label>
      </div>

      {error && (
        <p className="text-rose-600 text-sm bg-rose-50 px-4 py-2.5 rounded-xl">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-slate-200 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          إلغاء
        </button>
        <button
          type="button"
          disabled={saving || !form.name.ar?.trim()}
          onClick={() => onSave(form)}
          className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          حفظ الفئة
        </button>
      </div>
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────

const ORDER_STATUS_MAP = {
  received: { label: "جاري المراجعة", color: "slate", icon: Package },
  processing: { label: "جاري التجهيز", color: "indigo", icon: Loader2 },
  shipped: { label: "في الشحن", color: "amber", icon: Truck },
  delivered: { label: "تم التسليم", color: "green", icon: CheckCircle2 },
  returned: { label: "مرتجع", color: "rose", icon: RotateCcw },
  cancelled: { label: "ملغى", color: "rose", icon: XCircle },
};
const getPaymentMethodInfo = (method) => {
  switch (method) {
    case "card": return { label: "دفع أونلاين (فيزا/ماستركارد)", color: "indigo" };
    case "fawry": return { label: "دفع أونلاين (فوري)", color: "amber" };
    case "meeza": return { label: "دفع أونلاين (ميزة/محفظة إلكترونية)", color: "emerald" };
    case "online": return { label: "دفع أونلاين", color: "blue" };
    case "cash_on_delivery":
    default: return { label: "الدفع عند الاستلام", color: "slate" };
  }
};

function OrderStatusModal({ order, onClose, onSaved }) {
  const [status, setStatus] = useState(order.status);
  const [reason, setReason] = useState(order.returnReason || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateOrderStatus(order._id, {
        status,
        returnReason: status === "returned" ? reason : "",
      });
      onSaved();
      onClose();
    } catch (e) {
      alert(e.message);
      setLoading(false);
    }
  };

  return (
    <Modal title={`تحديث حالة الطلب #${order.orderNumber}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">الحالة</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ORDER_STATUS_MAP).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setStatus(key)}
                className={`p-3 rounded-xl border-2 flex items-center gap-2 text-sm font-bold transition-all ${status === key ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
              >
                <val.icon className="w-4 h-4" /> {val.label}
              </button>
            ))}
          </div>
        </div>
        {status === "returned" && (
          <div className="space-y-1.5 animate-in fade-in zoom-in-95">
            <label className="text-sm font-bold text-slate-700">
              سبب الترجيع
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="اكتب سبب الترجيع هنا..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
            <p className="text-xs text-slate-500">
              سيتم إرجاع كمية المنتجات للمخزن تلقائياً.
            </p>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex justify-center mt-2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "حفظ الحالة"
          )}
        </button>
      </div>
    </Modal>
  );
}

function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;
  const statusObj = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.received;
  const [copiedKey, setCopiedKey] = useState(null);

  const subtotal = (order.items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );
  const shippingCost = Number(order.shippingCost) || 0;
  const discount = Number(order.discount) || 0;
  const grandTotal = Number(order.totalAmount) || Math.max(0, subtotal + shippingCost - discount);
  const siteUrl = (import.meta.env.VITE_SITE_URL || "https://thenith.com").replace(/\/+$/, "");
  const invoiceVerificationUrl = `${siteUrl}/order/${order.orderNumber}`;

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ── SIMPLE MINIMAL INVOICE HTML FOR PRINT & DOWNLOAD (NO LOGO, CLEAN & ESSENTIAL) ──
  const generateMinimalInvoiceHtml = () => {
    const qrContainer = document.getElementById(`minimal-qr-${order._id}`);
    const qrSvg = qrContainer ? qrContainer.innerHTML : "";
    const paymentLabel = getPaymentMethodInfo(order.paymentMethod).label;

    const formattedDate = new Date(order.createdAt).toLocaleDateString("ar-EG-u-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const itemsRows = (order.items || [])
      .map((item, idx) => {
        const pName = typeof item.name === "string" ? parseLocalizedName(item.name) : (item.name?.ar || item.name?.en || "منتج");
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        const total = price * qty;
        const colorName = typeof item.color === "object"
          ? (item.color?.name?.ar || item.color?.name || item.color?.colorCode || "")
          : (item.color || "");
        const variantText = colorName
          ? `<span style="font-size: 11px; color: #475569; margin-right: 6px;">(اللون: ${colorName})</span>`
          : "";

        return `
          <tr>
            <td style="text-align: center; border: 1px solid #000; padding: 6px;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 6px;"><strong>${pName}</strong> ${variantText}</td>
            <td style="text-align: center; border: 1px solid #000; padding: 6px;">${qty}</td>
            <td style="text-align: left; border: 1px solid #000; padding: 6px; direction: ltr;">${price} ج.م</td>
            <td style="text-align: left; border: 1px solid #000; padding: 6px; font-weight: bold; direction: ltr;">${total} ج.م</td>
          </tr>
        `;
      })
      .join("");

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>فاتورة_${order.orderNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Tahoma, sans-serif;
      direction: rtl;
      padding: 24px;
      color: #000;
      background: #fff;
      font-size: 13px;
      line-height: 1.6;
    }
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-name {
      font-size: 26px;
      font-weight: bold;
      text-transform: lowercase;
      letter-spacing: -0.5px;
    }
    .header-info {
      margin-top: 4px;
      font-size: 13px;
    }
    .qr-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border: 1px solid #000;
    }
    .section-block {
      margin-bottom: 14px;
    }
    .section-title {
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 6px;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      display: inline-block;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 14px;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #000;
      padding: 6px 8px;
    }
    th {
      background: #f0f0f0;
      font-weight: bold;
    }
    .total-area {
      display: flex;
      justify-content: flex-end;
      border-top: 2px solid #000;
      padding-top: 10px;
      margin-top: 10px;
      font-size: 16px;
      font-weight: bold;
    }
    @media print {
      body { padding: 10mm; }
      @page { size: A4 portrait; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="top-header">
    <div>
      <div class="brand-name">thenith</div>
      <div class="header-info">رقم الأوردر: <strong>#${order.orderNumber}</strong></div>
      <div class="header-info">تاريخ إصدار الفاتورة: <strong>${formattedDate}</strong></div>
    </div>
    <div class="qr-container">
      ${qrSvg}
    </div>
  </div>

  <div class="section-block">
    <div class="section-title">بيانات العميل:</div>
    <div>الاسم: <strong>${order.customer?.name || "—"}</strong></div>
    <div>الهاتف: <span dir="ltr">${order.customer?.phone || "—"}</span></div>
    <div>العنوان: ${order.customer?.address || "—"} - ${order.customer?.city || "—"}</div>
    ${order.customer?.email ? `<div>البريد: ${order.customer.email}</div>` : ""}
  </div>

  <div class="section-block">
    <div class="section-title">بيانات الدفع:</div>
    <div>طريقة الدفع: <strong>${paymentLabel}</strong></div>
  </div>

  <div class="section-block">
    <div class="section-title">المنتجات:</div>
    <table>
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">#</th>
          <th style="text-align: right;">اسم المنتج</th>
          <th style="width: 60px; text-align: center;">الكمية</th>
          <th style="width: 90px; text-align: left;">السعر</th>
          <th style="width: 100px; text-align: left;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>
  </div>

  <div class="total-area">
    <div>الإجمالي: ${grandTotal} ج.م</div>
  </div>
</body>
</html>`;
  };

  const handlePrintInvoice = () => {
    const printHtml = generateMinimalInvoiceHtml();
    const printWindow = window.open("", "_blank", "width=850,height=1000");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.addEventListener("load", () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    });
  };

  const handleDownloadInvoice = () => {
    const invoiceHtml = generateMinimalInvoiceHtml();
    const blob = new Blob([invoiceHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `فاتورة_thenith_${order.orderNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handlePrintInvoice}
        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        title="طباعة الفاتورة البسيطة"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>طباعة الفاتورة</span>
      </button>

      <button
        type="button"
        onClick={handleDownloadInvoice}
        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        title="تحميل نسخة الفاتورة البسيطة"
      >
        <Download className="w-3.5 h-3.5" />
        <span>تحميل الفاتورة</span>
      </button>
    </div>
  );

  return (
    <Modal
      title={`تفاصيل الطلب #${order.orderNumber}`}
      onClose={onClose}
      extraWide
      headerActions={headerActions}
    >
      <div className="space-y-6">
        {/* Hidden QR for minimal print generation */}
        <div id={`minimal-qr-${order._id}`} className="hidden">
          <QRCodeSVG value={invoiceVerificationUrl} size={64} level="M" />
        </div>

        {/* ── FULL ADMIN ORDER DETAILS VIEW (ALL DETAILS PRESERVED) ─────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" /> بيانات العميل
            </h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500 font-medium">الاسم:</span>{" "}
                <span className="font-bold text-slate-800">{order.customer?.name}</span>
              </p>
              <p>
                <span className="text-slate-500 font-medium">التليفون:</span>{" "}
                <span className="font-bold text-slate-800 font-mono" dir="ltr">
                  {order.customer?.phone}
                </span>
              </p>
              <p>
                <span className="text-slate-500 font-medium">الإيميل:</span>{" "}
                <span className="font-bold text-slate-800">{order.customer?.email || "-"}</span>
              </p>
              <p>
                <span className="text-slate-500 font-medium">المحافظة:</span>{" "}
                <span className="font-bold text-slate-800">{order.customer?.city}</span>
              </p>
              <p>
                <span className="text-slate-500 font-medium">العنوان:</span>{" "}
                <span className="font-bold text-slate-800">{order.customer?.address}</span>
              </p>
            </div>
          </div>

          {/* Order Details Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-500" /> تفاصيل الطلب
            </h4>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500 font-medium">تاريخ الطلب:</span>{" "}
                <span className="font-bold text-slate-800">
                  {new Date(order.createdAt).toLocaleString("ar-EG-u-nu-latn")}
                </span>
              </p>
              <p>
                <span className="text-slate-500 font-medium">الحالة:</span>{" "}
                <span className={`font-bold text-${statusObj.color}-600`}>{statusObj.label}</span>
              </p>
              <p>
                <span className="text-slate-500 font-medium">طريقة الدفع:</span>{" "}
                <span className="font-bold text-slate-800">
                  {getPaymentMethodInfo(order.paymentMethod).label}
                </span>
              </p>
              <p>
                <span className="text-slate-500 font-medium">مرجع المعاملة:</span>{" "}
                <span className="font-mono font-bold text-slate-800 select-all">
                  {order.fawaterakRef ||
                    order.transactionId ||
                    (order.paymentTransactionId && typeof order.paymentTransactionId === "object"
                      ? order.paymentTransactionId.intentKey
                      : null) ||
                    "—"}
                </span>
              </p>
              <p>
                <span className="text-slate-500 font-medium">حالة الدفع:</span>{" "}
                <span className="font-bold text-slate-800">
                  {order.paymentStatus === "paid" ? "مدفوع" : "غير مدفوع"}
                </span>
              </p>
              <p>
                <span className="text-slate-500 font-medium">الإجمالي:</span>{" "}
                <span className="font-black text-indigo-600">{grandTotal} ج.م</span>
              </p>
            </div>
          </div>
        </div>

        {/* Technical Fawaterak Logs (Full Details) */}
        {order.paymentTransactionId && typeof order.paymentTransactionId === "object" && (
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> بيانات فواتيرك (Fawaterak)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p>
                  <span className="text-indigo-500/80 font-medium">Provider:</span>{" "}
                  <span className="font-bold text-slate-700">{order.paymentTransactionId.provider || "-"}</span>
                </p>
                <p>
                  <span className="text-indigo-500/80 font-medium">Intent Key:</span>{" "}
                  <span className="font-mono font-bold text-slate-700 select-all">
                    {order.paymentTransactionId.intentKey || "-"}
                  </span>
                </p>
                {order.transactionId && (
                  <p>
                    <span className="text-indigo-500/80 font-medium">Transaction ID:</span>{" "}
                    <span className="font-mono font-bold text-slate-700 select-all">{order.transactionId}</span>
                  </p>
                )}
                {order.fawaterakRef && (
                  <p>
                    <span className="text-indigo-500/80 font-medium">Fawaterak Ref:</span>{" "}
                    <span className="font-mono font-bold text-slate-700 select-all">{order.fawaterakRef}</span>
                  </p>
                )}
                {order.paymentMethodName && (
                  <p>
                    <span className="text-indigo-500/80 font-medium">Payment Method Name:</span>{" "}
                    <span className="font-bold text-slate-700">{order.paymentMethodName}</span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p>
                  <span className="text-indigo-500/80 font-medium">Payment Data:</span>
                </p>
                {order.paymentTransactionId.paymentData ? (
                  <pre className="text-xs bg-white p-2 rounded border border-slate-200 overflow-auto max-h-32 ltr text-left">
                    {JSON.stringify(order.paymentTransactionId.paymentData, null, 2)}
                  </pre>
                ) : (
                  <span className="text-slate-500">-</span>
                )}

                <p>
                  <span className="text-indigo-500/80 font-medium mt-2 block">Webhook Response:</span>
                </p>
                {order.paymentTransactionId.fawaterakResponse ? (
                  <pre className="text-xs bg-white p-2 rounded border border-slate-200 overflow-auto max-h-32 ltr text-left">
                    {JSON.stringify(order.paymentTransactionId.fawaterakResponse, null, 2)}
                  </pre>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ordered Items & Credentials */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-500" /> المنتجات المطلوبة
            </h4>
            <Link
              to={`/cards?search=${encodeURIComponent(order.orderNumber)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-colors self-start sm:self-auto"
              title="عرض جميع الكروت المنشأة لهذا الطلب في إدارة المنتجات والكروت الذكية"
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>عرض كروت هذا الطلب في إدارة الكروت الذكية</span>
              <ExternalLink className="w-3 h-3 text-indigo-400" />
            </Link>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-end text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-bold">المنتج</th>
                  <th className="py-2.5 px-4 font-bold">السعر</th>
                  <th className="py-2.5 px-4 font-bold">الكمية</th>
                  <th className="py-2.5 px-4 font-bold">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {order.items?.map((item, idx) => {
                  const cardsList =
                    Array.isArray(item.generatedCards) && item.generatedCards.length > 0
                      ? item.generatedCards
                      : item.customDesign?.generatedCard
                      ? [item.customDesign.generatedCard]
                      : [];

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-700">
                        <div className="flex items-start gap-3">
                          {(item.selectedImage || item.image) && (
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
                              <img
                                src={item.selectedImage || item.image}
                                alt="Variant"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>
                                {typeof item.name === "string" ? parseLocalizedName(item.name) : item.name?.ar}
                              </span>
                              {item.customDesign && (
                                <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                  كارت مخصص
                                </span>
                              )}
                              {item.selectedImageId && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                                  <span>معرّف الصورة:</span>
                                  <span className="font-mono">{item.selectedImageId}</span>
                                </span>
                              )}
                              {item.color && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                                  <span
                                    className="w-3 h-3 rounded-full border border-black/10 inline-block shrink-0 shadow-2xs"
                                    style={{ backgroundColor: item.color.colorCode || "#000000" }}
                                  />
                                  <span>
                                    {item.color.name?.ar ||
                                      item.color.name?.en ||
                                      (typeof item.color === "string" ? item.color : "اللون المختار")}
                                  </span>
                                </span>
                              )}
                            </div>

                          {/* Quick link to cards in Smart Cards & Products Management */}
                          {cardsList.length > 0 ? (
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              {cardsList.map((card, cI) => {
                                const targetCardId = card.physicalCardId || card._id || card.cardId || card.publicId;
                                return (
                                  <Link
                                    key={cI}
                                    to={`/cards/${targetCardId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors shadow-2xs group"
                                    title="فتح وتعديل هذا الكارت في إدارة المنتجات والكروت الذكية"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                                    <span>كارت ذكي مرتبط: {card.cardId || `#${cI + 1}`}</span>
                                    <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600" />
                                  </Link>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              <Link
                                to={`/cards?search=${encodeURIComponent(order.orderNumber)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition-colors"
                                title="البحث عن كروت هذا الطلب في إدارة المنتجات والكروت الذكية"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                                <span>البحث عن الكارت في إدارة المنتجات والكروت</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </Link>
                            </div>
                          )}

                          {/* Custom Design Artwork Downloads */}
                          {item.customDesign && (
                            <div className="mt-2 flex flex-col gap-3 p-3 bg-slate-50 rounded-xl border border-indigo-100 text-xs">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {item.customDesign.image && (
                                    <a
                                      href={item.customDesign.image}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block w-20 h-13 rounded-lg overflow-hidden border border-slate-300 shadow-xs shrink-0 hover:scale-105 transition-transform"
                                      title="الوجه الأمامي"
                                    >
                                      <img
                                        src={item.customDesign.image}
                                        alt="Front Design"
                                        className="w-full h-full object-cover"
                                      />
                                    </a>
                                  )}
                                  {item.customDesign.backImage && (
                                    <a
                                      href={item.customDesign.backImage}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block w-20 h-13 rounded-lg overflow-hidden border border-slate-300 shadow-xs shrink-0 hover:scale-105 transition-transform"
                                      title="الوجه الخلفي"
                                    >
                                      <img
                                        src={item.customDesign.backImage}
                                        alt="Back Design"
                                        className="w-full h-full object-cover"
                                      />
                                    </a>
                                  )}
                                  <div className="space-y-0.5 text-[11px]">
                                    <p>
                                      <span className="text-slate-500 font-medium">الاسم:</span>{" "}
                                      <span className="font-bold text-slate-800">{item.customDesign.name || "-"}</span>
                                    </p>
                                    {item.customDesign.jobTitle && (
                                      <p>
                                        <span className="text-slate-500 font-medium">الوظيفة:</span>{" "}
                                        <span className="font-bold text-slate-800">{item.customDesign.jobTitle}</span>
                                      </p>
                                    )}
                                    {item.customDesign.font && (
                                      <p>
                                        <span className="text-slate-500 font-medium">الخط:</span>{" "}
                                        <span className="font-bold text-indigo-600">{item.customDesign.font}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {item.customDesign.image && (
                                    <a
                                      href={item.customDesign.image}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download="front_card_design.png"
                                      className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 shrink-0"
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span>تحميل الوجه الأمامي</span>
                                    </a>
                                  )}
                                  {item.customDesign.backImage && (
                                    <a
                                      href={item.customDesign.backImage}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download="back_card_design_with_qr.png"
                                      className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[11px] font-bold hover:bg-slate-900 transition-colors flex items-center gap-1 shrink-0"
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span>تحميل الظهر (مدمج به الـ QR للطباعة)</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Generated Physical NFC Card Credentials */}
                          {cardsList.length > 0 && (
                            <div className="mt-2.5 p-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 to-purple-50/50 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                  بيانات برمجة وقفل الكارت الذكي NFC ({cardsList.length})
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  خاص بفريق التجهيز والعمليات
                                </span>
                              </div>

                              <div className="space-y-2">
                                {cardsList.map((card, cI) => {
                                  const nfcUrl = card.cardUrl || `https://thenith.com/c/${card.publicId}`;
                                  const passwordKey = `pwd-${idx}-${cI}`;
                                  const urlKey = `url-${idx}-${cI}`;
                                  const targetCardId = card.physicalCardId || card._id || card.cardId || card.publicId;

                                  return (
                                    <div
                                      key={cI}
                                      className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Link
                                          to={`/cards/${targetCardId}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="font-black font-mono text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer group"
                                          title="فتح تفاصيل الكارت في إدارة المنتجات والكروت الذكية"
                                        >
                                          <CreditCard className="w-3 h-3 text-indigo-600" />
                                          <span>{card.cardId || `كارت #${cI + 1}`}</span>
                                          <ExternalLink className="w-2.5 h-2.5 text-indigo-400 group-hover:text-indigo-600" />
                                        </Link>

                                        {card.color && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                                            <span
                                              className="w-2.5 h-2.5 rounded-full border border-black/10"
                                              style={{
                                                backgroundColor:
                                                  card.color.colorCode ||
                                                  (typeof card.color === "string" ? card.color : "#000"),
                                              }}
                                            />
                                            <span>
                                              {card.color.name?.ar ||
                                                card.color.name?.en ||
                                                (typeof card.color === "string" ? card.color : "")}
                                            </span>
                                          </span>
                                        )}

                                        {/* Password badge & copy */}
                                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                          <KeyRound className="w-3 h-3 text-slate-500" />
                                          <span className="text-slate-500 font-medium text-[10px]">باسورد القفل:</span>
                                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                                            {card.cardPassword}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(card.cardPassword, passwordKey)}
                                            className="p-0.5 hover:text-indigo-600 text-slate-400 transition-colors cursor-pointer"
                                            title="نسخ باسورد قفل الكارت"
                                          >
                                            {copiedKey === passwordKey ? (
                                              <Check className="w-3 h-3 text-emerald-600" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>

                                        {/* NFC URL badge & copy */}
                                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 max-w-xs truncate">
                                          <span className="text-indigo-600 font-mono text-[10px] truncate">{nfcUrl}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopy(nfcUrl, urlKey)}
                                            className="p-0.5 hover:text-indigo-600 text-slate-400 transition-colors cursor-pointer shrink-0"
                                            title="نسخ رابط برمجة NFC"
                                          >
                                            {copiedKey === urlKey ? (
                                              <Check className="w-3 h-3 text-emerald-600" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                          <a
                                            href={nfcUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-0.5 hover:text-indigo-600 text-slate-400 transition-colors shrink-0"
                                            title="فتح الرابط للتجربة"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
                                        <Link
                                          to={`/cards/${targetCardId}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                          title="فتح تفاصيل الكارت في إدارة المنتجات والكروت الذكية"
                                        >
                                          <CreditCard className="w-3 h-3 text-indigo-600" />
                                          <span>إدارة الكارت في إدارة الكروت</span>
                                          <ExternalLink className="w-2.5 h-2.5 text-indigo-500" />
                                        </Link>
                                        <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          جاهز للبرمجة والقفل
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 align-top">{item.price} ج.م</td>
                      <td className="py-3 px-4 text-indigo-600 font-bold align-top">{item.quantity}x</td>
                      <td className="py-3 px-4 font-bold text-slate-800 align-top">
                        {item.price * item.quantity} ج.م
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Admin Checkout Modal ──────────────────────────────────────────────────────

function AdminCheckoutModal({ cart, setCart, onClose, shippingRates, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [selectedGov, setSelectedGov] = useState("");
  const [shippingCost, setShippingCost] = useState(0);

  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.adminQty, 0);
  const finalTotal = totalPrice + shippingCost;

  const handleGovChange = (e) => {
    const govId = e.target.value;
    setSelectedGov(govId);
    const rate = shippingRates.find((r) => r._id === govId);
    setShippingCost(rate ? rate.cost : 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.target);
      const govRate = shippingRates.find((r) => r._id === selectedGov);
      
      const orderData = {
        customer: {
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          address: formData.get("address"),
          city: govRate ? govRate.governorateAr : "Unknown",
          country: "مصر",
        },
        items: cart.map(item => ({
          productId: item._id,
          name: typeof item.name === 'string' ? parseLocalizedName(item.name) : item.name?.ar,
          price: item.price,
          quantity: item.adminQty
        })),
        totalAmount: finalTotal,
        paymentMethod: formData.get("paymentMethod")
      };

      const apiClient = (await import("../api/client.js")).default;
      await apiClient.post("/checkout/order", orderData);
      
      alert("تم إنشاء الطلب بنجاح!");
      setCart([]);
      onSaved();
      onClose();
    } catch (err) {
      alert("حدث خطأ أثناء إتمام الطلب.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="إتمام طلب المشرف" onClose={onClose} wide>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الاسم بالكامل</label>
            <input required type="text" name="name" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">رقم التليفون</label>
              <input required type="text" name="phone" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني (اختياري)</label>
              <input type="email" name="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">المحافظة</label>
            <select required value={selectedGov} onChange={handleGovChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
              <option value="" disabled>اختر المحافظة</option>
              {shippingRates.map((rate) => (
                <option key={rate._id} value={rate._id}>{rate.governorateAr}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">العنوان بالتفصيل</label>
            <input required type="text" name="address" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">طريقة الدفع</label>
            <select name="paymentMethod" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
              <option value="cash_on_delivery">الدفع عند الاستلام</option>
              <option value="online">دفع إلكتروني</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-4 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الطلب"}
          </button>
        </form>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <h4 className="font-bold text-slate-800 mb-3">المنتجات في السلة</h4>
          <div className="space-y-3 mb-4">
            {cart.map((item) => (
              <div key={item._id} className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="font-bold text-indigo-600 ml-2">{item.adminQty}x</span>
                  {typeof item.name === 'string' ? parseLocalizedName(item.name) : item.name?.ar}
                </div>
                <div className="text-sm font-bold text-slate-700">{item.price * item.adminQty} ج.م</div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>المجموع:</span>
              <span>{totalPrice} ج.م</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>الشحن:</span>
              <span>{shippingCost} ج.م</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-slate-800 pt-2 border-t border-slate-200">
              <span>الإجمالي:</span>
              <span className="text-indigo-600">{finalTotal} ج.م</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main StoreManager ────────────────────────────────────────────────────────


export default function StoreManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const targetOrderParam = searchParams.get("order") || searchParams.get("orderNumber");

  const [activeTab, setActiveTab] = useState(
    targetOrderParam || urlTab === "orders" ? "orders" : urlTab || "stats"
  );

  // Data
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [shippingRates, setShippingRates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRevenue, setShowRevenue] = useState(() => {
    try {
      return localStorage.getItem("admin_show_store_revenue") !== "false";
    } catch {
      return true;
    }
  });

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteProductItem, setDeleteProductItem] = useState(null);
  const [addCategoryModal, setAddCategoryModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [deleteCategoryItem, setDeleteCategoryItem] = useState(null);
  const [selectedProductCategory, setSelectedProductCategory] = useState("all");
  const [orderToUpdate, setOrderToUpdate] = useState(null);
  const [deleteOrderConfirm, setDeleteOrderConfirm] = useState(null);
  const [viewOrderDetails, setViewOrderDetails] = useState(null);
  const [editShippingRate, setEditShippingRate] = useState(null);
  const [deleteShippingRateItem, setDeleteShippingRateItem] = useState(null);
  const [addShippingRateModal, setAddShippingRateModal] = useState(false);
  const [bulkCostModal, setBulkCostModal] = useState(false);
  const [shippingViewMode, setShippingViewMode] = useState("grid"); // 'grid' | 'list'
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState("");
  
  const [adminCart, setAdminCart] = useState([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, o, s, conf, rates, cats] = await Promise.all([
        fetchProducts(),
        fetchOrders(),
        fetchStoreStats(),
        fetchStoreSettings(),
        fetchShippingRates(),
        fetchCategories().catch(() => []),
      ]);
      setProducts(p);
      setOrders(o);
      setStats(s);
      setStoreSettings(conf);
      setShippingRates(rates);
      setCategories(cats || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // URL tab and order query listener
  useEffect(() => {
    if (targetOrderParam) {
      setActiveTab("orders");
      setOrderFilter("all");
    } else if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab, targetOrderParam]);

  // Automatically find and open order details when targeted via URL
  useEffect(() => {
    if (!targetOrderParam || !orders || orders.length === 0) return;
    const cleanTarget = targetOrderParam.replace(/^#/, "").trim().toLowerCase();
    const matched = orders.find((o) => {
      const num = (o.orderNumber || "").replace(/^#/, "").trim().toLowerCase();
      const id = (o._id || "").toString().toLowerCase();
      return num === cleanTarget || id === cleanTarget;
    });

    if (matched) {
      setViewOrderDetails(matched);
    }
  }, [targetOrderParam, orders]);

  const handleCloseOrderDetails = () => {
    setViewOrderDetails(null);
    if (targetOrderParam) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("order");
      nextParams.delete("orderNumber");
      setSearchParams(nextParams, { replace: true });
    }
  };

  // Product Actions
  const handleCreateProduct = async (form) => {
    setActionLoading(true);
    setFormError("");
    try {
      await createProduct(form);
      setAddModal(false);
      loadData();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setActionLoading(false);
    }
  };
  const handleUpdateProduct = async (form) => {
    setActionLoading(true);
    setFormError("");
    try {
      await updateProduct(editProduct._id, form);
      setEditProduct(null);
      loadData();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setActionLoading(false);
    }
  };
  const handleDeleteProduct = async () => {
    setActionLoading(true);
    try {
      await deleteProduct(deleteProductItem._id);
      setDeleteProductItem(null);
      loadData();
    } catch (e) {
    } finally {
      setActionLoading(false);
    }
  };

  // Category Actions
  const handleCreateCategory = async (form) => {
    setActionLoading(true);
    setFormError("");
    try {
      await createCategory(form);
      setAddCategoryModal(false);
      loadData();
    } catch (e) {
      setFormError(e.message || "فشل إنشاء الفئة");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCategory = async (form) => {
    setActionLoading(true);
    setFormError("");
    try {
      await updateCategory(editCategory._id, form);
      setEditCategory(null);
      loadData();
    } catch (e) {
      setFormError(e.message || "فشل تحديث الفئة");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    setActionLoading(true);
    try {
      await deleteCategory(deleteCategoryItem._id);
      setDeleteCategoryItem(null);
      loadData();
    } catch (e) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    setActionLoading(true);
    try {
      await deleteOrder(deleteOrderConfirm._id);
      setDeleteOrderConfirm(null);
      loadData();
    } catch (e) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateShippingRate = async (form) => {
    setActionLoading(true);
    try {
      await createShippingRate(form);
      setAddShippingRateModal(false);
      loadData();
    } catch (e) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateShippingRate = async (form) => {
    setActionLoading(true);
    try {
      await updateShippingRate(editShippingRate._id, form);
      setEditShippingRate(null);
      loadData();
    } catch (e) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteShippingRate = async () => {
    setActionLoading(true);
    try {
      await deleteShippingRate(deleteShippingRateItem._id);
      setDeleteShippingRateItem(null);
      loadData();
    } catch (e) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleGlobalShippingMode = async (mode, cost = 0) => {
    setActionLoading(true);
    try {
      const newSettings = {
        ...storeSettings,
        globalShippingMode: mode,
        globalShippingCost: cost,
      };
      await updateStoreSettings(newSettings);
      setStoreSettings(newSettings);
      if (mode === "fixed") setBulkCostModal(false);
      alert("تم تحديث إعدادات الشحن بنجاح");
    } catch (e) {
      alert("حدث خطأ أثناء التحديث");
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { id: "stats", label: "الإحصائيات", icon: TrendingUp },
    { id: "orders", label: "الطلبات", icon: ShoppingBag },
    { id: "products", label: "المنتجات والمخزون", icon: Store },
    { id: "categories", label: "فئات المتجر", icon: LayoutGrid },
    { id: "shipping", label: "أسعار الشحن", icon: Truck },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Tabs */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">إدارة المتجر</h2>
        <p className="text-slate-500 mt-1">
          نظام متكامل لإدارة منتجاتك، طلباتك، ومخزونك.
        </p>
        <div className="flex gap-2 mt-6 bg-slate-200/50 p-1.5 rounded-2xl w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  if (t.id !== "orders") setOrderFilter("all");
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === t.id
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading && !stats ? (
        <div className="py-24 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {/* STATS TAB */}
          {activeTab === "stats" && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-slate-500">
                      إيرادات الشهر الحالي
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !showRevenue;
                        setShowRevenue(next);
                        try {
                          localStorage.setItem("admin_show_store_revenue", String(next));
                        } catch {}
                      }}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title={showRevenue ? "إخفاء الإيرادات" : "إظهار الإيرادات"}
                    >
                      {showRevenue ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                    </button>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black text-slate-800 tracking-tight">
                      {showRevenue
                        ? Number(stats.revenue.thisMonth || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })
                        : "••••••"}
                    </p>
                    {showRevenue && (
                      <span className="text-sm font-normal text-slate-400">
                        ج.م
                      </span>
                    )}
                  </div>
                  <div
                    className={`mt-2 flex items-center gap-1 text-xs font-bold ${stats.revenue.growth >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    <TrendingUp
                      className={`w-3 h-3 ${stats.revenue.growth < 0 ? "rotate-180" : ""}`}
                    />
                    <span>
                      {Math.abs(stats.revenue.growth).toFixed(1)}% عن الشهر
                      الماضي
                    </span>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-bold text-slate-500 mb-1">
                    الطلبات المسلّمة
                  </p>
                  <p className="text-3xl font-black text-slate-800">
                    {stats.statusCounts.delivered || 0}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-500 mb-1">
                        الطلبات المرتجعة
                      </p>
                      <p className="text-3xl font-black text-slate-800">
                        {stats.statusCounts.returned || 0}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-bold text-rose-500 mb-1">
                        منسحبين من الدفع
                      </p>
                      <p 
                        className="text-2xl font-black text-rose-600 cursor-pointer hover:underline" 
                        onClick={() => {
                          setOrderFilter("abandoned");
                          setActiveTab("orders");
                        }}
                        title="عملاء بدأوا الدفع ولم يكملوه"
                      >
                        {stats.abandonedOrdersCount || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
                  <p className="text-sm font-bold text-amber-600 mb-1">
                    تنبيهات المخزون
                  </p>
                  <div className="flex justify-between items-end mt-2">
                    <div>
                      <p className="text-2xl font-black text-amber-700">
                        {stats.inventory.lowStock}
                      </p>
                      <p className="text-xs text-amber-600 font-medium">
                        على وشك النفاذ (أقل من 5)
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-rose-600">
                        {stats.inventory.outOfStock}
                      </p>
                      <p className="text-xs text-rose-500 font-medium">
                        نفذت تماماً
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" /> أكثر
                  المنتجات مبيعاً
                </h3>
                {stats.topProducts.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-6">
                    لا توجد مبيعات بعد
                  </p>
                ) : (
                  <div className="space-y-4">
                    {stats.topProducts.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">
                            #{i + 1}
                          </div>
                          <p className="font-bold text-slate-700">
                            {typeof p.name === 'string' ? parseLocalizedName(p.name) : p.name?.ar || p.name?.en}
                          </p>
                        </div>
                        <div className="text-start">
                          <p className="font-black text-slate-800">
                            {p.count}{" "}
                            <span className="text-xs font-normal text-slate-400">
                              قطعة
                            </span>
                          </p>
                          <p className="text-xs text-emerald-600 font-bold">
                            +{showRevenue ? Number(p.revenue || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "•••"} ج.م
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === "orders" && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">
                  {orderFilter === "abandoned" ? "الطلبات المنسحبة من الدفع (Unpaid Online)" : "كل الطلبات"}
                </h3>
                {orderFilter === "abandoned" && (
                  <button onClick={() => setOrderFilter("all")} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition-colors">
                    عرض كل الطلبات
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-end">
                  <thead>
                    <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 bg-slate-50/50">
                      <th className="py-3 px-5">رقم الطلب</th>
                      <th className="py-3 px-5">العميل</th>
                      <th className="py-3 px-5">المنتجات</th>
                      <th className="py-3 px-5">التاريخ</th>
                      <th className="py-3 px-5">الإجمالي</th>
                      <th className="py-3 px-5">الدفع</th>
                      <th className="py-3 px-5">الحالة</th>
                      <th className="py-3 px-5 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const filteredOrders = orders.filter((o) => {
                        if (orderFilter === "abandoned") {
                          return o.paymentMethod !== "cash_on_delivery" && 
                                 ["pending", "cancelled"].includes(o.paymentStatus) &&
                                 !["delivered", "shipped", "returned"].includes(o.status);
                        }
                        return !o.isDraft;
                      });

                      if (filteredOrders.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                              {orderFilter === "abandoned" ? "لا توجد طلبات منسحبة" : "لا توجد طلبات بعد"}
                            </td>
                          </tr>
                        );
                      }

                      return filteredOrders.map((order) => {
                        const statusObj = ORDER_STATUS_MAP[order.status];
                        const StatusIcon = statusObj.icon;
                        const isTargetOrder = targetOrderParam && (
                          (order.orderNumber || "").replace(/^#/, "").toLowerCase() === targetOrderParam.replace(/^#/, "").toLowerCase() ||
                          (order._id || "").toString().toLowerCase() === targetOrderParam.toLowerCase()
                        );
                        return (
                          <tr
                            key={order._id}
                            className={`transition-colors ${
                              isTargetOrder
                                ? "bg-amber-100/70 hover:bg-amber-100 ring-2 ring-amber-400"
                                : "hover:bg-slate-50/50"
                            }`}
                          >
                            <td
                              className="py-4 px-5 font-mono text-sm font-bold text-slate-700 hover:text-indigo-600 hover:underline cursor-pointer"
                              onClick={() => setViewOrderDetails(order)}
                              title="اضغط لعرض تفاصيل الطلب كاملة"
                            >
                              #{order.orderNumber?.replace(/^#/, "")}
                            </td>
                            <td className="py-4 px-5">
                              <p className="font-bold text-slate-800 text-sm">
                                {order.customer?.name}
                              </p>
                              <p className="text-xs text-slate-500" dir="ltr">
                                {order.customer?.phone}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1 whitespace-normal break-words leading-relaxed max-w-[250px]">
                                {order.customer?.address} - {order.customer?.city}
                              </p>
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex flex-col gap-1 max-w-[240px]">
                                {order.items?.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600 truncate" title={`${item.quantity}x ${typeof item.name === 'string' ? parseLocalizedName(item.name) : item.name?.ar}`}>
                                    {(item.selectedImage || item.image) && (
                                      <img src={item.selectedImage || item.image} alt="" className="w-5 h-5 rounded object-cover border border-slate-200 shrink-0" />
                                    )}
                                    <span className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded">{item.quantity}x</span> 
                                    <span className="truncate">{typeof item.name === 'string' ? parseLocalizedName(item.name) : item.name?.ar}</span>
                                    {item.selectedImageId && (
                                      <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1 rounded shrink-0">{item.selectedImageId}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-5 text-sm text-slate-500">
                              {new Date(order.createdAt).toLocaleDateString(
                                "ar-EG-u-nu-latn",
                              )}
                            </td>
                            <td className="py-4 px-5 font-black text-slate-800 text-sm">
                              {order.totalAmount} ج.م
                            </td>
                            <td className="py-4 px-5">
                              <Badge variant={getPaymentMethodInfo(order.paymentMethod).color}>
                                {getPaymentMethodInfo(order.paymentMethod).label}
                              </Badge>
                            </td>
                            <td className="py-4 px-5">
                              <Badge variant={statusObj.color}>
                                <div className="flex items-center gap-1.5">
                                  <StatusIcon className="w-3 h-3" />{" "}
                                  {statusObj.label}
                                </div>
                              </Badge>
                              {order.status === "returned" &&
                                order.returnReason && (
                                  <p
                                    className="text-[10px] text-rose-500 mt-1 max-w-[120px] truncate"
                                    title={order.returnReason}
                                  >
                                    السبب: {order.returnReason}
                                  </p>
                                )}
                            </td>
                            <td className="py-4 px-5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setViewOrderDetails(order)}
                                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" /> التفاصيل
                                </button>
                                <button
                                  onClick={() => setOrderToUpdate(order)}
                                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" /> تحديث
                                </button>
                                <button
                                  onClick={() => setDeleteOrderConfirm(order)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="حذف الطلب نهائياً"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === "products" && (() => {
            const displayedProducts = selectedProductCategory === "all"
              ? products
              : products.filter((p) => {
                  const pCat = typeof p.category === "object" && p.category !== null ? (p.category.name?.ar || p.category.slug || p.category._id) : p.category;
                  return pCat === selectedProductCategory;
                });

            return (
              <div>
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                  <button
                    onClick={() => setIsCheckoutModalOpen(true)}
                    disabled={adminCart.length === 0}
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="w-5 h-5" /> السلة 
                    {adminCart.length > 0 && `(${adminCart.length})`}
                  </button>
                  <button
                    onClick={() => {
                      setFormError("");
                      setAddModal(true);
                    }}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-5 h-5" /> إضافة منتج
                  </button>
                </div>

                {/* Categories Filter Pills */}
                {categories.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setSelectedProductCategory("all")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        selectedProductCategory === "all"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      كل الفئات ({products.length})
                    </button>
                    {categories.map((c) => {
                      const cName = typeof c.name === "object" ? c.name.ar || c.name.en : c.name;
                      const count = products.filter((p) => {
                        const pCat = typeof p.category === "object" && p.category !== null ? (p.category.name?.ar || p.category.slug || p.category._id) : p.category;
                        return pCat === cName || pCat === c.slug || pCat === c._id;
                      }).length;
                      return (
                        <button
                          key={c._id || c.id || cName}
                          type="button"
                          onClick={() => setSelectedProductCategory(cName)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                            selectedProductCategory === cName
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          {cName} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {displayedProducts.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center text-center gap-4">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400">
                      <PackageSearch className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1">
                        لا توجد منتجات
                      </h3>
                      <p className="text-slate-500 text-sm">
                        {selectedProductCategory !== "all"
                          ? `لا توجد منتجات تحت فئة "${selectedProductCategory}"`
                          : "أضف منتجك الأول لتبدأ البيع"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayedProducts.map((product) => (
                      <div
                        key={product._id}
                        className={`bg-white rounded-2xl border ${product.quantity === 0 ? "border-rose-200" : "border-slate-200"} shadow-sm overflow-hidden flex flex-col group relative`}
                      >
                        {product.quantity === 0 && (
                          <div className="absolute top-2 start-2 z-10 px-2 py-1 bg-rose-500 text-white text-[10px] font-black rounded flex items-center gap-1">
                            <PackageX className="w-3 h-3" /> نفذت الكمية
                          </div>
                        )}
                        {product.isCustomizable && (
                          <div className="absolute top-2 end-2 z-10 px-2 py-1 bg-indigo-600 text-white text-[10px] font-black rounded flex items-center gap-1 shadow-sm border border-indigo-400">
                            <Sparkles className="w-3 h-3 text-amber-300" /> كارت مخصص
                          </div>
                        )}
                        <div className="absolute bottom-2 start-2 z-10 px-2 py-0.5 bg-slate-900/85 backdrop-blur-md text-indigo-300 text-[10px] font-mono rounded border border-white/10 shadow-xs">
                          NFC: {product.nfcChipType || "NTAG215"}
                        </div>
                        <div className="aspect-[4/3] bg-slate-100 relative">
                          {product.images?.[0] ? (
                            <img
                              src={typeof product.images[0] === 'object' ? product.images[0]?.url : product.images[0]}
                              alt={typeof product.name === 'string' ? parseLocalizedName(product.name) : product.name?.ar}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ImageIcon className="w-10 h-10" />
                            </div>
                          )}
                          {!product.isActive && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                              <span className="bg-slate-800 text-white px-3 py-1 rounded-lg text-sm font-bold">
                                غير متاح
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="flex-1">
                            <h3
                              className="font-bold text-slate-800 line-clamp-1"
                              title={typeof product.name === 'string' ? parseLocalizedName(product.name) : product.name?.ar}
                            >
                              {typeof product.name === 'string' ? parseLocalizedName(product.name) : product.name?.ar}
                            </h3>
                            <p className="text-slate-500 text-sm line-clamp-2 mt-1 min-h-[40px]">
                              {typeof product.description === 'string' ? product.description : product.description?.ar}
                            </p>
                            {product.category && (
                              <div className="mt-1.5">
                                <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                  {typeof product.category === 'object' ? (product.category.name?.ar || product.category.name?.en) : product.category}
                                </span>
                              </div>
                            )}
                            {Array.isArray(product.colors) && product.colors.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <span className="text-[11px] text-slate-400 font-bold">الألوان:</span>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {product.colors.map((c, cIdx) => (
                                    <span
                                      key={cIdx}
                                      className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs inline-block"
                                      style={{ backgroundColor: c.colorCode || "#111827" }}
                                      title={c.name || c.colorCode}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between">
                            <div>
                              <p className="text-xs text-slate-400">السعر</p>
                              <p className="font-black text-slate-800 text-lg">
                                {product.price}{" "}
                                <span className="text-xs font-normal">ج.م</span>
                              </p>
                            </div>
                            <div className="text-start">
                              <p className="text-xs text-slate-400">الكمية</p>
                              <p className="font-bold text-slate-700">
                                {product.quantity}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 border-t border-slate-100 bg-slate-50 flex gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              const exists = adminCart.find(item => item._id === product._id);
                              if (exists) {
                                setAdminCart(adminCart.map(item => item._id === product._id ? { ...item, adminQty: item.adminQty + 1 } : item));
                              } else {
                                setAdminCart([...adminCart, { ...product, adminQty: 1 }]);
                              }
                            }}
                            className="w-full mb-1 py-2 flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> أضف للسلة
                          </button>
                          <button
                            onClick={() => {
                              setFormError("");
                              setEditProduct(product);
                            }}
                            className="flex-1 py-2 flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" /> تعديل
                          </button>
                          <button
                            onClick={() => setDeleteProductItem(product)}
                            className="flex-1 py-2 flex items-center justify-center gap-1 text-xs font-bold text-rose-600 bg-rose-100 rounded-lg hover:bg-rose-200 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> حذف
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* CATEGORIES TAB */}
          {activeTab === "categories" && (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-indigo-600" />
                    فئات وأقسام المتجر
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    قم بإضافة وتنظيم فئات المنتجات لتسهيل تصفحها على العملاء في المتجر
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFormError("");
                    setAddCategoryModal(true);
                  }}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> إضافة فئة جديدة
                </button>
              </div>

              {categories.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                    <LayoutGrid className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base mb-1">
                      لا توجد فئات حالياً
                    </h4>
                    <p className="text-slate-500 text-sm max-w-md">
                      أضف فئات لتقسيم منتجاتك (مثل: بطاقات معدنية، بطاقات مخصصة، كروت ذكية)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFormError("");
                      setAddCategoryModal(true);
                    }}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    + إضافة أول فئة
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {categories.map((category) => {
                    const cNameAr = typeof category.name === "object" ? category.name.ar : category.name;
                    const cNameEn = typeof category.name === "object" ? category.name.en : "";
                    const cDescAr = typeof category.description === "object" ? category.description.ar : category.description;
                    const cDescEn = typeof category.description === "object" ? category.description.en : "";
                    const productCount = products.filter((p) => {
                      const pCat = typeof p.category === "object" && p.category !== null ? (p.category.name?.ar || p.category.slug || p.category._id) : p.category;
                      return pCat === cNameAr || pCat === category.slug || pCat === category._id;
                    }).length;

                    return (
                      <div
                        key={category._id || category.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              {category.image ? (
                                <img
                                  src={category.image}
                                  alt={cNameAr}
                                  className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-xs shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
                                  <LayoutGrid className="w-6 h-6" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-slate-800 text-base">
                                  {cNameAr}
                                </h4>
                                {cNameEn && cNameEn !== cNameAr && (
                                  <p className="text-xs text-slate-400 font-medium">
                                    {cNameEn}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                category.isActive !== false
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}
                            >
                              {category.isActive !== false ? "مفعلة" : "مخفية"}
                            </span>
                          </div>

                          {(cDescAr || cDescEn) && (
                            <p className="text-xs text-slate-500 line-clamp-2 mb-3 min-h-[32px]">
                              {cDescAr || cDescEn}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                            <span className="font-medium">
                              المنتجات المرتبطة: <strong className="text-slate-800">{productCount}</strong>
                            </span>
                            {category.slug && (
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                #{category.slug}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setFormError("");
                              setEditCategory(category);
                            }}
                            className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> تعديل
                          </button>
                          <button
                            onClick={() => setDeleteCategoryItem(category)}
                            className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> حذف
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SHIPPING TAB */}
          {activeTab === "shipping" && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={storeSettings?.globalShippingMode === "free"}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleGlobalShippingMode("free");
                        } else {
                          handleGlobalShippingMode("default");
                        }
                      }}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-sm text-slate-700">شحن مجاني للكل</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={storeSettings?.globalShippingMode === "fixed"}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkCostModal(true);
                        } else {
                          handleGlobalShippingMode("default");
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-sm text-slate-700">سعر ثابت للكل</span>
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setShippingViewMode("grid")}
                      className={`p-1.5 rounded-md transition-colors ${shippingViewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShippingViewMode("list")}
                      className={`p-1.5 rounded-md transition-colors ${shippingViewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => setAddShippingRateModal(true)}
                    className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" /> إضافة محافظة
                  </button>
                </div>
              </div>

              {shippingViewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {shippingRates.map((rate) => {
                    let displayCost = rate.cost;
                    if (storeSettings?.globalShippingMode === "free") displayCost = 0;
                    else if (storeSettings?.globalShippingMode === "fixed") displayCost = storeSettings.globalShippingCost;

                    return (
                    <div
                      key={rate._id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative group hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">
                            {rate.governorateAr}
                          </h3>
                          <p className="text-sm font-medium text-slate-500">
                            {rate.governorate}
                          </p>
                        </div>
                        <Badge variant={rate.isActive ? "green" : "slate"}>
                          {rate.isActive ? "مفعل" : "معطل"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                        {displayCost === 0 ? (
                          <p className="text-2xl font-black text-emerald-500">مجاني</p>
                        ) : (
                          <p className="text-2xl font-black text-indigo-600">
                            {displayCost} <span className="text-sm font-normal text-slate-400">ج.م</span>
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditShippingRate(rate)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteShippingRateItem(rate)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )})}
                  {shippingRates.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 border border-slate-200 border-dashed rounded-3xl">
                      <Truck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد أسعار شحن</h3>
                      <p className="text-slate-500 max-w-sm mx-auto mb-6">لم تقم بإضافة أي محافظات لتحديد أسعار الشحن بعد.</p>
                      <button
                        onClick={() => setAddShippingRateModal(true)}
                        className="bg-white border border-slate-200 text-indigo-600 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-50 flex items-center gap-2 shadow-sm transition-all mx-auto"
                      >
                        <Plus className="w-5 h-5" /> إضافة محافظة
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-end">
                    <thead>
                      <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 bg-slate-50/50">
                        <th className="py-3 px-5 text-start">المحافظة</th>
                        <th className="py-3 px-5">تكلفة الشحن</th>
                        <th className="py-3 px-5">الحالة</th>
                        <th className="py-3 px-5 text-start w-24">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shippingRates.map((rate) => {
                        let displayCost = rate.cost;
                        if (storeSettings?.globalShippingMode === "free") displayCost = 0;
                        else if (storeSettings?.globalShippingMode === "fixed") displayCost = storeSettings.globalShippingCost;

                        return (
                        <tr key={rate._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-5 text-start">
                            <p className="font-bold text-slate-800">{rate.governorateAr}</p>
                            <p className="text-xs text-slate-500">{rate.governorate}</p>
                          </td>
                          <td className="py-3 px-5">
                            {displayCost === 0 ? (
                              <Badge variant="green">مجاني</Badge>
                            ) : (
                              <span className="font-bold text-slate-700">{displayCost} ج.م</span>
                            )}
                          </td>
                          <td className="py-3 px-5">
                            <Badge variant={rate.isActive ? "green" : "slate"}>
                              {rate.isActive ? "مفعل" : "معطل"}
                            </Badge>
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditShippingRate(rate)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteShippingRateItem(rate)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )})}
                      {shippingRates.length === 0 && (
                        <tr>
                          <td colSpan="4" className="py-12 text-center text-slate-500">
                            لا توجد محافظات مضافة.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && storeSettings && (
            <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">
                    الضرائب (نسبة مئوية %)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={storeSettings.taxRate}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        taxRate: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700">
                      مناطق وتكاليف الشحن
                    </label>
                    <button
                      onClick={() =>
                        setStoreSettings({
                          ...storeSettings,
                          shippingZones: [
                            ...storeSettings.shippingZones,
                            {
                              id: Date.now().toString(),
                              name: "",
                              cost: 0,
                              isActive: true,
                            },
                          ],
                        })
                      }
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> إضافة منطقة
                    </button>
                  </div>
                  {storeSettings.shippingZones.map((zone, idx) => (
                    <div key={zone.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="اسم المنطقة (مثال: القاهرة)"
                        value={zone.name}
                        onChange={(e) => {
                          const newZones = [...storeSettings.shippingZones];
                          newZones[idx].name = e.target.value;
                          setStoreSettings({
                            ...storeSettings,
                            shippingZones: newZones,
                          });
                        }}
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <input
                        type="number"
                        placeholder="التكلفة (ج.م)"
                        value={zone.cost}
                        onChange={(e) => {
                          const newZones = [...storeSettings.shippingZones];
                          newZones[idx].cost = Number(e.target.value);
                          setStoreSettings({
                            ...storeSettings,
                            shippingZones: newZones,
                          });
                        }}
                        className="w-24 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        onClick={() => {
                          const newZones = storeSettings.shippingZones.filter(
                            (z) => z.id !== zone.id,
                          );
                          setStoreSettings({
                            ...storeSettings,
                            shippingZones: newZones,
                          });
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 pt-4">
                  <label className="text-sm font-bold text-slate-700">
                    سياسة المتجر والاسترجاع
                  </label>
                  <textarea
                    rows={4}
                    value={storeSettings.storePolicy}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        storePolicy: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
                <button
                  onClick={async () => {
                    setActionLoading(true);
                    try {
                      await updateStoreSettings(storeSettings);
                      alert("تم حفظ الإعدادات بنجاح");
                    } catch (e) {
                      alert(e.message);
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  disabled={actionLoading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}{" "}
                  حفظ الإعدادات
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {addShippingRateModal && (
        <Modal title="إضافة أسعار محافظة" onClose={() => setAddShippingRateModal(false)}>
          <ShippingRateForm
            onSave={handleCreateShippingRate}
            onCancel={() => setAddShippingRateModal(false)}
            saving={actionLoading}
          />
        </Modal>
      )}
      {editShippingRate && (
        <Modal title="تعديل أسعار محافظة" onClose={() => setEditShippingRate(null)}>
          <ShippingRateForm
            initial={editShippingRate}
            onSave={handleUpdateShippingRate}
            onCancel={() => setEditShippingRate(null)}
            saving={actionLoading}
          />
        </Modal>
      )}
      {deleteShippingRateItem && (
        <Modal title="تأكيد الحذف" onClose={() => setDeleteShippingRateItem(null)}>
          <div className="space-y-4">
            <p className="text-slate-600">هل أنت متأكد من حذف أسعار الشحن لمحافظة {deleteShippingRateItem.governorateAr}؟</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteShippingRateItem(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">إلغاء</button>
              <button onClick={handleDeleteShippingRate} disabled={actionLoading} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl">
                {actionLoading ? "جاري الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {bulkCostModal && (
        <Modal title="تحديد سعر ثابت لكل المحافظات" onClose={() => setBulkCostModal(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGlobalShippingMode("fixed", Number(e.target.cost.value));
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                تكلفة الشحن لجميع المحافظات (ج.م)
              </label>
              <input
                type="number"
                name="cost"
                required
                min="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setBulkCostModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                تأكيد التحديث
              </button>
            </div>
          </form>
        </Modal>
      )}

      {addModal && (
        <Modal title="إضافة منتج جديد" onClose={() => setAddModal(false)} wide>
          <ProductForm
            categories={categories}
            onCategoryCreated={(newCat) => setCategories((prev) => [...prev, newCat])}
            onSave={handleCreateProduct}
            onCancel={() => setAddModal(false)}
            saving={actionLoading}
            error={formError}
          />
        </Modal>
      )}
      {editProduct && (
        <Modal title="تعديل منتج" onClose={() => setEditProduct(null)} wide>
          <ProductForm
            initial={editProduct}
            categories={categories}
            onCategoryCreated={(newCat) => setCategories((prev) => [...prev, newCat])}
            onSave={handleUpdateProduct}
            onCancel={() => setEditProduct(null)}
            saving={actionLoading}
            error={formError}
          />
        </Modal>
      )}
      {addCategoryModal && (
        <Modal title="إضافة فئة جديدة للمتجر" onClose={() => setAddCategoryModal(false)}>
          <CategoryForm
            onSave={handleCreateCategory}
            onCancel={() => setAddCategoryModal(false)}
            saving={actionLoading}
            error={formError}
          />
        </Modal>
      )}
      {editCategory && (
        <Modal title="تعديل الفئة" onClose={() => setEditCategory(null)}>
          <CategoryForm
            initial={editCategory}
            onSave={handleUpdateCategory}
            onCancel={() => setEditCategory(null)}
            saving={actionLoading}
            error={formError}
          />
        </Modal>
      )}
      {deleteCategoryItem && (
        <ConfirmModal
          message={`هل أنت متأكد من حذف فئة "${deleteCategoryItem.name?.ar || deleteCategoryItem.name?.en || 'هذه الفئة'}"؟`}
          onConfirm={handleDeleteCategory}
          onCancel={() => setDeleteCategoryItem(null)}
          loading={actionLoading}
        />
      )}
      {deleteProductItem && (
        <ConfirmModal
          message={`حذف "${typeof deleteProductItem.name === 'string' ? parseLocalizedName(deleteProductItem.name) : deleteProductItem.name?.ar || deleteProductItem.name?.en}"؟`}
          onConfirm={handleDeleteProduct}
          onCancel={() => setDeleteProductItem(null)}
          loading={actionLoading}
        />
      )}
      {deleteOrderConfirm && (
        <ConfirmModal
          message={`هل أنت متأكد من حذف الطلب رقم ${deleteOrderConfirm.orderNumber} بشكل نهائي؟`}
          onConfirm={handleDeleteOrder}
          onCancel={() => setDeleteOrderConfirm(null)}
          loading={actionLoading}
        />
      )}
      {orderToUpdate && (
        <OrderStatusModal
          order={orderToUpdate}
          onClose={() => setOrderToUpdate(null)}
          onSaved={loadData}
        />
      )}
      {viewOrderDetails && (
        <OrderDetailsModal
          order={viewOrderDetails}
          onClose={handleCloseOrderDetails}
        />
      )}
      {isCheckoutModalOpen && (
        <AdminCheckoutModal
          cart={adminCart}
          setCart={setAdminCart}
          onClose={() => setIsCheckoutModalOpen(false)}
          shippingRates={shippingRates}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
