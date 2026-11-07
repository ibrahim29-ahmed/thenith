import React from 'react';
import { CheckCircle2, Clock, XCircle, Users, UserPlus } from 'lucide-react';
import { Referral, ReferralStatus } from '../types';
import EmptyState from './EmptyState';
import { Language, referralTranslations, formatLocalizedNumber } from '../i18n';

export type InvitedFriendsCardProps = {
  referrals: Referral[];
  language?: Language;
  className?: string;
};

export const InvitedFriendsCard: React.FC<InvitedFriendsCardProps> = ({
  referrals,
  language = 'ar',
  className = '',
}) => {
  const t = referralTranslations[language].friendsCard;

  const renderStatusBadge = (status: ReferralStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{t.statusActive}</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{t.statusPending}</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{t.statusCancelled}</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

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
              {referrals.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  {formatLocalizedNumber(referrals.length, language)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t.subtitle}
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Content */}
        {referrals.length === 0 ? (
          <EmptyState
            message={t.emptyState}
            icon={<UserPlus className="w-7 h-7 text-slate-400" />}
          />
        ) : (
          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <table className="w-full text-start text-xs min-w-[280px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                  <th className="pb-3 text-start">{t.colName}</th>
                  <th className="pb-3 text-start">{t.colStatus}</th>
                  <th className="pb-3 text-start">{t.colDate}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {referrals.map((friend) => (
                  <tr
                    key={friend.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 text-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {getInitials(friend.name)}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {friend.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-start">
                      {renderStatusBadge(friend.status)}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 text-start text-[11px]">
                      {new Date(friend.joinedAt).toLocaleDateString(
                        language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitedFriendsCard;

