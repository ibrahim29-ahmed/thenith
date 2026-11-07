import React from 'react';
import { Users, Award, Percent, TrendingUp } from 'lucide-react';
import { Language, referralTranslations, formatLocalizedNumber } from '../i18n';

export type StatsRowProps = {
  monthlyCount: number;
  totalCount: number;
  grandTarget?: number;
  earnedDiscountPercent: number;
  isSubscribed?: boolean;
  language?: Language;
};

export const StatsRow: React.FC<StatsRowProps> = ({
  monthlyCount,
  totalCount,
  grandTarget = 14,
  earnedDiscountPercent,
  isSubscribed = false,
  language = 'ar',
}) => {
  const t = referralTranslations[language].stats;
  const progressToCard = Math.min(100, Math.round((totalCount / grandTarget) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
      {/* 1. Monthly Referrals */}
      <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/50 transition-all duration-200">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t.monthlyTitle}
          </span>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatLocalizedNumber(monthlyCount, language)}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {language === 'ar' ? 'صديق' : 'friends'}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'تُجدد المكافأة شهرياً' : 'Resets monthly'}</span>
        </div>
      </div>

      {/* 2. Total Successful Referrals */}
      <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700/50 transition-all duration-200">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t.totalTitle}
          </span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatLocalizedNumber(totalCount, language)}
          </span>
          <span className="text-sm font-semibold text-slate-400">
            / {formatLocalizedNumber(grandTarget, language)} {language === 'ar' ? 'للكارت' : 'for card'}
          </span>
        </div>

        {/* Progress Bar towards Grand Target */}
        <div className="mt-3 space-y-1">
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progressToCard}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>{progressToCard}% {language === 'ar' ? 'مكتمل' : 'completed'}</span>
            <span>
              {Math.max(0, grandTarget - totalCount)} {language === 'ar' ? 'متبقي' : 'left'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Earned Renewal / Referral Discount */}
      <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-all duration-200">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isSubscribed ? t.discountTitleSubscribed : t.discountTitleNew}
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatLocalizedNumber(earnedDiscountPercent, language)}%
          </span>
          <span className="text-xs font-medium text-slate-500">
            {isSubscribed ? t.discountSubtitleSubscribed : t.discountSubtitleNew}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <span>
            {earnedDiscountPercent > 0
              ? (isSubscribed ? t.activeNoteSubscribed : t.activeNoteNew)
              : (language === 'ar' ? 'ادعُ صديقاً لتفعيل أول 10%' : 'Invite 1 to activate 10%')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatsRow;

