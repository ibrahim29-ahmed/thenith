import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Lock,
  Layers,
  Loader2,
} from "lucide-react";
import { publicClient, request } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { applyPageSeo } from "../utils/seo.js";

export default function PublicCardResolverPage() {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [cardData, setCardData] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState("");
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    applyPageSeo({
      title: "Thenith — Smart Card Resolver",
      robots: "noindex, nofollow",
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function resolveCard() {
      if (!publicId) {
        setErrorStatus("not_found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await publicClient.get(`/cards/resolve/${encodeURIComponent(publicId)}`);
        const data = res.data;

        if (!isMounted) return;

        const dest = data.redirectUrl || data.targetPath || (data.status === "claimed" ? data.profile?.targetPath : null);
        if (dest) {
          hasRedirectedRef.current = true;
          setIsRedirecting(true);

          let targetPath = dest;
          try {
            if (/^https?:\/\//i.test(dest)) {
              const url = new URL(dest);
              if (
                url.origin === window.location.origin ||
                url.hostname === window.location.hostname ||
                url.hostname === "localhost" ||
                url.hostname === "127.0.0.1" ||
                url.hostname.includes("thenith.com")
              ) {
                targetPath = url.pathname + url.search + url.hash;
              }
            }
          } catch {}

          // Instant seamless client-side transition for profile destinations
          if (targetPath.startsWith("/")) {
            navigate(targetPath, { replace: true });
          } else {
            window.location.replace(dest);
          }
          return;
        }

        setCardData(data);
        setErrorStatus(data.status);
      } catch (err) {
        if (!isMounted) return;
        const status = err.response?.status;
        if (status === 404) {
          setErrorStatus("not_found");
        } else {
          setErrorStatus("error");
        }
      } finally {
        if (isMounted && !hasRedirectedRef.current) {
          setLoading(false);
        }
      }
    }

    resolveCard();

    return () => {
      isMounted = false;
    };
  }, [publicId, navigate]);

  // Handle claiming card for logged-in user
  const handleClaim = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/c/${publicId}`);
      return;
    }

    try {
      setClaiming(true);
      setClaimError("");
      const res = await request("/cards/claim", {
        method: "POST",
        data: { publicId },
      });

      if (res.success) {
        setClaimSuccess(true);
        setTimeout(() => {
          navigate("/panel");
        }, 2000);
      }
    } catch (err) {
      setClaimError(err.response?.data?.message || err.message || "حدث خطأ أثناء ربط الكارت");
    } finally {
      setClaiming(false);
    }
  };

  // Render absolutely nothing while resolving or redirecting to ensure a seamless instant redirect
  if (loading || isRedirecting) {
    return null;
  }

  // ── 1. Card Not Found (404)
  if (errorStatus === "not_found") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-white">الكارت غير موجود</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            الرابط الذي تحاول الوصول إليه غير مرتبط بأي كارت ذكي مسجل في نظام Thenith. تأكد من صحة الرابط أو رمز QR.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all"
          >
            الذهاب للصفحة الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  // ── 2. Card Disabled
  if (errorStatus === "disabled") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-slate-900/80 border border-amber-500/20 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-white">هذا الكارت معطّل</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            تم تعطيل هذا الكارت الذكي إدارياً ولا يمكن عرض البروفايل من خلاله في الوقت الحالي.
          </p>
          {cardData?.disabledReason && (
            <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 mb-8 text-xs text-amber-300">
              سبب التعطيل: {cardData.disabledReason}
            </div>
          )}
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  // ── 3. Profile Unavailable
  if (errorStatus === "profile_unavailable") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-white">البروفايل غير متاح</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            البروفايل المرتبط بهذا الكارت الذكي غير متاح حالياً أو تم إيقافه مؤقتاً من قبل صاحبه.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  // ── 4. Card Unclaimed (Ready to be claimed) — ONLY shown if the card is explicitly unclaimed
  if (errorStatus === "unclaimed" || cardData?.status === "unclaimed") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden" dir="rtl">
        {/* Background ambient glow */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
          {/* Card Header Graphic */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-5 relative group">
              <CreditCard className="w-10 h-10 text-white" />
              <span className="absolute -bottom-2 px-2.5 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider">
                أصلي 100%
              </span>
            </div>

            <h1 className="text-2xl font-black text-white mb-2">كارت Thenith ذكي</h1>
            <p className="text-slate-400 text-sm max-w-sm">
              هذا الكارت أصلي ومجهز بتقنية NFC وQR، وهو جاهز للربط ببروفايلك الرقمي ومشاركته بنقرة واحدة.
            </p>
          </div>

          {/* Card Properties Preview Box */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-4 mb-6 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>معرّف الرابط الثابت:</span>
              <span className="font-mono font-bold text-indigo-400">{publicId}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>نوع الكارت:</span>
              <span className="font-medium text-white capitalize">{cardData?.card?.cardType || "Standard"}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>اللون:</span>
              <span className="font-medium text-white capitalize">{cardData?.card?.color || "Black"}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>حالة التفعيل:</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                جاهز للربط والتفعيل
              </span>
            </div>
          </div>

          {/* Error / Success Alerts */}
          {claimError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3 mb-6 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{claimError}</span>
            </div>
          )}

          {claimSuccess ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 mb-6 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p className="font-bold text-sm mb-1">تم ربط الكارت بنجاح!</p>
              <p className="text-xs text-slate-400">جاري نقلك إلى لوحة التحكم الخاصة بك...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الربط...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {isAuthenticated ? "ربط هذا الكارت بحسابي الآن" : "تسجيل الدخول وربط الكارت"}
                  </>
                )}
              </button>

              {!isAuthenticated && (
                <p className="text-center text-xs text-slate-500">
                  ليس لديك حساب؟{" "}
                  <Link to={`/signup?claim=${publicId}`} className="text-indigo-400 hover:underline font-medium">
                    أنشئ حساب جديد مجاناً
                  </Link>
                </p>
              )}
            </div>
          )}

          {/* Trust Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/60 flex items-center justify-center gap-6 text-slate-500 text-xs">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>كارت أصلي معتمد</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>تحديث البروفايل في أي وقت</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 5. Safe Fallback (resolving or transitioning)
  return null;
}
