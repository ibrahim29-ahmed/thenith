/**
 * scripts/generate-sitemap.js
 * Automated build-time XML sitemap generator for Thenith.
 *
 * Scans public routes, queries public API endpoints if reachable,
 * and generates a standards-compliant sitemap.xml.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvSiteUrl() {
  const envVal = process.env.VITE_SITE_URL;
  if (envVal && !envVal.includes("localhost")) return envVal;
  try {
    const envPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/^VITE_SITE_URL\s*=\s*(.+)$/m);
      if (match) {
        const val = match[1].trim().replace(/^['"]|['"]$/g, "");
        if (!val.includes("localhost")) return val;
      }
    }
  } catch {}
  return "https://thenith.com";
}

const PRODUCTION_DOMAIN = loadEnvSiteUrl().replace(/\/+$/, "");
const OUTPUT_PUBLIC_PATH = path.resolve(__dirname, "../public/sitemap.xml");
const OUTPUT_DIST_PATH = path.resolve(__dirname, "../dist/sitemap.xml");

// Public static routes
const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/products", priority: "0.9", changefreq: "weekly" },
  { path: "/pricing", priority: "0.8", changefreq: "monthly" },
  { path: "/suggest", priority: "0.5", changefreq: "monthly" },
];

/**
 * Fetch JSON helper using native http/https
 */
function fetchJson(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === "https:" ? https : http;
      const req = client.get(url, { timeout: 3000 }, (res) => {
        if (res.statusCode !== 200) {
          return resolve(null);
        }
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

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

async function buildSitemap() {
  console.log("Generating sitemap.xml for Thenith...");

  const urls = [];

  // 1. Add core static pages
  const today = formatDate(new Date());
  for (const route of STATIC_ROUTES) {
    urls.push({
      loc: `${PRODUCTION_DOMAIN}${route.path}`,
      lastmod: today,
      changefreq: route.changefreq,
      priority: route.priority,
    });
  }

  // 2. Fetch public products from backend API if running
  const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:4000";
  try {
    const productsRes = await fetchJson(`${backendUrl}/api/products`);
    const products = productsRes?.products || (Array.isArray(productsRes) ? productsRes : []);
    if (Array.isArray(products) && products.length > 0) {
      console.log(`Discovered ${products.length} public products for sitemap.`);
      for (const prod of products) {
        const prodId = prod.id || prod._id;
        if (prodId) {
          urls.push({
            loc: `${PRODUCTION_DOMAIN}/products/${encodeURIComponent(prodId)}`,
            lastmod: formatDate(prod.updatedAt) || today,
            changefreq: "weekly",
            priority: "0.8",
          });
        }
      }
    }
  } catch (err) {
    console.warn("Could not query backend for dynamic store products:", err.message);
  }

  // 3. Optional: Read pre-configured public profiles inventory if present
  const profileInventoryFile = path.resolve(__dirname, "../public_profiles.json");
  if (fs.existsSync(profileInventoryFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(profileInventoryFile, "utf-8"));
      if (Array.isArray(data)) {
        for (const item of data) {
          const id = typeof item === "string" ? item : item.username || item.publicId;
          if (id && (!item.isPrivate && item.isActive !== false)) {
            urls.push({
              loc: `${PRODUCTION_DOMAIN}/p/${encodeURIComponent(id.toLowerCase())}`,
              lastmod: item.updatedAt ? formatDate(item.updatedAt) : today,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
        }
      }
    } catch (e) {
      console.warn("Could not parse public_profiles.json:", e.message);
    }
  }

  // 4. Construct XML
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

  // Write to public/
  fs.mkdirSync(path.dirname(OUTPUT_PUBLIC_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PUBLIC_PATH, fullXml, "utf-8");
  console.log(`✓ Wrote ${urls.length} URLs to ${OUTPUT_PUBLIC_PATH}`);

  // Write to dist/ if dist folder exists
  if (fs.existsSync(path.dirname(OUTPUT_DIST_PATH))) {
    fs.writeFileSync(OUTPUT_DIST_PATH, fullXml, "utf-8");
    console.log(`✓ Wrote ${urls.length} URLs to ${OUTPUT_DIST_PATH}`);
  }
}

buildSitemap();
