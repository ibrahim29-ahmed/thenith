import React, { useState } from "react";
import {
  Mail,
  FileText,
  RotateCcw,
  Sparkles,
  Save,
  CheckCircle2,
  Copy,
  Eye,
  Code,
  Laptop,
  Smartphone,
  Check,
  Loader2,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ShoppingBag,
  Package,
  CreditCard,
  UserCheck,
} from "lucide-react";

const TEMPLATE_ICONS = {
  otp: ShieldCheck,
  order_created: ShoppingBag,
  order_status: Package,
  subscription_activated: CreditCard,
  welcome: UserCheck,
};

const MOCK_DATA = {
  customer_name: "أحمد محمد",
  customer_email: "ahmed@example.com",
  order_number: "10842",
  order_date: "26 أكتوبر 2026",
  total_amount: "450",
  payment_method: "بطاقة ائتمانية (Visa / Mastercard)",
  shipping_address: "شارع النصر، المعادي، القاهرة",
  fawry_code: "98321045",
  code: "582914",
  plan_name: "الباقة الاحترافية Pro",
  amount: "299",
  billing_period: "سنوي",
  start_date: "26 أكتوبر 2026",
  end_date: "26 أكتوبر 2027",
  status: "تم شحن طلبك وهو في الطريق إليك 🚚",
  site_name: "THENITH",
  year: new Date().getFullYear(),
  login_url: "https://thenith.com/login",
  items_table: `
<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; border: 1px solid #e2e8f0;">
  <thead>
    <tr style="background-color: #0f172a; color: #ffffff;">
      <th style="padding: 10px 14px; text-align: right; font-weight: bold; border-left: 1px solid #334155;">المنتج</th>
      <th style="padding: 10px 14px; text-align: center; font-weight: bold; border-left: 1px solid #334155;">الكمية</th>
      <th style="padding: 10px 14px; text-align: left; font-weight: bold;">السعر</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; color: #0f172a; border-left: 1px solid #e2e8f0;">كارت NFC ميتاليك ذكي (أسود غير لامع)</td>
      <td style="padding: 10px 14px; color: #475569; text-align: center; border-left: 1px solid #e2e8f0;">1</td>
      <td style="padding: 10px 14px; color: #0f172a; font-weight: bold; text-align: left;">350 ج.م</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
      <td style="padding: 10px 14px; color: #0f172a; border-left: 1px solid #e2e8f0;">شحن سريع للمحافظات</td>
      <td style="padding: 10px 14px; color: #475569; text-align: center; border-left: 1px solid #e2e8f0;">1</td>
      <td style="padding: 10px 14px; color: #0f172a; font-weight: bold; text-align: left;">100 ج.م</td>
    </tr>
  </tbody>
</table>`,
};

function renderMockTemplate(content, siteName) {
  if (!content) return "";
  let rendered = content;
  const data = { ...MOCK_DATA, site_name: siteName || "THENITH" };
  for (const [key, val] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    rendered = rendered.replace(regex, String(val));
  }
  return rendered;
}

