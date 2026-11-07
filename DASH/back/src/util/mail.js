import nodemailer from "nodemailer";
import dns from "dns";
import net from "net";
import dotenv from "dotenv";
import Setting from "../models/Setting.js";

dotenv.config();

let cachedHostIp = null;
let lastLookupTime = 0;

let dynamicSettingsCache = null;
let lastSettingsFetch = 0;
let currentTransporter = null;
let currentConfigKey = "";

export async function getCachedSettings() {
  const now = Date.now();
  if (dynamicSettingsCache && now - lastSettingsFetch < 30000) {
    return dynamicSettingsCache;
  }
  try {
    const list = await Setting.find({
      key: { $in: ["smtp_config", "email_templates", "site_name"] },
    }).lean();
    const map = {};
    list.forEach((s) => {
      map[s.key] = s.value;
    });
    dynamicSettingsCache = map;
    lastSettingsFetch = now;
    return map;
  } catch (err) {
    return dynamicSettingsCache || {};
  }
}

export function clearMailSettingsCache() {
  dynamicSettingsCache = null;
  lastSettingsFetch = 0;
  currentTransporter = null;
  currentConfigKey = "";
}

function renderTemplate(content, variables = {}) {
  if (!content) return "";
  let rendered = content;
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    rendered = rendered.replace(regex, val !== undefined && val !== null ? String(val) : "");
  }
  return rendered;
}

function wrapInEmailContainer({ headline, body, siteName }) {
  if (body && (body.includes("<html") || body.includes("<!DOCTYPE"))) {
    return body;
  }
  const cleanSiteName = siteName || "THENITH";
  return `
<div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 30px 15px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.03);">
    <div style="background: #0f172a; padding: 25px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 1px;">${cleanSiteName}</h1>
      ${headline ? `<p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">${headline}</p>` : ""}
    </div>
    <div style="padding: 25px; line-height: 1.6; font-size: 15px; color: #334155;">
      ${body}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0 15px;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
        © ${new Date().getFullYear()} ${cleanSiteName}. جميع الحقوق محفوظة.
      </p>
    </div>
  </div>
</div>
`;
}

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

async function getTransporter() {
  const settings = await getCachedSettings();
  const dbSmtp = settings.smtp_config;

  const host = dbSmtp?.host?.trim() || process.env.SMTP_HOST || "smtp.hostinger.com";
  const port = parseInt(dbSmtp?.port || process.env.SMTP_PORT || "465", 10);
  const secure =
    dbSmtp?.secure !== undefined
      ? Boolean(dbSmtp.secure)
      : process.env.SMTP_SECURE === "true" || port === 465;
  const user = dbSmtp?.user?.trim() || process.env.SMTP_USER;
  const pass = dbSmtp?.pass || process.env.SMTP_PASSWORD;

  const configKey = `${host}:${port}:${user}:${pass}:${secure}`;
  if (currentTransporter && currentConfigKey === configKey) {
    return currentTransporter;
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
    connectionTimeout: 10000,
  });

  currentTransporter = transporter;
  currentConfigKey = configKey;
  return transporter;
}

export const sendOrderStatusEmail = async ({
  email,
  name,
  orderNumber,
  status,
}) => {
  if (!email) return;

  const statusTranslations = {
    received: "تم استلام الطلب وهو جاري المراجعة",
    processing: "جاري تجهيز طلبك",
    shipped: "تم شحن طلبك وهو في الطريق إليك",
    delivered: "تم تسليم الطلب بنجاح",
    returned: "تم تسجيل مرتجع لطلبك",
    cancelled: "تم إلغاء الطلب",
  };

  const arabicStatus = statusTranslations[status] || status;

  const settings = await getCachedSettings();
  const dbSmtp = settings.smtp_config;
  const siteName = settings.site_name || "THENITH";
  const template = settings.email_templates?.order_status;

  let subject = `تحديث حالة طلبك #${orderNumber} | ${siteName}`;
  let html = "";

  if (template && template.enabled !== false && template.body) {
    const variables = {
      customer_name: name || "عميلنا العزيز",
      order_number: orderNumber,
      status: arabicStatus,
      site_name: siteName,
      year: new Date().getFullYear(),
    };
    subject = renderTemplate(template.subject || subject, variables);
    const bodyHtml = renderTemplate(template.body, variables);
    html = wrapInEmailContainer({
      headline: template.headline || "تحديث حالة الطلب",
      body: bodyHtml,
      siteName,
    });
  } else {
    html = `
<div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 30px 15px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.03);">
    <div style="background: #0f172a; padding: 25px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: bold;">${siteName}</h1>
      <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">تحديث حالة الطلب</p>
    </div>
    <div style="padding: 25px;">
      <p style="font-size: 16px; margin: 0 0 15px 0;">مرحباً <strong>${name || "عميلنا العزيز"}</strong>،</p>
      <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
        نود إعلامك بأنه تم تحديث حالة طلبك رقم <strong>#${orderNumber}</strong>.
      </p>
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; border-right: 4px solid #4f46e5; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 15px; font-weight: bold; color: #1e293b;">
          الحالة الحالية: <span style="color: #4f46e5;">${arabicStatus}</span>
        </p>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">
        يمكنك دائماً متابعة تفاصيل طلباتك من خلال لوحة التحكم في حسابك.
        <br><br>
        مع تحيات فريق عمل ${siteName}.
      </p>
    </div>
  </div>
</div>
    `;
  }

  const fromName = dbSmtp?.from_name || process.env.MAIL_FROM || "Thenith Team";
  const fromEmail = dbSmtp?.from_email || dbSmtp?.user || process.env.SMTP_USER;

  try {
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error(`[Mail Error] Failed to send order status email to ${email}:`, error.message);
  }
};

