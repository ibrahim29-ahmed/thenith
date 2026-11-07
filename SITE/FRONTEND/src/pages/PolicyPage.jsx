import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { publicClient } from "../api/client.js";
import { useGlobalLanguage } from "../context/GlobalLanguageContext.jsx";
import { applyPageSeo, PRODUCTION_DOMAIN } from "../utils/seo.js";
import MainFooter from "../components/MainFooter.jsx";
import {
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Home,
  Loader2,
} from "lucide-react";

export default function PolicyPage() {
  const { slug } = useParams();
  const { language } = useGlobalLanguage();
  const isAr = language === "ar";

  const [policy, setPolicy] = useState(null);
  const [allPolicies, setAllPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Helper to resolve localized text from bilingual object or string
  const getLoc = (val) => {
    if (typeof val === "object" && val !== null) {
      return val[language] || val.ar || val.en || "";
    }
    return val || "";
  };

  // Fetch current policy and all published policies
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setNotFound(false);
      try {
        const [policyRes, listRes] = await Promise.all([
          publicClient.get(`/policies/${slug}`),
          publicClient.get("/policies").catch(() => ({ data: { policies: [] } })),
        ]);

        if (!isMounted) return;

        if (policyRes.data?.policy) {
          setPolicy(policyRes.data.policy);
        } else {
          setNotFound(true);
        }

        if (listRes.data?.policies) {
          setAllPolicies(listRes.data.policies);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch policy page:", err);
        setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (slug) {
      loadData();
    }
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Apply SEO metadata dynamically per language
  useEffect(() => {
    if (!policy) return;

    const currentTitle = getLoc(policy.title);
    const pageTitle = `${currentTitle} | Thenith`;
    const pageDesc =
      getLoc(policy.description) ||
      (isAr
        ? `تعرف على ${currentTitle} الخاصة بمنصة Thenith للبطاقات الذكية والهوية الرقمية.`
        : `Read the ${currentTitle} for Thenith smart digital cards and profiles.`);

    applyPageSeo({
      pageKey: `policy_${slug}`,
      title: pageTitle,
      description: pageDesc,
      canonicalUrl: `${PRODUCTION_DOMAIN}/policies/${slug}`,
      robots: "index, follow",
      breadcrumbs: [
        { name: isAr ? "الرئيسية" : "Home", url: "/" },
        { name: isAr ? "السياسات والشروط" : "Policies", url: `/policies/${slug}` },
        { name: currentTitle, url: `/policies/${slug}` },
      ],
      lang: language,
      dir: isAr ? "rtl" : "ltr",
      openGraph: {
        title: pageTitle,
        description: pageDesc,
        url: `${PRODUCTION_DOMAIN}/policies/${slug}`,
        type: "article",
      },
    });
  }, [policy, slug, language, isAr]);

  const activeTitle = getLoc(policy?.title);
  const activeDesc = getLoc(policy?.description);

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="min-h-screen bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors"
    >
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {isAr ? "جاري تحميل محتوى الصفحة..." : "Loading policy content..."}
            </p>
          </div>
        ) : notFound || !policy ? (
          /* 404 State for Nonexistent or Unpublished Policies */
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {isAr ? "صفحة السياسة غير موجودة" : "Policy Page Not Found"}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? "عذراً، هذه السياسة غير متوفرة أو قد تم تحويلها لمسودة مؤقتة من قِبل إدارة المنصة."
                  : "Sorry, this policy page is not available or is currently unpublished by administrators."}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Link
                to="/"
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>{isAr ? "العودة للرئيسية" : "Back to Home"}</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Normal Policy Content View */
          <div className="space-y-8">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link
                to="/"
                className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{isAr ? "الرئيسية" : "Home"}</span>
              </Link>
              <span>/</span>
              <span>{isAr ? "السياسات والشروط" : "Policies"}</span>
              <span>/</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{activeTitle}</span>
            </nav>

            {/* Layout Grid: Content + Other Policies Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              {/* Main Content Area */}
              <div className="lg:col-span-8 space-y-8">
                {/* Header Banner */}
                <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isAr ? "وثيقة رسمية معتمدة" : "Official Document"}</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    {activeTitle}
                  </h1>

                  {activeDesc && (
                    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {activeDesc}
                    </p>
                  )}

                  <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800/80">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>
                      {isAr
                        ? `آخر تحديث: ${new Date(policy.updatedAt || Date.now()).toLocaleDateString("ar-EG-u-nu-latn", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}`
                        : `Last updated: ${new Date(policy.updatedAt || Date.now()).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}`}
                    </span>
                  </div>
                </div>

                {/* Ordered Sections */}
                <div className="space-y-6">
                  {(policy.sections || []).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                      {isAr ? "لم تتم إضافة أقسام لهذه السياسة بعد." : "No sections added to this policy yet."}
                    </div>
                  ) : (
                    (policy.sections || []).map((section, idx) => {
                      const heading = getLoc(section.heading);
                      const content = getLoc(section.content);

                      return (
                        <article
                          key={section._id || idx}
                          className="bg-white dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/90 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
                        >
                          {heading && (
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white border-s-4 border-indigo-600 dark:border-indigo-500 ps-4">
                              {heading}
                            </h2>
                          )}

                          <div
                            className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-loose prose dark:prose-invert max-w-none [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ps-6 [&_ol]:mb-4 [&_li]:mb-1.5 [&_blockquote]:border-s-4 [&_blockquote]:border-indigo-500 [&_blockquote]:bg-slate-50 dark:[&_blockquote]:bg-slate-800/40 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl [&_blockquote]:text-slate-600 dark:[&_blockquote]:text-slate-300 [&_blockquote]:font-medium [&_strong]:text-slate-900 dark:[&_strong]:text-white [&_a]:text-indigo-600 dark:[&_a]:text-indigo-400 [&_a]:underline font-normal"
                            dangerouslySetInnerHTML={{ __html: content || "" }}
                          />
                        </article>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sidebar with all other policies */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sticky top-28 space-y-5 shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm border-b border-slate-200 dark:border-slate-800 pb-3">
                    <FileText className="w-4 h-4" />
                    <span>{isAr ? "جميع السياسات والشروط" : "All Policies & Terms"}</span>
                  </div>

                  <div className="space-y-2">
                    {allPolicies.map((p) => {
                      const isActive = p.slug === slug;
                      const title = getLoc(p.title);
                      return (
                        <Link
                          key={p._id}
                          to={`/policies/${p.slug}`}
                          className={`flex items-center justify-between p-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                            isActive
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <span className="line-clamp-1">{title}</span>
                          {isAr ? (
                            <ChevronLeft className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                          ) : (
                            <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                          )}
                        </Link>
                      );
                    })}
                  </div>

                  {/* Help Card */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? "هل لديك استفسار قانوني؟" : "Have legal inquiries?"}
                    </p>
                    <p className="leading-relaxed">
                      {isAr
                        ? "فريق الدعم الفني وخدمة العملاء جاهز للإجابة على جميع استفساراتك حول البنود والشروط."
                        : "Our support and customer service team is always available to answer any policy questions."}
                    </p>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new Event("open-support-widget"))}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1 pt-1"
                    >
                      <span>{isAr ? "تواصل مع الدعم الفني" : "Contact Support"}</span>
                      {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Main Footer */}
      <MainFooter />
    </div>
  );
}
