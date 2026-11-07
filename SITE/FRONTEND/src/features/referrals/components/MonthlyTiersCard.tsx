import React from 'react';
import { Check, Clock, Lock, TrendingUp, ArrowUpRight, Percent } from 'lucide-react';
import { MONTHLY_TIERS } from '../constants';
import { Language, referralTranslations, formatLocalizedNumber } from '../i18n';

export type MonthlyTiersCardProps = {
  monthlyCount: number;
  daysLeftInCycle: number;
  isSubscribed?: boolean;
  language?: Language;
  className?: string;
};

export const MonthlyTiersCard: React.FC<MonthlyTiersCardProps> = ({
  monthlyCount,
  daysLeftInCycle,
  isSubscribed = false,
  language = 'ar',
  className = '',
}) => {
  const t = referralTranslations[language].monthlyCard;

  // Determine current earned percent & next tier target
  let currentPercent = 0;
  let nextTier = MONTHLY_TIERS[0];
  let isMaxTier = false;

  for (let i = 0; i < MONTHLY_TIERS.length; i++) {
    if (monthlyCount >= MONTHLY_TIERS[i].count) {
      currentPercent = MONTHLY_TIERS[i].percent;
      if (i < MONTHLY_TIERS.length - 1) {
        nextTier = MONTHLY_TIERS[i + 1];
      } else {
        isMaxTier = true;
      }
    } else {
      if (currentPercent === 0) {
        nextTier = MONTHLY_TIERS[i];
      }
      break;
    }
  }

  const neededForNext = Math.max(0, nextTier.count - monthlyCount);
  const trackProgressPercent = Math.min(100, Math.round((monthlyCount / 7) * 100));

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div className="space-y-6">
        {/* 1. Header with dynamic status & Countdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="text-start">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {isSubscribed ? t.titleSubscribed : t.titleNew}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>
                  {language === 'ar'
                    ? `باقي ${formatLocalizedNumber(daysLeftInCycle, language)} يوماً على نهاية دورة الشهر`
                    : `${formatLocalizedNumber(daysLeftInCycle, language)} days left in monthly cycle`}
                </span>
              </span>
            </div>
          </div>

          {/* Current Score Tag */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 text-end">
              <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {language === 'ar' ? 'إحالاتك هذا الشهر' : 'Month Referrals'}
              </span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                {formatLocalizedNumber(monthlyCount, language)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Visual Ladder with Connected Progress Track */}
        <div className="relative pt-2">
          {/* Horizontal Progress Track line behind nodes (desktop) */}
          <div className="hidden sm:block absolute top-[52px] start-12 end-12 h-1 bg-slate-100 dark:bg-slate-800 z-0 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 transition-all duration-700 rounded-full"
              style={{ width: `${trackProgressPercent}%` }}
            />
          </div>

          {/* 4 Tier Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            {MONTHLY_TIERS.map((tier, idx) => {
              const isAchieved = monthlyCount >= tier.count;
              const isNext = !isAchieved && (idx === 0 || monthlyCount >= MONTHLY_TIERS[idx - 1].count);

              return (
                <div
                  key={tier.count}
                  className={`relative flex flex-col items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${
                    isAchieved
                      ? 'bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-slate-900 border-2 border-emerald-500 shadow-sm shadow-emerald-500/10'
                      : isNext
                      ? 'bg-white dark:bg-slate-900 border-2 border-dashed border-indigo-400 dark:border-indigo-600 shadow-sm'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 opacity-80'
                  }`}
                >
                  {/* Top Node Indicator */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-3 shadow-xs transition-transform group-hover:scale-110 ${
                      isAchieved
                        ? 'bg-emerald-600 text-white'
                        : isNext
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isAchieved ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : isNext ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                  </div>

                  {/* Percentage Value */}
                  <div className="text-center my-1">
                    <span
                      className={`text-2xl sm:text-3xl font-black tracking-tight ${
                        isAchieved
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isNext
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {formatLocalizedNumber(tier.percent, language)}%
                    </span>
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatLocalizedNumber(tier.count, language)}{' '}
                      {tier.count === 1 ? t.referralsUnit : t.referralsUnitPlural}
                    </span>
                  </div>

                  {/* Bottom Status Tag */}
                  <div className="mt-3 w-full">
                    {isAchieved ? (
                      <span className="block w-full py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold text-center">
                        {language === 'ar' ? 'تم التفعيل ✓' : 'Active ✓'}
                      </span>
                    ) : isNext ? (
                      <span className="block w-full py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold text-center animate-pulse">
                        {language === 'ar' ? 'الهدف التالي' : 'Next Target'}
                      </span>
                    ) : (
                      <span className="block w-full py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-medium text-center">
                        {language === 'ar' ? 'مغلق' : 'Locked'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Creative Next-Step Motivator Box */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/70 via-slate-50 to-emerald-50/50 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-800/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Percent className="w-4 h-4" />
            </div>
            <div className="text-xs">
              {isMaxTier ? (
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  {isSubscribed ? t.maxTierSubscribed : t.maxTierNew}
                </p>
              ) : (
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {language === 'ar' ? (
                    <>
                      ادعُ{' '}
                      <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                        {formatLocalizedNumber(neededForNext, language)}{' '}
                        {neededForNext === 1 ? 'صديق إضافي' : 'أصدقاء إضافيين'}
                      </strong>{' '}
                      هذا الشهر لترقية خصمك إلى{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatLocalizedNumber(nextTier.percent, language)}%
                      </strong>
                    </>
                  ) : (
                    <>
                      Invite{' '}
                      <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                        {formatLocalizedNumber(neededForNext, language)} more friend
                        {neededForNext > 1 ? 's' : ''}
                      </strong>{' '}
                      this month to upgrade your discount to{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatLocalizedNumber(nextTier.percent, language)}%
                      </strong>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
            <span>{currentPercent}% {language === 'ar' ? 'مفعل الآن' : 'Active'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 4. Footer Note */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-start">
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t.note}
        </p>
      </div>
    </div>
  );
};

export default MonthlyTiersCard;