export const sendSubscriptionExpiryEmail = async ({
  email,
  name,
  planName = "Pro",
  expiresAt,
  daysLeft = 3,
  renewalUrl,
}) => {
  if (!email) return;

  const settings = await getCachedSettings();
  const dbSmtp = settings.smtp_config;
  const siteName = settings.site_name || "THENITH";
  const siteUrl = process.env.SITE_URL || "https://thenith.com";
  const targetRenewalUrl = renewalUrl || `${siteUrl}/panel?tab=subscriptions`;

  const cleanPlanName =
    typeof planName === "object"
      ? planName?.ar || planName?.en || "Pro"
      : planName || "Pro";

  const formattedDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "قريباً";

  const isToday = Number(daysLeft) <= 0;
  const urgencyBadge = isToday
    ? "ينتهي اشتراكك اليوم!"
    : Number(daysLeft) === 1
    ? "متبقي يوم واحد فقط!"
    : `متبقي ${daysLeft} أيام على انتهاء الاشتراك`;

  const subject = `تذكير هام: اشتراك باقة ${cleanPlanName} قارب على الانتهاء | ${siteName}`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 40px 15px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">${siteName}</h1>
      <p style="margin: 8px 0 0; color: #cbd5e1; font-size: 14px;">مركز إدارة وتجديد الاشتراكات</p>
    </div>

    <!-- Urgency Ribbon -->
    <div style="background-color: #fff1f2; border-bottom: 1px solid #fecdd3; padding: 12px 20px; text-align: center;">
      <span style="display: inline-block; background-color: #e11d48; color: #ffffff; font-size: 13px; font-weight: 700; padding: 4px 14px; border-radius: 9999px;">
        ${urgencyBadge}
      </span>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px 25px;">
      <p style="font-size: 16px; margin: 0 0 16px 0; color: #1e293b;">
        مرحباً <strong>${name || "عميلنا العزيز"}</strong>،
      </p>

      <p style="font-size: 14px; color: #475569; line-height: 1.8; margin: 0 0 24px 0;">
        نود تذكيرك بأن اشتراكك في <strong style="color: #4f46e5;">باقة ${cleanPlanName}</strong> سينتهي بتاريخ <strong style="color: #0f172a;">${formattedDate}</strong>. لضمان استمرار عمل كروتك الذكية، الروابط المخصصة، والإحصائيات المتقدمة دون أي انقطاع، نوصي بتجديد الاشتراك الآن.
      </p>

      <!-- Details Card -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 28px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b;">اسم الباقة:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #0f172a; text-align: left;">باقة ${cleanPlanName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">تاريخ الانتهاء:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #e11d48; text-align: left;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">المدة المتبقية:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #4f46e5; text-align: left;">${daysLeft > 0 ? `${daysLeft} أيام` : "اليوم"}</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${targetRenewalUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 38px; border-radius: 12px; font-size: 15px; font-weight: 800; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
          تجديد الباقة الآن ←
        </a>
        <p style="font-size: 12px; color: #94a3b8; margin: 10px 0 0;">دفع فوري آمن عبر الفيزا، كروت ميزة، أو المحافظ الإلكترونية</p>
      </div>

      <!-- Features Checklist -->
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 18px 20px; margin-top: 25px;">
        <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; color: #334155;">مميزات باقتك التي تحافظ عليها عند التجديد:</p>
        <ul style="margin: 0; padding-right: 20px; font-size: 13px; color: #64748b; line-height: 1.8;">
          <li>كروت العمل الذكية غير المحدودة واستجابة NFC فورية</li>
          <li>تخصيص كامل للتصميم والألوان ورفع الشعارات الاحترافية</li>
          <li>إحصائيات تفصيلية للزيارات ونقرات التواصل</li>
          <li>دعم فني مخصص وخدمة سريعة على مدار الساعة</li>
        </ul>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;" />

      <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0;">
        إذا كنت قد قمت بتجديد اشتراكك بالفعل خلال الساعات الماضية، يمكنك تجاهل هذه الرسالة.
        <br><br>
        مع أطيب التحيات،<br>
        <strong>فريق عمل ${siteName}</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 18px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      © ${new Date().getFullYear()} ${siteName}. جميع الحقوق محفوظة.
    </div>
  </div>
</div>
  `;

  const fromName = dbSmtp?.from_name || process.env.MAIL_FROM || "Thenith Team";
  const fromEmail = dbSmtp?.from_email || dbSmtp?.user || process.env.SMTP_USER;

  try {
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error(`[Mail Error] Failed to send subscription expiry email to ${email}:`, error.message);
    return false;
  }
};

export const sendCustomAlertEmail = async ({
  email,
  name,
  title,
  message,
  actionLabel,
  actionUrl,
  priority = "normal",
}) => {
  if (!email || !title) return;

  const settings = await getCachedSettings();
  const dbSmtp = settings.smtp_config;
  const siteName = settings.site_name || "THENITH";

  const priorityColor =
    priority === "urgent"
      ? "#e11d48"
      : priority === "high"
      ? "#d97706"
      : "#4f46e5";

  const subject = `${title} | ${siteName}`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 40px 15px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 30px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">${siteName}</h1>
      <p style="margin: 6px 0 0; color: #cbd5e1; font-size: 14px;">إشعار وتنبيه هام</p>
    </div>

    <div style="padding: 30px 25px;">
      <p style="font-size: 16px; margin: 0 0 15px 0; color: #1e293b;">
        مرحباً <strong>${name || "عميلنا العزيز"}</strong>،
      </p>

      <!-- Alert Title Box -->
      <div style="border-right: 4px solid ${priorityColor}; background-color: #f8fafc; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${title}</h2>
      </div>

      <!-- Message -->
      <div style="font-size: 14px; color: #475569; line-height: 1.8; margin-bottom: 25px; white-space: pre-wrap;">
        ${message}
      </div>

      <!-- Action Button if provided -->
      ${
        actionUrl
          ? `
      <div style="text-align: center; margin: 25px 0;">
        <a href="${actionUrl}" style="display: inline-block; background-color: ${priorityColor}; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 14px; font-weight: 800;">
          ${actionLabel || "الانتقال للتفاصيل ←"}
        </a>
      </div>
      `
          : ""
      }

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0 15px;" />
      <p style="font-size: 13px; color: #94a3b8; margin: 0;">
        مع تحيات فريق عمل ${siteName}.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      © ${new Date().getFullYear()} ${siteName}. جميع الحقوق محفوظة.
    </div>
  </div>
</div>
  `;

  const fromName = dbSmtp?.from_name || process.env.MAIL_FROM || "Thenith Team";
  const fromEmail = dbSmtp?.from_email || dbSmtp?.user || process.env.SMTP_USER;

  try {
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error(`[Mail Error] Failed to send custom alert email to ${email}:`, error.message);
    return false;
  }
};

export default {
  sendOrderStatusEmail,
  sendSubscriptionExpiryEmail,
  sendCustomAlertEmail,
  clearMailSettingsCache,
  getCachedSettings,
};
