import mongoose from "mongoose";
import PhysicalCard from "../models/PhysicalCard.js";
import Card from "../models/Card.js";
import User from "../models/User.js";
import CardActivityLog from "../models/CardActivityLog.js";
import { asyncHandler } from "../util/asyncHandler.js";
import { HttpError } from "../util/httpError.js";

// Helper to extract clean candidate IDs from string, URL, or code
function extractCandidateIds(input) {
  if (!input || typeof input !== "string") return [];
  let raw = input.trim().replace(/\/+$/, "");

  // If input is a URL like https://thenith.com/c/zkrtv2 or /c/zkrtv2
  if (raw.includes("/c/")) {
    const parts = raw.split("/c/");
    raw = parts[parts.length - 1].split("?")[0].split("#")[0].replace(/\/+$/, "").trim();
  } else if (raw.includes("/")) {
    const parts = raw.split("/");
    raw = parts[parts.length - 1].split("?")[0].split("#")[0].replace(/\/+$/, "").trim();
  }

  if (!raw) return [];

  return Array.from(new Set([
    raw,
    raw.toLowerCase(),
    raw.toUpperCase(),
  ])).filter(Boolean);
}

// ── 1. Public Resolver: GET /api/cards/resolve/:publicId ──────────────────────
// Used by the public https://thenith.com/c/{publicId} landing page
export const resolvePublicCard = asyncHandler(async (request, response) => {
  const { publicId } = request.params;
  if (!publicId) throw new HttpError(400, "publicId is required");

  const candidateIds = extractCandidateIds(publicId);

  const card = await PhysicalCard.findOne({
    $or: [
      { publicId: { $in: candidateIds } },
      { cardId: { $in: candidateIds } },
    ],
  })
    .populate("userId", "name username avatar isActive isEmailVerified publicId activeCardId")
    .populate("profileId", "name publicId personal isActive");

  // Case 1: Card not found -> 404
  if (!card) {
    return response.status(404).json({
      success: false,
      status: "not_found",
      message: "الكارت غير موجود",
    });
  }

  // Case 2: Card disabled -> display disabled message
  if (card.status === "disabled") {
    return response.json({
      success: true,
      status: "disabled",
      message: "هذا الكارت معطّل إدارياً ولا يمكن الوصول إلى البروفايل من خلاله حالياً.",
      disabledReason: card.disabledReason || "",
    });
  }

  // Case 2.5: Direct Target URL or User Public ID configured in Admin Dashboard
  if (card.targetUrl && card.targetUrl.trim()) {
    let rawTarget = card.targetUrl.trim();
    let destination = rawTarget;

    try {
      if (/^https?:\/\//i.test(rawTarget)) {
        const u = new URL(rawTarget);
        if (
          u.hostname === "localhost" ||
          u.hostname === "127.0.0.1" ||
          u.hostname.includes("thenith.com")
        ) {
          destination = u.pathname + u.search + u.hash;
        } else {
          destination = rawTarget;
        }
      } else if (rawTarget.startsWith("/")) {
        destination = rawTarget;
      } else if (rawTarget.includes("thenith.com")) {
        const clean = rawTarget.replace(/^https?:\/\//i, "");
        const pathPart = clean.substring(clean.indexOf("/"));
        destination = pathPart && pathPart.startsWith("/") ? pathPart : "https://" + clean;
      } else {
        // Check if target is a User publicId or username
        const targetUser = await User.findOne({
          $or: [{ publicId: rawTarget }, { username: rawTarget.toLowerCase() }],
        });
        if (targetUser) {
          destination = `/p/${targetUser.publicId}`;
        } else {
          const targetProfile = await Card.findOne({ publicId: rawTarget });
          if (targetProfile) {
            destination = `/p/${targetProfile.publicId}`;
          } else {
            destination = `/p/${rawTarget}`;
          }
        }
      }
    } catch {
      destination = rawTarget;
    }

    if (request.accepts("html") && !request.xhr && !request.headers["x-requested-with"] && !request.headers["accept"]?.includes("application/json")) {
      return response.redirect(302, destination);
    }

    return response.json({
      success: true,
      status: "redirect",
      redirectUrl: destination,
      targetPath: destination,
    });
  }

  // Case 3: Card unclaimed -> display unclaimed information and CTA
  if (card.status === "unclaimed") {
    return response.json({
      success: true,
      status: "unclaimed",
      message: "هذا الكارت ذكي من Thenith ولم يتم تفعيله أو ربطه بحساب بعد.",
      card: {
        cardId: card.cardId,
        publicId: card.publicId,
        cardType: card.cardType,
        color: card.color,
      },
    });
  }

  // Case 4: Card claimed -> redirect directly to the owner's profile using publicId
  if (card.status === "claimed") {
    const owner = card.userId;
    const profile = card.profileId;

    // Check if owner exists and is active
    if (!owner || !owner.isActive) {
      return response.json({
        success: true,
        status: "profile_unavailable",
        message: "البروفايل المرتبط بهذا الكارت غير متاح حالياً.",
      });
    }

    // Direct Profile Public ID from database (user.publicId or active profile publicId)
    let profilePublicId = owner.publicId || profile?.publicId;
    if (!profilePublicId && owner._id) {
      const userCard = await Card.findOne({ userId: owner._id, isActive: true });
      profilePublicId = userCard?.publicId;
    }
    const dest = `/p/${profilePublicId}`;

    if (request.accepts("html") && !request.xhr && !request.headers["x-requested-with"] && !request.headers["accept"]?.includes("application/json")) {
      return response.redirect(302, dest);
    }

    return response.json({
      success: true,
      status: "claimed",
      redirectUrl: dest,
      targetPath: dest,
      profile: {
        publicId: profilePublicId,
        username: owner.username || null,
        name: owner.name,
        avatar: owner.avatar || profile?.personal?.avatar || "",
        title: profile?.personal?.title || "",
        company: profile?.personal?.company || "",
        targetPath: `/p/${profilePublicId}`,
      },
    });
  }

  return response.status(500).json({ success: false, message: "Unknown card state" });
});

// ── 2. User Claim Card: POST /api/cards/claim ─────────────────────────────────
// Connects an unclaimed physical card with an authenticated user's direct profile
export const claimPhysicalCard = asyncHandler(async (request, response) => {
  const { publicId, profileId } = request.body;
  const user = request.user;

  if (!publicId || typeof publicId !== "string" || !publicId.trim()) {
    throw new HttpError(400, "يرجى إدخال معرّف أو كود أو رابط الكارت");
  }

  const candidateIds = extractCandidateIds(publicId);
  if (!candidateIds.length) {
    throw new HttpError(400, "كود الكارت غير صالح");
  }

  const cardMatchFilter = {
    $or: [
      { publicId: { $in: candidateIds } },
      { cardId: { $in: candidateIds } },
    ],
  };

  // Direct Profile Link: User's publicId in database (e.g. /p/b2mk6w)
  const directProfilePublicId = user.publicId || user.username || String(user._id);
  const targetDestination = directProfilePublicId ? `/p/${directProfilePublicId}` : `/p`;

  // Optional: keep digital card referenced if available
  let targetProfile = null;
  if (profileId) {
    targetProfile = await Card.findOne({ _id: profileId, userId: user._id });
  }
  if (!targetProfile) {
    targetProfile = await Card.findActiveForUser(user._id, user.activeCardId);
  }

  // Atomic claim: only succeed if status is currently 'unclaimed'
  const claimedCard = await PhysicalCard.findOneAndUpdate(
    {
      ...cardMatchFilter,
      status: "unclaimed",
    },
    {
      $set: {
        status: "claimed",
        userId: user._id,
        profileId: targetProfile ? targetProfile._id : null,
        targetUrl: targetDestination, // Direct profile URL using user.publicId
        claimedAt: new Date(),
      },
    },
    { new: true }
  )
    .select("cardId publicId status cardType color targetUrl claimedAt profileId")
    .populate("profileId", "name publicId personal.avatar personal.title personal.company");

  if (!claimedCard) {
    // Investigate failure reason to return helpful error
    const existing = await PhysicalCard.findOne(cardMatchFilter);
    if (!existing) {
      throw new HttpError(404, "هذا الكارت غير موجود أو ليس مسجلاً ضمن كروت Thenith الرسمية. تأكد من إدخال الكود بشكل صحيح.");
    }
    if (existing.status === "disabled") {
      throw new HttpError(403, "هذا الكارت معطّل إدارياً ولا يمكن ربطه حالياً");
    }
    if (existing.status === "claimed") {
      if (String(existing.userId) === String(user._id)) {
        return response.json({
          success: true,
          message: "الكارت مربوط بالفعل بحسابك",
          card: {
            _id: existing._id,
            cardId: existing.cardId,
            publicId: existing.publicId,
            status: existing.status,
            cardType: existing.cardType,
            color: existing.color,
            claimedAt: existing.claimedAt,
            targetUrl: existing.targetUrl,
          },
        });
      }
      throw new HttpError(409, "هذا الكارت مربوط بالفعل بحساب مستخدم آخر");
    }
    throw new HttpError(400, "تعذر ربط الكارت");
  }

  // Audit log safely without crashing request
  try {
    await CardActivityLog.create({
      cardId: claimedCard._id,
      action: "CARD_CLAIMED",
      actorType: "user",
      actorId: String(user._id),
      actorIp: request.ip,
      status: "success",
      message: `Card ${claimedCard.cardId} claimed by user ${user.email}`,
      safeMetadata: {
        userId: String(user._id),
        profileId: targetProfile ? String(targetProfile._id) : null,
        cardId: claimedCard.cardId,
        publicId: claimedCard.publicId,
        targetUrl: targetDestination,
      },
    });
  } catch (auditErr) {
    console.error("CardActivityLog error on claim:", auditErr.message);
  }

  response.status(200).json({
    success: true,
    message: "تم ربط الكارت الذكي بنجاح بحسابك!",
    card: {
      _id: claimedCard._id,
      cardId: claimedCard.cardId,
      publicId: claimedCard.publicId,
      status: claimedCard.status,
      cardType: claimedCard.cardType,
      color: claimedCard.color,
      targetUrl: claimedCard.targetUrl,
      claimedAt: claimedCard.claimedAt,
      profileId: claimedCard.profileId,
    },
  });
});

// ── 3. List User's Claimed Physical Cards: GET /api/cards/my-cards ────────────
export const listMyPhysicalCards = asyncHandler(async (request, response) => {
  const user = request.user;

  const cards = await PhysicalCard.find({ userId: user._id })
    .select("cardId publicId status cardType color orderColor productName targetUrl claimedAt profileId")
    .populate("profileId", "name publicId personal.avatar personal.title personal.company")
    .sort({ claimedAt: -1 })
    .lean();

  response.json({
    success: true,
    cards,
  });
});

// ── 4. Reassign Profile: PATCH /api/cards/my-cards/:id/profile ────────────────
export const reassignCardProfile = asyncHandler(async (request, response) => {
  const { id } = request.params;
  const { profileId } = request.body;
  const user = request.user;

  if (!profileId) throw new HttpError(400, "profileId is required");

  // Verify user owns the target profile
  const newProfile = await Card.findOne({ _id: profileId, userId: user._id });
  if (!newProfile) throw new HttpError(404, "البروفايل غير موجود أو لا تملكه");

  // Verify user owns the physical card
  const card = await PhysicalCard.findOne({ _id: id, userId: user._id });
  if (!card) throw new HttpError(404, "الكارت غير موجود بحسابك");

  const oldProfileId = card.profileId;
  card.profileId = newProfile._id;
  card.targetUrl = `/p/${newProfile.publicId || user.publicId}`;
  await card.save();

  // Audit log safely
  try {
    await CardActivityLog.create({
      cardId: card._id,
      action: "PROFILE_CHANGED",
      actorType: "user",
      actorId: String(user._id),
      actorIp: request.ip,
      status: "info",
      message: `Profile reassigned for card ${card.cardId}`,
      safeMetadata: {
        previousProfileId: oldProfileId ? String(oldProfileId) : null,
        newProfileId: String(newProfile._id),
      },
    });
  } catch (err) {
    console.error("Audit log error on reassign:", err.message);
  }

  response.json({
    success: true,
    message: "تم تغيير البروفايل المرتبط بنجاح",
    card,
  });
});

// ── 5. User Unlink Card: DELETE /api/cards/my-cards/:id ───────────────────────
export const unlinkMyPhysicalCard = asyncHandler(async (request, response) => {
  const { id } = request.params;
  const user = request.user;

  const card = await PhysicalCard.findOne({
    _id: id,
    userId: user._id,
  });

  if (!card) {
    throw new HttpError(404, "الكارت غير موجود بحسابك");
  }

  card.status = "unclaimed";
  card.userId = null;
  card.profileId = null;
  card.targetUrl = "";
  card.claimedAt = null;
  await card.save();

  try {
    await CardActivityLog.create({
      cardId: card._id,
      action: "CARD_UNLINKED",
      actorType: "user",
      actorId: String(user._id),
      actorIp: request.ip,
      status: "info",
      message: `Card ${card.cardId} unlinked by user ${user.email}`,
      safeMetadata: {
        userId: String(user._id),
        cardId: card.cardId,
      },
    });
  } catch (err) {
    console.error("Audit log error on unlink:", err.message);
  }

  response.json({
    success: true,
    message: "تم إلغاء ربط الكارت بنجاح",
  });
});

export default {
  resolvePublicCard,
  claimPhysicalCard,
  listMyPhysicalCards,
  reassignCardProfile,
  unlinkMyPhysicalCard,
};

