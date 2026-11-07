import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ShoppingCart, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GlobalLogo from "./GlobalLogo.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

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

export default function MainNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { totalItems } = useCart();
  const { language, setLanguage, t } = useGlobalLanguage();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isStore =
    location.pathname.includes("/products") ||
    location.pathname.includes("/cart");

  const shouldHideNavbar =
    location.pathname.startsWith("/u") ||
    location.pathname.startsWith("/p/") ||
    location.pathname.startsWith("/c/") ||
    location.pathname === "/login" ||
    location.pathname === "/signup";

  if (shouldHideNavbar) return null;

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
          isScrolled || isStore
            ? "bg-white/40 backdrop-blur-xl border-slate-200/50 shadow-sm"
            : "bg-white/10 backdrop-blur-md border-transparent"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <GlobalLogo className="group-hover:scale-105 transition-transform" />
          </Link>

          <nav className="hidden lg:flex items-center gap-10 text-[15px] font-medium text-slate-500">
            <Link
              to="/"
              className="hover:text-slate-900 hover:-translate-y-0.5 transition-all"
            >
              {t("navbar.home")}
            </Link>
            <Link
              to={isAuthenticated ? "/u/products" : "/products"}
              className="hover:text-slate-900 hover:-translate-y-0.5 transition-all"
            >
              {t("navbar.products")}
            </Link>
            <Link
              to="/pricing"
              className="hover:text-slate-900 hover:-translate-y-0.5 transition-all"
            >
              {t("navbar.pricing")}
            </Link>
            <button
              onClick={() =>
                window.dispatchEvent(new Event("open-support-widget"))
              }
              className="hover:text-slate-900 hover:-translate-y-0.5 transition-all"
            >
              {t("navbar.support")}
            </button>
            <Link
              to="/suggest"
              className="hover:text-slate-900 hover:-translate-y-0.5 transition-all"
            >
              {t("navbar.suggestFeature")}
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-6 text-[15px] font-medium">
            {isStore && (
              <Link
                to={isAuthenticated ? "/u/cart" : "/cart"}
                className="relative text-slate-500 hover:text-indigo-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -end-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="group flex items-center gap-2 bg-white/70 hover:bg-white text-slate-700 px-2.5 py-1.5 rounded-full transition-all border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.06)] backdrop-blur-sm"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">
                {language === "ar" ? "EN" : "AR"}
              </span>
            </button>

            {isAuthenticated ? (
              <Link
                to="/u"
                className="bg-indigo-600 text-white px-5 py-2 rounded-full hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-sm hover:shadow-md font-semibold text-sm"
              >
                {user?.name ||
                  (language === "ar" ? "لوحة التحكم" : "Dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {t("navbar.login")}
                </Link>
                <Link
                  to="/signup"
                  className="bg-slate-900 text-white px-6 py-2 rounded-full hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-sm hover:shadow-md"
                >
                  {t("navbar.signup")}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 lg:hidden">
            {isStore && (
              <Link
                to={isAuthenticated ? "/u/cart" : "/cart"}
                className="relative text-slate-500 hover:text-indigo-600 transition-colors p-2"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute 0 -end-1 bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}
            <button
              className="p-2 text-slate-500"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-3xl px-6 py-8 flex flex-col"
            dir={language === "ar" ? "rtl" : "ltr"}
          >
            <div className="flex justify-between items-center mb-12">
              <GlobalLogo className="text-2xl" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-8 text-2xl font-bold">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                {t("navbar.home")}
              </Link>
              <Link to={isAuthenticated ? "/u/products" : "/products"} onClick={() => setMobileMenuOpen(false)}>
                {t("navbar.products")}
              </Link>
              <Link to="/pricing" onClick={() => setMobileMenuOpen(false)}>
                {t("navbar.pricing")}
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.dispatchEvent(new Event("open-support-widget"));
                }}
                className={
                  language === "ar" ? "text-end w-full" : "text-start w-full"
                }
              >
                {t("navbar.support")}
              </button>
              <Link to="/suggest" onClick={() => setMobileMenuOpen(false)}>
                {t("navbar.suggestFeature")}
              </Link>
            </nav>
            <div className="mt-auto flex flex-col gap-4">
              <button
                onClick={() => {
                  setLanguage(language === "ar" ? "en" : "ar");
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-between w-full px-4 py-3 text-slate-700 font-medium border border-slate-200 rounded-2xl bg-slate-50"
              >
                <span>{language === "ar" ? "Language" : "اللغة"}</span>
                <span className="flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-sm font-semibold border border-slate-200">
                  <Globe className="w-4 h-4" />
                  {language === "ar" ? "EN" : "AR"}
                </span>
              </button>
              {isAuthenticated ? (
                <Link
                  to="/u"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-4 bg-indigo-600 text-white font-medium rounded-2xl shadow-lg"
                >
                  {user?.name ||
                    (language === "ar" ? "لوحة التحكم" : "Dashboard")}
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-4 text-slate-500 font-medium border border-slate-200 rounded-2xl"
                  >
                    {t("navbar.login")}
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-4 bg-slate-900 text-white font-medium rounded-2xl shadow-lg"
                  >
                    {t("navbar.signup")}
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
