import nodemailer from "nodemailer";
import dns from "dns";
import net from "net";
import Setting from "../models/Setting.js";
import _env9847 from "../config/env.js";
const { env } = _env9847;

let currentTransporter = null;
let currentConfigKey = "";

// Dynamic DNS cache for SMTP host to prevent nodemailer's internal c-ares timeout on Windows
let cachedHostIp = null;
let lastLookupTime = 0;

let dynamicSettingsCache = null;
let lastSettingsFetch = 0;

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
    const result = await dns.promises.lookup(hostname);
    if (result?.address) {
      cachedHostIp = result.address;
      lastLookupTime = now;
      return result.address;
    }
  } catch (err) {
    console.warn(`[Mail] DNS lookup failed for ${hostname}:`, err.message);
  }
  return hostname;
}

function getMailFromEmail(dbSmtp) {
  if (dbSmtp?.from_email && dbSmtp.from_email.trim()) {
    return dbSmtp.from_email.trim();
  }
  const mailFrom = (env.MAIL_FROM || "").trim();
  const bracketAddress = mailFrom.match(/<([^<>]+)>/)?.[1]?.trim();
  if (bracketAddress) return bracketAddress;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailFrom)) return mailFrom;
  if (dbSmtp?.user && dbSmtp.user.includes("@")) return dbSmtp.user.trim();
  if (env.SMTP_USER && env.SMTP_USER.includes("@")) return env.SMTP_USER.trim();
  return "no-reply@thenith.com";
}

function getSenderName(messageType, siteName, dbSmtp) {
  if (dbSmtp?.from_name && dbSmtp.from_name.trim()) {
    return dbSmtp.from_name.trim();
  }
  const prefix = siteName || "Thenith";
  const names = {
    otp: `${prefix} Verification`,
    subscription: `${prefix} Billing`,
    order: `${prefix} Orders`,
  };
  return names[messageType] || prefix;
}

async function getFromAddress(messageType) {
  const settings = await getCachedSettings();
  const dbSmtp = settings.smtp_config;
  const siteName = settings.site_name || "Thenith";

  return {
    name: getSenderName(messageType, siteName, dbSmtp),
    address: getMailFromEmail(dbSmtp),
  };
}

async function getTransporter() {
  const settings = await getCachedSettings();
  const dbSmtp = settings.smtp_config;

  const host = dbSmtp?.host?.trim() || env.SMTP_HOST;
  const port = Number(dbSmtp?.port) || Number(env.SMTP_PORT) || 465;
  const secure =
    dbSmtp?.secure !== undefined
      ? Boolean(dbSmtp.secure)
      : Boolean(env.SMTP_SECURE) || port === 465;
  const user = dbSmtp?.user?.trim() || env.SMTP_USER;
  const pass = dbSmtp?.pass || env.SMTP_PASSWORD;

  if (!host || !user || !pass) return null;

  const configKey = `${host}:${port}:${user}:${pass}:${secure}`;
  if (currentTransporter && currentConfigKey === configKey) {
    return currentTransporter;
  }

  // Pre-resolve host IP to bypass Node's internal c-ares DNS timeout on Windows
  const targetHost = await resolveHostIp(host);

  const transportConfig = {
    host: targetHost,
    port,
    secure,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    auth: {
      user,
      pass,
    },
    tls: {
      servername: host,
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  };

  currentTransporter = nodemailer.createTransport(transportConfig);
  currentConfigKey = configKey;
  return currentTransporter;
}

async function sendMail({ to, subject, html, text, messageType }) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn(
      `[Mail Warning] SMTP is not configured; unable to send email to ${to}`,
    );
    return false;
  }

  try {
    const from = await getFromAddress(messageType);
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || "Thenith Notification",
      html,
    });
    return true;
  } catch (err) {
    console.error(`[Mail Error] Failed to send email to ${to}:`, err.message || err);
    return false;
  }
}

