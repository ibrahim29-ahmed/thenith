import nodemailer from "nodemailer";
import dns from "dns";
import net from "net";
import Setting from "../models/Setting.js";
import { clearMailSettingsCache } from "../util/mail.js";

// DNS Host resolution to prevent Windows c-ares timeout
let cachedHostIp = null;
let lastLookupTime = 0;

async function resolveHostIp(hostname) {
  if (!hostname || net.isIP(hostname)) return hostname;
  const now = Date.now();
  if (cachedHostIp && now - lastLookupTime < 300000) {
    return cachedHostIp;
  }
  try {
    const res = await dns.promises.lookup(hostname);
    if (res?.address) {
      cachedHostIp = res.address;
      lastLookupTime = now;
      return res.address;
    }
  } catch (err) {
    console.warn(`[Mail] DNS lookup failed for ${hostname}:`, err.message);
  }
  return hostname;
}

export const DEFAULT_EMAIL_TEMPLATES = {
  otp: {
    id: "otp",
    name: "رمز التحقق والتسجيل (OTP Code)",
    description: "الرسالة التي تحتوي على رمز التحقق المكون من 6 أرقام لتسجيل الدخول والتحقق",
    subject: "رمز التحقق الخاص بك في {{site_name}}",
    headline: "رمز التحقق السريع",
    body: `<p>مرحباً بك،</p>
<p>رمز التحقق الخاص بحسابك في <strong>{{site_name}}</strong> هو:</p>
<div style="text-align: center; margin: 30px 0;">
  <span style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #4f46e5; background: #eef2ff; padding: 14px 28px; border-radius: 12px; border: 1px dashed #c7d2fe;">{{code}}</span>
</div>
<p style="color: #64748b; font-size: 13px;">هذا الرمز صالح للاستخدام لمدة 10 دقائق فقط. إذا لم تكن قد طلبت هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.</p>`,
    enabled: true,
    variables: [
      { tag: "{{code}}", label: "رمز التحقق (OTP)" },
      { tag: "{{site_name}}", label: "اسم المنصة" },
      { tag: "{{customer_email}}", label: "بريد العميل" },
      { tag: "{{year}}", label: "السنة الحالية" },
    ],
  },
  order_created: {
    id: "order_created",
    name: "تأكيد استلام الطلب الجديد (New Order)",
    description: "الرسالة التلقائية المرسلة للعميل فور إتمام عملية الشراء في المتجر",
    subject: "تم استلام طلبك بنجاح #{{order_number}} | {{site_name}}",
    headline: "فاتورة تفاصيل الطلب",
    body: `<p>مرحباً <strong>{{customer_name}}</strong>،</p>
<p>شكراً لطلبك من <strong>{{site_name}}</strong>! تم استلام طلبك رقم <strong>#{{order_number}}</strong> بنجاح وجاري العمل على مراجعته وتجهيزه.</p>

<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
  <p style="margin: 0 0 8px 0;"><strong>رقم الطلب:</strong> #{{order_number}}</p>
  <p style="margin: 0 0 8px 0;"><strong>تاريخ الطلب:</strong> {{order_date}}</p>
  <p style="margin: 0 0 8px 0;"><strong>طريقة الدفع:</strong> {{payment_method}}</p>
  <p style="margin: 0 0 8px 0;"><strong>عنوان التوصيل:</strong> {{shipping_address}}</p>
</div>

<h3 style="font-size: 15px; margin: 20px 0 10px; color: #0f172a;">المنتجات المطلوبة:</h3>
{{items_table}}

<div style="text-align: left; margin-top: 15px; padding: 12px; background: #f1f5f9; border-radius: 8px;">
  <span style="font-size: 16px; font-weight: bold; color: #0f172a;">المبلغ الإجمالي: {{total_amount}} ج.م</span>
</div>`,
    enabled: true,
    variables: [
      { tag: "{{customer_name}}", label: "اسم العميل" },
      { tag: "{{order_number}}", label: "رقم الطلب" },
      { tag: "{{order_date}}", label: "تاريخ الطلب" },
      { tag: "{{total_amount}}", label: "المبلغ الإجمالي" },
      { tag: "{{payment_method}}", label: "وسيلة الدفع" },
      { tag: "{{fawry_code}}", label: "كود فوري (إن وجد)" },
      { tag: "{{shipping_address}}", label: "عنوان الشحن" },
      { tag: "{{items_table}}", label: "جدول المنتجات المطلوبة" },
      { tag: "{{site_name}}", label: "اسم المنصة" },
    ],
  },
  order_status: {
    id: "order_status",
    name: "تحديث حالة الطلب (Order Status)",
    description: "الرسالة التي تصل للعميل عند تغيير حالة طلبه (جاري التجهيز، تم الشحن، تم التسليم...)",
    subject: "تحديث حالة طلبك #{{order_number}} | {{site_name}}",
    headline: "تحديث حالة الطلب",
    body: `<p>مرحباً <strong>{{customer_name}}</strong>،</p>
<p>نود إعلامك بأنه تم تحديث حالة طلبك رقم <strong>#{{order_number}}</strong> في منصة <strong>{{site_name}}</strong>.</p>

<div style="background-color: #f1f5f9; padding: 18px; border-radius: 12px; border-right: 4px solid #4f46e5; margin: 24px 0;">
  <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1e293b;">
    الحالة الحالية للطلب: <span style="color: #4f46e5;">{{status}}</span>
  </p>
</div>

<p style="color: #475569; font-size: 14px; line-height: 1.6;">
  يمكنك دائماً متابعة تفاصيل شحنتك وإدارة بروفايلك الرقمي عبر لوحة التحكم الخاصة بك.
</p>`,
    enabled: true,
    variables: [
      { tag: "{{customer_name}}", label: "اسم العميل" },
      { tag: "{{order_number}}", label: "رقم الطلب" },
      { tag: "{{status}}", label: "حالة الطلب الجديدة" },
      { tag: "{{site_name}}", label: "اسم المنصة" },
      { tag: "{{year}}", label: "السنة الحالية" },
    ],
  },
  subscription_activated: {
    id: "subscription_activated",
    name: "تفعيل وتجديد الاشتراك (Subscription Activated)",
    description: "إشعار العميل بتفعيل أو تجديد باقة الاشتراك بنجاح وتفاصيل الفاتورة",
    subject: "تم تفعيل اشتراكك في باقة {{plan_name}} بنجاح | {{site_name}}",
    headline: "فاتورة تفعيل الاشتراك",
    body: `<p>مرحباً <strong>{{customer_name}}</strong>،</p>
<p>يسعدنا إبلاغك بأنه تم تفعيل اشتراكك في <strong>{{plan_name}}</strong> بنجاح! يمكنك الآن الاستمتاع بكافة مميزات البروفايل الرقمي المتقدمة.</p>

<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
  <p style="margin: 0 0 8px 0;"><strong>الباقة:</strong> {{plan_name}}</p>
  <p style="margin: 0 0 8px 0;"><strong>المبلغ:</strong> {{amount}} ج.م</p>
  <p style="margin: 0 0 8px 0;"><strong>دورة الفوترة:</strong> {{billing_period}}</p>
  <p style="margin: 0 0 8px 0;"><strong>تاريخ البدء:</strong> {{start_date}}</p>
  <p style="margin: 0;"><strong>تاريخ الانتهاء والتجديد:</strong> {{end_date}}</p>
</div>

<p style="color: #475569; font-size: 14px;">يمكنك البدء فوراً في إضافة روابطك وأعمالك وتخصيص هويتك عبر حسابك.</p>`,
    enabled: true,
    variables: [
      { tag: "{{customer_name}}", label: "اسم العميل" },
      { tag: "{{plan_name}}", label: "اسم الباقة" },
      { tag: "{{amount}}", label: "المبلغ المدفوع" },
      { tag: "{{billing_period}}", label: "دورة الفوترة (شهري / سنوي)" },
      { tag: "{{start_date}}", label: "تاريخ البدء" },
      { tag: "{{end_date}}", label: "تاريخ الانتهاء" },
      { tag: "{{site_name}}", label: "اسم المنصة" },
    ],
  },
  welcome: {
    id: "welcome",
    name: "الرسالة الترحيبية بالعضو الجديد (Welcome Email)",
    description: "رسالة ترحيبية تصل للمستخدم الجديد فور تسجيله لتوجيهه للخطوات التالية",
    subject: "مرحباً بك في {{site_name}} — لنبدأ بناء بروفايلك الرقمي!",
    headline: "أهلاً بك في عالم الهوية الرقمية",
    body: `<p>مرحباً <strong>{{customer_name}}</strong>،</p>
<p>سعداء جداً بانضمامك إلى <strong>{{site_name}}</strong>! منصتك الذكية لإنشاء بروفايل رقمي متكامل يجمع كل أعمالك، روابطك، وسائل التواصل، ونماذج حجز المواعيد في مكان واحد.</p>

<div style="background: #eef2ff; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #c7d2fe;">
  <h4 style="margin: 0 0 10px 0; color: #3730a3; font-size: 15px;">خطوات سريعة للبدء:</h4>
  <ol style="margin: 0; padding-right: 20px; color: #4338ca; line-height: 1.8;">
    <li>أكمل بياناتك الشخصية وصورتك المهنية.</li>
    <li>أضف روابط حساباتك، معرض أعمالك، ووسائل الاتصال.</li>
    <li>شارك رابط بروفايلك أو اطلب كارت NFC ذكي لمشاركته بنقرة واحدة!</li>
  </ol>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{login_url}}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 30px; font-weight: bold; border-radius: 10px; display: inline-block;">الانتقال إلى لوحة التحكم</a>
</div>`,
    enabled: true,
    variables: [
      { tag: "{{customer_name}}", label: "اسم العميل" },
      { tag: "{{login_url}}", label: "رابط تسجيل الدخول" },
      { tag: "{{site_name}}", label: "اسم المنصة" },
      { tag: "{{year}}", label: "السنة الحالية" },
    ],
  },
};

