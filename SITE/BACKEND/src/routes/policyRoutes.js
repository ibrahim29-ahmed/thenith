import express from "express";
import Policy from "../models/Policy.js";

const router = express.Router();

// Helper to normalize bilingual field
function normalizeBilingual(val) {
  if (typeof val === "object" && val !== null) {
    return {
      ar: val.ar || "",
      en: val.en || "",
    };
  }
  const str = (val || "").toString().trim();
  return { ar: str, en: str };
}

// ── GET /api/policies ────────────────────────────────────────────────────────
// Returns a list of published policies for navigation & footer (or full policies if ?full=true)
router.get("/", async (req, res) => {
  try {
    const isFull = req.query.full === "true" || req.query.all === "true";
    let query = Policy.find({ status: "published" });

    if (!isFull) {
      query = query.select("_id title slug description displayOrder publishedAt updatedAt");
    }

    const policies = await query.sort({ displayOrder: 1, createdAt: 1 }).lean();

    const formatted = policies.map((p) => {
      const base = {
        _id: p._id,
        title: normalizeBilingual(p.title),
        slug: p.slug,
        description: normalizeBilingual(p.description),
        publishedAt: p.publishedAt,
        updatedAt: p.updatedAt,
      };

      if (isFull) {
        base.sections = (p.sections || [])
          .filter((s) => s.isVisible !== false)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
          .map((s, idx) => ({
            _id: s._id,
            heading: normalizeBilingual(s.heading),
            content: normalizeBilingual(s.content),
            displayOrder: typeof s.displayOrder === "number" ? s.displayOrder : idx,
            isVisible: s.isVisible !== false,
          }));
      }

      return base;
    });

    return res.json({
      success: true,
      policies: formatted,
    });
  } catch (error) {
    console.error("[Public Policy Error] Failed to fetch policies list:", error);
    return res.status(500).json({ error: "Failed to retrieve policies" });
  }
});

// ── GET /api/policies/:slug ──────────────────────────────────────────────────
// Returns a single published policy with its visible, ordered sections
router.get("/:slug", async (req, res) => {
  try {
    const cleanSlug = (req.params.slug || "").trim().toLowerCase();

    const policy = await Policy.findOne({
      slug: cleanSlug,
      status: "published",
    }).lean();

    if (!policy) {
      return res.status(404).json({
        error: "Policy page not found or is currently not published",
        code: "POLICY_NOT_FOUND",
      });
    }

    const visibleSections = (policy.sections || [])
      .filter((s) => s.isVisible !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((s, idx) => ({
        _id: s._id,
        heading: normalizeBilingual(s.heading),
        content: normalizeBilingual(s.content),
        displayOrder: typeof s.displayOrder === "number" ? s.displayOrder : idx,
        isVisible: s.isVisible !== false,
      }));

    return res.json({
      success: true,
      policy: {
        _id: policy._id,
        title: normalizeBilingual(policy.title),
        slug: policy.slug,
        description: normalizeBilingual(policy.description),
        publishedAt: policy.publishedAt,
        updatedAt: policy.updatedAt,
        sections: visibleSections,
      },
    });
  } catch (error) {
    console.error("[Public Policy Error] Failed to fetch policy details:", error);
    return res.status(500).json({ error: "Failed to retrieve policy details" });
  }
});

export default router;
