import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { publicClient } from "../../api/client.js";

export default function ContactSection({ language = "ar" }) {
  const isAr = language === "ar";

  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError(
        isAr
          ? "يرجى ملء جميع الحقول المطلوبة (الاسم، البريد، والرسالة)."
          : "Please fill in all required fields (Name, Email, and Message)."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let guestId = "";
      try {
        guestId = localStorage.getItem("support_guest_id") || "";
      } catch {
        // ignore
      }

      await publicClient.post("/public/contact", {
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        subject: isAr ? "رسالة استفسار من صفحة الهبوط" : "Landing Page Inquiry",
        guestId: guestId || undefined,
      });

      setSuccess(true);
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      console.error("[ContactSection] Submit error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        (isAr
          ? "حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة مرة أخرى."
          : "Failed to send message. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="relative z-10 py-24 sm:py-32 px-6">
      <div className="max-w-[720px] mx-auto">
        {/* Section Heading - Clean, Modern, without redundant badges */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 space-y-3"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#111827] dark:text-white tracking-tight">
            {isAr ? "يسعدنا دائماً الاستماع إليك" : "We'd Love to Hear From You"}
          </h2>

          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
            {isAr
              ? "شاركنا استفساراتك أو متطلباتك الخاصة، وسيقوم فريقنا بالرد عليك مباشرة."
              : "Share your questions or custom requirements, and our team will get back to you directly."}
          </p>
        </motion.div>

        {/* Contact Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl rounded-3xl p-7 sm:p-10 border border-slate-200/70 dark:border-slate-800/80 shadow-2xl shadow-slate-200/50 dark:shadow-black/60 relative overflow-hidden"
        >
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 flex flex-col items-center text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isAr ? "تم إرسال رسالتك بنجاح" : "Message Sent Successfully"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                {isAr
                  ? "شكراً لتواصلك معنا. استلمنا رسالتك وسنرد عليك عبر البريد في أقرب وقت."
                  : "Thank you for reaching out. We received your message and will reply via email shortly."}
              </p>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="mt-4 px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                {isAr ? "إرسال رسالة أخرى" : "Send Another Message"}
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Name & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5 text-start">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isAr ? "الاسم" : "Your Name"}</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder={isAr ? "اسمك الكريم" : "Your full name"}
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-[#f8f9fa] dark:bg-[#121215] border border-slate-200/80 dark:border-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:bg-white dark:focus:bg-black focus:border-slate-900 dark:focus:border-white focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5 text-start">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isAr ? "البريد الإلكتروني" : "Email Address"}</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    required
                    dir="ltr"
                    className="w-full px-4 py-3 rounded-2xl bg-[#f8f9fa] dark:bg-[#121215] border border-slate-200/80 dark:border-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:bg-white dark:focus:bg-black focus:border-slate-900 dark:focus:border-white focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all text-start"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5 text-start">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isAr ? "الرسالة" : "Your Message"}</span>
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={4}
                  placeholder={
                    isAr
                      ? "اكتب تفاصيل استفسارك أو رسالتك هنا..."
                      : "Write your message or inquiry here..."
                  }
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-[#f8f9fa] dark:bg-[#121215] border border-slate-200/80 dark:border-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:bg-white dark:focus:bg-black focus:border-slate-900 dark:focus:border-white focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all resize-y"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-[#111827] dark:bg-white text-white dark:text-[#111827] hover:bg-black dark:hover:bg-slate-100 text-sm font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جارٍ الإرسال..." : "Sending..."}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                    <span>{isAr ? "إرسال الرسالة" : "Send Message"}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
