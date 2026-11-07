import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../api/client.js";
import RichTextEditor from "../components/RichTextEditor.jsx";
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Loader2,
  AlertTriangle,
  Globe,
  Layers,
  ExternalLink,
  Sparkles,
  Languages,
} from "lucide-react";

export default function PoliciesManager() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reordering, setReordering] = useState(false);

  // Editor View State
  const [isEditing, setIsEditing] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [langTab, setLangTab] = useState("ar"); // "ar" | "en"
  const [form, setForm] = useState({
    title: { ar: "", en: "" },
    slug: "",
    description: { ar: "", en: "" },
    status: "draft",
    displayOrder: 0,
    sections: [],
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Modals
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [previewPolicy, setPreviewPolicy] = useState(null);
  const [previewLang, setPreviewLang] = useState("ar");
  const [notice, setNotice] = useState(null);

  // Helper to normalize bilingual object from API
  const getBilingual = (val) => {
    if (typeof val === "object" && val !== null) {
      return { ar: val.ar || "", en: val.en || "" };
    }
    const str = (val || "").toString();
    return { ar: str, en: "" };
  };

  // Fetch policies
  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/policies");
      if (res.data?.policies) {
        setPolicies(res.data.policies);
      }
    } catch (err) {
      console.error("Failed to load policies:", err);
      showNotice("تعذر تحميل صفحات السياسات", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const showNotice = (msg, type = "success") => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // Helper: auto-generate slug from English or Arabic title
  const generateSlugFromTitle = (titleObj) => {
    const text = typeof titleObj === "object" ? titleObj.en || titleObj.ar : titleObj;
    if (!text) return "";
    const lower = text.trim().toLowerCase();
    if (lower.includes("privacy") || lower.includes("خصوصي")) return "privacy-policy";
    if (lower.includes("terms") || lower.includes("condition") || lower.includes("شروط") || lower.includes("أحكام") || lower.includes("احكام")) return "terms-and-conditions";
    if (lower.includes("return") || lower.includes("refund") || lower.includes("استرجاع") || lower.includes("استبدال")) return "return-policy";
    if (lower.includes("shipping") || lower.includes("delivery") || lower.includes("شحن") || lower.includes("توصيل")) return "shipping-policy";
    if (lower.includes("usage") || lower.includes("استخدام")) return "usage-policy";

    return text
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\u0621-\u064A\-]/g, "")
      .replace(/\-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Open Editor for Create
  const handleOpenCreate = () => {
    const nextOrder = policies.length > 0 ? Math.max(...policies.map((p) => p.displayOrder || 0)) + 1 : 0;
    setCurrentPolicy(null);
    setLangTab("ar");
    setForm({
      title: { ar: "", en: "" },
      slug: "",
      description: { ar: "", en: "" },
      status: "draft",
      displayOrder: nextOrder,
      sections: [
        {
          heading: { ar: "المقدمة والبنود العامة", en: "General Terms & Introduction" },
          content: {
            ar: "<p>اكتب محتوى وبنود هذا القسم باللغة العربية هنا بالتفصيل...</p>",
            en: "<p>Write the details of this section in English here...</p>",
          },
          displayOrder: 0,
          isVisible: true,
        },
      ],
    });
    setFormError("");
    setIsDirty(false);
    setIsEditing(true);
  };

  // Open Editor for Edit
  const handleOpenEdit = async (policyId) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/admin/policies/${policyId}`);
      if (res.data?.policy) {
        const p = res.data.policy;
        setCurrentPolicy(p);
        setLangTab("ar");
        setForm({
          title: getBilingual(p.title),
          slug: p.slug || "",
          description: getBilingual(p.description),
          status: p.status || "draft",
          displayOrder: p.displayOrder ?? 0,
          sections: (p.sections || []).map((s, idx) => ({
            _id: s._id,
            heading: getBilingual(s.heading),
            content: getBilingual(s.content),
            displayOrder: s.displayOrder ?? idx,
            isVisible: s.isVisible !== false,
          })),
        });
        setFormError("");
        setIsDirty(false);
        setIsEditing(true);
      }
    } catch (err) {
      console.error("Failed to load policy for edit:", err);
      showNotice("تعذر فتح صفحة السياسة للتعديل", "error");
    } finally {
      setLoading(false);
    }
  };

  // Save Policy (Create or Update)
  const handleSavePolicy = async (targetStatus = null) => {
    if (!form.title.ar.trim() && !form.title.en.trim()) {
      setFormError("يرجى إدخال عنوان صفحة السياسة (بالعربية أو الإنجليزية)");
      return;
    }

    let finalSlug = form.slug.trim() || generateSlugFromTitle(form.title);
    if (!finalSlug) {
      setFormError("يرجى إدخال أو توليد رابط مخصص (Slug) صالح");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      ...form,
      slug: finalSlug,
      status: targetStatus || form.status,
    };

    try {
      if (currentPolicy?._id) {
        await apiClient.put(`/admin/policies/${currentPolicy._id}`, payload);
        showNotice("تم تحديث وحفظ صفحة السياسة بنجاح");
      } else {
        await apiClient.post("/admin/policies", payload);
        showNotice("تم إنشاء صفحة السياسة بنجاح");
      }
      setIsDirty(false);
      setIsEditing(false);
      fetchPolicies();
    } catch (err) {
      console.error("Save policy error:", err);
      const msg = err.response?.data?.error || "فشل حفظ صفحة السياسة";
      setFormError(msg);
      showNotice(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Quick Toggle Status from Table
  const handleToggleStatus = async (policy) => {
    try {
      const nextStatus = policy.status === "published" ? "draft" : "published";
      await apiClient.patch(`/admin/policies/${policy._id}/status`, { status: nextStatus });
      setPolicies((prev) =>
        prev.map((p) => (p._id === policy._id ? { ...p, status: nextStatus } : p))
      );
      showNotice(
        nextStatus === "published" ? "تم نشر السياسة وتفعيلها للجمهور" : "تم تحويل السياسة إلى مسودة"
      );
    } catch (err) {
      showNotice("تعذر تحديث حالة السياسة", "error");
    }
  };

  // Delete Policy
  const handleDeletePolicy = async () => {
    if (!deleteConfirmId) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/admin/policies/${deleteConfirmId}`);
      setPolicies((prev) => prev.filter((p) => p._id !== deleteConfirmId));
      showNotice("تم حذف صفحة السياسة بنجاح");
      setDeleteConfirmId(null);
    } catch (err) {
      showNotice("تعذر حذف صفحة السياسة", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Seed Defaults
  const handleSeedDefaults = async () => {
    try {
      setLoading(true);
      await apiClient.post("/admin/policies/seed-defaults?force=true");
      await fetchPolicies();
      showNotice("تم استعادة السياسات الافتراضية ثنائية اللغة بنجاح");
    } catch (err) {
      showNotice("تعذر استعادة السياسات", "error");
    } finally {
      setLoading(false);
    }
  };

  // Reorder Policies Up/Down
  const handleMovePolicy = async (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= policies.length) return;

    const reordered = [...policies];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    setPolicies(reordered);
    setReordering(true);

    try {
      const policyIds = reordered.map((p) => p._id);
      await apiClient.put("/admin/policies/reorder", { policyIds });
      showNotice("تم حفظ الترتيب الجديد للسياسات");
    } catch (err) {
      showNotice("تعذر حفظ الترتيب الجديد", "error");
      fetchPolicies();
    } finally {
      setReordering(false);
    }
  };

  // Section Management in Form
  const handleAddSection = () => {
    setIsDirty(true);
    setForm((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          heading: {
            ar: `قسم جديد ${prev.sections.length + 1}`,
            en: `New Section ${prev.sections.length + 1}`,
          },
          content: {
            ar: "<p>اكتب تفاصيل هذا القسم بالعربية...</p>",
            en: "<p>Write the details of this section in English...</p>",
          },
          displayOrder: prev.sections.length,
          isVisible: true,
        },
      ],
    }));
  };

  const handleUpdateSectionBilingual = (index, field, lang, value) => {
    setIsDirty(true);
    setForm((prev) => {
      const updated = [...prev.sections];
      const prevVal = getBilingual(updated[index][field]);
      updated[index] = {
        ...updated[index],
        [field]: { ...prevVal, [lang]: value },
      };
      return { ...prev, sections: updated };
    });
  };

  const handleUpdateSection = (index, field, value) => {
    setIsDirty(true);
    setForm((prev) => {
      const updated = [...prev.sections];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, sections: updated };
    });
  };

  const handleDeleteSection = (index) => {
    setIsDirty(true);
    setForm((prev) => {
      const updated = prev.sections.filter((_, i) => i !== index);
      return { ...prev, sections: updated };
    });
  };

  const handleMoveSection = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= form.sections.length) return;
    setIsDirty(true);
    setForm((prev) => {
      const updated = [...prev.sections];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIdx, 0, moved);
      return {
        ...prev,
        sections: updated.map((s, idx) => ({ ...s, displayOrder: idx })),
      };
    });
  };

  // Filtered List
  const filteredPolicies = policies.filter((p) => {
    const titleObj = getBilingual(p.title);
    const descObj = getBilingual(p.description);
    const titleAr = (titleObj.ar || "").toLowerCase();
    const titleEn = (titleObj.en || "").toLowerCase();
    const slug = (p.slug || "").toLowerCase();
    const descAr = (descObj.ar || "").toLowerCase();
    const descEn = (descObj.en || "").toLowerCase();
    const q = (search || "").toLowerCase().trim();

    const matchesSearch =
      !q ||
      titleAr.includes(q) ||
      titleEn.includes(q) ||
      slug.includes(q) ||
      descAr.includes(q) ||
      descEn.includes(q);

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border transition-all ${
            notice.type === "error"
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          {notice.type === "error" ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
          <span>{notice.msg}</span>
        </div>
      )}

      {/* ────────────────── VIEW 1: EDITOR VIEW ────────────────── */}
      {isEditing ? (
        <div className="space-y-6">
          {/* Editor Header Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
                <FileText className="w-4 h-4" />
                <span>{currentPolicy ? "تعديل صفحة سياسة" : "إنشاء صفحة سياسة جديدة"}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                {form.title[langTab]?.trim() || form.title.ar?.trim() || form.title.en?.trim() || "صفحة سياسة جديدة"}
              </h1>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (isDirty && !window.confirm("لديك تعديلات غير محفوظة، هل أنت متأكد من الإلغاء؟")) {
                    return;
                  }
                  setIsEditing(false);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
              >
                إلغاء والعودة
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewLang(langTab);
                  setPreviewPolicy({
                    title: form.title,
                    slug: form.slug,
                    description: form.description,
                    updatedAt: new Date(),
                    sections: form.sections.filter((s) => s.isVisible !== false),
                  });
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Eye className="w-4 h-4 text-slate-600" />
                <span>معاينة</span>
              </button>

              <button
                type="button"
                onClick={() => handleSavePolicy("draft")}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin text-slate-600" /> : <Save className="w-4 h-4 text-slate-600" />}
                <span>حفظ كمسودة</span>
              </button>

              <button
                type="button"
                onClick={() => handleSavePolicy("published")}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle className="w-4 h-4" />}
                <span>{currentPolicy?.status === "published" ? "تحديث ونشر" : "نشر السياسة الآن"}</span>
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Bilingual Language Switcher Tabs */}
          <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLangTab("ar")}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  langTab === "ar"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Languages className="w-4 h-4" />
                <span>المحتوى العربي (العربية)</span>
                {form.title.ar && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => setLangTab("en")}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  langTab === "en"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Languages className="w-4 h-4" />
                <span>English Content (الإنجليزية)</span>
                {form.title.en && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </button>
            </div>

            <span className="text-xs text-slate-400 hidden sm:inline px-3 font-medium">
              {langTab === "ar" ? "أنت الآن تقوم بتحرير النسخة العربية" : "You are currently editing the English version"}
            </span>
          </div>

          {/* Form Card: Main Settings */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>بيانات الصفحة الأساسية</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700">
                {langTab === "ar" ? "اللغة الحالية: العربية" : "Current Language: English"}
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Title Input based on active tab */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {langTab === "ar" ? "عنوان الصفحة بالعربية" : "Page Title in English"} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  dir={langTab === "ar" ? "rtl" : "ltr"}
                  value={form.title[langTab] || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    const newTitle = e.target.value;
                    setForm((prev) => {
                      const updatedTitle = { ...prev.title, [langTab]: newTitle };
                      return {
                        ...prev,
                        title: updatedTitle,
                        slug: !currentPolicy && !prev.slug ? generateSlugFromTitle(updatedTitle) : prev.slug,
                      };
                    });
                  }}
                  placeholder={langTab === "ar" ? "مثال: سياسة الخصوصية وحماية البيانات" : "e.g. Privacy & Data Protection Policy"}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Slug Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    الرابط المخصص (Slug) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDirty(true);
                      setForm((prev) => ({ ...prev, slug: generateSlugFromTitle(prev.title) }));
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>توليد تلقائي للرابط</span>
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono select-none" dir="ltr">
                    /policies/
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => {
                      setIsDirty(true);
                      setForm((prev) => ({ ...prev, slug: e.target.value }));
                    }}
                    placeholder="privacy-policy"
                    dir="ltr"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl ps-20 pe-4 py-2.5 text-sm text-indigo-600 font-mono placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Description Input based on active tab */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {langTab === "ar" ? "الوصف المختصر بالعربية" : "Short Description in English"}
              </label>
              <textarea
                rows={2}
                dir={langTab === "ar" ? "rtl" : "ltr"}
                value={form.description[langTab] || ""}
                onChange={(e) => {
                  setIsDirty(true);
                  const newDesc = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    description: { ...prev.description, [langTab]: newDesc },
                  }));
                }}
                placeholder={
                  langTab === "ar"
                    ? "نبذة موجزة تشرح هدف هذه الصفحة أو البنود المنظمة..."
                    : "A brief summary describing the scope of this policy page..."
                }
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition resize-none"
              />
            </div>

            {/* Status & Display Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">حالة النشر</label>
                <select
                  value={form.status}
                  onChange={(e) => {
                    setIsDirty(true);
                    setForm((prev) => ({ ...prev, status: e.target.value }));
                  }}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer"
                >
                  <option value="draft">مسودة (غير ظاهرة للجمهور)</option>
                  <option value="published">منشور (متاحة في الموقع والقائمة والفوتر)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ترتيب الظهور (Display Order)</label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => {
                    setIsDirty(true);
                    setForm((prev) => ({ ...prev, displayOrder: Number(e.target.value) }));
                  }}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* Sections Manager Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>
                    أقسام وبنود السياسة ({form.sections.length}) •{" "}
                    <span className="text-indigo-600">
                      {langTab === "ar" ? "تحرير المحتوى العربي" : "Editing English Content"}
                    </span>
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {langTab === "ar"
                    ? "أضف وقسّم المحتوى إلى بنود وفقرات منظمة باللغة العربية."
                    : "Add and format sections and clauses in English."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSection}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة قسم جديد</span>
              </button>
            </div>

            {form.sections.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">لا توجد أقسام في هذه الصفحة بعد.</p>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة القسم الأول</span>
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {form.sections.map((section, idx) => {
                  const headingObj = getBilingual(section.heading);
                  const contentObj = getBilingual(section.content);

                  return (
                    <div
                      key={idx}
                      className={`border rounded-2xl p-5 transition-all ${
                        section.isVisible !== false
                          ? "bg-slate-50/50 border-slate-200"
                          : "bg-slate-50/20 border-slate-200 opacity-60"
                      }`}
                    >
                      {/* Section Top Controls */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            dir={langTab === "ar" ? "rtl" : "ltr"}
                            value={headingObj[langTab] || ""}
                            onChange={(e) =>
                              handleUpdateSectionBilingual(idx, "heading", langTab, e.target.value)
                            }
                            placeholder={
                              langTab === "ar"
                                ? "عنوان القسم بالعربية (مثال: شروط الإرجاع والاستبدال)"
                                : "Section Heading in English (e.g. Return & Exchange Eligibility)"
                            }
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 text-slate-800 font-bold text-sm sm:text-base outline-none px-1 py-1 w-full transition"
                          />
                        </div>

                        {/* Right Section Tools */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Visibility Toggle */}
                          <button
                            type="button"
                            onClick={() => handleUpdateSection(idx, "isVisible", section.isVisible === false)}
                            title={section.isVisible !== false ? "القسم مرئي (انقر للإخفاء)" : "القسم مخفي (انقر للإظهار)"}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                              section.isVisible !== false
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-200 text-slate-600 border border-slate-300"
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{section.isVisible !== false ? "مرئي" : "مخفي"}</span>
                          </button>

                          {/* Move Up */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSection(idx, -1)}
                            title="تحريك لأعلى"
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 transition shadow-2xs"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            disabled={idx === form.sections.length - 1}
                            onClick={() => handleMoveSection(idx, 1)}
                            title="تحريك لأسفل"
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-30 transition shadow-2xs"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Section */}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف هذا القسم "${headingObj.ar || headingObj.en || idx + 1}"؟`)) {
                                handleDeleteSection(idx);
                              }
                            }}
                            title="حذف القسم"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Rich Text Editor for this section & language */}
                      <div>
                        <RichTextEditor
                          key={`${idx}-${langTab}`}
                          value={contentObj[langTab] || ""}
                          onChange={(newHtml) =>
                            handleUpdateSectionBilingual(idx, "content", langTab, newHtml)
                          }
                          placeholder={
                            langTab === "ar"
                              ? "اكتب المحتوى المنسق لهذا القسم باللغة العربية..."
                              : "Write the formatted content for this section in English..."
                          }
                          minHeight="160px"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Add Section Button */}
            {form.sections.length > 0 && (
              <button
                type="button"
                onClick={handleAddSection}
                className="w-full py-3 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 text-slate-600 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة قسم إضافي</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ────────────────── VIEW 2: LIST VIEW ────────────────── */
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">إدارة السياسات والشروط</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                أنشئ ونسّق وعدّل صفحات الخصوصية، الشروط، سياسات الشحن والاسترجاع باللغتين العربية والإنجليزية.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSeedDefaults}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>استعادة النماذج الافتراضية (عربي / English)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة سياسة جديدة</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">إجمالي الصفحات</p>
                <h4 className="text-2xl font-bold text-slate-800">{policies.length}</h4>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">السياسات المنشورة</p>
                <h4 className="text-2xl font-bold text-emerald-600">
                  {policies.filter((p) => p.status === "published").length}
                </h4>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">المسودات غير المنشورة</p>
                <h4 className="text-2xl font-bold text-amber-600">
                  {policies.filter((p) => p.status === "draft").length}
                </h4>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في عنوان أو رابط السياسة..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-9 pe-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none cursor-pointer focus:bg-white"
              >
                <option value="all">كل الحالات ({policies.length})</option>
                <option value="published">المنشورة فقط</option>
                <option value="draft">المسودات فقط</option>
              </select>
            </div>
          </div>

          {/* Policies Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500">جاري تحميل السياسات...</p>
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">لم يتم العثور على أي صفحات سياسات</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {search ? "جرّب تغيير كلمات البحث أو المرشح" : "يمكنك إضافة أول صفحة سياسة أو استعادة النماذج الافتراضية"}
                </p>
                {policies.length === 0 && (
                  <button
                    type="button"
                    onClick={handleSeedDefaults}
                    className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>توليد السياسات الافتراضية (عربي / إنجليزي)</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold">
                    <tr>
                      <th className="py-3.5 px-4 text-center w-16">الترتيب</th>
                      <th className="py-3.5 px-4 text-start">عنوان الصفحة والرابط</th>
                      <th className="py-3.5 px-4 text-center w-28">الأقسام</th>
                      <th className="py-3.5 px-4 text-center w-36">حالة النشر</th>
                      <th className="py-3.5 px-4 text-center w-32">آخر تحديث</th>
                      <th className="py-3.5 px-4 text-center w-44">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPolicies.map((p, idx) => {
                      const titleObj = getBilingual(p.title);
                      return (
                        <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Reorder Buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0 || reordering}
                                onClick={() => handleMovePolicy(idx, -1)}
                                title="تحريك لأعلى"
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-20 transition"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono text-slate-500 text-[11px] w-4">{idx + 1}</span>
                              <button
                                type="button"
                                disabled={idx === filteredPolicies.length - 1 || reordering}
                                onClick={() => handleMovePolicy(idx, 1)}
                                title="تحريك لأسفل"
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-20 transition"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Title & Slug */}
                          <td className="py-3.5 px-4">
                            <div>
                              <div className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
                                <span>{titleObj.ar || titleObj.en}</span>
                                {titleObj.en && titleObj.ar && (
                                  <span className="text-[11px] font-normal text-slate-400 font-sans" dir="ltr">
                                    ({titleObj.en})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  dir="ltr"
                                  className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1"
                                >
                                  <Globe className="w-3 h-3 text-indigo-600" />
                                  /policies/{p.slug}
                                </span>
                                {p.status === "published" && (
                                  <a
                                    href={`/policies/${p.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="فتح الصفحة العامة في نافذة جديدة"
                                    className="text-slate-400 hover:text-indigo-600 transition"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Sections Count */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                              <Layers className="w-3 h-3 text-indigo-600" />
                              <span>{p.sectionsCount || 0} قسم</span>
                            </span>
                          </td>

                          {/* Status Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(p)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                                p.status === "published"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  p.status === "published" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                                }`}
                              />
                              <span>{p.status === "published" ? "منشور ومتاح" : "مسودة مؤقتة"}</span>
                            </button>
                          </td>

                          {/* Last Update Date */}
                          <td className="py-3.5 px-4 text-center text-slate-500 text-[11px] font-mono">
                            {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("ar-EG-u-nu-latn") : "-"}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Preview */}
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const res = await apiClient.get(`/admin/policies/${p._id}`);
                                    if (res.data?.policy) {
                                      setPreviewLang("ar");
                                      setPreviewPolicy(res.data.policy);
                                    }
                                  } catch (e) {
                                    showNotice("تعذر جلب بيانات المعاينة", "error");
                                  }
                                }}
                                title="معاينة"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p._id)}
                                title="تعديل السياسة والأقسام"
                                className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(p._id)}
                                title="حذف السياسة"
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────── DELETE CONFIRMATION MODAL ────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-100">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-slate-800 font-bold text-base">تأكيد حذف صفحة السياسة</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذه الصفحة وجميع أقسامها نهائياً؟ لن يتمكن الزوار من الوصول إليها بعد الحذف.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeletePolicy}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                <span>نعم، حذف الصفحة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── LIVE PREVIEW MODAL ────────────────── */}
      {previewPolicy && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-bold text-slate-800">معاينة صفحة السياسة</span>
                {/* Language Switcher in Preview */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewLang("ar")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      previewLang === "ar" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLang("en")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      previewLang === "en" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPolicy(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Matching Thenith public layout in selected preview language */}
            <div
              dir={previewLang === "ar" ? "rtl" : "ltr"}
              className="p-6 md:p-8 overflow-y-auto space-y-8 text-start bg-white font-sans"
            >
              {/* Breadcrumbs */}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span>{previewLang === "ar" ? "الرئيسية" : "Home"}</span>
                <span>/</span>
                <span>{previewLang === "ar" ? "السياسات والشروط" : "Policies"}</span>
                <span>/</span>
                <span className="text-indigo-600 font-bold">
                  {getBilingual(previewPolicy.title)[previewLang] || getBilingual(previewPolicy.title).ar}
                </span>
              </div>

              {/* Title & Description */}
              <div className="border-b border-slate-100 pb-6">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {getBilingual(previewPolicy.title)[previewLang] || getBilingual(previewPolicy.title).ar}
                </h1>
                {getBilingual(previewPolicy.description)[previewLang] && (
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {getBilingual(previewPolicy.description)[previewLang]}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-4">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {previewLang === "ar" ? "آخر تحديث: " : "Last updated: "}
                    {new Date(previewPolicy.updatedAt || Date.now()).toLocaleDateString(
                      previewLang === "ar" ? "ar-EG-u-nu-latn" : "en-US"
                    )}
                  </span>
                </div>
              </div>

              {/* Sections list */}
              <div className="space-y-6">
                {(previewPolicy.sections || []).length === 0 ? (
                  <p className="text-sm text-slate-400 italic">
                    {previewLang === "ar" ? "لا توجد أقسام مضافة بعد." : "No sections added yet."}
                  </p>
                ) : (
                  (previewPolicy.sections || []).map((sec, i) => {
                    const h = getBilingual(sec.heading)[previewLang] || getBilingual(sec.heading).ar;
                    const c = getBilingual(sec.content)[previewLang] || getBilingual(sec.content).ar;
                    return (
                      <div key={i} className="space-y-3 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                        {h && (
                          <h2 className="text-lg md:text-xl font-bold text-slate-900 border-s-4 border-indigo-600 ps-3">
                            {h}
                          </h2>
                        )}
                        <div
                          className="text-sm text-slate-700 leading-loose prose max-w-none [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_blockquote]:border-s-4 [&_blockquote]:border-indigo-600 [&_blockquote]:bg-white [&_blockquote]:p-3 [&_blockquote]:rounded-r-lg [&_a]:text-indigo-600 [&_a]:underline"
                          dangerouslySetInnerHTML={{ __html: c || "" }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPolicy(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
