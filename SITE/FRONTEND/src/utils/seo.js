/**
 * src/utils/seo.js
 * Comprehensive Technical SEO, Canonicalization, Open Graph, Twitter Cards,
 * and JSON-LD Structured Data Engine for Thenith.
 */

const getEnvVar = (name, fallback) => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[name]) {
      return import.meta.env[name];
    }
  } catch {
    // Ignore
  }
  try {
    if (typeof process !== "undefined" && process.env && process.env[name]) {
      return process.env[name];
    }
  } catch {
    // Ignore
  }
  return fallback;
};

export const PRODUCTION_DOMAIN = getEnvVar(
  "VITE_SITE_URL",
  "https://thenith.com"
).replace(/\/+$/, "");

export const DEFAULT_SITE_NAME = "Thenith";

export function getSiteName(customName) {
  if (customName && typeof customName === "string" && customName.trim()) {
    return customName.trim();
  }
  if (typeof window !== "undefined" && window.__SITE_NAME__) {
    return window.__SITE_NAME__;
  }
  return DEFAULT_SITE_NAME;
}

export const DEFAULT_OG_IMAGE = `${PRODUCTION_DOMAIN}/icon512.png`;

/**
 * Strips HTML tags, excess spaces, and control characters safely.
 */
export function sanitizeText(text = "") {
  if (typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Truncates text cleanly at word boundaries with an optional suffix.
 */
export function truncateText(text = "", maxLength = 160) {
  const clean = sanitizeText(text);
  if (clean.length <= maxLength) return clean;
  const truncated = clean.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return `${truncated.slice(0, lastSpace)}...`;
  }
  return `${truncated}...`;
}

/**
 * Normalizes a URL to a stable canonical absolute URL.
 * - Strips trailing slashes (except root)
 * - Removes tracking query parameters (utm_*, fbclid, gclid, etc.)
 * - Enforces production domain
 */
export function normalizeCanonicalUrl(inputPathOrUrl = "/") {
  try {
    let url;
    if (/^https?:\/\//i.test(inputPathOrUrl)) {
      url = new URL(inputPathOrUrl);
    } else {
      const cleanPath = inputPathOrUrl.startsWith("/")
        ? inputPathOrUrl
        : `/${inputPathOrUrl}`;
      url = new URL(cleanPath, PRODUCTION_DOMAIN);
    }

    // Always enforce the trusted production origin
    const canonical = new URL(url.pathname, PRODUCTION_DOMAIN);

    // Remove tracking query parameters
    const searchParams = new URLSearchParams(url.search);
    const trackingPrefixes = ["utm_", "fbclid", "gclid", "msclkid", "_ga", "_gl"];
    for (const key of Array.from(searchParams.keys())) {
      if (trackingPrefixes.some((prefix) => key.toLowerCase().startsWith(prefix))) {
        searchParams.delete(key);
      }
    }

    // Normalize path: lowercase identifier if profile path
    let pathname = canonical.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    canonical.pathname = pathname;
    const remainingQuery = searchParams.toString();
    return `${canonical.origin}${canonical.pathname}${remainingQuery ? `?${remainingQuery}` : ""}`;
  } catch (err) {
    console.warn("Error normalizing canonical URL:", inputPathOrUrl, err);
    return `${PRODUCTION_DOMAIN}/`;
  }
}

/**
 * Sets or creates a meta tag in document.head.
 */
export function setMetaTag(selector, attributeName, attributeValue) {
  if (typeof document === "undefined") return null;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    const nameMatch = selector.match(/\[name="([^"]+)"\]/);
    const propertyMatch = selector.match(/\[property="([^"]+)"\]/);
    const httpEquivMatch = selector.match(/\[http-equiv="([^"]+)"\]/);

    if (nameMatch) element.setAttribute("name", nameMatch[1]);
    if (propertyMatch) element.setAttribute("property", propertyMatch[1]);
    if (httpEquivMatch) element.setAttribute("http-equiv", httpEquivMatch[1]);

    document.head.appendChild(element);
  }

  if (attributeValue !== undefined && attributeValue !== null) {
    element.setAttribute(attributeName, String(attributeValue));
  } else {
    element.remove();
  }
  return element;
}

