import React from 'react';
import { Share2, MessageCircle } from 'lucide-react';
import CopyField from './CopyField';
import { Language, referralTranslations } from '../i18n';

export type ReferralHeroProps = {
  code: string;
  link: string;
  language?: Language;
  onShareFallbackCopy?: () => void;
};

export const ReferralHero: React.FC<ReferralHeroProps> = ({
  code,
  link,
  language = 'ar',
  onShareFallbackCopy,
}) => {
  const t = referralTranslations[language].hero;

  const shareText = language === 'ar'
    ? `سجل في Thenith واحصل على خصم 10% على اشتراكك باستخدام كود الخصم بتاعي: ${code}\n${link}`
    : `Join Thenith and get 10% off your subscription using my code: ${code}\n${link}`;

  const handleShare = async () => {
    if (!link) return;
    const shareData = {
      title: 'Thenith - برنامج الإحالة',
      text: shareText,
      url: link,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== 'AbortError') copyLinkFallback();
      }
    } else {
      copyLinkFallback();
    }
  };

  const copyLinkFallback = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
    if (onShareFallbackCopy) onShareFallbackCopy();
  };

  const handleWhatsAppShare = () => {
    if (!link) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-900/40 p-5 sm:p-8 text-white shadow-lg">
      {/* Subtle brand glow in Thenith Indigo */}
      <div className="pointer-events-none absolute -top-24 -end-24 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -start-24 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-5 sm:gap-6">
        {/* Top: Simple & Punchy Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl text-start">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              {language === 'ar'
                ? 'ادعُ أصدقاءك واكسب كارتك المجاني'
                : 'Invite Friends & Earn Your Free Card'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {language === 'ar'
                ? 'صديقك يحصل على خصم 10% فوراً، وأنت تكسب حتى 25% خصم تجديد شهري وكارت ذكي مجاني عند 14 إحالة.'
                : 'Your friend gets 10% off instantly, and you earn up to 25% monthly renewal discounts plus a free NFC smart card at 14 referrals.'}
            </p>
          </div>
        </div>

        {/* Inputs row: Referral code & direct link */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          <CopyField
            label={t.codeLabel}
            value={code}
            buttonText={t.copyBtn}
            copiedText={t.copiedBtn}
            variant="dark"
            isMonospace
            letterSpacing="1px"
          />
          <CopyField
            label={t.linkLabel}
            value={link}
            buttonText={t.copyLinkBtn || 'نسخ الرابط'}
            copiedText={t.copiedBtn}
            variant="dark"
          />
        </div>

        {/* Bottom Actions: Share buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto ms-auto">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer outline-none shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer outline-none shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t.shareButton}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReferralHero;

