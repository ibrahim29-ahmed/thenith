import { createContext, useContext, useEffect, useMemo, useState } from "react";
import io from "socket.io-client";
import { fetchProfile } from "../services/profileApi.js";
import { normalizePortfolio } from "../utils/normalizePortfolio.js";
import { applyProfileSeo, getNotFoundSeoData, applyPageSeo } from "../../utils/seo.js";
import { getLocalizedErrorMessage } from "../../utils/errorHandling.js";
import { useLanguage } from "./LanguageContext.jsx";
import { API_BASE_URL } from "../../config/runtime.js";

const STORAGE_KEY = "thenith_portfolio_data";
const PortfolioContext = createContext(undefined);

export const PortfolioProvider = ({ children, mockProfile }) => {
  const [profile, setProfile] = useState(mockProfile ? normalizePortfolio(mockProfile) : null);
  const [status, setStatus] = useState(mockProfile ? "success" : "idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (mockProfile) {
      setProfile(normalizePortfolio(mockProfile));
      setStatus("success");
      return;
    }

    let isMounted = true;
    setStatus("loading");

    const parts = window.location.pathname.split("/").filter(Boolean);
    const prefix = parts[0]?.toLowerCase();
    const publicId =
      prefix === "p" || prefix === "m" ? parts[1] || "" : parts[0] || "";

    const cacheKey = publicId
      ? `${STORAGE_KEY}_${publicId.toLowerCase()}`
      : STORAGE_KEY;
    let saved = null;
    try {
      saved = localStorage.getItem(cacheKey);
    } catch {
      // Storage restricted
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const matchesIdentifier =
          !publicId ||
          parsed?.id === publicId ||
          parsed?.publicId === publicId ||
          parsed?.userPublicId === publicId ||
          parsed?.username?.toLowerCase() === publicId.toLowerCase();

        if (matchesIdentifier) {
          setProfile(normalizePortfolio(parsed));
        }
      } catch (parseError) {
        console.error(
          "Error loading portfolio data from localStorage",
          parseError,
        );
      }
    }

    const loadFreshProfile = (force = false) => {
      fetchProfile(publicId, { force })
        .then((nextProfile) => {
          if (!isMounted) return;

          setProfile(nextProfile);
          setStatus("success");
          setError("");

          try {
            localStorage.setItem(cacheKey, JSON.stringify(nextProfile));
          } catch {
            // Ignore quota errors
          }

          const profileUrl = nextProfile?.profileUrl || `/${publicId}`;
          let canonicalPath = `/${publicId}`;

          try {
            const parsedUrl = new URL(profileUrl, window.location.origin);
            canonicalPath =
              parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;

            if (
              parts[0]?.toLowerCase() === "p" &&
              !canonicalPath.toLowerCase().startsWith("/p/")
            ) {
              canonicalPath = `/p${canonicalPath}`;
            }
          } catch (urlError) {
            canonicalPath =
              parts[0]?.toLowerCase() === "p" ? `/p/${publicId}` : `/${publicId}`;
          }

          const preferredId = nextProfile?.username || publicId;
          canonicalPath =
            parts[0]?.toLowerCase() === "p"
              ? `/p/${preferredId}`
              : `/${preferredId}`;

          if (
            canonicalPath &&
            canonicalPath !==
              window.location.pathname +
                window.location.search +
                window.location.hash
          ) {
            window.history.replaceState(null, "", canonicalPath);
          }
        })
        .catch((requestError) => {
          if (!isMounted) return;

          if (requestError.response && requestError.response.status === 404) {
            setStatus("not-found");
          } else {
            setStatus("error");
            setError(getLocalizedErrorMessage(requestError));
          }
        });
    };

    // Initial fetch
    loadFreshProfile(false);

    // 1. Socket.IO real-time listener for remote / multi-device updates
    let socket = null;
    try {
      const socketUrl =
        API_BASE_URL === "/api"
          ? undefined
          : API_BASE_URL.replace(/\/api\/?$/, "");

      socket = io(socketUrl, {
        path: "/socket.io",
        withCredentials: true,
        autoConnect: true,
      });

      socket.on("connect", () => {
        if (publicId) {
          socket.emit("joinProfileRoom", { identifier: publicId });
        }
      });

      socket.on("profile_updated", () => {
        loadFreshProfile(true);
      });
    } catch (e) {
      // Socket fallback
    }

    // 2. BroadcastChannel for instant same-browser cross-tab live updates
    let channel = null;
    try {
      channel = new BroadcastChannel("thenith_profile_sync");
      channel.onmessage = (event) => {
        if (event.data?.type === "PROFILE_UPDATED") {
          loadFreshProfile(true);
        }
      };
    } catch (e) {}

    // 3. Storage event fallback for cross-tab sync
    const handleStorage = (e) => {
      if (e.key === "thenith_profile_sync_ts") {
        loadFreshProfile(true);
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Tab focus sync
    const handleFocus = () => {
      loadFreshProfile(true);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      if (socket) socket.disconnect();
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [mockProfile]);

  const langCtx = (() => {
    try {
      return useLanguage();
    } catch {
      return { language: "ar" };
    }
  })();
  const language = langCtx?.language || "ar";

  useEffect(() => {
    if (status === "not-found") {
      applyPageSeo(getNotFoundSeoData(language, "profile"));
    } else if (status === "error") {
      applyPageSeo({
        title: language === "en" ? "Profile Unavailable | Thenith" : "البروفايل غير متاح | Thenith",
        description: language === "en" ? "This profile is currently unavailable." : "البروفايل غير متاح حالياً.",
        robots: "noindex, nofollow",
        lang: language,
      });
    } else if (status === "success" && profile) {
      applyProfileSeo(profile, { language });
    }
  }, [profile, status, language]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === "PREVIEW_UPDATE" && event.data?.profile) {
        setProfile(normalizePortfolio(event.data.profile));
        setStatus("success");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      isLoading: status === "loading",
      isError: status === "error",
      isNotFound: status === "not-found",
      error,
    }),
    [error, profile, status],
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);

  if (!context) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }

  return context;
};
