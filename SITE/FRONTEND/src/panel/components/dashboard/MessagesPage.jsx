import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  CalendarDays,
  Mail,
  Phone,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import EmptyState from "../ui/EmptyState.jsx";
import { getInboxItems, getInboxLabel } from "../../hooks/useDashboardData.js";
import { useConfirm } from "../../context/ConfirmContext";

export default function MessagesPage({
  t,
  language,
  cards,
  selectedCard,
  onOpenCard,
  onBack,
  onDeleteMessage,
  onMarkRead,
}) {
  const { confirm } = useConfirm();
  const [filter, setFilter] = useState("all");
  const isArabic = language === "ar";
  const inboxItems = getInboxItems(selectedCard);
  const filteredItems =
    filter === "all"
      ? inboxItems
      : filter === "message"
        ? inboxItems.filter((i) => i.type !== "appointment")
        : inboxItems.filter((i) => i.type === filter);

  const inboxLabel = selectedCard
    ? getInboxLabel(selectedCard, t)
    : t("messages");

  const markedIdsRef = useRef(new Set());

  // Reset filter when opening a different card
  useEffect(() => {
    setFilter("all");
    markedIdsRef.current.clear();
  }, [selectedCard?.id]);

  // Automatically mark all unread messages as read when viewing the inbox
  useEffect(() => {
    if (selectedCard && inboxItems.length > 0) {
      const unreadItems = inboxItems.filter(
        (item) => !item.read && !markedIdsRef.current.has(item.id),
      );
      if (unreadItems.length > 0) {
        unreadItems.forEach((item) => markedIdsRef.current.add(item.id));
        const timer = setTimeout(() => {
          unreadItems.forEach((item) => {
            onMarkRead(selectedCard.id, item.id);
          });
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedCard?.id, inboxItems, onMarkRead]);

  const translateDate = (dateString) => {
    if (!isArabic || !dateString) return dateString;
    let translated = dateString;
    const days = {
      Sunday: "الأحد",
      Monday: "الاثنين",
      Tuesday: "الثلاثاء",
      Wednesday: "الأربعاء",
      Thursday: "الخميس",
      Friday: "الجمعة",
      Saturday: "السبت",
    };
    const months = {
      Jan: "يناير",
      Feb: "فبراير",
      Mar: "مارس",
      Apr: "أبريل",
      May: "مايو",
      Jun: "يونيو",
      Jul: "يوليو",
      Aug: "أغسطس",
      Sep: "سبتمبر",
      Oct: "أكتوبر",
      Nov: "نوفمبر",
      Dec: "ديسمبر",
    };

    Object.entries(days).forEach(([en, ar]) => {
      translated = translated.replace(en, ar);
    });
    Object.entries(months).forEach(([en, ar]) => {
      translated = translated.replace(en, ar);
    });
    return translated;
  };

  const confirmDelete = async (cardId, messageId) => {
    const ok = await confirm({
      title: t("confirmDeleteMessageTitle"),
      message: t("confirmDeleteMessageText"),
      confirmText: t("delete"),
      type: "danger",
    });
    if (ok) onDeleteMessage(cardId, messageId);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950/45 sm:flex-row sm:items-center sm:rounded-2xl sm:p-5 md:bg-transparent md:p-0 md:shadow-none">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{inboxLabel}</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {selectedCard
              ? `${inboxLabel} - ${selectedCard.name}`
              : t("messagesIntro")}
          </p>
        </div>
        {selectedCard && (
          <button
            onClick={onBack}
            className="min-h-10 w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 active:scale-95 transition-all"
          >
            {t("backToMessages")}
          </button>
        )}
      </div>

      {!selectedCard ? (
        <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2">
          {cards.map((card) => {
            const cardInboxItems = getInboxItems(card);
            const cardInboxLabel = getInboxLabel(card, t);
            const Icon =
              card.actionType === "calendar" ? CalendarDays : MessageSquare;
            return (
              <button
                key={card.id}
                onClick={() => onOpenCard(card.id)}
                className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 text-end shadow-sm transition-all active:scale-[0.99] hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-900 dark:bg-slate-950/45 dark:hover:border-indigo-800 ltr:text-left"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black">{card.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {card.personal.fullName} - {card.personal.jobTitle}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/60">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-300">
                    {cardInboxLabel}
                  </span>
                  <span className="flex items-center gap-2">
                    {cardInboxItems.filter((i) => !i.read).length > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                        {cardInboxItems.filter((i) => !i.read).length}
                      </span>
                    )}
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white dark:bg-slate-100 dark:text-slate-950">
                      {cardInboxItems.length}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          {inboxItems.length > 0 &&
            inboxItems.some((i) => i.type === "appointment") &&
            inboxItems.some((i) => i.type !== "appointment") && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setFilter("all")}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all ${filter === "all" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"}`}
                >
                  {t("all") || (language === "ar" ? "الكل" : "All")}
                </button>
                <button
                  onClick={() => setFilter("message")}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all ${filter === "message" ? "bg-indigo-600 text-white dark:bg-indigo-500" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"}`}
                >
                  {t("messages") ||
                    (language === "ar" ? "الرسائل" : "Messages")}
                  <span className="ms-2 rtl:mr-2 rtl:ml-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                    {inboxItems.filter((i) => i.type !== "appointment").length}
                  </span>
                </button>
                <button
                  onClick={() => setFilter("appointment")}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all ${filter === "appointment" ? "bg-indigo-600 text-white dark:bg-indigo-500" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"}`}
                >
                  {t("appointments") ||
                    (language === "ar" ? "المواعيد" : "Appointments")}
                  <span className="ms-2 rtl:mr-2 rtl:ml-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                    {inboxItems.filter((i) => i.type === "appointment").length}
                  </span>
                </button>
              </div>
            )}

          {!filteredItems.length ? (
            <EmptyState
              icon={
                filter === "appointment" ||
                selectedCard.actionType === "calendar"
                  ? CalendarDays
                  : MessageSquare
              }
              title={t("noItems")}
              text={t("messagesIntro")}
            />
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition-all dark:bg-slate-950/45 sm:p-5 ${item.read ? "border-slate-100 dark:border-slate-900 opacity-70" : "border-indigo-100 dark:border-indigo-900 shadow-indigo-500/5"}`}
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    {item.type === "appointment" ? (
                      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex h-20 w-24 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 shadow-inner dark:bg-indigo-900/20">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {translateDate(item.date)
                              ?.split("،")[0]
                              ?.split(",")[0] || ""}
                          </span>
                          <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                            {item.date?.split(" ").pop() || "25"}
                          </span>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {!item.read && (
                              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                            )}
                            <p className="text-lg font-black">{item.name}</p>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {translateDate(item.date)} - {item.time}
                            </span>
                            {item.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {item.phone}
                              </span>
                            )}
                          </div>
                          {(item.message || item.note) && (
                            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                              {item.message || item.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {!item.read && (
                            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                          )}
                          <p className="text-sm font-black">{item.name}</p>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                          {item.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {item.phone}
                            </span>
                          )}
                          {item.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {item.email}
                            </span>
                          )}
                        </div>

                        {(item.message || item.note) && (
                          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                            {item.message || item.note}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => confirmDelete(selectedCard.id, item.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
