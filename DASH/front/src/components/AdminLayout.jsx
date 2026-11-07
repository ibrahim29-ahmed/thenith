import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Bell, Search, ShieldCheck, X } from "lucide-react";
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

  return (
    <div
      className="min-h-screen bg-slate-50 flex text-slate-800"
      style={{ fontFamily: '"Rubik", sans-serif' }}
    >
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#1d1d1f] text-white flex flex-col fixed inset-y-0 end-0 z-50">
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
            <div>
              <DashboardLogo className="text-white dark:text-white" />
              <p className="text-xs text-slate-400 font-medium">
                لوحة الإدارة الشاملة
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === "/dashboard"}
                onClick={() => {
                  if (item.id === "support") clearNotifications();
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${
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

        <div className="p-4 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 me-72 min-h-screen flex flex-col relative">
        {/* TOP HEADER */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="relative w-96">
            <Search className="w-4 h-4 text-slate-400 absolute end-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث عن مستخدم، اشتراك، أو قسم..."
              className="w-full bg-slate-50 border border-slate-200/90 rounded-xl py-2.5 pe-11 ps-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-xs"
            />
          </div>

          <div className="flex items-center gap-6">
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
                <div className="absolute top-10 end-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-4 animate-in fade-in slide-in-from-top-4 duration-300 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
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

            <div className="flex items-center gap-3 ps-4 border-s border-slate-200">
              <div className="text-start">
                <p className="text-sm font-bold text-slate-800">
                  {adminUser?.name || adminUser?.username || "Admin"}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {isSuperAdmin
                    ? "المدير العام (Super Admin)"
                    : (adminUser?.title || "مشرف محدد الصلاحيات")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg uppercase shadow-sm border border-indigo-200">
                {(adminUser?.name || adminUser?.username || "A")[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Toast Alert overlay for real-time pop */}
        {latestMessage && navNotificationCount > 0 && (
          <div className="absolute top-24 end-8 w-80 bg-[#1d1d1f] text-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] p-4 animate-in slide-in-from-bottom-8 fade-in duration-300 z-50">
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
        <div className="flex-1 p-8">
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
