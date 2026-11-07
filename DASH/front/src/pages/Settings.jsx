import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Save,
  Image as ImageIcon,
  Type,
  Loader2,
  Upload,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Share2,
  Trash2,
  Eye,
  MapPin,
  MessageCircle,
  Server,
  FileText,
  Sliders,
  Globe,
  Zap,
} from "lucide-react";
import {
  uploadAdminImage,
  fetchSiteSettings,
  updateSiteSettings,
  fetchMailSettings,
  updateMailSettings,
} from "../services/adminApi.js";
import SmtpSettingsTab from "../components/settings/SmtpSettingsTab.jsx";
import EmailTemplatesTab from "../components/settings/EmailTemplatesTab.jsx";

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "general";
  const [activeTab, setActiveTab] = useState(
    ["general", "smtp", "templates"].includes(initialTab) ? initialTab : "general"
  );

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [siteLoading, setSiteLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  // Logo & Branding Settings
  const [logoType, setLogoType] = useState("image");
  const [logoText, setLogoText] = useState("Thenith");
  const [logoUrl, setLogoUrl] = useState("");
  const [siteName, setSiteName] = useState("Thenith");

  // Contact Info & Support
  const [contactEmail, setContactEmail] = useState("info@thenith.com");
  const [contactPhone, setContactPhone] = useState("+20 100 000 0000");
  const [whatsappNumber, setWhatsappNumber] = useState("+20 100 000 0000");
  const [address, setAddress] = useState("القاهرة، جمهورية مصر العربية");

  // Social Links
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");

  // SMTP Configuration
  const [smtpConfig, setSmtpConfig] = useState({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    user: "info@thenith.com",
    pass: "",
    from_name: "Thenith Team",
    from_email: "info@thenith.com",
  });

  // Email Templates
  const [emailTemplates, setEmailTemplates] = useState({});
  const [defaultTemplates, setDefaultTemplates] = useState({});
  const [mailSaving, setMailSaving] = useState(false);

  const showNotice = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const loadAllSettings = async () => {
    try {
      setSiteLoading(true);
      const [siteData, mailData] = await Promise.allSettled([
        fetchSiteSettings(),
        fetchMailSettings(),
      ]);

      if (siteData.status === "fulfilled" && siteData.value) {
        const s = siteData.value;
        setLogoType(s.site_logo_type || (s.site_logo_url ? "image" : "text"));
        setLogoText(s.site_logo_text || s.site_name || "Thenith");
        setLogoUrl(s.site_logo_url || "");
        if (s.site_name) setSiteName(s.site_name);

        if (s.contact_email) setContactEmail(s.contact_email);
        if (s.contact_phone) setContactPhone(s.contact_phone);
        if (s.whatsapp_number) setWhatsappNumber(s.whatsapp_number);
        if (s.address) setAddress(s.address);

        if (s.facebook_url) setFacebookUrl(s.facebook_url);
        if (s.instagram_url) setInstagramUrl(s.instagram_url);
        if (s.linkedin_url) setLinkedinUrl(s.linkedin_url);
        if (s.twitter_url) setTwitterUrl(s.twitter_url);
        if (s.tiktok_url) setTiktokUrl(s.tiktok_url);
        if (s.youtube_url) setYoutubeUrl(s.youtube_url);
        if (s.telegram_url) setTelegramUrl(s.telegram_url);
      }

      if (mailData.status === "fulfilled" && mailData.value) {
        const m = mailData.value;
        if (m.smtp) setSmtpConfig(m.smtp);
        if (m.templates) {
          setEmailTemplates(m.templates);
          setDefaultTemplates(m.templates);
        }
      }
    } catch (error) {
      showNotice("error", "فشل تحميل إعدادات المنظومة");
    } finally {
      setSiteLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const { url } = await uploadAdminImage(reader.result, "settings");
          setLogoUrl(url);
          setLogoType("image");
          showNotice("success", "تم رفع صورة الشعار بنجاح! لا تنس حفظ التغييرات.");
        } catch (err) {
          if (reader.result) {
            setLogoUrl(reader.result);
            setLogoType("image");
            showNotice("success", "تم اختيار الصورة محلياً بنجاح");
          } else {
            showNotice("error", "فشل رفع الصورة للخادم السحابي");
          }
        } finally {
          setUploading(false);
        }
      };
    } catch (err) {
      setUploading(false);
      showNotice("error", "حدث خطأ أثناء قراءة ملف الصورة");
    }
  };

  const handleDeleteLogo = () => {
    setLogoUrl("");
    setLogoType("text");
    showNotice(
      "success",
      "تم حذف الشعار وإعادة التعيين للشعار النصي. اضغط حفظ التغييرات لتطبيق التعديل على الموقع."
    );
  };

  const handleSaveGeneral = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        site_logo_type: logoType,
        site_logo_text: logoText || siteName,
        site_logo_url: logoUrl,
        site_name: siteName,
        contact_email: contactEmail,
        contact_phone: "",
        whatsapp_number: whatsappNumber,
        address: "",
        facebook_url: facebookUrl,
        instagram_url: instagramUrl,
        linkedin_url: linkedinUrl,
        twitter_url: twitterUrl,
        tiktok_url: tiktokUrl,
        youtube_url: youtubeUrl,
        telegram_url: telegramUrl,
      };

      await updateSiteSettings(payload);
      if (siteName) {
        localStorage.setItem("admin_site_name", siteName);
        window.dispatchEvent(
          new CustomEvent("site-name-updated", { detail: siteName })
        );
      }
      showNotice("success", "تم حفظ وتطبيق إعدادات الموقع بالكامل بنجاح!");
    } catch (error) {
      showNotice("error", "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSmtp = async () => {
    try {
      setMailSaving(true);
      await updateMailSettings({ smtp: smtpConfig });
      showNotice("success", "تم حفظ وتحديث إعدادات خادم الـ SMTP بنجاح!");
    } catch (err) {
      showNotice("error", "فشل حفظ إعدادات الـ SMTP");
    } finally {
      setMailSaving(false);
    }
  };

  const handleSaveTemplates = async () => {
    try {
      setMailSaving(true);
      await updateMailSettings({ templates: emailTemplates });
      showNotice("success", "تم حفظ قوالب رسائل البريد الإلكتروني بنجاح!");
    } catch (err) {
      showNotice("error", "فشل حفظ قوالب البريد");
    } finally {
      setMailSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {notice && (
        <div
          className={`fixed bottom-6 start-6 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-bold animate-in slide-in-from-bottom duration-300 ${
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

      {/* MAIN HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            إعدادات المنظومة
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            التحكم في الهوية البصرية، بيانات التواصل، خادم البريد (SMTP)، وقوالب رسائل البريد للعملاء
          </p>
        </div>

        {activeTab === "general" && (
          <button
            onClick={handleSaveGeneral}
            disabled={loading || siteLoading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ إعدادات الهوية
          </button>
        )}

        {activeTab === "smtp" && (
          <button
            onClick={handleSaveSmtp}
            disabled={mailSaving || siteLoading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            {mailSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ إعدادات الـ SMTP
          </button>
        )}

        {activeTab === "templates" && (
          <button
            onClick={handleSaveTemplates}
            disabled={mailSaving || siteLoading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            {mailSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ قوالب البريد
          </button>
        )}
      </div>

      {/* INTERNAL TABS NAVIGATION BAR */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleTabChange("general")}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            activeTab === "general"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>الهوية والتواصل العام</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("smtp")}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            activeTab === "smtp"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>خادم البريد و SMTP</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              activeTab === "smtp"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            Port {smtpConfig.port || 465}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("templates")}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            activeTab === "templates"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>قوالب رسائل البريد للعملاء</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              activeTab === "templates"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {Object.keys(emailTemplates).length || 5} قوالب
          </span>
        </button>
      </div>

      {siteLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-slate-500 text-sm font-bold">
            جاري تحميل إعدادات المنظومة...
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: GENERAL & BRANDING */}
          {activeTab === "general" && (
            <form onSubmit={handleSaveGeneral} className="space-y-8">
              {/* LOGO & BRANDING */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                    الشعار والهوية البصرية (Logo)
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    تطبق التعديلات تلقائياً في الشريط العلوي والفوتر والصفحات
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Site Name Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        اسم الموقع / المنصة (Site Name)
                      </label>
                      <input
                        type="text"
                        value={siteName}
                        onChange={(e) => {
                          setSiteName(e.target.value);
                          if (!logoText || logoText === "Thenith") {
                            setLogoText(e.target.value);
                          }
                        }}
                        placeholder="Thenith"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-[11px] text-slate-400">
                        الاسم الرسمي الذي يظهر في العناوين والرسائل والشعار النصي
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        نوع الشعار المفضل
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setLogoType("image")}
                          className={`flex-1 py-2.5 px-3 rounded-xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                            logoType === "image"
                              ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <ImageIcon className="w-4 h-4" />
                          صورة لوجو
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoType("text")}
                          className={`flex-1 py-2.5 px-3 rounded-xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                            logoType === "text"
                              ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <Type className="w-4 h-4" />
                          شعار نصي
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Logo Upload & Actions */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    {logoType === "image" ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">
                            صورة الشعار الرسمية (Logo Image)
                          </label>
                          {logoUrl && (
                            <button
                              type="button"
                              onClick={handleDeleteLogo}
                              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف الشعار
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-6">
                          {logoUrl ? (
                            <div className="relative group">
                              <div className="w-32 h-20 bg-white rounded-2xl border border-slate-200 flex items-center justify-center p-3 shadow-sm shrink-0 overflow-hidden">
                                <img
                                  src={logoUrl}
                                  alt="Logo Preview"
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="w-32 h-20 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-2 text-center text-slate-400">
                              <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                              <span className="text-[10px]">لا يوجد شعار</span>
                            </div>
                          )}

                          <div className="flex flex-col gap-2">
                            <label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-100 transition-colors rounded-xl px-5 py-2.5 flex items-center gap-2 text-xs font-bold text-slate-700 shadow-sm w-fit">
                              {uploading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                              ) : (
                                <Upload className="w-4 h-4 text-indigo-600" />
                              )}
                              {uploading
                                ? "جاري الرفع..."
                                : logoUrl
                                ? "تغيير صورة الشعار"
                                : "رفع صورة الشعار"}
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                              />
                            </label>
                            <p className="text-[11px] text-slate-400">
                              يدعم صيغ PNG, SVG, JPG ويفضل خلفية شفافة (Transparent)
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                          النص المعروض للشعار
                        </label>
                        <input
                          type="text"
                          value={logoText}
                          onChange={(e) => setLogoText(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          placeholder="Thenith"
                        />
                        <p className="text-[11px] text-slate-400">
                          النص الذي سيظهر كشعار أنيق في رأس وفوتر الموقع
                        </p>
                      </div>
                    )}

                    {/* Live Preview Bar */}
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-600">
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        معاينة حية للشعار في الموقع:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Light theme preview */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-medium">
                            الوضع الفاتح
                          </span>
                          <div className="h-9 flex items-center">
                            {logoType === "image" && logoUrl ? (
                              <img
                                src={logoUrl}
                                alt="Logo"
                                className="max-h-8 object-contain"
                              />
                            ) : (
                              <span className="font-black text-lg text-slate-900">
                                {logoText || siteName || "Thenith"}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Dark theme preview */}
                        <div className="bg-[#111827] rounded-xl border border-slate-700 p-4 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-medium">
                            الوضع الداكن
                          </span>
                          <div className="h-9 flex items-center">
                            {logoType === "image" && logoUrl ? (
                              <img
                                src={logoUrl}
                                alt="Logo"
                                className="max-h-8 object-contain brightness-110"
                              />
                            ) : (
                              <span className="font-black text-lg text-white">
                                {logoText || siteName || "Thenith"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTACT & SUPPORT INFO (Email and WhatsApp only) */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                    <Mail className="w-5 h-5 text-indigo-600" />
                    بيانات التواصل والدعم (البريد والواتساب فقط)
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    تظهر للعملاء والزوار في فوتر الموقع للتواصل السريع
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                      البريد الإلكتروني للدعم الفني
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="support@thenith.com"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                      رقم الواتساب (WhatsApp)
                    </label>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+20 100 000 0000"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      dir="ltr"
                    />
                    <p className="text-[11px] text-slate-400">
                      يفتح محادثة واتساب فورية مباشرة مع العميل عند الضغط عليه في الموقع
                    </p>
                  </div>
                </div>
              </div>

              {/* SOCIAL LINKS */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                    <Share2 className="w-5 h-5 text-indigo-600" />
                    روابط التواصل الاجتماعي
                  </h2>
                  <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    الرابط الذي يتم إدخاله فقط سيظهر في فوتر الموقع
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Facebook</label>
                    <input
                      type="url"
                      placeholder="https://facebook.com/yourpage"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Instagram</label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/yourprofile"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">X (Twitter)</label>
                    <input
                      type="url"
                      placeholder="https://x.com/youraccount"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">LinkedIn</label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/company/yourcompany"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">TikTok</label>
                    <input
                      type="url"
                      placeholder="https://tiktok.com/@youraccount"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">YouTube</label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/@yourchannel"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Telegram</label>
                    <input
                      type="url"
                      placeholder="https://t.me/yourchannel"
                      value={telegramUrl}
                      onChange={(e) => setTelegramUrl(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  حفظ كافة إعدادات الهوية والتواصل
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SMTP SETTINGS & TEST */}
          {activeTab === "smtp" && (
            <SmtpSettingsTab
              smtpConfig={smtpConfig}
              onChange={setSmtpConfig}
              onSave={handleSaveSmtp}
              saving={mailSaving}
              showNotice={showNotice}
            />
          )}

          {/* TAB 3: CUSTOMER EMAIL TEMPLATES */}
          {activeTab === "templates" && (
            <EmailTemplatesTab
              templates={emailTemplates}
              defaultTemplates={defaultTemplates}
              siteName={siteName}
              onChange={setEmailTemplates}
              onSave={handleSaveTemplates}
              saving={mailSaving}
              showNotice={showNotice}
            />
          )}
        </>
      )}
    </div>
  );
}