/**
 * Sets or updates the canonical link tag.
 */
export function setCanonicalLink(href) {
  if (typeof document === "undefined") return;
  const canonicalUrl = normalizeCanonicalUrl(href);
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", canonicalUrl);
  return canonicalUrl;
}

/**
 * Injects or updates a JSON-LD structured data script.
 * Escapes < and > to prevent XSS.
 */
export function setJsonLd(id, data) {
  if (typeof document === "undefined") return;
  const scriptId = `seo-jsonld-${id}`;
  let script = document.getElementById(scriptId);

  if (!data) {
    if (script) script.remove();
    return;
  }

  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("id", scriptId);
    document.head.appendChild(script);
  }

  // Safe JSON serialization escaping HTML tags
  const jsonString = JSON.stringify(data, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");

  script.textContent = jsonString;
}

/**
 * Removes a JSON-LD script by id.
 */
export function removeJsonLd(id) {
  if (typeof document === "undefined") return;
  const script = document.getElementById(`seo-jsonld-${id}`);
  if (script) script.remove();
}

/**
 * Sets or updates multilingual hreflang alternate link tags.
 */
export function setHreflangAlternates(canonicalUrl) {
  if (typeof document === "undefined") return;
  const url = normalizeCanonicalUrl(canonicalUrl);
  const languages = [
    { lang: "ar", href: url },
    { lang: "en", href: url },
    { lang: "x-default", href: url },
  ];

  for (const { lang, href } of languages) {
    let link = document.head.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", lang);
      document.head.appendChild(link);
    }
    link.setAttribute("href", href);
  }
}

/**
 * Builds standard Schema.org BreadcrumbList structured data.
 */
export function buildBreadcrumbJsonLd(items = []) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": normalizeCanonicalUrl(item.url),
    })),
  };
}

/**
 * Sets robots directive meta tag.
 */
export function setRobots(directives = "index, follow") {
  setMetaTag('meta[name="robots"]', "content", directives);
  setMetaTag(
    'meta[name="googlebot"]',
    "content",
    directives.includes("noindex")
      ? directives
      : `${directives}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`
  );
}

/**
 * Applies a complete bundle of SEO tags to the current page.
 */
