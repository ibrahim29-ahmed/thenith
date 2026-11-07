import Plan from "../models/Plan.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import _idGenerator6120 from "../util/idGenerator.js";
const { generatePublicId } = _idGenerator6120;

const NEW_FREE_PLAN = {
  name: { ar: "مجاني", en: "Free" },
  prices: { monthly: 0, yearly: 0 },
  limits: { maxLinks: 3, maxCards: 1, monthlyBusinessRequests: 5 },
  features: {
    contactMethods: true,
    saveContact: true,
    qrCode: true,
    basicAnalytics: true,
    verifiedBadge: false,
    coverImage: false,
    customLink: false,
    reorderLinks: false,
    removeBranding: false,
    advancedAnalytics: false,
    prioritySupport: false,
    futureFeatures: false,
    themeSelection: false,
  },
  marketingFeatures: [
    { name: { ar: "إضافة وسائل الاتصال", en: "Add Contact Methods" }, enabled: true },
    { name: { ar: "حفظ جهة الاتصال", en: "Save Contact" }, enabled: true },
    { name: { ar: "QR Code", en: "QR Code" }, enabled: true },
    { name: { ar: "إحصائيات بسيطة", en: "Basic Analytics" }, enabled: true },
    { name: { ar: "إضافة 3 روابط", en: "Add 3 Links" }, enabled: true },
    { name: { ar: "إنشاء 1 بطاقات عمل", en: "Create 1 Business Card" }, enabled: true },
  ],
};

const NEW_PRO_PLAN = {
  name: { ar: "Pro", en: "Pro" },
  prices: { monthly: 149, yearly: 1499 },
  limits: { maxLinks: null, maxCards: 5, monthlyBusinessRequests: null },
  features: {
    contactMethods: true,
    saveContact: true,
    qrCode: true,
    basicAnalytics: false,
    verifiedBadge: true,
    coverImage: true,
    customLink: true,
    reorderLinks: true,
    calendarBooking: true,
    unifiedPaymentHub: true,
    removeBranding: true,
    advancedAnalytics: true,
    prioritySupport: true,
    futureFeatures: true,
    themeSelection: true,
  },
  marketingFeatures: [
    { name: { ar: "كالندر", en: "Calendar" }, enabled: true },
    { name: { ar: "شارة Thenith الموثقة", en: "Verified Thenith Badge" }, enabled: true },
    { name: { ar: "إضافة وسائل الاتصال", en: "Add Contact Methods" }, enabled: true },
    { name: { ar: "إضافة روابط بلا حدود", en: "Unlimited Links" }, enabled: true },
    { name: { ar: "تغيير صورة الغلاف", en: "Cover Image" }, enabled: true },
    { name: { ar: "رابط مخصص احترافي", en: "Professional Custom Link" }, enabled: true },
    { name: { ar: "ترتيب صفحة الروابط", en: "Reorder Links Page" }, enabled: true },
    { name: { ar: "اختيار مظهر", en: "Choose Appearance" }, enabled: true },
    { name: { ar: "إنشاء 5 بطاقات عمل", en: "Create 5 Business Cards" }, enabled: true },
    { name: { ar: "الحصول على طلبات عمل بلا حدود", en: "Unlimited Business Requests" }, enabled: true },
    { name: { ar: "حفظ جهة الاتصال", en: "Save Contact" }, enabled: true },
    { name: { ar: "QR Code", en: "QR Code" }, enabled: true },
    { name: { ar: "إزالة شعار Thenith", en: "Remove Thenith Branding" }, enabled: true },
    { name: { ar: "إحصائيات متقدمة", en: "Advanced Analytics" }, enabled: true },
    { name: { ar: "الأولوية في الدعم الفني", en: "Priority Support" }, enabled: true },
    { name: { ar: "جميع المميزات الجديدة مستقبلًا", en: "All Future Features" }, enabled: true },
  ],
};

const NEW_PAYMENT_PLUS_PLAN = {
  name: { ar: "Thenith Payment Plus", en: "Thenith Payment Plus" },
  prices: { monthly: 79, yearly: 799 },
  limits: { maxLinks: 10, maxCards: 2, monthlyBusinessRequests: 20 },
  features: {
    unifiedPaymentHub: true,
    contactMethods: true,
    saveContact: true,
    qrCode: true,
    basicAnalytics: true,
    verifiedBadge: false,
    coverImage: true,
    customLink: true,
    reorderLinks: true,
    removeBranding: false,
    advancedAnalytics: true,
    prioritySupport: true,
    futureFeatures: false,
    themeSelection: true,
  },
  marketingFeatures: [
    { name: { ar: "صفحة الدفع الموحدة لجميع المحافظ الإلكترونية", en: "Unified Payment Page for all Wallets" }, enabled: true },
    { name: { ar: "رابط دفع موحد ذكي (Thenith Pay)", en: "Dedicated Smart Payment Link (Thenith Pay)" }, enabled: true },
    { name: { ar: "إدارة وسائل الدفع والمحافظ الإلكترونية", en: "Digital Wallets Management" }, enabled: true },
    { name: { ar: "روابط دفع مخصصة لكل وسيلة", en: "Custom Payment Link per Wallet" }, enabled: true },
    { name: { ar: "تحويل مباشر بدون عمولات إضافية", en: "Direct Transfer with 0% extra fees" }, enabled: true },
    { name: { ar: "QR Code مخصص للدفع السريع", en: "Custom Payment QR Code" }, enabled: true },
    { name: { ar: "مشاركة سريعة عبر التطبيقات", en: "Instant Share via Mobile Apps" }, enabled: true },
    { name: { ar: "إحصائيات متقدمة", en: "Advanced Analytics" }, enabled: true },
    { name: { ar: "الأولوية في الدعم الفني", en: "Priority Support" }, enabled: true },
  ],
  isActive: true,
};

