import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mail,
  Globe,
  Instagram,
  Linkedin,
  Youtube,
  MessageCircle,
  MapPin,
  Phone,
  CalendarDays,
  Calendar,
  BarChart2,
  Eye,
  MessageSquare,
  MousePointerClick,
  TrendingUp,
  X,
  Copy,
  Share2,
  CheckCircle2,
  QrCode,
  Link2,
  Download,
  Loader2,
  Lock,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  Layers,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { isFeatureEnabled } from "../../config/features.js";
import { canAccess } from "../../utils/entitlements.js";
import { downloadQrCode1080 } from "../../../utils/qrDownload.js";
import PendingPaymentAlert from "./PendingPaymentAlert.jsx";

const getIconForLink = (name) => {
  const map = {
    Instagram,
    LinkedIn: Linkedin,
    YouTube: Youtube,
    Facebook: Globe,
    WhatsApp: MessageCircle,
    Telegram: MessageCircle,
    Website: Globe,
    Email: Mail,
    Phone,
    Calendly: CalendarDays,
    "Google Maps": MapPin,
  };
  return map[name] || Globe;
};

const labels = {
  week: {
    ar: [
      "حد",
      "اتنين",
      "تلات",
      "اربع",
      "خميس",
      "جمعة",
      "سبت",
    ],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  year: {
    ar: [
      "ينا",
      "فبر",
      "مار",
      "أبر",
      "ماي",
      "يون",
      "يول",
      "أغس",
      "سبت",
      "أكت",
      "نوف",
      "ديس",
    ],
    en: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
  },
};

const COUNTRIES_META = {
  EG: { code: "EG", name: "Egypt", nameAr: "مصر" },
  SA: { code: "SA", name: "Saudi Arabia", nameAr: "السعودية" },
  US: { code: "US", name: "United States", nameAr: "الولايات المتحدة" },
  AE: { code: "AE", name: "UAE", nameAr: "الإمارات" },
  KW: { code: "KW", name: "Kuwait", nameAr: "الكويت" },
  UK: { code: "UK", name: "United Kingdom", nameAr: "بريطانيا" },
  GB: { code: "GB", name: "United Kingdom", nameAr: "بريطانيا" },
};

const getCountryMeta = (code) => {
  return (
    COUNTRIES_META[code] || {
      code,
      name: code,
      nameAr: code,
    }
  );
};

export default function HomePage({
  t,
  language,
  notifications,
  cards,
  permissions,
  entitlements,
  activeCardLink,
  activeCardId,
  onUpgrade,
}) {
  const canViewAdvancedAnalytics = canAccess(entitlements, "advancedAnalytics");
  const isFreePlan = !canViewAdvancedAnalytics;
  const [selectedCardId, setSelectedCardId] = useState("all");
  const [timeframe, setTimeframe] = useState("today");
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [selectedLinkDetails, setSelectedLinkDetails] = useState(null);

  useEffect(() => {
    if (isFreePlan && timeframe !== "today") {
      setTimeframe("today");
    }
  }, [isFreePlan]);

  const triggerUpgradePrompt = (title, message) => {
    import("sweetalert2").then((Swal) => {
      Swal.default.fire({
        title: title || t("proFeatureOnly") || (language === "ar" ? "هذه الميزة متاحة في باقة Pro" : "This feature is available in Pro plan"),
        text: message || t("proFeatureText") || (language === "ar" ? "قم بالترقية الآن للوصول إلى جميع الميزات المتقدمة." : "Upgrade now to access all advanced features."),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: language === "ar" ? "تصفح الباقات" : "View Plans",
        cancelButtonText: language === "ar" ? "إلغاء" : "Cancel",
        confirmButtonColor: "#4f46e5",
      }).then((result) => {
        if (result.isConfirmed) {
          if (onUpgrade) {
            onUpgrade();
          } else {
            window.location.href = "/panel/subscriptions";
          }
        }
      });
    });
  };

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Card selector dropdown state & click-outside
  const [isCardDropdownOpen, setIsCardDropdownOpen] = useState(false);
  const cardDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cardDropdownRef.current && !cardDropdownRef.current.contains(e.target)) {
        setIsCardDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCard = useMemo(() => {
    if (selectedCardId === "all") return null;
    return cards.find((c) => c.id === selectedCardId) || null;
  }, [selectedCardId, cards]);

  const currentDisplayLink = useMemo(() => {
    if (!selectedCard) return activeCardLink;
    const cardIndex = cards.findIndex((c) => c.id === selectedCard.id);
    if (cardIndex === 0 && activeCardLink) {
      return activeCardLink;
    }
    return `${window.location.origin}/p/${selectedCard.publicId || ""}`;
  }, [selectedCard, cards, activeCardLink]);

  const handleCopyLink = async () => {
    const link = currentDisplayLink || activeCardLink;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
    }
  };

  const handleNativeShare = async () => {
    const link = currentDisplayLink || activeCardLink;
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedCard?.name || "My Thenith Profile",
          url: link,
        });
      } catch (err) {
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQr = async () => {
    setIsDownloading(true);
    try {
      const targetCard = selectedCard || cards.find((c) => c.id === activeCardId);
      await downloadQrCode1080({
        svgId: "home-qr-svg",
        cardName: targetCard?.name || "Card",
        includeCenterBadge: false,
      });
    } catch (err) {
    } finally {
      setIsDownloading(false);
    }
  };

  const activeCards =
    selectedCardId === "all"
      ? cards
      : cards.filter((c) => c.id === selectedCardId);

  // Calculate Today's Visits across active cards
  const todayVisitsCount = useMemo(() => {
    let sum = 0;
    activeCards.forEach((card) => {
      if (typeof card.analytics?.visits?.today === "number") {
        sum += card.analytics.visits.today;
      } else {
        const monthArr = card.analytics?.visits?.month;
        if (Array.isArray(monthArr) && monthArr.length === 30) {
          sum += (monthArr[29] || 0);
        } else {
          const weekArr = card.analytics?.visits?.week;
          const now = new Date();
          const day = now.getDay();
          const diffToSaturday = day === 6 ? 0 : day + 1;
          sum += (weekArr?.[diffToSaturday] || 0);
        }
      }
    });
    return sum;
  }, [activeCards]);

  // Calculate Today's Clicks across active cards
  const todayClicksCount = useMemo(() => {
    let sum = 0;
    activeCards.forEach((card) => {
      if (typeof card.analytics?.clicks?.today === "number") {
        sum += card.analytics.clicks.today;
      } else {
        const lc = card.analytics?.linkClicks || {};
        Object.values(lc).forEach((linkData) => {
          sum += (linkData.today || 0);
        });
      }
    });
    return sum;
  }, [activeCards]);

  // Aggregate Visits
  const aggregatedVisits = useMemo(() => {
    if (timeframe === "today") {
      return [
        0,
        Math.floor(todayVisitsCount * 0.25),
        Math.floor(todayVisitsCount * 0.5),
        Math.floor(todayVisitsCount * 0.75),
        todayVisitsCount,
      ];
    }
    const baseLength =
      timeframe === "week" ? 7 : timeframe === "month" ? 30 : 12;
    const result = Array(baseLength).fill(0);
    activeCards.forEach((card) => {
      const cardVisits =
        card.analytics?.visits?.[timeframe] || Array(baseLength).fill(0);
      cardVisits.forEach((v, i) => {
        result[i] += v;
      });
    });
    return result;
  }, [activeCards, timeframe, todayVisitsCount]);

  const totalVisitsCount = timeframe === "today" ? todayVisitsCount : aggregatedVisits.reduce((a, b) => a + b, 0);

  // Aggregate Links
  const linkPerformance = useMemo(() => {
    const linksMap = {};
    activeCards.forEach((card) => {
      (card.links || []).forEach((link) => {
        if (!linksMap[link.name])
          linksMap[link.name] = {
            name: language === "ar" && link.nameAr ? link.nameAr : link.name,
            icon: getIconForLink(link.name),
            clicks: 0,
            todayClicks: 0,
            countries: {},
          };

        const clickData = card.analytics?.linkClicks?.[link.url] || {
          total: 0,
          today: 0,
          countries: {},
        };
        linksMap[link.name].clicks += (clickData.total || 0);
        linksMap[link.name].todayClicks += (clickData.today || 0);

        Object.entries(clickData.countries || {}).forEach(([country, val]) => {
          linksMap[link.name].countries[country] =
            (linksMap[link.name].countries[country] || 0) + val;
        });
      });
    });
    return Object.values(linksMap).sort((a, b) => b.clicks - a.clicks);
  }, [activeCards, language]);

  const topCountries = useMemo(() => {
    const map = {};
    activeCards.forEach((card) => {
      const countries = card.analytics?.countries || {};
      Object.entries(countries).forEach(([c, val]) => {
        map[c] = (map[c] || 0) + val;
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [activeCards]);

  const totalLinkClicks = linkPerformance.reduce((a, b) => a + b.clicks, 0);

  // Chart math
  const chartPoints = useMemo(() => {
    if (aggregatedVisits.length === 0) return [];
    const maxVal = Math.max(...aggregatedVisits, 10);
    const minVal = Math.min(...aggregatedVisits, 0);

    return aggregatedVisits.map((value, index) => {
      const visualIndex = language === "ar" ? (aggregatedVisits.length - 1) - index : index;
      const x = 32 + (visualIndex * 436) / (aggregatedVisits.length - 1);

      let label = "";
      let fullLabel = "";
      let isTodayPoint = false;

      const today = new Date();
      if (timeframe === "today") {
        const hourLabels = {
          ar: ["12 ص", "6 ص", "12 م", "6 م", "الآن"],
          en: ["12 AM", "6 AM", "12 PM", "6 PM", "Now"],
        };
        label = hourLabels[language]?.[index] || "";
        isTodayPoint = true;
        fullLabel = index === 4
          ? (language === "ar" ? "إجمالي زيارات اليوم" : "Today's Total Visits")
          : `${label} - ${value} ${language === "ar" ? "زيارة" : "visits"}`;
      } else if (timeframe === "week") {
        const mapIndex = index === 0 ? 6 : index - 1;
        const day = today.getDay();
        const diffToSaturday = day === 6 ? 0 : day + 1;
        isTodayPoint = index === diffToSaturday;

        label = isTodayPoint
          ? (language === "ar" ? "اليوم" : "Today")
          : labels.week[language][mapIndex];
        fullLabel = isTodayPoint
          ? (language === "ar" ? "اليوم" : "Today")
          : labels.week[language][mapIndex];
      } else if (timeframe === "year") {
        const d = new Date(today);
        d.setMonth(today.getMonth() - (11 - index));
        const m = d.getMonth();
        const isThisMonth = index === 11;

        label = isThisMonth ? (language === "ar" ? "الحالي" : "Current") : labels.year[language][m];
        fullLabel = isThisMonth ? (language === "ar" ? "الشهر الحالي" : "This Month") : labels.year[language][m];
      } else if (timeframe === "month") {
        const d = new Date(today);
        d.setDate(today.getDate() - (29 - index));
        const isToday = index === 29;
        isTodayPoint = isToday;
        const dayNum = d.getDate();

        label = index % 5 === 0 || isToday ? (isToday ? (language === "ar" ? "اليوم" : "Today") : `${dayNum}`) : "";
        fullLabel = isToday
          ? (language === "ar" ? "اليوم" : "Today")
          : d.toLocaleDateString(language === "ar" ? "ar-EG-u-nu-latn" : "en-US", { month: "short", day: "numeric" });
      }

      const pointValue = isFreePlan && timeframe !== "today" ? (isTodayPoint ? todayVisitsCount : 0) : value;
      const y = 130 - ((pointValue - minVal) / (maxVal - minVal || 1)) * 90;

      return { x, y, value: pointValue, label, fullLabel, index, isTodayPoint };
    });
  }, [aggregatedVisits, timeframe, language, isFreePlan, todayVisitsCount]);

  const pathD = chartPoints.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = chartPoints[index - 1];
    const cpX = prev.x + (point.x - prev.x) / 2;
    return `${path} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  const allMessages = cards.flatMap((card) => {
    const reqs = (card.requests || []).map(r => ({ ...r, itemType: 'request', cardName: card.name }));
    const appts = (card.appointments || []).map(a => ({ ...a, itemType: 'appointment', cardName: card.name }));
    return [...reqs, ...appts];
  });

  allMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentMessages = allMessages.slice(0, 3);

  const totalDirectContacts = activeCards.reduce(
    (sum, card) =>
      sum + (card.requests?.length || 0) + (card.appointments?.length || 0),
    0,
  );

  const dynamicMetrics = isFreePlan
    ? [
        {
          id: "todayVisits",
          label: language === "ar" ? "زيارات اليوم" : "Today's Visits",
          value: todayVisitsCount.toLocaleString("en-US"),
          hint: language === "ar" ? "الزيارات المسجلة لكروتك اليوم" : "Visits recorded today",
          badge: language === "ar" ? "اليوم" : "Today",
        },
        {
          id: "todayClicks",
          label: language === "ar" ? "ضغطات اليوم" : "Today's Clicks",
          value: todayClicksCount.toLocaleString("en-US"),
          hint: language === "ar" ? "النقرات على الروابط اليوم" : "Clicks on links today",
          badge: language === "ar" ? "اليوم" : "Today",
        },
        {
          id: "directContacts",
          label: language === "ar" ? "الرسائل المباشرة" : "Direct Contacts",
          value: totalDirectContacts.toLocaleString("en-US"),
          hint: language === "ar" ? "الرسائل والحجوزات" : "Messages & bookings",
        },
      ]
    : [
        {
          id: "visits",
          label:
            timeframe === "today"
              ? (language === "ar" ? "زيارات اليوم" : "Today's Visits")
              : (timeframe === "week"
                  ? (language === "ar" ? "زيارات هذا الأسبوع" : "Weekly Visits")
                  : (timeframe === "month"
                      ? (language === "ar" ? "زيارات هذا الشهر" : "Monthly Visits")
                      : (language === "ar" ? "زيارات هذا العام" : "Yearly Visits"))),
          value: totalVisitsCount.toLocaleString("en-US"),
          hint:
            timeframe === "today"
              ? (language === "ar" ? "الزيارات المسجلة لكروتك اليوم" : "Visits recorded today")
              : (language === "ar"
                  ? `منها ${todayVisitsCount.toLocaleString("en-US")} اليوم`
                  : `${todayVisitsCount.toLocaleString("en-US")} today`),
          badge:
            language === "ar"
              ? (timeframe === "today" ? "اليوم" : timeframe === "week" ? "أسبوعي" : timeframe === "month" ? "شهري" : "سنوي")
              : (timeframe === "today" ? "Today" : timeframe === "week" ? "Weekly" : timeframe === "month" ? "Monthly" : "Yearly"),
        },
        {
          id: "linkClicks",
          label:
            timeframe === "today"
              ? (language === "ar" ? "ضغطات اليوم" : "Today's Clicks")
              : t("metrics.linkClicks"),
          value: (timeframe === "today" ? todayClicksCount : totalLinkClicks).toLocaleString("en-US"),
          hint:
            timeframe === "today"
              ? (language === "ar" ? "النقرات على الروابط اليوم" : "Clicks on links today")
              : (language === "ar"
                  ? `منها ${todayClicksCount.toLocaleString("en-US")} اليوم`
                  : `${todayClicksCount.toLocaleString("en-US")} today`),
          badge:
            language === "ar"
              ? (timeframe === "today" ? "اليوم" : timeframe === "week" ? "أسبوعي" : timeframe === "month" ? "شهري" : "سنوي")
              : (timeframe === "today" ? "Today" : timeframe === "week" ? "Weekly" : timeframe === "month" ? "Monthly" : "Yearly"),
        },
        {
          id: "directContacts",
          label: t("metrics.directContacts"),
          value: totalDirectContacts.toLocaleString("en-US"),
          hint: t("metrics.contactsHint"),
        },
      ];

  return (
    <section className="space-y-4 sm:space-y-6">
      <PendingPaymentAlert />
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {t("home")}
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            {t("homeIntro")}
          </p>
        </div>

        {isFeatureEnabled("analytics") && (
          <div ref={cardDropdownRef} className="relative w-full sm:w-auto sm:min-w-[220px]">
            <button
              type="button"
              onClick={() => setIsCardDropdownOpen(!isCardDropdownOpen)}
              className="w-full min-h-[44px] flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-md px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-800 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:border-indigo-500/40"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {selectedCardId === "all" ? (
                    <Layers className="h-4 w-4" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                </div>
                <span className="truncate">
                  {selectedCardId === "all"
                    ? (t("allCards") || (language === "ar" ? "جميع البطاقات" : "All Cards"))
                    : (selectedCard?.name || t("allCards"))}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                  isCardDropdownOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isCardDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute end-0 top-full mt-1.5 z-40 w-full sm:min-w-[240px] rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCardId("all");
                      setIsCardDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold transition-colors ${
                      selectedCardId === "all"
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Layers className="h-4 w-4 shrink-0 text-indigo-500" />
                      <span className="truncate">{t("allCards") || (language === "ar" ? "جميع البطاقات" : "All Cards")}</span>
                    </div>
                    {selectedCardId === "all" && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />

                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {cards.map((card) => {
                      const isSelected = selectedCardId === card.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => {
                            setSelectedCardId(card.id);
                            setIsCardDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold transition-colors ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                              : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate">{card.name}</span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Main Profile Link Card */}
      {currentDisplayLink && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 sm:gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-white p-4 sm:p-5 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/20 dark:to-slate-900/50 relative overflow-hidden">
          <div className="absolute top-0 end-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-indigo-500/5 blur-3xl dark:bg-indigo-500/10 pointer-events-none"></div>

          <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0 flex-1">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 shadow-inner">
              <Link2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex flex-col overflow-hidden min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] sm:text-xs font-bold text-indigo-600/80 dark:text-indigo-400/80 uppercase tracking-wider">
                  {selectedCard
                    ? (language === "ar" ? `رابط بطاقة: ${selectedCard.name}` : `Card Link: ${selectedCard.name}`)
                    : (t("yourProfileLink") || (language === "ar" ? "رابط ملفك الشخصي الأساسي" : "Your Public Link"))}
                </span>
                {selectedCard && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    {language === "ar" ? "محددة" : "Selected"}
                  </span>
                )}
              </div>
              <a
                href={currentDisplayLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                dir="ltr"
              >
                {currentDisplayLink.replace(/^https?:\/\//, "")}
              </a>
            </div>
          </div>

          {/* Action Buttons: Preview (معاينة), Copy (نسخ), Share (مشاركة) */}
          <div className="grid grid-cols-3 gap-2 w-full md:flex md:w-auto shrink-0 relative z-10">
            {/* معاينة / Preview */}
            <a
              href={currentDisplayLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200/80 bg-white/90 px-3 py-2.5 text-xs sm:text-sm font-bold text-indigo-600 shadow-xs transition-all hover:bg-indigo-50 hover:border-indigo-300 dark:border-indigo-900/50 dark:bg-slate-900/80 dark:text-indigo-300 dark:hover:bg-slate-800 active:scale-95 min-h-[42px] sm:min-h-[44px]"
              title={language === "ar" ? "معاينة البطاقة في تبويب جديد" : "Preview Card"}
            >
              <Eye className="h-4 w-4 shrink-0" />
              <span>{language === "ar" ? "معاينة" : "Preview"}</span>
            </a>

            {/* نسخ / Copy */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 active:scale-95 min-h-[42px] sm:min-h-[44px]"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Copy className="h-4 w-4 shrink-0" />
              )}
              <span>{copied ? (t("copied") || (language === "ar" ? "تم!" : "Copied!")) : (t("copy") || (language === "ar" ? "نسخ" : "Copy"))}</span>
            </button>

            {/* مشاركة / Share */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/30 dark:bg-indigo-500 dark:hover:bg-indigo-600 active:scale-95 min-h-[42px] sm:min-h-[44px]"
            >
              <Share2 className="h-4 w-4 shrink-0" />
              <span>{t("share") || (language === "ar" ? "مشاركة" : "Share")}</span>
            </button>
          </div>
        </div>
      )}

      {isFeatureEnabled("analytics") && (
        <>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            {dynamicMetrics.map((metric) => (
              <div
                key={metric.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/50"
              >
                <div className="absolute -end-4 -top-4 h-24 w-24 rounded-full bg-indigo-50 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-indigo-500/5 blur-2xl" />
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 relative z-10">
                    {metric.label || t(metric.labelKey)}
                  </p>
                  {metric.badge && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                      {metric.badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-2xl sm:text-3xl font-black text-slate-800 dark:text-white relative z-10">
                  {metric.value}
                </p>
                <p className="mt-1 text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 relative z-10">
                  {metric.hint || t(metric.hintKey)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {isFeatureEnabled("analytics") && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800/80 dark:bg-slate-900/50">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </span>
              {timeframe === "today"
                ? (language === "ar" ? "زيارات اليوم" : "Today's Visits")
                : (timeframe === "week"
                    ? (language === "ar" ? "زيارات الأسبوع" : "Weekly Visits")
                    : (timeframe === "month"
                        ? (language === "ar" ? "زيارات الشهر" : "Monthly Visits")
                        : (language === "ar" ? "زيارات السنة" : "Yearly Visits")))}
            </h2>

            <div className="flex overflow-x-auto no-scrollbar max-w-full rounded-xl border border-slate-200/80 bg-slate-50/80 p-1 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/50">
              {["today", "week", "month", "year"].map((tf) => {
                const tfLabels = {
                  ar: {
                    today: "اليوم",
                    week: "أسبوعي",
                    month: "شهري",
                    year: "سنوي",
                  },
                  en: {
                    today: "Today",
                    week: "Weekly",
                    month: "Monthly",
                    year: "Yearly",
                  },
                };
                const isLocked = isFreePlan && (tf === "week" || tf === "month" || tf === "year");
                const isActive = timeframe === tf;

                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        triggerUpgradePrompt();
                        return;
                      }
                      setTimeframe(tf);
                      setHoveredPoint(null);
                    }}
                    className={`rounded-lg px-3 sm:px-4 py-1.5 text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{tfLabels[language === "ar" ? "ar" : "en"][tf]}</span>
                    {isLocked && (
                      <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                className="pointer-events-none absolute z-20 flex flex-col items-center -translate-x-1/2 transition-all duration-75"
                style={{
                  left: `${(hoveredPoint.x / 500) * 100}%`,
                  top: `${Math.max(0, (hoveredPoint.y / 165) * 100 - 30)}%`,
                }}
              >
                <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/95 px-3 py-1.5 text-xs text-white shadow-2xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-black text-indigo-300">
                    {hoveredPoint.value}{" "}
                    <span className="font-semibold text-slate-300 text-[11px]">
                      {language === "ar" ? "زيارة" : "visits"}
                    </span>
                  </span>
                  {hoveredPoint.fullLabel && (
                    <span className="border-s border-slate-700 ps-2 text-[10px] font-bold text-slate-400">
                      {hoveredPoint.fullLabel}
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-1.5 rotate-45 bg-slate-900 dark:bg-slate-800 -mt-1 border-b border-e border-slate-700/60" />
              </div>
            )}

            <svg
              viewBox="0 0 500 165"
              className="h-56 w-full drop-shadow-sm select-none cursor-crosshair"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = ((e.clientX - rect.left) / rect.width) * 500;
                let closest = chartPoints[0];
                let minDist = Infinity;
                for (const pt of chartPoints) {
                  const dist = Math.abs(pt.x - mouseX);
                  if (dist < minDist) {
                    minDist = dist;
                    closest = pt;
                  }
                }
                if (closest && minDist < 60) {
                  setHoveredPoint(closest);
                } else {
                  setHoveredPoint(null);
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              onTouchMove={(e) => {
                if (!e.touches?.[0]) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const touchX =
                  ((e.touches[0].clientX - rect.left) / rect.width) * 500;
                let closest = chartPoints[0];
                let minDist = Infinity;
                for (const pt of chartPoints) {
                  const dist = Math.abs(pt.x - touchX);
                  if (dist < minDist) {
                    minDist = dist;
                    closest = pt;
                  }
                }
                if (closest) setHoveredPoint(closest);
              }}
              onTouchEnd={() => {
                setTimeout(() => setHoveredPoint(null), 2500);
              }}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[35, 65, 95, 125].map((y) => (
                <line
                  key={y}
                  x1="32"
                  x2="468"
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800/60"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Area Gradient */}
              <path
                d={`${pathD} L 468 145 L 32 145 Z`}
                fill="url(#chartGradient)"
              />

              {/* Main Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#6366f1"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="drop-shadow-md"
              />

              {/* Vertical Guide Line when Hovered */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  x2={hoveredPoint.x}
                  y1="25"
                  y2="145"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="opacity-70"
                />
              )}

              {/* Points */}
              {chartPoints.map((point, index) => {
                const isHovered = hoveredPoint?.index === index;
                return (
                  <g
                    key={index}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(point)}
                  >
                    {/* Wider Hit Target */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="16"
                      fill="transparent"
                    />

                    {/* Outer Glow Ring on Hover */}
                    {isHovered && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="10"
                        fill="#6366f1"
                        opacity="0.3"
                        className="animate-ping"
                      />
                    )}

                    {/* Main Dot */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isHovered ? 6 : 4}
                      fill={isHovered ? "#6366f1" : "#fff"}
                      stroke={isHovered ? "#fff" : "#6366f1"}
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="transition-all duration-200 dark:fill-slate-900"
                    />

                    {/* Label */}
                    {point.label && (
                      <text
                        x={point.x}
                        y="160"
                        textAnchor="middle"
                        className={`text-[10px] font-bold transition-colors ${isHovered
                            ? "fill-indigo-600 dark:fill-indigo-400 font-black"
                            : "fill-slate-400"
                          }`}
                      >
                        {point.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {linkPerformance.length > 0 && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800/80 dark:bg-slate-900/50">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                <MousePointerClick className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </span>
              {isFreePlan || timeframe === "today"
                ? (language === "ar" ? "ضغطات الروابط (اليوم)" : "Link Clicks (Today)")
                : t("linkClicks")}
            </h2>
            {(isFreePlan || timeframe === "today") && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                {language === "ar" ? "نقرات اليوم المسجلة" : "Today's recorded clicks"}
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {linkPerformance.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.name}
                  onClick={() => {
                    if (isFreePlan) {
                      triggerUpgradePrompt(
                        language === "ar" ? "تحليلات الروابط المتقدمة" : "Advanced Link Analytics",
                        language === "ar"
                          ? "تفاصيل النقرات على مدار الشهر والسنة وتوزيع الدول متاحة في باقة برو وما بعدها."
                          : "Detailed click analytics, history, and country distribution are available on Pro and Business plans."
                      );
                      return;
                    }
                    setSelectedLinkDetails(link);
                  }}
                  className="group flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 outline-hidden transition-all hover:-translate-y-0.5 hover:border-indigo-100 hover:bg-white hover:shadow-md hover:shadow-indigo-500/5 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800/50 dark:bg-slate-900/30 dark:hover:border-indigo-500/30 dark:hover:bg-slate-900/80"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-xs transition-colors group-hover:bg-indigo-50 dark:bg-slate-800 dark:group-hover:bg-indigo-500/10">
                      <Icon className="h-4.5 w-4.5 text-slate-600 transition-colors group-hover:text-indigo-600 dark:text-slate-300 dark:group-hover:text-indigo-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 transition-colors group-hover:text-indigo-700 dark:text-slate-200 dark:group-hover:text-indigo-300">
                      {link.name}
                    </p>
                  </div>
                  <span className="rounded-lg bg-indigo-100/70 px-2.5 py-1 text-xs font-black text-indigo-700 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:group-hover:bg-indigo-500/20 flex items-center gap-1">
                    {isFreePlan || timeframe === "today" ? (
                      <>
                        <span>{(link.todayClicks || 0).toLocaleString("en-US")}</span>
                        <span className="text-[10px] font-medium opacity-70">
                          {language === "ar" ? "اليوم" : "today"}
                        </span>
                      </>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span>{link.clicks.toLocaleString("en-US")}</span>
                        {(link.todayClicks || 0) > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            (+{link.todayClicks} {language === "ar" ? "اليوم" : "today"})
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isFeatureEnabled("analytics") && (
        <div className="relative rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800/80 dark:bg-slate-900/50 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                <MapPin className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </span>
              {t("topCountries")}
            </h2>
            {isFreePlan && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                <Lock className="w-3 h-3" />
                {language === "ar" ? "باقة برو" : "Pro Plan"}
              </span>
            )}
          </div>

          {isFreePlan ? (
            <div className="relative py-6 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 text-center">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Lock className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">
                  {language === "ar" ? "توزيع زوارك حسب الدول والمدن" : "Visitor Geolocation Breakdown"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {language === "ar"
                    ? "اكتشف من أين تأتي زيارات كارتك حول العالم بدقة مع تحليلات باقة برو."
                    : "Discover exactly which countries and cities your card visitors come from with Pro analytics."}
                </p>
                <button
                  type="button"
                  onClick={() => triggerUpgradePrompt()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "ترقية الباقة الآن" : "Upgrade to Pro"}</span>
                </button>
              </div>
            </div>
          ) : topCountries.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topCountries.map(([countryCode, visits]) => (
                <div
                  key={countryCode}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:bg-white dark:border-slate-800/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/80"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-xs text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {countryCode}
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {countryCode === "Unknown" ? t("unknown2") : countryCode}
                    </p>
                  </div>
                  <span className="rounded-lg bg-indigo-100/70 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {visits.toLocaleString("en-US")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              {language === "ar" ? "لا توجد بيانات دول مسجلة حتى الآن." : "No country data recorded yet."}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800/80 dark:bg-slate-900/50">
          <h2 className="mb-4 text-sm font-black text-slate-800 dark:text-white">
            {t("recentNotifications")}
          </h2>
          <div className="space-y-3">
            {notifications.map((item, idx) => {
              let title = item.title;
              if (!title) {
                if (item.type === "new_request") title = language === "ar" ? `رسالة جديدة من ${item.payload?.name}` : `New message from ${item.payload?.name}`;
                else if (item.type === "new_appointment") title = language === "ar" ? `حجز جديد من ${item.payload?.name}` : `New booking from ${item.payload?.name}`;
                else if (item.type === "card_updated") title = language === "ar" ? "تم تعديل بيانات الكارت بنجاح" : "Card details updated successfully";
                else if (item.type === "order_created") title = language === "ar" ? "تم تسجيل طلب جديد بنجاح" : "New order recorded successfully";
                else if (item.type === "order_cancelled") title = language === "ar" ? "تم إلغاء الطلب بنجاح" : "Order cancelled successfully";
                else if (item.type === "subscription_created") title = language === "ar" ? "تم تفعيل الاشتراك بنجاح" : "Subscription activated successfully";
                else if (item.type === "subscription_cancelled") title = language === "ar" ? "تم إلغاء الاشتراك بنجاح" : "Subscription cancelled successfully";
                else title = language === "ar" ? "إشعار جديد" : "New notification";
              }
              return (
                <div
                  key={item.id || item.payload?.id || idx}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-colors hover:bg-white dark:border-slate-800/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/80"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800/80 dark:bg-slate-900/50">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
              <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </span>
            {t("recentMessages")}
          </h2>
          <div className="space-y-3">
            {recentMessages.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition-colors hover:bg-white dark:border-slate-800/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/80"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black text-slate-800 dark:text-white">
                    {message.name}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">
                    {message.date}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {message.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedLinkDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLinkDetails(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-xs dark:bg-slate-800">
                    {selectedLinkDetails.icon && (
                      <selectedLinkDetails.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">
                      {selectedLinkDetails.name}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {selectedLinkDetails.clicks.toLocaleString("en-US")}{" "}
                      {t("linkClicks")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLinkDetails(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5">
                <h4 className="mb-4 text-xs font-bold text-slate-400 dark:text-slate-500">
                  {t("topCountries")}
                </h4>
                <div className="space-y-4">
                  {Object.entries(selectedLinkDetails.countries || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([countryCode, value]) => {
                      const country = getCountryMeta(countryCode);
                      const percentage = Math.round(
                        (value / (selectedLinkDetails.clicks || 1)) * 100,
                      );
                      return (
                        <div key={countryCode} className="group relative">
                          <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <span className="text-lg leading-none">
                                {country.code === "EG"
                                  ? "🇪🇬"
                                  : country.code === "SA"
                                    ? "🇸🇦"
                                    : country.code === "US"
                                      ? "🇺🇸"
                                      : country.code === "AE"
                                        ? "🇦🇪"
                                        : country.code === "KW"
                                          ? "🇰🇼"
                                          : country.code === "UK" ||
                                            country.code === "GB"
                                            ? "🇬🇧"
                                            : "🌍"}
                              </span>
                              <span>
                                {language === "ar"
                                  ? country.nameAr
                                  : country.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">
                                {value.toLocaleString("en-US")}
                              </span>
                              <span className="w-8 text-end text-indigo-600 dark:text-indigo-400">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/80">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && activeCardLink && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 p-4 flex items-center justify-between dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {t("share") || "Share Profile"}
                </h3>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mx-auto flex aspect-square max-w-[200px] items-center justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
                  <QRCodeSVG
                    id="home-qr-svg"
                    value={activeCardLink}
                    size={160}
                    level="H"
                    includeMargin={false}
                    className="h-full w-full"
                  />
                </div>

                <p className="mt-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t("scanQrToView") || "Scan QR code to view profile"}
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={handleCopyLink}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span>
                        {copied
                          ? t("copied") || "Copied"
                          : t("copyLink") || "Copy Link"}
                      </span>
                    </button>
                    <button
                      onClick={handleNativeShare}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/30 dark:bg-indigo-500 dark:hover:bg-indigo-600 cursor-pointer"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>{t("share") || "Share"}</span>
                    </button>
                  </div>

                  <button
                    onClick={handleDownloadQr}
                    disabled={isDownloading}
                    className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-md disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm cursor-pointer"
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>
                      {isDownloading
                        ? (t("loading") || "جاري التحميل...")
                        : (t("downloadQrHighRes") || "تحميل رمز QR")}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