export const getMailSettings = async (req, res, next) => {
  try {
    const settings = await Setting.find({
      key: { $in: ["smtp_config", "email_templates", "site_name"] },
    }).lean();

    const settingsMap = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const smtpConfig = settingsMap.smtp_config || {
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      user: process.env.SMTP_USER || "info@thenith.com",
      pass: process.env.SMTP_PASSWORD || "",
      from_name: process.env.MAIL_FROM || "Thenith Team",
      from_email: process.env.SMTP_USER || "info@thenith.com",
    };

    // Merge stored templates with default templates
    const storedTemplates = settingsMap.email_templates || {};
    const mergedTemplates = {};

    Object.keys(DEFAULT_EMAIL_TEMPLATES).forEach((key) => {
      mergedTemplates[key] = {
        ...DEFAULT_EMAIL_TEMPLATES[key],
        ...(storedTemplates[key] || {}),
      };
    });

    res.json({
      success: true,
      smtp: smtpConfig,
      templates: mergedTemplates,
      siteName: settingsMap.site_name || "Thenith",
    });
  } catch (error) {
    next(error);
  }
};


export const updateMailSettings = async (req, res, next) => {
  try {
    const { smtp, templates } = req.body;
    const updates = [];

    if (smtp !== undefined) {
      updates.push(
        Setting.findOneAndUpdate(
          { key: "smtp_config" },
          { value: smtp },
          { upsert: true, new: true }
        )
      );
    }

    if (templates !== undefined) {
      updates.push(
        Setting.findOneAndUpdate(
          { key: "email_templates" },
          { value: templates },
          { upsert: true, new: true }
        )
      );
    }

    await Promise.all(updates);
    clearMailSettingsCache();

    res.json({
      success: true,
      message: "تم حفظ إعدادات الـ SMTP وقوالب البريد الإلكتروني بنجاح!",
    });
  } catch (error) {
    next(error);
  }
};

