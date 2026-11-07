import React, { useState, useEffect } from 'react';
import { CheckCircle2, Gift, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressRing from './ProgressRing';
import { Language, referralTranslations, formatLocalizedNumber } from '../i18n';
import { loadStoreProducts } from '../../../pages/store/storeApi';

export type GrandRewardCardProps = {
  totalCount: number;
  grandTarget?: number;
  isSubscribed?: boolean;
  language?: Language;
  className?: string;
};

type CardSlide = {
  id: string;
  src: string;
  name: string;
  tag?: string;
};

export const GrandRewardCard: React.FC<GrandRewardCardProps> = ({
  totalCount,
  grandTarget = 14,
  isSubscribed = false,
  language = 'ar',
  className = '',
}) => {
  const t = referralTranslations[language].grandCard;
  const isCompleted = totalCount >= grandTarget;
  const remaining = Math.max(0, grandTarget - totalCount);

  // Read card images configured in .env (VITE_LANDING_CARD_IMAGES)
  const envCardImages: string[] = (import.meta.env.VITE_LANDING_CARD_IMAGES || '')
    .split(',')
    .map((url: string) => url.trim())
    .filter(Boolean);

  const getInitialSlides = (): CardSlide[] => {
    if (envCardImages.length > 0) {
      return envCardImages.map((url, idx) => ({
        id: `env_card_${idx + 1}`,
        src: url,
        name: language === 'ar' ? `كارت Thenith الذكي (تصميم ${idx + 1})` : `Thenith Smart Card (Design ${idx + 1})`,
      }));
    }
    return [
      {
        id: 'default_front',
        src: '/cards/card_front_default.jpg',
        name: language === 'ar' ? 'كارت Thenith الذكي' : 'Thenith Smart Card',
      },
      {
        id: 'default_back',
        src: '/cards/card_back_default.jpg',
        name: language === 'ar' ? 'كارت البروفايل الرقمي الذكي' : 'Digital Profile Smart Card',
      },
    ];
  };

  const [slides, setSlides] = useState<CardSlide[]>(getInitialSlides());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  // If env has cards, keep them or enrich with store products
  useEffect(() => {
    if (envCardImages.length > 0) {
      setSlides(
        envCardImages.map((url, idx) => ({
          id: `env_card_${idx + 1}`,
          src: url,
          name: language === 'ar' ? `كارت Thenith الذكي (تصميم ${idx + 1})` : `Thenith Smart Card (Design ${idx + 1})`,
        }))
      );
      return;
    }

    let isMounted = true;
    loadStoreProducts(language)
      .then((products) => {
        if (!isMounted || !products || products.length === 0) return;

        const allProductCards: CardSlide[] = [];
        products.forEach((p) => {
          if (Array.isArray(p.images) && p.images.length > 0) {
            p.images.forEach((img: any, idx: number) => {
              if (img.url) {
                allProductCards.push({
                  id: `${p.id}_${idx}`,
                  src: img.url,
                  name: p.name || (language === 'ar' ? 'كارت Thenith الذكي' : 'Thenith Smart Card'),
                });
              }
            });
          } else if (p.image) {
            allProductCards.push({
              id: String(p.id),
              src: p.image,
              name: p.name || (language === 'ar' ? 'كارت Thenith الذكي' : 'Thenith Smart Card'),
            });
          }
        });

        if (allProductCards.length > 0) {
          setSlides(allProductCards);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [language]);

  // Auto-play / auto-slide effect (changes automatically every 3.5 seconds)
  useEffect(() => {
    if (slides.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [slides.length, isHovered]);

  const prevSlide = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const ringAria = t.ringAria
    .replace('{current}', formatLocalizedNumber(totalCount, language))
    .replace('{target}', formatLocalizedNumber(grandTarget, language));

  const activeCard = slides[currentSlide] || slides[0];

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-900 p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div className="space-y-5">
        {/* 1. Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-start">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t.title}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              {formatLocalizedNumber(grandTarget, language)} {language === 'ar' ? 'إحالة' : 'referrals'}
            </span>
          </div>
        </div>

        {/* 2. Top Slider: Completely clean card with smooth motion animation & auto-play */}
        <div
          className="relative w-full flex flex-col items-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative w-full max-w-[360px] aspect-[1.586/1] rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 bg-slate-950 select-none group">
            {/* Pure card image with fluid slide/fade animation — NO overlays blocking artwork */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.img
                key={activeCard?.src || currentSlide}
                src={activeCard?.src || '/cards/card_front_default.jpg'}
                alt={activeCard?.name || 'Thenith Smart Card'}
                custom={direction}
                variants={{
                  enter: (d: number) => ({
                    opacity: 0,
                    x: d > 0 ? 60 : -60,
                    scale: 0.97,
                  }),
                  center: {
                    opacity: 1,
                    x: 0,
                    scale: 1,
                    transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] },
                  },
                  exit: (d: number) => ({
                    opacity: 0,
                    x: d > 0 ? -60 : 60,
                    scale: 0.97,
                    transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] },
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/cards/card_front_default.jpg';
                }}
              />
            </AnimatePresence>

            {/* Subtle Navigation Arrows (Appear cleanly on hover) */}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Previous card"
                  className="absolute top-1/2 -translate-y-1/2 start-2.5 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-all active:scale-95 cursor-pointer outline-none border border-white/10 opacity-70 group-hover:opacity-100"
                >
                  <ChevronRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                </button>

                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next card"
                  className="absolute top-1/2 -translate-y-1/2 end-2.5 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-all active:scale-95 cursor-pointer outline-none border border-white/10 opacity-70 group-hover:opacity-100"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                </button>
              </>
            )}
          </div>

          {/* Dots Indicator with active animation */}
          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setDirection(i > currentSlide ? 1 : -1);
                    setCurrentSlide(i);
                  }}
                  aria-label={`Go to card ${i + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    i === currentSlide
                      ? 'w-6 h-1.5 bg-indigo-600'
                      : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* 3. Bottom Text & Details: Complete, clear & spacious */}
        <div className="pt-1 text-start">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {isSubscribed ? t.descriptionSubscribed : t.descriptionNew}
          </p>
        </div>
      </div>

      {/* 4. Footer Progress Bar & Status */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="flex-1 text-start">
          <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
            <span className="text-slate-700 dark:text-slate-300">
              {formatLocalizedNumber(totalCount, language)} / {formatLocalizedNumber(grandTarget, language)} {language === 'ar' ? 'إحالة مكتملة' : 'referrals'}
            </span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {Math.min(100, Math.round((totalCount / grandTarget) * 100))}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((totalCount / grandTarget) * 100))}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
            {isCompleted ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {language === 'ar' ? 'مبارك! أهلت لطلب كارتك المجاني' : 'Card unlocked! You can claim it now'}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {language === 'ar'
                    ? `متبقي ${remaining} إحالة ناجحة لطلب كارتك المجاني`
                    : `${remaining} referrals remaining to unlock`}
                </span>
              </span>
            )}
          </p>
        </div>

        <div className="shrink-0">
          <ProgressRing
            current={totalCount}
            target={grandTarget}
            size={56}
            strokeWidth={5}
            ariaLabel={ringAria}
          />
        </div>
      </div>
    </div>
  );
};

export default GrandRewardCard;

