import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Menu,
  X,
  ArrowLeft,
  ArrowRight,
  Wifi,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Sparkles,
  Users,
  UserPlus,
  Globe,
  Briefcase,
  Monitor,
  Ban,
  Phone as PhoneIcon,
  Mail,
  MapPin,
  Instagram,
  MessageCircle,
  CheckCircle2,
  ArrowDown,
  BarChart3,
  CreditCard,
} from "lucide-react";

import GlobalLogo from "../components/GlobalLogo.jsx";
import MainFooter from "../components/MainFooter.jsx";
import ContactSection from "../components/landing/ContactSection.jsx";
import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";
import { useSiteSettings } from "../context/SiteSettingsContext.jsx";
import { getLandingPageSeoData, applyPageSeo } from "../utils/seo.js";
import { renderRichText } from "../utils/richText.jsx";

const LANDING_CARD_IMAGES = (import.meta.env.VITE_LANDING_CARD_IMAGES || "")
  .split(",")
  .map((src) => src.trim())
  .filter(Boolean);

const FadeIn = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);
const DeviceShowcase = () => {
  const [device, setDevice] = useState("desktop");

  useEffect(() => {
    const interval = setInterval(() => {
      setDevice((prev) => {
        if (prev === "desktop") return "tablet";
        if (prev === "tablet") return "mobile";
        return "desktop";
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const specs = {
    desktop: { width: 340, height: 220, rounded: 12, border: 6 },
    tablet: { width: 200, height: 260, rounded: 16, border: 10 },
    mobile: { width: 130, height: 260, rounded: 20, border: 10 },
  };

  const current = specs[device];

  return (
    <div className="w-full max-w-[420px] h-[340px] bg-[#f8fafc] backdrop-blur-2xl rounded-[32px] ring-1 ring-slate-200 p-4 flex items-center justify-center relative overflow-hidden shadow-xl mx-auto">
      {/* Background decoration */}
      <div className="absolute top-[-50px] start-[-50px] w-48 h-48 bg-indigo-200/50 rounded-full mix-blend-multiply blur-2xl" />
      <div className="absolute bottom-[-50px] end-[-50px] w-48 h-48 bg-sky-200/50 rounded-full mix-blend-multiply blur-2xl" />

      <motion.div
        layout
        animate={{
          width: current.width,
          height: current.height,
          borderRadius: current.rounded,
          borderWidth: current.border,
        }}
        transition={{ type: "spring", stiffness: 90, damping: 16 }}
        className="bg-slate-50 border-slate-800 flex flex-col overflow-hidden relative shadow-2xl"
      >
        {/* Device Header */}
        <motion.div
          layout
          className="w-full bg-slate-800 flex items-center justify-center shrink-0 z-10"
          animate={{ height: device === "desktop" ? 14 : 20 }}
        >
          {device === "desktop" ? (
            <div className="w-full flex gap-1 px-2 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          ) : (
            <div className="w-10 h-3 bg-slate-900 rounded-b-xl" />
          )}
        </motion.div>

        {/* Screen Content */}
        <motion.div
          layout
          className={`flex-1 flex p-2 gap-2 bg-slate-100 ${
            device === "desktop" ? "flex-row" : "flex-col items-center"
          }`}
        >
          {/* Profile Header Block */}
          <motion.div
            layout
            className={`bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col items-center relative overflow-hidden shrink-0 ${
              device === "desktop" ? "w-1/3 h-full" : "w-full h-auto pb-2"
            }`}
          >
            <motion.div
              layout
              className="w-full h-10 bg-gradient-to-r from-indigo-100 to-sky-50 shrink-0"
            />
            <motion.div
              layout
              className="w-10 h-10 rounded-full bg-slate-200 absolute top-4 border-2 border-white flex items-center justify-center shrink-0"
            >
              <Users className="w-4 h-4 text-slate-400" />
            </motion.div>
            <motion.div
              layout
              className="w-16 h-2 bg-slate-700 rounded-full mt-5 shrink-0"
            />
            <motion.div
              layout
              className="w-10 h-1.5 bg-slate-400 rounded-full mt-1.5 mb-2 shrink-0"
            />
            <motion.div layout className="flex gap-1.5 mt-auto shrink-0">
              <div className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center">
                <PhoneIcon className="w-3 h-3 text-slate-500" />
              </div>
              <div className="w-5 h-5 bg-emerald-50 rounded flex items-center justify-center">
                <MessageCircle className="w-3 h-3 text-emerald-500" />
              </div>
            </motion.div>
          </motion.div>

          {/* Profile Body Block */}
          <motion.div
            layout
            className={`bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col p-2 shrink-0 ${
              device === "desktop" ? "flex-1 h-full" : "w-full flex-1"
            }`}
          >
            <motion.div layout className="flex gap-1 w-full mb-2 shrink-0">
              <div className="h-4 flex-1 bg-indigo-50 rounded flex items-center justify-center">
                <div className="w-6 h-1 bg-indigo-200 rounded-full" />
              </div>
              <div className="h-4 flex-1 bg-slate-50 rounded flex items-center justify-center">
                <div className="w-6 h-1 bg-slate-200 rounded-full" />
              </div>
            </motion.div>
            <motion.div
              layout
              className="w-full flex-1 bg-slate-50 rounded border border-slate-100 flex flex-col p-2 gap-2 overflow-hidden"
            >
              <div className="w-3/4 h-2 bg-slate-200 rounded-full shrink-0" />
              <div className="w-1/2 h-2 bg-slate-200 rounded-full shrink-0" />
              <div className="w-full h-2 bg-slate-200 rounded-full shrink-0" />
              <div className="w-full h-6 bg-slate-100 rounded mt-auto flex items-center justify-center border border-slate-200 shrink-0">
                <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default function LandingPage() {
  const { isAuthenticated, user, isInitializing } = useAuth();
  const { t, language } = useGlobalLanguage();
  const { settings } = useSiteSettings();
  const siteName = settings?.site_name || "Thenith";

  if (isInitializing) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={user?.publicId ? `/u/${user.publicId}` : "/u"} replace />;
  }
  const [hoverDash, setHoverDash] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const carouselRef = React.useRef(null);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  useEffect(() => {
    if (isCarouselPaused) return;
    const interval = setInterval(() => {
      const container = carouselRef.current;
      if (!container) return;

      // Calculate how far to scroll (Card width is 80vw + gap)
      const scrollAmount = container.clientWidth;

      const maxScroll = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScroll - 20) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isCarouselPaused]);

  useEffect(() => {
    applyPageSeo({ pageKey: "home", ...getLandingPageSeoData(language, siteName) });
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [language, siteName]);

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className="relative min-h-screen bg-[#FBFBFD] text-[#1d1d1f] antialiased selection:bg-[#1d1d1f] selection:text-white overflow-hidden"
      style={{ fontFamily: '"Rubik", sans-serif' }}
    >

      {/* SOFT MESH GRADIENT BACKGROUND (Purple leaning) */}
      {/* SOFT MESH GRADIENT BACKGROUND (Animated Aurora) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Blob 1: Purple */}
        <motion.div
          animate={{
            x: [0, 150, -100, 0],
            y: [0, 100, -150, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] end-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-purple-300/20 blur-[130px]"
        />
        {/* Blob 2: Fuchsia */}
        <motion.div
          animate={{
            x: [0, -150, 150, 0],
            y: [0, 150, -100, 0],
            scale: [1, 1.3, 0.8, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] start-[-10%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full bg-fuchsia-300/15 blur-[130px]"
        />
        {/* Blob 3: Indigo */}
        <motion.div
          animate={{
            x: [0, 100, -200, 0],
            y: [0, -100, 150, 0],
            scale: [1, 1.1, 1.3, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] end-[10%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full bg-indigo-300/20 blur-[140px]"
        />
      </div>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-48 pb-32 px-6 flex flex-col items-center justify-center min-h-[85vh]">
        <div className="max-w-[1100px] mx-auto text-center z-20">
          <FadeIn>
            <h1 className="text-[32px] md:text-[48px] lg:text-[56px] leading-[1.3] font-bold text-[#1d1d1f] mb-8 ">
              {t("landing.heroTitle")}
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="text-lg md:text-xl text-[#86868b] font-medium mb-12 leading-[1.8] max-w-3xl mx-auto">
              {t("landing.heroSubtitle")}
            </p>
          </FadeIn>

          <FadeIn
            delay={0.2}
            className="flex flex-col sm:flex-row items-center gap-4 justify-center"
          >
            <Link
              to="/signup"
              className="group w-full sm:w-auto bg-[#1d1d1f] text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-black hover:-translate-y-1 hover:shadow-xl active:scale-95 transition-all duration-300 flex items-center justify-center gap-2.5"
            >
              {t("landing.heroStart")}{" "}
              <ArrowRight className="w-5 h-5 rtl:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-rtl:hover:-translate-x-1 ltr:hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={() => {
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group w-full sm:w-auto bg-white/80 backdrop-blur-md border border-white/50 text-[#1d1d1f] px-10 py-4 rounded-full text-lg font-bold hover:bg-white hover:-translate-y-1 hover:shadow-xl active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
            >
              {t("landing.heroExplore")}
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <ArrowDown className="w-5 h-5 text-indigo-600" />
              </motion.div>
            </button>
          </FadeIn>
        </div>
      </section>

      {/* SECTION 2: BRAND INTRO */}
      <section
        id="explore"
        className="relative z-10 py-24 px-6 bg-white/40 backdrop-blur-3xl border-t border-white/60"
      >
        <div className="max-w-[1440px] mx-auto text-center">
          <FadeIn>
            <h2 className="text-[36px] md:text-[48px] font-bold leading-[1.3] mb-8 text-[#1d1d1f] hover:scale-105 transition-transform duration-700 cursor-default">
              {t("landing.exploreTitle")}
            </h2>
            <p className="text-lg md:text-xl text-[#86868b] font-medium max-w-[800px] mx-auto leading-[1.8]">
              {t("landing.exploreSubtitle")}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* SECTION 3: DEEP DIVE CAPABILITIES */}
      <section
        id="features"
        className="relative z-10 py-24 px-6 bg-transparent"
      >
        <div className="max-w-[1200px] mx-auto space-y-32">
          {/* Feature 1: Aesthetics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn className="order-1 lg:order-1 group cursor-default">
              <div className="w-16 h-16 bg-white/80 backdrop-blur-xl border border-white/50 text-slate-700 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-white group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg transition-all duration-500">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-[28px] md:text-[36px] font-bold mb-6 leading-[1.4] text-[#1d1d1f]">
                {t("landing.feature1Title")}
              </h3>
              <p className="text-base md:text-lg text-[#86868b] font-medium leading-[1.8]">
                {t("landing.feature1Subtitle")}{" "}
                <a
                  href="#dashboard"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("dashboard")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  onMouseEnter={() => setHoverDash(true)}
                  onMouseLeave={() => setHoverDash(false)}
                  className="text-[#1d1d1f] font-bold hover:underline cursor-pointer transition-colors relative z-30 inline-block"
                >
                  {t("landing.dashboardTitle")}
                </a>{" "}
                {t("landing.feature1Desc2")}
              </p>
            </FadeIn>

            <FadeIn className="order-2 lg:order-2 flex justify-center items-center perspective-1000 relative">
              {/* Dashboard Phone Mockup (Behind) */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className={`hidden md:block w-full max-w-[320px] absolute top-4 transition-all duration-500 ease-in-out ${hoverDash ? "z-20 scale-100 left-0 lg:left-6 rotate-0 opacity-100 shadow-[0_30px_60px_rgba(0,0,0,0.5)]" : "z-0 scale-90 -left-4 lg:-left-16 opacity-95 -rotate-6"}`}
              >
                <div className="w-full bg-slate-900 rounded-[32px] ring-4 ring-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[650px]">
                  {/* Header */}
                  <div className="p-6 pb-4 flex justify-between items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <BarChart3 size={20} />
                    </div>
                    <div className="h-3 w-20 bg-slate-800 rounded-full"></div>
                  </div>
                  {/* Content */}
                  <div className="px-6 space-y-5 flex-1">
                    <div className="h-5 w-32 bg-slate-800 rounded-full mb-2"></div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 mb-4"></div>
                        <div className="h-3 w-16 bg-slate-600 rounded-full mb-2"></div>
                        <div className="h-6 w-20 bg-white/90 rounded-full"></div>
                      </div>
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 mb-4"></div>
                        <div className="h-3 w-16 bg-slate-600 rounded-full mb-2"></div>
                        <div className="h-6 w-20 bg-white/90 rounded-full"></div>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 h-36 flex flex-col">
                      <div className="h-3 w-24 bg-slate-600 rounded-full mb-auto"></div>
                      <div className="flex items-end gap-2 h-20 mt-4">
                        {[40, 70, 45, 90, 65, 85, 60].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-indigo-500 rounded-t-sm opacity-80"
                            style={{ height: `${h}%` }}
                          ></div>
                        ))}
                      </div>
                    </div>

                    {/* List */}
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-2 w-24 bg-slate-500 rounded-full"></div>
                          <div className="h-2 w-full bg-slate-600 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-2 w-20 bg-slate-500 rounded-full"></div>
                          <div className="h-2 w-3/4 bg-slate-600 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Profile Phone Mockup (Front) */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`w-full max-w-[340px] relative transition-all duration-500 ease-in-out ${hoverDash ? "z-0 scale-90 -translate-x-16 opacity-60" : "z-10 md:translate-x-12 scale-100 opacity-100"}`}
              >
                <div className="w-full bg-[#f8fafc] backdrop-blur-xl rounded-[32px] ring-4 ring-white shadow-2xl overflow-hidden flex flex-col h-[650px] hover:-translate-y-4 hover:shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all duration-500 cursor-pointer">
                  {/* Cover */}
                  <div className="relative h-44 bg-gradient-to-tr from-slate-100 to-indigo-50 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
                    <span className="relative z-10 text-4xl font-black tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-900/35 via-indigo-900/45 to-slate-900/35 select-none font-sans drop-shadow-sm  text-center">
                      Thenith
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex-1 bg-white relative px-4 pb-6 flex flex-col items-center">
                    {/* Avatar */}
                    <div className="relative z-10 -mt-16 mb-4">
                      <div className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg shadow-slate-200/80 bg-slate-50 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-slate-100/50 scale-110 group-hover:scale-100 transition-transform duration-700" />
                        <Users className="w-10 h-10 text-slate-400 relative z-10" />
                      </div>
                    </div>

                    {/* Identity */}
                    <div className="relative z-10 px-2 text-center w-full">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1 flex items-center justify-center gap-1.5">
                        <span>Thenith</span>
                        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
                          <CheckCircle2 className="h-3 w-3" strokeWidth={3} />
                        </div>
                      </h1>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        {t("landing.phoneMockupTitle")}
                      </p>
                      <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed px-2 mb-6">
                        {t("landing.phoneMockupDesc")}
                      </p>
                    </div>

                    {/* Profile Actions */}
                    <div className="w-full max-w-md px-2 grid grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium bg-slate-900 text-white shadow-sm text-sm  transition-transform hover:scale-[1.02]">
                        <PhoneIcon className="w-4 h-4 fill-current shrink-0" />
                        <span>{t("landing.phoneMockupCall")}</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium bg-white text-emerald-600 border border-slate-200 shadow-sm text-sm  transition-transform hover:scale-[1.02]">
                        <MessageCircle className="w-4 h-4 shrink-0" />
                        <span>{t("landing.phoneMockupWhatsapp")}</span>
                      </div>
                    </div>

                    <div className="w-full max-w-md px-2 mb-6">
                      <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium bg-slate-100 text-slate-700 shadow-sm border border-slate-200/40 text-sm  transition-transform hover:scale-[1.01]">
                        <UserPlus className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>
                          {t("landing.phoneMockupSave")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </FadeIn>
          </div>

          {/* Feature 2: Multi-Device */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn className="order-2 lg:order-1 flex justify-center w-full">
              <DeviceShowcase />
            </FadeIn>

            <FadeIn className="order-1 lg:order-2 group cursor-default">
              <div className="w-16 h-16 bg-white/80 backdrop-blur-xl border border-white/50 text-slate-700 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-white group-hover:scale-110 group-hover:shadow-lg transition-all duration-500">
                <Monitor className="w-8 h-8" />
              </div>
              <h3 className="text-[28px] md:text-[36px] font-bold mb-6 leading-[1.4] text-[#1d1d1f]">
                {renderRichText(t("landing.feature2Title"))}
              </h3>
              <p className="text-base md:text-lg text-[#86868b] font-medium leading-[1.8] mb-5">
                {renderRichText(t("landing.feature2Subtitle"))}
              </p>
              <p className="text-base md:text-lg text-[#86868b] font-medium leading-[1.8]">
                {renderRichText(t("landing.feature2Desc"))}
              </p>
            </FadeIn>
          </div>

          {/* Feature 3: Contact vs Booking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn className="order-1 lg:order-1 group cursor-default">
              <div className="w-16 h-16 bg-white/80 backdrop-blur-xl border border-white/50 text-slate-700 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-white group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-lg transition-all duration-500">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-[28px] md:text-[36px] font-bold mb-6 leading-[1.4] text-[#1d1d1f]">
                {t("landing.feature3Title")}
              </h3>
              <p className="text-base md:text-lg text-[#86868b] font-medium leading-[1.8]">
                {t("landing.feature3Subtitle")}
              </p>
            </FadeIn>

            <FadeIn className="order-2 lg:order-2 flex justify-center">
              <div className="w-full max-w-[340px] space-y-4">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="bg-white/90 backdrop-blur-xl p-5 rounded-2xl border border-white flex items-center gap-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                    <div className="w-10 h-10 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:scale-110 group-hover:shadow-sm transition-all">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="rtl:group-hover:-translate-x-1 ltr:group-rtl:hover:-translate-x-1 ltr:hover:translate-x-1 transition-transform">
                      <span className="text-lg font-bold text-[#1d1d1f] block">
                        {t("landing.contactMe")}
                      </span>
                      <span className="text-sm text-[#86868b] font-medium">
                        {t("landing.contactMeDesc")}
                      </span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 4.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                >
                  <div className="bg-white/90 backdrop-blur-xl p-5 rounded-2xl border border-white flex items-center gap-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                    <div className="w-10 h-10 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:scale-110 group-hover:shadow-sm transition-all">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="rtl:group-hover:-translate-x-1 ltr:group-rtl:hover:-translate-x-1 ltr:hover:translate-x-1 transition-transform">
                      <span className="text-lg font-bold text-[#1d1d1f] block">
                        {t("landing.bookAppt")}
                      </span>
                      <span className="text-sm text-[#86868b] font-medium">
                        {t("landing.bookApptDesc")}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </FadeIn>
          </div>

          {/* Feature 4: Lead Generation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn className="order-2 lg:order-1 flex justify-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.2,
                }}
                className="w-full max-w-[320px]"
              >
                <div className="w-full bg-white/90 backdrop-blur-xl rounded-[24px] border border-white p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                  <h4 className="text-lg font-bold mb-6 text-center text-[#1d1d1f]">
                    {t("landing.leaveInfo")}
                  </h4>
                  <div className="space-y-3">
                    <div className="h-12 w-full bg-slate-50/50 rounded-xl px-4 flex items-center border border-slate-100 hover:border-slate-300 hover:bg-white transition-colors cursor-text">
                      <span className="text-xs text-[#86868b] font-medium">
                        {t("landing.fullName")}
                      </span>
                    </div>
                    <div className="h-12 w-full bg-slate-50/50 rounded-xl px-4 flex items-center border border-slate-100 hover:border-slate-300 hover:bg-white transition-colors cursor-text">
                      <span className="text-xs text-[#86868b] font-medium">
                        {t("landing.phoneNum")}
                      </span>
                    </div>
                    <div className="h-12 w-full bg-[#1d1d1f] rounded-xl mt-6 flex items-center justify-center text-white font-bold text-sm hover:bg-black hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md">
                      {t("landing.sendData")}
                    </div>
                  </div>
                </div>
              </motion.div>
            </FadeIn>

            <FadeIn className="order-1 lg:order-2 group cursor-default">
              <div className="w-16 h-16 bg-white/80 backdrop-blur-xl border border-white/50 text-slate-700 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-white group-hover:scale-110 group-hover:shadow-lg transition-all duration-500">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-[28px] md:text-[36px] font-bold mb-6 leading-[1.4] text-[#1d1d1f]">
                {t("landing.feature4Title")}
              </h3>
              <p className="text-base md:text-lg text-[#86868b] font-medium leading-[1.8]">
                {t("landing.feature4Subtitle")}
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* SECTION 4: THE ACCESSORY (THENITH CARD) */}
      <section className="relative z-20 py-32 px-6 bg-[#1d1d1f] text-white shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <FadeIn className="order-1 lg:order-1">
            <h2 className="text-[36px] md:text-[48px] font-bold leading-[1.3] mb-8">
              {t("landing.cardTitle")}
            </h2>
            <p className="text-lg md:text-xl text-[#a1a1a6] font-medium leading-[1.8] mb-10 max-w-[500px]">
              {t("landing.cardSubtitle")}
            </p>
            <Link
              to={isAuthenticated ? "/u/products" : "/products"}
              className="group text-base font-bold text-white border-b border-white pb-1 hover:text-gray-300 hover:border-gray-300 transition-all inline-flex items-center gap-2"
            >
              <ArrowRight className="w-5 h-5 rtl:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-rtl:hover:-translate-x-1 ltr:hover:translate-x-1 transition-transform" />{" "}
              {t("landing.exploreCards")}
            </Link>
          </FadeIn>

          <FadeIn
            delay={0.2}
            className="order-2 lg:order-2 flex justify-center w-full"
          >
            <div className="w-full">
              {/* DESKTOP: Fanned Deck */}
              <div className="hidden sm:flex relative w-full h-[450px] items-center justify-center max-w-full">
                {LANDING_CARD_IMAGES.map((src, i) => (
                  <Link
                    to={isAuthenticated ? "/u/products" : "/products"}
                    key={i}
                    style={{
                      zIndex: (i + 1) * 10,
                      transformOrigin: "center center",
                    }}
                    className={`group absolute w-[380px] h-[240px] bg-[#1a1a1c] rounded-2xl ring-1 ring-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:!z-50 hover:!scale-110 hover:!-translate-y-4 hover:shadow-[0_20px_60px_rgba(255,255,255,0.15)] ${
                      i === 0
                        ? "-translate-x-16 translate-y-6 -rotate-12 hover:!-rotate-6"
                        : i === 1
                          ? "-translate-x-6 translate-y-2 -rotate-3 hover:!-rotate-1"
                          : i === 2
                            ? "translate-x-6 translate-y-2 rotate-3 hover:!rotate-1"
                            : "translate-x-16 translate-y-6 rotate-12 hover:!rotate-6"
                    }`}
                  >
                    <img
                      src={src}
                      alt={language === "en" ? `Thenith luxury smart NFC card mockup design ${i + 1}` : `تصميم بطاقة Thenith الذكية الفاخرة بتقنية NFC رقم ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </Link>
                ))}
              </div>

              {/* MOBILE: Swipeable Carousel (Auto-scroll with pause) */}
              <div
                ref={carouselRef}
                onTouchStart={() => setIsCarouselPaused(true)}
                onTouchEnd={() => {
                  if (window.carouselTimeout)
                    clearTimeout(window.carouselTimeout);
                  window.carouselTimeout = setTimeout(
                    () => setIsCarouselPaused(false),
                    4000,
                  );
                }}
                className="flex sm:hidden w-full overflow-x-auto snap-x snap-mandatory gap-4 py-8 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
              >
                {LANDING_CARD_IMAGES.map((src, i) => (
                  <Link
                    to={isAuthenticated ? "/u/products" : "/products"}
                    key={i}
                    className="block flex-none w-[80vw] h-[50.6vw] snap-center bg-[#1a1a1c] rounded-2xl ring-1 ring-white/10 shadow-2xl overflow-hidden relative cursor-pointer"
                  >
                    <img
                      src={src}
                      alt={language === "en" ? `Thenith luxury smart NFC card mockup design ${i + 1}` : `تصميم بطاقة Thenith الذكية الفاخرة بتقنية NFC رقم ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* SECTION 6: THE DASHBOARD / PANEL */}
      <section
        id="dashboard"
        className="relative z-10 py-32 px-6 bg-slate-50 border-t border-slate-200/50 overflow-hidden"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <FadeIn>
              <h2 className="text-[36px] md:text-[52px] font-bold text-[#1d1d1f] leading-[1.2] mb-6">
                {t("landing.dashboardTitle")}
              </h2>
              <p className="text-xl text-[#86868b] leading-[1.8]">
                {t("landing.dashboardSubtitle")}
              </p>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Dashboard Mockup Visual */}
            <FadeIn className="order-2 lg:order-1">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white group cursor-default hover:shadow-indigo-500/10 transition-shadow duration-500">
                <div className="absolute top-0 start-0 w-full h-12 bg-slate-100/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 gap-2 z-10">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <div className="ms-auto bg-white/50 px-3 py-1 rounded-md text-[10px] text-slate-400 border border-slate-200/50 hidden sm:block font-mono">
                    dashboard.thenith.com
                  </div>
                </div>
                <div className="pt-12 relative overflow-hidden bg-slate-50">
                  {/* Decorative background glow */}
                  <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-indigo-500/5 blur-[80px] pointer-events-none"></div>

                  <div className="p-4 sm:p-6 pb-0 flex gap-4 h-[400px]">
                    {/* Sidebar Mockup */}
                    <div className="w-[80px] sm:w-[140px] bg-white rounded-t-xl shadow-sm border border-slate-200 border-b-0 p-3 sm:p-4 flex flex-col gap-4 relative z-10">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mb-4 self-center sm:self-start">
                        <div className="w-4 h-4 bg-indigo-600 rounded-sm transform rotate-45"></div>
                      </div>
                      <div className="h-2 sm:h-3 bg-indigo-50 rounded-full w-full"></div>
                      <div className="h-2 sm:h-3 bg-slate-100 rounded-full w-3/4"></div>
                      <div className="h-2 sm:h-3 bg-slate-100 rounded-full w-4/5"></div>
                      <div className="h-2 sm:h-3 bg-slate-100 rounded-full w-2/3"></div>

                      <div className="mt-auto h-8 bg-slate-50 rounded-lg border border-slate-100 w-full mb-2"></div>
                    </div>

                    {/* Main Content Mockup */}
                    <div className="flex-1 flex flex-col gap-4 relative z-10">
                      {/* Top stats */}
                      <div className="flex gap-4">
                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:border-indigo-200 transition-colors">
                          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-xl shrink-0">
                            <BarChart3 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="h-2 sm:h-3 w-16 bg-slate-200 mb-2 rounded-full"></div>
                            <div className="h-4 sm:h-6 w-12 bg-slate-800 rounded-md"></div>
                          </div>
                        </div>
                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:border-emerald-200 transition-colors">
                          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-xl shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="h-2 sm:h-3 w-16 bg-slate-200 mb-2 rounded-full"></div>
                            <div className="h-4 sm:h-6 w-12 bg-slate-800 rounded-md"></div>
                          </div>
                        </div>
                      </div>

                      {/* Chart area */}
                      <div className="flex-1 bg-white rounded-t-xl shadow-sm border border-slate-200 border-b-0 p-5 flex flex-col relative overflow-hidden">
                        <div className="h-3 w-32 bg-slate-200 mb-8 rounded-full"></div>
                        <div className="flex-1 flex items-end gap-2 px-2 pb-4">
                          {[40, 70, 45, 90, 65, 85, 55, 100].map(
                            (height, i) => (
                              <div
                                key={i}
                                className="flex-1 bg-indigo-100 rounded-t-sm hover:bg-indigo-500 transition-colors duration-300"
                                style={{ height: `${height}%` }}
                              >
                                <div
                                  className="w-full bg-indigo-500 rounded-t-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ height: "4px" }}
                                ></div>
                              </div>
                            ),
                          )}
                        </div>
                        <div className="absolute bottom-0 start-0 w-full h-24 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Features List */}
            <FadeIn className="order-1 lg:order-2 space-y-8">
              <div className="flex gap-5 group cursor-default">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                    {t("landing.dashStat1Title")}
                  </h3>
                  <p className="text-[#86868b] leading-[1.8] font-medium">
                    {t("landing.dashStat1Desc")}.
                  </p>
                </div>
              </div>

              <div className="flex gap-5 group cursor-default">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                    {t("landing.dashStat2Title")}
                  </h3>
                  <p className="text-[#86868b] leading-[1.8] font-medium">
                    {t("landing.dashStat2Desc")}
                  </p>
                </div>
              </div>

              <div className="flex gap-5 group cursor-default">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm text-amber-500 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-amber-500 transition-colors">
                    {t("landing.dashStat3Title")}
                  </h3>
                  <p className="text-[#86868b] leading-[1.8] font-medium">
                    {t("landing.dashStat3Desc")}
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS */}
      <section className="relative z-10 py-32 px-6 bg-white/40 backdrop-blur-3xl border-b border-white/60">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-20">
            {[
              {
                num: "1",
                title: t("landing.step1Title"),
                desc: `${t("landing.step1Desc1")}. ${t("landing.step1Desc2")}.`,
              },
              {
                num: "2",
                title: t("landing.step2Title"),
                desc: `${t("landing.step2Desc1")} Thenith ${t("landing.step2Desc2")} (QR) ${t("landing.step2Desc3")}.`,
              },
              {
                num: "3",
                title: t("landing.step3Title"),
                desc: `${t("landing.step3Desc1")} QR${t("landing.step3Desc2")}.`,
              },
            ].map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.15}>
                <div className="group hover:-translate-y-2 transition-transform duration-500 cursor-default p-6 -m-6 rounded-3xl hover:bg-white/80 hover:backdrop-blur-md hover:shadow-xl hover:border-white border border-transparent transition-all">
                  <div className="text-[18px] font-bold text-[#86868b] mb-4 group-hover:text-[#1d1d1f] transition-colors duration-300">
                    {t("landing.stepWord")} {step.num}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-[#1d1d1f]">
                    {step.title}
                  </h3>
                  <p className="text-base md:text-lg text-[#86868b] font-medium leading-[1.8]">
                    {step.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: CONTACT US */}
      <ContactSection language={language} />

      {/* SECTION 7: FINAL CTA */}
      <section className="relative z-20 py-32 px-6 bg-[#161618] text-white">
        <div className="max-w-[800px] mx-auto text-center">
          <FadeIn>
            <h2 className="text-[40px] md:text-[64px] font-bold leading-[1.3] mb-8 hover:scale-105 transition-transform duration-700 cursor-default">
              {t("landing.ctaTitle")}.
            </h2>
            <p className="text-lg md:text-xl text-[#a1a1a6] font-medium mb-12 leading-[1.8] max-w-[600px] mx-auto">
              {t("landing.ctaSubtitle")}.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2.5 bg-white text-[#1d1d1f] px-10 py-4 rounded-lg text-lg font-bold hover:bg-slate-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/10 active:scale-95 transition-all duration-300"
            >
              {t("landing.ctaBtn")}
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <MainFooter />
    </div>
  );
}
