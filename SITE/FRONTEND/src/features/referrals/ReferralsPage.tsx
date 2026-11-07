import React from 'react';
import { useReferralData } from './hooks/useReferralData';
import { getCurrentTier } from './constants';
import ReferralHero from './components/ReferralHero';
import StatsRow from './components/StatsRow';
import MonthlyTiersCard from './components/MonthlyTiersCard';
import GrandRewardCard from './components/GrandRewardCard';
import RewardsWalletCard from './components/RewardsWalletCard';
import InvitedFriendsCard from './components/InvitedFriendsCard';
import ReferralFAQ from './components/ReferralFAQ';
import { Language, referralTranslations } from './i18n';
import { AlertCircle, RefreshCw } from 'lucide-react';

export type ReferralsPageProps = {
  language?: Language;
  className?: string;
  isSubscribed?: boolean;
};

export const ReferralsPage: React.FC<ReferralsPageProps> = ({
  language = 'ar',
  className = '',
  isSubscribed: isSubscribedProp,
}) => {
  const { data, isLoading, isError, error, refetch } = useReferralData();
  const isSubscribed = isSubscribedProp !== undefined ? isSubscribedProp : Boolean(data.isSubscribed);
  const t = referralTranslations[language].common;

  const earnedDiscountPercent = getCurrentTier(data.monthlyCount);

  // Skeletons matching exact card dimensions (No full page spinner)
  if (isLoading) {
    return (
      <div
        dir="rtl"
        className={`w-full max-w-[1280px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 ${className}`}
      >
        {/* Hero Skeleton */}
        <div className="h-[360px] w-full rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />

        {/* StatsRow Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-[130px] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-[130px] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-[130px] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>

        {/* Row 3 Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
          <div className="h-[260px] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-[260px] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>

        {/* Row 4 Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="h-[220px] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-[220px] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>

        {/* FAQ Skeleton */}
        <div className="h-[240px] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  // Error Card with Retry button
  if (isError && !data.code) {
    return (
      <div
        dir="rtl"
        className={`w-full max-w-[1280px] mx-auto p-4 sm:p-6 lg:p-10 ${className}`}
      >
        <div className="rounded-[24px] bg-white p-8 sm:p-12 border border-rose-200 shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#0b1020] mb-2">
            {t.errorTitle}
          </h2>
          <p className="text-xs text-[#5b6278] max-w-md mb-6 leading-relaxed">
            {error?.message || 'حدث خطأ غير متوقع أثناء استرجاع بياناتك.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[12px] bg-[#0b1020] hover:bg-[#1b2a8a] text-white text-xs font-bold transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t.retry}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className={`w-full max-w-[1280px] mx-auto p-3 sm:p-6 lg:p-8 space-y-5 sm:space-y-7 pb-28 md:pb-12 transition-colors ${className}`}
    >
      {/* 1. Referral Hero */}
      <ReferralHero
        code={data.code}
        link={data.link}
        language={language}
      />

      {/* 2. Stats Row */}
      <StatsRow
        monthlyCount={data.monthlyCount}
        totalCount={data.totalCount}
        grandTarget={data.grandTarget}
        earnedDiscountPercent={earnedDiscountPercent}
        isSubscribed={isSubscribed}
        language={language}
      />

      {/* 3. Monthly Tiers + Grand Reward (1.2fr / 1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 sm:gap-7 items-stretch">
        <MonthlyTiersCard
          monthlyCount={data.monthlyCount}
          daysLeftInCycle={data.daysLeftInCycle}
          isSubscribed={isSubscribed}
          language={language}
        />

        <GrandRewardCard
          totalCount={data.totalCount}
          grandTarget={data.grandTarget}
          isSubscribed={isSubscribed}
          language={language}
        />
      </div>

      {/* 4. Rewards Wallet + Invited Friends (Equal Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7 items-stretch">
        <RewardsWalletCard
          rewards={data.rewards}
          isSubscribed={isSubscribed}
          language={language}
        />

        <InvitedFriendsCard
          referrals={data.referrals}
          language={language}
        />
      </div>

      {/* 5. FAQ Accordion */}
      <ReferralFAQ language={language} />
    </div>
  );
};

export default ReferralsPage;