export function applyPageSeo({
  pageKey,
  title,
  description,
  keywords,
  canonicalUrl,
  robots = "index, follow",
  openGraph = {},
  twitter = {},
  jsonLd = null,
  jsonLdId = "primary",
  breadcrumbs = null,
  lang = "ar",
  dir,
}) {
  if (typeof document === "undefined") return;

  const isEn = lang === "en";
  const langKey = isEn ? "en" : "ar";

  const customPageSeo =
    pageKey && typeof window !== "undefined" && window.__SITE_SETTINGS__?.seo_pages?.[pageKey];

  const langData = customPageSeo?.[langKey];

  const targetTitle =
    langData?.title ||
    (isEn ? customPageSeo?.title_en : customPageSeo?.title_ar) ||
    customPageSeo?.title ||
    title;

  const targetDesc =
    langData?.description ||
    (isEn ? customPageSeo?.desc_en : customPageSeo?.desc_ar) ||
    customPageSeo?.description ||
    description;

  const targetKeywords =
    langData?.keywords ||
    (isEn ? customPageSeo?.keywords_en : customPageSeo?.keywords_ar) ||
    customPageSeo?.keywords ||
    keywords;

  const targetRobots = customPageSeo?.robots || robots;
  const targetOgImage = customPageSeo?.ogImage || openGraph?.image;

  // Title
  if (targetTitle) {
    const activeSiteName = getSiteName();
    let finalTitle = targetTitle;
    if (activeSiteName && activeSiteName !== "Thenith") {
      finalTitle = finalTitle.replace(/Thenith/gi, activeSiteName);
    }
    document.title = finalTitle;
  }

  // Language & direction on <html>
  if (lang) {
    document.documentElement.setAttribute("lang", lang);
  }
  if (dir) {
    document.documentElement.setAttribute("dir", dir);
  } else if (lang) {
    document.documentElement.setAttribute("dir", isEn ? "ltr" : "rtl");
  }

  // Meta description
  if (targetDesc) {
    setMetaTag('meta[name="description"]', "content", sanitizeText(targetDesc));
  }

  // Meta keywords
  if (targetKeywords) {
    setMetaTag('meta[name="keywords"]', "content", sanitizeText(targetKeywords));
  }

  // Robots
  if (targetRobots) {
    setMetaTag('meta[name="robots"]', "content", targetRobots);
  }

  // Canonical
  const fallbackPath =
    typeof window !== "undefined" ? window.location?.pathname || "/" : "/";
  const normalizedCanonical = setCanonicalLink(canonicalUrl || fallbackPath);

  // Multilingual hreflang alternates
  setHreflangAlternates(normalizedCanonical);

  // Robots
  setRobots(targetRobots || robots);

  // Open Graph
  const ogTitle = openGraph.title || targetTitle || title;
  const ogDesc = openGraph.description || targetDesc || description;
  const ogUrl = openGraph.url || normalizedCanonical;
  const ogImage = targetOgImage || openGraph.image || DEFAULT_OG_IMAGE;
  const ogType = openGraph.type || "website";
  const ogSiteName = openGraph.siteName || getSiteName();
  const ogLocale = openGraph.locale || (isEn ? "en_US" : "ar_AR");

  setMetaTag('meta[property="og:title"]', "content", ogTitle);
  setMetaTag('meta[property="og:description"]', "content", sanitizeText(ogDesc));
  setMetaTag('meta[property="og:url"]', "content", ogUrl);
  setMetaTag('meta[property="og:image"]', "content", ogImage);
  setMetaTag('meta[property="og:type"]', "content", ogType);
  setMetaTag('meta[property="og:site_name"]', "content", ogSiteName);
  setMetaTag('meta[property="og:locale"]', "content", ogLocale);

  // Twitter / X Card
  const twitterCard = twitter.card || "summary_large_image";
  const twitterTitle = twitter.title || ogTitle;
  const twitterDesc = twitter.description || ogDesc;
  const twitterImage = twitter.image || ogImage;

  setMetaTag('meta[name="twitter:card"]', "content", twitterCard);
  setMetaTag('meta[name="twitter:title"]', "content", twitterTitle);
  setMetaTag('meta[name="twitter:description"]', "content", sanitizeText(twitterDesc));
  setMetaTag('meta[name="twitter:image"]', "content", twitterImage);

  // JSON-LD Structured Data
  if (jsonLd) {
    setJsonLd(jsonLdId, jsonLd);
  } else {
    removeJsonLd(jsonLdId);
  }

  // Breadcrumbs Structured Data
  if (breadcrumbs && Array.isArray(breadcrumbs) && breadcrumbs.length > 0) {
    setJsonLd("breadcrumbs", buildBreadcrumbJsonLd(breadcrumbs));
  } else {
    removeJsonLd("breadcrumbs");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE-SPECIFIC DATA GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates SEO metadata for the Landing Page.
 */
export function getLandingPageSeoData(lang = "ar", customSiteName = "") {
  const isAr = lang === "ar";
  const defaultBrand = "Thenith";
  const currentSiteName = customSiteName?.trim() || (typeof window !== "undefined" && window.__SITE_NAME__) || defaultBrand;

  const title = isAr
    ? `${currentSiteName} — بروفايلك الرقمي الذكي المتكامل وهويتك الاحترافية`
    : `${currentSiteName} — All-in-One Smart Digital Profile & Interactive Bio`;

  const description = isAr
    ? `أنشئ بروفايلك الرقمي الذكي المتكامل مع ${currentSiteName}. صفحة شخصية موحدة تجمع كافة روابطك، أعمالك، وسائل التواصل، وحجز المواعيد واستقبال العملاء، مع إمكانية ربط كارت NFC ذكي اختياري لمشاركة هويتك بلمسة واحدة.`
    : `Build your all-in-one smart digital profile with ${currentSiteName}. Showcase all your links, portfolio, contact methods, and appointments in one place — with an optional NFC smart card to connect with a single tap.`;

  const canonicalUrl = `${PRODUCTION_DOMAIN}/`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${PRODUCTION_DOMAIN}/#website`,
        "url": `${PRODUCTION_DOMAIN}/`,
        "name": DEFAULT_SITE_NAME,
        "description": description,
        "inLanguage": ["ar", "en"],
        "publisher": {
          "@id": `${PRODUCTION_DOMAIN}/#organization`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${PRODUCTION_DOMAIN}/#organization`,
        "name": DEFAULT_SITE_NAME,
        "url": `${PRODUCTION_DOMAIN}/`,
        "logo": {
          "@type": "ImageObject",
          "url": `${PRODUCTION_DOMAIN}/icon512.png`,
          "width": 512,
          "height": 512,
        },
        "description": isAr
          ? "المنصة الرائدة في إنشاء البروفايل الرقمي الذكي المتكامل وحلول الهوية وبطاقات NFC للأفراد والشركات في الشرق الأوسط"
          : "Leading platform for all-in-one smart digital profiles and NFC business card identity in the Middle East.",
        "email": "info@thenith.com",
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer support",
          "email": "info@thenith.com",
          "availableLanguage": ["Arabic", "English"],
        },
      },
    ],
  };

  return {
    title,
    description,
    canonicalUrl,
    robots: "index, follow",
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      image: `${PRODUCTION_DOMAIN}/icon512.png`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image: `${PRODUCTION_DOMAIN}/icon512.png`,
    },
    jsonLd,
    jsonLdId: "landing",
    lang: isAr ? "ar" : "en",
    dir: isAr ? "rtl" : "ltr",
  };
}

