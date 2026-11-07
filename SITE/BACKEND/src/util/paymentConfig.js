import Setting from "../models/Setting.js";

export const DEFAULT_PAYMENT_METHODS = [
  {
    id: "card",
    payment_method_id: 2,
    type: "online",
    name_ar: "بطاقة بنكية (فيزا / ماستركارد / ميزة)",
    name_en: "Credit / Debit Card (Visa, Mastercard, Meeza)",
    description_ar: "الدفع الفوري الآمن ببطاقات الائتمان والخصم المباشر وميزة عبر بوابة مشفرة 100%",
    description_en: "Instant and secure payment with Visa, Mastercard, or Meeza via encrypted gateway",
    logo: "https://app.fawaterk.com/clients/payment_options/mastercard-visa.png",
    icon: "CreditCard",
    badge: "فوري ومباشر",
    enabled: true,
    redirect: "true",
    commission_on_customer: 2,
    fixed_fee: 0,
    allow_for_subscriptions: true,
    allow_for_store_orders: true,
    instructions_ar: "أدخل بيانات البطاقة بأمان لإتمام الدفع الفوري والمصادقة البنكية 3D-Secure.",
    instructions_en: "Enter your card details securely to complete instant payment with 3D-Secure.",
    sort_order: 1,
  },
  {
    id: "wallet",
    payment_method_id: 4,
    type: "online",
    name_ar: "المحافظ الإلكترونية (فودافون كاش، اتصالات، أورنج، وي، ميزة)",
    name_en: "Mobile Wallets (Vodafone Cash, Etisalat, Orange, WE, Meeza)",
    description_ar: "الدفع اللحظي من خلال محفظة الهاتف الذكية بطلب كود تأكيد الدفع أو إشعار فوري",
    description_en: "Instant payment using any Egyptian mobile wallet (Vodafone Cash, etc.)",
    logo: "https://app.fawaterk.com/clients/payment_options/MeezaDigitalSmall.png",
    icon: "Smartphone",
    badge: "الأكثر استخداماً",
    enabled: true,
    redirect: "false",
    commission_on_customer: 1,
    fixed_fee: 0,
    allow_for_subscriptions: true,
    allow_for_store_orders: true,
    instructions_ar: "أدخل رقم هاتفك المسجل به المحفظة، واقبل طلب الخصم أو اطلب كود التأكيد الخاص بشبكتك.",
    instructions_en: "Enter your mobile wallet number and confirm the payment request on your phone.",
    sort_order: 2,
  },
  {
    id: "fawry",
    payment_method_id: 3,
    type: "online",
    name_ar: "فوري باي (Fawry Pay)",
    name_en: "Fawry Pay",
    description_ar: "كود دفع نقدي فوري للسداد من أي منفذ فوري أو عبر تطبيق ماي فوري في كل محافظات مصر",
    description_en: "Cash payment reference code payable at any Fawry retail store or myFawry app",
    logo: "https://app.fawaterk.com/clients/payment_options/fawry.png",
    icon: "Receipt",
    badge: "كود دفع نقدي",
    enabled: true,
    redirect: "false",
    commission_on_customer: 2,
    fixed_fee: 0,
    allow_for_subscriptions: true,
    allow_for_store_orders: true,
    instructions_ar: "احتفظ برقم كود فوري وتوجه لأقرب ماكينة فوري وسدد الخدمة تحت بند 'فوري باي (خدمة 788)'.",
    instructions_en: "Take the reference code to any Fawry terminal or pay via myFawry under 'Fawry Pay (Code 788)'.",
    sort_order: 3,
  },
  {
    id: "cash_on_delivery",
    payment_method_id: null,
    type: "offline",
    name_ar: "الدفع عند الاستلام (COD)",
    name_en: "Cash On Delivery",
    description_ar: "ادفع نقداً لمندوب الشحن عند استلام طلبيتك وفحصها (متاح لمنتجات المتجر والكروت الفيزيائية فقط)",
    description_en: "Pay cash in hand to the delivery courier upon receiving your shipment (store products only)",
    logo: "",
    icon: "Truck",
    badge: "للمتجر فقط",
    enabled: true,
    redirect: "false",
    commission_on_customer: 0,
    fixed_fee: 0,
    allow_for_subscriptions: false,
    allow_for_store_orders: true,
    instructions_ar: "يرجى تجهيز المبلغ المطلوب نقداً عند وصول مندوب شركة الشحن.",
    instructions_en: "Please have the exact cash amount ready upon delivery courier arrival.",
    sort_order: 4,
  },
  {
    id: "instapay",
    payment_method_id: null,
    type: "manual",
    name_ar: "تحويل إنستاباي / بنكي (InstaPay)",
    name_en: "InstaPay / Bank Transfer",
    description_ar: "تحويل بنكي أو عبر تطبيق إنستاباي لحظياً إلى حساب المنصة مباشرة بدون عمولة إضافية",
    description_en: "Instant fee-free transfer via InstaPay app or direct bank account",
    logo: "",
    icon: "Send",
    badge: "بدون عمولة",
    enabled: false,
    redirect: "false",
    commission_on_customer: 0,
    fixed_fee: 0,
    account_details: "عنوان إنستاباي (IPA): thenith@instapay\nرقم الحساب / الهاتف: 01000000000\nاسم المستفيد: Thenith Co.",
    instructions_ar: "قم بالتحويل على العنوان أعلاه ثم قم بإرسال صورة الإيصال أو رقم العملية للدعم الفني.",
    instructions_en: "Transfer the amount to the IPA above, then provide transaction receipt to support.",
    allow_for_subscriptions: true,
    allow_for_store_orders: true,
    sort_order: 5,
  },
  {
    id: "vodafone_cash_direct",
    payment_method_id: null,
    type: "manual",
    name_ar: "فودافون كاش - تحويل يدوي مباشر",
    name_en: "Vodafone Cash - Direct Transfer",
    description_ar: "تحويل مباشر من محفظتك إلى رقم محفظة فودافون كاش الخاص بالإدارة",
    description_en: "Direct manual transfer from your Vodafone Cash wallet to admin number",
    logo: "",
    icon: "Wallet",
    badge: "تحويل يدوي",
    enabled: false,
    redirect: "false",
    commission_on_customer: 0,
    fixed_fee: 0,
    account_details: "رقم محفظة فودافون كاش: 01000000000\nاسم المستلم: Thenith",
    instructions_ar: "قم بتحويل المبلغ إلى رقم المحفظة وارسل لقطة شاشة لرسالة التأكيد عبر واتساب أو الدعم.",
    instructions_en: "Transfer the exact amount to the wallet number and send confirmation screenshot.",
    allow_for_subscriptions: true,
    allow_for_store_orders: true,
    sort_order: 6,
  },
];

export const DEFAULT_GLOBAL_SETTINGS = {
  cod_enabled: true,
  test_mode: false,
  announcement_banner: "",
  announcement_enabled: false,
  currency: "EGP",
  currency_symbol_ar: "ج.م",
  currency_symbol_en: "EGP",
  min_order_amount: 1,
  max_order_amount: 50000,
};

export async function getPaymentConfig() {
  const setting = await Setting.findOne({ key: "payment_methods_config" }).lean();
  if (!setting || !setting.value) {
    return {
      methods: DEFAULT_PAYMENT_METHODS,
      globalSettings: DEFAULT_GLOBAL_SETTINGS,
    };
  }

  const stored = setting.value;
  const methods = Array.isArray(stored.methods) && stored.methods.length > 0
    ? stored.methods
    : DEFAULT_PAYMENT_METHODS;

  const globalSettings = {
    ...DEFAULT_GLOBAL_SETTINGS,
    ...(stored.globalSettings || {}),
  };

  return { methods, globalSettings };
}

export async function savePaymentConfig(config) {
  const updated = await Setting.findOneAndUpdate(
    { key: "payment_methods_config" },
    { value: config },
    { new: true, upsert: true }
  );
  return updated.value;
}
