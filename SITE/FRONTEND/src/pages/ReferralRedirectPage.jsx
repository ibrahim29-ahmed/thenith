import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { referralRoutes } from "../api/routes/referrals.js";
import toast from "../util/toast.js";

export default function ReferralRedirectPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isInitializing } = useAuth();
  const [statusText, setStatusText] = useState("جارٍ التحقق من كود الإحالة وتطبيق الخصم...");

  useEffect(() => {
    if (isInitializing) return;

    const cleanCode = (code || "").trim().toUpperCase();
    if (!cleanCode) {
      navigate("/", { replace: true });
      return;
    }

    try {
      localStorage.setItem("thenith_referral_code", cleanCode);
      localStorage.setItem("referral_code", cleanCode);
    } catch {}

    if (isAuthenticated) {
      // User is already logged in -> Apply referral to their account
      setStatusText("جارٍ ربط كود الإحالة بحسابك وتطبيق خصم 10%...");
      referralRoutes
        .applyReferralCode(cleanCode)
        .then((res) => {
          if (res?.success) {
            toast.success(
              res.message || "تم تطبيق كود الإحالة بنجاح! حصلت على خصم 10% على أول اشتراك."
            );
          }
        })
        .catch((err) => {
          const errMsg =
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message;
          if (errMsg) {
            toast.info(errMsg);
          }
        })
        .finally(() => {
          // Send user straight to subscriptions tab in panel
          navigate(`/u?tab=subscriptions&ref=${encodeURIComponent(cleanCode)}`, {
            replace: true,
          });
        });
    } else {
      // User is a guest / new visitor -> Redirect to signup with ref attached
      setStatusText("جارٍ توجيهك لصفحة التسجيل مع تثبيت كود الخصم...");
      navigate(`/signup?ref=${encodeURIComponent(cleanCode)}`, { replace: true });
    }
  }, [code, isAuthenticated, isInitializing, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-white">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/30 border-t-emerald-400" />
        <h2 className="text-xl font-bold tracking-tight">برنامج المكافآت والإحالة من Thenith</h2>
        <p className="text-sm text-slate-300">{statusText}</p>
        <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/20">
          {code}
        </span>
      </div>
    </div>
  );
}

