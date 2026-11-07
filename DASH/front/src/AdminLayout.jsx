import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Bell, Search, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useEffect } from "react";
import DashboardLogo from "./DashboardLogo.jsx";
import { DASHBOARD_NAV_ITEMS } from "../constants/navigation.js";
import useDashboardNotifications from "../hooks/useDashboardNotifications.js";

export default function AdminLayout() {
  const location = useLocation();
  const { logout, adminUser } = useAdminAuth();
  const { unreadTabCount } = useDashboardNotifications(location.pathname);

  useEffect(() => {
    document.title =
      unreadTabCount > 0
        ? `(${unreadTabCount}) Thenith | Admin`
        : "Thenith | Admin";
  }, [unreadTabCount]);

  const navItems = DASHBOARD_NAV_ITEMS;

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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`}
                />
                {item.label}
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
      <main className="flex-1 me-72 min-h-screen flex flex-col">
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
            <button className="relative text-slate-500 hover:text-slate-800 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 end-0 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 ps-4 border-s border-slate-200">
              <div className="text-start" >
                <p className="text-sm font-bold text-slate-800">
                  {adminUser?.username || "Admin"}
                </p>
                <p className="text-xs text-slate-500">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg uppercase">
                {(adminUser?.username || "A")[0]}
              </div>
            </div>
          </div>
        </header>

        {/* OUTLET */}
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>

      <audio
        id="admin-global-notify"
        src="/sounds/main-notification.mp3"
        preload="auto"
      />
    </div>
  );
}
