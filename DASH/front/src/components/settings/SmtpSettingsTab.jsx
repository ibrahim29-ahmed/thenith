import React, { useState } from "react";
import {
  Server,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  HelpCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { testSmtpConnection } from "../../services/adminApi.js";

const SMTP_PRESETS = [
  {
    name: "Hostinger",
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    badge: "موصى به",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    name: "Gmail / Workspace",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    badge: "App Password",
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    note: "يتطلب إنشاء كلمة مرور تطبيقات (App Password) من إعدادات حساب Google",
  },
  {
    name: "Zoho Mail",
    host: "smtppro.zoho.com",
    port: 465,
    secure: true,
    badge: "SSL 465",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    name: "Outlook / 365",
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    badge: "STARTTLS",
    badgeColor: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
];

export default function SmtpSettingsTab({
  smtpConfig,
  onChange,
  onSave,
  saving,
  showNotice,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const applyPreset = (preset) => {
    onChange({
      ...smtpConfig,
      host: preset.host,
      port: preset.port,
      secure: preset.secure,
    });
    showNotice(
      "success",
      `تم تطبيق إعدادات مزود الخدمة: ${preset.name} (Port: ${preset.port})`
    );
  };

  const handleTestConnection = async (e) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes("@")) {
      showNotice("error", "يرجى كتابة بريد إلكتروني صحيح لإرسال الإيميل التجريبي إليه");
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const res = await testSmtpConnection({
        testEmail,
        smtp: smtpConfig,
      });

      if (res?.success) {
        setTestResult({
          type: "success",
          message: res.message || "تم الاتصال بالخادم وإرسال البريد التجريبي بنجاح!",
        });
        showNotice("success", "تم إرسال البريد التجريبي بنجاح! تفقد بريدك الوارد.");
      } else {
        setTestResult({
          type: "error",
          message: res?.error || "فشل الاتصال بخادم البريد",
        });
      }
    } catch (err) {
      setTestResult({
        type: "error",
        message:
          err.response?.data?.error ||
          err.message ||
          "حدث خطأ أثناء محاولة الاتصال بالخادم",
      });
      showNotice("error", "فشل فحص الاتصال بالـ SMTP");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* PRESETS BAR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-500" />
              الإعداد السريع لمزودي خدمة البريد (Quick Presets)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              اختر مزود خدمة البريد لتعبئة إعدادات المنفذ والتشفير والمضيف تلقائياً بنقرة واحدة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SMTP_PRESETS.map((preset) => {
            const isMatch =
              smtpConfig.host === preset.host &&
              Number(smtpConfig.port) === preset.port;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  isMatch
                    ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-sm text-slate-800">
                    {preset.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${preset.badgeColor}`}
                  >
                    {preset.badge}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                  {preset.host}:{preset.port}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SMTP CREDENTIALS FORM */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
              <Server className="w-5 h-5 text-indigo-600" />
              إعدادات خادم البريد (SMTP Server Configuration)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              يتم استخدام هذه البيانات لإرسال جميع رسائل البريد الإلكتروني للعملاء (فواتير، رموز تحقق، وإشعارات)
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200 flex items-center gap-1.5 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            اتصال مشفر وآمن
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* SMTP Host */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-500" />
              خادم البريد (SMTP Host)
            </label>
            <input
              type="text"
              value={smtpConfig.host || ""}
              onChange={(e) =>
                onChange({ ...smtpConfig, host: e.target.value })
              }
              placeholder="smtp.hostinger.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              dir="ltr"
            />
            <p className="text-[11px] text-slate-400">
              عنوان سيرفر الـ SMTP الخاص باستضافتك أو حساب البريد
            </p>
          </div>

          {/* Port & Secure Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                المنفذ (Port)
              </label>
              <input
                type="number"
                value={smtpConfig.port || 465}
                onChange={(e) =>
                  onChange({
                    ...smtpConfig,
                    port: parseInt(e.target.value, 10) || 465,
                  })
                }
                placeholder="465"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                بروتوكول التشفير
              </label>
              <select
                value={smtpConfig.secure ? "true" : "false"}
                onChange={(e) =>
                  onChange({
                    ...smtpConfig,
                    secure: e.target.value === "true",
                  })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="true">SSL / TLS (465)</option>
                <option value="false">STARTTLS / Plain (587)</option>
              </select>
            </div>
          </div>

          {/* SMTP User */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              اسم المستخدم للـ SMTP (البريد الإلكتروني الكامل)
            </label>
            <input
              type="text"
              value={smtpConfig.user || ""}
              onChange={(e) =>
                onChange({ ...smtpConfig, user: e.target.value })
              }
              placeholder="info@thenith.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              dir="ltr"
            />
          </div>

          {/* SMTP Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-500" />
              كلمة مرور خادم الـ SMTP (Password / App Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={smtpConfig.pass || ""}
                onChange={(e) =>
                  onChange({ ...smtpConfig, pass: e.target.value })
                }
                placeholder="••••••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono pe-11"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 end-0 px-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Sender Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              اسم المرسل المعروض للعميل (Sender Name)
            </label>
            <input
              type="text"
              value={smtpConfig.from_name || ""}
              onChange={(e) =>
                onChange({ ...smtpConfig, from_name: e.target.value })
              }
              placeholder="منصة Thenith"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[11px] text-slate-400">
              الاسم الذي يظهر في صندوق الوارد لدى العميل عند استلام البريد
            </p>
          </div>

          {/* Sender Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              بريد الإرسال المعروض (From Email)
            </label>
            <input
              type="email"
              value={smtpConfig.from_email || ""}
              onChange={(e) =>
                onChange({ ...smtpConfig, from_email: e.target.value })
              }
              placeholder="info@thenith.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              dir="ltr"
            />
            <p className="text-[11px] text-slate-400">
              عنوان البريد الإلكتروني الذي يتم إرسال الرسالة منه
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            حفظ إعدادات الـ SMTP
          </button>
        </div>
      </div>

      {/* TEST CONNECTION & SEND EMAIL */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <Send className="w-5 h-5 text-indigo-400" />
            فحص الاتصال وإرسال بريد تجريبي (Live SMTP Connection Test)
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            أدخل بريدك الإلكتروني لاختبار صحة بيانات الـ SMTP والتأكد من نجاح الاتصال ووصول الرسائل لصندوق الوارد
          </p>
        </div>

        <form onSubmit={handleTestConnection} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="أدخل بريدك الشخصي لاستلام بريد الاختبار (مثال: admin@example.com)"
                className="w-full bg-slate-800/80 border border-slate-600 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={testing || !testEmail}
              className="px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 shrink-0"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الفحص والإرسال...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  فحص الاتصال وإرسال الآن
                </>
              )}
            </button>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 text-sm animate-in fade-in duration-300 ${
                testResult.type === "success"
                  ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
                  : "bg-rose-950/80 border-rose-500 text-rose-200"
              }`}
            >
              {testResult.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">
                  {testResult.type === "success"
                    ? "✓ تم الاتصال والإرسال بنجاح!"
                    : "فشل اختبار الاتصال بالخادم:"}
                </p>
                <p className="text-xs opacity-90 leading-relaxed font-mono">
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
        </form>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-bold text-white">نصائح هامة لضمان وصول الرسائل للعملاء:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
              <li>في حال استخدام استضافة Hostinger، تأكد من أن المنفذ 465 مع تشغيل SSL.</li>
              <li>إذا كنت تستخدم بريد Google/Gmail، يجب تفعيل التحقق بخطوتين وإنشاء كلمة مرور تطبيقات (App Password) بدلاً من باسورد الحساب العادي.</li>
              <li>إذا وصلت الرسالة إلى مجلد الرسائل غير المرغوبة (Spam)، تأكد من ضبط سجلات SPF و DKIM في لوحة الـ DNS الخاصة بدومينك.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
