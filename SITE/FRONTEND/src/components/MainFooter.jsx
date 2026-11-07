import React, { useState, useEffect } from "react";
import { publicClient } from "../api/client.js";
import { Link } from "react-router-dom";
import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";
import { useSiteSettings } from "../context/SiteSettingsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import GlobalLogo from "./GlobalLogo.jsx";
import {
  Mail,
  MessageCircle,
} from "lucide-react";

export default function MainFooter() {
  const { t, language } = useGlobalLanguage();
  const { settings } = useSiteSettings();
  const { isAuthenticated } = useAuth();
  const isAr = language === "ar";

  const siteName = settings?.site_name || settings?.site_logo_text || "Thenith";
  const [policies, setPolicies] = useState([]);

  useEffect(() => {
    let mounted = true;
    publicClient
      .get("/policies")
      .then((res) => {
        if (mounted && Array.isArray(res.data?.policies)) {
          setPolicies(res.data.policies);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Clean WhatsApp number for direct link
  const rawWhatsapp = settings?.whatsapp_number || "";
  const cleanWhatsapp = rawWhatsapp.replace(/[^0-9]/g, "");
  const whatsappLink = cleanWhatsapp ? `https://wa.me/${cleanWhatsapp}` : null;

  // Social Links List - Only non-empty links will be shown
  const socialPlatforms = [
    {
      id: "facebook",
      name: "Facebook",
      url: settings?.facebook_url,
      color: "hover:text-[#1877F2] hover:bg-[#1877F2]/10",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      id: "instagram",
      name: "Instagram",
      url: settings?.instagram_url,
      color: "hover:text-[#E4405F] hover:bg-[#E4405F]/10",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      id: "twitter",
      name: "X (Twitter)",
      url: settings?.twitter_url,
      color: "hover:text-[#000000] dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      url: settings?.linkedin_url,
      color: "hover:text-[#0A66C2] hover:bg-[#0A66C2]/10",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
    {
      id: "tiktok",
      name: "TikTok",
      url: settings?.tiktok_url,
      color: "hover:text-[#EE1D52] hover:bg-[#EE1D52]/10",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
    },
    {
      id: "youtube",
      name: "YouTube",
      url: settings?.youtube_url,
      color: "hover:text-[#FF0000] hover:bg-[#FF0000]/10",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      id: "telegram",
      name: "Telegram",
      url: settings?.telegram_url,
      color: "hover:text-[#229ED9] hover:bg-[#229ED9]/10",
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
  ];

  // Active social links only (non-empty URLs)
  const activeSocials = socialPlatforms.filter(
    (item) => item.url && typeof item.url === "string" && item.url.trim() !== ""
  );

  return (
    <footer className="relative z-10 w-full mt-auto bg-white/80 dark:bg-[#0d1117]/90 backdrop-blur-3xl pt-20 pb-12 px-6 border-t border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 mb-16">
          {/* Brand Info */}
          <div className="md:col-span-4 space-y-5">
            <Link
              to="/"
              className="inline-block hover:scale-105 transition-transform origin-right"
            >
              <GlobalLogo className="text-3xl" />
            </Link>
            <p className="text-sm text-[#86868b] dark:text-slate-400 font-medium max-w-sm leading-relaxed">
              {settings?.site_tagline || t("landing.footerDesc") || "المنظومة الذكية الرائدة للهوية الرقمية وبطاقات الأعمال التفاعلية المتطورة."}
            </p>

          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-4">
            <h5 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1d1d1f] dark:text-slate-200">
              {t("landing.importantLinks") || (isAr ? "روابط سريعة" : "Quick Links")}
            </h5>
            <div className="flex flex-col gap-2.5 text-sm font-medium text-[#86868b] dark:text-slate-400">
              <Link
                to={isAuthenticated ? "/u/products" : "/products"}
                className="flex items-center gap-2 hover:text-[#1d1d1f] dark:hover:text-white rtl:hover:-translate-x-1 ltr:hover:translate-x-1 transition-all"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {t("navbar.products") || (isAr ? "البطاقات والمنتجات الذكية" : "Smart Cards & Products")}
              </Link>
              <Link
                to="/pricing"
                className="flex items-center gap-2 hover:text-[#1d1d1f] dark:hover:text-white rtl:hover:-translate-x-1 ltr:hover:translate-x-1 transition-all"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {t("navbar.pricing") || (isAr ? "الباقات والأسعار" : "Plans & Pricing")}
              </Link>
              <button
                onClick={() => window.dispatchEvent(new Event("open-support-widget"))}
                className="flex items-center gap-2 text-start hover:text-[#1d1d1f] dark:hover:text-white rtl:hover:-translate-x-1 ltr:hover:translate-x-1 transition-all cursor-pointer"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {t("navbar.support") || (isAr ? "الدعم الفني والمساعدة" : "Technical Support")}
              </button>
              <Link
                to="/suggest"
                className="flex items-center gap-2 hover:text-[#1d1d1f] dark:hover:text-white rtl:hover:-translate-x-1 ltr:hover:translate-x-1 transition-all"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {t("navbar.suggestFeature") || (isAr ? "اقتراح ميزة جديدة" : "Suggest a Feature")}
              </Link>
            </div>
          </div>

          {/* Contact Links: Email & WhatsApp only (No heading, no phone, no direct badge) */}
          <div className="md:col-span-3 space-y-4">
            <h5 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1d1d1f] dark:text-slate-200">
              {isAr ? "السياسات والشروط" : "Policies & Terms"}
            </h5>
            <div className="flex flex-col gap-2.5 text-sm font-medium text-[#86868b] dark:text-slate-400">
              {policies.length > 0 ? (
                policies.map((p) => (
                  <Link
                    key={p._id}
                    to={`/policies/${p.slug}`}
                    className="flex items-center gap-2 hover:text-[#1d1d1f] dark:hover:text-white rtl:hover:-translate-x-1 ltr:hover:translate-x-1 transition-all"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                    <span>{typeof p.title === "object" ? (p.title?.[language] || p.title?.ar || p.title?.en || "") : p.title}</span>
                  </Link>
                ))
              ) : (
                <>
                  <Link to="/policies/privacy-policy" className="hover:text-indigo-600 dark:hover:text-white transition">
                    {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
                  </Link>
                  <Link to="/policies/terms-and-conditions" className="hover:text-indigo-600 dark:hover:text-white transition">
                    {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Contact Links: Email & WhatsApp only */}
          <div className="md:col-span-2 space-y-3 pt-1 md:pt-7">
            {/* Email */}
            {settings?.contact_email && (
              <a
                href={`mailto:${settings.contact_email}`}
                className="flex items-center gap-3 text-sm text-[#86868b] dark:text-slate-400 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group w-fit"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 flex items-center justify-center shrink-0 transition-colors">
                  <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span dir="ltr" className="font-mono">{settings.contact_email}</span>
              </a>
            )}

            {/* WhatsApp (Number only, no badge) */}
            {settings?.whatsapp_number && whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-[#86868b] dark:text-slate-400 font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group w-fit"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/60 flex items-center justify-center shrink-0 transition-colors">
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span dir="ltr" className="font-mono">{settings.whatsapp_number}</span>
              </a>
            )}
          </div>
        </div>

        {/* BOTTOM BAR: Copyright & Dynamic Social Media Links (Icons only, no label) */}
        <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-6 pt-8 border-t border-slate-200/60 dark:border-slate-800 text-sm font-medium text-[#86868b] dark:text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} {siteName}.{" "}
            {t("landing.copyright") || (isAr ? "جميع الحقوق محفوظة." : "All rights reserved.")}
          </div>

          {/* Social Media Links (Icons only) */}
          {activeSocials.length > 0 && (
            <div className="flex items-center flex-wrap gap-2">
              {activeSocials.map((platform) => (
                <a
                  key={platform.id}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={platform.name}
                  title={platform.name}
                  className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-2xs ${platform.color}`}
                >
                  {platform.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
