import Policy from "../models/Policy.js";
import { sanitizeHtml } from "../util/htmlSanitizer.js";

// Helper: Normalize bilingual input { ar, en }
function normalizeBilingual(val) {
  if (typeof val === "object" && val !== null) {
    return {
      ar: (val.ar || "").trim(),
      en: (val.en || "").trim(),
    };
  }
  const str = (val || "").toString().trim();
  return { ar: str, en: "" };
}

// Helper: Normalize bilingual HTML content
function normalizeBilingualHtml(val) {
  if (typeof val === "object" && val !== null) {
    return {
      ar: sanitizeHtml(val.ar || ""),
      en: sanitizeHtml(val.en || ""),
    };
  }
  const str = sanitizeHtml(val || "");
  return { ar: str, en: "" };
}

// Helper: generate a URL-friendly slug
function generateSlug(text) {
  if (!text) return "";

  let candidate = text;
  if (typeof text === "object" && text !== null) {
    candidate = text.en || text.ar || "";
  }

  const lower = String(candidate).trim().toLowerCase();
  if (lower.includes("privacy") || lower.includes("خصوصي")) return "privacy-policy";
  if (lower.includes("terms") || lower.includes("condition") || lower.includes("شروط") || lower.includes("أحكام") || lower.includes("احكام")) return "terms-and-conditions";
  if (lower.includes("return") || lower.includes("refund") || lower.includes("استرجاع") || lower.includes("استبدال")) return "return-policy";
  if (lower.includes("shipping") || lower.includes("delivery") || lower.includes("شحن") || lower.includes("توصيل")) return "shipping-policy";
  if (lower.includes("usage") || lower.includes("استخدام")) return "usage-policy";

  return String(candidate)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u0621-\u064A\-]/g, "")
    .replace(/\-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── GET /api/admin/policies ──────────────────────────────────────────────────
export const getPolicies = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { "title.ar": { $regex: q, $options: "i" } },
        { "title.en": { $regex: q, $options: "i" } },
        { title: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
        { "description.ar": { $regex: q, $options: "i" } },
        { "description.en": { $regex: q, $options: "i" } },
      ];
    }

    const policies = await Policy.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    const formatted = policies.map((p) => ({
      _id: p._id,
      title: normalizeBilingual(p.title),
      slug: p.slug,
      description: normalizeBilingual(p.description),
      status: p.status,
      displayOrder: p.displayOrder,
      sectionsCount: (p.sections || []).length,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return res.json({
      success: true,
      count: formatted.length,
      policies: formatted,
    });
  } catch (error) {
    console.error("[Policies Error] Failed to fetch policies:", error);
    return res.status(500).json({ error: "تعذر جلب صفحات السياسات" });
  }
};

// ── GET /api/admin/policies/:id ──────────────────────────────────────────────
export const getPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findById(id).lean();
    if (!policy) {
      return res.status(404).json({ error: "صفحة السياسة غير موجودة" });
    }

    const sections = (policy.sections || [])
      .map((s, idx) => ({
        _id: s._id,
        heading: normalizeBilingual(s.heading),
        content: normalizeBilingualHtml(s.content),
        displayOrder: typeof s.displayOrder === "number" ? s.displayOrder : idx,
        isVisible: s.isVisible !== false,
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    return res.json({
      success: true,
      policy: {
        ...policy,
        title: normalizeBilingual(policy.title),
        description: normalizeBilingual(policy.description),
        sections,
      },
    });
  } catch (error) {
    console.error("[Policies Error] Failed to fetch policy details:", error);
    return res.status(500).json({ error: "تعذر جلب تفاصيل السياسة" });
  }
};

// ── POST /api/admin/policies ─────────────────────────────────────────────────
export const createPolicy = async (req, res) => {
  try {
    const { title, slug, description, status, displayOrder, sections } = req.body;

    const normTitle = normalizeBilingual(title);
    if (!normTitle.ar && !normTitle.en) {
      return res.status(400).json({ error: "عنوان صفحة السياسة مطلوب (عربي أو إنجليزي)" });
    }

    let finalSlug = slug ? slug.trim().toLowerCase() : generateSlug(normTitle.en || normTitle.ar);
    finalSlug = finalSlug
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\u0621-\u064A\-]/g, "")
      .replace(/\-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!finalSlug) {
      finalSlug = `policy-${Date.now()}`;
    }

    const existing = await Policy.findOne({ slug: finalSlug });
    if (existing) {
      return res.status(400).json({
        error: `الرابط المخصص '${finalSlug}' مستخدم بالفعل لصفحة سياسة أخرى. يرجى اختيار رابط مختلف.`,
      });
    }

    let finalOrder = Number(displayOrder);
    if (isNaN(finalOrder)) {
      const highest = await Policy.findOne().sort({ displayOrder: -1 }).select("displayOrder");
      finalOrder = highest ? (highest.displayOrder || 0) + 1 : 0;
    }

    const cleanSections = Array.isArray(sections)
      ? sections.map((sec, idx) => ({
          heading: normalizeBilingual(sec.heading),
          content: normalizeBilingualHtml(sec.content),
          displayOrder: typeof sec.displayOrder === "number" ? sec.displayOrder : idx,
          isVisible: sec.isVisible !== false,
        }))
      : [];

    const isPublished = status === "published";

    const policy = new Policy({
      title: normTitle,
      slug: finalSlug,
      description: normalizeBilingual(description),
      status: isPublished ? "published" : "draft",
      displayOrder: finalOrder,
      publishedAt: isPublished ? new Date() : null,
      sections: cleanSections,
    });

    await policy.save();

    return res.status(201).json({
      success: true,
      message: isPublished ? "تم إنشاء ونشر صفحة السياسة بنجاح" : "تم حفظ مسودة صفحة السياسة بنجاح",
      policy,
    });
  } catch (error) {
    console.error("[Policies Error] Failed to create policy:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "الرابط المخصص (Slug) مستخدم بالفعل" });
    }
    return res.status(500).json({ error: "تعذر إنشاء صفحة السياسة" });
  }
};

