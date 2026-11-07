import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Setting from "../models/Setting.js";
import Product from "../models/Product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to Frontend public and dist folders
const FRONTEND_PUBLIC_DIR = path.resolve(__dirname, "../../../../SITE/FRONTEND/public");
const FRONTEND_DIST_DIR = path.resolve(__dirname, "../../../../SITE/FRONTEND/dist");

const DEFAULT_PAGES_SEO = {
  home: {
    name: "الصفحة الرئيسية (Home)",
    path: "/",
    priority: "1.0",
    changefreq: "daily",
    robots: "index, follow",
    ogImage: "",
    ar: {
      title: "Thenith — بروفايلك الرقمي الذكي المتكامل وهويتك الاحترافية",
      description: "أنشئ بروفايلك الرقمي الذكي المتكامل مع Thenith. صفحة شخصية موحدة تجمع كل روابطك، أعمالك، وسائل التواصل، حجز المواعيد واستقبال العملاء، مع إمكانية ربط كارت NFC ذكي اختياري لمشاركة ملفك بلمسة واحدة.",
      keywords: "بروفايل رقمي, هوية رقمية, صفحة روابط ذكية, بورتفوليو احترافي, لينك ان بايو, كارت ذكي NFC, كروت أعمال إلكترونية, Thenith",
    },
    en: {
      title: "Thenith — All-in-One Smart Digital Profile & Interactive Bio",
      description: "Create your all-in-one smart digital profile with Thenith. One unified page to showcase your links, portfolio, contacts, and calendar booking — with optional NFC smart business cards for instant sharing.",
      keywords: "smart digital profile, link in bio, digital portfolio, digital identity, NFC business card, smart business card, interactive portfolio, Thenith",
    },
  },
  products: {
    name: "متجر كروت NFC الذكية (Smart Cards Store)",
    path: "/products",
    priority: "0.9",
    changefreq: "weekly",
    robots: "index, follow",
    ogImage: "",
    ar: {
      title: "متجر كروت NFC الذكية | Thenith",
      description: "اطلب كارتك الذكي الفاخر بتقنية NFC لربطه مباشرة ببروفايلك الرقمي في Thenith. كروت معدنية وبلاستيكية فاخرة لمشاركة هويتك الرقمية بلمسة واحدة على أي هاتف.",
      keywords: "كروت ذكية, كارت NFC, بطاقات معدنية فاخرة, متجر كروت Thenith, كارت أعمال إلكتروني",
    },
    en: {
      title: "Smart NFC Cards Store | Thenith",
      description: "Order your premium NFC smart business card to connect seamlessly with your Thenith digital profile. Luxury metal and matte cards for tap-to-share networking.",
      keywords: "smart NFC cards, metal business cards, NFC store, digital business cards, Thenith store",
    },
  },
  pricing: {
    name: "الباقات والأسعار (Plans & Pricing)",
    path: "/pricing",
    priority: "0.8",
    changefreq: "monthly",
    robots: "index, follow",
    ogImage: "",
    ar: {
      title: "باقات وأسعار البروفايل الرقمي | Thenith",
      description: "اختر الباقة المناسبة لبروفايلك الرقمي في Thenith. استمتع بمميزات متقدمة لإدارة هويتك الرقمية، تحليلات الزيارات، النماذج المخصصة، وحجز المواعيد.",
      keywords: "باقات Thenith, أسعار البروفايل الرقمي, اشتراكات كروت الأعمال, خطط الأسعار",
    },
    en: {
      title: "Digital Profile Plans & Pricing | Thenith",
      description: "Choose the perfect plan for your smart digital profile on Thenith. Advanced profile customization, analytics, lead generation forms, and calendar booking.",
      keywords: "digital profile plans, pricing, digital identity subscription, Thenith plans",
    },
  },
  custom_card: {
    name: "تصميم كارت ذكي مخصص (Custom Card Designer)",
    path: "/custom-card",
    priority: "0.8",
    changefreq: "monthly",
    robots: "index, follow",
    ogImage: "",
    ar: {
      title: "تصميم كارت ذكي مخصص بشعارك | Thenith",
      description: "صمم كارتك الذكي بتقنية NFC بهويتك وشعارك وألوانك الخاصة ليرتبط مباشرة ببروفايلك الرقمي على منصة Thenith.",
      keywords: "تصميم كارت ذكي, كارت NFC مخصص, كروت أعمال مطبوعة, تخصيص كروت",
    },
    en: {
      title: "Custom Smart NFC Card Designer | Thenith",
      description: "Design your custom NFC smart business card with your branding, logo, and colors, connected directly to your Thenith digital profile.",
      keywords: "custom NFC card, custom smart card, personalized business card, Thenith designer",
    },
  },
  suggest: {
    name: "اقتراح ميزة جديدة (Suggest a Feature)",
    path: "/suggest",
    priority: "0.5",
    changefreq: "monthly",
    robots: "index, follow",
    ogImage: "",
    ar: {
      title: "اقتراح ميزة جديدة | Thenith",
      description: "شاركنا أفكارك واقتراحاتك لتطوير منصة Thenith للبروفايل الرقمي والهوية الذكية.",
      keywords: "اقتراحات Thenith, تطوير المنصة, ميزات جديدة",
    },
    en: {
      title: "Suggest a Feature | Thenith",
      description: "Share your ideas and feature requests to help improve the Thenith digital profile platform.",
      keywords: "feature request, suggest feature, feedback, Thenith ideas",
    },
  },
  login: {
    name: "تسجيل الدخول (Sign In)",
    path: "/login",
    priority: "0.3",
    changefreq: "monthly",
    robots: "noindex, follow",
    ogImage: "",
    ar: {
      title: "تسجيل الدخول | Thenith",
      description: "تسجيل الدخول إلى حسابك في منصة Thenith لإدارة بروفايلك الرقمي وكروتك وتحليلاتك.",
      keywords: "دخول Thenith, تسجيل الدخول",
    },
    en: {
      title: "Sign In | Thenith",
      description: "Sign in to your Thenith account to manage your smart digital profile, cards, and analytics.",
      keywords: "sign in, login, Thenith portal",
    },
  },
  signup: {
    name: "إنشاء بروفايل جديد (Sign Up)",
    path: "/signup",
    priority: "0.4",
    changefreq: "monthly",
    robots: "noindex, follow",
    ogImage: "",
    ar: {
      title: "إنشاء بروفايل رقمي جديد | Thenith",
      description: "انضم إلى Thenith الآن وأنشئ بروفايلك الرقمي الذكي المتكامل واجمع كل بياناتك في رابط واحد.",
      keywords: "تسجيل Thenith, حساب جديد, بروفايل جديد",
    },
    en: {
      title: "Create Your Digital Profile | Thenith",
      description: "Join Thenith now and create your all-in-one smart digital profile to share all your links effortlessly.",
      keywords: "create account, register, new digital profile, sign up Thenith",
    },
  },
  cart: {
    name: "سلة المشتريات (Shopping Cart)",
    path: "/cart",
    priority: "0.2",
    changefreq: "monthly",
    robots: "noindex, nofollow",
    ogImage: "",
    ar: {
      title: "سلة المشتريات | Thenith",
      description: "راجع كروتك الذكية ومنتجاتك المختارة وأكمل طلبك بسهولة وأمان.",
      keywords: "",
    },
    en: {
      title: "Shopping Cart | Thenith",
      description: "Review your selected smart cards and products and complete your order securely.",
      keywords: "",
    },
  },
  profile_template: {
    name: "قالب البروفايل الشخصي (Profile Template /p/:id)",
    path: "/p/:username",
    priority: "0.7",
    changefreq: "weekly",
    robots: "index, follow",
    ogImage: "",
    ar: {
      title: "البروفايل الرقمي المهني | Thenith",
      description: "استعرض الروابط المهنية، وسائل التواصل، معرض الأعمال، واحجز موعداً مباشرة عبر البروفايل الرقمي.",
      keywords: "بروفايل مهني, صفحة شخصية, بورتفوليو, كارت رقمي",
    },
    en: {
      title: "Professional Digital Profile | Thenith",
      description: "Explore professional links, social profiles, portfolio, and book appointments directly on this smart digital profile.",
      keywords: "digital profile, bio link, portfolio, online card",
    },
  },
  card_resolver: {
    name: "صفحة قراءة الكارت الذكي (Card Resolver /c/:id)",
    path: "/c/:publicId",
    priority: "0.5",
    changefreq: "monthly",
    robots: "noindex, follow",
    ogImage: "",
    ar: {
      title: "جاري فتح البروفايل الرقمي... | Thenith",
      description: "إعادة توجيه ذكية فورية إلى البروفايل الرقمي المرتبط بالكارت.",
      keywords: "",
    },
    en: {
      title: "Connecting to Digital Profile... | Thenith",
      description: "Instant smart redirect to the digital profile connected to this smart card.",
      keywords: "",
    },
  },
  not_found: {
    name: "صفحة غير موجود 404 (Not Found Page)",
    path: "/404",
    priority: "0.1",
    changefreq: "yearly",
    robots: "noindex, nofollow",
    ogImage: "",
    ar: {
      title: "الصفحة غير موجودة 404 | Thenith",
      description: "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
      keywords: "",
    },
    en: {
      title: "Page Not Found 404 | Thenith",
      description: "Sorry, the page you are looking for does not exist or has been moved.",
      keywords: "",
    },
  },
};

