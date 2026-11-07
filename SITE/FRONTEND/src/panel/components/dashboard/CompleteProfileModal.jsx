import React, { useState } from "react";
import { Phone, User, Loader2, ArrowRight, X, ShieldCheck } from "lucide-react";
import apiClient from "../../../api/client.js";
import { useGlobalLanguage } from "../../../context/GlobalLanguageContext.jsx";
import ErrorNotice from "../../../components/ErrorNotice.jsx";
import { getLocalizedErrorMessage } from "../../../utils/errorHandling.js";
import { getAccessToken } from "../../services/authApi.js";

export default function CompleteProfileModal({
  currentUser,
  missingFields = ["رقم الهاتف"],
  isOpen,
  onClose,
  onSuccess,
}) {
  const { t, language } = useGlobalLanguage();
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const isNameMissing = !currentUser?.name?.trim();
  const isPhoneMissing = !currentUser?.phone?.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isNameMissing && !name.trim()) {
      setError(t("pleaseEnterName"));
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError(t("panel.errors.phoneRequired"));
      return;
    }

    if (!/^01[0125][0-9]{8}$/.test(cleanPhone)) {
      setError(language === "ar" ? "رقم الهاتف غير صحيح " : "Invalid phone number.");
      return;
    }

    setSaving(true);
    try {
      const token = getAccessToken();

      const payload = {
        phone: cleanPhone,
      };
      if (name.trim()) payload.name = name.trim();

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await Promise.allSettled([
        apiClient.patch("/auth/me", payload, { headers }),
        apiClient.patch("/panel/profile", payload, { headers }),
      ]);

      const updatedUser = {
        ...(currentUser || {}),
        phone: cleanPhone,
        ...(name.trim() ? { name: name.trim() } : {}),
      };

      onSuccess(updatedUser);
    } catch (err) {
      setError(getLocalizedErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="absolute top-5 start-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="mb-6">
          <h3 className="text-lg font-black text-white text-center">
            {language === "ar" ? "استكمال بيانات الملف الشخصي" : "Complete Profile Information"}
          </h3>
        </div>

        <ErrorNotice error={error} language={language} className="mb-5" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field (if missing) */}
          {isNameMissing && (
            <div>
              <label className="block text-xs sm:text-[13px] font-bold text-slate-300 mb-1.5">
                {t("fullNameLabel")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === "ar" ? "أدخل اسمك" : "Enter your name"}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pe-10 ps-4 py-2.5 sm:py-3 text-base sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
          )}

          {/* Phone Field */}
          <div>
            <label className="block text-xs sm:text-[13px] font-bold text-slate-300 mb-1.5">
              {language === "ar" ? "رقم الهاتف" : "Phone Number"} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-slate-500">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                autoFocus
                className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pe-10 ps-4 py-2.5 sm:py-3 text-base sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-end"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 sm:py-3 px-5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{language === "ar" ? "حفظ ومتابعة" : "Save and Continue"}</span>
                  <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 sm:py-3 px-4 rounded-xl text-sm transition-colors"
            >
              {language === "ar" ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
