import mongoose from "mongoose";
import _idGenerator8176 from "../util/idGenerator.js";
const { generatePublicId } = _idGenerator8176;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    secondaryEmails: { type: [String], default: [] },
    passwordHash: { type: String, select: false },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, default: "", maxlength: 30 },
    address: { type: String, default: "", maxlength: 300 },
    username: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      maxlength: 30,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      match: /^[a-z0-9]{6}$/,
      default: () => generatePublicId(),
    },
    orders: { type: [mongoose.Schema.Types.Mixed], default: [] },
    activeCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      default: null,
    },
    avatar: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    gender: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true, index: true },
    isEmailVerified: { type: Boolean, default: false },
    paymentPlusActive: { type: Boolean, default: false },
    paymentPlusOverride: { type: String, enum: ["enabled", "disabled", null], default: null },
    savedCard: {
      cardToken: { type: String, default: null },
      cardTokenUniqueId: { type: String, default: null },
      cardBrand: { type: String, default: null },
      customerCard: { type: String, default: null },
      savedAt: { type: Date, default: null },
    },
    referrer: { type: String, default: "Direct" },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    referralStats: {
      lifetimeCount: { type: Number, default: 0 },
      currentMonthCount: { type: Number, default: 0 },
      currentMonthKey: { type: String, default: null },
      currentTierPercent: { type: Number, default: 0 },
      milestoneReached: { type: Boolean, default: false },
      milestoneReachedAt: { type: Date, default: null },
    },
    paymentMethods: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          provider: { type: String, default: "vodafone_cash" },
          link: { type: String, default: "" },
          walletNumber: { type: String, default: "" },
          accountName: { type: String, default: "" },
          customSlug: { type: String, default: "" },
          customLink: { type: String, default: "" },
          isActive: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    activePaymentMethodId: {
      type: String,
      default: null,
    },
    paymentPageSettings: {
      avatar: { type: String, default: "" },
      coverImage: { type: String, default: "" },
      displayName: { type: String, default: "" },
      description: { type: String, default: "" },
      isUnifiedHubEnabled: { type: Boolean, default: false },
      analytics: {
        cardVisits: { type: Number, default: 0 },
        directVisits: { type: Number, default: 0 },
        totalVisits: { type: Number, default: 0 },
        lastVisitAt: { type: Date, default: null },
      },
    },
    usedCouponIds: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

userSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { username: { $type: "string" } } },
);

// Cascade delete when a user is deleted
const cascadeDeleteUser = async function (next) {
  let userId;
  let userEmail;
  if (this instanceof mongoose.Document) {
    userId = this._id;
    userEmail = this.email;
  } else {
    // It's a query hook (e.g. User.deleteOne({ _id: ... }))
    const query = this.getQuery();
    if (query._id) userId = query._id;
  }

  if (userId) {
    try {
      // Direct dependencies
      await mongoose.model("Subscription").deleteMany({ userId });
      await mongoose.model("PaymentTransaction").deleteMany({ userId });
      await mongoose.model("RefreshToken").deleteMany({ userId });
      await mongoose.model("Order").deleteMany({ userId });
      await mongoose.model("Usage").deleteMany({ userId });
      await mongoose.model("AuditLog").deleteMany({ userId });

      // Card dependencies
      const cards = await mongoose.model("Card").find({ userId }).select("_id");
      const cardIds = cards.map((c) => c._id);
      if (cardIds.length > 0) {
        await mongoose
          .model("Appointment")
          .deleteMany({ cardId: { $in: cardIds } });
        await mongoose
          .model("ContactRequest")
          .deleteMany({ cardId: { $in: cardIds } });
        await mongoose
          .model("AnalyticEvent")
          .deleteMany({ cardId: { $in: cardIds } });
      }
      await mongoose.model("Card").deleteMany({ userId });

      // CustomerService dependencies
      const convs = await mongoose
        .model("CustomerService")
        .find({ user: userId })
        .select("_id");
      const convIds = convs.map((c) => c._id);
      if (convIds.length > 0) {
        await mongoose
          .model("ChatMessage")
          .deleteMany({ customerService: { $in: convIds } });
      }
      await mongoose.model("CustomerService").deleteMany({ user: userId });

      if (!userEmail) {
        const userDoc = await mongoose
          .model("User")
          .findOne({ _id: userId })
          .select("email")
          .lean();
        if (userDoc) userEmail = userDoc.email;
      }
      if (userEmail) {
        try {
          await mongoose.model("OtpCode").deleteMany({ email: userEmail });
        } catch (e) {}
      }
    } catch (err) {
      console.error(
        "[User Pre-Delete Hook] Failed to delete related data:",
        err,
      );
    }
  }
  next();
};

userSchema.pre("deleteOne", { document: true, query: true }, cascadeDeleteUser);
userSchema.pre(
  "findOneAndDelete",
  { document: false, query: true },
  cascadeDeleteUser,
);

export function getEmailRegex(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedEmail}$`, "i");
}

export function emailLookup(email) {
  const emailRegex = getEmailRegex(email);
  return { $or: [{ email: emailRegex }, { secondaryEmails: emailRegex }] };
}

const User = mongoose.model("User", userSchema);

export default User;
