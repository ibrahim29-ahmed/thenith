import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Bell, ShieldCheck, X, Menu } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useState, useEffect } from "react";
import DashboardLogo from "./DashboardLogo.jsx";
import { DASHBOARD_NAV_ITEMS } from "../constants/navigation.js";
import useDashboardNotifications from "../hooks/useDashboardNotifications.js";
import { fetchSiteSettings } from "../services/adminApi.js";

export default function AdminLayout() {
  const location = useLocation();
  const { logout, adminUser, hasPermission, isSuperAdmin } = useAdminAuth();
  const {
    unreadTabCount,
    navNotificationCount,
    latestMessage,
    clearNotifications,
  } = useDashboardNotifications(location.pathname);

  const [siteName, setSiteName] = useState(
    () => localStorage.getItem("admin_site_name") || "Thenith"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    fetchSiteSettings()
      .then((s) => {
        if (s?.site_name) {
          setSiteName(s.site_name);
          localStorage.setItem("admin_site_name", s.site_name);
        }
      })
      .catch(() => {});

    const handleSiteNameUpdated = (e) => {
      if (e.detail) {
        setSiteName(e.detail);
        localStorage.setItem("admin_site_name", e.detail);
      }
    };
    window.addEventListener("site-name-updated", handleSiteNameUpdated);
    return () => window.removeEventListener("site-name-updated", handleSiteNameUpdated);
  }, []);

  useEffect(() => {
    const matchedItem = DASHBOARD_NAV_ITEMS.find((item) =>
      item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)
    );
    let pageLabel = matchedItem?.label || "لوحة التحكم";
    if (location.pathname.startsWith("/cards/") && location.pathname !== "/cards") {
      pageLabel = "تفاصيل الكارت الذكي";
    }

    const titleBase = `${pageLabel} | ${siteName}`;
    document.title =
      unreadTabCount > 0 ? `(${unreadTabCount}) ${titleBase}` : titleBase;
  }, [location.pathname, unreadTabCount, siteName]);

  const navItems = DASHBOARD_NAV_ITEMS.filter((item) => hasPermission(item.permission));
  const activeNavItem = navItems.find((item) =>
    item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)
  );
  const currentPageLabel = location.pathname.startsWith("/cards/")
    ? "تفاصيل الكارت الذكي"
    : activeNavItem?.label || "لوحة التحكم";

  return (
    <div
      className="admin-shell min-h-screen bg-slate-50 flex text-slate-800"
      style={{ fontFamily: '"Rubik", sans-serif' }}
    >
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة الجانبية"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 end-0 z-50 flex w-[min(86vw,18rem)] flex-col bg-[#1d1d1f] text-white transition-transform duration-300 lg:w-72 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5 sm:h-20 sm:px-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
            <div>
              <DashboardLogo className="text-white dark:text-white" />
              <p className="text-xs text-slate-400 font-medium">
                لوحة الإدارة الشاملة
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="إغلاق القائمة الجانبية"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5 sm:px-4 sm:py-7">
          {navItems.map((item) => {
            const isActive = item.path === "/"
              ? location.pathname === "/"
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            const Icon = item.icon;

            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === "/dashboard"}
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (item.id === "support") clearNotifications();
                }}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`}
                  />
                  {item.label}
                </div>
                {item.id === "support" && navNotificationCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-in zoom-in duration-300">
                    {navNotificationCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3 sm:p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="relative flex min-h-screen min-w-0 flex-1 flex-col lg:me-72">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:h-20 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              aria-label="فتح القائمة الجانبية"
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-sidebar"
              onClick={() => setMobileMenuOpen(true)}
              className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 flex-col md:flex">
              <span className="text-[10px] font-bold text-slate-400">لوحة الإدارة</span>
              <span className="truncate text-sm font-bold text-slate-800">{currentPageLabel}</span>
            </div>
            <span className="min-w-0 truncate text-sm font-bold text-slate-800 md:hidden">
              {currentPageLabel}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-6">
            <div className="relative group">
              <button className="relative text-slate-500 hover:text-slate-800 transition-colors pt-2">
                <Bell className="w-6 h-6" />
                {navNotificationCount > 0 && (
                  <span className="absolute top-0 end-0 w-4 h-4 text-[10px] bg-rose-500 text-white flex items-center justify-center font-bold border-2 border-white rounded-full">
                    {navNotificationCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown / Toast */}
              {latestMessage && navNotificationCount > 0 && (
                <div className="absolute top-10 end-0 z-50 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-100 bg-white p-4 opacity-0 shadow-xl transition-opacity duration-300 group-hover:opacity-100 animate-in fade-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-800">
                      رسائل جديدة
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const a = document.getElementById(
                            "admin-global-notify",
                          );
                          if (a) {
                            a.volume = 0.8;
                            a.play().catch(console.error);
                          }
                        }}
                        className="text-xs text-emerald-600 font-medium"
                      >
                        تجربة الصوت
                      </button>
                      <button
                        onClick={clearNotifications}
                        className="text-xs text-indigo-600 font-medium"
                      >
                        تحديد كمقروء
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">
                      {new Date(
                        latestMessage.createdAt || Date.now(),
                      ).toLocaleTimeString("ar-EG-u-nu-latn", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-sm text-slate-800 font-medium truncate">
                      {latestMessage.content}
                    </p>
                  </div>
                  <NavLink
                    to="/dashboard/support"
                    onClick={clearNotifications}
                    className="block w-full text-center mt-3 text-xs bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                  >
                    عرض الدعم الفني
                  </NavLink>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-s border-slate-200 ps-2 sm:gap-3 sm:ps-4">
              <div className="hidden text-start sm:block">
                <p className="text-sm font-bold text-slate-800">
                  {adminUser?.name || adminUser?.username || "Admin"}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {isSuperAdmin
                    ? "المدير العام (Super Admin)"
                    : (adminUser?.title || "مشرف محدد الصلاحيات")}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100 text-base font-bold uppercase text-indigo-600 shadow-sm sm:h-10 sm:w-10 sm:text-lg">
                {(adminUser?.name || adminUser?.username || "A")[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Toast Alert overlay for real-time pop */}
        {latestMessage && navNotificationCount > 0 && (
          <div className="absolute end-3 top-20 z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[#1d1d1f] p-4 text-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom-8 fade-in duration-300 sm:end-8 sm:top-24">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm">رسالة جديدة</span>
              </div>
              <button
                onClick={clearNotifications}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
              {latestMessage.content}
            </p>
            <NavLink
              to="/dashboard/support"
              onClick={clearNotifications}
              className="mt-3 inline-block text-xs text-indigo-400 font-bold hover:text-indigo-300"
            >
              الرد الآن &larr;
            </NavLink>
          </div>
        )}

        {/* OUTLET */}
        <div className="min-w-0 flex-1 p-3 sm:p-5 lg:p-8">
          <Outlet />
        </div>
      </main>

      <audio
        id="admin-global-notify"
        src="/sounds/digital-notification.mp3"
        preload="auto"
      />
    </div>
  );
}
