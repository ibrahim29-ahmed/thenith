import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useLanguage } from "../../lib/LanguageContext.jsx";
import { usePortfolio } from "../../lib/PortfolioContext.jsx";
import {
  bookAppointment,
  fetchAvailability,
  fetchMyAppointments,
  cancelAppointment,
} from "../../services/appointmentApi.js";
import BookedAppointmentsList from "./BookedAppointmentsList.jsx";
import { toast } from "../../../util/toast";
import { getLocalizedErrorMessage } from "../../../utils/errorHandling.js";

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function BookingSection() {
  const { t, language } = useLanguage();
  const { profile } = usePortfolio();

  // ── Calendar state ─────────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");

  const generateTimeSlots = (start, end) => {
    const startHour = start ? parseInt(start.split(":")[0]) : 9;
    const endHour = end ? parseInt(end.split(":")[0]) : 17;
    const slots = [];
    for (let h = startHour; h <= endHour; h++) {
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      slots.push({
        label: `${String(displayH).padStart(2, "0")}:00 ${ampm}`,
        value: `${String(h).padStart(2, "0")}:00`,
      });
    }
    return slots;
  };

  const TIME_SLOTS = generateTimeSlots(
    profile?.calendarSettings?.startTime,
    profile?.calendarSettings?.endTime,
  );

  // ── Availability state ─────────────────────────────────────────────────────
  // { "YYYY-MM-DD": ["09:00", "14:00", ...] }
  const [bookedSlots, setBookedSlots] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Local Appointments State ───────────────────────────────────────────────
  const [submittedAppointments, setSubmittedAppointments] = useState([]);

  const loadMyAppointments = useCallback(async (cardId) => {
    if (!cardId || cardId === "undefined") return;
    try {
      const appts = await fetchMyAppointments(cardId);
      setSubmittedAppointments(appts);
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    loadMyAppointments(profile?.id);
  }, [profile?.id, loadMyAppointments]);

  const handleDeleteAppointment = async (id) => {
    try {
      await cancelAppointment(id);
      setSubmittedAppointments((prev) => prev.filter((a) => a.id !== id));
      // Refresh availability so the slot becomes available again
      loadAvailability(profile?.id, year, month + 1);
    } catch (error) {
      toast.error(getLocalizedErrorMessage(error, language));
    }
  };

  // ── Fetch availability whenever the displayed month changes ───────────────
  const loadAvailability = useCallback(async (cardId, year, month) => {
    if (!cardId || cardId === "undefined") return;
    setLoadingAvailability(true);
    try {
      const slots = await fetchAvailability(cardId, year, month);
      setBookedSlots(slots);
    } catch {
      // silently fail — worst case all slots appear available
    } finally {
      setLoadingAvailability(false);
    }
  }, []);

  useEffect(() => {
    loadAvailability(
      profile?.id,
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
    );
  }, [profile?.id, currentDate, loadAvailability]);

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
    setSelectedTime("");
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
    setSelectedTime("");
  };

  const handleDateSelect = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today || isDayFullyBooked(date)) return;
    setSelectedDate(date);
    setSelectedTime("");
    setErrorMsg("");
  };

  // ── Slot helpers ───────────────────────────────────────────────────────────
  const getBookedTimesForDate = (date) => {
    if (!date) return [];
    return bookedSlots[toDateKey(date)] ?? [];
  };

  const isSlotBooked = (date, slotValue) => {
    return getBookedTimesForDate(date).includes(slotValue);
  };

  const isSlotPast = (date, slotValue) => {
    if (!date) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (targetDate < today) return true;
    if (targetDate > today) return false;

    // Selected date is today: check if time has already passed
    const [h, m = 0] = String(slotValue).split(":").map(Number);
    const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    return slotTime <= now;
  };

  const isSlotUnavailable = (date, slotValue) => {
    return isSlotBooked(date, slotValue) || isSlotPast(date, slotValue);
  };

  // Is the entire day fully booked or has all its slots passed?
  const isDayFullyBooked = (date) => {
    if (!date) return false;
    const booked = getBookedTimesForDate(date);
    if (!TIME_SLOTS.length) return false;
    return TIME_SLOTS.every((slot) => booked.includes(slot.value) || isSlotPast(date, slot.value));
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
      setErrorMsg(t.validationDate || "Please select a date and time.");
      return;
    }
    if (isSlotPast(selectedDate, selectedTime)) {
      setErrorMsg(
        language === "ar"
          ? "هذا الموعد قد مضى بالفعل، يرجى اختيار موعد آخر."
          : "This time slot has already passed. Please select another time.",
      );
      return;
    }
    if (!formData.name.trim()) {
      setErrorMsg(t.validationName || "Please enter your name.");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg(t.validationPhone || "Please enter your phone number.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const cardId = profile?.id;
      if (!cardId || cardId === "undefined") {
        setErrorMsg(
          "Unable to identify profile. Please refresh and try again.",
        );
        setIsSubmitting(false);
        return;
      }
      const dateKey = toDateKey(selectedDate);
      const startTime = new Date(`${dateKey}T${selectedTime}:00`).toISOString();

      const response = await bookAppointment(cardId, {
        startTime,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
      });

      setSubmitStatus("success");
      setSelectedDate(null);
      setSelectedTime("");
      setFormData({ name: "", email: "", phone: "", message: "" });

      setTimeout(() => setSubmitStatus(null), 5000);

      // Refresh availability and appointments list
      await loadAvailability(cardId, year, month + 1);
      await loadMyAppointments(cardId);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        "An error occurred while booking. Please try again.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Localisation ───────────────────────────────────────────────────────────
  const weekDays =
    language === "ar"
      ? ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthNames =
    language === "ar"
      ? [
          "يناير",
          "فبراير",
          "مارس",
          "أبريل",
          "مايو",
          "يونيو",
          "يوليو",
          "أغسطس",
          "سبتمبر",
          "أكتوبر",
          "نوفمبر",
          "ديسمبر",
        ]
      : [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.bookingTitle || "Book an Appointment"}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t.bookingSubtitle ||
            "Choose a suitable time to book and connect with us."}
        </p>
      </div>

      <AnimatePresence>
        {submitStatus === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300 flex items-start gap-3"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">
                {t.successTitle || "Confirmed!"}
              </h4>
              <p className="text-xs opacity-90 mt-0.5">
                {t.bookingSuccess ||
                  "Your booking has been confirmed. We will contact you soon."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitStatus(null)}
              className="ms-auto p-1 text-green-600 hover:bg-green-500/20 rounded-lg"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50 shadow-sm">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            type="button"
            aria-label="Previous month"
          >
            <ChevronLeft
              className={`h-5 w-5 ${language === "ar" ? "rotate-180" : ""}`}
            />
          </button>

          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {monthNames[month]} {year}
            </h3>
            {loadingAvailability && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            type="button"
            aria-label="Next month"
          >
            <ChevronRight
              className={`h-5 w-5 ${language === "ar" ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date)
              return <div key={`empty-${index}`} className="h-10 w-full" />;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPast = date < today;
            const isSelected =
              selectedDate?.toDateString() === date.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            const fullyBooked = !isPast && isDayFullyBooked(date);

            const alwaysAvailable =
              profile?.calendarSettings?.alwaysAvailable || false;
            const availableDates =
              profile?.calendarSettings?.availableDates || [];
            const isAvailable =
              alwaysAvailable || availableDates.includes(toDateKey(date));
            const disabled = isPast || fullyBooked || !isAvailable;

            return (
              <button
                key={index}
                onClick={() => handleDateSelect(date)}
                disabled={disabled}
                type="button"
                title={
                  fullyBooked
                    ? (language === "ar" ? "لا توجد مواعيد متاحة" : "No available slots")
                    : !isAvailable && !isPast
                      ? (language === "ar" ? "غير متاح" : "Not available")
                      : undefined
                }
                className={[
                  "h-10 w-full rounded-xl flex items-center justify-center text-sm transition-all relative",
                  isPast
                    ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                    : fullyBooked || !isAvailable
                      ? "text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
                  isSelected
                    ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    : "",
                  isToday && !isSelected
                    ? "font-bold text-blue-600 dark:text-blue-400"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {date.getDate()}
                {/* Small dot for partially booked days */}
                {!isPast &&
                  !isSelected &&
                  !fullyBooked &&
                  getBookedTimesForDate(date).length > 0 && (
                    <span className="absolute bottom-1 start-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-amber-400" />
                  )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots — always visible when a date is selected */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Clock className="h-4 w-4" />
                <span>
                  {language === "ar"
                    ? `المواعيد المتاحة – ${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]}`
                    : `Available slots – ${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}`}
                </span>
              </div>

              {TIME_SLOTS.every((s) => isSlotUnavailable(selectedDate, s.value)) ? (
                <div className="py-6 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                  {language === "ar"
                    ? "لا توجد مواعيد متاحة في هذا اليوم، يرجى اختيار يوم آخر."
                    : "No available time slots for this date. Please choose another day."}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const booked = isSlotBooked(selectedDate, slot.value);
                    const past = isSlotPast(selectedDate, slot.value);
                    const unavailable = booked || past;
                    const chosen = selectedTime === slot.value;

                    return (
                      <button
                        key={slot.value}
                        type="button"
                        disabled={unavailable}
                        onClick={() => !unavailable && setSelectedTime(slot.value)}
                        className={[
                          "py-2 px-1 rounded-xl text-xs transition-all border flex flex-col items-center gap-0.5",
                          unavailable
                            ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600 opacity-60"
                            : chosen
                              ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className={unavailable ? "line-through opacity-70" : ""}>{slot.label}</span>
                        {booked ? (
                          <span className="text-[10px] font-medium text-red-400 dark:text-red-500">
                            {language === "ar" ? "محجوز" : "Booked"}
                          </span>
                        ) : past ? (
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {language === "ar" ? "غير متاح" : "Passed"}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/50 shadow-sm"
      >
        {/* Name */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.fullNameLabel || "Full Name"}
          </label>
          <div className="relative flex items-center">
            <User className="absolute start-3 h-5 w-5 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t.fullNamePlaceholder || "Enter your full name"}
              className="w-full rounded-xl border border-slate-200 bg-transparent px-10 py-2.5 text-sm outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:focus:border-white"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.emailInputLabel || "Email Address (Optional)"}
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute start-3 h-5 w-5 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t.emailInputPlaceholder || "Enter your email"}
              className="w-full rounded-xl border border-slate-200 bg-transparent px-10 py-2.5 text-sm outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:focus:border-white"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.phoneInputLabel || "Phone Number"}
          </label>
          <div className="relative flex items-center">
            <Phone className="absolute start-3 h-5 w-5 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder={t.phoneInputPlaceholder || "Enter your phone number"}
              className="w-full rounded-xl border border-slate-200 bg-transparent px-10 py-2.5 text-sm outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:focus:border-white"
              required
            />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.messageInputLabel || "Message (Optional)"}
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder={
              t.messageInputPlaceholder || "Add any details or notes here..."
            }
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:focus:border-white resize-none"
          />
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-medium text-white transition-all hover:bg-slate-800 disabled:opacity-70 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.submitting || "Submitting..."}
            </>
          ) : (
            <>
              <CalendarIcon className="h-4 w-4" />
              {t.bookBtn || "Book Now"}
            </>
          )}
        </button>
      </form>

      <BookedAppointmentsList
        appointments={submittedAppointments}
        language={language}
        labels={{
          submittedRequests: t.submittedRequests,
          liveFeed: t.liveFeed,
          deleteRequest: t.deleteRequest,
        }}
        onDeleteAppointment={handleDeleteAppointment}
      />
    </div>
  );
}