function parseSitemapXml(xmlContent) {
  if (!xmlContent || typeof xmlContent !== "string") return [];
  const urls = [];
  const urlRegex = /<url>([\s\S]*?)<\/url>/g;
  let match;
  while ((match = urlRegex.exec(xmlContent)) !== null) {
    const block = match[1];
    const locMatch = block.match(/<loc>([\s\S]*?)<\/loc>/);
    const lastmodMatch = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/);
    const changefreqMatch = block.match(/<changefreq>([\s\S]*?)<\/changefreq>/);
    const priorityMatch = block.match(/<priority>([\s\S]*?)<\/priority>/);

    if (locMatch) {
      urls.push({
        loc: locMatch[1].trim(),
        lastmod: lastmodMatch ? lastmodMatch[1].trim() : "",
        changefreq: changefreqMatch ? changefreqMatch[1].trim() : "weekly",
        priority: priorityMatch ? priorityMatch[1].trim() : "0.8",
      });
    }
  }
  return urls;
}

function sanitizeEnglishBrandInObj(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const result = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") {
      result[k] = v.replace(/ذينيث|ثينيث|ثيتيث/g, "Thenith");
    } else if (typeof v === "object" && v !== null) {
      result[k] = sanitizeEnglishBrandInObj(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

export const getSeoSitemapData = async (req, res, next) => {
  try {
    const settings = await Setting.find({
      key: {
        $in: [
          "seo_pages",
          "seo_verification",
          "sitemap_config",
          "robots_txt",
          "site_name",
        ],
      },
    }).lean();

    const settingsMap = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    // Merge default pages with stored settings (ensuring brand name is always English Thenith)
    const storedPages = sanitizeEnglishBrandInObj(settingsMap.seo_pages || {});
    const mergedPages = {};

    Object.keys(DEFAULT_PAGES_SEO).forEach((key) => {
      const def = DEFAULT_PAGES_SEO[key];
      const custom = storedPages[key] || {};
      mergedPages[key] = {
        ...def,
        ...custom,
        ar: {
          ...def.ar,
          ...(custom.ar || {}),
        },
        en: {
          ...def.en,
          ...(custom.en || {}),
        },
      };
    });

    // Include any custom user-added pages
    Object.keys(storedPages).forEach((key) => {
      if (!mergedPages[key]) {
        mergedPages[key] = storedPages[key];
      }
    });

    const verification = settingsMap.seo_verification || {
      googleSiteVerification: "",
      googleAnalyticsId: "",
    };

    const sitemapConfig = settingsMap.sitemap_config || {
      includeProducts: true,
      includeProfiles: true,
      customUrls: [],
      lastGenerated: null,
    };

    // Read robots.txt
    let robotsTxt = settingsMap.robots_txt;
    const robotsPath = path.join(FRONTEND_PUBLIC_DIR, "robots.txt");
    if (!robotsTxt && fs.existsSync(robotsPath)) {
      try {
        robotsTxt = fs.readFileSync(robotsPath, "utf-8");
      } catch {}
    }

    // Read sitemap.xml
    let sitemapUrls = [];
    let sitemapXmlRaw = "";
    const sitemapPath = path.join(FRONTEND_PUBLIC_DIR, "sitemap.xml");
    if (fs.existsSync(sitemapPath)) {
      try {
        sitemapXmlRaw = fs.readFileSync(sitemapPath, "utf-8");
        sitemapUrls = parseSitemapXml(sitemapXmlRaw);
      } catch {}
    }

    res.json({
      success: true,
      pagesSeo: mergedPages,
      verification,
      sitemapConfig,
      sitemapUrls,
      sitemapXmlRaw,
      robotsTxt: robotsTxt || "",
      siteName: settingsMap.site_name || "Thenith",
    });
  } catch (error) {
    next(error);
  }
};

export const updateSeoSitemapData = async (req, res, next) => {
  try {
    const { pagesSeo, verification, sitemapConfig, robotsTxt } = req.body;

    const updates = [];

    if (pagesSeo !== undefined) {
      const cleanPagesSeo = sanitizeEnglishBrandInObj(pagesSeo);
      updates.push(
        Setting.findOneAndUpdate(
          { key: "seo_pages" },
          { value: cleanPagesSeo },
          { upsert: true, new: true }
        )
      );
    }

    if (verification !== undefined) {
      updates.push(
        Setting.findOneAndUpdate(
          { key: "seo_verification" },
          { value: verification },
          { upsert: true, new: true }
        )
      );
    }

    if (sitemapConfig !== undefined) {
      updates.push(
        Setting.findOneAndUpdate(
          { key: "sitemap_config" },
          { value: sitemapConfig },
          { upsert: true, new: true }
        )
      );
    }

    if (robotsTxt !== undefined) {
      updates.push(
        Setting.findOneAndUpdate(
          { key: "robots_txt" },
          { value: robotsTxt },
          { upsert: true, new: true }
        )
      );

      // Write directly to public/robots.txt and dist/robots.txt
      try {
        if (!fs.existsSync(FRONTEND_PUBLIC_DIR)) {
          fs.mkdirSync(FRONTEND_PUBLIC_DIR, { recursive: true });
        }
        fs.writeFileSync(path.join(FRONTEND_PUBLIC_DIR, "robots.txt"), robotsTxt, "utf-8");

        if (fs.existsSync(FRONTEND_DIST_DIR)) {
          fs.writeFileSync(path.join(FRONTEND_DIST_DIR, "robots.txt"), robotsTxt, "utf-8");
        }
      } catch (err) {
        console.warn("Could not write robots.txt to disk:", err.message);
      }
    }

    await Promise.all(updates);

    res.json({
      success: true,
      message: "تم حفظ إعدادات السيو والـ Meta Tags والسايت ماب بنجاح",
    });
  } catch (error) {
    next(error);
  }
};

export const regenerateSitemap = async (req, res, next) => {
  try {
    const siteUrlSetting = await Setting.findOne({ key: "site_url" }).lean();
    const siteDomain = (siteUrlSetting?.value || process.env.VITE_SITE_URL || "https://thenith.com").replace(/\/+$/, "");

    const sitemapConfigSetting = await Setting.findOne({ key: "sitemap_config" }).lean();
    const sitemapConfig = sitemapConfigSetting?.value || {
      includeProducts: true,
      customUrls: [],
    };

    const today = new Date().toISOString().split("T")[0];
    const urls = [];

    // 1. Core static pages
    const staticRoutes = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/products", priority: "0.9", changefreq: "weekly" },
      { path: "/pricing", priority: "0.8", changefreq: "monthly" },
      { path: "/custom-card", priority: "0.8", changefreq: "monthly" },
      { path: "/suggest", priority: "0.5", changefreq: "monthly" },
    ];

    for (const r of staticRoutes) {
      urls.push({
        loc: `${siteDomain}${r.path}`,
        lastmod: today,
        changefreq: r.changefreq,
        priority: r.priority,
      });
    }

    // 2. Add products if enabled
    if (sitemapConfig.includeProducts !== false) {
      try {
        const products = await Product.find({
          isDeleted: { $ne: true },
          isActive: { $ne: false },
        }).lean();

        for (const prod of products) {
          urls.push({
            loc: `${siteDomain}/products/${prod._id}`,
            lastmod: prod.updatedAt ? new Date(prod.updatedAt).toISOString().split("T")[0] : today,
            changefreq: "weekly",
            priority: "0.8",
          });
        }
      } catch (err) {
        console.warn("Could not fetch products for sitemap:", err.message);
      }
    }

    // 3. Add Custom URLs
    if (Array.isArray(sitemapConfig.customUrls)) {
      for (const custom of sitemapConfig.customUrls) {
        if (custom.path) {
          const cleanPath = custom.path.startsWith("/") ? custom.path : `/${custom.path}`;
          urls.push({
            loc: `${siteDomain}${cleanPath}`,
            lastmod: custom.lastmod || today,
            changefreq: custom.changefreq || "weekly",
            priority: custom.priority || "0.7",
          });
        }
      }
    }

    // 4. Build XML
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">`;

    const xmlEntries = urls
      .map(
        (entry) => `  <url>
    <loc>${entry.loc}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ""}${entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : ""}${entry.priority ? `\n    <priority>${entry.priority}</priority>` : ""}
  </url>`
      )
      .join("\n");

    const xmlFooter = `\n</urlset>\n`;
    const fullXml = `${xmlHeader}\n${xmlEntries}${xmlFooter}`;

    // Write to disk
    if (!fs.existsSync(FRONTEND_PUBLIC_DIR)) {
      fs.mkdirSync(FRONTEND_PUBLIC_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(FRONTEND_PUBLIC_DIR, "sitemap.xml"), fullXml, "utf-8");

    if (fs.existsSync(FRONTEND_DIST_DIR)) {
      fs.writeFileSync(path.join(FRONTEND_DIST_DIR, "sitemap.xml"), fullXml, "utf-8");
    }

    // Save timestamp
    await Setting.findOneAndUpdate(
      { key: "sitemap_config" },
      {
        value: {
          ...sitemapConfig,
          lastGenerated: new Date().toISOString(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `تم توليد خريطة الموقع بنجاح (${urls.length} رابط)`,
      urlCount: urls.length,
      urls,
      lastGenerated: new Date().toISOString(),
      xml: fullXml,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getSeoSitemapData,
  updateSeoSitemapData,
  regenerateSitemap,
};
