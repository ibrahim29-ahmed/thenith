import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Edit2,
  Plus,
  Trash2,
  Share2,
  X,
  Copy,
  CheckCircle2,
  QrCode,
  Link2,
  BadgeCheck,
  Download,
  Loader2,
  SmartphoneNfc,
  Layers,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { useConfirm } from "../../context/ConfirmContext";
import { downloadQrCode1080 } from "../../../utils/qrDownload.js";
import { useGlobalLanguage } from "../../../context/GlobalLanguageContext.jsx";
import PhysicalSmartCardsSection from "./PhysicalSmartCardsSection.jsx";
import PaymentMethodsSection from "./PaymentMethodsSection.jsx";

export default function CardsPage({
  t,
  cards,
  activeCardId,
  activeCardLink,
  ownerUsername,
  ownerPublicId,
  maxCards,
  entitlements,
  onSelectCard,
  onEditCard,
  onAddCard,
  onDeleteCard,
  isSwitchingCard,
  onUpgrade,
  ownerPaymentMethods,
  ownerActivePaymentMethodId,
}) {
  const { confirm } = useConfirm();
  const { language } = useGlobalLanguage();
  const [shareCardId, setShareCardId] = useState(null);
  const [copied, setCopied] = useState(false);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search || window.location.search);
  const subParam = searchParams.get("sub");
  const initialSub =
    subParam === "physical"
      ? "physical"
      : subParam === "payment"
        ? "payment"
        : "digital";
  const [cardsView, setCardsView] = useState(initialSub);

  useEffect(() => {
    const sp = new URLSearchParams(location.search || window.location.search);
    const sub = sp.get("sub");
    if (sub === "physical") {
      setCardsView("physical");
    } else if (sub === "payment") {
      setCardsView("payment");
    } else if (!sub) {
      setCardsView("digital");
    }
  }, [location.search]);

  const handleTabChange = (view) => {
    setCardsView(view);
    try {
      const url = new URL(window.location.href);
      if (view === "physical") {
        url.searchParams.set("sub", "physical");
      } else if (view === "payment") {
        url.searchParams.set("sub", "payment");
      } else {
        url.searchParams.delete("sub");
      }
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore URL state error
    }
  };

  const isPro = entitlements?.plan === "pro";

  const showUpgradeMessage = () => {
    import("sweetalert2").then((Swal) => {
      Swal.default.fire({
        title: isPro ? t("limitReachedTitle") : t("proFeatureOnly"),
        text: isPro ? t("limitReachedText") : undefined,
        icon: "warning",
        showCancelButton: !isPro,
        confirmButtonText: isPro
          ? (language === "ar" ? "حسناً" : "OK")
          : (language === "ar" ? "تصفح الباقات" : "View Plans"),
        cancelButtonText: language === "ar" ? "إلغاء" : "Cancel",
        confirmButtonColor: "#4f46e5",
      }).then((result) => {
        if (!isPro && result.isConfirmed && onUpgrade) {
          onUpgrade();
        }
      });
    });
  };

  // Build per-card public link dynamically based on current URL
  const getCardLink = (card) => {
    const rawUrl =
      card.id === activeCardId && activeCardLink
        ? activeCardLink
        : card.publicUrl || "";

    if (!rawUrl) return "";

    // Extract the username/id part
    const path = rawUrl.split("/").filter(Boolean).pop();
    const currentOrigin =
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
      window.location.origin;

    // Always use the /p/ prefix for the Profile App based on the new unified architecture
    return `${currentOrigin}/p/${path}`;
  };

  const confirmDelete = async (cardId) => {
    if (cards.length <= 1) return;
    const ok = await confirm({
      title: t("confirmDeleteCardTitle"),
      message: t("confirmDeleteCardMessage"),
      confirmText: t("delete"),
      type: "danger",
    });
    if (ok) onDeleteCard(cardId);
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = async () => {
    setIsDownloading(true);
    try {
      await downloadQrCode1080({
        svgId: "card-qr-svg",
        cardName: shareCard?.name || "Card",
        includeCenterBadge: true,
      });
    } catch (err) {
    } finally {
      setIsDownloading(false);
    }
  };

  const shareCard = cards.find((c) => c.id === shareCardId);
  const shareLink = shareCard
    ? getCardLink(shareCard, cards.indexOf(shareCard))
    : "";

  const cardLimit = maxCards;
  const canAddCard = cardLimit === null || cards.length < cardLimit;

  // hiddenCount comes from the server subscription entitlements — never computed on Frontend
  const serverHiddenCount =
    entitlements?.features?.cards?.hiddenCount ??
    (entitlements?.features?.cards?.totalStored != null
      ? Math.max(0, entitlements.features.cards.totalStored - cards.length)
      : 0);

  return (
    <section className="space-y-6 p-0 sm:p-3 md:p-0">
      {/* ── Sub-navigation: Digital Profiles vs Physical Smart Cards vs Payment Methods ── */}
      <div className="relative w-full sm:w-auto self-start">
        <div className="relative flex flex-wrap sm:flex-nowrap items-center p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs gap-1.5">
          {/* Tab 1: Digital Profiles */}
          <button
            type="button"
            onClick={() => handleTabChange("digital")}
            className={`relative z-10 flex flex-1 sm:flex-initial items-center justify-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none group ${
              cardsView === "digital"
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {cardsView === "digital" && (
              <motion.div
                layoutId="activeCardsSubTab"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                className="absolute inset-0 rounded-xl bg-white dark:bg-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] border border-slate-200/70 dark:border-slate-700/70"
              />
            )}
            <span
              className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200 ${
                cardsView === "digital"
                  ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400"
                  : "bg-slate-200/60 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              }`}
            >
              <Layers className="w-4 h-4" />
            </span>
            <span className="relative z-10 tracking-tight whitespace-nowrap">
              {language === "ar" ? "البروفايلات الرقمية" : "Digital Profiles"}
            </span>
            {Array.isArray(cards) && cards.length > 0 && (
              <span
                className={`relative z-10 px-2 py-0.5 rounded-full text-[11px] font-black transition-colors ${
                  cardsView === "digital"
                    ? "bg-indigo-100/80 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                    : "bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                {cards.length}
              </span>
            )}
          </button>

          {/* Tab 2: Payment Methods (وسائل الدفع) */}
          <button
            type="button"
            onClick={() => handleTabChange("payment")}
            className={`relative z-10 flex flex-1 sm:flex-initial items-center justify-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none group ${
              cardsView === "payment"
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {cardsView === "payment" && (
              <motion.div
                layoutId="activeCardsSubTab"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                className="absolute inset-0 rounded-xl bg-white dark:bg-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] border border-slate-200/70 dark:border-slate-700/70"
              />
            )}
            <span
              className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200 ${
                cardsView === "payment"
                  ? "bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400"
                  : "bg-slate-200/60 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              }`}
            >
              <Wallet className="w-4 h-4" />
            </span>
            <span className="relative z-10 tracking-tight whitespace-nowrap">
              {language === "ar" ? "وسائل الدفع" : "Payment Methods"}
            </span>
          </button>

          {/* Tab 3: Smart Physical Cards */}
          <button
            type="button"
            onClick={() => handleTabChange("physical")}
            className={`relative z-10 flex flex-1 sm:flex-initial items-center justify-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none group ${
              cardsView === "physical"
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {cardsView === "physical" && (
              <motion.div
                layoutId="activeCardsSubTab"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                className="absolute inset-0 rounded-xl bg-white dark:bg-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] border border-slate-200/70 dark:border-slate-700/70"
              />
            )}
            <span
              className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200 ${
                cardsView === "physical"
                  ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-200/60 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              }`}
            >
              <SmartphoneNfc className="w-4 h-4" />
            </span>
            <span className="relative z-10 tracking-tight whitespace-nowrap">
              {language === "ar" ? "كروتك الذكية" : "Smart Physical Cards"}
            </span>
            <span className="relative z-10 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              NFC
            </span>
          </button>
        </div>
      </div>

      {cardsView === "physical" ? (
        <PhysicalSmartCardsSection profiles={cards} activeCardId={activeCardId} />
      ) : cardsView === "payment" ? (
        <PaymentMethodsSection
          initialPaymentMethods={ownerPaymentMethods}
          initialActivePaymentMethodId={ownerActivePaymentMethodId}
          ownerUsername={ownerUsername}
          ownerPublicId={ownerPublicId}
          onUpgrade={onUpgrade}
        />
      ) : (
        <>
          <div className="flex flex-col justify-between gap-3 rounded-[20px] bg-white p-3 shadow-sm dark:bg-slate-950/45 sm:flex-row sm:items-center sm:rounded-[24px] sm:p-4 md:bg-transparent md:p-0 md:shadow-none">
            <div className="min-w-0">
              <h1 className="text-[clamp(1.35rem,5vw,1.5rem)] font-black">
                {t("cards")}
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {t("cardsIntro")}
              </p>
            </div>
            <button
              onClick={() => {
                if (!canAddCard) {
                  showUpgradeMessage();
                } else {
                  onAddCard();
                }
              }}
              className={`flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:w-auto ${!canAddCard
                ? "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              title={
                !canAddCard
                  ? `Maximum ${cardLimit} cards allowed on your current plan`
                  : ""
              }
            >
              <Plus className="h-4 w-4" />
              {t("addCard")}
            </button>
          </div>

          {/* Server-authoritative hidden cards banner — only shown when Backend confirms hidden > 0 */}
          {serverHiddenCount > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
              <p className="text-sm font-medium">{t("hiddenCardsProCta")}</p>
            </div>
          )}

          <div className="relative">
            <AnimatePresence>
              {isSwitchingCard && (
                <motion.div
                  initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
                  exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  className="absolute inset-[-16px] z-50 flex items-center justify-center rounded-3xl bg-white/50 dark:bg-slate-950/50"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative flex h-14 w-14 items-center justify-center">
                      <span className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20 dark:bg-indigo-400/20"></span>
                      <span className="absolute inset-2 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600 dark:border-indigo-900/50 dark:border-t-indigo-400"></span>
                      <span className="h-3 w-3 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse"></span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-4 md:grid-cols-2">
              {cards.map((card, index) => {
                const cardLink = getCardLink(card, index);
                const isActive = card.id === activeCardId;
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      if (!isActive) onSelectCard(card.id);
                    }}
                    role="button"
                    tabIndex={0}
                    className={`rounded-[20px] border bg-white p-4 text-end shadow-sm transition-all active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950/45 sm:rounded-[24px] sm:p-5 ltr:text-left ${isActive
                      ? "border-indigo-300 ring-2 ring-indigo-100 dark:border-indigo-700 dark:ring-indigo-950"
                      : "border-slate-100 dark:border-slate-900"
                      }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm font-black">
                          <span className="truncate">{card.name}</span>
                          {card.features?.verified_badge?.enabled && (
                            <BadgeCheck
                              className="h-4 w-4 text-indigo-500"
                              title="Thenith Verified"
                            />
                          )}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {card.personal.fullName || "—"}
                          {card.personal.jobTitle
                            ? ` · ${card.personal.jobTitle}`
                            : ""}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 overflow-hidden">
                          <Link2
                            className={`h-3 w-3 shrink-0 ${isActive ? "text-indigo-500" : "text-slate-300 dark:text-slate-600"}`}
                          />
                          <span
                            className={`truncate text-[11px] font-bold ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}
                          >
                            {cardLink.replace(/^https?:\/\//, "")}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <span className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white">
                          {t("selected")}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-900">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditCard(card.id);
                        }}
                        className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-900 dark:text-slate-200 sm:gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        {t("edit")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareCardId(card.id);
                        }}
                        className="flex h-9 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400"
                        title={t("shareCard") || "Share"}
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(card.id);
                        }}
                        disabled={cards.length <= 1}
                        className="flex h-9 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                        title={t("delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {!cards.length && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-400">
                {t("noItems")}
              </div>
            )}
          </div>

          {/* Share Modal */}
          <AnimatePresence>
            {shareCardId && shareCard && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
                onClick={() => setShareCardId(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">
                      {t("shareCard")}
                    </h3>
                    <button
                      onClick={() => setShareCardId(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="mb-6 flex flex-col items-center justify-center">
                      <div className="relative flex h-48 w-48 items-center justify-center rounded-2xl bg-white border-2 border-slate-100 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <QRCodeSVG
                          id="card-qr-svg"
                          value={shareLink || (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) || "http://localhost:3000"}
                          size={160}
                          level="H"
                          className="text-slate-800 dark:text-slate-100"
                          bgColor="transparent"
                          fgColor="currentColor"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="rounded-lg bg-white p-1.5 shadow dark:bg-slate-900">
                            <QrCode className="h-6 w-6 text-indigo-600" />
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 text-center text-sm font-bold text-slate-600 dark:text-slate-400">
                        {shareCard.name}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                            {shareLink}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopyLink(shareLink)}
                          className={`flex h-11 items-center justify-center gap-2 px-4 text-sm font-bold transition-colors ${copied
                            ? "bg-emerald-500 text-white"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                        >
                          {copied ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span>
                            {copied
                              ? t("linkCopied") || "Copied!"
                              : t("copyLink") || "Copy"}
                          </span>
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
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </section>
  );
}