async function sendOtpEmail({ email, code }) {
  if (env.NODE_ENV !== "production") {
    console.log(`[OTP] ${email} -> ${code}`);
  }

  const settings = await getCachedSettings();
  const siteName = settings.site_name || "Thenith";
  const template = settings.email_templates?.otp;

  if (template && template.enabled !== false && template.body) {
    const variables = {
      code,
      site_name: siteName,
      customer_email: email,
      year: new Date().getFullYear(),
    };
    const subject = renderTemplate(
      template.subject || "رمز التحقق الخاص بك في {{site_name}}",
      variables
    );
    const bodyHtml = renderTemplate(template.body, variables);
    const html = wrapInEmailContainer({
      headline: template.headline || "رمز التحقق السريع",
      body: bodyHtml,
      siteName,
    });
    return await sendMail({
      to: email,
      subject,
      text: `رمز التحقق الخاص بك في ${siteName} هو ${code}.`,
      html,
      messageType: "otp",
    });
  }

  return await sendMail({
    to: email,
    subject: `رمز التحقق الخاص بك في ${siteName}`,
    text: `Your ${siteName} verification code is ${code}. It expires in 10 minutes.`,
    html: wrapInEmailContainer({
      headline: "رمز التحقق السريع",
      body: `<p>مرحباً بك،</p><p>رمز التحقق الخاص بحسابك في <strong>${siteName}</strong> هو:</p><div style="text-align:center;margin:25px 0;"><strong style="font-size:32px;letter-spacing:8px;color:#4f46e5;background:#eef2ff;padding:12px 24px;border-radius:10px;display:inline-block;">${code}</strong></div><p style="font-size:13px;color:#64748b;">هذا الرمز صالح لمدة 10 دقائق فقط.</p>`,
      siteName,
    }),
    messageType: "otp",
  });
}