export default function EmailTemplatesTab({
  templates,
  defaultTemplates,
  siteName,
  onChange,
  onSave,
  saving,
  showNotice,
}) {
  const [activeTemplateKey, setActiveTemplateKey] = useState("otp");
  const [viewMode, setViewMode] = useState("split"); // "split" | "edit" | "preview"
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "mobile"
  const [copiedTag, setCopiedTag] = useState(null);

  const activeTemplate = templates[activeTemplateKey] || {};
  const defaultTemplate = defaultTemplates[activeTemplateKey] || {};

  const handleFieldChange = (field, value) => {
    onChange({
      ...templates,
      [activeTemplateKey]: {
        ...activeTemplate,
        [field]: value,
      },
    });
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        `هل أنت متأكد من رغبتك في إعادة تعيين قالب "${activeTemplate.name || activeTemplateKey}" إلى النموذج الافتراضي المنسق؟`
      )
    ) {
      onChange({
        ...templates,
        [activeTemplateKey]: {
          ...defaultTemplate,
        },
      });
      showNotice("success", "تمت استعادة القالب الافتراضي بنجاح");
    }
  };

  const copyToClipboard = (tag) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
    showNotice("success", `تم نسخ المتغير: ${tag}`);
  };

  const insertTagIntoBody = (tag) => {
    const currentBody = activeTemplate.body || "";
    handleFieldChange("body", currentBody + " " + tag);
    copyToClipboard(tag);
  };

  // Preview rendering
  const renderedSubject = renderMockTemplate(
    activeTemplate.subject || "",
    siteName
  );
  const renderedHeadline = renderMockTemplate(
    activeTemplate.headline || "",
    siteName
  );
  const renderedBody = renderMockTemplate(activeTemplate.body || "", siteName);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER & TOP CONTROLS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-indigo-600" />
            قوالب رسائل البريد الإلكتروني للعملاء (Email Templates)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            خصص النصوص، العناوين، والتصميم لجميع الرسائل الآلية المرسلة للعملاء، مع دعم كامل للمتغيرات الديناميكية والمعاينة الحية
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shrink-0 self-start md:self-auto"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          حفظ جميع القوالب
        </button>
      </div>

      {/* TEMPLATE PICKER TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.keys(templates).map((key) => {
          const tpl = templates[key] || {};
          const isSelected = activeTemplateKey === key;
          const Icon = TEMPLATE_ICONS[key] || FileText;
          const isEnabled = tpl.enabled !== false;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTemplateKey(key)}
              className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isEnabled
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {isEnabled ? "مفعل" : "معطل"}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-800 line-clamp-1">
                  {tpl.name || key}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {tpl.description || "قالب إلكتروني"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ACTIVE TEMPLATE WORKSPACE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Workspace Subheader */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-800">
                {activeTemplate.name || activeTemplateKey}
              </h3>
              <button
                type="button"
                onClick={() =>
                  handleFieldChange("enabled", activeTemplate.enabled === false)
                }
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer"
              >
                {activeTemplate.enabled !== false ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-700">مفعل</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-400">معطل</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {activeTemplate.description}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="استعادة النص الافتراضي الأصلي"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              استعادة الافتراضي
            </button>

            {/* View Mode Switcher */}
            <div className="hidden lg:flex items-center bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "split"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                تقسيم الشاشة
              </button>
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "edit"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                المحرر فقط
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "preview"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                المعاينة فقط
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Tags Bar */}
        <div className="p-5 border-b border-slate-100 bg-indigo-50/30">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            المتغيرات الديناميكية المتاحة (انقر على أي متغير لنسخه وإدراجه تلقائياً):
          </div>
          <div className="flex flex-wrap gap-2">
            {(activeTemplate.variables || defaultTemplate.variables || []).map(
              (v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertTagIntoBody(v.tag)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer group"
                  title={v.label}
                >
                  <span>{v.tag}</span>
                  <span className="text-[10px] text-slate-400 font-sans font-normal border-s border-indigo-100 ps-1.5">
                    {v.label}
                  </span>
                  {copiedTag === v.tag ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* EDITOR & PREVIEW PANELS */}
        <div
          className={`grid ${
            viewMode === "split"
              ? "grid-cols-1 lg:grid-cols-2"
              : viewMode === "edit"
              ? "grid-cols-1"
              : "grid-cols-1"
          }`}
        >
          {/* EDITOR FORM */}
          {(viewMode === "split" || viewMode === "edit") && (
            <div className="p-6 space-y-5 border-e border-slate-100">
              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>عنوان الإيميل للعميل (Email Subject)</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    يظهر في شريط الرسائل
                  </span>
                </label>
                <input
                  type="text"
                  value={activeTemplate.subject || ""}
                  onChange={(e) => handleFieldChange("subject", e.target.value)}
                  placeholder="رمز التحقق الخاص بك في {{site_name}}"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Headline */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>الترويسة العلوية في جسم الإيميل (Headline)</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    نص صغير يظهر أسفل شعار الموقع في الهيدر
                  </span>
                </label>
                <input
                  type="text"
                  value={activeTemplate.headline || ""}
                  onChange={(e) =>
                    handleFieldChange("headline", e.target.value)
                  }
                  placeholder="رمز التحقق السريع"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Body Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-indigo-500" />
                    محتوى نص وقالب الرسالة (HTML Supported)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    يدعم وسوم HTML الأساسية كـ &lt;p&gt;, &lt;strong&gt;, &lt;div&gt;
                  </span>
                </div>
                <textarea
                  rows={12}
                  value={activeTemplate.body || ""}
                  onChange={(e) => handleFieldChange("body", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-4 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  placeholder="أدخل نص الرسالة هنا..."
                  dir="ltr"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>ملاحظة للمصمم:</strong> سيتم تضمين هذا المحتوى تلقائياً داخل قالب هيدر وفوتر رسمي يحمل اسم وشعار المنصة وسنة الحقوق المحفوظة، مع اتجاه الكتابة من اليمين لليسار (RTL) وتنسيق متجاوب مع جميع الهواتف.
                </p>
              </div>
            </div>
          )}

          {/* LIVE EMAIL CLIENT PREVIEW */}
          {(viewMode === "split" || viewMode === "preview") && (
            <div className="p-6 bg-slate-100 flex flex-col items-center">
              {/* Preview Bar */}
              <div className="w-full max-w-xl flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-slate-600 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  معاينة حية لشكل الإيميل عند العميل (Live Preview):
                </span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1.5 rounded-md cursor-pointer ${
                      previewDevice === "desktop"
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="معاينة سطح المكتب"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1.5 rounded-md cursor-pointer ${
                      previewDevice === "mobile"
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                    title="معاينة شاشة الهاتف"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Mock Email Client Frame */}
              <div
                className={`w-full bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transition-all duration-300 ${
                  previewDevice === "mobile" ? "max-w-sm" : "max-w-xl"
                }`}
              >
                {/* Email Client Header Bar */}
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-slate-400 font-mono text-[11px] ms-2">
                      صندوق الوارد (Inbox)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    الآن • بريد إلكتروني
                  </span>
                </div>

                {/* Email Metadata */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/70 text-xs space-y-1.5" dir="rtl">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">من:</span>
                    <span className="font-bold text-slate-800">
                      {siteName || "Thenith"} &lt;no-reply@thenith.com&gt;
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">إلى:</span>
                    <span className="text-slate-700">أحمد محمد &lt;customer@example.com&gt;</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400 font-medium">الموضوع:</span>
                    <span className="font-bold text-indigo-700">
                      {renderedSubject || "(بدون موضوع)"}
                    </span>
                  </div>
                </div>

                {/* Email Body Canvas */}
                <div className="p-4 sm:p-6 bg-[#f8fafc] max-h-[500px] overflow-y-auto">
                  <div
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                    dir="rtl"
                  >
                    {/* Header */}
                    <div className="bg-[#0f172a] text-white p-6 text-center">
                      <h2 className="text-xl font-black tracking-wider text-white m-0">
                        {siteName || "THENITH"}
                      </h2>
                      {renderedHeadline && (
                        <p className="text-xs text-slate-400 mt-1 m-0">
                          {renderedHeadline}
                        </p>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6 text-sm text-slate-700 leading-relaxed">
                      {/* Live HTML injection */}
                      <div
                        className="email-preview-content space-y-4"
                        dangerouslySetInnerHTML={{
                          __html: renderedBody || "<p>(نص الرسالة فارغ)</p>",
                        }}
                      />

                      <hr className="border-t border-slate-200 my-6" />

                      <p className="text-[11px] text-slate-400 text-center m-0">
                        © {new Date().getFullYear()} {siteName || "THENITH"}. جميع الحقوق محفوظة.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
