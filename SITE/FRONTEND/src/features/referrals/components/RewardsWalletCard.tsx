import React from 'react';
import { Tag, Gift } from 'lucide-react';
import { Reward } from '../types';
import EmptyState from './EmptyState';
import { Language, referralTranslations, formatLocalizedNumber } from '../i18n';

export type RewardsWalletCardProps = {
  rewards: Reward[];
  isSubscribed?: boolean;
  language?: Language;
  className?: string;
};

export const RewardsWalletCard: React.FC<RewardsWalletCardProps> = ({
  rewards,
  isSubscribed = false,
  language = 'ar',
  className = '',
}) => {
  const t = referralTranslations[language].walletCard;

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t.title}
              </h2>
              {rewards.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  {formatLocalizedNumber(rewards.length, language)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isSubscribed ? t.subtitleSubscribed : t.subtitleNew}
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        {/* Content */}
        {rewards.length === 0 ? (
          <EmptyState
            message={t.emptyState}
            icon={<Gift className="w-7 h-7 text-slate-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="relative overflow-hidden p-4 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50/40 to-white dark:from-indigo-950/20 dark:to-slate-800/60 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {reward.label}
                  </span>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-lg">
                    {formatLocalizedNumber(reward.percent, language)}% {language === 'ar' ? 'خصم' : 'OFF'}
                  </span>
                </div>

                {reward.expiresAt && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    {t.validUntil.replace(
                      '{date}',
                      new Date(reward.expiresAt).toLocaleDateString(
                        language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US'
                      )
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsWalletCard;