export const testSmtpConnection = async (req, res, next) => {
  try {
    const { testEmail, smtp } = req.body;
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return res.status(400).json({
        success: false,
        error: "يرجى إدخال عنوان بريد إلكتروني صحيح لتلقي رسالة الاختبار",
      });
    }

    // Determine config to test: passed in body or loaded from DB
    let config = smtp;
    if (!config || !config.host) {
      const stored = await Setting.findOne({ key: "smtp_config" }).lean();
      config = stored?.value || {
        host: process.env.SMTP_HOST || "smtp.hostinger.com",
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
        user: process.env.SMTP_USER || "info@thenith.com",
        pass: process.env.SMTP_PASSWORD || "",
        from_name: process.env.MAIL_FROM || "Thenith Team",
        from_email: process.env.SMTP_USER || "info@thenith.com",
      };
    }

    const host = config.host?.trim();
    const port = Number(config.port) || 465;
    const secure = Boolean(config.secure) || port === 465;
    const user = config.user?.trim();
    const pass = config.pass;
    const fromName = config.from_name?.trim() || "Thenith Team";
    const fromEmail = config.from_email?.trim() || user;

    if (!host || !user || !pass) {
      return res.status(400).json({
        success: false,
        error: "بيانات الاتصال بالـ SMTP غير مكتملة (المضيف، اسم المستخدم، أو كلمة المرور مفقودة)",
      });
    }

    const targetHost = await resolveHostIp(host);

    const transporter = nodemailer.createTransport({
      host: targetHost,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        servername: host,
        rejectUnauthorized: false,
      },
      connectionTimeout: 12000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });

    // Test send
    const nowStr = new Date().toLocaleString("ar-EG");
    const testHtml = `
<div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 30px 15px; color: #0f172a;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.03);">
    <div style="background: #0f172a; padding: 25px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: bold;">THENITH</h1>
      <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">اختبار خادم البريد (SMTP Test)</p>
    </div>
    <div style="padding: 25px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background: #dcfce7; color: #15803d; font-size: 14px; font-weight: bold; padding: 8px 20px; border-radius: 20px; border: 1px solid #bbf7d0;">
          ✓ تم الاتصال والإرسال بنجاح
        </span>
      </div>
      <p style="font-size: 16px; margin: 0 0 15px 0;">مرحباً،</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
        هذه رسالة اختبارية لتأكيد صحة إعدادات خادم الـ SMTP الخاص بمنصة Thenith. تم إنشاء الاتصال وإرسال البريد بنجاح دون أي أخطاء.
      </p>
      <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 13px; font-family: monospace; line-height: 1.8;" dir="ltr">
        <strong>Host:</strong> ${host}:${port}<br>
        <strong>Security:</strong> ${secure ? "SSL/TLS (Encrypted)" : "STARTTLS / Plain"}<br>
        <strong>Sender:</strong> "${fromName}" &lt;${fromEmail}&gt;<br>
        <strong>Time:</strong> ${nowStr}
      </div>
      <p style="font-size: 13px; color: #94a3b8; margin: 20px 0 0 0;">يمكنك الآن الاعتماد على هذا الخادم في إرسال فواتير الطلبات، رموز التحقق، وتنبيهات العملاء.</p>
    </div>
  </div>
</div>
`;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: testEmail,
      subject: `اختبار اتصال خادم البريد (SMTP) | ${fromName}`,
      html: testHtml,
    });

    res.json({
      success: true,
      message: `تم إرسال البريد التجريبي بنجاح إلى: ${testEmail}! يرجى تفقد صندوق الوارد أو الـ Spam.`,
    });
  } catch (error) {
    console.error("[SMTP Test Error]:", error);
    let userMsg = error.message;
    if (error.code === "EAUTH") {
      userMsg = "فشل في المصادقة (EAUTH): يرجى التأكد من صحة البريد الإلكتروني وكلمة المرور الخاصة بالـ SMTP.";
    } else if (error.code === "ETIMEDOUT" || error.code === "ECONNECTION") {
      userMsg = `تعذر الاتصال بالخادم (${error.code}): تأكد من صحة اسم المضيف والمنفذ المختار.`;
    }
    res.status(500).json({
      success: false,
      error: userMsg,
      details: error.code || error.message,
    });
  }
};