// ── PUT /api/admin/policies/:id ──────────────────────────────────────────────
export const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, description, status, displayOrder, sections } = req.body;

    const policy = await Policy.findById(id);
    if (!policy) {
      return res.status(404).json({ error: "صفحة السياسة غير موجودة" });
    }

    if (title !== undefined) {
      policy.title = normalizeBilingual(title);
    }

    if (slug && slug.trim()) {
      const cleanSlug = slug
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/[^\w\u0621-\u064A\-]/g, "")
        .replace(/\-+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (cleanSlug !== policy.slug) {
        const duplicate = await Policy.findOne({ slug: cleanSlug, _id: { $ne: id } });
        if (duplicate) {
          return res.status(400).json({
            error: `الرابط المخصص '${cleanSlug}' مستخدم بالفعل لصفحة أخرى`,
          });
        }
        policy.slug = cleanSlug;
      }
    }

    if (description !== undefined) {
      policy.description = normalizeBilingual(description);
    }

    if (displayOrder !== undefined && !isNaN(Number(displayOrder))) {
      policy.displayOrder = Number(displayOrder);
    }

    if (status && (status === "draft" || status === "published")) {
      if (status === "published" && !policy.publishedAt) {
        policy.publishedAt = new Date();
      }
      policy.status = status;
    }

    if (Array.isArray(sections)) {
      policy.sections = sections.map((sec, idx) => ({
        _id: sec._id,
        heading: normalizeBilingual(sec.heading),
        content: normalizeBilingualHtml(sec.content),
        displayOrder: typeof sec.displayOrder === "number" ? sec.displayOrder : idx,
        isVisible: sec.isVisible !== false,
      }));
    }

    await policy.save();

    return res.json({
      success: true,
      message: "تم تحديث صفحة السياسة بنجاح",
      policy,
    });
  } catch (error) {
    console.error("[Policies Error] Failed to update policy:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "الرابط المخصص (Slug) مستخدم بالفعل" });
    }
    return res.status(500).json({ error: "تعذر تحديث صفحة السياسة" });
  }
};

// ── DELETE /api/admin/policies/:id ───────────────────────────────────────────
export const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findByIdAndDelete(id);
    if (!policy) {
      return res.status(404).json({ error: "صفحة السياسة غير موجودة" });
    }

    const titleStr = typeof policy.title === "object" ? (policy.title.ar || policy.title.en) : policy.title;
    return res.json({
      success: true,
      message: `تم حذف صفحة '${titleStr || ""}' بنجاح`,
    });
  } catch (error) {
    console.error("[Policies Error] Failed to delete policy:", error);
    return res.status(500).json({ error: "تعذر حذف صفحة السياسة" });
  }
};

