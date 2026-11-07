import React from "react";
import {
  Bell,
  Languages,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  Clock,
  CheckCheck,
  Trash2,
  Megaphone,
  AlertTriangle,
  CreditCard,
  MessageSquare,
  ExternalLink,
  ShoppingBag,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import ThenithLogo from "../ThenithLogo.jsx";

// Relative time helper in Arabic & English
function formatRelativeTime(dateString, isArabic) {
  if (!dateString) return isArabic ? "الآن" : "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return isArabic ? "الآن" : "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isArabic ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return isArabic ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return isArabic ? `منذ ${diffDays} أيام` : `${diffDays}d ago`;
  return date.toLocaleDateString(isArabic ? "ar-EG-u-nu-latn" : "en-US", { month: "short", day: "numeric" });
}

export default function DashboardHeader({
  t,
  language,
  toggleLanguage,
  theme,
  toggleTheme,
  title,
  entitlements,
  notifications = [],
  showNotifications,
  onToggleNotifications,
  onCloseNotifications,
  onLogout,
  onNotificationClick,
  onClearAllNotifications,
}) {
  const isArabic = language === "ar" || !language;
  const isPro = entitlements?.plan === "pro";
  const dropdownRef = React.useRef(null);
  const bellRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showNotifications &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        onCloseNotifications && onCloseNotifications();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications, onCloseNotifications]);

  const unreadCount = notifications.length;

  return (
    <header dir="ltr" className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md dark:border-slate-900 dark:bg-slate-950/90 md:px-8 lg:bg-white/85 lg:shadow-none">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <ThenithLogo size="md" showBadge={false} isPro={isPro} />
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="hidden md:flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border border-indigo-100 bg-indigo-50 px-2 text-xs font-black text-indigo-600 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
            title={language === "ar" ? "English" : "العربية"}
          >
            <Languages className="h-4 w-4" />
            {language === "ar" ? "EN" : "AR"}
          </button>

          {/* Bell Icon & Dropdown */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={onToggleNotifications}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                unreadCount > 0
                  ? "border-indigo-200 bg-indigo-50/70 text-indigo-600 shadow-xs dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              }`}
              title={t("recentNotifications") || "Notifications"}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -end-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950 animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.16 }}
                  dir={isArabic ? "rtl" : "ltr"}
                  className="fixed inset-x-3 top-16 z-50 max-h-[85vh] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:absolute sm:inset-x-auto sm:right-0 sm:left-auto sm:top-12 sm:w-96 sm:max-w-[calc(100vw-2rem)] flex flex-col"
                >
                  {/* Dropdown Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white">
                        {isArabic ? "مركز التنبيهات" : "Notifications Center"}
                      </h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-black">
                          {unreadCount} {isArabic ? "جديد" : "new"}
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && onClearAllNotifications && (
                      <button
                        type="button"
                        onClick={onClearAllNotifications}
                        className="text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition-colors"
                        title={isArabic ? "مسح جميع الإشعارات" : "Clear all"}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{isArabic ? "مسح الكل" : "Clear all"}</span>
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="overflow-y-auto max-h-[380px] divide-y divide-slate-100 dark:divide-slate-900 p-1">
                    {notifications?.length > 0 ? (
                      notifications.map((item, idx) => {
                        let title = item.title;
                        const isExpiring = item.type === "subscription_expiring" || item.category === "subscription";
                        const isSupport = item.type === "support_message";
                        const isOrder = item.type === "order_created" || item.type === "order_cancelled";

                        if (!title) {
                          if (item.type === "new_request")
                            title = isArabic ? `رسالة جديدة من ${item.payload?.name}` : `New message from ${item.payload?.name}`;
                          else if (item.type === "new_appointment")
                            title = isArabic ? `حجز جديد من ${item.payload?.name}` : `New booking from ${item.payload?.name}`;
                          else if (item.type === "card_updated")
                            title = isArabic ? "تم تعديل بيانات الكارت بنجاح" : "Card details updated successfully";
                          else if (item.type === "order_created")
                            title = isArabic ? "تم تسجيل طلب جديد بنجاح" : "New order recorded successfully";
                          else if (item.type === "order_cancelled")
                            title = isArabic ? "تم إلغاء الطلب بنجاح" : "Order cancelled successfully";
                          else if (item.type === "subscription_created")
                            title = isArabic ? "تم تفعيل الاشتراك بنجاح" : "Subscription activated successfully";
                          else if (item.type === "subscription_cancelled")
                            title = isArabic ? "تم إلغاء الاشتراك بنجاح" : "Subscription cancelled successfully";
                          else if (isExpiring)
                            title = isArabic ? "تذكير: باقتك قاربت على الانتهاء" : "Subscription Expiring Soon";
                          else
                            title = isArabic ? "إشعار وتنبيه جديد" : "New Notification";
                        }

                        return (
                          <div
                            key={item.id || item._id || item.payload?.id || idx}
                            onClick={() => onNotificationClick && onNotificationClick(item)}
                            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                              isExpiring
                                ? "bg-amber-50/60 hover:bg-amber-100/50 border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40 my-1"
                                : "hover:bg-slate-50 dark:hover:bg-slate-900/60"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon based on notification category/type */}
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                  isExpiring
                                    ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
                                    : isSupport
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : isOrder
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {isExpiring ? (
                                  <Clock className="w-4 h-4" />
                                ) : isSupport ? (
                                  <MessageSquare className="w-4 h-4" />
                                ) : isOrder ? (
                                  <ShoppingBag className="w-4 h-4" />
                                ) : (
                                  <Megaphone className="w-4 h-4" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-1">
                                  <h4
                                    className={`text-xs font-black leading-snug ${
                                      isExpiring
                                        ? "text-amber-900 dark:text-amber-300"
                                        : "text-slate-900 dark:text-white"
                                    }`}
                                  >
                                    {title}
                                  </h4>
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                    {formatRelativeTime(item.createdAt, isArabic)}
                                  </span>
                                </div>

                                {item.message && (
                                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                    {item.message}
                                  </p>
                                )}

                                {isExpiring && (
                                  <div className="mt-2 flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-black text-[10px] inline-flex items-center gap-1">
                                      <span>{item.actionLabel || (isArabic ? "تجديد الباقة الآن" : "Renew Plan")}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600 mx-auto flex items-center justify-center">
                          <CheckCheck className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isArabic ? "أنت على اطلاع دائم!" : "All caught up!"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {isArabic ? "لا توجد تنبيهات جديدة في الوقت الحالي" : "No new notifications right now"}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
