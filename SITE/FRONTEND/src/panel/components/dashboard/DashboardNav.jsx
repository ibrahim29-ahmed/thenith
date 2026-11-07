import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  X,
  Languages,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function DashboardNav({
  t,
  language,
  toggleLanguage,
  theme,
  toggleTheme,
  navItems,
  activeTab,
  onChangeTab,
  onLogout,
  isMobileMenuOpen: propIsMobileMenuOpen,
  setIsMobileMenuOpen: propSetIsMobileMenuOpen,
  policies = [],
  selectedPolicySlug = "",
  onSelectPolicy,

}) {
  const isRtl = language === "ar";
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const isMobileMenuOpen =
    propIsMobileMenuOpen !== undefined
      ? propIsMobileMenuOpen
      : internalMobileMenuOpen;
  const setIsMobileMenuOpen =
    propSetIsMobileMenuOpen || setInternalMobileMenuOpen;

  // Accordion state for policies sub-menu
  const [policiesOpen, setPoliciesOpen] = useState(activeTab === "policies");

  // Keep open when activeTab is "policies", and automatically close when switching to any other tab
  useEffect(() => {
    if (activeTab === "policies") {
      setPoliciesOpen(true);
    } else {
      setPoliciesOpen(false);
    }
  }, [activeTab]);



  // Split items: home, cards, messages go in the main bottom bar
  const mainItemIds = ["home", "cards", "messages"];
  const mainItems = navItems.filter((item) => mainItemIds.includes(item.id));
  const moreItems = navItems.filter((item) => !mainItemIds.includes(item.id));

  // Check if current active tab is inside the "more" items
  const isMoreActive = moreItems.some((item) => item.id === activeTab);

  const handleTabChange = (id) => {
    setPoliciesOpen(false);
    onChangeTab(id);
    setIsMobileMenuOpen(false);
  };

  const handleTogglePolicies = () => {
    setPoliciesOpen((prev) => !prev);
    if (activeTab !== "policies") {
      onChangeTab("policies");
    }
  };

  const handlePolicyItemClick = (slug) => {
    if (onSelectPolicy) onSelectPolicy(slug);
    onChangeTab("policies");
    setIsMobileMenuOpen(false);
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);



  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:col-span-3 lg:block">
        <nav className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-900 dark:bg-slate-950/45">
          <div className="px-4 pb-3 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            {t("navigation")}
          </div>
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setPoliciesOpen(false);
                    onChangeTab(item.id);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-colors cursor-pointer ${
                    active
                      ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {!!item.badge && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Usage Policy Accordion in Desktop Sidebar */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-900 px-1">
            <button
              type="button"
              onClick={handleTogglePolicies}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "policies"
                  ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <span>{isRtl ? "سياسة الاستخدام" : "Terms of Use"}</span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  policiesOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Sub-menu of policies */}
            <AnimatePresence>
              {policiesOpen && policies && policies.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-1 space-y-1 pe-1 ps-4 py-1"
                >
                  {policies.map((p) => {
                    const title =
                      typeof p.title === "object"
                        ? p.title?.[language] || p.title?.ar || p.title?.en || ""
                        : p.title;
                    const isSelected =
                      activeTab === "policies" && selectedPolicySlug === p.slug;

                    return (
                      <button
                        key={p._id || p.slug}
                        type="button"
                        onClick={() => handlePolicyItemClick(p.slug)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 font-black"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                        }`}
                      >
                        <span className="truncate">{title}</span>
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            isSelected
                              ? "bg-indigo-600 dark:bg-indigo-400"
                              : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        />
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </aside>

      {/* ── Mobile Bottom Bar (Main items + More) ───────────────────────── */}
      <nav
        dir={isRtl ? "rtl" : "ltr"}
        className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] start-2.5 end-2.5 sm:start-4 sm:end-4 z-40 flex rounded-[24px] border border-slate-200/90 bg-white/95 px-1 sm:px-2 py-1.5 shadow-xl shadow-slate-950/10 backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-950/95 lg:hidden"
      >
        <div className="flex w-full items-center justify-around gap-1">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className="relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1"
              >
                <span
                  className={`flex h-9 w-12 items-center justify-center rounded-2xl transition-colors ${
                    active
                      ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                      : "text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`max-w-full truncate text-[10px] font-black ${
                    active ? "text-slate-900 dark:text-white" : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
                {!!item.badge && (
                  <span className="absolute end-1 top-0 rounded-full bg-indigo-600 px-1.5 text-[9px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Settings / More button */}
          {(() => {
            const moreBadgeCount = moreItems.reduce((acc, item) => {
              if (typeof item.badge === "number") return acc + item.badge;
              if (item.badge) return acc + 1;
              return acc;
            }, 0);

            return (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1"
              >
                <span
                  className={`flex h-9 w-12 items-center justify-center rounded-2xl transition-colors relative ${
                    isMoreActive
                      ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                      : "text-slate-400"
                  }`}
                >
                  <Menu className="h-5 w-5" />
                  {moreBadgeCount > 0 && (
                    <span className="absolute -end-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950">
                      {moreBadgeCount}
                    </span>
                  )}
                </span>
                <span
                  className={`max-w-full truncate text-[10px] font-black ${
                    isMoreActive
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400"
                  }`}
                >
                  {t("more") || (isRtl ? "المزيد" : "More")}
                </span>
              </button>
            );
          })()}
        </div>
      </nav>

      {/* ── Mobile Sidebar Drawer ───────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-slate-950/60"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: isRtl ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? "100%" : "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className={`absolute top-0 bottom-0 ${
                isRtl ? "right-0" : "left-0"
              } w-4/5 max-w-xs bg-white dark:bg-slate-950 shadow-2xl flex flex-col`}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-slate-800 dark:text-white">
                  {t("navigation")}
                </h3>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold transition-colors ${
                        active
                          ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {!!item.badge && (
                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* ── Settings, Theme, Language & Logout Section ────────── */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                  <p className="px-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    {isRtl ? "الإعدادات والحساب" : "Settings & Account"}
                  </p>

                  {/* Theme Switcher: Segmented Control */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-100 p-1 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        if (theme === "dark") toggleTheme();
                      }}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                        theme !== "dark"
                          ? "bg-white text-amber-600 shadow-xs dark:bg-slate-800 dark:text-amber-400"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      <Sun className="h-4 w-4" />
                      <span>{isRtl ? "فاتح" : "Light"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (theme !== "dark") toggleTheme();
                      }}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                        theme === "dark"
                          ? "bg-slate-950 text-indigo-400 shadow-xs dark:bg-slate-800 dark:text-indigo-400"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      <Moon className="h-4 w-4" />
                      <span>{isRtl ? "داكن" : "Dark"}</span>
                    </button>
                  </div>

                  {/* Language Switcher */}
                  <button
                    type="button"
                    onClick={toggleLanguage}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span className="flex items-center gap-2.5">
                      <Languages className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{isRtl ? "لغة الواجهة" : "Language"}</span>
                    </span>
                    <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-black text-indigo-600 border border-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/60 dark:text-indigo-400">
                      {language === "ar" ? "English" : "العربية"}
                    </span>
                  </button>

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-2.5 text-xs font-bold text-rose-600 transition-all hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 active:scale-98"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t("logout") || (isRtl ? "تسجيل الخروج" : "Logout")}</span>
                  </button>

                  {/* Usage Policy Accordion in Mobile Drawer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={handleTogglePolicies}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        activeTab === "policies"
                          ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <ShieldCheck className="h-4 w-4 text-indigo-500" />
                        <span>{isRtl ? "سياسة الاستخدام" : "Terms of Use"}</span>
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          policiesOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Sub-menu of policies inside drawer */}
                    <AnimatePresence>
                      {policiesOpen && policies && policies.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden mt-1 space-y-1 pe-1 ps-4 py-1"
                        >
                          {policies.map((p) => {
                            const title =
                              typeof p.title === "object"
                                ? p.title?.[language] || p.title?.ar || p.title?.en || ""
                                : p.title;
                            const isSelected =
                              activeTab === "policies" &&
                              selectedPolicySlug === p.slug;

                            return (
                              <button
                                key={p._id || p.slug}
                                type="button"
                                onClick={() => handlePolicyItemClick(p.slug)}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 font-black"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                                }`}
                              >
                                <span className="truncate">{title}</span>
                                <span
                                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                    isSelected
                                      ? "bg-indigo-600 dark:bg-indigo-400"
                                      : "bg-slate-300 dark:bg-slate-700"
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
