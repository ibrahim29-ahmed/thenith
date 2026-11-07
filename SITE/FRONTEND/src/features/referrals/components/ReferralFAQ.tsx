import React from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Language, referralTranslations } from '../i18n';

export type ReferralFAQProps = {
  language?: Language;
  className?: string;
};

export const ReferralFAQ: React.FC<ReferralFAQProps> = ({
  language = 'ar',
  className = '',
}) => {
  const t = referralTranslations[language].faq;

  const faqs = [
    { q: t.q1, a: t.a1 },
    { q: t.q2, a: t.a2 },
    { q: t.q3, a: t.a3 },
    { q: t.q4, a: t.a4 },
  ];

  return (
    <section
      className={`rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm text-start ${className}`}
    >
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {t.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'كل ما تود معرفته حول المكافآت وطريقة احتسابها'
              : 'Everything you need to know about the rewards program'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="group rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 p-4 transition-all duration-200 open:bg-white dark:open:bg-slate-800/70 open:shadow-xs open:border-indigo-300 dark:open:border-indigo-700/50"
          >
            <summary className="flex cursor-pointer items-center justify-between text-xs sm:text-sm font-bold text-slate-900 dark:text-white select-none list-none outline-none">
              <span className="pe-4">{faq.q}</span>
              <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center shrink-0 transition-colors group-open:bg-indigo-100 dark:group-open:bg-indigo-900/50">
                <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 group-open:rotate-180 group-open:text-indigo-600 dark:group-open:text-indigo-300" />
              </div>
            </summary>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs leading-relaxed text-slate-600 dark:text-slate-300 animate-fade-in">
              <p>{faq.a}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};

export default ReferralFAQ;

