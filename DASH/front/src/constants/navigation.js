import React from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  QrCode,
  Bell,
  ShieldAlert,
  Store,
  PieChart,
  Tag,
  MessageSquare,
  Headphones,
  Settings,
  WalletCards,
  Globe,
  FileText,
  Gift,
  Sparkles,
  UserCog,
  Wallet,
} from "lucide-react";

export function CardWithPenIcon({ className = "h-4 w-4", ...props }) {
  return React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      ...props,
    },
    React.createElement("path", { d: "M2 9V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2" }),
    React.createElement("path", { d: "M2 13v4a2 2 0 0 0 2 2h8" }),
    React.createElement("line", { x1: "2", x2: "16", y1: "9", y2: "9" }),
    React.createElement("line", { x1: "6", x2: "9", y1: "14", y2: "14" }),
    React.createElement("path", { d: "m14 17.5 5.5-5.5a1.414 1.414 0 0 1 2 2L16 19.5l-3.5 1z" }),
    React.createElement("line", { x1: "17.5", x2: "19.5", y1: "14", y2: "16" })
  );
}

export const DASHBOARD_NAV_ITEMS = [
  { id: "overview", path: "/", icon: LayoutDashboard, label: "نظرة عامة", permission: "overview" },
  { id: "support", path: "/support", icon: Headphones, label: "مكتب الدعم الفني", permission: "support" },
  { id: "inbox", path: "/inbox", icon: MessageSquare, label: "صندوق الرسائل", permission: "inbox" },
  { id: "users", path: "/users", icon: Users, label: "إدارة المستخدمين", permission: "users" },
  { id: "user-wallets", path: "/user-wallets", icon: Wallet, label: "إدارة صفحة وسائل الدفع", permission: "users" },
  { id: "cards", path: "/cards", icon: QrCode, label: "إدارة المنتجات والكروت", permission: "cards" },
  { id: "subscriptions", path: "/subscriptions", icon: CreditCard, label: "الاشتراكات والباقات", permission: "subscriptions" },
  { id: "subscriptions-stats", path: "/subscriptions-stats", icon: PieChart, label: "إحصائيات الاشتراكات", permission: "subscriptions_stats" },
  { id: "store", path: "/store", icon: Store, label: "إدارة المتجر", permission: "store" },
  { id: "custom-card", path: "/custom-card", icon: CardWithPenIcon, label: "صمم كارتك (Studio)", permission: "custom_card" },
  { id: "payment-methods", path: "/payment-methods", icon: WalletCards, label: "طرق الدفع والتسوية", permission: "payment_methods" },
  { id: "coupons", path: "/coupons", icon: Tag, label: "كوبونات الخصم", permission: "coupons" },
  { id: "referrals", path: "/referrals", icon: Gift, label: "إدارة الإحالات والمكافآت", permission: "referrals" },
  { id: "push-notifications", path: "/push-notifications", icon: Bell, label: "إرسال الإشعارات", permission: "push_notifications" },
  { id: "seo-sitemap", path: "/seo-sitemap", icon: Globe, label: "السيو والسايت ماب", permission: "seo_sitemap" },
  { id: "security", path: "/security", icon: ShieldAlert, label: "التدقيق الأمني", permission: "security" },
  { id: "policies", path: "/policies", icon: FileText, label: "إدارة السياسات", permission: "policies" },
  { id: "settings", path: "/settings", icon: Settings, label: "الإعدادات", permission: "settings" },
  { id: "admin-users", path: "/admin-users", icon: UserCog, label: "فريق العمل والمشرفين", permission: "admin_users" },
];

export default DASHBOARD_NAV_ITEMS;