async function seedPlans() {
  await Plan.updateOne(
    { key: "free" },
    { $setOnInsert: NEW_FREE_PLAN },
    { upsert: true },
  );
  await Plan.updateOne(
    { key: "payment_plus" },
    { $setOnInsert: NEW_PAYMENT_PLUS_PLAN },
    { upsert: true },
  );
  await Plan.updateOne(
    { key: "pro" },
    { $setOnInsert: NEW_PRO_PLAN },
    { upsert: true },
  );
}

async function backfillPublicIds() {
  const users = await User.find({
    $or: [{ publicId: { $exists: false } }, { publicId: null }],
  });
  for (const user of users) {
    let publicId;
    do {
      publicId = generatePublicId();
    } while (await User.exists({ publicId }));
    await User.updateOne(
      {
        _id: user._id,
        $or: [{ publicId: { $exists: false } }, { publicId: null }],
      },
      { $set: { publicId } },
    );
  }
}


async function seedPaymentCategoryAndProducts() {
  try {
    // 1. Ensure "وسائل الدفع" Category exists
    let category = await Category.findOne({
      $or: [{ slug: "payment_methods" }, { "name.ar": "وسائل الدفع" }],
    });

    if (!category) {
      category = await Category.create({
        name: { ar: "وسائل الدفع", en: "Payment Methods" },
        description: {
          ar: "كروت الدفع الذكية المخصصة للمحافظ الإلكترونية وطرق الدفع",
          en: "Smart payment cards for digital wallets and instant money transfers",
        },
        slug: "payment_methods",
        order: 3,
        isActive: true,
      });
    }

    const PAYMENT_CARDS = [
      {
        sku: "TH-PAY-VODAFONE",
        name: { ar: "كارت فودافون كاش الذكي NFC", en: "Vodafone Cash Smart NFC Card" },
        description: {
          ar: "كارت دفع ذكي NFC مخصص لمحفظة فودافون كاش. يتيح لعملائك تحويل الأموال مباشرة لمحفظتك بمجرد لمس الكارت بهاتفهم دون إدخال الأرقام يدوياً.",
          en: "Smart NFC payment card for Vodafone Cash. Allows clients to transfer directly with a single tap.",
        },
        category: "وسائل الدفع",
        price: 199,
        currency: "EGP",
        quantity: 999,
        isActive: true,
        isCustomizable: false,
        nfcChipType: "NTAG215",
        panelImage: "/wallets/vodafone-cash.png",
        mainImage: "/wallets/vodafone-cash.png",
        images: ["/wallets/vodafone-cash.png"],
        colors: [
          { id: "vodafone_red", name: { ar: "أحمر فودافون", en: "Vodafone Red" }, hex: "#e60000" },
          { id: "matte_black", name: { ar: "أسود فاخر", en: "Matte Black" }, hex: "#0f172a" },
        ],
      },
      {
        sku: "TH-PAY-INSTAPAY",
        name: { ar: "كارت انستاباي الذكي NFC", en: "Instapay Smart NFC Card" },
        description: {
          ar: "كارت دفع ذكي NFC مخصص لخدمة انستاباي (Instapay). ينقل العميل فوراً إلى رابط الدفع المباشر أو التحويل لحسابك بلمسة واحدة.",
          en: "Smart NFC payment card for Instapay. Opens payment transfer instantly with one tap.",
        },
        category: "وسائل الدفع",
        price: 199,
        currency: "EGP",
        quantity: 999,
        isActive: true,
        isCustomizable: false,
        nfcChipType: "NTAG215",
        panelImage: "/wallets/instapay.png",
        mainImage: "/wallets/instapay.png",
        images: ["/wallets/instapay.png"],
        colors: [
          { id: "instapay_purple", name: { ar: "بنفسجي انستاباي", en: "Instapay Purple" }, hex: "#5b21b6" },
          { id: "matte_black", name: { ar: "أسود فاخر", en: "Matte Black" }, hex: "#0f172a" },
        ],
      },
      {
        sku: "TH-PAY-ORANGE",
        name: { ar: "كارت أورنج كاش الذكي NFC", en: "Orange Cash Smart NFC Card" },
        description: {
          ar: "كارت دفع ذكي NFC مخصص لمحفظة أورنج كاش (Orange Cash). تحويل مباشر وسريع بلمسة هاتف واحدة.",
          en: "Smart NFC payment card for Orange Cash. Direct instant transfers.",
        },
        category: "وسائل الدفع",
        price: 199,
        currency: "EGP",
        quantity: 999,
        isActive: true,
        isCustomizable: false,
        nfcChipType: "NTAG215",
        panelImage: "/wallets/orange-cash.png",
        mainImage: "/wallets/orange-cash.png",
        images: ["/wallets/orange-cash.png"],
        colors: [
          { id: "orange_vibrant", name: { ar: "برتقالي أورنج", en: "Orange" }, hex: "#ff7900" },
          { id: "matte_black", name: { ar: "أسود فاخر", en: "Matte Black" }, hex: "#0f172a" },
        ],
      },
      {
        sku: "TH-PAY-ETISALAT",
        name: { ar: "كارت اتصالات كاش الذكي NFC", en: "Etisalat Cash Smart NFC Card" },
        description: {
          ar: "كارت دفع ذكي NFC مخصص لمحفظة اتصالات كاش (Etisalat Cash). دفع وتحويل بلمسة واحدة ومشاركة فورية لبيانات المحفظة.",
          en: "Smart NFC payment card for Etisalat Cash.",
        },
        category: "وسائل الدفع",
        price: 199,
        currency: "EGP",
        quantity: 999,
        isActive: true,
        isCustomizable: false,
        nfcChipType: "NTAG215",
        panelImage: "/wallets/etisalat-cash.png",
        mainImage: "/wallets/etisalat-cash.png",
        images: ["/wallets/etisalat-cash.png"],
        colors: [
          { id: "etisalat_green", name: { ar: "أخضر اتصالات", en: "Etisalat Green" }, hex: "#00a859" },
          { id: "matte_black", name: { ar: "أسود فاخر", en: "Matte Black" }, hex: "#0f172a" },
        ],
      },
      {
        sku: "TH-PAY-WEPAY",
        name: { ar: "كارت وي باي الذكي NFC", en: "WE Pay Smart NFC Card" },
        description: {
          ar: "كارت دفع ذكي NFC مخصص لمحفظة وي باي (WE Pay). تحويل فوري وسلس بلمسة واحدة لعملائك.",
          en: "Smart NFC payment card for WE Pay.",
        },
        category: "وسائل الدفع",
        price: 199,
        currency: "EGP",
        quantity: 999,
        isActive: true,
        isCustomizable: false,
        nfcChipType: "NTAG215",
        panelImage: "/wallets/we-pay.png",
        mainImage: "/wallets/we-pay.png",
        images: ["/wallets/we-pay.png"],
        colors: [
          { id: "we_purple", name: { ar: "أرجواني وي", en: "WE Purple" }, hex: "#5d1049" },
          { id: "matte_black", name: { ar: "أسود فاخر", en: "Matte Black" }, hex: "#0f172a" },
        ],
      },
      {
        sku: "TH-PAY-UNIFIED",
        name: { ar: "كارت صفحة الدفع الموحدة الذكي NFC", en: "Thenith Unified Pay Smart NFC Card" },
        description: {
          ar: "كارت دفع ذكي فاخر يجمع كافة محافظك الإلكترونية وحساباتك البنكية في صفحة دفع موحدة (Thenith Payment Plus). بمجرد لمس الكارت بهاتف العميل تفتح له شاشة أنيقة لاختيار وسيلة الدفع المناسبة له والتحويل الفوري.",
          en: "Premium Smart NFC Card for Thenith Unified Payment Page. Features all your digital wallets in one place.",
        },
        category: "وسائل الدفع",
        price: 249,
        currency: "EGP",
        quantity: 999,
        isActive: true,
        isCustomizable: false,
        nfcChipType: "NTAG215",
        panelImage: "/card-logo.png",
        mainImage: "/card-logo.png",
        images: ["/card-logo.png"],
        colors: [
          { id: "gold_luxury", name: { ar: "ذهبي فاخر", en: "Luxury Gold" }, hex: "#d97706" },
          { id: "matte_black", name: { ar: "أسود ملكي", en: "Royal Black" }, hex: "#0f172a" },
          { id: "indigo_neon", name: { ar: "نيون إنديجو", en: "Neon Indigo" }, hex: "#4f46e5" },
        ],
      },
    ];

    for (const card of PAYMENT_CARDS) {
      await Product.updateOne(
        { sku: card.sku },
        {
          $set: {
            name: card.name,
            description: card.description,
            category: card.category,
            price: card.price,
            currency: card.currency,
            quantity: card.quantity,
            isActive: card.isActive,
            isCustomizable: card.isCustomizable,
            nfcChipType: card.nfcChipType,
            panelImage: card.panelImage,
            mainImage: card.mainImage,
            images: card.images,
            colors: card.colors,
          },
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error("Error seeding payment category/products:", err);
  }
}

export default {
  seedPlans,
  backfillPublicIds,
  seedPaymentCategoryAndProducts,
};
