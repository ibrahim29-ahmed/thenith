import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import LandingPage from "../pages/LandingPage.jsx";

const PanelRoot = lazy(() => import("../panel/PanelRoot.jsx"));
const ProfileRoot = lazy(() => import("../profile/ProfileRoot.jsx"));
const ProductsPage = lazy(() => import("../pages/store/ProductsPage.jsx"));
const ProductDetailsPage = lazy(() => import("../pages/store/ProductDetailsPage.jsx"));
const CustomCardPage = lazy(() => import("../pages/store/CustomCardPage.jsx"));
const CartPage = lazy(() => import("../pages/store/CartPage.jsx"));
const CheckoutPage = lazy(() => import("../pages/store/CheckoutPage.jsx"));
const SuggestFeature = lazy(() => import("../pages/SuggestFeature.jsx"));
const PricingPage = lazy(() => import("../pages/PricingPage.jsx"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage.jsx"));
const PaymentPage = lazy(() => import("../pages/PaymentPage.jsx"));
const PaymentResultPage = lazy(() => import("../pages/PaymentResultPage.jsx"));
const PolicyPage = lazy(() => import("../pages/PolicyPage.jsx"));
const ReferralRedirectPage = lazy(() => import("../pages/ReferralRedirectPage.jsx"));
const WalletRedirectPage = lazy(() => import("../pages/WalletRedirectPage.jsx"));
import referralRoutes from "../api/routes/referrals.js";
import PublicCardResolverPage from "../pages/PublicCardResolverPage.jsx";
import MainNavbar from "../components/MainNavbar.jsx";

import ProtectedRoute from "./guards/ProtectedRoute.jsx";
import GuestRoute from "./guards/GuestRoute.jsx";

import { useAuth } from "../context/AuthContext.jsx";
import { LanguageProvider as ProfileLanguageProvider } from "../profile/lib/LanguageContext.jsx";
import { PortfolioProvider } from "../profile/lib/PortfolioContext.jsx";

function AdaptiveRoute({ tab, publicComponent: PublicComponent }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={`/u/${tab}${location.search || ""}`} replace />;
  }

  return <PublicComponent />;
}

function AdaptiveProductDetailsRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { id } = useParams();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    const searchParams = new URLSearchParams(location.search);
    if (id) {
      searchParams.set("id", id);
    }
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return <Navigate to={`/u/products${qs}`} replace />;
  }

  return <ProductDetailsPage />;
}

function PanelTabRedirect({ tab }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={`/u/${tab}${location.search || ""}`} replace />;
  }

  return <Navigate to={`/login?returnTo=${encodeURIComponent(`/u/${tab}${location.search || ""}`)}`} replace />;
}

function PanelWildcardRedirect() {
  const location = useLocation();
  const sub = location.pathname.replace(/^\/panel\/?/, "");
  return <Navigate to={`/u${sub ? `/${sub}` : ""}${location.search || ""}`} replace />;
}

function ReferralQueryInterceptor() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get("ref");
      if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        try {
          localStorage.setItem("thenith_referral_code", cleanRef);
          localStorage.setItem("referral_code", cleanRef);
        } catch {}
        if (isAuthenticated) {
          referralRoutes.applyReferralCode(cleanRef).catch(() => {});
        }
      }
    } catch {}
  }, [location.search, isAuthenticated]);

  return null;
}

export default function AppRoutes() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();
  const isStandalonePaymentRoute =
    location.pathname === "/payment" || location.pathname.startsWith("/payment/");

  return (
    <>
      <ReferralQueryInterceptor />
      {!isStandalonePaymentRoute && <MainNavbar />}
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200"><span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /></div>}>
        <Routes>
          <Route
            path="/u/*"
            element={
              <ProtectedRoute>
                <PanelRoot />
              </ProtectedRoute>
            }
          />
          <Route path="/panel" element={<Navigate to="/u" replace />} />
          <Route path="/panel/*" element={<PanelWildcardRedirect />} />

          <Route
            path="/login"
            element={
              <GuestRoute>
                <PanelRoot forceMode="LOGIN" />
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <PanelRoot forceMode="REGISTER" />
              </GuestRoute>
            }
          />

          <Route
            path="/p/*"
            element={
              <ProfileLanguageProvider>
                <PortfolioProvider>
                  <Suspense fallback={<div className="flex h-screen items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /></div>}>
                    <ProfileRoot />
                  </Suspense>
                </PortfolioProvider>
              </ProfileLanguageProvider>
            }
          />

          {/* Direct Referral Shortlinks */}
          <Route path="/r/:code" element={<ReferralRedirectPage />} />
          <Route path="/ref/:code" element={<ReferralRedirectPage />} />

          {/* Direct Wallet Payment Shortlinks & Unified Pay Hub */}
          <Route path="/m/:identifier" element={<WalletRedirectPage />} />
          <Route path="/m/*" element={<WalletRedirectPage />} />
          <Route path="/pay/:identifier" element={<WalletRedirectPage />} />
          <Route path="/pay/*" element={<WalletRedirectPage />} />

          {/* Static Smart Card URL Resolver: https://thenith.com/c/{publicId} */}
          <Route path="/c/:publicId" element={<PublicCardResolverPage />} />

          {/* Adaptive store routes: /u/:tab when logged in, /:tab when guest */}
          <Route path="/products" element={<AdaptiveRoute tab="products" publicComponent={ProductsPage} />} />
          <Route path="/products/:id" element={<AdaptiveProductDetailsRoute />} />
          <Route path="/custom-card" element={<AdaptiveRoute tab="custom-card" publicComponent={CustomCardPage} />} />
          <Route path="/cart" element={<AdaptiveRoute tab="cart" publicComponent={CartPage} />} />
          <Route path="/checkout" element={<AdaptiveRoute tab="checkout" publicComponent={CheckoutPage} />} />

          {/* Panel-only routes: redirect to /u/:tab if authenticated, else /login */}
          <Route path="/cards" element={<PanelTabRedirect tab="cards" />} />
          <Route path="/messages" element={<PanelTabRedirect tab="messages" />} />
          <Route path="/subscriptions" element={<PanelTabRedirect tab="subscriptions" />} />
          <Route path="/profile" element={<PanelTabRedirect tab="profile" />} />
          <Route path="/support" element={<PanelTabRedirect tab="support" />} />
          <Route path="/link-card" element={<PanelTabRedirect tab="link-card" />} />
          <Route path="/referrals" element={<PanelTabRedirect tab="referrals" />} />
          <Route path="/rewards" element={<PanelTabRedirect tab="referrals" />} />

          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/payment/success" element={<ProtectedRoute><PaymentResultPage /></ProtectedRoute>} />
          <Route path="/payment/fail" element={<ProtectedRoute><PaymentResultPage /></ProtectedRoute>} />
          <Route path="/payment/pending" element={<ProtectedRoute><PaymentResultPage /></ProtectedRoute>} />
          <Route path="/suggest" element={<SuggestFeature />} />
          <Route path="/policies/:slug" element={<PolicyPage />} />
          <Route path="/policies" element={<Navigate to="/policies/privacy-policy" replace />} />
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/u" replace /> : <LandingPage />}
          />
          <Route path="*" element={<NotFoundPage code="routeNotFound" />} />
        </Routes>
      </Suspense>
    </>
  );
}
