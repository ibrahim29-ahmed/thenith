import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { applyPageSeo, PRODUCTION_DOMAIN } from "../utils/seo.js";
import MainFooter from "../components/MainFooter.jsx";

export default function SuggestFeature() {
  const { t, language } = useGlobalLanguage();

  useEffect(() => {
    const isAr = language === "ar";
    const title = isAr
      ? "اقتراح ميزة جديدة | Thenith"
      : "Suggest a Feature | Thenith";
    const description = isAr
      ? "شاركنا أفكارك واقتراحاتك لتطوير منصة Thenith للبروفايل الرقمي والهوية الذكية."
      : "Share your ideas and feature requests to help improve the Thenith digital profile platform.";

    applyPageSeo({
      pageKey: "suggest",
      title,
      description,
      canonicalUrl: `${PRODUCTION_DOMAIN}/suggest`,
      robots: "index, follow",
      breadcrumbs: [
        { name: isAr ? "الرئيسية" : "Home", url: "/" },
        { name: isAr ? "اقتراح ميزة" : "Suggest Feature", url: "/suggest" },
      ],
      lang: language,
      dir: isAr ? "rtl" : "ltr",
      openGraph: {
        title,
        description,
        url: `${PRODUCTION_DOMAIN}/suggest`,
        type: "website",
      },
    });
  }, [language]);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <main className="flex-1 flex items-center justify-center p-6 py-28 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center relative z-10"
        >

          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-slate-900">
            {t("store.suggestTitle")}
          </h1>
          <p className="text-xl text-slate-500 max-w-lg mx-auto leading-relaxed">
            {t("store.suggestDesc")}. {t("store.thankYouForInterest")}!
          </p>
        </motion.div>
      </main>
      <MainFooter />
    </div>
  );
}
