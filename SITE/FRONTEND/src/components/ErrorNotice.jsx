import { CircleAlert } from "lucide-react";
import { getLocalizedErrorMessage } from "../utils/errorHandling.js";

export default function ErrorNotice({ error, language, className = "" }) {
  if (!error) return null;
  const message = getLocalizedErrorMessage(error, language);
  const text = typeof message === "string" ? message : (message?.message || String(message || ""));

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium leading-5 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300 ${className}`}
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
