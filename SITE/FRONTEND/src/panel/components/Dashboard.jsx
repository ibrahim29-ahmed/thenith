import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeDollarSign,
  Gift,
  CreditCard,
  Home,
  Headset,
  Mail,
  ShoppingBag,
  Sparkles,
  User,
  Wifi,
  X,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { isFeatureEnabled } from "../config/features.js";
import { useDashboardData } from "../hooks/useDashboardData.js";
import { useLanguage } from "../hooks/useLanguage.jsx";
import { useTheme } from "../hooks/useTheme.jsx";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import DashboardNav from "./dashboard/DashboardNav.jsx";
import HomePage from "./dashboard/HomePage.jsx";
import CardsPage from "./dashboard/CardsPage.jsx";
import CardEditor from "./dashboard/CardEditor.jsx";
import MessagesPage from "./dashboard/MessagesPage.jsx";
import ProfilePage from "./dashboard/ProfilePage.jsx";
import ProductsPage from "./dashboard/ProductsPage.jsx";
import SubscriptionsPage from "./dashboard/SubscriptionsPage.jsx";
import PanelCart from "./dashboard/PanelCart.jsx";
import PanelCheckout from "./dashboard/PanelCheckout.jsx";
import SupportPage from "./dashboard/SupportPage.jsx";
import LinkCardPage from "./dashboard/LinkCardPage.jsx";
import CustomCardPage from "../../pages/store/CustomCardPage.jsx";
import { checkUsername } from "../services/authApi.js";
import { useCart } from "../../context/CartContext.jsx";
import api from "../../api/index.js";
import { toast } from "react-hot-toast";
import { publicClient } from "../../api/client.js";
import ReferralsPage from "./dashboard/ReferralsPage.jsx";
import PanelPoliciesPage from "./dashboard/PanelPoliciesPage.jsx";
import {
  DashboardHomeSkeleton,
  SubscriptionsSkeleton,
  CardsSkeleton,
  ProductsSkeleton,
  PoliciesSkeleton,
  SupportSkeleton,
} from "./skeletons/index.js";

// Card with Pen Icon (أيقونة بطاقة مع قلم لتخصيص وتصميم الكارت)
export function CardWithPenIcon({ className = "h-4 w-4", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M2 9V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2" />
      <path d="M2 13v4a2 2 0 0 0 2 2h8" />
      <line x1="2" x2="16" y1="9" y2="9" />
      <line x1="6" x2="9" y1="14" y2="14" />
      <path d="m14 17.5 5.5-5.5a1.414 1.414 0 0 1 2 2L16 19.5l-3.5 1z" />
      <line x1="17.5" y1="14" x2="19.5" y2="16" />
    </svg>
  );
}

const VALID_TABS = [
  "home",
  "cards",
  "messages",
  "products",
  "custom-card",
  "subscriptions",
  "profile",
  "link-card",
  "support",
  "cart",
  "checkout",
  "cardEdit",
  "policies",
  "referrals",
];

function getTabFromLocation(pathname, search) {
  const cleanPath = (pathname || "").replace(/\/+$/, "");
  const segments = cleanPath.split("/").filter(Boolean);

  // Check segments from last to first (e.g. /u/products or /u/adam/products)
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i].toLowerCase();
    if (VALID_TABS.includes(seg)) {
      return seg;
    }
  }

  // Fallback to query param ?tab=
  if (search) {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");
    if (tab && VALID_TABS.includes(tab.toLowerCase())) {
      return tab.toLowerCase();
    }
  }

  return "home";
}

