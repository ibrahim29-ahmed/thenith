import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import {
  AdminAuthProvider,
  useAdminAuth,
} from "../context/AdminAuthContext.jsx";
import AdminLayout from "../components/AdminLayout.jsx";
import AdminLogin from "../pages/AdminLogin.jsx";
import Overview from "../pages/Overview.jsx";
import UsersManager from "../pages/UsersManager.jsx";
import CardsManager from "../pages/CardsManager.jsx";
import CardDetailsPage from "../pages/CardDetailsPage.jsx";
import SubscriptionsManager from "../pages/SubscriptionsManager.jsx";
import SubscriptionAnalytics from "../pages/SubscriptionAnalytics.jsx";
import StoreManager from "../pages/StoreManager.jsx";
import CouponsManager from "../pages/CouponsManager.jsx";
import InboxManager from "../pages/InboxManager.jsx";
import SupportDesk from "../pages/SupportDesk.jsx";
import Settings from "../pages/Settings.jsx";
import SecurityAudit from "../pages/SecurityAudit.jsx";
import PushNotifications from "../pages/PushNotifications.jsx";
import PaymentMethodsManager from "../pages/PaymentMethodsManager.jsx";
import SeoSitemapManager from "../pages/SeoSitemapManager.jsx";
import PoliciesManager from "../pages/PoliciesManager.jsx";
import ReferralsManager from "../pages/ReferralsManager.jsx";
import CustomCardManager from "../pages/CustomCardManager.jsx";
import AdminUsersManager from "../pages/AdminUsersManager.jsx";
import UserWalletsManager from "../pages/UserWalletsManager.jsx";
import { ShieldAlert, ShieldCheck } from "lucide-react";

function PermissionGuard({ permission, children }) {
  const { hasPermission } = useAdminAuth();

  if (!hasPermission(permission)) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center min-h-[60vh]" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">غير مصرح لك بالدخول</h2>
        <p className="text-slate-500 text-sm max-w-md leading-relaxed">
          حسابك الحالي لا يمتلك الصلاحيات الكافية للوصول إلى هذا القسم. يرجى مراجعة المسؤول الرئيسي (Super Admin).
        </p>
      </div>
    );
  }

  return children;
}

function IndexRouteResolver() {
  const { hasPermission } = useAdminAuth();
  if (hasPermission("overview")) return <Overview />;
  if (hasPermission("support")) return <Navigate to="/support" replace />;
  if (hasPermission("inbox")) return <Navigate to="/inbox" replace />;
  if (hasPermission("store")) return <Navigate to="/store" replace />;
  if (hasPermission("users")) return <Navigate to="/users" replace />;
  if (hasPermission("cards")) return <Navigate to="/cards" replace />;

  return (
    <div className="p-12 flex flex-col items-center justify-center text-center min-h-[60vh]" dir="rtl">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
        <ShieldCheck className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-black text-slate-800 mb-2">مرحباً بك في لوحة الإدارة</h2>
      <p className="text-slate-500 text-sm max-w-md leading-relaxed">
        يرجى اختيار أحد الأقسام المصرح لك بها من القائمة الجانبية للبدء.
      </p>
    </div>
  );
}

function DashboardRoutesContent() {
  const { isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      const siteName = localStorage.getItem("admin_site_name") || "Thenith";
      document.title = `تسجيل الدخول | ${siteName}`;
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<IndexRouteResolver />} />
        <Route path="users" element={<PermissionGuard permission="users"><UsersManager /></PermissionGuard>} />
        <Route path="user-wallets" element={<PermissionGuard permission="users"><UserWalletsManager /></PermissionGuard>} />
        <Route path="cards" element={<PermissionGuard permission="cards"><CardsManager /></PermissionGuard>} />
        <Route path="cards/:id" element={<PermissionGuard permission="cards"><CardDetailsPage /></PermissionGuard>} />
        <Route path="subscriptions" element={<PermissionGuard permission="subscriptions"><SubscriptionsManager /></PermissionGuard>} />
        <Route path="subscriptions-stats" element={<PermissionGuard permission="subscriptions_stats"><SubscriptionAnalytics /></PermissionGuard>} />
        <Route path="store" element={<PermissionGuard permission="store"><StoreManager /></PermissionGuard>} />
        <Route path="custom-card" element={<PermissionGuard permission="custom_card"><CustomCardManager /></PermissionGuard>} />
        <Route path="payment-methods" element={<PermissionGuard permission="payment_methods"><PaymentMethodsManager /></PermissionGuard>} />
        <Route path="coupons" element={<PermissionGuard permission="coupons"><CouponsManager /></PermissionGuard>} />
        <Route path="inbox" element={<PermissionGuard permission="inbox"><InboxManager /></PermissionGuard>} />
        <Route path="support" element={<PermissionGuard permission="support"><SupportDesk /></PermissionGuard>} />
        <Route path="push-notifications" element={<PermissionGuard permission="push_notifications"><PushNotifications /></PermissionGuard>} />
        <Route path="seo-sitemap" element={<PermissionGuard permission="seo_sitemap"><SeoSitemapManager /></PermissionGuard>} />
        <Route path="security" element={<PermissionGuard permission="security"><SecurityAudit /></PermissionGuard>} />
        <Route path="policies" element={<PermissionGuard permission="policies"><PoliciesManager /></PermissionGuard>} />
        <Route path="referrals" element={<PermissionGuard permission="referrals"><ReferralsManager /></PermissionGuard>} />
        <Route path="settings" element={<PermissionGuard permission="settings"><Settings /></PermissionGuard>} />
        <Route path="admin-users" element={<PermissionGuard permission="admin_users"><AdminUsersManager /></PermissionGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function DashboardRoutes() {
  return (
    <AdminAuthProvider>
      <DashboardRoutesContent />
    </AdminAuthProvider>
  );
}