async function sendSubscriptionEmail({
  email,
  name,
  planName = "Pro",
  billingPeriod = "monthly",
  amount,
  invoiceDate,
  startDate,
  endDate,
  status = "active",
  paymentMethodName,
  fawryCode,
}) {
  if (!email) return;

  const now = new Date();
  const formattedInvoiceDate =
    invoiceDate ||
    now.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const formattedStartDate =
    startDate ||
    now.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const end = new Date(now);
  if (billingPeriod === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  const formattedEndDate =
    endDate ||
    end.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const cleanPlanName =
    planName?.ar ||
    planName?.en ||
    (typeof planName === "string" ? planName : "Pro");
  const subject =
    status === "pending"
      ? `طلب اشتراك جديد - الباقة ${cleanPlanName}`
      : `تم تفعيل الباقة ${cleanPlanName}`;

  const html = `
<div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 30px 15px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.03);">
    
    <!-- Clean Header -->
    <div style="background: #0f172a; padding: 25px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: bold;">THENITH</h1>
      <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">${status === "pending" ? "تفاصيل طلب الاشتراك" : "فاتورة تفعيل الاشتراك"}</p>
    </div>

    <!-- Body -->
    <div style="padding: 25px;">
      <p style="font-size: 16px; margin: 0 0 15px 0;">مرحباً <strong>${name || "عميلنا العزيز"}</strong>،</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
        ${status === "pending" ? "تم استلام طلب الاشتراك الخاص بك وهو الآن قيد الانتظار لحين إتمام عملية الدفع. فيما يلي تفاصيل الطلب:" : "تم تفعيل اشتراكك بنجاح. فيما يلي تفاصيل الفاتورة والاشتراك:"}
      </p>

      <!-- Invoice Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; border: 1px solid #e2e8f0;">
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
            <td style="padding: 10px 15px; color: #64748b; width: 40%; border-left: 1px solid #e2e8f0;">اسم الباقة</td>
            <td style="padding: 10px 15px; font-weight: bold; color: #0f172a;">الباقة ${cleanPlanName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 15px; color: #64748b; border-left: 1px solid #e2e8f0;">المبلغ المدفوع</td>
            <td style="padding: 10px 15px; font-weight: bold; color: #0f172a;">${amount} ج.م</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
            <td style="padding: 10px 15px; color: #64748b; border-left: 1px solid #e2e8f0;">تاريخ الفاتورة</td>
            <td style="padding: 10px 15px; color: #0f172a;">${formattedInvoiceDate}</td>
          </tr>
          ${
            paymentMethodName
              ? `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 15px; color: #64748b; border-left: 1px solid #e2e8f0;">طريقة الدفع</td>
            <td style="padding: 10px 15px; color: #0f172a;">${paymentMethodName}</td>
          </tr>`
              : ""
          }
          ${
            fawryCode
              ? `
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
            <td style="padding: 10px 15px; color: #64748b; border-left: 1px solid #e2e8f0;">كود الدفع (فوري)</td>
            <td style="padding: 10px 15px; font-weight: bold; color: #0f172a;">${fawryCode}</td>
          </tr>`
              : ""
          }
          <tr style="border-bottom: 1px solid #e2e8f0; ${fawryCode ? "" : "background-color: #f8fafc;"}">
            <td style="padding: 10px 15px; color: #64748b; border-left: 1px solid #e2e8f0;">تاريخ بدء الاشتراك</td>
            <td style="padding: 10px 15px; color: #0f172a;">${formattedStartDate}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px 15px; color: #64748b; border-left: 1px solid #e2e8f0;">تاريخ الانتهاء</td>
            <td style="padding: 10px 15px; color: #0f172a; font-weight: bold;">${formattedEndDate}</td>
          </tr>
        </tbody>
      </table>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">يمكنك الاطلاع على كافة التفاصيل وإدارة حسابك عبر لوحة التحكم.</p>
    </div>
  </div>
</div>
`;

  const settings = await getCachedSettings();
  const siteName = settings.site_name || "Thenith";
  const template = settings.email_templates?.subscription_activated;

  let finalSubject =
    status === "pending"
      ? `طلب اشتراك جديد - الباقة ${cleanPlanName} | ${siteName}`
      : `تم تفعيل الباقة ${cleanPlanName} | ${siteName}`;
  let finalHtml = html;

  if (template && template.enabled !== false && template.body) {
    const variables = {
      customer_name: name || "عميلنا العزيز",
      plan_name: `الباقة ${cleanPlanName}`,
      amount: amount || 0,
      billing_period: billingPeriod === "yearly" ? "سنوي" : "شهري",
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      payment_method: paymentMethodName || "الدفع الإلكتروني",
      fawry_code: fawryCode || "",
      site_name: siteName,
      year: new Date().getFullYear(),
    };
    finalSubject = renderTemplate(template.subject || finalSubject, variables);
    const bodyHtml = renderTemplate(template.body, variables);
    finalHtml = wrapInEmailContainer({
      headline:
        template.headline ||
        (status === "pending" ? "تفاصيل طلب الاشتراك" : "فاتورة تفعيل الاشتراك"),
      body: bodyHtml,
      siteName,
    });
  }

  try {
    const sent = await sendMail({
      to: email,
      subject: finalSubject,
      html: finalHtml,
      messageType: "subscription",
    });
    if (sent) {
    }
  } catch (err) {
    console.error(
      `[Mail] Failed to send subscription email to ${email}:`,
      err.message,
    );
  }
}

async function sendOrderEmail({
  email,
  name,
  orderNumber,
  items = [],
  totalAmount,
  customerAddress,
  orderDate,
  status = "pending",
  paymentMethod,
  fawryCode,
}) {
  if (!email) return;

  const formattedOrderDate =
    orderDate ||
    new Date().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const itemsHtml = items
    .map(
      (item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? "background-color: #f8fafc;" : ""}">
      <td style="padding: 10px 15px; color: #0f172a; border-left: 1px solid #e2e8f0;">${item.name?.ar || item.name?.en || (typeof item.name === "string" ? item.name : "منتج")}</td>
      <td style="padding: 10px 15px; color: #475569; text-align: center; border-left: 1px solid #e2e8f0;">${item.quantity}</td>
      <td style="padding: 10px 15px; color: #0f172a; font-weight: bold; text-align: left;">${item.price * item.quantity} ج.م</td>
    </tr>
  `,
    )
    .join("");

  const defaultHtml = `
<div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 30px 15px; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.03);">
    
    <!-- Clean Header -->
    <div style="background: #0f172a; padding: 25px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: bold;">THENITH</h1>
      <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">فاتورة تفاصيل الطلب</p>
    </div>

    <!-- Body -->
    <div style="padding: 25px;">
      <p style="font-size: 16px; margin: 0 0 15px 0;">مرحباً <strong>${name || "عميلنا العزيز"}</strong>،</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
        ${status === "paid" ? "تم تأكيد دفع طلبك بنجاح وجاري العمل على تجهيزه. فيما يلي بيان فاتورة الطلب:" : "تم استلام طلبك بنجاح وهو قيد الانتظار لحين إتمام الدفع. فيما يلي تفاصيل الطلب:"}
      </p>

      <!-- Meta Info Box -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; border: 1px solid #e2e8f0;">
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
            <td style="padding: 10px 15px; color: #64748b; width: 40%; border-left: 1px solid #e2e8f0;">رقم الطلب</td>
            <td style="padding: 10px 15px; font-weight: bold; color: #0f172a; font-family: monospace;">${orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; color: #64748b; border-left: 1px solid #e2e8f0;">تاريخ الطلب</td>
            <td style="padding: 10px 15px; color: #0f172a;">${formattedOrderDate}</td>
          </tr>
          ${
            paymentMethod
              ? `
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
            <td style="padding: 10px 15px; color: #64748b; border-left: 1px solid #e2e8f0;">طريقة الدفع</td>
            <td style="padding: 10px 15px; font-weight: bold; color: #0f172a;">${paymentMethod}</td>
          </tr>`
              : ""
          }
          ${
            fawryCode
              ? `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 15px; color: #64748b; border-left: 1px solid #e2e8f0;">كود الدفع (فوري)</td>
            <td style="padding: 10px 15px; font-weight: bold; color: #0f172a;">${fawryCode}</td>
          </tr>`
              : ""
          }
        </tbody>
      </table>

      <!-- Items Table -->
      <h3 style="font-size: 14px; font-weight: bold; color: #0f172a; margin: 0 0 10px 0;">المنتجات المطلوبة:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 10px 15px; text-align: right; font-weight: bold; border-left: 1px solid #334155;">المنتج</th>
            <th style="padding: 10px 15px; text-align: center; font-weight: bold; border-left: 1px solid #334155;">الكمية</th>
            <th style="padding: 10px 15px; text-align: left; font-weight: bold;">السعر</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Address & Total -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; border: 1px solid #e2e8f0;">
        <tbody>
          ${
            customerAddress
              ? `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 15px; color: #64748b; width: 40%; border-left: 1px solid #e2e8f0;">عنوان الشحن والتوصيل</td>
            <td style="padding: 10px 15px; color: #0f172a;">${customerAddress}</td>
          </tr>`
              : ""
          }
          <tr style="background-color: #f8fafc;">
            <td style="padding: 12px 15px; font-weight: bold; color: #0f172a; border-left: 1px solid #e2e8f0;">المبلغ الإجمالي</td>
            <td style="padding: 12px 15px; font-weight: bold; color: #0f172a; font-size: 16px;">${totalAmount} ج.م</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</div>
`;

  const settings = await getCachedSettings();
  const siteName = settings.site_name || "Thenith";
  const template = settings.email_templates?.order_created;

  let finalSubject =
    status === "paid"
      ? `تم تأكيد دفع الطلب الخاص بك #${orderNumber} | ${siteName}`
      : `تفاصيل الطلب الخاص بك #${orderNumber} | ${siteName}`;
  let finalHtml = defaultHtml;

  if (template && template.enabled !== false && template.body) {
    const variables = {
      customer_name: name || "عميلنا العزيز",
      order_number: orderNumber,
      order_date: formattedOrderDate,
      total_amount: totalAmount || 0,
      payment_method: paymentMethod || "الدفع الإلكتروني",
      fawry_code: fawryCode || "",
      shipping_address: customerAddress || "العنوان المسجل",
      items_table: `
<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; border: 1px solid #e2e8f0;">
  <thead>
    <tr style="background-color: #0f172a; color: #ffffff;">
      <th style="padding: 10px 15px; text-align: right; font-weight: bold; border-left: 1px solid #334155;">المنتج</th>
      <th style="padding: 10px 15px; text-align: center; font-weight: bold; border-left: 1px solid #334155;">الكمية</th>
      <th style="padding: 10px 15px; text-align: left; font-weight: bold;">السعر</th>
    </tr>
  </thead>
  <tbody>
    ${itemsHtml}
  </tbody>
</table>`,
      site_name: siteName,
      year: new Date().getFullYear(),
    };
    finalSubject = renderTemplate(template.subject || finalSubject, variables);
    const bodyHtml = renderTemplate(template.body, variables);
    finalHtml = wrapInEmailContainer({
      headline: template.headline || "فاتورة تفاصيل الطلب",
      body: bodyHtml,
      siteName,
    });
  }

  try {
    const sent = await sendMail({
      to: email,
      subject: finalSubject,
      html: finalHtml,
      messageType: "order",
    });
    if (sent) {
    }
  } catch (err) {
    console.error(
      `[Mail] Failed to send order email to ${email}:`,
      err.message,
    );
  }
}

export async function sendSubscriptionExpiryEmail({
  email,
  name,
  planName = "Pro",
  expiresAt,
  daysLeft = 3,
  renewalUrl,
}) {
  if (!email) return false;

  const settings = await getCachedSettings();
  const siteName = settings.site_name || "THENITH";
  const siteUrl = env.SITE_URL || "https://thenith.com";
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
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">${siteName}</h1>
      <p style="margin: 8px 0 0; color: #cbd5e1; font-size: 14px;">مركز إدارة وتجديد الاشتراكات</p>
    </div>

    <div style="background-color: #fff1f2; border-bottom: 1px solid #fecdd3; padding: 12px 20px; text-align: center;">
      <span style="display: inline-block; background-color: #e11d48; color: #ffffff; font-size: 13px; font-weight: 700; padding: 4px 14px; border-radius: 9999px;">
        ${urgencyBadge}
      </span>
    </div>

    <div style="padding: 30px 25px;">
      <p style="font-size: 16px; margin: 0 0 16px 0; color: #1e293b;">
        مرحباً <strong>${name || "عميلنا العزيز"}</strong>،
      </p>

      <p style="font-size: 14px; color: #475569; line-height: 1.8; margin: 0 0 24px 0;">
        نود تذكيرك بأن اشتراكك في <strong style="color: #4f46e5;">باقة ${cleanPlanName}</strong> سينتهي بتاريخ <strong style="color: #0f172a;">${formattedDate}</strong>. لضمان استمرار عمل كروتك الذكية، الروابط المخصصة، والإحصائيات المتقدمة دون أي انقطاع، نوصي بتجديد الاشتراك الآن.
      </p>

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

      <div style="text-align: center; margin: 30px 0;">
        <a href="${targetRenewalUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 38px; border-radius: 12px; font-size: 15px; font-weight: 800; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
          تجديد الباقة الآن ←
        </a>
        <p style="font-size: 12px; color: #94a3b8; margin: 10px 0 0;">دفع فوري آمن عبر الفيزا، كروت ميزة، أو المحافظ الإلكترونية</p>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;" />

      <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0;">
        مع أطيب التحيات،<br>
        <strong>فريق عمل ${siteName}</strong>
      </p>
    </div>

    <div style="background-color: #f8fafc; padding: 18px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      © ${new Date().getFullYear()} ${siteName}. جميع الحقوق محفوظة.
    </div>
  </div>
</div>
  `;

  try {
    return await sendMail({
      to: email,
      subject,
      html,
      messageType: "subscription",
    });
  } catch (err) {
    console.error(`[Mail Error] Failed to send subscription expiry email:`, err.message);
    return false;
  }
}

export async function sendCustomAlertEmail({
  email,
  name,
  title,
  message,
  actionLabel,
  actionUrl,
  priority = "normal",
}) {
  if (!email || !title) return false;

  const settings = await getCachedSettings();
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
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 30px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">${siteName}</h1>
      <p style="margin: 6px 0 0; color: #cbd5e1; font-size: 14px;">إشعار وتنبيه هام</p>
    </div>

    <div style="padding: 30px 25px;">
      <p style="font-size: 16px; margin: 0 0 15px 0; color: #1e293b;">
        مرحباً <strong>${name || "عميلنا العزيز"}</strong>،
      </p>

      <div style="border-right: 4px solid ${priorityColor}; background-color: #f8fafc; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">${title}</h2>
      </div>

      <div style="font-size: 14px; color: #475569; line-height: 1.8; margin-bottom: 25px; white-space: pre-wrap;">
        ${message}
      </div>

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

    <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      © ${new Date().getFullYear()} ${siteName}. جميع الحقوق محفوظة.
    </div>
  </div>
</div>
  `;

  try {
    return await sendMail({
      to: email,
      subject,
      html,
      messageType: "notification",
    });
  } catch (err) {
    console.error(`[Mail Error] Failed to send alert email:`, err.message);
    return false;
  }
}

export default {
  sendOtpEmail,
  sendSubscriptionEmail,
  sendSubscriptionExpiryEmail,
  sendCustomAlertEmail,
  sendOrderEmail,
  clearMailSettingsCache,
};
