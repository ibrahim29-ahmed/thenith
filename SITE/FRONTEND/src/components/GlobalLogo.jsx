import React from "react";
import { useSiteSettings } from "../context/SiteSettingsContext.jsx";

export default function GlobalLogo({ className = "" }) {
  const { settings, loading } = useSiteSettings();
  const [imgError, setImgError] = React.useState(false);

  if (loading) {
    return <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-8 w-24 inline-block ${className}`}></div>;
  }

  const type = settings?.site_logo_type || (settings?.site_logo_url ? "image" : "text");
  const text = settings?.site_logo_text || settings?.site_name || "Thenith";
  const url = settings?.site_logo_url;

  if (type === "image" && url && !imgError) {
    return (
      <img
        src={url}
        alt={text}
        onError={() => setImgError(true)}
        className={`object-contain max-h-10 w-auto inline-block ${className}`}
      />
    );
  }

  return (
    <span className={`font-black text-xl tracking-tight text-slate-800 dark:text-white inline-block ${className}`}>
      {text}
    </span>
  );
}
