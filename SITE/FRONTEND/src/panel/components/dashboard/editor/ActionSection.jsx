import { CalendarDays, Check, Clock, Lock, MessageSquare } from "lucide-react";
import Field from "../../ui/Field.jsx";
import MultiDatePicker from "../../ui/MultiDatePicker.jsx";

export default function ActionSection({ t, language, card, permissions, onUpdateCard, onUpgrade, isPro }) {
  const options = [
    {
      id: "form",
      title: t("form"),
      text: t("formDescription"),
      icon: MessageSquare,
    },
    {
      id: "calendar",
      title: t("calendar"),
      text: t("calendarDescription"),
      icon: CalendarDays,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          const active = card.actionType === option.id;
          return (
            <button
              key={option.id}
              onClick={() => {
                if (option.id === "calendar" && !permissions?.calendarBooking) {
                  import("sweetalert2").then((Swal) => {
                    Swal.default.fire({
                      title: isPro ? t("limitReachedTitle") : t("proFeatureOnly"),
                      text: isPro ? t("limitReachedText") : t("proFeatureText"),
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
                  return;
                }
                onUpdateCard((current) => ({
                  ...current,
                  actionType: option.id,
                }));
              }}
              className={`rounded-2xl border p-5 text-end shadow-sm transition-all ltr:text-left disabled:cursor-not-allowed disabled:opacity-55 ${active
                  ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/30 dark:ring-indigo-950"
                  : "border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-900 dark:bg-slate-950/45 dark:hover:bg-slate-900/60"
                } ${option.id === "calendar" && !permissions?.calendarBooking ? "opacity-90" : ""}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <Icon
                  className={`h-6 w-6 ${active ? "text-indigo-600" : "text-slate-400"}`}
                />
                <div className="flex items-center gap-2">
                  {option.id === "calendar" && !permissions?.calendarBooking && (
                    <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  {active && (
                    <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white">
                      Active
                    </span>
                  )}
                </div>
              </div>
              <p className="text-lg font-black">{option.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {option.text}
              </p>
            </button>
          );
        })}
      </div>

      {card.actionType === "calendar" && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
              {language === "ar" ? "إعدادات المواعيد" : "Booking Settings"}
            </h3>
          </div>

          <div className="space-y-5">
            {/* Always Available Toggle */}
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {language === "ar" ? "متاح جميع الأيام" : "Available All Days"}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={card.calendarSettings?.alwaysAvailable || false}
                  onChange={(e) =>
                    onUpdateCard((current) => ({
                      ...current,
                      calendarSettings: {
                        ...(current.calendarSettings || {}),
                        alwaysAvailable: e.target.checked,
                      },
                    }))
                  }
                />
                <div className="block h-6 w-10 rounded-full bg-slate-200 peer-checked:bg-indigo-600 dark:bg-slate-700"></div>
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:left-5"></div>
              </div>
            </label>

            {/* Days Selection (Hidden if always available) */}
            {!(card.calendarSettings?.alwaysAvailable) && (
              <div>
                <label className="mb-2 block text-[11px] font-bold text-slate-400">
                  {language === "ar" ? "حدد الأيام المتاحة" : "Select Available Dates"}
                </label>
                <MultiDatePicker
                  language={language}
                  selectedDates={card.calendarSettings?.availableDates || []}
                  onChange={(newDates) =>
                    onUpdateCard((current) => ({
                      ...current,
                      calendarSettings: {
                        ...(current.calendarSettings || {}),
                        availableDates: newDates,
                      },
                    }))
                  }
                />
              </div>
            )}

            {/* Working Hours */}
            <div className="grid grid-cols-2 gap-4">
              <Field
                type="time"
                label={language === "ar" ? "من الساعة" : "From"}
                value={card.calendarSettings?.startTime || "09:00"}
                onChange={(value) =>
                  onUpdateCard((current) => ({
                    ...current,
                    calendarSettings: {
                      ...(current.calendarSettings || {}),
                      startTime: value,
                    },
                  }))
                }
              />
              <Field
                type="time"
                label={language === "ar" ? "إلى الساعة" : "To"}
                value={card.calendarSettings?.endTime || "17:00"}
                onChange={(value) =>
                  onUpdateCard((current) => ({
                    ...current,
                    calendarSettings: {
                      ...(current.calendarSettings || {}),
                      endTime: value,
                    },
                  }))
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
