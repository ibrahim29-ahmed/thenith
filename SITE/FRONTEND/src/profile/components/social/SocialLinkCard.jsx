import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { trackClick } from "../../services/portfolioService.js";
import { usePortfolio } from "../../lib/PortfolioContext.jsx";
import { useLanguage } from "../../lib/LanguageContext.jsx";
import { getSafeSiteLink } from "../../../utils/safeSiteLink.js";

export default function SocialLinkCard({
  social,
  icon,
  themeClass,
  index = 0,
}) {
  const { profile } = usePortfolio();
  const { language } = useLanguage();
  const safeUrl = getSafeSiteLink(social.url);

  const handleClick = () => {
    if (profile?.id) {
      trackClick(profile.id, safeUrl).catch(() => {});
    }
  };

  if (!safeUrl) return null;

  return (
    <motion.a
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      data-track-click="true"
      data-track-type="social"
      data-track-section="links"
      data-track-label={social.name}
      data-track-url={safeUrl}
      className={`w-full p-4 rounded-2xl border flex items-center justify-between group transition-all duration-300 shadow-sm ${themeClass}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white dark:bg-slate-950/60 shadow-sm transition-transform group-hover:scale-105 border border-slate-100 dark:border-slate-800/80 text-current">
          {icon}
        </div>

        <span className="font-semibold text-slate-800 dark:text-slate-100 text-base">
          {language === "ar" && social.nameAr ? social.nameAr : social.name}
        </span>
      </div>

      <div className="w-8 h-8 rounded-full bg-white/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-all">
        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5" />
      </div>
    </motion.a>
  );
}