// ── PATCH /api/admin/policies/:id/status ─────────────────────────────────────
export const togglePolicyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const policy = await Policy.findById(id);
    if (!policy) {
      return res.status(404).json({ error: "صفحة السياسة غير موجودة" });
    }

    const nextStatus = status ? status : policy.status === "published" ? "draft" : "published";
    policy.status = nextStatus;
    if (nextStatus === "published" && !policy.publishedAt) {
      policy.publishedAt = new Date();
    }

    await policy.save();

    return res.json({
      success: true,
      message: nextStatus === "published" ? "تم نشر السياسة بنجاح" : "تم تحويل السياسة إلى مسودة",
      status: nextStatus,
      policy,
    });
  } catch (error) {
    console.error("[Policies Error] Failed to toggle policy status:", error);
    return res.status(500).json({ error: "تعذر تغيير حالة السياسة" });
  }
};

// ── PUT /api/admin/policies/:id/sections/reorder ─────────────────────────────
export const reorderSections = async (req, res) => {
  try {
    const { id } = req.params;
    const { sections } = req.body;

    if (!Array.isArray(sections)) {
      return res.status(400).json({ error: "يجب تقديم مصفوفة من الأقسام مع الترتيب" });
    }

    const policy = await Policy.findById(id);
    if (!policy) {
      return res.status(404).json({ error: "صفحة السياسة غير موجودة" });
    }

    const orderMap = new Map();
    sections.forEach((item, index) => {
      const order = typeof item.displayOrder === "number" ? item.displayOrder : index;
      orderMap.set(String(item._id || item.id), order);
    });

    policy.sections.forEach((sec) => {
      const customOrder = orderMap.get(String(sec._id));
      if (customOrder !== undefined) {
        sec.displayOrder = customOrder;
      }
    });

    policy.sections.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    await policy.save();

    return res.json({
      success: true,
      message: "تم تحديث ترتيب الأقسام بنجاح",
      sections: policy.sections,
    });
  } catch (error) {
    console.error("[Policies Error] Failed to reorder sections:", error);
    return res.status(500).json({ error: "تعذر إعادة ترتيب الأقسام" });
  }
};

// ── PUT /api/admin/policies/reorder ──────────────────────────────────────────
export const reorderPolicies = async (req, res) => {
  try {
    const { policyIds } = req.body;

    if (!Array.isArray(policyIds) || policyIds.length === 0) {
      return res.status(400).json({ error: "يجب توفير مصفوفة معرّفات الصفحات" });
    }

    const bulkOps = policyIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { displayOrder: index } },
      },
    }));

    await Policy.bulkWrite(bulkOps);

    return res.json({
      success: true,
      message: "تم حفظ الترتيب الجديد للصفحات بنجاح",
    });
  } catch (error) {
    console.error("[Policies Error] Failed to reorder policies:", error);
    return res.status(500).json({ error: "تعذر إعادة ترتيب الصفحات" });
  }
};

