import mongoose from "mongoose";

const userNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      default: "action",
    },
    category: {
      type: String,
      enum: ["general", "subscription", "order", "support", "announcement", "warning"],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["normal", "high", "urgent"],
      default: "normal",
    },
    actionLabel: { type: String, default: "" },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, default: "", maxlength: 500 },
    read: { type: Boolean, default: false, index: true },
    link: { type: String, default: "" }, // optional tab/route to navigate to
  },
  { timestamps: true }
);

// Auto-delete notifications older than 30 days
userNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

// Keep max 50 per user (enforced in controller)
const UserNotification = mongoose.model("UserNotification", userNotificationSchema);

export default UserNotification;
