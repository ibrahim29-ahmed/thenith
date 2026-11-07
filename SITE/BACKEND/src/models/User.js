import mongoose from "mongoose";
import _idGenerator6896 from "../util/idGenerator.js";
const { generatePublicId } = _idGenerator6896;

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
    savedCard: {
      cardToken: { type: String, default: null },
      cardTokenUniqueId: { type: String, default: null },
      cardBrand: { type: String, default: null },
      customerCard: { type: String, default: null },
      savedAt: { type: Date, default: null },
    },
    referrer: { type: String, default: "Direct" }, // Tracks source (google, facebook, direct, etc.)
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
          provider: { type: String, default: "instapay" },
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
      // 1. Direct dependencies
      await mongoose.model("Subscription").deleteMany({ userId });
      await mongoose.model("PaymentTransaction").deleteMany({ userId });
      await mongoose.model("RefreshToken").deleteMany({ userId });
      await mongoose.model("Order").deleteMany({ userId });
      await mongoose.model("Usage").deleteMany({ userId });
      await mongoose.model("AuditLog").deleteMany({ userId });

      // 2. Card dependencies
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

      // 3. CustomerService dependencies
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

      // 4. Try to fetch user to get email if not populated, to delete OTPs
      if (!userEmail) {
        const userDoc = await mongoose
          .model("User")
          .findOne({ _id: userId })
          .select("email")
          .lean();
        if (userDoc) userEmail = userDoc.email;
      }
      if (userEmail) {
        // OTP uses email natively usually, if we have it
        try {
          await mongoose.model("OtpCode").deleteMany({ email: userEmail });
        } catch (e) {
          // Ignore if OtpCode doesn't have email field or fails
        }
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
userSchema.pre(
  "deleteMany",
  { document: false, query: true },
  async function (next) {
    // deleteMany is trickier, we must find all users first
    try {
      const users = await this.model
        .find(this.getQuery())
        .select("_id email")
        .lean();
      for (const u of users) {
        // We can just construct a fake context to call the cascade function
        const context = { _id: u._id, email: u.email };
        await cascadeDeleteUser.call(context, () => { });
      }
    } catch (err) {
    }
    next();
  },
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
