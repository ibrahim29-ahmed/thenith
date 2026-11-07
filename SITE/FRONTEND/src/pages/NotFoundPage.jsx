import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Home, ShieldAlert } from "lucide-react";
import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";
import { getNotFoundSeoData, applyPageSeo } from "../utils/seo.js";
import MainFooter from "../components/MainFooter.jsx";

const notFoundConfigs = {
  profileNotFound: {
    code: "#profileNotFound",
    titleKey: "profileNotFound",
    messageKey: "profileNotFoundMessage",
  },
  routeNotFound: {
    code: "#routeNotFound",
    titleKey: "routeNotFound",
    messageKey: "routeNotFoundMessage",
  },
};

export default function NotFoundPage({ code = "routeNotFound" }) {
  const { t, language } = useGlobalLanguage();
  const location = useLocation();
  const config = notFoundConfigs[code] || notFoundConfigs.routeNotFound;

  useEffect(() => {
    applyPageSeo(getNotFoundSeoData(language, code === "profileNotFound" ? "profile" : "page"));
  }, [language, code]);
  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#FBFBFD] text-[#1d1d1f] antialiased selection:bg-[#1d1d1f] selection:text-white">
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pt-28 pb-16">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/70 bg-white/70 p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),transparent_55%)]" />

          <div className="relative z-10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner">
              <ShieldAlert className="h-9 w-9" />
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              404
            </p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">
              {config.code}
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
              {t(config.titleKey)}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-600 md:text-lg">
              {t(config.messageKey)}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-black"
              >
                <Home className="h-4 w-4" />
                Home
              </Link>

              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>
          </div>
        </div>
      </main>
      <MainFooter />
    </div>
  );
}
