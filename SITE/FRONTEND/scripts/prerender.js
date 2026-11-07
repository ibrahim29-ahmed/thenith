/**
 * scripts/prerender.js
 * Pre-renders route-specific HTML files in dist/ so search engine bots
 * and social scrapers receive complete metadata on direct URL requests
 * without waiting for client-side JavaScript execution.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, "../dist");
const BASE_HTML_PATH = path.join(DIST_DIR, "index.html");
function loadEnvSiteUrl() {
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL;
  try {
    const envPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/^VITE_SITE_URL\s*=\s*(.+)$/m);
      if (match) return match[1].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {}
  return "https://thenith.com";
}

const PRODUCTION_DOMAIN = loadEnvSiteUrl().replace(/\/+$/, "");

const ROUTES = [
  {
    path: "/products",
    title: "متجر بطاقات Thenith الذكية | Smart NFC Cards Store",
    description: "استكشف واطلب بطاقات Thenith الذكية الفاخرة بتقنية NFC. بطاقات معدنية وبلاستيكية مخصصة لمشاركة هويتك الرقمية باحترافية.",
    canonical: `${PRODUCTION_DOMAIN}/products`,
  },
  {
    path: "/pricing",
    title: "باقات وأسعار اشتراكات Thenith | Plans & Pricing",
    description: "اختر الباقة المناسبة لاحتياجاتك من Thenith. استمتع بميزات البطاقات الذكية، تحليلات الزيارات، النماذج المخصصة، وحجز المواعيد.",
    canonical: `${PRODUCTION_DOMAIN}/pricing`,
  },
  {
    path: "/suggest",
    title: "اقتراح ميزة جديدة | Thenith Suggest a Feature",
    description: "شاركنا أفكارك واقتراحاتك لتطوير منصة Thenith للبطاقات الذكية والهوية الرقمية.",
    canonical: `${PRODUCTION_DOMAIN}/suggest`,
  },
];

function fetchJson(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === "https:" ? https : http;
      const req = client.get(url, { timeout: 3000 }, (res) => {
        if (res.statusCode !== 200) return resolve(null);
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      });
      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

function extractLocalizedField(field, lang = "ar") {
  if (!field) return "";
  if (typeof field === "string") {
    if (field.startsWith("{") && (field.includes("ar:") || field.includes("en:"))) {
      const match = field.match(new RegExp(`${lang}:\\s*['"]([^'"]+)['"]`));
      if (match) return match[1];
    }
    return field;
  }
  if (typeof field === "object") {
    return field[lang] || field.ar || field.en || "";
  }
  return String(field);
}

async function prerender() {
  if (!fs.existsSync(BASE_HTML_PATH)) {
    console.warn("dist/index.html does not exist. Run build first.");
    return;
  }

  const baseHtml = fs.readFileSync(BASE_HTML_PATH, "utf-8");
  console.log("Pre-rendering static route entry points for crawlers...");

  const allRoutes = [...ROUTES];

  // Fetch dynamic products from local backend if running
  const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:4000";
  try {
    const productsRes = await fetchJson(`${backendUrl}/api/products`);
    const products = productsRes?.products || (Array.isArray(productsRes) ? productsRes : []);
    if (Array.isArray(products) && products.length > 0) {
      for (const prod of products) {
        const prodId = prod.id || prod._id;
        if (prodId) {
          const prodTitle = extractLocalizedField(prod.name, "ar") || "بطاقة Thenith الذكية";
          const prodDesc = extractLocalizedField(prod.description, "ar") || "بطاقة Thenith الذكية الفاخرة بتقنية NFC وQR.";
          allRoutes.push({
            path: `/products/${prodId}`,
            title: `${prodTitle} | متجر Thenith`,
            description: prodDesc,
            canonical: `${PRODUCTION_DOMAIN}/products/${prodId}`,
            image: prod.images?.[0] || `${PRODUCTION_DOMAIN}/icon512.png`,
          });
        }
      }
    }
  } catch {
    // Backend may not be running during build
  }

  for (const route of allRoutes) {
    let html = baseHtml;

    // Replace title
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${route.title}</title>`);

    // Replace description
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${route.description}" />`
    );

    // Replace canonical
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${route.canonical}" />`
    );

    // Replace Open Graph title, description, url, image
    html = html.replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${route.title}" />`
    );
    html = html.replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${route.description}" />`
    );
    html = html.replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${route.canonical}" />`
    );
    if (route.image) {
      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:image" content="${route.image}" />`
      );
      html = html.replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:image" content="${route.image}" />`
      );
    }

    // Replace Twitter title, description
    html = html.replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${route.title}" />`
    );
    html = html.replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${route.description}" />`
    );

    const relativeRoute = route.path.replace(/^\//, "");
    const routeDir = path.join(DIST_DIR, relativeRoute);
    fs.mkdirSync(routeDir, { recursive: true });
    const targetFile = path.join(routeDir, "index.html");
    fs.writeFileSync(targetFile, html, "utf-8");
    console.log(`✓ Generated pre-rendered route: ${targetFile}`);
  }
}

prerender();