/**
 * Builds accurate title for an individual or business profile without fabrication.
 */
export function formatProfileTitle(profile, lang = "ar") {
  const isAr = lang === "ar";
  const brand = "Thenith";
  if (!profile) return isAr ? `بروفايل رقمي ذكي | ${brand}` : `Smart Digital Profile | ${brand}`;

  if (profile.seo?.title) {
    return profile.seo.title.includes(brand)
      ? profile.seo.title
      : `${profile.seo.title} | ${brand}`;
  }

  const name = sanitizeText(profile.name || profile.personal?.fullName);
  const role = sanitizeText(profile.role || profile.personal?.jobTitle || profile.personal?.title);
  const company = sanitizeText(profile.company || profile.personal?.company);

  // Check if profile represents a business/organization
  const isBusiness =
    Boolean(profile.isBusiness) ||
    Boolean(company && (!role || company.toLowerCase() === name.toLowerCase()));

  if (isBusiness) {
    const businessName = company || name;
    const services = role || (isAr ? "خدمات وحلول رقمية" : "Digital Services & Solutions");
    return `${businessName} — ${services} | ${brand}`;
  }

  // Personal profile formatting: "Name — Role at Company | Thenith" or "Name — Role | Thenith"
  if (name && role && company) {
    const atWord = isAr ? "في" : "at";
    return `${name} — ${role} ${atWord} ${company} | ${brand}`;
  }
  if (name && role) {
    return `${name} — ${role} | ${brand}`;
  }
  if (name && company) {
    return `${name} — ${company} | ${brand}`;
  }
  if (name) {
    return `${name} | ${brand}`;
  }

  return isAr ? `بروفايل رقمي ذكي | ${brand}` : `Smart Digital Profile | ${brand}`;
}

/**
 * Builds clean, accurate description for a profile without fabrication.
 */