export default function Dashboard({ onLogout, onDeleteAccount }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const dashboard = useDashboardData();
  const user = dashboard.owner || dashboard.dashboardData?.owner || {};
  const { cart } = useCart();
  const [isUploading, setIsUploading] = useState(false);

  const uploadCallbacks = {
    onUploadStart: () => setIsUploading(true),
    onUploadEnd: () => setIsUploading(false),
  };

  // pass isUploading and callbacks to CardEditor
  // pass isUploading and hasOwnerChanges to ProfilePage

  const [editSection, setEditSection] = useState("personal");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [customLinkOpen, setCustomLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState({ name: "", url: "" });
  const [supportUnreadEventCount, setSupportUnreadEventCount] = useState(0);

  const [localTab, setLocalTab] = useState(null);
  const activeTab = localTab || getTabFromLocation(location.pathname, location.search);

  useEffect(() => {
    setLocalTab(null);
  }, [location.pathname, location.search]);
  const [selectedCustomProduct, setSelectedCustomProduct] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [cancelingPayment, setCancelingPayment] = useState(false);

  const [supportNotifications, setSupportNotifications] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicySlug, setSelectedPolicySlug] = useState("");

  useEffect(() => {
    let mounted = true;
    publicClient
      .get("/policies")
      .then((res) => {
        if (mounted && Array.isArray(res.data?.policies)) {
          setPolicies(res.data.policies.filter((p) => p.isActive !== false));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  

  // Fetch notifications on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifs = await api.notifications.getAll();
        setSupportNotifications(notifs);
      } catch (err) {
      }
    };
    loadNotifications();
  }, []);
  
  const supportUnread = Math.max(supportUnreadEventCount, supportNotifications.filter(n => n.type === "support_message").length);

  const unreadToastShownRef = useRef(false);
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const showSupportAlert = () => {
    // If the user is currently viewing the support chat, skip toast
    if (activeTabRef.current === "support") return;

    const isAr = language === "ar";

    toast.custom(
      (t) => (
        <div
          dir={isAr ? "rtl" : "ltr"}
          className={`pointer-events-auto transition-all duration-300 transform ${
            t.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"
          }`}
          style={{ marginTop: "16px" }}
        >
          <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-full bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md shadow-xl border border-white/10 ring-1 ring-black/10">
            <span className="text-sm font-semibold tracking-wide">
              {isAr ? "رسالة جديدة من الدعم الفني" : "New message from Support"}
            </span>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                changeMainTab("support");
              }}
              className="px-3.5 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all shrink-0 shadow-sm"
            >
              {isAr ? "الذهاب للرسالة" : "Go to message"}
            </button>
          </div>
        </div>
      ),
      {
        id: "support-message-alert",
        duration: 7000,
        position: "top-center",
      }
    );
  };

  useEffect(() => {
    if (supportUnread > 0 && !unreadToastShownRef.current && activeTab !== "support") {
      unreadToastShownRef.current = true;
      showSupportAlert(
        language === "ar"
          ? "لديك رسائل غير مقروءة بانتظارك في المحادثة"
          : "You have unread support messages waiting for you"
      );
    }
  }, [supportUnread, language, activeTab]);

  useEffect(() => {
    const handleSupportUnread = (e) => setSupportUnreadEventCount(e.detail);
    const handleSupportNewMessage = async (e) => {
      unreadToastShownRef.current = true;
      const content = e.detail?.content || "";
      showSupportAlert(content);

      try {
        const msgTitle = language === "ar" ? "رد جديد من الدعم الفني" : "New reply from Support";
        const notif = await api.notifications.create({
          type: "support_message",
          title: msgTitle,
          message: content,
        });
        setSupportNotifications((prev) => [notif, ...prev]);
      } catch (err) {}
    };

    const handleAdminPushNotification = async (e) => {
      const notif = e.detail;
      toast(notif.title, {
        icon: '🔔',
        duration: 5000,
        position: 'top-center',
        style: {
          marginTop: '14px',
          maxWidth: 'calc(100vw - 32px)',
          borderRadius: '14px',
          background: '#0f172a',
          color: '#fff',
          fontSize: '13px',
          direction: language === "ar" ? "rtl" : "ltr",
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        },
      });
      
      // We don't need to call create() because the server already saved it.
      // We just need to reload from the server to get the exact ID (or add locally if notifId exists)
      if (notif.notifId) {
        setSupportNotifications((prev) => [
          {
            _id: notif.notifId,
            type: "admin_push",
            title: notif.title,
            message: notif.message || "",
            timestamp: notif.timestamp,
            read: false,
          },
          ...prev,
        ]);
      } else {
        // If no ID was provided (e.g. broadcast), reload notifications
        try {
          const all = await api.notifications.getAll();
          setSupportNotifications(all);
        } catch (err) {}
      }
    };

    // Generic handler: any page can dispatch 'dashboard-action' to add a notification
    const handleDashboardAction = async (e) => {
      const { title, type = "action", message: msg = "" } = e.detail || {};
      if (!title) return;
      try {
        const notif = await api.notifications.create({ type, title, message: msg });
        setSupportNotifications((prev) => [notif, ...prev]);
      } catch (err) {
      }
    };

    window.addEventListener("support-unread", handleSupportUnread);
    window.addEventListener("support-new-message", handleSupportNewMessage);
    window.addEventListener("admin-push-notification", handleAdminPushNotification);
    window.addEventListener("dashboard-action", handleDashboardAction);
    
    return () => {
      window.removeEventListener("support-unread", handleSupportUnread);
      window.removeEventListener("support-new-message", handleSupportNewMessage);
      window.removeEventListener("admin-push-notification", handleAdminPushNotification);
      window.removeEventListener("dashboard-action", handleDashboardAction);
    };
  }, [language]);


  useEffect(() => {
    if (activeTab === "support") {
      setSupportUnreadEventCount(0);
      setSupportNotifications(prev => {
        const supportNotifs = prev.filter(n => n.type === "support_message");
        if (supportNotifs.length > 0) {
          supportNotifs.forEach(n => {
            const id = n._id || n.id;
            if (id) {
              api.notifications.deleteOne(id).catch(() => {});
            }
          });
        }
        return prev.filter(n => n.type !== "support_message");
      });
    }
  }, [activeTab]);

  const handleCancelPending = async () => {
    if (!pendingPayment?.transaction?.intentKey) return;
    setCancelingPayment(true);
    try {
      await api.payment.cancel(pendingPayment.transaction.intentKey);
      setPendingPayment(null);
    } catch (err) {
    } finally {
      setCancelingPayment(false);
    }
  };

  const navItems = [
    { id: "home", label: t("home"), icon: Home, feature: "analytics" },
    { id: "cards", label: t("cards"), icon: CreditCard, feature: "cards" },
    {
      id: "messages",
      label: t("messages"),
      icon: Mail,
      badge: dashboard?.totalInboxCount || 0,
      feature: "messages",
    },
    {
      id: "products",
      label: t("products"),
      icon: ShoppingBag,
      feature: "products",
    },
    {
      id: "custom-card",
      label: language === "ar" ? "صمّم كارتك" : "Custom Card",
      icon: CardWithPenIcon,
      feature: "products",
    },
    {
      id: "subscriptions",
      label: t("subscriptions"),
      icon: BadgeDollarSign,
      feature: "subscriptions",
    },
    { id: "profile", label: t("profile"), icon: User, feature: "profile" },
    {
      id: "referrals",
      label: language === "ar" ? "دعوة الأصدقاء والمكافآت" : "Referrals & Rewards",
      icon: Gift,
    },
    { id: "link-card", label: language === "ar" ? "اربط كرتك" : "Link Card", icon: Wifi },
    { id: "support", label: t("support"), icon: Headset, badge: supportUnread > 0 ? supportUnread : undefined },
    ...(cart.length > 0
      ? [
          {
            id: "cart",
            label: language === "ar" ? "السلة" : "Cart",
            icon: ShoppingBag,
            badge: cart.length,
            feature: "products",
          },
        ]
      : []),
  ].filter((item) => isFeatureEnabled(item.feature));

  const screenTitle =
    activeTab === "cardEdit" && dashboard?.activeCard
      ? `${t("editCard")} - ${dashboard.activeCard.name}`
      : activeTab === "messages" && dashboard?.selectedMessageCard
        ? dashboard.selectedMessageCard.name
        : activeTab === "policies"
        ? (language === "ar" ? "سياسة الاستخدام والشروط" : "Terms & Policies")
        : navItems.find((item) => item.id === activeTab)?.label || t("appName");

  useEffect(() => {
    const isAr = language === "ar";
    const customSiteName = typeof window !== "undefined" && window.__SITE_NAME__;
    const brand = customSiteName || "Thenith";
    const titleBase = isAr ? `${screenTitle} | ${brand}` : `${brand} | ${screenTitle}`;
    document.title = supportUnread > 0 ? `(${supportUnread}) ${titleBase}` : titleBase;
  }, [screenTitle, supportUnread, language]);

  if (dashboard.status === "error" || (!dashboard.hasRemoteData && dashboard.status !== "loading")) {
    return (
      <LoadingScreen
        label={t("dashboardLoadError")}
        actionLabel={t("logout")}
        onAction={onLogout}
      />
    );
  }

  const openCardEditor = (cardId, section = "personal") => {
    dashboard.setActiveCardId(cardId);
    setEditSection(section);
    setLocalTab("cardEdit");
  };

  const addCard = async () => {
    const card = await dashboard.addCard();
    if (card) {
      setEditSection("personal");
      setLocalTab("cardEdit");
    }
    return card;
  };

  const switchTab = (tabId) => {
    if (tabId === "messages") dashboard.setSelectedMessageCardId(null);
    if (tabId === "cardEdit") {
      setLocalTab("cardEdit");
      return;
    }
    setLocalTab(null);
    const targetPath = tabId === "home" ? "/u" : `/u/${tabId}`;
    if (location.pathname !== targetPath || location.search) {
      navigate(targetPath);
    }
  };

  const changeMainTab = (tabId) => {
    switchTab(tabId);
  };

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className="min-h-screen overflow-x-clip bg-slate-100 pb-28 text-slate-900 dark:bg-[#03070c] dark:text-slate-100 lg:bg-slate-50 lg:pb-10"
    >
      <DashboardHeader
        t={t}
        language={language}
        toggleLanguage={toggleLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
        title={screenTitle}
        entitlements={dashboard.entitlements}
        notifications={[...supportNotifications, ...(dashboard.notifications || [])]}
        showNotifications={showNotifications}
        onToggleNotifications={() => setShowNotifications((value) => !value)}
        onCloseNotifications={() => setShowNotifications(false)}
        onNotificationClick={(item) => {
          const id = item._id || item.id;
          if (id) {
            api.notifications.deleteOne(id).catch(err => {});
            setSupportNotifications(prev => prev.filter(x => (x._id || x.id) !== id));
          }
          if (item.type === "support_message") {
            changeMainTab("support");
            setShowNotifications(false);
          } else if (
            item.type === "subscription_created" ||
            item.type === "subscription_cancelled" ||
            item.type === "subscription_expiring" ||
            item.category === "subscription"
          ) {
            changeMainTab("subscriptions");
            setShowNotifications(false);
          } else if (item.type === "order_created" || item.type === "order_cancelled" || item.category === "order") {
            changeMainTab("orders");
            setShowNotifications(false);
          } else if (item.link) {
            if (item.link.includes("subscription")) changeMainTab("subscriptions");
            else if (item.link.includes("order") || item.link.includes("product")) changeMainTab("orders");
            else if (item.link.includes("card")) changeMainTab("cards");
            else if (item.link.startsWith("http")) window.open(item.link, "_blank");
            setShowNotifications(false);
          }
        }}
        onClearAllNotifications={() => {
          api.notifications.clearAll().catch(() => {});
          setSupportNotifications([]);
        }}
        onLogout={onLogout}
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-3 pt-2.5 pb-28 sm:gap-4 sm:px-4 sm:pt-3 md:px-8 md:pt-6 lg:grid-cols-12 lg:gap-6 lg:pb-12">
        <DashboardNav
          t={t}
          language={language}
          toggleLanguage={toggleLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
          navItems={navItems}
          activeTab={activeTab}
          onChangeTab={changeMainTab}
          onLogout={onLogout}
          policies={policies}
          selectedPolicySlug={selectedPolicySlug}
          onSelectPolicy={setSelectedPolicySlug}

        />

        <main className="relative min-w-0 bg-transparent px-0 py-0 shadow-none sm:rounded-[28px] sm:bg-slate-50 sm:px-1 sm:py-2 sm:shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:sm:bg-slate-950/20 md:rounded-none md:bg-transparent md:p-0 md:shadow-none lg:col-span-9">
          {dashboard.status === "loading" ? (
            activeTab === "subscriptions" ? (
              <SubscriptionsSkeleton isArabic={language === "ar"} />
            ) : activeTab === "products" ? (
              <ProductsSkeleton isArabic={language === "ar"} />
            ) : activeTab === "cards" ? (
              <CardsSkeleton isArabic={language === "ar"} />
            ) : activeTab === "policies" ? (
              <PoliciesSkeleton isArabic={language === "ar"} />
            ) : activeTab === "support" ? (
              <SupportSkeleton isArabic={language === "ar"} />
            ) : (
              <DashboardHomeSkeleton isArabic={language === "ar"} />
            )
          ) : (
            <AnimatePresence mode="wait">
            {activeTab === "home" && isFeatureEnabled("analytics") && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <HomePage
                  t={t}
                  language={language}
                  permissions={dashboard.permissions}
                  entitlements={dashboard.entitlements}
                  metrics={dashboard.metrics}
                  visits={dashboard.visits}
                  notifications={[...supportNotifications, ...(dashboard.notifications || [])]}
                  cards={dashboard.cards}
                  activeCardLink={dashboard.activeCardLink}
                  activeCardId={dashboard.activeCardId}
                  subscription={dashboard.dashboardData?.subscription}
                  user={user}
                  onUpgrade={() => changeMainTab("subscriptions")}
                />
              </motion.div>
            )}

            {activeTab === "cards" && isFeatureEnabled("cards") && (
              <motion.div
                key="cards"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <CardsPage
                  t={t}
                  cards={dashboard.cards}
                  activeCardId={dashboard.activeCardId}
                  activeCardLink={dashboard.activeCardLink}
                  ownerUsername={dashboard.owner?.username || ""}
                  maxCards={dashboard.permissions?.maxCards}
                  entitlements={dashboard.entitlements}
                  onSelectCard={dashboard.setActiveCardId}
                  onEditCard={openCardEditor}
                  onAddCard={addCard}
                  onDeleteCard={dashboard.deleteCard}
                  isSwitchingCard={dashboard.isSwitchingCard}
                  onUpgrade={() => changeMainTab("subscriptions")}
                  ownerPaymentMethods={dashboard.owner?.paymentMethods}
                  ownerActivePaymentMethodId={dashboard.owner?.activePaymentMethodId}
                  ownerPublicId={dashboard.owner?.publicId || ""}
                />
              </motion.div>
            )}

            {activeTab === "cardEdit" && (
              <motion.div
                key={`card-edit-${editSection}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <CardEditor
                  t={t}
                  language={language}
                  card={dashboard.activeCard}
                  section={editSection}
                  dragItem={dragItem}
                  linkDraft={linkDraft}
                  showContactMenu={showContactMenu}
                  showLinkPicker={showLinkPicker}
                  customLinkOpen={customLinkOpen}
                  permissions={dashboard.permissions}
                  entitlements={dashboard.entitlements}
                  onUpgrade={() => changeMainTab("subscriptions")}
                  onBack={() => switchTab("cards")}
                  onChangeSection={setEditSection}
                  onSetDragItem={setDragItem}
                  onToggleContactMenu={setShowContactMenu}
                  onToggleLinkPicker={setShowLinkPicker}
                  onToggleCustomLink={setCustomLinkOpen}
                  onSetLinkDraft={setLinkDraft}
                  onUpdateCard={dashboard.updateActiveCard}
                  onSaveCard={dashboard.saveActiveCard}
                  onUpdatePersonal={dashboard.updatePersonal}
                  onUpdateContact={dashboard.updateContact}
                  onAddContact={dashboard.addContact}
                  onDeleteContact={dashboard.deleteContact}
                  onAddLink={dashboard.addLink}
                  onUpdateLink={dashboard.updateLink}
                  onDeleteLink={dashboard.deleteLink}
                  onReorderItems={dashboard.reorderCardItems}
                  hasCardChanges={dashboard.hasCardChanges}
                  isUploading={isUploading}
                  uploadCallbacks={uploadCallbacks}
                />
              </motion.div>
            )}

            {activeTab === "messages" && isFeatureEnabled("messages") && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <MessagesPage
                  t={t}
                  language={language}
                  cards={dashboard.cards}
                  selectedCard={dashboard.selectedMessageCard}
                  onOpenCard={(cardId) => {
                    dashboard.setSelectedMessageCardId(cardId);
                    dashboard.setActiveCardId(cardId);
                  }}
                  onBack={() => dashboard.setSelectedMessageCardId(null)}
                  onDeleteMessage={dashboard.deleteInboxItem}
                  onToggleRead={dashboard.toggleInboxItemRead}
                  onMarkRead={dashboard.markInboxItemRead}
                />
              </motion.div>
            )}

            {activeTab === "products" && isFeatureEnabled("products") && (
              <motion.div
                key="products"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <ProductsPage
                  t={t}
                  personal={dashboard.dashboardData?.owner || {}}
                  onOpenCart={() => switchTab("cart")}
                  onOpenCustomCard={(prod) => {
                    setSelectedCustomProduct(prod);
                    switchTab("custom-card");
                  }}
                  onOrder={(order) =>
                    dashboard.updateDashboard((current) => ({
                      ...current,
                      owner: {
                        ...(current.owner || {}),
                        orders: [order, ...(current.owner?.orders || [])],
                      },
                    }))
                  }
                />
              </motion.div>
            )}

            {activeTab === "custom-card" && (
              <div
                key="custom-card"
                className="w-full"
                style={{ transform: "none" }}
              >
                <CustomCardPage
                  isPanel={true}
                  preselectedProduct={selectedCustomProduct}
                  onBack={() => switchTab("products")}
                  onNavigateTab={(tab) => {
                    switchTab(tab);
                  }}
                />
              </div>
            )}

            {activeTab === "subscriptions" &&
              isFeatureEnabled("subscriptions") && (
                <motion.div
                  key="subscriptions"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <SubscriptionsPage
                    t={t}
                    subscription={dashboard.dashboardData?.subscription}
                    user={dashboard.dashboardData?.owner || dashboard.owner}
                    owner={dashboard.dashboardData?.owner || dashboard.owner}
                    onNavigateToProfile={() => switchTab("profile")}
                  />
                </motion.div>
              )}

            {activeTab === "profile" && isFeatureEnabled("profile") && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <ProfilePage
                  t={t}
                  language={language}
                  personal={dashboard.owner || {}}
                  permissions={dashboard.permissions}
                  entitlements={dashboard.entitlements}
                  onUpgrade={() => changeMainTab("subscriptions")}
                  onCheckUsername={checkUsername}
                  onUpdate={(data) =>
                    dashboard.updateDashboard((current) => ({
                      ...current,
                      owner: { ...current.owner, ...data },
                    }))
                  }
                  onPersistedUpdate={dashboard.updatePersistedOwner}
                  onDeleteAccount={onDeleteAccount}
                  onSaveProfile={dashboard.saveOwner}
                  isUploading={isUploading}
                  hasOwnerChanges={dashboard.hasOwnerChanges}
                />
              </motion.div>
            )}



            {activeTab === "link-card" && (
              <motion.div
                key="link-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <LinkCardPage t={t} language={language} />
              </motion.div>
            )}

            {activeTab === "cart" && (
              <motion.div
                key="cart"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <PanelCart t={t} onCheckout={() => switchTab("checkout")} />
              </motion.div>
            )}

            {activeTab === "referrals" && (
              <motion.div
                key="referrals"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <ReferralsPage
                  language={language}
                  user={dashboard?.user || {}}
                  subscription={dashboard?.dashboardData?.subscription}
                />
              </motion.div>
            )}

            {activeTab === "policies" && (
              <motion.div
                key="policies"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <PanelPoliciesPage
                  t={t}
                  language={language}
                  policies={policies}
                  selectedSlug={selectedPolicySlug}
                  onSelectPolicy={setSelectedPolicySlug}
                />
              </motion.div>
            )}

            

            {activeTab === "checkout" && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <PanelCheckout
                  t={t}
                  onBack={() => switchTab("cart")}
                  onGoToStore={() => switchTab("products")}
                />
              </motion.div>
            )}

          </AnimatePresence>
          )}

          <SupportPage
            t={t}
            language={language}
            isVisible={dashboard.status !== "loading" && activeTab === "support"}
          />

          
        </main>
      </div>
    </div>
  );
}

function LoadingScreen({ label, actionLabel, onAction }) {
  useEffect(() => {
    document.body.classList.add("loading-screen-active");
    return () => document.body.classList.remove("loading-screen-active");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
      <div className="flex flex-col items-center gap-4 text-center">
        {!onAction && (
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        )}
        <p className="max-w-sm text-sm font-bold">{label}</p>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