// ── POST /api/admin/policies/seed-defaults ───────────────────────────────────
export const seedDefaultPolicies = async (req, res) => {
  try {
    // If force is passed or collection is empty, re-seed with full bilingual data
    if (req.query.force) {
      await Policy.deleteMany({});
    } else {
      const count = await Policy.countDocuments();
      if (count > 0) {
        return res.json({
          success: true,
          message: "توجد صفحات سياسات بالفعل في النظام",
          seeded: false,
        });
      }
    }

    const defaults = [
      {
        title: {
          ar: "سياسة الخصوصية وحماية البيانات",
          en: "Privacy & Data Protection Policy",
        },
        slug: "privacy-policy",
        description: {
          ar: "توضح هذه السياسة كيفية جمع واستخدام وحماية بياناتك ومعلوماتك الشخصية عند استخدام منصة Thenith.",
          en: "This policy outlines how Thenith collects, uses, and protects your personal data and information.",
        },
        status: "published",
        displayOrder: 0,
        publishedAt: new Date(),
        sections: [
          {
            heading: {
              ar: "مقدمة والتزامنا بالخصوصية",
              en: "Introduction & Privacy Commitment",
            },
            content: {
              ar: "<p>نحن في <strong>Thenith</strong> نولي خصوصية بيانات مستخدمينا أهمية قصوى ونلتزم بحمايتها وفقاً لأعلى معايير الأمان والتشفير العالمية. تحدد هذه السياسة الخطوط العريضة لجمع واستخدام البيانات عند التفاعل مع خدماتنا وبطاقاتنا الذكية.</p>",
              en: "<p>At <strong>Thenith</strong>, we prioritize the privacy and security of our users' data, committed to protecting it in accordance with international standards.</p>",
            },
            displayOrder: 0,
            isVisible: true,
          },
          {
            heading: {
              ar: "البيانات التي نقوم بجمعها",
              en: "Data We Collect",
            },
            content: {
              ar: "<p>نقوم بجمع المعلومات الضرورية لتقديم وتطوير الخدمة، وتشمل:</p><ul><li>معلومات الحساب: الاسم، البريد الإلكتروني، ورقم الهاتف.</li><li>بيانات الملف الرقمي: الروابط والبيانات المهنية التي تختار إضافتها لكروتك الذكية.</li><li>بيانات الشحن وعنوان التوصيل عند طلب البطاقات المادية.</li></ul>",
              en: "<p>We collect only the essential information needed to provide and enhance our services, including:</p><ul><li>Account details: name, email address, and phone number.</li><li>Digital profile data: professional links and bio details you choose to share on your smart cards.</li><li>Shipping details: delivery address for physical smart card orders.</li></ul>",
            },
            displayOrder: 1,
            isVisible: true,
          },
          {
            heading: {
              ar: "حماية وأمان البيانات",
              en: "Data Protection & Security",
            },
            content: {
              ar: "<p>نطبق بروتوكولات تشفير متقدمة <em>(SSL / TLS 256-bit)</em> وتخزيناً سحابياً مؤمناً بالكامل لمنع أي وصول غير مصرح به أو تسريب للبيانات الشخصية.</p>",
              en: "<p>We implement industry-standard <em>256-bit SSL/TLS encryption</em> and secure cloud storage to protect your data against unauthorized access or breaches.</p>",
            },
            displayOrder: 2,
            isVisible: true,
          },
        ],
      },
      {
        title: {
          ar: "الشروط والأحكام",
          en: "Terms & Conditions",
        },
        slug: "terms-and-conditions",
        description: {
          ar: "القواعد والبنود المنظمة لاستخدام منصة Thenith وبطاقات الأعمال الذكية التفاعلية.",
          en: "The rules, guidelines, and terms governing the use of Thenith platform and smart business cards.",
        },
        status: "published",
        displayOrder: 1,
        publishedAt: new Date(),
        sections: [
          {
            heading: {
              ar: "الموافقة على الشروط واللوائح",
              en: "Acceptance of Terms",
            },
            content: {
              ar: "<p>باستخدامك لمنصة <strong>Thenith</strong> أو شراء أي من منتجاتنا وخدماتنا، فإنك تقر وتوافق على الالتزام الكامل بهذه الشروط والأحكام واللوائح المطبقة.</p>",
              en: "<p>By accessing or using <strong>Thenith</strong> services and products, you agree to be bound by these Terms and Conditions and all applicable laws.</p>",
            },
            displayOrder: 0,
            isVisible: true,
          },
          {
            heading: {
              ar: "استخدام الحساب والمسؤولية",
              en: "Account Usage & Responsibilities",
            },
            content: {
              ar: "<p>يتحمل المستخدم المسؤولية الكاملة عن سرية بيانات حسابه وكلمة المرور، وعن صحة وملاءمة أي محتوى أو روابط يتم نشرها عبر كروته الذكية.</p>",
              en: "<p>Users maintain full responsibility for maintaining account confidentiality and for all content, links, and information shared through their smart cards.</p>",
            },
            displayOrder: 1,
            isVisible: true,
          },
          {
            heading: {
              ar: "الملكية الفكرية والعلامات التجارية",
              en: "Intellectual Property",
            },
            content: {
              ar: "<p>جميع العلامات التجارية، التصاميم، البرمجيات، والمحتوى المتوفر على المنصة هي ملك حصري لمنصة <strong>Thenith</strong> ومحمية بموجب قوانين الملكية الفكرية.</p>",
              en: "<p>All designs, software, trademarks, and branding on this platform are the exclusive intellectual property of <strong>Thenith</strong>.</p>",
            },
            displayOrder: 2,
            isVisible: true,
          },
        ],
      },
      {
        title: {
          ar: "سياسة الاسترجاع والاستبدال",
          en: "Return & Refund Policy",
        },
        slug: "return-policy",
        description: {
          ar: "شروط وضوابط إرجاع أو استبدال البطاقات الذكية والمنتجات المادية.",
          en: "Policies and guidelines for returning, replacing, or refunding physical smart cards and products.",
        },
        status: "published",
        displayOrder: 2,
        publishedAt: new Date(),
        sections: [
          {
            heading: {
              ar: "فترة الاسترجاع للمنتجات القياسية",
              en: "Standard Products Return Period",
            },
            content: {
              ar: "<p>يحق للعميل طلب استبدال أو استرجاع المنتجات المادية غير المطبوعة ببيانات مخصصة خلال <strong>14 يوماً</strong> من تاريخ الاستلام، شريطة أن يكون المنتج بحالته الأصلية وفي عبوته الكاملة.</p>",
              en: "<p>Customers may request returns or replacements for non-customized physical products within <strong>14 days</strong> of delivery, provided the item is in its original packaging and unused condition.</p>",
            },
            displayOrder: 0,
            isVisible: true,
          },
          {
            heading: {
              ar: "المنتجات المصممة والمطبوعة بالاسم",
              en: "Custom-Printed Smart Cards",
            },
            content: {
              ar: "<p>نظراً لطبيعة الكروت المخصصة التي يتم طباعتها وتجهيزها ببيانات العميل واسمه، لا يمكن استرجاعها إلا في حال وجود عيب مصنعي أو خطأ في الطباعة من جانبنا.</p>",
              en: "<p>Because personalized cards are custom-crafted and programmed with individual names and data, they are non-refundable unless there is a verified manufacturing defect or printing error.</p>",
            },
            displayOrder: 1,
            isVisible: true,
          },
          {
            heading: {
              ar: "طريقة استرداد الأموال",
              en: "Refund Processing",
            },
            content: {
              ar: "<p>يتم استرداد المبالغ بنفس وسيلة الدفع الأصلية (البطاقة الائتمانية أو المحفظة الإلكترونية) خلال <strong>5 إلى 14 يوم عمل</strong> من تاريخ فحص واستلام المنتج المرتجع.</p>",
              en: "<p>Refunds are issued to the original payment method within <strong>5 to 14 business days</strong> following our receipt and inspection of the returned product.</p>",
            },
            displayOrder: 2,
            isVisible: true,
          },
        ],
      },
      {
        title: {
          ar: "سياسة الشحن والتوصيل",
          en: "Shipping & Delivery Policy",
        },
        slug: "shipping-policy",
        description: {
          ar: "معلومات التوصيل، فترات الشحن، ومناطق التغطية لكروت Thenith الذكية.",
          en: "Delivery times, shipping rates, and coverage areas for Thenith smart business cards.",
        },
        status: "published",
        displayOrder: 3,
        publishedAt: new Date(),
        sections: [
          {
            heading: {
              ar: "فترة تجهيز وبرمجة الكروت",
              en: "Processing & Production Time",
            },
            content: {
              ar: "<p>يتم تصنيع وبرمجة الكروت الذكية واختبار رقاقات NFC الخاصة بها خلال <strong>24 إلى 48 ساعة</strong> من تأكيد الدفع والبيانات.</p>",
              en: "<p>Smart cards are custom-manufactured, programmed, and rigorously NFC-tested within <strong>24 to 48 hours</strong> after order and payment confirmation.</p>",
            },
            displayOrder: 0,
            isVisible: true,
          },
          {
            heading: {
              ar: "مدة التوصيل والتكلفة",
              en: "Delivery Timeline & Costs",
            },
            content: {
              ar: "<p>يتم الشحن والتوصيل لجميع المحافظات خلال <strong>2 إلى 4 أيام عمل</strong>. تظهر تكلفة الشحن بدقة في صفحة إتمام الطلب بناءً على المحافظة المحددة.</p>",
              en: "<p>We deliver to all governorates across Egypt within <strong>2 to 4 business days</strong>. Shipping fees are calculated and clearly shown at checkout based on the selected destination.</p>",
            },
            displayOrder: 1,
            isVisible: true,
          },
        ],
      },
    ];

    await Policy.insertMany(defaults);

    return res.json({
      success: true,
      message: "تم تجهيز السياسات الافتراضية ثنائية اللغة (عربي / إنجليزي) بنجاح",
      count: defaults.length,
    });
  } catch (error) {
    console.error("[Policies Error] Failed to seed default policies:", error);
    return res.status(500).json({ error: "تعذر تجهيز السياسات الافتراضية" });
  }
};

export default {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  togglePolicyStatus,
  reorderSections,
  reorderPolicies,
  seedDefaultPolicies,
};