export function formatProfileDescription(profile, lang = "ar") {
  if (!profile) return "";

  if (profile.seo?.description) {
    return truncateText(profile.seo.description, 160);
  }

  const bio = sanitizeText(profile.bio || profile.personal?.bio);
  if (bio) {
    return truncateText(bio, 160);
  }

  const name = sanitizeText(profile.name || profile.personal?.fullName || "المستخدم");
  const role = sanitizeText(profile.role || profile.personal?.jobTitle || profile.personal?.title);

  if (lang === "en") {
    if (role) {
      return `Connect with ${name} (${role}) on Thenith smart digital profile. View verified contact details, portfolio links, and connect instantly.`;
    }
    return `Connect with ${name} on Thenith smart digital profile. View verified contact details, portfolio links, and connect instantly.`;
  }

  if (role) {
    return `تواصل مع ${name} (${role}) عبر بروفايل Thenith الرقمي الذكي. استكشف وسائل التواصل المعتمدة، الروابط المهنية، وتواصل بنقرة واحدة.`;
  }

  return `تواصل مع ${name} عبر بروفايل Thenith الرقمي الذكي. استكشف وسائل التواصل المعتمدة، الروابط المهنية، وتواصل بنقرة واحدة.`;
}

/**
 * Extracts verified external social links into schema sameAs array.
 */
export function extractProfileSameAs(profile) {
  if (!profile) return [];
  const list = [];

  const rawLinks = [
    ...(Array.isArray(profile.links) ? profile.links : []),
    ...(Array.isArray(profile.socials) ? profile.socials : []),
  ];

  for (const item of rawLinks) {
    const url = item?.url || item?.value || item?.href;
    if (url && /^https?:\/\//i.test(url)) {
      list.push(url.trim());
    }
  }

  // Also check website from contactMethods
  if (Array.isArray(profile.contactMethods)) {
    for (const method of profile.contactMethods) {
      if (method?.type === "website" && method?.href && /^https?:\/\//i.test(method.href)) {
        list.push(method.href.trim());
      }
    }
  }

  return Array.from(new Set(list));
}

/**
 * Builds JSON-LD structured data for a profile (ProfilePage + Person/Organization).
 */
export function buildProfileJsonLd(profile, canonicalUrl) {
  if (!profile) return null;

  const name = sanitizeText(profile.name || profile.personal?.fullName);
  const role = sanitizeText(profile.role || profile.personal?.jobTitle || profile.personal?.title);
  const company = sanitizeText(profile.company || profile.personal?.company);
  const bio = formatProfileDescription(profile);
  const image = profile.avatar || profile.personal?.avatar || DEFAULT_OG_IMAGE;
  const sameAs = extractProfileSameAs(profile);

  const isBusiness =
    Boolean(profile.isBusiness) ||
    Boolean(company && (!role || company.toLowerCase() === name.toLowerCase()));

  const mainEntityId = `${canonicalUrl}#${isBusiness ? "organization" : "person"}`;

  const mainEntity = isBusiness
    ? {
        "@type": "Organization",
        "@id": mainEntityId,
        "name": company || name,
        "description": bio,
        "url": canonicalUrl,
        "image": image,
        ...(sameAs.length ? { "sameAs": sameAs } : {}),
      }
    : {
        "@type": "Person",
        "@id": mainEntityId,
        "name": name,
        ...(role ? { "jobTitle": role } : {}),
        ...(company ? { "worksFor": { "@type": "Organization", "name": company } } : {}),
        "description": bio,
        "url": canonicalUrl,
        "image": image,
        ...(sameAs.length ? { "sameAs": sameAs } : {}),
      };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `${canonicalUrl}#webpage`,
        "url": canonicalUrl,
        "name": formatProfileTitle(profile),
        "description": bio,
        "isPartOf": {
          "@type": "WebSite",
          "@id": `${PRODUCTION_DOMAIN}/#website`,
          "name": DEFAULT_SITE_NAME,
          "url": `${PRODUCTION_DOMAIN}/`,
        },
        "mainEntity": {
          "@id": mainEntityId,
        },
      },
      mainEntity,
    ],
  };
}

/**
 * Generates SEO metadata for a public personal or business profile.
 */
