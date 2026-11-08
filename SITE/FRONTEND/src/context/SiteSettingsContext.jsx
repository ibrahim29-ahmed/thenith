import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/client.js";

const SiteSettingsContext = createContext({
  settings: {},
  refreshSettings: () => {},
  loading: true,
});

export const useSiteSettings = () => useContext(SiteSettingsContext);

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        if (window.__SITE_SETTINGS__) return window.__SITE_SETTINGS__;
        const cached = localStorage.getItem("thenith_site_settings");
        if (cached) return JSON.parse(cached);
      }
    } catch {}
    return {};
  });
  const [loading, setLoading] = useState(() => {
    try {
      if (typeof window !== "undefined" && (window.__SITE_SETTINGS__ || localStorage.getItem("thenith_site_settings"))) {
        return false;
      }
    } catch {}
    return true;
  });

  const fetchSettings = async () => {
    try {
      const { data } = await apiClient.get("/settings");
      if (data && typeof data === "object") {
        setSettings(data);
        if (typeof window !== "undefined") {
          window.__SITE_SETTINGS__ = data;
          try {
            localStorage.setItem("thenith_site_settings", JSON.stringify(data));
          } catch {}
          const name = data?.site_name || data?.site_logo_text;
          if (name) {
            window.__SITE_NAME__ = name;
            if (typeof document !== "undefined" && document.title) {
              document.title = document.title.replace(/Thenith/gi, name);
            }
          }

          // Apply Google Site Verification meta tag if configured
          const googleToken = data?.seo_verification?.googleSiteVerification;
          if (googleToken && typeof document !== "undefined") {
            let meta = document.querySelector('meta[name="google-site-verification"]');
            if (!meta) {
              meta = document.createElement("meta");
              meta.name = "google-site-verification";
              document.head.appendChild(meta);
            }
            meta.content = googleToken;
          }

          // Apply Bing Webmaster Verification if configured
          const bingToken = data?.seo_verification?.bingVerification;
          if (bingToken && typeof document !== "undefined") {
            let meta = document.querySelector('meta[name="msvalidate.01"]');
            if (!meta) {
              meta = document.createElement("meta");
              meta.name = "msvalidate.01";
              document.head.appendChild(meta);
            }
            meta.content = bingToken;
          }
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    const handleSync = () => {
      fetchSettings();
    };

    window.addEventListener("focus", handleSync);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handleSync();
    });

    const interval = setInterval(fetchSettings, 30000); // 30s background sync

    return () => {
      window.removeEventListener("focus", handleSync);
      clearInterval(interval);
    };
  }, []);

  return (
    <SiteSettingsContext.Provider
      value={{ settings, refreshSettings: fetchSettings, loading }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}
