import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Upload,
  RotateCw,
  Download,
  ShoppingCart,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  Eye,
  Type,
  Palette,
  Image as ImageIcon,
  Sliders,
  Trash2,
  Layers,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ChevronDown,
  Move,
  Plus,
  RotateCcw,
  GripHorizontal,
  Pipette,
  ArrowUp,
  ArrowDown,
  Wifi,
  AlignCenter,
  AlignLeft,
  AlignRight,
  CreditCard,
  QrCode,
} from "lucide-react";
import { useGlobalLanguage } from "../../context/GlobalLanguageContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatMoney, loadStoreProducts } from "./storeApi.js";
import api, { apiClient, publicClient } from "../../api/index.js";
import toast from "react-hot-toast";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { saveCardDraftImages, createThumbnailFromDataUrl } from "../../utils/customCardStorage.js";

// ── Photoshop HSV & Color Helpers ──────────────────────────────────────────
function hsvToRgb(h, s, v) {
  s = Math.max(0, Math.min(100, s)) / 100;
  v = Math.max(0, Math.min(100, v)) / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function hsvToHex(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  const toHex = (n) => {
    const hex = n.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex) {
  let c = (hex || "#0f172a").replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (c.length !== 6) return { h: 220, s: 70, v: 20 };
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = h / 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

function hslToHex(h, s = 100, l = 50) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const PURE_EXPLICIT_COLORS = [
  { hex: "#000000", labelAr: "أسود فاحم" },
  { hex: "#ffffff", labelAr: "أبيض ناصع" },
  { hex: "#ff0000", labelAr: "أحمر صريح" },
  { hex: "#ff6600", labelAr: "برتقالي صريح" },
  { hex: "#ffea00", labelAr: "أصفر صريح" },
  { hex: "#00cc44", labelAr: "أخضر صريح" },
  { hex: "#00d4ff", labelAr: "سماوي صريح" },
  { hex: "#0033ff", labelAr: "أزرق صريح" },
  { hex: "#001845", labelAr: "كحلي داكن" },
  { hex: "#7a00ff", labelAr: "بنفسجي صريح" },
  { hex: "#ff007f", labelAr: "فوشيا صريح" },
];

// ── Background Presets ────────────────────────────────────────────────────────
const BACKGROUND_PRESETS = [
  {
    id: "thenith_signature",
    nameAr: "ثينيث الأصلي (Signature)",
    nameEn: "Thenith Signature",
    category: "signature",
    style: {
      backgroundColor: "#02040b",
      backgroundImage:
        "radial-gradient(circle at 100% 100%, #0033ff 0%, #0022cc 24%, transparent 48%), radial-gradient(circle at 0% 100%, #0022cc 0%, transparent 42%), radial-gradient(circle at 50% 20%, #070e24 0%, #010206 100%)",
    },
    canvasFill: (ctx, w, h) => {
      ctx.fillStyle = "#02040b";
      ctx.fillRect(0, 0, w, h);

      // Deep subtle center top glow
      const gTop = ctx.createRadialGradient(w * 0.5, h * 0.25, 0, w * 0.5, h * 0.25, w * 0.65);
      gTop.addColorStop(0, "#081026");
      gTop.addColorStop(1, "#02040b");
      ctx.fillStyle = gTop;
      ctx.fillRect(0, 0, w, h);

      // Bottom-right electric royal blue glow
      const g1 = ctx.createRadialGradient(w, h, 0, w, h, w * 0.6);
      g1.addColorStop(0, "rgba(0, 51, 255, 0.98)");
      g1.addColorStop(0.35, "rgba(0, 34, 204, 0.65)");
      g1.addColorStop(0.7, "rgba(0, 20, 140, 0.2)");
      g1.addColorStop(1, "rgba(2, 4, 11, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      // Bottom-left electric blue glow
      const g2 = ctx.createRadialGradient(0, h, 0, 0, h, w * 0.5);
      g2.addColorStop(0, "rgba(0, 34, 204, 0.92)");
      g2.addColorStop(0.35, "rgba(0, 25, 160, 0.5)");
      g2.addColorStop(0.7, "rgba(0, 15, 100, 0.15)");
      g2.addColorStop(1, "rgba(2, 4, 11, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
    },
    preview: "radial-gradient(circle at 100% 100%, #0033ff 0%, #02040b 70%)",
  },
  {
    id: "matte_black",
    nameAr: "أسود مطفي فاخر",
    nameEn: "Matte Obsidian",
    category: "luxury",
    style: {
      background: "linear-gradient(135deg, #1c1d21 0%, #0d0e12 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#1c1d21");
      g.addColorStop(1, "#0d0e12");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    preview: "#15161a",
  },
  {
    id: "carbon_fiber",
    nameAr: "ألياف كربون (Carbon)",
    nameEn: "Carbon Fiber",
    category: "texture",
    style: {
      backgroundColor: "#121316",
      backgroundImage:
        "radial-gradient(#262833 15%, transparent 16%), radial-gradient(#262833 15%, transparent 16%)",
      backgroundSize: "16px 16px",
      backgroundPosition: "0 0, 8px 8px",
    },
    canvasFill: (ctx, w, h) => {
      ctx.fillStyle = "#121316";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#262833";
      for (let x = 0; x < w; x += 16) {
        for (let y = 0; y < h; y += 16) {
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + 8, y + 8, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    preview: "#262833",
  },
  {
    id: "royal_navy",
    nameAr: "كحلي ملكي",
    nameEn: "Royal Navy",
    category: "luxury",
    style: {
      background: "linear-gradient(135deg, #0f172a 0%, #020617 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#0f172a");
      g.addColorStop(1, "#020617");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    preview: "#0f172a",
  },
  {
    id: "emerald_luxury",
    nameAr: "زمردي داكن",
    nameEn: "Deep Emerald",
    category: "luxury",
    style: {
      background: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#064e3b");
      g.addColorStop(1, "#022c22");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    preview: "#064e3b",
  },
  {
    id: "burgundy_deep",
    nameAr: "عودي / خمري ملكي",
    nameEn: "Royal Burgundy",
    category: "luxury",
    style: {
      background: "linear-gradient(135deg, #4c0519 0%, #1f0209 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#4c0519");
      g.addColorStop(1, "#1f0209");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    preview: "#4c0519",
  },
  {
    id: "brushed_gold",
    nameAr: "ذهب مصقول (Gold)",
    nameEn: "Brushed Gold",
    category: "metallic",
    style: {
      background:
        "linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#BF953F");
      g.addColorStop(0.25, "#FCF6BA");
      g.addColorStop(0.5, "#B38728");
      g.addColorStop(0.75, "#FBF5B7");
      g.addColorStop(1, "#AA771C");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    preview: "#B38728",
  },
  {
    id: "liquid_silver",
    nameAr: "فضة بلاتينية (Platinum)",
    nameEn: "Liquid Platinum",
    category: "metallic",
    style: {
      background:
        "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 25%, #cccccc 50%, #ffffff 75%, #b0b0b0 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#e0e0e0");
      g.addColorStop(0.25, "#f5f5f5");
      g.addColorStop(0.5, "#cccccc");
      g.addColorStop(0.75, "#ffffff");
      g.addColorStop(1, "#b0b0b0");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    preview: "#d1d5db",
  },
  {
    id: "rose_gold",
    nameAr: "روز جولد (Rose Gold)",
    nameEn: "Rose Gold",
    category: "metallic",
    style: {
      background:
        "linear-gradient(135deg, #d47b74 0%, #fbd5cb 30%, #cb6f68 60%, #9e4641 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#d47b74");
      g.addColorStop(0.3, "#fbd5cb");
      g.addColorStop(0.6, "#cb6f68");
      g.addColorStop(1, "#9e4641");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    preview: "#d47b74",
  },
  {
    id: "thenith_aura",
    nameAr: "أورورا ثينيث (Indigo)",
    nameEn: "Thenith Aura",
    category: "gradient",
    style: {
      background: "linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #1e1b4b 100%)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#312e81");
      g.addColorStop(0.5, "#4f46e5");
      g.addColorStop(1, "#1e1b4b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    preview: "#4f46e5",
  },
  {
    id: "cyber_neon",
    nameAr: "سايبر فايبر (Neon)",
    nameEn: "Cyber Neon",
    category: "gradient",
    style: {
      background: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)",
      border: "1px solid rgba(99, 102, 241, 0.3)",
    },
    canvasFill: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#09090b");
      g.addColorStop(0.5, "#18181b");
      g.addColorStop(1, "#27272a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    preview: "#09090b",
  },
];

const ALL_BACKGROUNDS = BACKGROUND_PRESETS;

// ── Font Options (Rich Google Fonts Selection) ────────────────────────────────
const FONT_OPTIONS = [
  // الخطوط العربية العصرية
  { id: "Cairo", nameAr: "Cairo (كايرو - عصري وواضح)", nameEn: "Cairo (Modern Clean)", cssFamily: "'Cairo', sans-serif", group: "arabic_modern" },
  { id: "Tajawal", nameAr: "Tajawal (تجوّل - أنيق وسلس)", nameEn: "Tajawal (Smooth & Elegant)", cssFamily: "'Tajawal', sans-serif", group: "arabic_modern" },
  { id: "Almarai", nameAr: "Almarai (المراعي - هندسي تقني)", nameEn: "Almarai (Geometric)", cssFamily: "'Almarai', sans-serif", group: "arabic_modern" },
  { id: "Alexandria", nameAr: "Alexandria (الإسكندرية - حديث ومينيمال)", nameEn: "Alexandria (Modern Minimal)", cssFamily: "'Alexandria', sans-serif", group: "arabic_modern" },
  { id: "Noto Kufi Arabic", nameAr: "Noto Kufi (كوفي حديث رسمي)", nameEn: "Noto Kufi (Modern Kufic)", cssFamily: "'Noto Kufi Arabic', sans-serif", group: "arabic_modern" },
  { id: "Rubik", nameAr: "Rubik (روبيك - عريض وجريء)", nameEn: "Rubik (Bold Modern)", cssFamily: "'Rubik', sans-serif", group: "arabic_modern" },
  { id: "Changa", nameAr: "Changa (تشانجا - بارز وقوي)", nameEn: "Changa (Display Bold)", cssFamily: "'Changa', sans-serif", group: "arabic_modern" },

  // الخطوط الفخمة والكلاسيكية
  { id: "Amiri", nameAr: "Amiri (أميري - كلاسيكي ملكي)", nameEn: "Amiri (Royal Serif)", cssFamily: "'Amiri', serif", group: "luxury" },
  { id: "El Messiri", nameAr: "El Messiri (المسيري - فني متميز)", nameEn: "El Messiri (Artistic Serif)", cssFamily: "'El Messiri', sans-serif", group: "luxury" },
  { id: "Aref Ruqaa", nameAr: "Aref Ruqaa (عارف رقعة - عربي أصيل)", nameEn: "Aref Ruqaa (Calligraphic)", cssFamily: "'Aref Ruqaa', serif", group: "luxury" },
  { id: "Marhey", nameAr: "Marhey (مرحي - انسيابي ومودرن)", nameEn: "Marhey (Fluid Arabic)", cssFamily: "'Marhey', sans-serif", group: "luxury" },

  // الخطوط الإنجليزية والعالمية الفاخرة
  { id: "Outfit", nameAr: "Outfit (أوتفت - فاخر ونظيف)", nameEn: "Outfit (Clean Luxury)", cssFamily: "'Outfit', sans-serif", group: "english" },
  { id: "Playfair Display", nameAr: "Playfair (سيريف إيطالي فاخر)", nameEn: "Playfair (Editorial Serif)", cssFamily: "'Playfair Display', serif", group: "english" },
  { id: "Cinzel", nameAr: "Cinzel (سينزل - روماني إمبراطوري)", nameEn: "Cinzel (Imperial Roman)", cssFamily: "'Cinzel', serif", group: "english" },
  { id: "Montserrat", nameAr: "Montserrat (مونتسرات - عالمي متوازن)", nameEn: "Montserrat (Global Standard)", cssFamily: "'Montserrat', sans-serif", group: "english" },
  { id: "Poppins", nameAr: "Poppins (بوبينز - متناسق هندسي)", nameEn: "Poppins (Clean Geometric)", cssFamily: "'Poppins', sans-serif", group: "english" },
  { id: "Inter", nameAr: "Inter (إنتر - تقني تنفيذي)", nameEn: "Inter (Executive Tech)", cssFamily: "'Inter', sans-serif", group: "english" },
  { id: "Great Vibes", nameAr: "Great Vibes (توقيع يدوي فخم)", nameEn: "Great Vibes (Signature Script)", cssFamily: "'Great Vibes', cursive", group: "english" },
];

// ── Text Color Presets ───────────────────────────────────────────────────────
const TEXT_COLORS = [
  { id: "#ffffff", nameAr: "أبيض ناصع", nameEn: "Pure White", value: "#ffffff", border: "rgba(255,255,255,0.4)" },
  { id: "#d4af37", nameAr: "ذهب معدني", nameEn: "Metallic Gold", value: "#d4af37", glow: "rgba(212,175,55,0.45)" },
  { id: "#e2e8f0", nameAr: "فضة بلاتين", nameEn: "Platinum Silver", value: "#e2e8f0", glow: "rgba(226,232,240,0.35)" },
  { id: "#fbbf24", nameAr: "كهرمان دافئ", nameEn: "Amber Gold", value: "#fbbf24" },
  { id: "#38bdf8", nameAr: "أزرق ثلجي", nameEn: "Ice Blue", value: "#38bdf8", glow: "rgba(56,189,248,0.35)" },
  { id: "#a78bfa", nameAr: "بنفسجي نيون", nameEn: "Electric Violet", value: "#a78bfa" },
  { id: "#34d399", nameAr: "أخضر زمردي", nameEn: "Emerald Mint", value: "#34d399" },
  { id: "#f43f5e", nameAr: "وردي روز", nameEn: "Rose Gold", value: "#f43f5e" },
  { id: "#0f172a", nameAr: "أسود داكن", nameEn: "Obsidian Black", value: "#0f172a", border: "rgba(255,255,255,0.25)" },
];

// ── Built-in Popular Icons for Cards ─────────────────────────────────────────
const POPULAR_ICONS = [
  {
    id: "phone",
    nameAr: "هاتف",
    nameEn: "Phone",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  },
  {
    id: "whatsapp",
    nameAr: "واتساب",
    nameEn: "WhatsApp",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  },
  {
    id: "mail",
    nameAr: "بريد",
    nameEn: "Email",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  },
  {
    id: "globe",
    nameAr: "موقع",
    nameEn: "Website",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  },
  {
    id: "instagram",
    nameAr: "انستغرام",
    nameEn: "Instagram",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
  },
  {
    id: "linkedin",
    nameAr: "لينكدإن",
    nameEn: "LinkedIn",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`,
  },
  {
    id: "facebook",
    nameAr: "فيسبوك",
    nameEn: "Facebook",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
  },
  {
    id: "twitter_x",
    nameAr: "منصة X",
    nameEn: "X",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>`,
  },
  {
    id: "telegram",
    nameAr: "تيليجرام",
    nameEn: "Telegram",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4"/></svg>`,
  },
  {
    id: "tiktok",
    nameAr: "تيك توك",
    nameEn: "TikTok",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`,
  },
  {
    id: "youtube",
    nameAr: "يوتيوب",
    nameEn: "YouTube",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><polygon points="10 15 15 12 10 9 10 15"/></svg>`,
  },
  {
    id: "snapchat",
    nameAr: "سناب شات",
    nameEn: "Snapchat",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.9 17.7a3.5 3.5 0 0 0 1.9-.5c.8-.4 1.2-1.2 1.2-1.7 0-.5-.5-.9-1.2-1.1-.3-.1-.5-.3-.5-.5 0-.5.6-1 1-1.6.4-.6.7-1.3.7-2.3 0-2.8-2.3-5-5-5s-5 2.2-5 5c0 1 .3 1.7.7 2.3.4.6 1 1.1 1 1.6 0 .2-.2.4-.5.5-.7.2-1.2.6-1.2 1.1 0 .5.4 1.3 1.2 1.7a3.5 3.5 0 0 0 1.9.5c.3 0 .7-.1 1.1-.3a4.2 4.2 0 0 1 3.6 0c.4.2.8.3 1.1.3h.2z"/></svg>`,
  },
  {
    id: "github",
    nameAr: "جيت هب",
    nameEn: "GitHub",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
  },
  {
    id: "location",
    nameAr: "موقع / خريطة",
    nameEn: "Location",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
  },
  {
    id: "wifi",
    nameAr: "اتصال / NFC",
    nameEn: "NFC / Tap",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>`,
  },
  {
    id: "verified",
    nameAr: "توثيق",
    nameEn: "Verified",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>`,
  },
  {
    id: "star",
    nameAr: "نجمة",
    nameEn: "Star",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  },
  {
    id: "crown",
    nameAr: "تاج / VIP",
    nameEn: "Crown",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/></svg>`,
  },
  {
    id: "briefcase",
    nameAr: "عمل / محفظة",
    nameEn: "Work",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  },
  {
    id: "user",
    nameAr: "بروفايل / شخصي",
    nameEn: "Profile",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  },
  {
    id: "building",
    nameAr: "شركة / مكتب",
    nameEn: "Company",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`,
  },
  {
    id: "calendar",
    nameAr: "مواعيد / تقويم",
    nameEn: "Calendar",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  },
  {
    id: "creditCard",
    nameAr: "دفع / بنك",
    nameEn: "Payment",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  },
  {
    id: "shoppingBag",
    nameAr: "متجر / تسوق",
    nameEn: "Shop",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  },
  {
    id: "messageCircle",
    nameAr: "محادثة / رسائل",
    nameEn: "Chat",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`,
  },
  {
    id: "shield",
    nameAr: "حماية / أمان",
    nameEn: "Shield",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  },
  {
    id: "heart",
    nameAr: "إعجاب / قلب",
    nameEn: "Heart",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  },
  {
    id: "sparkles",
    nameAr: "تميز / لمعان",
    nameEn: "Sparkles",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
  },
  {
    id: "camera",
    nameAr: "تصوير / كاميرا",
    nameEn: "Camera",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  },
  {
    id: "music",
    nameAr: "صوت / موسيقى",
    nameEn: "Music",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  },
  {
    id: "link",
    nameAr: "رابط / لينك",
    nameEn: "Link",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  },
  {
    id: "award",
    nameAr: "وسام / إنجاز",
    nameEn: "Award",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  },
];

function svgToDataUrl(svgStr, color = "#ffffff") {
  let colored = svgStr.replace(/currentColor/g, color);
  if (!colored.includes("width=")) {
    colored = colored.replace("<svg ", '<svg width="256" height="256" ');
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(colored)}`;
}

// ── Mini Color Swatch Picker for individual text elements ────────────────────
function MiniColorSwatchPicker({ value, onChange, isArabic }) {
  const currentColor = (value || "#ffffff").toLowerCase();
  return (
    <div className="w-full grid grid-cols-10 gap-1 sm:gap-1.5 p-2 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 place-items-center overflow-hidden">
      {TEXT_COLORS.map((color) => {
        const active = currentColor === color.value.toLowerCase();
        return (
          <button
            key={color.id}
            type="button"
            onClick={() => onChange(color.value)}
            title={isArabic ? color.nameAr : color.nameEn}
            className={`w-full max-w-[28px] aspect-square rounded-full transition-all cursor-pointer flex items-center justify-center ${active
              ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 shadow-sm z-10"
              : "opacity-85 hover:opacity-100 hover:scale-105"
              }`}
            style={{
              backgroundColor: color.value,
              border: color.border || "1px solid rgba(120,120,120,0.3)",
              boxShadow: color.glow ? `0 0 8px ${color.glow}` : undefined,
            }}
          >
            {active && (
              <Check
                className={`w-3 h-3 drop-shadow font-bold ${color.value === "#ffffff" || color.value === "#e2e8f0" || color.value === "#38bdf8"
                  ? "text-slate-950 font-black"
                  : "text-white"
                  }`}
              />
            )}
          </button>
        );
      })}
      {/* Custom color input */}
      <label
        title={isArabic ? "لون مخصص" : "Custom Color"}
        className="relative w-full max-w-[28px] aspect-square rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 flex items-center justify-center cursor-pointer bg-white dark:bg-slate-800 transition-all hover:scale-105"
      >
        <span
          className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shadow-inner"
          style={{ backgroundColor: value || "#ffffff" }}
        />
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
        />
      </label>
    </div>
  );
}

function getFontFamily(fontId) {
  const f = FONT_OPTIONS.find((item) => item.id === fontId);
  return f ? f.cssFamily : "'Cairo', sans-serif";
}

// ── Per-Text Font Picker Component ──────────────────────────────────────────
function FontPickerSelect({ value, onChange, isArabic }) {
  const currentFont = FONT_OPTIONS.find((f) => f.id === value) || FONT_OPTIONS[0];
  return (
    <div className="relative">
      <select
        value={value || "Cairo"}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer transition-all pe-8"
        style={{ fontFamily: currentFont?.cssFamily }}
      >
        <optgroup label={isArabic ? "── خطوط عربية عصرية ──" : "── Modern Arabic ──"}>
          {FONT_OPTIONS.filter((f) => f.group === "arabic_modern").map((font) => (
            <option
              key={font.id}
              value={font.id}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5"
              style={{ fontFamily: font.cssFamily }}
            >
              {isArabic ? font.nameAr : font.nameEn}
            </option>
          ))}
        </optgroup>
        <optgroup label={isArabic ? "── خطوط فخمة وأصيلة ──" : "── Luxury & Calligraphic ──"}>
          {FONT_OPTIONS.filter((f) => f.group === "luxury").map((font) => (
            <option
              key={font.id}
              value={font.id}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5"
              style={{ fontFamily: font.cssFamily }}
            >
              {isArabic ? font.nameAr : font.nameEn}
            </option>
          ))}
        </optgroup>
        <optgroup label={isArabic ? "── خطوط إنجليزية وعالمية ──" : "── Global & English ──"}>
          {FONT_OPTIONS.filter((f) => f.group === "english").map((font) => (
            <option
              key={font.id}
              value={font.id}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5"
              style={{ fontFamily: font.cssFamily }}
            >
              {isArabic ? font.nameAr : font.nameEn}
            </option>
          ))}
        </optgroup>
      </select>
      <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center px-2.5 text-slate-400">
        <ChevronDown className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

// ── Text Alignment & Vertical Position (الموضع) Control ──────────────────
function TextAlignAndPositionControl({
  id,
  align = "center",
  isArabic,
  onAlign,
  onNudgeY,
}) {
  return (
    <div className="flex items-center justify-start gap-1.5 sm:gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 overflow-x-auto no-scrollbar">
      {/* Align: Right / Center / Left */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
          {isArabic ? "المحاذاة:" : "Align:"}
        </span>
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => onAlign(id, "right")}
            className={`p-1 rounded-md transition-colors cursor-pointer flex items-center justify-center ${align === "right"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            title={isArabic ? "محاذاة لليمين" : "Align Right"}
          >
            <AlignRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onAlign(id, "center")}
            className={`p-1 rounded-md transition-colors cursor-pointer flex items-center justify-center ${align === "center"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            title={isArabic ? "توسيط في كل الجهات (أفقياً ورأسياً)" : "Center in all directions"}
          >
            <AlignCenter className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onAlign(id, "left")}
            className={`p-1 rounded-md transition-colors cursor-pointer flex items-center justify-center ${align === "left"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            title={isArabic ? "محاذاة لليسار" : "Align Left"}
          >
            <AlignLeft className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5" />

      {/* Up & Down (الموضع: رفع وخفض) */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
          {isArabic ? "الموضع:" : "Shift:"}
        </span>
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => onNudgeY(id, -3)}
            className="px-1.5 py-0.5 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors flex items-center gap-0.5 cursor-pointer"
            title={isArabic ? "رفع للأعلى" : "Raise (Up)"}
          >
            <ArrowUp className="w-3 h-3 text-indigo-500" />
            <span className="text-[9px] font-bold">{isArabic ? "رفع" : "Up"}</span>
          </button>
          <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800 my-auto" />
          <button
            type="button"
            onClick={() => onNudgeY(id, 3)}
            className="px-1.5 py-0.5 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors flex items-center gap-0.5 cursor-pointer"
            title={isArabic ? "خفض للأسفل" : "Lower (Down)"}
          >
            <ArrowDown className="w-3 h-3 text-indigo-500" />
            <span className="text-[9px] font-bold">{isArabic ? "خفض" : "Down"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomCardPage({
  isPanel = false,
  onNavigateTab = null,
  onBack = null,
  preselectedProduct = null,
}) {
  const { t, language } = useGlobalLanguage();
  const isArabic = language === "ar";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { user } = useAuth();

  // Canonical User Profile Link (Preview destination)
  const userProfileUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://thenith.com/p/preview";
    const origin = window.location.origin;
    if (user?.username) return `${origin}/p/${user.username}`;
    if (user?.publicId) return `${origin}/p/${user.publicId}`;
    return `${origin}/p/preview`;
  }, [user]);

  // ── Auto-Save Storage Key ──────────────────────────────────────────
  const STUDIO_STORAGE_KEY = "thenith_custom_card_studio_state_v2";

  // Read saved draft from localStorage on first render
  const [initialDraft] = useState(() => {
    try {
      const saved = localStorage.getItem(STUDIO_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load studio draft from localStorage", e);
    }
    return null;
  });

  // State
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'bg' | 'logo'
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Card Content: Default name NAME, Default job empty
  const [cardName, setCardName] = useState(() => (initialDraft?.cardName !== undefined ? initialDraft.cardName : "NAME"));
  const [cardJob, setCardJob] = useState(() => (initialDraft?.cardJob !== undefined ? initialDraft.cardJob : ""));
  const [selectedFont, setSelectedFont] = useState(() => initialDraft?.selectedFont || "Cairo");
  const [nameFont, setNameFont] = useState(() => initialDraft?.nameFont || initialDraft?.selectedFont || "Cairo");
  const [jobFont, setJobFont] = useState(() => initialDraft?.jobFont || initialDraft?.selectedFont || "Cairo");
  const [textColor, setTextColor] = useState(() => initialDraft?.textColor || "#ffffff");
  const [nameSize, setNameSize] = useState(() => initialDraft?.nameSize ?? 24); // px in preview
  const [nameColor, setNameColor] = useState(() => initialDraft?.nameColor || "#ffffff");
  const [jobSize, setJobSize] = useState(() => initialDraft?.jobSize ?? 13); // px in preview
  const [jobColor, setJobColor] = useState(() => initialDraft?.jobColor || "#ffffff");
  const [textAlign, setTextAlign] = useState(() => initialDraft?.textAlign || "center");
  // Additional Custom Texts (إمكانية إضافة نصوص جديدة غير محدودة)
  const [customTexts, setCustomTexts] = useState(() => initialDraft?.customTexts || []);

  // Background
  const [selectedBg, setSelectedBg] = useState(() => initialDraft?.selectedBg || "thenith_signature");
  const [bgSubTab, setBgSubTab] = useState("presets"); // 'presets' | 'pure_color' | 'custom_card'
  const [customSolidBgColor, setCustomSolidBgColor] = useState(() => initialDraft?.customSolidBgColor || "#0f172a");
  const [customBgImage, setCustomBgImage] = useState(null);
  const [customBgDataUrl, setCustomBgDataUrl] = useState(() => initialDraft?.customBgDataUrl || null);
  const [customBackBgDataUrl, setCustomBackBgDataUrl] = useState(() => initialDraft?.customBackBgDataUrl || null);

  // Image Upload (صورة / شعار) – Front Face (slot 1 & 2)
  const [logoDataUrl, setLogoDataUrl] = useState(() => initialDraft?.logoDataUrl || null);
  const [logoPosition, setLogoPosition] = useState(() => initialDraft?.logoPosition || "top-right");
  const [logoSize, setLogoSize] = useState(() => initialDraft?.logoSize ?? 55); // px
  const [logoFilter, setLogoFilter] = useState(() => initialDraft?.logoFilter || "none");
  // Front Face – second image slot
  const [logo2DataUrl, setLogo2DataUrl] = useState(() => initialDraft?.logo2DataUrl || null);
  const [logo2Size, setLogo2Size] = useState(() => initialDraft?.logo2Size ?? 55);
  const [logo2Filter, setLogo2Filter] = useState(() => initialDraft?.logo2Filter || "none");
  // Back Face image slots (1 & 2)
  const [backLogoDataUrl, setBackLogoDataUrl] = useState(() => initialDraft?.backLogoDataUrl || null);
  const [backLogoSize, setBackLogoSize] = useState(() => initialDraft?.backLogoSize ?? 55);
  const [backLogoFilter, setBackLogoFilter] = useState(() => initialDraft?.backLogoFilter || "none");
  const [backLogo2DataUrl, setBackLogo2DataUrl] = useState(() => initialDraft?.backLogo2DataUrl || null);
  const [backLogo2Size, setBackLogo2Size] = useState(() => initialDraft?.backLogo2Size ?? 55);
  const [backLogo2Filter, setBackLogo2Filter] = useState(() => initialDraft?.backLogo2Filter || "none");

  // Product Data
  const [product, setProduct] = useState(preselectedProduct || null);
  const [loadingProduct, setLoadingProduct] = useState(!preselectedProduct);

  const cardRef = useRef(null);
  const frontFaceRef = useRef(null);
  const backFaceRef = useRef(null);
  const draggingRef = useRef(null);

  // ── Freeform Interactive Canvas State ──────────────────────────────────────────
  const DEFAULT_POSITIONS = useMemo(
    () => ({
      name: { x: 50, y: 50 },
      job: { x: 50, y: 64 },
      logo: { x: 84, y: 18 },
      logo2: { x: 16, y: 18 },
      brand: { x: 16, y: 18 },
      tap: { x: 22, y: 88 },
      backTitle: { x: 28, y: 20 },
      backQr: { x: 75, y: 50 },
      backSubtitle: { x: 28, y: 82 },
      backLogo: { x: 20, y: 65 },
      backLogo2: { x: 50, y: 65 },
    }),
    [],
  );

  const [elementsPos, setElementsPos] = useState(() => initialDraft?.elementsPos || DEFAULT_POSITIONS);
  const [elementsVisibility, setElementsVisibility] = useState(() => initialDraft?.elementsVisibility || {
    name: true,
    job: true,
    logo: true,
    logo2: true,
    brand: false, // Default is hidden as requested
    tap: false,
    backLogo: true,
    backLogo2: true,
  });
  const [selectedElementId, setSelectedElementId] = useState(null);

  // ── Back Face Customization States ──────────────────────────────────────────
  const [activeCardFace, setActiveCardFace] = useState("front"); // 'front' | 'back'
  const [backTitle, setBackTitle] = useState(() => (initialDraft?.backTitle !== undefined ? initialDraft.backTitle : "Digital Identity Card"));
  const [backTitleColor, setBackTitleColor] = useState(() => initialDraft?.backTitleColor || "");
  const [backTitleFont, setBackTitleFont] = useState(() => initialDraft?.backTitleFont || "Cairo");
  const [syncBackQrColor, setSyncBackQrColor] = useState(true);
  const [backTitleSize, setBackTitleSize] = useState(() => initialDraft?.backTitleSize ?? 13); // px in preview
  const [showBackTitle, setShowBackTitle] = useState(() => (initialDraft?.showBackTitle !== undefined ? initialDraft.showBackTitle : true));

  const [backSubtitle, setBackSubtitle] = useState(() => (initialDraft?.backSubtitle !== undefined ? initialDraft.backSubtitle : "thenith.com"));
  const [backSubtitleColor, setBackSubtitleColor] = useState(() => initialDraft?.backSubtitleColor || "");
  const [backSubtitleFont, setBackSubtitleFont] = useState(() => initialDraft?.backSubtitleFont || "Cairo");
  const [backSubtitleSize, setBackSubtitleSize] = useState(() => initialDraft?.backSubtitleSize ?? 13); // px in preview
  const [showBackSubtitle, setShowBackSubtitle] = useState(() => (initialDraft?.showBackSubtitle !== undefined ? initialDraft.showBackSubtitle : true));

  const [backQrValue, setBackQrValue] = useState(() => initialDraft?.backQrValue || userProfileUrl);

  useEffect(() => {
    if (user && (!backQrValue || backQrValue === "https://thenith.com" || backQrValue.includes("/preview"))) {
      setBackQrValue(userProfileUrl);
    }
  }, [user, userProfileUrl]);
  const [backQrSize, setBackQrSize] = useState(() => initialDraft?.backQrSize ?? 88); // px
  const [showBackQr, setShowBackQr] = useState(() => (initialDraft?.showBackQr !== undefined ? initialDraft.showBackQr : true));
  const [qrColor, setQrColor] = useState(() => initialDraft?.qrColor || "#000000"); // لون الـ QR
  const lastManualQrColorRef = useRef(initialDraft?.qrColor || "#000000");
  const handleSetManualQrColor = (c) => {
    lastManualQrColorRef.current = c;
    setQrColor(c);
  };
  const [backQrContainerBg, setBackQrContainerBg] = useState("white"); // 'white' | 'transparent' | 'dark'

  const [backCustomTexts, setBackCustomTexts] = useState(() => initialDraft?.backCustomTexts || []);
  const [customIcons, setCustomIcons] = useState(() => initialDraft?.customIcons || []);
  const colorToastTimerRef = useRef(null);
  const currentAdminVersionRef = useRef(initialDraft?._adminVersion || null);
  const adminConfigRef = useRef(null);

  // ── Helper to Apply Template Config to State ────────────────────────────────
  const applyTemplateConfig = (config) => {
    if (!config) return;
    if (config.adminVersion) currentAdminVersionRef.current = config.adminVersion;
    if (config.cardName !== undefined) setCardName(config.cardName || "NAME");
    if (config.cardJob !== undefined) setCardJob(config.cardJob || "");
    if (config.selectedBg) {
      setSelectedBg(config.selectedBg);
      if (config.selectedBg === "custom") {
        setBgSubTab("custom_card");
      } else if (config.selectedBg === "custom_solid_color") {
        setBgSubTab("pure_color");
      } else {
        setBgSubTab("presets");
      }
    }
    if (config.customSolidBgColor) setCustomSolidBgColor(config.customSolidBgColor);
    setCustomBgDataUrl(config.customBgDataUrl || null);
    setCustomBackBgDataUrl(config.customBackBgDataUrl || null);
    if (config.nameFont) setNameFont(config.nameFont);
    if (config.nameSize) setNameSize(config.nameSize);
    if (config.nameColor) setNameColor(config.nameColor);
    if (config.jobFont) setJobFont(config.jobFont);
    if (config.jobSize) setJobSize(config.jobSize);
    if (config.jobColor) setJobColor(config.jobColor);
    if (config.textAlign) setTextAlign(config.textAlign);
    if (config.customTexts) setCustomTexts(config.customTexts);

    setLogoDataUrl(config.logoDataUrl || null);
    if (config.logoSize) setLogoSize(config.logoSize);
    if (config.logoFilter) setLogoFilter(config.logoFilter);
    setLogo2DataUrl(config.logo2DataUrl || null);
    if (config.logo2Size) setLogo2Size(config.logo2Size);
    if (config.logo2Filter) setLogo2Filter(config.logo2Filter);

    setBackLogoDataUrl(config.backLogoDataUrl || null);
    if (config.backLogoSize) setBackLogoSize(config.backLogoSize);
    if (config.backLogoFilter) setBackLogoFilter(config.backLogoFilter);
    setBackLogo2DataUrl(config.backLogo2DataUrl || null);
    if (config.backLogo2Size) setBackLogo2Size(config.backLogo2Size);
    if (config.backLogo2Filter) setBackLogo2Filter(config.backLogo2Filter);

    if (config.backTitle !== undefined) setBackTitle(config.backTitle);
    if (config.backTitleFont) setBackTitleFont(config.backTitleFont);
    if (config.backTitleSize) setBackTitleSize(config.backTitleSize);
    if (config.backTitleColor !== undefined) setBackTitleColor(config.backTitleColor);
    if (config.backSubtitle !== undefined) setBackSubtitle(config.backSubtitle);
    if (config.backSubtitleFont) setBackSubtitleFont(config.backSubtitleFont);
    if (config.backSubtitleSize) setBackSubtitleSize(config.backSubtitleSize);
    if (config.backSubtitleColor !== undefined) setBackSubtitleColor(config.backSubtitleColor);

    if (config.backQrSize) setBackQrSize(config.backQrSize);
    if (config.qrColor) setQrColor(config.qrColor);
    if (config.backQrContainerBg) setBackQrContainerBg(config.backQrContainerBg);

    if (config.elementsPos) {
      setElementsPos((prev) => ({ ...prev, ...config.elementsPos }));
    }
    if (config.elementsVisibility) {
      setElementsVisibility((prev) => ({ ...prev, ...config.elementsVisibility }));
    }
  };

  // ── Sync with Admin Configured Default Template from Backend (/api/settings) ──
  useEffect(() => {
    let mounted = true;
    const client = publicClient || apiClient || api?.client;
    if (!client || typeof client.get !== "function") return;

    client
      .get("/settings")
      .then((res) => {
        if (!mounted) return;
        const config = res?.data?.custom_card_config;
        if (!config) return;

        adminConfigRef.current = config;

        const rawLocal = localStorage.getItem(STUDIO_STORAGE_KEY);
        let localDraft = null;
        try {
          if (rawLocal) localDraft = JSON.parse(rawLocal);
        } catch { }

        const isNewAdminVersion = Boolean(config.adminVersion && config.adminVersion !== localDraft?._adminVersion);
        const hasNeverSaved = !localDraft;

        if (hasNeverSaved || isNewAdminVersion) {
          applyTemplateConfig(config);
        }
      })
      .catch((err) => {
        console.warn("Could not sync custom card settings from backend:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // ── Auto-save Studio Draft to localStorage ────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const payload = {
          _adminVersion: currentAdminVersionRef.current,
          cardName,
          cardJob,
          selectedFont,
          nameFont,
          jobFont,
          textColor,
          nameSize,
          nameColor,
          jobSize,
          jobColor,
          textAlign,
          customTexts,
          selectedBg,
          customSolidBgColor,
          customBgDataUrl,
          customBackBgDataUrl,
          logoDataUrl,
          logoPosition,
          logoSize,
          logoFilter,
          logo2DataUrl,
          logo2Size,
          logo2Filter,
          backLogoDataUrl,
          backLogoSize,
          backLogoFilter,
          backLogo2DataUrl,
          backLogo2Size,
          backLogo2Filter,
          elementsPos,
          elementsVisibility,
          backTitle,
          backTitleColor,
          backTitleFont,
          backTitleSize,
          showBackTitle,
          backSubtitle,
          backSubtitleColor,
          backSubtitleFont,
          backSubtitleSize,
          showBackSubtitle,
          backQrValue,
          backQrSize,
          showBackQr,
          qrColor,
          backCustomTexts,
          customIcons,
        };
        localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        // localStorage quota limit guard for large images
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    cardName,
    cardJob,
    selectedFont,
    nameFont,
    jobFont,
    textColor,
    nameSize,
    nameColor,
    jobSize,
    jobColor,
    textAlign,
    customTexts,
    selectedBg,
    customSolidBgColor,
    customBgDataUrl,
    customBackBgDataUrl,
    logoDataUrl,
    logoPosition,
    logoSize,
    logoFilter,
    logo2DataUrl,
    logo2Size,
    logo2Filter,
    backLogoDataUrl,
    backLogoSize,
    backLogoFilter,
    backLogo2DataUrl,
    backLogo2Size,
    backLogo2Filter,
    elementsPos,
    elementsVisibility,
    backTitle,
    backTitleColor,
    backTitleFont,
    backTitleSize,
    showBackTitle,
    backSubtitle,
    backSubtitleColor,
    backSubtitleFont,
    backSubtitleSize,
    showBackSubtitle,
    backQrValue,
    backQrSize,
    showBackQr,
    qrColor,
    backCustomTexts,
    customIcons,
  ]);

  // Drag Handlers (Mouse & Touch) for all card elements (Front & Back)
  const startDrag = (id, e) => {
    e.stopPropagation();
    setSelectedElementId(id);

    if (id === "name" || id === "job") setActiveTab("text");
    if (id === "logo") setActiveTab("logo");

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const currentFaceEl = isFlipped ? backFaceRef.current : frontFaceRef.current;
    const rect = (currentFaceEl || cardRef.current)?.getBoundingClientRect();
    if (!rect) return;

    draggingRef.current = {
      id,
      startX: clientX,
      startY: clientY,
      startPosX: elementsPos[id]?.x ?? DEFAULT_POSITIONS[id]?.x ?? 50,
      startPosY: elementsPos[id]?.y ?? DEFAULT_POSITIONS[id]?.y ?? 50,
      cardWidth: rect.width,
      cardHeight: rect.height,
    };

    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("touchend", onDragEnd);
    window.addEventListener("touchcancel", onDragEnd);
  };

  const onDragMove = (e) => {
    if (!draggingRef.current) return;
    if (e.cancelable) e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const { id, startX, startY, startPosX, startPosY, cardWidth, cardHeight } = draggingRef.current;
    const deltaXPercent = ((clientX - startX) / cardWidth) * 100;
    const deltaYPercent = ((clientY - startY) / cardHeight) * 100;

    const newX = Math.round(Math.max(4, Math.min(96, startPosX + deltaXPercent)) * 10) / 10;
    const newY = Math.round(Math.max(4, Math.min(96, startPosY + deltaYPercent)) * 10) / 10;

    setElementsPos((prev) => ({
      ...prev,
      [id]: { x: newX, y: newY },
    }));
  };

  const onDragEnd = () => {
    draggingRef.current = null;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);
    window.removeEventListener("touchmove", onDragMove);
    window.removeEventListener("touchend", onDragEnd);
    window.removeEventListener("touchcancel", onDragEnd);
  };

  // Custom Text Handlers (إضافة، تعديل، وحذف نصوص جديدة بحرية)
  const handleAddCustomText = () => {
    const newId = `custom_text_${Date.now()}`;
    const newIndex = customTexts.length + 1;
    const defaultY = Math.min(88, 72 + customTexts.length * 6);
    const newItem = {
      id: newId,
      text: isArabic ? `نص إضافي ${newIndex}` : `Custom Text ${newIndex}`,
      size: Math.max(12, Math.round(nameSize * 0.45)),
      color: textColor,
      font: nameFont || "Cairo",
      x: 50,
      y: defaultY,
    };
    setCustomTexts((prev) => [...prev, newItem]);
    setElementsPos((prev) => ({ ...prev, [newId]: { x: 50, y: defaultY } }));
    setSelectedElementId(newId);
    setActiveTab("text");
    toast.success(isArabic ? "تمت إضافة نص جديد للكارت بنجاح" : "New text added to card");
  };

  // Master Color Unifier (عند الضغط على لون الخط والطباعة يوحد لون كافة النصوص والخطوط)
  const handleApplyGlobalTextColor = (newColor, notify = true) => {
    setTextColor(newColor);
    setNameColor(newColor);
    setJobColor(newColor);
    setCustomTexts((prev) => prev.map((t) => ({ ...t, color: newColor })));
    setBackTitleColor(newColor);
    setBackSubtitleColor(newColor);
    setBackCustomTexts((prev) => prev.map((t) => ({ ...t, color: newColor })));

    if (notify) {
      if (colorToastTimerRef.current) clearTimeout(colorToastTimerRef.current);
      colorToastTimerRef.current = setTimeout(() => {
        toast.success(
          isArabic
            ? "تم توحيد لون كافة الخطوط والنصوص على الكارت بنجاح"
            : "Unified all text colors across the card"
        );
      }, 700);
    }
  };

  // Master Back Face Text Color Unifier (توحيد ألوان نصوص ظهر الكارت مع خيار تضمين الـ QR)
  const handleApplyBackTextColor = (newColor, notify = true) => {
    setBackTitleColor(newColor);
    setBackSubtitleColor(newColor);
    setBackCustomTexts((prev) => prev.map((t) => ({ ...t, color: newColor })));
    if (syncBackQrColor) {
      setQrColor(newColor);
    }

    if (notify) {
      if (colorToastTimerRef.current) clearTimeout(colorToastTimerRef.current);
      colorToastTimerRef.current = setTimeout(() => {
        toast.success(
          isArabic
            ? "تم توحيد لون جميع نصوص ظهر الكارت بنجاح"
            : "Unified all back text colors"
        );
      }, 700);
    }
  };

  const handleAddBackCustomText = () => {
    const newId = `back_text_${Date.now()}`;
    const newItem = {
      id: newId,
      text: isArabic ? "نص إضافي على الظهر" : "Back Custom Text",
      color: textColor,
      size: 13,
      font: backTitleFont || "Cairo",
      x: 35,
      y: 50,
    };
    setBackCustomTexts((prev) => [...prev, newItem]);
    toast.success(isArabic ? "تمت إضافة نص جديد على ظهر الكارت" : "Added text to back face");
  };

  const handleUpdateBackCustomText = (id, field, value) => {
    setBackCustomTexts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteBackCustomText = (id) => {
    setBackCustomTexts((prev) => prev.filter((item) => item.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
    toast.success(isArabic ? "تم حذف النص من ظهر الكارت" : "Deleted text from back face");
  };

  // ── Custom Icons & Images Handlers ─────────────────────────────────────────
  const handleAddPresetIcon = (preset) => {
    // Strictly assign target face by the currently viewed face:
    // Front face when not flipped, Back face when flipped.
    const targetFace = isFlipped ? "back" : "front";
    const newId = `icon_${Date.now()}`;
    const newColor = textColor || "#ffffff";
    const newItem = {
      id: newId,
      name: isArabic ? preset.nameAr : preset.nameEn,
      svg: preset.svg,
      src: svgToDataUrl(preset.svg, newColor),
      isPreset: true,
      face: targetFace,
      size: 28,
      color: newColor,
      colorFilter: "none",
    };
    setCustomIcons((prev) => [...prev, newItem]);
    setElementsPos((prev) => ({ ...prev, [newId]: { x: 50, y: 50 } }));
    setSelectedElementId(newId);
    toast.success(
      isArabic
        ? targetFace === "front"
          ? "تمت إضافة الأيقونة إلى الوجه الأمامي"
          : "تمت إضافة الأيقونة إلى الوجه الخلفي"
        : `Icon added to ${targetFace} face`
    );
  };

  const handleUploadCustomIcon = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error(isArabic ? "حجم الصورة كبير جداً (أقصى حد 8 ميجابايت)" : "File size too large");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const targetFace = isFlipped ? "back" : "front";
      const newId = `icon_${Date.now()}`;
      const newItem = {
        id: newId,
        name: file.name.replace(/\.[^/.]+$/, ""),
        src: event.target.result,
        isPreset: false,
        face: targetFace,
        size: 32,
        colorFilter: "none",
      };
      setCustomIcons((prev) => [...prev, newItem]);
      setElementsPos((prev) => ({ ...prev, [newId]: { x: 50, y: 50 } }));
      setSelectedElementId(newId);
      toast.success(
        isArabic
          ? targetFace === "front"
            ? "تمت إضافة الصورة إلى الوجه الأمامي"
            : "تمت إضافة الصورة إلى الوجه الخلفي"
          : `Image added to ${targetFace} face`
      );
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateIcon = (id, field, value) => {
    setCustomIcons((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "color" && item.svg) {
          updated.src = svgToDataUrl(item.svg, value);
        }
        return updated;
      })
    );
  };

  const handleDeleteIcon = (id) => {
    setCustomIcons((prev) => prev.filter((item) => item.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
    toast.success(isArabic ? "تم حذف الأيقونة" : "Icon deleted");
  };

  const handleUpdateCustomText = (id, field, value) => {
    setCustomTexts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteCustomText = (id) => {
    setCustomTexts((prev) => prev.filter((item) => item.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
    toast.success(isArabic ? "تم حذف النص من الكارت" : "Text deleted from card");
  };

  const handleCenterElement = (id) => {
    let targetX = 50;
    let targetY = 50;

    setElementsPos((prev) => ({
      ...prev,
      [id]: { x: targetX, y: targetY },
    }));

    if (id && id.startsWith("custom_text_")) {
      handleUpdateCustomText(id, "x", targetX);
      handleUpdateCustomText(id, "y", targetY);
      handleUpdateCustomText(id, "align", "center");
    }

    const names = {
      name: isArabic ? "الاسم" : "Name",
      job: isArabic ? "الوظيفة" : "Job Title",
    };

    toast.success(
      isArabic
        ? `تم توسيط ${names[id] || "النص"} من جميع الجهات (أفقياً ورأسياً)`
        : `Centered ${names[id] || "text"} in all directions`
    );
  };

  const handleSetTextAlign = (id, alignDir) => {
    if (alignDir === "center") {
      handleCenterElement(id);
      return;
    }

    const targetX = alignDir === "right" ? 80 : 20;

    setElementsPos((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { y: 50 }), x: targetX },
    }));

    if (id && id.startsWith("custom_text_")) {
      handleUpdateCustomText(id, "x", targetX);
      handleUpdateCustomText(id, "align", alignDir);
    }

    toast.success(
      isArabic
        ? alignDir === "right"
          ? "تمت المحاذاة لليمين"
          : "تمت المحاذاة لليسار"
        : `Aligned ${alignDir}`
    );
  };

  const handleNudgeY = (id, delta) => {
    setElementsPos((prev) => {
      const currentY = prev[id]?.y ?? 50;
      const nextY = Math.max(8, Math.min(92, currentY + delta));
      if (id && id.startsWith("custom_text_")) {
        handleUpdateCustomText(id, "y", nextY);
      }
      return {
        ...prev,
        [id]: { ...(prev[id] || { x: 50 }), y: nextY },
      };
    });
  };

  const deleteElement = (id) => {
    if (id && id.startsWith("custom_text_")) {
      handleDeleteCustomText(id);
      return;
    }
    if (id && id.startsWith("back_text_")) {
      handleDeleteBackCustomText(id);
      return;
    }
    if (id && id.startsWith("icon_")) {
      handleDeleteIcon(id);
      return;
    }
    if (id === "backTitle") {
      setShowBackTitle(false);
      setSelectedElementId(null);
      toast.success(isArabic ? "تم حذف العنوان من ظهر الكارت" : "Back title removed");
      return;
    }
    if (id === "backSubtitle") {
      setShowBackSubtitle(false);
      setSelectedElementId(null);
      toast.success(isArabic ? "تم حذف النص السفلي من ظهر الكارت" : "Back subtitle removed");
      return;
    }
    if (id === "logo") {
      setLogoDataUrl(null);
      setSelectedElementId(null);
      toast.success(isArabic ? "تم حذف الصورة الأولى من الكارت" : "Image 1 removed");
      return;
    }
    if (id === "logo2") {
      setLogo2DataUrl(null);
      setSelectedElementId(null);
      toast.success(isArabic ? "تم حذف الصورة الثانية من الكارت" : "Image 2 removed");
      return;
    }
    if (id === "backLogo") {
      setBackLogoDataUrl(null);
      setSelectedElementId(null);
      toast.success(isArabic ? "تم حذف الصورة الأولى من ظهر الكارت" : "Back image 1 removed");
      return;
    }
    if (id === "backLogo2") {
      setBackLogo2DataUrl(null);
      setSelectedElementId(null);
      toast.success(isArabic ? "تم حذف الصورة الثانية من ظهر الكارت" : "Back image 2 removed");
      return;
    }
    setElementsVisibility((prev) => ({ ...prev, [id]: false }));
    setSelectedElementId(null);
    const names = {
      name: isArabic ? "الاسم" : "Name",
      job: isArabic ? "الوظيفة" : "Job Title",
      logo: isArabic ? "اللوجو" : "Logo",
      brand: "Thenith",
      tap: "Tap to connect",
    };
    toast.success(
      isArabic
        ? `تم حذف ${names[id] || "العنصر"} من الكارت (يمكنك استعادته في أي وقت)`
        : `Removed ${names[id] || "element"} (You can restore it anytime)`
    );
  };

  const restoreElement = (id) => {
    setElementsVisibility((prev) => ({ ...prev, [id]: true }));
    setSelectedElementId(id);
    if (id === "name" && !cardName.trim()) setCardName("NAME");
    toast.success(isArabic ? "تمت استعادة العنصر إلى الكارت" : "Element restored to card");
  };

  const resetAllPositions = () => {
    const customPos = {};
    customTexts.forEach((item, index) => {
      customPos[item.id] = { x: 50, y: Math.min(88, 72 + index * 6) };
    });
    backCustomTexts.forEach((item, index) => {
      customPos[item.id] = { x: 28, y: Math.min(75, 38 + index * 12) };
    });
    customIcons.forEach((item) => {
      customPos[item.id] = { x: 50, y: 50 };
    });
    setElementsPos({ ...DEFAULT_POSITIONS, ...customPos });
    setElementsVisibility({
      name: true,
      job: true,
      logo: true,
      brand: false,
      tap: true,
    });
    setSelectedElementId(null);
    toast.success(isArabic ? "تمت إعادة ضبط كافة العناصر للمواضع الافتراضية" : "Reset layout to default positions");
  };

  // Keyboard shortcut to delete selected element
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        return;
      }
      if (selectedElementId && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        deleteElement(selectedElementId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId]);

  // Check if background is light to adjust text contrast on back face
  const isLightBg = useMemo(() => {
    if (selectedBg === "liquid_silver" || selectedBg === "brushed_gold") return true;
    if (selectedBg === "custom_solid_color" && customSolidBgColor) {
      const c = customSolidBgColor.replace("#", "");
      if (c.length === 6) {
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 170;
      }
    }
    return false;
  }, [selectedBg, customSolidBgColor]);

  // Auto switch default text color for optimal contrast on light cards
  useEffect(() => {
    if (isLightBg && textColor.toLowerCase() === "#ffffff") {
      setTextColor("#0f172a");
    } else if (!isLightBg && textColor.toLowerCase() === "#0f172a") {
      setTextColor("#ffffff");
    }
  }, [isLightBg]);

  // ── Photoshop Spectrum Slider State & Handlers ──────────────────────────────
  const [hsv, setHsv] = useState(() => hexToHsv(customSolidBgColor || "#0f172a"));
  const hueBarRef = useRef(null);
  const brightBarRef = useRef(null);
  const isDraggingHue = useRef(false);
  const isDraggingBright = useRef(false);

  // Sync HSV when customSolidBgColor changes externally
  useEffect(() => {
    if (selectedBg === "custom_solid_color" && customSolidBgColor) {
      const parsed = hexToHsv(customSolidBgColor);
      setHsv((prev) => {
        if (Math.abs(prev.h - parsed.h) > 2 || Math.abs(prev.s - parsed.s) > 2 || Math.abs(prev.v - parsed.v) > 2) {
          return parsed;
        }
        return prev;
      });
    }
  }, [customSolidBgColor, selectedBg]);

  // Hue Rainbow Slider Drag Handlers (ألوان صريحة ومباشرة 100%)
  const updateHueFromEvent = (e) => {
    if (!hueBarRef.current) return;
    const rect = hueBarRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;

    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const h = Math.round((x / rect.width) * 360);

    const pureHex = hslToHex(h, 100, 50);
    setHsv({ h, s: 100, v: 100 });
    setCustomSolidBgColor(pureHex);
    setSelectedBg("custom_solid_color");
  };

  const handleHueMouseDown = (e) => {
    e.preventDefault();
    isDraggingHue.current = true;
    updateHueFromEvent(e);

    const onMove = (moveEvent) => {
      if (isDraggingHue.current) {
        if (moveEvent.cancelable) moveEvent.preventDefault();
        updateHueFromEvent(moveEvent);
      }
    };

    const onUp = () => {
      isDraggingHue.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  // Brightness / Tone Slider Drag Handlers (يمين وشمال من الداكن للفاتح)
  const updateBrightFromEvent = (e) => {
    if (!brightBarRef.current) return;
    const rect = brightBarRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;

    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = x / rect.width;

    let s = 90;
    let v = 50;
    if (ratio <= 0.5) {
      v = Math.round(5 + (ratio / 0.5) * 65);
      s = 90;
    } else {
      const r2 = (ratio - 0.5) / 0.5;
      v = Math.round(70 + r2 * 30);
      s = Math.round(90 * (1 - r2));
    }

    setHsv((prev) => {
      const next = { ...prev, s, v };
      const newHex = hsvToHex(next.h, next.s, next.v);
      setCustomSolidBgColor(newHex);
      setSelectedBg("custom_solid_color");
      return next;
    });
  };

  const handleBrightMouseDown = (e) => {
    e.preventDefault();
    isDraggingBright.current = true;
    updateBrightFromEvent(e);

    const onMove = (moveEvent) => {
      if (isDraggingBright.current) {
        if (moveEvent.cancelable) moveEvent.preventDefault();
        updateBrightFromEvent(moveEvent);
      }
    };

    const onUp = () => {
      isDraggingBright.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  // Load product to get dynamic price controlled by admin in dashboard
  useEffect(() => {
    if (preselectedProduct) {
      setProduct(preselectedProduct);
      setLoadingProduct(false);
      return;
    }

    let mounted = true;
    loadStoreProducts(language)
      .then((items) => {
        if (!mounted) return;
        const requestedId = searchParams.get("productId");
        let matched = null;
        if (requestedId) {
          matched = items.find((p) => p.id === requestedId);
        }
        if (!matched) {
          matched = items.find((p) => Boolean(p.isCustomizable));
        }
        setProduct(matched || null);
      })
      .catch((err) => console.error("Error loading products for custom card:", err))
      .finally(() => {
        if (mounted) setLoadingProduct(false);
      });

    return () => {
      mounted = false;
    };
  }, [language, searchParams, preselectedProduct]);

  // ── Client-side Image Security Validator & Sanitizer ───────────────────────────
  // Multi-layered defense against malicious files, polyglots, steganography & script injection:
  // 1. MIME whitelist & file extension whitelist
  // 2. Dangerous double-extension prevention (.php.jpg, .exe.png, etc.)
  // 3. Size constraints (max 5MB) & decompression bomb limits (max 8192x8192)
  // 4. Magic bytes header inspection (verifying genuine JPEG, PNG, WEBP, GIF headers)
  // 5. Deep SVG content sanitization (blocking script, iframe, foreignObject, on*, javascript:)
  // 6. Complete canvas re-encoding: decodes raw pixels and outputs a fresh, sterilized PNG
  const SAFE_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB limit
  const validateImageSecurity = async (file) => {
    // 1. MIME whitelist
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedMimes.includes(file.type)) {
      return {
        ok: false,
        reason: isArabic
          ? "نوع الملف غير مدعوم. يُسمح بـ JPG, PNG, WebP, GIF, SVG فقط"
          : "Unsupported file type. Only JPG, PNG, WebP, GIF, SVG are allowed",
      };
    }

    // 2. Extension whitelist & double-extension blocking
    const parts = (file.name || "").toLowerCase().split(".");
    const ext = parts[parts.length - 1] || "";
    const allowedExts = ["jpg", "jpeg", "png", "webp", "gif", "svg"];
    if (!allowedExts.includes(ext)) {
      return { ok: false, reason: isArabic ? "امتداد الملف غير مدعوم" : "Unsupported file extension" };
    }

    if (parts.length > 2) {
      const dangerousSubExts = ["php", "phtml", "exe", "sh", "bat", "cmd", "js", "html", "htm", "vbs", "jar", "py", "pl", "cgi", "phar"];
      for (let i = 1; i < parts.length - 1; i++) {
        if (dangerousSubExts.includes(parts[i])) {
          return {
            ok: false,
            reason: isArabic
              ? "تم رفض الملف لأسباب أمنية (امتداد غير آمن)"
              : "File rejected: suspicious dangerous extension pattern",
          };
        }
      }
    }

    // 3. File size check
    if (file.size > SAFE_IMAGE_MAX_BYTES) {
      return {
        ok: false,
        reason: isArabic
          ? `حجم الصورة يتجاوز ${SAFE_IMAGE_MAX_BYTES / 1024 / 1024}MB — اختر صورة أصغر`
          : `Image exceeds ${SAFE_IMAGE_MAX_BYTES / 1024 / 1024}MB limit`,
      };
    }

    // 4. Magic byte inspection for bitmap images
    if (file.type !== "image/svg+xml" && ext !== "svg") {
      try {
        const buf = await file.slice(0, 12).arrayBuffer();
        const b = new Uint8Array(buf);
        const isJpeg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
        const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
        const isWebp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
          b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
        const isGif = b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46;
        if (!isJpeg && !isPng && !isWebp && !isGif) {
          return {
            ok: false,
            reason: isArabic
              ? "الملف تالف أو تم التلاعب به — رُفض حمايةً لحسابك"
              : "Corrupted or spoofed image rejected for your security",
          };
        }
      } catch {
        return { ok: false, reason: isArabic ? "تعذّر فحص الملف أمنياً" : "Could not inspect file" };
      }
    } else {
      // 5. Deep inspection of SVG text to prevent XSS payloads
      try {
        const rawSvg = await file.text();
        const lower = rawSvg.toLowerCase();
        const forbiddenPatterns = [
          "<script",
          "javascript:",
          "data:text/html",
          "onload=",
          "onerror=",
          "onclick=",
          "onmouseover=",
          "<foreignobject",
          "<iframe",
          "<object",
          "<embed",
        ];
        for (const pattern of forbiddenPatterns) {
          if (lower.includes(pattern)) {
            return {
              ok: false,
              reason: isArabic
                ? "ملف SVG يحتوي على كود غير آمن — رُفض لحماية النظام"
                : "SVG contains unsafe executable code and was rejected",
            };
          }
        }
      } catch {
        return { ok: false, reason: isArabic ? "تعذّر قراءة ملف SVG" : "Could not verify SVG safety" };
      }
    }

    return { ok: true };
  };

  // Re-encode bitmap images into fresh sterilized PNG canvas to strip all EXIF metadata and hidden polyglots
  const sanitizeImageFile = (file) => {
    return new Promise((resolve, reject) => {
      const isSvg = file.type === "image/svg+xml" || (file.name || "").toLowerCase().endsWith(".svg");
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(isArabic ? "تعذّر قراءة ملف الصورة" : "Error reading file"));
      reader.onload = (event) => {
        const rawDataUrl = event.target.result;
        if (isSvg) {
          return resolve(rawDataUrl);
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Decompression bomb prevention
          if (img.naturalWidth > 8192 || img.naturalHeight > 8192 || img.naturalWidth === 0 || img.naturalHeight === 0) {
            return reject(new Error(isArabic ? "أبعاد الصورة غير صالحة أو مبالغ فيها" : "Invalid image dimensions"));
          }
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const sterilizedDataUrl = canvas.toDataURL("image/png", 0.98);
            resolve(sterilizedDataUrl);
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.onerror = () => reject(new Error(isArabic ? "تعذّر فك تشفير محتوى الصورة" : "Failed to decode image data"));
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle Image Upload – slot: "logo" | "logo2" | "backLogo" | "backLogo2"
  const handleImageUpload = async (e, slot = "logo") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value so user can upload again if needed
    e.target.value = "";

    const check = await validateImageSecurity(file);
    if (!check.ok) {
      toast.error(check.reason);
      return;
    }

    try {
      const cleanDataUrl = await sanitizeImageFile(file);
      if (slot === "logo2") {
        setLogo2DataUrl(cleanDataUrl);
        setElementsVisibility((prev) => ({ ...prev, logo2: true }));
      } else if (slot === "backLogo") {
        setBackLogoDataUrl(cleanDataUrl);
        setElementsVisibility((prev) => ({ ...prev, backLogo: true }));
      } else if (slot === "backLogo2") {
        setBackLogo2DataUrl(cleanDataUrl);
        setElementsVisibility((prev) => ({ ...prev, backLogo2: true }));
      } else {
        setLogoDataUrl(cleanDataUrl);
        setElementsVisibility((prev) => ({ ...prev, logo: true }));
      }
      toast.success(isArabic ? "✓ تم فحص الصورة وتطهيرها ورفعها بأمان!" : "✓ Image validated & uploaded safely!");
    } catch (err) {
      toast.error(err.message || (isArabic ? "تعذّر معالجة الصورة" : "Failed to process image"));
    }
  };
  const handleLogoUpload = handleImageUpload;

  // Reset to default template (Adopts admin configuration from Dash / DB)
  const handleResetToDefaultTemplate = (silent = false) => {
    try {
      localStorage.removeItem(STUDIO_STORAGE_KEY);
    } catch (e) {
      console.warn("Could not remove studio state from localStorage:", e);
    }

    if (adminConfigRef.current) {
      applyTemplateConfig(adminConfigRef.current);
    } else {
      setSelectedBg("thenith_signature");
      setCustomSolidBgColor("#0f172a");
      setCustomBgImage(null);
      setCustomBgDataUrl(null);
      setCustomBackBgDataUrl(null);
      setCardName("NAME");
      setCardJob("");
      setSelectedFont("Cairo");
      setNameFont("Cairo");
      setJobFont("Cairo");
      setTextColor("#ffffff");
      setNameSize(24);
      setNameColor("#ffffff");
      setJobSize(13);
      setJobColor("#ffffff");
      setTextAlign("center");
      setCustomTexts([]);
      setLogoDataUrl(null);
      setLogoPosition("top-right");
      setLogoSize(55);
      setLogoFilter("none");
      setLogo2DataUrl(null);
      setLogo2Size(55);
      setLogo2Filter("none");
      setBackLogoDataUrl(null);
      setBackLogoSize(55);
      setBackLogoFilter("none");
      setBackLogo2DataUrl(null);
      setBackLogo2Size(55);
      setBackLogo2Filter("none");
      setElementsPos(DEFAULT_POSITIONS);
      setElementsVisibility({
        name: true,
        job: true,
        logo: true,
        logo2: true,
        brand: false,
        tap: false,
        backLogo: true,
        backLogo2: true,
      });
      setBackTitle("Digital Identity Card");
      setBackTitleColor("");
      setBackTitleFont("Cairo");
      setBackTitleSize(13);
      setShowBackTitle(true);
      setBackSubtitle("thenith.com");
      setBackSubtitleColor("");
      setBackSubtitleFont("Cairo");
      setBackSubtitleSize(13);
      setShowBackSubtitle(true);
      setBackQrValue(userProfileUrl);
      setBackQrSize(88);
      setShowBackQr(true);
      lastManualQrColorRef.current = "#000000";
      setQrColor("#000000");
      setBackQrContainerBg("white");
      setBackCustomTexts([]);
      setCustomIcons([]);
    }

    setSelectedElementId(null);
    setIsFlipped(false);
    setActiveCardFace("front");

    if (!silent) {
      toast.success(
        isArabic
          ? "تمت استعادة الكارت للوضع الافتراضي المعتمد"
          : "Card reset to admin default successfully"
      );
    }
  };

  // Handle Custom Background Upload from tab
  const handleBgUpload = (e) => {
    handleCustomDesignUpload(e);
  };

  // ── High Resolution Canvas Exporter (9 x 6 cm @ 300 DPI — Print Ready: 1063 x 709 px) ──
  const generateHighResCard = async () => {
    // 9cm x 6cm @ 300 DPI: Math.round((9 / 2.54) * 300) = 1063 px, Math.round((6 / 2.54) * 300) = 709 px
    const width = 1063;
    const height = 709;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const previewWidth = cardRef.current?.offsetWidth || 470;
    const scale = width / previewWidth;

    // 1. Draw Background
    if (selectedBg === "custom" && customBgDataUrl) {
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Cover fit
          const imgScale = Math.max(width / img.width, height / img.height);
          const x = width / 2 - (img.width / 2) * imgScale;
          const y = height / 2 - (img.height / 2) * imgScale;
          ctx.drawImage(img, x, y, img.width * imgScale, img.height * imgScale);
          resolve();
        };
        img.onerror = resolve;
        img.src = customBgDataUrl;
      });
    } else if (selectedBg === "custom_solid_color") {
      ctx.fillStyle = customSolidBgColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      const preset = ALL_BACKGROUNDS.find((p) => p.id === selectedBg) || BACKGROUND_PRESETS[0];
      preset.canvasFill(ctx, width, height);
    }

    // 2. Draw Subtle Card Border / Inner Glow
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    // 5. Draw Custom Logo / Image 1 if present & visible
    if (logoDataUrl && elementsVisibility.logo) {
      await new Promise((resolve) => {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.onload = () => {
          const targetW = logoSize * scale;
          const aspect = logoImg.width / logoImg.height;
          const targetH = targetW / aspect;

          const lx = (elementsPos.logo.x / 100) * width - targetW / 2;
          const ly = (elementsPos.logo.y / 100) * height - targetH / 2;

          ctx.save();
          if (logoFilter === "white") {
            ctx.filter = "brightness(0) invert(1)";
          } else if (logoFilter === "black") {
            ctx.filter = "brightness(0)";
          } else if (logoFilter === "gold") {
            ctx.filter = "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.1)";
          }
          ctx.drawImage(logoImg, lx, ly, targetW, targetH);
          ctx.restore();
          resolve();
        };
        logoImg.onerror = resolve;
        logoImg.src = logoDataUrl;
      });
    }

    // 5b. Draw Custom Logo / Image 2 if present & visible
    if (logo2DataUrl && elementsVisibility.logo2) {
      await new Promise((resolve) => {
        const logo2Img = new Image();
        logo2Img.crossOrigin = "anonymous";
        logo2Img.onload = () => {
          const targetW = (logo2Size || 55) * scale;
          const aspect = logo2Img.width / logo2Img.height;
          const targetH = targetW / aspect;

          const pos = elementsPos.logo2 || { x: 16, y: 18 };
          const lx = (pos.x / 100) * width - targetW / 2;
          const ly = (pos.y / 100) * height - targetH / 2;

          ctx.save();
          if (logo2Filter === "white") {
            ctx.filter = "brightness(0) invert(1)";
          } else if (logo2Filter === "black") {
            ctx.filter = "brightness(0)";
          } else if (logo2Filter === "gold") {
            ctx.filter = "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.1)";
          }
          ctx.drawImage(logo2Img, lx, ly, targetW, targetH);
          ctx.restore();
          resolve();
        };
        logo2Img.onerror = resolve;
        logo2Img.src = logo2DataUrl;
      });
    }

    // 6. Draw Brand Logo (Thenith) on the side if visible
    if (selectedBg !== "custom" && elementsVisibility.brand) {
      ctx.save();
      ctx.fillStyle = isLightBg ? "rgba(15, 23, 42, 0.9)" : (textColor === "#0f172a" ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)");
      ctx.font = `bold ${Math.round(14 * scale)}px 'Outfit', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const bx = (elementsPos.brand.x / 100) * width;
      const by = (elementsPos.brand.y / 100) * height;
      ctx.fillText("Thenith", bx, by);
      ctx.restore();
    }

    // 7. Draw "Tap to connect" if visible
    if (selectedBg !== "custom" && elementsVisibility.tap) {
      ctx.save();
      ctx.font = `500 ${Math.round(12 * scale)}px 'Outfit', sans-serif`;
      ctx.fillStyle = isLightBg ? "rgba(15, 23, 42, 0.85)" : (textColor === "#0f172a" ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.85)");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tx = (elementsPos.tap.x / 100) * width;
      const ty = (elementsPos.tap.y / 100) * height;
      ctx.fillText("Tap to connect", tx, ty);
      ctx.restore();
    }

    // 8. Ensure Google WebFont is ready
    try {
      await document.fonts.load(`bold 60px "${nameFont || 'Cairo'}"`);
      await document.fonts.load(`500 30px "${jobFont || 'Cairo'}"`);
      for (const ct of customTexts) {
        if (ct.font) await document.fonts.load(`500 30px "${ct.font}"`);
      }
    } catch (e) {
      // Font fallback is fine
    }

    // 9. Draw Name & Job Title at freeform coordinates
    if (cardName.trim() && elementsVisibility.name) {
      ctx.save();
      ctx.fillStyle = nameColor || textColor;
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      const scaledNameSize = Math.round(nameSize * scale);
      ctx.font = `bold ${scaledNameSize}px ${getFontFamily(nameFont)}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const nx = (elementsPos.name.x / 100) * width;
      const ny = (elementsPos.name.y / 100) * height;
      ctx.fillText(cardName, nx, ny);
      ctx.restore();
    }

    if (cardJob.trim() && elementsVisibility.job) {
      ctx.save();
      const scaledJobSize = Math.round((jobSize || Math.max(12, nameSize * 0.45)) * scale);
      ctx.font = `500 ${scaledJobSize}px ${getFontFamily(jobFont)}`;
      ctx.fillStyle = jobColor || (isLightBg ? "rgba(15, 23, 42, 0.78)" : (textColor === "#0f172a" ? "rgba(15, 23, 42, 0.78)" : "rgba(255, 255, 255, 0.82)"));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const jx = (elementsPos.job.x / 100) * width;
      const jy = (elementsPos.job.y / 100) * height;
      ctx.fillText(cardJob, jx, jy);
      ctx.restore();
    }

    // 10. Draw Custom Texts at freeform coordinates
    customTexts.forEach((item) => {
      if (!item.text || !item.text.trim()) return;
      ctx.save();
      const pos = elementsPos[item.id] || { x: item.x, y: item.y };
      const scaledSize = Math.round((item.size || Math.max(12, nameSize * 0.45)) * scale);
      ctx.font = `500 ${scaledSize}px ${getFontFamily(item.font || nameFont)}`;
      ctx.fillStyle = item.color || textColor;
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 8;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cx = (pos.x / 100) * width;
      const cy = (pos.y / 100) * height;
      ctx.fillText(item.text, cx, cy);
      ctx.restore();
    });

    // 11. Draw Custom Icons & Images on Front Face
    for (const icon of customIcons.filter((ic) => (ic.face || "front") === "front")) {
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.save();
          const pos = elementsPos[icon.id] || { x: 50, y: 50 };
          const targetSize = Math.round((icon.size || 28) * scale);
          const cx = (pos.x / 100) * width - targetSize / 2;
          const cy = (pos.y / 100) * height - targetSize / 2;
          ctx.drawImage(img, cx, cy, targetSize, targetSize);
          ctx.restore();
          resolve();
        };
        img.onerror = resolve;
        img.src = icon.src;
      });
    }

    return canvas.toDataURL("image/png", 0.98);
  };

  // ── High Resolution Back Face Exporter (9 x 6 cm @ 300 DPI — 1063 x 709 px) ──
  const generateHighResBackCard = async (options = {}) => {
    const isForOrder = Boolean(options.isForOrder);
    const width = 1063;
    const height = 709;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Canonical design width 470px ensures identical pixel-perfect scaling across all screen sizes
    const DESIGN_WIDTH = 470;
    const scale = width / DESIGN_WIDTH;

    // 1. Draw matching background
    const backBg = customBackBgDataUrl || customBgDataUrl;
    if (selectedBg === "custom" && backBg) {
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          resolve();
        };
        img.onerror = resolve;
        img.src = backBg;
      });
    } else if (selectedBg === "custom_solid_color") {
      ctx.fillStyle = customSolidBgColor;
      ctx.fillRect(0, 0, width, height);
    } else if (currentBgPreset && typeof currentBgPreset.canvasFill === "function") {
      currentBgPreset.canvasFill(ctx, width, height);
    } else {
      ctx.fillStyle = "#02040b";
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Subtle glossy sheen overlay
    const sheen = ctx.createLinearGradient(0, 0, width, height);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.08)");
    sheen.addColorStop(0.5, "rgba(255, 255, 255, 0.02)");
    sheen.addColorStop(1, "rgba(255, 255, 255, 0.06)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, width, height);

    // 3. Draw QR Code Container & QR if showBackQr at dynamic position
    // Note: When exporting for actual manufacturing (isForOrder: true), we keep the background pristine
    // so the server embeds the official smart card QR once without any duplicate corner artifacts!
    if (showBackQr && !isForOrder) {
      const qrPos = elementsPos.backQr || { x: 75, y: 50 };
      const boxSize = Math.round(104 * scale);
      const boxX = Math.round((qrPos.x / 100) * width - boxSize / 2);
      const boxY = Math.round((qrPos.y / 100) * height - boxSize / 2);
      const borderRadius = Math.round(14 * scale);

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(boxX, boxY, boxSize, boxSize, borderRadius);
      } else {
        ctx.rect(boxX, boxY, boxSize, boxSize);
      }
      ctx.fill();
      ctx.restore();

      // Draw QR Code into container from hidden canvas
      const qrCanvas = document.getElementById("hidden-back-qr-code-canvas");
      if (qrCanvas) {
        const padding = Math.round(10 * scale);
        const innerSize = boxSize - padding * 2;
        ctx.drawImage(qrCanvas, boxX + padding, boxY + padding, innerSize, innerSize);
      }
    }

    // 4. Draw Typography Overlays at dynamic positions
    try {
      if (showBackTitle && backTitle) await document.fonts.load(`600 30px "${backTitleFont || 'Cairo'}"`);
      if (showBackSubtitle && backSubtitle) await document.fonts.load(`bold 30px "${backSubtitleFont || 'Cairo'}"`);
      for (const bct of backCustomTexts) {
        if (bct.font) await document.fonts.load(`500 30px "${bct.font}"`);
      }
    } catch (e) { }

    ctx.save();
    if (showBackTitle && backTitle) {
      const titlePos = elementsPos.backTitle || { x: 28, y: 20 };
      const titleFill = backTitleColor || (isLightBg ? "#0f172a" : "#ffffff");
      ctx.fillStyle = titleFill;
      const titleFontSize = Math.round(backTitleSize * scale);
      ctx.font = `600 ${titleFontSize}px ${getFontFamily(backTitleFont)}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(backTitle, (titlePos.x / 100) * width, (titlePos.y / 100) * height);
    }

    // Back custom texts at dynamic positions
    if (backCustomTexts && backCustomTexts.length > 0) {
      backCustomTexts.forEach((ct, idx) => {
        if (!ct.text) return;
        const ctPos = elementsPos[ct.id] || { x: ct.x || 28, y: 38 + idx * 12 };
        const ctFill = ct.color || backTitleColor || (isLightBg ? "#0f172a" : "#ffffff");
        ctx.fillStyle = ctFill;
        const ctFontSize = Math.round(((ct.size || 13)) * scale);
        ctx.font = `500 ${ctFontSize}px ${getFontFamily(ct.font || backTitleFont)}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ct.text, (ctPos.x / 100) * width, (ctPos.y / 100) * height);
      });
    }

    if (showBackSubtitle && backSubtitle) {
      const subPos = elementsPos.backSubtitle || { x: 28, y: 82 };
      const subtitleFill = backSubtitleColor || (isLightBg ? "#0f172a" : "#ffffff");
      ctx.fillStyle = subtitleFill;
      const subtitleFontSize = Math.round(backSubtitleSize * scale);
      ctx.font = `bold ${subtitleFontSize}px ${getFontFamily(backSubtitleFont)}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(backSubtitle, (subPos.x / 100) * width, (subPos.y / 100) * height);
    }
    ctx.restore();

    // 5. Draw Custom Logos & Images on Back Face (slot 1 & 2)
    if (backLogoDataUrl && elementsVisibility.backLogo) {
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const targetW = (backLogoSize || 55) * scale;
          const aspect = img.width / img.height;
          const targetH = targetW / aspect;

          const pos = elementsPos.backLogo || { x: 28, y: 50 };
          const lx = (pos.x / 100) * width - targetW / 2;
          const ly = (pos.y / 100) * height - targetH / 2;

          ctx.save();
          if (backLogoFilter === "white") {
            ctx.filter = "brightness(0) invert(1)";
          } else if (backLogoFilter === "black") {
            ctx.filter = "brightness(0)";
          } else if (backLogoFilter === "gold") {
            ctx.filter = "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.1)";
          }
          ctx.drawImage(img, lx, ly, targetW, targetH);
          ctx.restore();
          resolve();
        };
        img.onerror = resolve;
        img.src = backLogoDataUrl;
      });
    }

    if (backLogo2DataUrl && elementsVisibility.backLogo2) {
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const targetW = (backLogo2Size || 55) * scale;
          const aspect = img.width / img.height;
          const targetH = targetW / aspect;

          const pos = elementsPos.backLogo2 || { x: 50, y: 50 };
          const lx = (pos.x / 100) * width - targetW / 2;
          const ly = (pos.y / 100) * height - targetH / 2;

          ctx.save();
          if (backLogo2Filter === "white") {
            ctx.filter = "brightness(0) invert(1)";
          } else if (backLogo2Filter === "black") {
            ctx.filter = "brightness(0)";
          } else if (backLogo2Filter === "gold") {
            ctx.filter = "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.1)";
          }
          ctx.drawImage(img, lx, ly, targetW, targetH);
          ctx.restore();
          resolve();
        };
        img.onerror = resolve;
        img.src = backLogo2DataUrl;
      });
    }

    // 6. Draw Custom Icons & Images on Back Face
    for (const icon of customIcons.filter((ic) => ic.face === "back")) {
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          ctx.save();
          const pos = elementsPos[icon.id] || { x: 50, y: 50 };
          const targetSize = Math.round((icon.size || 28) * scale);
          const cx = (pos.x / 100) * width - targetSize / 2;
          const cy = (pos.y / 100) * height - targetSize / 2;
          ctx.drawImage(img, cx, cy, targetSize, targetSize);
          ctx.restore();
          resolve();
        };
        img.onerror = resolve;
        img.src = icon.src;
      });
    }

    return canvas.toDataURL("image/png", 0.98);
  };

  // Download High-Res Preview directly to user device (front or back depending on view)
  const handleDownloadPreview = async () => {
    try {
      setIsGenerating(true);
      const isBack = Boolean(isFlipped);
      const dataUrl = isBack ? await generateHighResBackCard() : await generateHighResCard();
      const sideName = isBack ? "back" : "front";
      const link = document.createElement("a");
      link.download = `thenith_card_${sideName}_${(cardName || "custom").replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(
        isArabic
          ? `تم تحميل ${isBack ? "الوجه الخلفي" : "الوجه الأمامي"} بجودة فائقة!`
          : `Downloaded ${isBack ? "back" : "front"} face in ultra high resolution!`
      );
    } catch (e) {
      toast.error(isArabic ? "حدث خطأ أثناء تحميل التصميم" : "Failed to generate design");
    } finally {
      setIsGenerating(false);
    }
  };

  // Add to Cart and proceed to checkout
  const handleAddToCartAndOrder = async () => {
    if (!product) {
      toast.error(isArabic ? "لم يتم العثور على المنتج المخصص في المتجر" : "Custom product not found");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading(isArabic ? "جاري تجهيز وتأكيد تصميمك..." : "Rendering card design...");

    try {
      // 1. Generate ultra-high resolution design images (Front & Back)
      const highResDataUrl = await generateHighResCard();
      let backHighResDataUrl = null;
      try {
        backHighResDataUrl = await generateHighResBackCard({ isForOrder: true });
      } catch (backErr) {
        console.warn("Back card generation non-blocking error:", backErr);
      }

      // 2. Generate a lightweight thumbnail for cart display to avoid localStorage bloat
      const thumbnailUrl = await createThumbnailFromDataUrl(highResDataUrl, 360);

      // 3. Unique cart item ID for this custom card instance
      const cartItemId = `${product.id}_${Date.now()}`;

      // 4. Save high-res designs in IndexedDB locally
      // (The images will only be uploaded to Cloudinary when the order is completely placed!)
      await saveCardDraftImages(cartItemId, {
        frontImage: highResDataUrl,
        backImage: backHighResDataUrl,
      });

      // Calculate exact export box for QR placement
      const exportWidth = 1063;
      const exportHeight = 709;
      const exportScale = exportWidth / 470;
      const exportBoxSize = Math.round(104 * exportScale);
      const exportBorderRadius = Math.round(14 * exportScale);
      const exportPadding = Math.round(10 * exportScale);
      const exportInnerSize = exportBoxSize - exportPadding * 2;
      const qrTargetPos = elementsPos.backQr || { x: 75, y: 50 };
      const exportBoxX = Math.round((qrTargetPos.x / 100) * exportWidth - exportBoxSize / 2);
      const exportBoxY = Math.round((qrTargetPos.y / 100) * exportHeight - exportBoxSize / 2);

      // 5. Assemble customDesign payload with lightweight thumbnail for cart preview
      const customDesign = {
        name: cardName.trim() || (isArabic ? "تصميم مخصص بالكامل" : "Custom Artwork"),
        nameColor: nameColor || textColor,
        nameSize,
        jobTitle: cardJob.trim() || "",
        jobColor: jobColor || textColor,
        jobSize: jobSize || Math.max(12, nameSize * 0.45),
        font: selectedFont,
        nameFont,
        jobFont,
        backTitleFont,
        backSubtitleFont,
        textColor,
        bgType: selectedBg,
        image: thumbnailUrl, // Fast lightweight thumbnail for instant cart preview
        hasBackImage: Boolean(backHighResDataUrl),
        logoUrl: logoDataUrl || null,
        logo2Url: logo2DataUrl || null,
        backLogoUrl: backLogoDataUrl || null,
        backLogo2Url: backLogo2DataUrl || null,
        customTexts: customTexts.map((t) => ({
          text: t.text,
          size: t.size,
          color: t.color || textColor,
          font: t.font || nameFont || "Cairo",
          x: elementsPos[t.id]?.x ?? t.x,
          y: elementsPos[t.id]?.y ?? t.y,
        })),
        backCustomTexts: backCustomTexts.map((t) => ({
          text: t.text,
          size: t.size,
          color: t.color || backTitleColor || textColor,
          font: t.font || backTitleFont || "Cairo",
          x: elementsPos[t.id]?.x ?? t.x,
          y: elementsPos[t.id]?.y ?? t.y,
        })),
        qrConfig: {
          previewUrl: userProfileUrl,
          color: qrColor || "#000000",
          size: backQrSize || 88,
          x: qrTargetPos.x,
          y: qrTargetPos.y,
          containerBg: backQrContainerBg,
          showQr: showBackQr,
        },
        qrColor: qrColor || "#000000",
        qrPosition: qrTargetPos,
        qrSize: backQrSize || 88,
        qrExportBox: {
          boxSize: exportBoxSize,
          borderRadius: exportBorderRadius,
          padding: exportPadding,
          innerSize: exportInnerSize,
          boxX: exportBoxX,
          boxY: exportBoxY,
        },
        exportedAt: new Date().toISOString(),
      };

      // 6. Add to Cart with customDesign payload & unique cartItemId
      addToCart(product, 1, customDesign, cartItemId);

      // Reset card to default after confirming the order
      handleResetToDefaultTemplate(true);

      toast.success(
        isArabic
          ? "تم تأكيد تصميمك وإضافته للسلة بنجاح!"
          : "Your custom design has been saved to cart!",
        { id: toastId }
      );

      // 7. Navigate to cart or checkout inside panel or main site
      if (onNavigateTab) {
        onNavigateTab("cart");
      } else {
        navigate("/cart");
      }
    } catch (err) {
      console.error("Custom card cart save error:", err);
      toast.error(isArabic ? "حدث خطأ أثناء حفظ التصميم، حاول مرة أخرى" : "Failed to save design", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const currentBgPreset =
    ALL_BACKGROUNDS.find((p) => p.id === selectedBg) ||
    (selectedBg === "custom_solid_color"
      ? { style: { backgroundColor: customSolidBgColor } }
      : BACKGROUND_PRESETS[0]);
  const currentFontObj = FONT_OPTIONS.find((f) => f.id === selectedFont) || FONT_OPTIONS[0];

  const renderIconsSection = (targetFace = "front") => {
    const faceIcons = customIcons.filter((ic) => (ic.face || "front") === targetFace);
    return (
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 pb-1">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
            {isArabic ? "أيقونات" : "Icons"}
          </h3>
        </div>

        {/* Popular Preset Icons Grid */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            {isArabic ? "أيقونات" : "Icons"}
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-100/40 dark:bg-slate-900/40">
            {POPULAR_ICONS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleAddPresetIcon(preset)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer group active:scale-95"
                title={isArabic ? preset.nameAr : preset.nameEn}
              >
                <div
                  className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                  dangerouslySetInnerHTML={{ __html: preset.svg }}
                />
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-1 truncate max-w-full">
                  {isArabic ? preset.nameAr : preset.nameEn}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Added Icons on this Face */}
        {faceIcons.length > 0 && (
          <div className="space-y-3 pt-2">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {isArabic
                ? `الأيقونات المضافة (${faceIcons.length})`
                : `Active Icons (${faceIcons.length})`}
            </span>
            {faceIcons.map((iconItem, idx) => (
              <div
                key={iconItem.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-xs">
                      {iconItem.svg ? (
                        <div
                          className="w-5 h-5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full drop-shadow-xs"
                          style={{ color: iconItem.color || textColor || "#4f46e5" }}
                          dangerouslySetInnerHTML={{ __html: iconItem.svg }}
                        />
                      ) : (
                        <img
                          src={iconItem.src}
                          alt={iconItem.name}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {iconItem.name || (isArabic ? `أيقونة ${idx + 1}` : `Icon ${idx + 1}`)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteIcon(iconItem.id)}
                    className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 flex items-center gap-1 cursor-pointer font-bold shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isArabic ? "حذف" : "Delete"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  {/* Face Indicator (Fixed - cannot be changed) */}
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">
                      {isArabic ? "وجه الكارت" : "Card Face"}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                      {(iconItem.face || "front") === "front"
                        ? (isArabic ? "الوجه الأمامي" : "Front Face")
                        : (isArabic ? "الوجه الخلفي" : "Back Face")}
                    </span>
                  </div>

                  {/* Size Slider */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>{isArabic ? "الحجم:" : "Size:"}</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{iconItem.size || 28}px</span>
                    </div>
                    <input
                      type="range"
                      min={14}
                      max={90}
                      value={iconItem.size || 28}
                      onChange={(e) => handleUpdateIcon(iconItem.id, "size", Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5"
                    />
                  </div>
                </div>

                {/* Color Picker for Presets */}
                {iconItem.isPreset && iconItem.svg && (
                  <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">
                      {isArabic ? "لون الأيقونة:" : "Icon Color:"}
                    </span>
                    <MiniColorSwatchPicker
                      value={iconItem.color || textColor}
                      onChange={(col) => handleUpdateIcon(iconItem.id, "color", col)}
                      isArabic={isArabic}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={
        isPanel
          ? "w-full text-slate-900 dark:text-white font-sans selection:bg-indigo-500 selection:text-white pb-12 bg-white dark:bg-slate-950 p-3 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl transition-colors"
          : "min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-indigo-500 selection:text-white pt-24 pb-20 transition-colors"
      }
    >
      {/* Background Glow Accents */}
      {!isPanel && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 -start-48 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 -end-48 w-96 h-96 bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-[128px]" />
        </div>
      )}

      <div className={isPanel ? "w-full relative z-10" : "max-w-[1360px] mx-auto px-4 sm:px-6 relative z-10"}>
        {/* Back Button for Panel */}
        {isPanel && (
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack || (() => onNavigateTab?.("products"))}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-slate-700 active:scale-95"
            >
              <ArrowRight className={`w-4 h-4 ${isArabic ? "" : "rotate-180"}`} />
              <span>{isArabic ? "العودة للمنتجات" : "Back to Products"}</span>
            </button>
          </div>
        )}

        {/* Header Breadcrumbs & Title (Only when not in panel or streamlined in panel) */}
        {!isPanel ? (
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                <Link to="/products" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  {isArabic ? "المتجر والمنتجات" : "Store & Products"}
                </Link>
                <ChevronRight className={`w-3.5 h-3.5 ${isArabic ? "rotate-180" : ""}`} />
                <span className="text-indigo-600 dark:text-indigo-400">
                  {isArabic ? "استوديو تصميم كاستم كارت" : "Custom Card Studio"}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                <span>{isArabic ? "صمّم كارتك الخاص (Custom Card)" : "Design Your Custom Card"}</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                {isArabic
                  ? "خصّص بطاقتك الذكية الفاخرة مباشرة: عدّل الاسم، والوظيفة، والخط، وارفع شعارك أو تصميمك المخصص بالكامل."
                  : "Customize your smart luxury NFC card: edit your name, job title, font, upload your logo or full custom artwork."}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 sm:mb-6 bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl">
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {isArabic ? "صمّم كارتك الخاص " : "Design Your Custom Card"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                {isArabic
                  ? "خصّص بطاقتك الذكية او ارفع تصميمك بالكامل، وسيتم إرفاقه فوراً مع طلبك."
                  : "Customize your card or upload your full artwork, attached directly to your order."}
              </p>
            </div>
          </div>
        )}

        {/* Studio Grid: Card Preview on Left/Top + Controls on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-12 items-start relative">
          {/* ── LEFT: Live Card Showcase (Sticky on desktop, Card sticky on mobile throughout whole page) ── */}
          <div className="mobile-card-contents lg:col-span-6 w-full flex flex-col items-center lg:sticky lg:top-24 z-20 self-start">
            {/* ── CARD SHOWCASE WRAPPER (الكرت فقط يثبت في السكرول في الموبايل طوال الصفحة) ── */}
            <div className="sticky top-14 sm:top-16 z-30 lg:static w-full max-w-[470px] mx-auto flex flex-col items-center p-0 bg-transparent border-0 shadow-none transition-all">
              {/* Flip / Perspective Controls & Reset */}
              <div className="w-full max-w-[470px] flex items-center justify-between mb-2 px-1">
                <button
                  type="button"
                  onClick={() => handleResetToDefaultTemplate(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                  title={isArabic ? "استعادة الكارت للوضع الافتراضي" : "Reset Card to Default"}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isArabic ? "استعادة الافتراضي" : "Reset to Default"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextFlipped = !isFlipped;
                    setIsFlipped(nextFlipped);
                    setActiveCardFace(nextFlipped ? "back" : "front");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{isArabic ? "قلب الكارت " : "Flip Card"}</span>
                </button>
              </div>

              {/* ── CARD CANVAS CONTAINER (9x6 cm Standard Ratio = 1.5) ── */}
              <div className="w-full max-w-[470px] perspective-1000">
                <div
                  ref={cardRef}
                  className="relative w-full aspect-[9/6] rounded-2xl sm:rounded-3xl shadow-2xl transition-all duration-700 preserve-3d"
                  style={{
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transformStyle: "preserve-3d",
                    WebkitTransformStyle: "preserve-3d",
                  }}
                >
                  {/* ── FRONT FACE (FREEFORM DRAGGABLE CANVAS) ── */}
                  <div
                    ref={frontFaceRef}
                    onClick={() => setSelectedElementId(null)}
                    className="absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden p-4 sm:p-6 lg:p-8 backface-hidden border border-white/10 shadow-2xl select-none transition-colors duration-500"
                    dir="ltr"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      ...(selectedBg === "custom" && customBgDataUrl
                        ? {
                          backgroundImage: `url(${customBgDataUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                        : selectedBg === "custom_solid_color"
                          ? { backgroundColor: customSolidBgColor }
                          : currentBgPreset?.style || { background: "#111827" }),
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(0deg)",
                    }}
                  >
                    {/* Subtle glossy sheen reflection */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />

                    {/* ── 1. CUSTOM IMAGE / LOGO ELEMENT (SLOT 1) ── */}
                    {elementsVisibility.logo && logoDataUrl && (
                      <div
                        data-element-id="logo"
                        onMouseDown={(e) => startDrag("logo", e)}
                        onTouchStart={(e) => startDrag("logo", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("logo");
                          setActiveTab("logo");
                        }}
                        style={{
                          left: `${elementsPos.logo.x}%`,
                          top: `${elementsPos.logo.y}%`,
                          transform: "translate(-50%, -50%)",
                          width: `${logoSize}px`,
                        }}
                        className={`absolute z-20 group transition-shadow select-none touch-none ${selectedElementId === "logo"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl p-1.5 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl p-1 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "logo" && (
                          <div className={`absolute ${(elementsPos.logo.y ?? 18) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">{isArabic ? "صورة 1" : "Image 1"}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement("logo");
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer flex items-center gap-0.5"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("logo");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف الصورة" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}

                        <img
                          src={logoDataUrl}
                          alt="Custom Logo"
                          className="w-full h-auto object-contain pointer-events-none"
                          style={{
                            filter:
                              logoFilter === "white"
                                ? "brightness(0) invert(1)"
                                : logoFilter === "black"
                                  ? "brightness(0)"
                                  : logoFilter === "gold"
                                    ? "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.1)"
                                    : "none",
                          }}
                        />
                      </div>
                    )}

                    {/* ── 1B. CUSTOM IMAGE / LOGO 2 ELEMENT (SLOT 2) ── */}
                    {elementsVisibility.logo2 && logo2DataUrl && (
                      <div
                        data-element-id="logo2"
                        onMouseDown={(e) => startDrag("logo2", e)}
                        onTouchStart={(e) => startDrag("logo2", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("logo2");
                          setActiveTab("logo");
                        }}
                        style={{
                          left: `${elementsPos.logo2?.x ?? 16}%`,
                          top: `${elementsPos.logo2?.y ?? 18}%`,
                          transform: "translate(-50%, -50%)",
                          width: `${logo2Size}px`,
                        }}
                        className={`absolute z-20 group transition-shadow select-none touch-none ${selectedElementId === "logo2"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl p-1.5 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl p-1 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "logo2" && (
                          <div className={`absolute ${(elementsPos.logo2?.y ?? 18) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">{isArabic ? "صورة 2" : "Image 2"}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement("logo2");
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer flex items-center gap-0.5"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("logo2");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف الصورة" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}

                        <img
                          src={logo2DataUrl}
                          alt="Custom Logo 2"
                          className="w-full h-auto object-contain pointer-events-none"
                          style={{
                            filter:
                              logo2Filter === "white"
                                ? "brightness(0) invert(1)"
                                : logo2Filter === "black"
                                  ? "brightness(0)"
                                  : logo2Filter === "gold"
                                    ? "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.1)"
                                    : "none",
                          }}
                        />
                      </div>
                    )}

                    {/* ── 2. BRANDMARK (THENITH) ELEMENT ── */}
                    {selectedBg !== "custom" && elementsVisibility.brand && (
                      <div
                        data-element-id="brand"
                        onMouseDown={(e) => startDrag("brand", e)}
                        onTouchStart={(e) => startDrag("brand", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("brand");
                        }}
                        style={{
                          left: `${elementsPos.brand.x}%`,
                          top: `${elementsPos.brand.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute z-20 group transition-shadow select-none touch-none ${selectedElementId === "brand"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl px-2.5 py-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl px-1.5 py-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "brand" && (
                          <div className={`absolute ${(elementsPos.brand.y ?? 18) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">Thenith</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("brand");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}

                        <span
                          className={`font-extrabold text-xs sm:text-sm tracking-tight font-['Outfit'] drop-shadow ${isLightBg ? "text-slate-900" : "text-white"
                            }`}
                        >
                          Thenith
                        </span>
                      </div>
                    )}

                    {/* ── 3. NAME ELEMENT ── */}
                    {elementsVisibility.name && cardName.trim() && (
                      <div
                        data-element-id="name"
                        onMouseDown={(e) => startDrag("name", e)}
                        onTouchStart={(e) => startDrag("name", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("name");
                          setActiveTab("text");
                        }}
                        style={{
                          left: `${elementsPos.name.x}%`,
                          top: `${elementsPos.name.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute z-20 group transition-shadow select-none max-w-[90%] touch-none ${selectedElementId === "name"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl px-3 py-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl px-2 py-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "name" && (
                          <div className={`absolute ${(elementsPos.name.y ?? 50) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">{isArabic ? "الاسم" : "Name"}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement("name");
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer flex items-center gap-0.5"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("name");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف الاسم" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}

                        <h3
                          className="font-bold tracking-tight select-none drop-shadow-lg leading-tight break-words text-center"
                          style={{
                            fontFamily: getFontFamily(nameFont),
                            color: nameColor || textColor,
                            fontSize: `${nameSize}px`,
                          }}
                        >
                          {cardName}
                        </h3>
                      </div>
                    )}

                    {/* ── 4. JOB TITLE ELEMENT ── */}
                    {elementsVisibility.job && cardJob.trim() && (
                      <div
                        data-element-id="job"
                        onMouseDown={(e) => startDrag("job", e)}
                        onTouchStart={(e) => startDrag("job", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("job");
                          setActiveTab("text");
                        }}
                        style={{
                          left: `${elementsPos.job.x}%`,
                          top: `${elementsPos.job.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute z-20 group transition-shadow select-none max-w-[85%] touch-none ${selectedElementId === "job"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl px-3 py-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl px-2 py-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "job" && (
                          <div className={`absolute ${(elementsPos.job.y ?? 64) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">{isArabic ? "الوظيفة" : "Job"}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement("job");
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer flex items-center gap-0.5"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("job");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف الوظيفة" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}

                        <p
                          className="font-medium select-none opacity-85 drop-shadow leading-snug break-words text-center"
                          style={{
                            fontFamily: getFontFamily(jobFont),
                            color: jobColor || textColor,
                            fontSize: `${jobSize || Math.max(12, nameSize * 0.45)}px`,
                          }}
                        >
                          {cardJob}
                        </p>
                      </div>
                    )}

                    {/* ── 4B. ADDITIONAL CUSTOM TEXT ELEMENTS (نصوص إضافية جديدة قابلة للسحب والتخصيص) ── */}
                    {customTexts.map((item) => (
                      <div
                        key={item.id}
                        data-element-id={item.id}
                        onMouseDown={(e) => startDrag(item.id, e)}
                        onTouchStart={(e) => startDrag(item.id, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(item.id);
                          setActiveTab("text");
                        }}
                        style={{
                          left: `${elementsPos[item.id]?.x ?? item.x}%`,
                          top: `${elementsPos[item.id]?.y ?? item.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute z-20 group transition-shadow select-none max-w-[85%] touch-none ${selectedElementId === item.id
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl px-2.5 py-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl px-2 py-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === item.id && (
                          <div className={`absolute ${((elementsPos[item.id]?.y ?? item.y) < 24) ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold truncate max-w-[120px]">{item.text || (isArabic ? "نص" : "Text")}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement(item.id);
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer flex items-center gap-0.5"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomText(item.id);
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف النص" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}

                        <p
                          className="font-medium select-none drop-shadow leading-snug break-words text-center"
                          style={{
                            fontFamily: getFontFamily(item.font || nameFont),
                            color: item.color || textColor,
                            fontSize: `${item.size || Math.max(12, nameSize * 0.45)}px`,
                          }}
                        >
                          {item.text}
                        </p>
                      </div>
                    ))}

                    {/* ── 5. TAP TO CONNECT ELEMENT ── */}
                    {selectedBg !== "custom" && elementsVisibility.tap && (
                      <div
                        data-element-id="tap"
                        onMouseDown={(e) => startDrag("tap", e)}
                        onTouchStart={(e) => startDrag("tap", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("tap");
                        }}
                        style={{
                          left: `${elementsPos.tap.x}%`,
                          top: `${elementsPos.tap.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute z-20 group transition-shadow select-none touch-none ${selectedElementId === "tap"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl px-2.5 py-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl px-1.5 py-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "tap" && (
                          <div className={`absolute ${(elementsPos.tap.y ?? 88) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">Tap</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("tap");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}

                        <span
                          className={`text-xs sm:text-sm font-medium tracking-tight font-['Outfit'] drop-shadow-sm ${isLightBg ? "text-slate-900/90" : "text-white/90"
                            }`}
                        >
                          Tap to connect
                        </span>
                      </div>
                    )}
                    {/* ── 4C. CUSTOM ICONS & IMAGES ON FRONT FACE ── */}
                    {customIcons.filter((ic) => (ic.face || "front") === "front").map((item) => (
                      <div
                        key={item.id}
                        data-element-id={item.id}
                        onMouseDown={(e) => startDrag(item.id, e)}
                        onTouchStart={(e) => startDrag(item.id, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(item.id);
                        }}
                        style={{
                          left: `${elementsPos[item.id]?.x ?? 50}%`,
                          top: `${elementsPos[item.id]?.y ?? 50}%`,
                          transform: "translate(-50%, -50%)",
                          width: `${item.size || 28}px`,
                          height: `${item.size || 28}px`,
                        }}
                        className={`absolute z-20 group transition-shadow select-none touch-none flex items-center justify-center ${selectedElementId === item.id
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl p-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl p-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === item.id && (
                          <div className={`absolute ${(elementsPos[item.id]?.y ?? 50) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold truncate max-w-[80px]">{item.name || (isArabic ? "أيقونة" : "Icon")}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement(item.id);
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteIcon(item.id);
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}
                        <img
                          src={item.src}
                          alt={item.name}
                          className="w-full h-full object-contain pointer-events-none drop-shadow"
                          style={{
                            filter:
                              item.colorFilter === "white"
                                ? "brightness(0) invert(1)"
                                : item.colorFilter === "black"
                                  ? "brightness(0)"
                                  : item.colorFilter === "gold"
                                    ? "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.1)"
                                    : "none",
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* ── BACK FACE (Matching dynamic front background) ── */}
                  <div
                    ref={backFaceRef}
                    onClick={() => setSelectedElementId(null)}
                    className="absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden rotate-y-180 backface-hidden border border-white/10 shadow-2xl select-none transition-colors duration-500"
                    dir="ltr"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      ...(selectedBg === "custom" && (customBackBgDataUrl || customBgDataUrl)
                        ? {
                          backgroundImage: `url(${customBackBgDataUrl || customBgDataUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                        : selectedBg === "custom_solid_color"
                          ? { backgroundColor: customSolidBgColor }
                          : currentBgPreset?.style || { background: "#02040b" }),
                      transform: "rotateY(180deg)",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                  >
                    {/* Subtle glossy sheen reflection */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />

                    {/* Back Main Title (Draggable) */}
                    {showBackTitle && (
                      <div
                        data-element-id="backTitle"
                        onMouseDown={(e) => startDrag("backTitle", e)}
                        onTouchStart={(e) => startDrag("backTitle", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("backTitle");
                        }}
                        style={{
                          left: `${elementsPos.backTitle?.x ?? 28}%`,
                          top: `${elementsPos.backTitle?.y ?? 20}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute z-20 group transition-shadow select-none max-w-[85%] touch-none ${selectedElementId === "backTitle"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl px-2.5 py-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl px-2 py-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "backTitle" && (
                          <div className={`absolute ${(elementsPos.backTitle?.y ?? 20) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">{isArabic ? "العنوان" : "Title"}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement("backTitle");
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("backTitle");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}
                        <span
                          className="font-semibold tracking-wide drop-shadow-sm whitespace-nowrap"
                          style={{
                            fontFamily: getFontFamily(backTitleFont),
                            color: backTitleColor || (isLightBg ? "#0f172a" : "#ffffff"),
                            fontSize: `${backTitleSize}px`,
                          }}
                        >
                          {backTitle}
                        </span>
                      </div>
                    )}

                    {/* QR Code (Draggable) */}
                    {showBackQr && (
                      <div
                        data-element-id="backQr"
                        onMouseDown={(e) => startDrag("backQr", e)}
                        onTouchStart={(e) => startDrag("backQr", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("backQr");
                        }}
                        style={{
                          left: `${elementsPos.backQr?.x ?? 75}%`,
                          top: `${elementsPos.backQr?.y ?? 50}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute z-20 group transition-shadow select-none touch-none ${selectedElementId === "backQr"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent rounded-3xl p-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 rounded-3xl p-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "backQr" && (
                          <div className={`absolute ${(elementsPos.backQr?.y ?? 50) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">QR</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement("backQr");
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("backQr");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}
                        <div className="bg-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl flex items-center justify-center border border-black/5 ring-1 ring-black/5 pointer-events-none">
                          <QRCodeSVG
                            value={backQrValue || "https://thenith.com"}
                            size={88}
                            className="w-16 h-16 sm:w-20 sm:h-20"
                            level="M"
                            fgColor={qrColor || "#000000"}
                          />
                        </div>
                      </div>
                    )}

                    {/* Back Custom Texts (Draggable) */}
                    {backCustomTexts.map((item, index) => (
                      <div
                        key={item.id}
                        data-element-id={item.id}
                        onMouseDown={(e) => startDrag(item.id, e)}
                        onTouchStart={(e) => startDrag(item.id, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(item.id);
                        }}
                        style={{
                          left: `${elementsPos[item.id]?.x ?? item.x ?? 28}%`,
                          top: `${elementsPos[item.id]?.y ?? item.y ?? (38 + index * 12)}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute z-20 group transition-shadow select-none max-w-[85%] touch-none ${selectedElementId === item.id
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl px-2.5 py-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl px-2 py-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === item.id && (
                          <div className={`absolute ${(elementsPos[item.id]?.y ?? 50) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold truncate max-w-[100px]">{item.text || (isArabic ? "نص" : "Text")}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement(item.id);
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBackCustomText(item.id);
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}
                        <span
                          className="font-medium drop-shadow-sm whitespace-nowrap"
                          style={{
                            fontFamily: getFontFamily(item.font || backTitleFont),
                            color: item.color || backTitleColor || (isLightBg ? "#0f172a" : "#ffffff"),
                            fontSize: `${item.size || 12}px`,
                          }}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}

                    {/* Custom Icons on Back Face (Draggable) */}
                    {customIcons.filter((ic) => ic.face === "back").map((item) => (
                      <div
                        key={item.id}
                        data-element-id={item.id}
                        onMouseDown={(e) => startDrag(item.id, e)}
                        onTouchStart={(e) => startDrag(item.id, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(item.id);
                        }}
                        style={{
                          left: `${elementsPos[item.id]?.x ?? 50}%`,
                          top: `${elementsPos[item.id]?.y ?? 50}%`,
                          transform: "translate(-50%, -50%)",
                          width: `${item.size || 28}px`,
                          height: `${item.size || 28}px`,
                        }}
                        className={`absolute z-20 group transition-shadow select-none touch-none flex items-center justify-center ${selectedElementId === item.id
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl p-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl p-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === item.id && (
                          <div className={`absolute ${(elementsPos[item.id]?.y ?? 50) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold truncate max-w-[80px]">{item.name || (isArabic ? "أيقونة" : "Icon")}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement(item.id);
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteIcon(item.id);
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}
                        <img
                          src={item.src}
                          alt={item.name}
                          className="w-full h-full object-contain pointer-events-none drop-shadow"
                          style={{
                            filter:
                              item.colorFilter === "white"
                                ? "brightness(0) invert(1)"
                                : item.colorFilter === "black"
                                  ? "brightness(0)"
                                  : item.colorFilter === "gold"
                                    ? "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.1)"
                                    : "none",
                          }}
                        />
                      </div>
                    ))}

                    {/* Bottom Subtitle (Draggable) */}
                    {showBackSubtitle && (
                      <div
                        data-element-id="backSubtitle"
                        onMouseDown={(e) => startDrag("backSubtitle", e)}
                        onTouchStart={(e) => startDrag("backSubtitle", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("backSubtitle");
                        }}
                        style={{
                          left: `${elementsPos.backSubtitle?.x ?? 28}%`,
                          top: `${elementsPos.backSubtitle?.y ?? 82}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute z-20 group transition-shadow select-none max-w-[85%] touch-none ${selectedElementId === "backSubtitle"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl px-2.5 py-1 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl px-2 py-0.5 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "backSubtitle" && (
                          <div className={`absolute ${(elementsPos.backSubtitle?.y ?? 82) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">{isArabic ? "النص السفلي" : "Subtitle"}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement("backSubtitle");
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("backSubtitle");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}
                        <span
                          className="font-bold tracking-tight drop-shadow-sm whitespace-nowrap"
                          style={{
                            fontFamily: getFontFamily(backSubtitleFont),
                            color: backSubtitleColor || (isLightBg ? "#0f172a" : "#ffffff"),
                            fontSize: `${backSubtitleSize}px`,
                          }}
                        >
                          {backSubtitle}
                        </span>
                      </div>
                    )}

                    {/* Back Logo 1 (Draggable on Back Face) */}
                    {elementsVisibility.backLogo && backLogoDataUrl && (
                      <div
                        data-element-id="backLogo"
                        onMouseDown={(e) => startDrag("backLogo", e)}
                        onTouchStart={(e) => startDrag("backLogo", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("backLogo");
                        }}
                        style={{
                          left: `${elementsPos.backLogo?.x ?? 28}%`,
                          top: `${elementsPos.backLogo?.y ?? 50}%`,
                          transform: "translate(-50%, -50%)",
                          width: `${backLogoSize}px`,
                        }}
                        className={`absolute z-20 group transition-shadow select-none touch-none ${selectedElementId === "backLogo"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl p-1.5 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl p-1 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "backLogo" && (
                          <div className={`absolute ${(elementsPos.backLogo?.y ?? 50) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">{isArabic ? "صورة 1 (الظهر)" : "Back Image 1"}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement("backLogo");
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer flex items-center gap-0.5"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("backLogo");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}
                        <img
                          src={backLogoDataUrl}
                          alt="Back Logo 1"
                          className="w-full h-auto object-contain pointer-events-none"
                          style={{
                            filter:
                              backLogoFilter === "white"
                                ? "brightness(0) invert(1)"
                                : backLogoFilter === "black"
                                  ? "brightness(0)"
                                  : backLogoFilter === "gold"
                                    ? "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.1)"
                                    : "none",
                          }}
                        />
                      </div>
                    )}

                    {/* Back Logo 2 (Draggable on Back Face) */}
                    {elementsVisibility.backLogo2 && backLogo2DataUrl && (
                      <div
                        data-element-id="backLogo2"
                        onMouseDown={(e) => startDrag("backLogo2", e)}
                        onTouchStart={(e) => startDrag("backLogo2", e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId("backLogo2");
                        }}
                        style={{
                          left: `${elementsPos.backLogo2?.x ?? 50}%`,
                          top: `${elementsPos.backLogo2?.y ?? 50}%`,
                          transform: "translate(-50%, -50%)",
                          width: `${backLogo2Size}px`,
                        }}
                        className={`absolute z-20 group transition-shadow select-none touch-none ${selectedElementId === "backLogo2"
                          ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent bg-indigo-500/10 rounded-xl p-1.5 shadow-2xl"
                          : "hover:ring-1 hover:ring-indigo-400/60 hover:bg-white/5 rounded-xl p-1 cursor-grab active:cursor-grabbing"
                          }`}
                      >
                        {selectedElementId === "backLogo2" && (
                          <div className={`absolute ${(elementsPos.backLogo2?.y ?? 50) < 24 ? "-bottom-7" : "-top-7"} left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 border border-indigo-500/80 rounded-full px-2.5 py-0.5 shadow-xl text-[10px] text-white z-30 whitespace-nowrap`}>
                            <Move className="w-3 h-3 text-indigo-400" />
                            <span className="font-bold">{isArabic ? "صورة 2 (الظهر)" : "Back Image 2"}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCenterElement("backLogo2");
                              }}
                              className="hover:text-indigo-300 p-0.5 transition-colors cursor-pointer flex items-center gap-0.5"
                              title={isArabic ? "توسيط" : "Center"}
                            >
                              <AlignCenter className="w-3 h-3 text-indigo-300" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement("backLogo2");
                              }}
                              className="hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title={isArabic ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                            </button>
                          </div>
                        )}
                        <img
                          src={backLogo2DataUrl}
                          alt="Back Logo 2"
                          className="w-full h-auto object-contain pointer-events-none"
                          style={{
                            filter:
                              backLogo2Filter === "white"
                                ? "brightness(0) invert(1)"
                                : backLogo2Filter === "black"
                                  ? "brightness(0)"
                                  : backLogo2Filter === "gold"
                                    ? "sepia(1) hue-rotate(5deg) saturate(5) brightness(1.1)"
                                    : "none",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── INTERACTIVE CANVAS CONTROLS (تتحرك مع السكرول ولا تثبت مع الكارت) ── */}
            <div className="w-full max-w-[470px] mt-2 mb-1 px-1">
              <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Move className="w-3.5 h-3.5 text-indigo-500" />
                  {isArabic
                    ? "انقر واسحب أي عنصر بحرية داخل الكارت أو حدده لحذفه"
                    : "Drag any element freely across card, or click to select & delete"}
                </span>
              </div>
            </div>

            {/* ── BACKGROUND CONTROLS TABS (خلفيات جاهزة & شريط الألوان الصريحة) ── */}
            <div className="w-full max-w-[470px] mt-2.5">
              <div className="relative p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-md">
                {/* Tabs Switcher: خلفيات جاهزة | لون | رفع كارت (وش وضهر) */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setBgSubTab("presets")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${bgSubTab === "presets"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-white/10"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                  >
                    <span>{isArabic ? "خلفيات جاهزة" : "Ready"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgSubTab("pure_color")}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${bgSubTab === "pure_color"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-white/10"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15 dark:border-white/20"
                      style={{ backgroundColor: customSolidBgColor }}
                    />
                    <span>{isArabic ? "اختيار لون" : "Color"}</span>
                  </button>
                </div>

                {/* TAB 1: خلفيات جاهزة (Square Presets - 2 Compact Rows of 6) */}
                {bgSubTab === "presets" && (
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {isArabic ? "اختر خامة أو تصميم جاهز للكارت" : "Select a signature card finish"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {BACKGROUND_PRESETS.length} {isArabic ? "خلفية" : "designs"}
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                      {BACKGROUND_PRESETS.map((preset) => {
                        const isSelected = selectedBg === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedBg(preset.id)}
                            className={`group relative flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer aspect-square overflow-hidden ${isSelected
                              ? "border-indigo-500 ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-slate-800/80 shadow-md scale-105 z-10"
                              : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:scale-102"
                              }`}
                            title={isArabic ? preset.nameAr : preset.nameEn}
                          >
                            <div
                              className="w-full h-full relative"
                              style={preset.style}
                            >
                              {isSelected && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-white drop-shadow font-bold" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: شريط الألوان الصريحة (اسحب يمين وشمال) */}
                {bgSubTab === "pure_color" && (
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0 border border-black/15 dark:border-white/20"
                          style={{ backgroundColor: customSolidBgColor }}
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {isArabic ? "اسحب يمين وشمال لتغيير اللون" : "Drag slider left & right"}
                        </span>
                      </div>
                    </div>

                    {/* Main Continuous Explicit Rainbow Slider */}
                    <div className="relative w-full py-0.5">
                      <div
                        ref={hueBarRef}
                        onMouseDown={handleHueMouseDown}
                        onTouchStart={handleHueMouseDown}
                        className="relative w-full h-6 sm:h-7 rounded-full cursor-pointer shadow-inner border border-black/20 dark:border-white/20 select-none touch-none"
                        style={{
                          background:
                            "linear-gradient(to right, #ff0000 0%, #ff8000 12%, #ffff00 24%, #00ff00 38%, #00ffff 50%, #0066ff 64%, #8000ff 78%, #ff007f 90%, #ff0000 100%)",
                        }}
                      >
                        {/* Interactive Draggable Thumb */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-3 border-white dark:border-slate-900 shadow-xl pointer-events-none flex items-center justify-center transition-transform active:scale-115"
                          style={{
                            left: `${(hsv.h / 360) * 100}%`,
                            backgroundColor: customSolidBgColor,
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Pure Explicit Color Swatches */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                        {PURE_EXPLICIT_COLORS.map((c) => {
                          const isSelected =
                            selectedBg === "custom_solid_color" &&
                            customSolidBgColor.toLowerCase() === c.hex.toLowerCase();
                          return (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => {
                                setCustomSolidBgColor(c.hex);
                                setSelectedBg("custom_solid_color");
                                setHsv(hexToHsv(c.hex));
                              }}
                              title={isArabic ? c.labelAr : c.hex}
                              className={`group relative w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full transition-all duration-200 cursor-pointer ${isSelected
                                ? "scale-115 ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-md z-10"
                                : "hover:scale-110 hover:-translate-y-0.5 opacity-90 hover:opacity-100"
                                }`}
                              style={{
                                backgroundColor: c.hex,
                                border: c.hex === "#ffffff" ? "1.5px solid #cbd5e1" : "1.5px solid rgba(255,255,255,0.25)",
                                boxShadow: isSelected ? "0 4px 12px rgba(0,0,0,0.35)" : "0 2px 4px rgba(0,0,0,0.12)",
                              }}
                            >
                              {isSelected && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <Check
                                    className={`w-3.5 h-3.5 drop-shadow ${c.hex === "#ffffff" || c.hex === "#ffea00" || c.hex === "#00d4ff"
                                      ? "text-slate-950 font-black"
                                      : "text-white font-bold"
                                      }`}
                                  />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Customization Controls ── */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-6 lg:p-8 backdrop-blur-xl shadow-xl dark:shadow-2xl transition-colors">
            <div className="space-y-6">
              {!isFlipped ? (
                <div className="space-y-8 animate-fadeIn">
                  {/* SECTION 1: TEXT & TYPOGRAPHY */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {isArabic ? "الوجه الأمامي للبطاقة" : "Card Front Face"}
                      </h3>
                    </div>

                    {/* Name Input */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isArabic ? "الاسم (اختياري)" : "Name on Card (Optional)"}
                        </label>
                        <div className="flex items-center gap-1.5">
                          {elementsVisibility.name ? (
                            <button
                              type="button"
                              onClick={() => deleteElement("name")}
                              className="text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                              title={isArabic ? "حذف الاسم من الكارت" : "Hide/Delete Name"}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{isArabic ? "حذف" : "Delete"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => restoreElement("name")}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{isArabic ? " إظهار" : "Restore"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        maxLength={40}
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="THENITH"
                        className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      {/* Independent Color & Size for Name */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              {isArabic ? "اللون:" : "Name Color:"}
                            </span>
                          </div>
                          <MiniColorSwatchPicker
                            value={nameColor || textColor}
                            onChange={setNameColor}
                            isArabic={isArabic}
                          />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                            {isArabic ? "الحجم:" : "Size:"} {nameSize}px
                          </span>
                          <input
                            type="range"
                            min={12}
                            max={80}
                            value={nameSize}
                            onChange={(e) => setNameSize(Number(e.target.value))}
                            className="flex-1 accent-indigo-500 cursor-pointer h-1.5"
                          />
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            {isArabic ? "نوع الخط:" : "Font:"}
                          </span>
                          <FontPickerSelect
                            value={nameFont}
                            onChange={setNameFont}
                            isArabic={isArabic}
                          />
                        </div>
                      </div>
                      {/* Alignment & Position Controls */}
                      <TextAlignAndPositionControl
                        id="name"
                        align={elementsPos.name?.x === 50 ? "center" : (elementsPos.name?.x ?? 50) > 50 ? "right" : "left"}
                        isArabic={isArabic}
                        onAlign={handleSetTextAlign}
                        onNudgeY={handleNudgeY}
                      />
                    </div>

                    {/* Job Title Input */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isArabic ? "الوظيفة" : "Job Title "}
                        </label>
                        <div className="flex items-center gap-1.5">
                          {elementsVisibility.job ? (
                            <button
                              type="button"
                              onClick={() => deleteElement("job")}
                              className="text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                              title={isArabic ? "حذف الوظيفة من الكارت" : "Hide/Delete Job"}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{isArabic ? "حذف" : "Delete"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => restoreElement("job")}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{isArabic ? "إظهار" : "Restore"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        maxLength={60}
                        value={cardJob}
                        onChange={(e) => setCardJob(e.target.value)}
                        placeholder={isArabic ? " CEO" : "CEO"}
                        className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      {/* Independent Color & Size for Job */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              {isArabic ? "اللون :" : "Color:"}
                            </span>
                          </div>
                          <MiniColorSwatchPicker
                            value={jobColor || textColor}
                            onChange={setJobColor}
                            isArabic={isArabic}
                          />
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                            {isArabic ? "الحجم:" : "Size:"} {jobSize}px
                          </span>
                          <input
                            type="range"
                            min={10}
                            max={50}
                            value={jobSize}
                            onChange={(e) => setJobSize(Number(e.target.value))}
                            className="flex-1 accent-indigo-500 cursor-pointer h-1.5"
                          />
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            {isArabic ? "نوع الخط:" : "Font:"}
                          </span>
                          <FontPickerSelect
                            value={jobFont}
                            onChange={setJobFont}
                            isArabic={isArabic}
                          />
                        </div>
                      </div>
                      {/* Alignment & Position Controls */}
                      <TextAlignAndPositionControl
                        id="job"
                        align={elementsPos.job?.x === 50 ? "center" : (elementsPos.job?.x ?? 50) > 50 ? "right" : "left"}
                        isArabic={isArabic}
                        onAlign={handleSetTextAlign}
                        onNudgeY={handleNudgeY}
                      />
                    </div>

                    {/* Additional Custom Texts Section */}
                    {customTexts.length > 0 && (
                      <div className="space-y-3 pt-1">
                        {customTexts.map((item, index) => (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-2xl border transition-all ${selectedElementId === item.id
                              ? "bg-indigo-50/50 dark:bg-slate-900/90 border-indigo-400 dark:border-indigo-500/50 shadow-sm"
                              : "bg-slate-50/80 dark:bg-slate-950/80 border-slate-200/90 dark:border-slate-800"
                              }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {isArabic ? `نص إضافي (${index + 1})` : `Custom Text (${index + 1})`}
                                </label>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomText(item.id)}
                                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                                  title={isArabic ? "حذف النص" : "Delete"}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>{isArabic ? "حذف" : "Delete"}</span>
                                </button>
                              </div>
                            </div>

                            <input
                              type="text"
                              maxLength={60}
                              value={item.text}
                              onChange={(e) => handleUpdateCustomText(item.id, "text", e.target.value)}
                              onFocus={() => setSelectedElementId(item.id)}
                              placeholder={isArabic ? "اكتب النص الإضافي هنا..." : "Enter custom text..."}
                              className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />

                            {/* Per-text color & size controls */}
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2 mt-2">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                    {isArabic ? "لون النص:" : "Text Color:"}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                                  </span>
                                </div>
                                <MiniColorSwatchPicker
                                  value={item.color || textColor}
                                  onChange={(val) => handleUpdateCustomText(item.id, "color", val)}
                                  isArabic={isArabic}
                                />
                              </div>
                              <div className="flex items-center gap-2.5 px-0.5">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
                                  {isArabic ? "حجم النص:" : "Size:"} {item.size || 16}px
                                </span>
                                <input
                                  type="range"
                                  min={10}
                                  max={60}
                                  value={item.size || 16}
                                  onChange={(e) => handleUpdateCustomText(item.id, "size", Number(e.target.value))}
                                  className="flex-1 accent-indigo-500 cursor-pointer h-1.5"
                                />
                              </div>
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                  {isArabic ? "نوع الخط:" : "Font:"}
                                </span>
                                <FontPickerSelect
                                  value={item.font || nameFont || "Cairo"}
                                  onChange={(val) => handleUpdateCustomText(item.id, "font", val)}
                                  isArabic={isArabic}
                                />
                              </div>
                            </div>

                            {/* Alignment & Position Controls */}
                            <TextAlignAndPositionControl
                              id={item.id}
                              align={elementsPos[item.id]?.x === 50 ? "center" : (elementsPos[item.id]?.x ?? item.x ?? 50) > 50 ? "right" : "left"}
                              isArabic={isArabic}
                              onAlign={handleSetTextAlign}
                              onNudgeY={handleNudgeY}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add New Text Secondary Action Button */}
                    <div>
                      <button
                        type="button"
                        onClick={handleAddCustomText}
                        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isArabic ? " إضافة نص جديد" : "Add New Text "}</span>
                      </button>
                    </div>

                    {/* Master Text Color Selection (توحيد لون كافة النصوص) */}
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/50 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <label className="block text-xs font-bold text-slate-900 dark:text-white">
                              {isArabic ? "توحيد كل الوان النصوص" : "Standardizing all text colors"}
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="w-full grid grid-cols-10 gap-1 sm:gap-2 p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 place-items-center overflow-hidden">
                        {TEXT_COLORS.map((color) => {
                          const active = textColor.toLowerCase() === color.value.toLowerCase();
                          return (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => handleApplyGlobalTextColor(color.value)}
                              title={isArabic ? `${color.nameAr} - اضغط لتوحيد ألوان كافة النصوص` : `${color.nameEn} - Click to unify all texts`}
                              className={`w-full max-w-[32px] aspect-square rounded-full transition-all cursor-pointer flex items-center justify-center ${active
                                ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 shadow-md z-10"
                                : "hover:scale-105 opacity-85 hover:opacity-100"
                                }`}
                              style={{
                                backgroundColor: color.value,
                                border: color.border || "1px solid rgba(120,120,120,0.25)",
                                boxShadow: color.glow ? `0 0 10px ${color.glow}` : undefined,
                              }}
                            >
                              {active && (
                                <Check
                                  className={`w-3.5 h-3.5 drop-shadow ${color.value === "#ffffff" || color.value === "#e2e8f0" || color.value === "#38bdf8"
                                    ? "text-slate-900 font-black"
                                    : "text-white font-bold"
                                    }`}
                                />
                              )}
                            </button>
                          );
                        })}

                        {/* Custom Color Circle Swatch - Unifies all text colors */}
                        <label
                          title={isArabic ? "اختيار لون مخصص وتوحيده لكافة النصوص" : "Pick Custom Color and unify all"}
                          className="relative w-full max-w-[32px] aspect-square rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 flex items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-800 transition-all hover:scale-105"
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shadow-inner"
                            style={{ backgroundColor: textColor }}
                          />
                          <input
                            type="color"
                            value={textColor}
                            onChange={(e) => handleApplyGlobalTextColor(e.target.value)}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>

                  </div>

                  {/* SECTION 2: PHOTO / IMAGE UPLOAD (MAX 2) */}
                  <div className="space-y-5 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between pb-1">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        <span>{isArabic ? "رفع الصور والشعار" : "Photos & Logos"}</span>
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                        {isArabic
                          ? `الصور: ${Number(Boolean(logoDataUrl)) + Number(Boolean(logo2DataUrl))} من 2`
                          : `Images: ${Number(Boolean(logoDataUrl)) + Number(Boolean(logo2DataUrl))} / 2`}
                      </span>
                    </div>

                    {/* Upload Buttons when count < 2 */}
                    {(!logoDataUrl || !logo2DataUrl) && (
                      <div>
                        <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-950 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all cursor-pointer">
                          <Upload className="w-6 h-6 text-indigo-500 dark:text-indigo-400 mb-1.5" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {!logoDataUrl
                              ? (isArabic ? "انقر لرفع الصورة أو الشعار الأول" : "Click to upload first image/logo")
                              : (isArabic ? "انقر لرفع صورة / شعار إضافي (2 من 2)" : "Click to upload second image/logo (2/2)")}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, !logoDataUrl ? "logo" : "logo2")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {/* Slot 1 Controls */}
                    {logoDataUrl && (
                      <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {isArabic ? "الصورة الأولى" : "Image 1"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                              {isArabic ? "تغيير" : "Change"}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, "logo")}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => deleteElement("logo")}
                              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {isArabic ? "حذف" : "Remove"}
                            </button>
                          </div>
                        </div>

                        {/* Position */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              {isArabic ? "موضع الصورة الأولى (أو اسحبها بحرية على الكارت)" : "Position (or drag freely)"}
                            </label>
                            {!elementsVisibility.logo ? (
                              <button
                                type="button"
                                onClick={() => restoreElement("logo")}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{isArabic ? "إظهار" : "Show"}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setElementsVisibility((p) => ({ ...p, logo: false }))}
                                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{isArabic ? "إخفاء" : "Hide"}</span>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { id: "top-right", label: isArabic ? "أعلى اليمين" : "Top Right", x: 84, y: 18 },
                              { id: "top-left", label: isArabic ? "أعلى اليسار" : "Top Left", x: 16, y: 18 },
                              { id: "center", label: isArabic ? "في المنتصف" : "Center", x: 50, y: 50 },
                              { id: "bottom-right", label: isArabic ? "أسفل اليمين" : "Bottom Right", x: 84, y: 82 },
                            ].map((pos) => (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => {
                                  setLogoPosition(pos.id);
                                  setElementsPos((prev) => ({
                                    ...prev,
                                    logo: { x: pos.x, y: pos.y },
                                  }));
                                }}
                                className={`py-1.5 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${logoPosition === pos.id
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent"
                                  }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Image Size */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              {isArabic ? "حجم الصورة الأولى" : "Size"}
                            </label>
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{logoSize}px</span>
                          </div>
                          <input
                            type="range"
                            min={20}
                            max={250}
                            value={Math.min(logoSize, 250)}
                            onChange={(e) => setLogoSize(Number(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>

                        {/* Filter */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                            {isArabic ? "تأثير اللون" : "Color Effect"}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { id: "none", label: isArabic ? "الأصلي" : "Original" },
                              { id: "white", label: isArabic ? "أبيض ناصع" : "White" },
                              { id: "black", label: isArabic ? "أسود مطفي" : "Black" },
                              { id: "gold", label: isArabic ? "تأثير ذهبي" : "Golden" },
                            ].map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setLogoFilter(m.id)}
                                className={`py-1 text-center rounded-lg text-[11px] font-bold transition-all cursor-pointer ${logoFilter === m.id
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent"
                                  }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Slot 2 Controls */}
                    {logo2DataUrl && (
                      <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {isArabic ? "الصورة الثانية" : "Image 2"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                              {isArabic ? "تغيير" : "Change"}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, "logo2")}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => deleteElement("logo2")}
                              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {isArabic ? "حذف" : "Remove"}
                            </button>
                          </div>
                        </div>

                        {/* Position */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              {isArabic ? "موضع الصورة الثانية (أو اسحبها بحرية على الكارت)" : "Position (or drag freely)"}
                            </label>
                            {!elementsVisibility.logo2 ? (
                              <button
                                type="button"
                                onClick={() => restoreElement("logo2")}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{isArabic ? "إظهار" : "Show"}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setElementsVisibility((p) => ({ ...p, logo2: false }))}
                                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{isArabic ? "إخفاء" : "Hide"}</span>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { id: "top-left", label: isArabic ? "أعلى اليسار" : "Top Left", x: 16, y: 18 },
                              { id: "top-right", label: isArabic ? "أعلى اليمين" : "Top Right", x: 84, y: 18 },
                              { id: "center", label: isArabic ? "في المنتصف" : "Center", x: 50, y: 50 },
                              { id: "bottom-left", label: isArabic ? "أسفل اليسار" : "Bottom Left", x: 16, y: 82 },
                            ].map((pos) => (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => {
                                  setElementsPos((prev) => ({
                                    ...prev,
                                    logo2: { x: pos.x, y: pos.y },
                                  }));
                                }}
                                className="py-1.5 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent hover:border-indigo-400"
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Image Size */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              {isArabic ? "حجم الصورة الثانية" : "Size"}
                            </label>
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{logo2Size}px</span>
                          </div>
                          <input
                            type="range"
                            min={20}
                            max={250}
                            value={Math.min(logo2Size, 250)}
                            onChange={(e) => setLogo2Size(Number(e.target.value))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>

                        {/* Filter */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                            {isArabic ? "تأثير اللون" : "Color Effect"}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { id: "none", label: isArabic ? "الأصلي" : "Original" },
                              { id: "white", label: isArabic ? "أبيض ناصع" : "White" },
                              { id: "black", label: isArabic ? "أسود مطفي" : "Black" },
                              { id: "gold", label: isArabic ? "تأثير ذهبي" : "Golden" },
                            ].map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setLogo2Filter(m.id)}
                                className={`py-1 text-center rounded-lg text-[11px] font-bold transition-all cursor-pointer ${logo2Filter === m.id
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent"
                                  }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: ICONS (FRONT) */}
                  {renderIconsSection("front")}
                </div>
              ) : (
                <div className="space-y-6 animate-fadeIn">
                  {/* ── BACK SIDE CUSTOMIZATION SECTION ── */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {isArabic ? "الوجه الخلفي للبطاقة" : "Card Back Face"}
                      </h3>
                    </div>

                    {/* QR Code Color & Settings */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          QR Code
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowBackQr(!showBackQr)}
                          className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${showBackQr ? "text-rose-500 hover:text-rose-600" : "text-indigo-600 hover:text-indigo-700"
                            }`}
                        >
                          {showBackQr ? (
                            <>
                              <Trash2 className="w-3 h-3" />
                              <span>{isArabic ? "إخفاء الـ QR" : "Hide QR"}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>{isArabic ? "إظهار الـ QR" : "Show QR"}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {showBackQr && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2.5">
                          {/* Profile Preview Info Box */}
                          <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-[11px] space-y-1.5">
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[10px]">
                              {isArabic
                                ? "رمز الـ QR الحالي في المعاينة يوجّه لصفحة بروفايلك. عند إتمام ودفع الطلب، يتم إنشاء كارتك الفعلي في إدارة كروت Thenith الذكية وتوليد الكود والرابط الفعلي المخصص للطباعة بنفس الموضع واللون المحددين بدقة."
                                : "This preview QR directs to your profile. Upon placing your order, an official smart card is created in Thenith Cards Management and its unique URL will be placed at this exact position and color."}
                            </p>
                            <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900 truncate" dir="ltr">
                              {userProfileUrl}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "لون رمز الـ QR:" : "QR Code Color:"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs"
                                  style={{ backgroundColor: qrColor }}
                                />
                              </div>
                            </div>

                            {/* QR Color Swatches */}
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              {[
                                { hex: "#000000", labelAr: "أسود فاحم" },
                                { hex: "#0f172a", labelAr: "كحلي داكن" },
                                { hex: "#1e1b4b", labelAr: "نيلي فاخر" },
                                { hex: "#4f46e5", labelAr: "أزرق ثينث" },
                                { hex: "#d97706", labelAr: "ذهبي ملكي" },
                                { hex: "#059669", labelAr: "زمردي" },
                                { hex: "#991b1b", labelAr: "عنابي" },
                                { hex: "#475569", labelAr: "رمادي معدني" },
                                { hex: "#ffffff", labelAr: "أبيض" },
                              ].map((c) => (
                                <button
                                  key={c.hex}
                                  type="button"
                                  onClick={() => handleSetManualQrColor(c.hex)}
                                  title={isArabic ? c.labelAr : c.hex}
                                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer relative ${qrColor.toLowerCase() === c.hex.toLowerCase()
                                    ? "scale-110 ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-md"
                                    : "hover:scale-105 opacity-90 hover:opacity-100"
                                    }`}
                                  style={{
                                    backgroundColor: c.hex,
                                    border: c.hex === "#ffffff" ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.2)",
                                  }}
                                >
                                  {qrColor.toLowerCase() === c.hex.toLowerCase() && (
                                    <Check
                                      className={`w-3 h-3 absolute inset-0 m-auto ${c.hex === "#ffffff" ? "text-slate-900" : "text-white"
                                        }`}
                                    />
                                  )}
                                </button>
                              ))}

                              <label
                                className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 bg-gradient-to-tr from-pink-500 via-indigo-500 to-amber-400 flex items-center justify-center cursor-pointer shadow-xs hover:scale-105 transition-transform"
                                title={isArabic ? "لون مخصص" : "Custom color"}
                              >
                                <input
                                  type="color"
                                  value={qrColor}
                                  onChange={(e) => handleSetManualQrColor(e.target.value)}
                                  className="opacity-0 w-0 h-0 pointer-events-none"
                                />
                                <Pipette className="w-3 h-3 text-white drop-shadow" />
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 1. Back Main Title (العنوان الرئيسي لظهر الكارت) */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isArabic ? "العنوان الرئيسي" : "Main Title"}
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowBackTitle(!showBackTitle)}
                          className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${showBackTitle ? "text-rose-500 hover:text-rose-600" : "text-indigo-600 hover:text-indigo-700"
                            }`}
                        >
                          {showBackTitle ? (
                            <>
                              <Trash2 className="w-3 h-3" />
                              <span>{isArabic ? "حذف" : "Hide"}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>{isArabic ? "إظهار" : "Show"}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {showBackTitle && (
                        <>
                          <input
                            type="text"
                            maxLength={50}
                            value={backTitle}
                            onChange={(e) => setBackTitle(e.target.value)}
                            placeholder="Digital Identity Card"
                            className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "لون النص:" : "Text Color:"}
                              </span>
                              <MiniColorSwatchPicker
                                value={backTitleColor || textColor}
                                onChange={setBackTitleColor}
                                isArabic={isArabic}
                              />
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                {isArabic ? "الحجم:" : "Size:"} {backTitleSize}px
                              </span>
                              <input
                                type="range"
                                min={10}
                                max={28}
                                value={backTitleSize}
                                onChange={(e) => setBackTitleSize(Number(e.target.value))}
                                className="flex-1 accent-indigo-500 cursor-pointer h-1.5"
                              />
                            </div>
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "نوع الخط:" : "Font:"}
                              </span>
                              <FontPickerSelect
                                value={backTitleFont}
                                onChange={setBackTitleFont}
                                isArabic={isArabic}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 2. Back Bottom Subtitle / Link (النص السفلي لظهر الكارت) */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isArabic ? "النص السفلي" : "Bottom Subtitle"}
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowBackSubtitle(!showBackSubtitle)}
                          className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${showBackSubtitle ? "text-rose-500 hover:text-rose-600" : "text-indigo-600 hover:text-indigo-700"
                            }`}
                        >
                          {showBackSubtitle ? (
                            <>
                              <Trash2 className="w-3 h-3" />
                              <span>{isArabic ? "حذف" : "Hide"}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>{isArabic ? "إظهار" : "Show"}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {showBackSubtitle && (
                        <>
                          <input
                            type="text"
                            maxLength={60}
                            value={backSubtitle}
                            onChange={(e) => setBackSubtitle(e.target.value)}
                            placeholder="thenith.com"
                            className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "لون النص:" : "Text Color:"}
                              </span>
                              <MiniColorSwatchPicker
                                value={backSubtitleColor || textColor}
                                onChange={setBackSubtitleColor}
                                isArabic={isArabic}
                              />
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                {isArabic ? "الحجم:" : "Size:"} {backSubtitleSize}px
                              </span>
                              <input
                                type="range"
                                min={10}
                                max={28}
                                value={backSubtitleSize}
                                onChange={(e) => setBackSubtitleSize(Number(e.target.value))}
                                className="flex-1 accent-indigo-500 cursor-pointer h-1.5"
                              />
                            </div>
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "نوع الخط:" : "Font:"}
                              </span>
                              <FontPickerSelect
                                value={backSubtitleFont}
                                onChange={setBackSubtitleFont}
                                isArabic={isArabic}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 4. Additional Custom Texts on Back */}
                    {backCustomTexts.length > 0 && (
                      <div className="space-y-3 pt-1">
                        {backCustomTexts.map((item, index) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-2xl border bg-slate-50/80 dark:bg-slate-950/80 border-slate-200/90 dark:border-slate-800 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {isArabic ? `نص إضافي (${index + 1})` : `Back Text (${index + 1})`}
                              </label>
                              <button
                                type="button"
                                onClick={() => handleDeleteBackCustomText(item.id)}
                                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{isArabic ? "حذف" : "Delete"}</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              maxLength={60}
                              value={item.text}
                              onChange={(e) => handleUpdateBackCustomText(item.id, "text", e.target.value)}
                              placeholder={isArabic ? "اكتب النص هنا..." : "Enter text..."}
                              className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                            />
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "لون النص:" : "Color:"}
                              </span>
                              <MiniColorSwatchPicker
                                value={item.color || textColor}
                                onChange={(val) => handleUpdateBackCustomText(item.id, "color", val)}
                                isArabic={isArabic}
                              />
                            </div>
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "نوع الخط:" : "Font:"}
                              </span>
                              <FontPickerSelect
                                value={item.font || backTitleFont || "Cairo"}
                                onChange={(val) => handleUpdateBackCustomText(item.id, "font", val)}
                                isArabic={isArabic}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Master Back Text Color Selection (توحيد ألوان نصوص ظهر الكارت) */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/50 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-xs font-bold text-slate-900 dark:text-white">
                          {isArabic ? "توحيد ألوان نصوص ظهر الكارت" : "Unify Back Text Colors"}
                        </label>

                        {/* Option to include QR or not */}
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                          <input
                            type="checkbox"
                            checked={syncBackQrColor}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setSyncBackQrColor(isChecked);
                              if (isChecked) {
                                if (backTitleColor || textColor) {
                                  setQrColor(backTitleColor || textColor);
                                }
                              } else {
                                setQrColor(lastManualQrColorRef.current || "#000000");
                              }
                            }}
                            className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                          />
                          <span>{isArabic ? "تطبيق مع الـ QR" : "Include QR"}</span>
                        </label>
                      </div>

                      <div className="w-full grid grid-cols-10 gap-1 sm:gap-2 p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 place-items-center overflow-hidden">
                        {TEXT_COLORS.map((color) => {
                          const active = (backTitleColor || textColor || "#ffffff").toLowerCase() === color.value.toLowerCase();
                          return (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => handleApplyBackTextColor(color.value)}
                              title={isArabic ? `${color.nameAr} - اضغط لتوحيد ألوان نصوص ظهر الكارت` : `${color.nameEn} - Click to unify back texts`}
                              className={`w-full max-w-[32px] aspect-square rounded-full transition-all cursor-pointer flex items-center justify-center ${active
                                ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 shadow-md z-10"
                                : "hover:scale-105 opacity-85 hover:opacity-100"
                                }`}
                              style={{
                                backgroundColor: color.value,
                                border: color.border || "1px solid rgba(120,120,120,0.25)",
                                boxShadow: color.glow ? `0 0 10px ${color.glow}` : undefined,
                              }}
                            >
                              {active && (
                                <Check
                                  className={`w-3.5 h-3.5 drop-shadow ${color.value === "#ffffff" || color.value === "#e2e8f0" || color.value === "#38bdf8"
                                    ? "text-slate-900 font-black"
                                    : "text-white font-bold"
                                    }`}
                                />
                              )}
                            </button>
                          );
                        })}

                        {/* Custom Color Circle Swatch */}
                        <label
                          title={isArabic ? "اختيار لون مخصص وتوحيده لكافة نصوص ظهر الكارت" : "Pick custom color for all back texts"}
                          className="relative w-full max-w-[32px] aspect-square rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 flex items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-800 transition-all hover:scale-105"
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shadow-inner"
                            style={{ backgroundColor: backTitleColor || textColor || "#ffffff" }}
                          />
                          <input
                            type="color"
                            value={backTitleColor || textColor || "#ffffff"}
                            onChange={(e) => handleApplyBackTextColor(e.target.value)}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Add New Custom Text on Back Button */}
                    <div>
                      <button
                        type="button"
                        onClick={handleAddBackCustomText}
                        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isArabic ? "إضافة نص جديد على ظهر الكارت" : "Add New Text to Back Face"}</span>
                      </button>
                    </div>

                    {/* ── BACK FACE PHOTOS & LOGOS (MAX 2) ── */}
                    <div className="space-y-4 pt-5 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between pb-1">
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-indigo-500" />
                          <span>{isArabic ? "رفع الصور والشعار لظهر الكارت" : "Back Face Photos & Logos"}</span>
                        </h4>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                          {isArabic
                            ? `الصور: ${Number(Boolean(backLogoDataUrl)) + Number(Boolean(backLogo2DataUrl))} من 2`
                            : `Images: ${Number(Boolean(backLogoDataUrl)) + Number(Boolean(backLogo2DataUrl))} / 2`}
                        </span>
                      </div>

                      {/* Upload button for back face if slots available */}
                      {(!backLogoDataUrl || !backLogo2DataUrl) && (
                        <div>
                          <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-950 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all cursor-pointer">
                            <Upload className="w-6 h-6 text-indigo-500 dark:text-indigo-400 mb-1.5" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {!backLogoDataUrl
                                ? (isArabic ? "انقر لرفع صورة أو شعار على ظهر الكارت" : "Click to upload image on back face")
                                : (isArabic ? "انقر لرفع صورة ثانية على ظهر الكارت (2 من 2)" : "Upload second back image (2/2)")}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, !backLogoDataUrl ? "backLogo" : "backLogo2")}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}

                      {/* Back Slot 1 Controls */}
                      {backLogoDataUrl && (
                        <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {isArabic ? "صورة الظهر الأولى" : "Back Image 1"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                                {isArabic ? "تغيير" : "Change"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, "backLogo")}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => deleteElement("backLogo")}
                                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer font-bold"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> {isArabic ? "حذف" : "Remove"}
                              </button>
                            </div>
                          </div>

                          {/* Position */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "الموضع (أو اسحبها بحرية على ظهر الكارت)" : "Position (or drag freely)"}
                              </label>
                              {!elementsVisibility.backLogo ? (
                                <button
                                  type="button"
                                  onClick={() => restoreElement("backLogo")}
                                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>{isArabic ? "إظهار" : "Show"}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setElementsVisibility((p) => ({ ...p, backLogo: false }))}
                                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>{isArabic ? "إخفاء" : "Hide"}</span>
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {[
                                { id: "left", label: isArabic ? "يسار الـ QR" : "Left of QR", x: 28, y: 50 },
                                { id: "top-left", label: isArabic ? "أعلى الظهر" : "Top Left", x: 28, y: 22 },
                                { id: "bottom-left", label: isArabic ? "أسفل الظهر" : "Bottom Left", x: 28, y: 78 },
                                { id: "center", label: isArabic ? "في المنتصف" : "Center", x: 50, y: 50 },
                              ].map((pos) => (
                                <button
                                  key={pos.id}
                                  type="button"
                                  onClick={() => {
                                    setElementsPos((prev) => ({
                                      ...prev,
                                      backLogo: { x: pos.x, y: pos.y },
                                    }));
                                  }}
                                  className="py-1.5 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent hover:border-indigo-400"
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Size */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "حجم الصورة" : "Size"}
                              </label>
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{backLogoSize}px</span>
                            </div>
                            <input
                              type="range"
                              min={20}
                              max={250}
                              value={Math.min(backLogoSize, 250)}
                              onChange={(e) => setBackLogoSize(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>

                          {/* Filter */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                              {isArabic ? "تأثير اللون" : "Color Effect"}
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {[
                                { id: "none", label: isArabic ? "الأصلي" : "Original" },
                                { id: "white", label: isArabic ? "أبيض ناصع" : "White" },
                                { id: "black", label: isArabic ? "أسود مطفي" : "Black" },
                                { id: "gold", label: isArabic ? "تأثير ذهبي" : "Golden" },
                              ].map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setBackLogoFilter(m.id)}
                                  className={`py-1 text-center rounded-lg text-[11px] font-bold transition-all cursor-pointer ${backLogoFilter === m.id
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent"
                                    }`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Back Slot 2 Controls */}
                      {backLogo2DataUrl && (
                        <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-500" />
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {isArabic ? "صورة الظهر الثانية" : "Back Image 2"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                                {isArabic ? "تغيير" : "Change"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, "backLogo2")}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => deleteElement("backLogo2")}
                                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer font-bold"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> {isArabic ? "حذف" : "Remove"}
                              </button>
                            </div>
                          </div>

                          {/* Position */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "الموضع (أو اسحبها بحرية على ظهر الكارت)" : "Position (or drag freely)"}
                              </label>
                              {!elementsVisibility.backLogo2 ? (
                                <button
                                  type="button"
                                  onClick={() => restoreElement("backLogo2")}
                                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>{isArabic ? "إظهار" : "Show"}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setElementsVisibility((p) => ({ ...p, backLogo2: false }))}
                                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>{isArabic ? "إخفاء" : "Hide"}</span>
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {[
                                { id: "bottom", label: isArabic ? "أسفل الظهر" : "Bottom", x: 28, y: 78 },
                                { id: "top", label: isArabic ? "أعلى الظهر" : "Top", x: 28, y: 22 },
                                { id: "center", label: isArabic ? "في المنتصف" : "Center", x: 50, y: 50 },
                                { id: "right", label: isArabic ? "يمين الـ QR" : "Right", x: 80, y: 80 },
                              ].map((pos) => (
                                <button
                                  key={pos.id}
                                  type="button"
                                  onClick={() => {
                                    setElementsPos((prev) => ({
                                      ...prev,
                                      backLogo2: { x: pos.x, y: pos.y },
                                    }));
                                  }}
                                  className="py-1.5 px-1 text-center rounded-lg text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent hover:border-indigo-400"
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Size */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isArabic ? "حجم الصورة" : "Size"}
                              </label>
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">{backLogo2Size}px</span>
                            </div>
                            <input
                              type="range"
                              min={20}
                              max={250}
                              value={Math.min(backLogo2Size, 250)}
                              onChange={(e) => setBackLogo2Size(Number(e.target.value))}
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>

                          {/* Filter */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                              {isArabic ? "تأثير اللون" : "Color Effect"}
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {[
                                { id: "none", label: isArabic ? "الأصلي" : "Original" },
                                { id: "white", label: isArabic ? "أبيض ناصع" : "White" },
                                { id: "black", label: isArabic ? "أسود مطفي" : "Black" },
                                { id: "gold", label: isArabic ? "تأثير ذهبي" : "Golden" },
                              ].map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setBackLogo2Filter(m.id)}
                                  className={`py-1 text-center rounded-lg text-[11px] font-bold transition-all cursor-pointer ${backLogo2Filter === m.id
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent"
                                    }`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. ICONS ON BACK FACE */}
                    {renderIconsSection("back")}
                  </div>
                </div>
              )}

              {/* Price & Submit Action */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {formatMoney(product?.price || 550, product?.currency || "EGP")}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCartAndOrder}
                  disabled={isGenerating}
                  className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-base shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{isArabic ? "جاري تصدير التصميم فائق الدقة..." : "Processing High-Res File..."}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      <span>{isArabic ? "طلب الكارت وإضافة للسلة" : "Order Custom Card"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden high-res QR canvas for back card high-resolution export */}
      <div className="hidden" aria-hidden="true">
        <QRCodeCanvas
          id="hidden-back-qr-code-canvas"
          value={backQrValue || "https://thenith.com"}
          size={512}
          level="H"
          marginSize={0}
          fgColor={qrColor || "#000000"}
        />
      </div>
    </div>
  );
}