export function getProfileSeoData(profile, options = {}) {
  const { currentUrl, language = "ar" } = options;

  // Handle nonexistent or unrendered profile
  if (!profile) {
    return getNotFoundSeoData(language, "profile");
  }

  // Handle inactive, private, or locked profiles
  if (profile.isActive === false || profile.isPrivate) {
    const brand = "Thenith";
    return {
      title: language === "en" ? "Private Profile | Thenith" : "بروفايل خاص | Thenith",
      description: language === "en" ? "This profile is private." : "هذا البروفايل خاص وغير متاح للعرض العام.",
      canonicalUrl: normalizeCanonicalUrl(
        currentUrl ||
          (typeof window !== "undefined" ? window.location?.pathname : "") ||
          "/"
      ),
      robots: "noindex, nofollow",
      openGraph: {
        title: brand,
        description: language === "en" ? "This profile is private." : "هذا البروفايل غير متاح للعرض العام.",
        type: "profile",
      },
      twitter: {
        card: "summary",
        title: brand,
      },
      jsonLd: null,
      jsonLdId: "profile",
    };
  }

  const title = formatProfileTitle(profile, language);
  const description = formatProfileDescription(profile, language);

  // Canonical identifier preference: username > publicId
  const identifier = profile.username || profile.publicId || profile.id;
  const canonicalPath = identifier ? `/p/${identifier.toLowerCase()}` : "/";
  const canonicalUrl = `${PRODUCTION_DOMAIN}${canonicalPath}`;

  const image =
    profile.seo?.image ||
    profile.coverImage ||
    profile.personal?.coverImage ||
    profile.avatar ||
    profile.personal?.avatar ||
    DEFAULT_OG_IMAGE;

  const jsonLd = buildProfileJsonLd(profile, canonicalUrl);

  return {
    title,
    description,
    canonicalUrl,
    robots: "index, follow",
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "profile",
      image,
      siteName: DEFAULT_SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image,
    },
    jsonLd,
    jsonLdId: "profile",
    breadcrumbs: [
      { name: language === "en" ? "Home" : "الرئيسية", url: "/" },
      { name: language === "en" ? "Profiles" : "البروفايلات", url: "/p" },
      { name: profile.name || identifier, url: canonicalPath },
    ],
    lang: language,
    dir: language === "en" ? "ltr" : "rtl",
  };
}

/**
 * Generates 404 Not Found SEO metadata with strict noindex directives.
 */
export function getNotFoundSeoData(language = "ar", type = "page") {
  const isProfile = type === "profile";
  const isAr = language === "ar";

  const title = isProfile
    ? isAr ? "البروفايل غير موجود | Thenith" : "Profile Not Found | Thenith"
    : isAr ? "الصفحة غير موجودة | Thenith" : "Page Not Found | Thenith";

  const description = isProfile
    ? isAr ? "البروفايل الذي تبحث عنه غير موجود أو تم نقله." : "The requested profile could not be found."
    : isAr ? "الصفحة التي تبحث عنها غير موجودة أو تم نقلها." : "The page you are looking for does not exist.";

  return {
    title,
    description,
    robots: "noindex, nofollow",
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    jsonLd: null,
    jsonLdId: "primary",
    lang: isAr ? "ar" : "en",
    dir: isAr ? "rtl" : "ltr",
  };
}

/**
 * Backwards compatibility helper for existing profile components.
 */
export function applyProfileSeo(profile, options = {}) {
  const seoData = getProfileSeoData(profile, options);
  applyPageSeo(seoData);
}

export default {
  PRODUCTION_DOMAIN,
  DEFAULT_SITE_NAME,
  DEFAULT_OG_IMAGE,
  sanitizeText,
  truncateText,
  normalizeCanonicalUrl,
  setMetaTag,
  setCanonicalLink,
  setJsonLd,
  removeJsonLd,
  setRobots,
  applyPageSeo,
  getLandingPageSeoData,
  getProfileSeoData,
  getNotFoundSeoData,
  applyProfileSeo,
};
