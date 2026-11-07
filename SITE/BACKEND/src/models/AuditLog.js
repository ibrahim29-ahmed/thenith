import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    category: {
      type: String,
      enum: [
        "panel_profile",
        "admin_dashboard",
        "payments_subscriptions",
        "store",
        "security",
        "system",
        // Backward-compatibility aliases:
        "request",
        "auth",
        "payment",
      ],
      default: "system",
    },
    ip: { type: String, default: "127.0.0.1" }, // Device IP
    networkIp: { type: String, default: "127.0.0.1" }, // Network / Router Public IP
    country: { type: String, default: "Unknown" },
    governorate: { type: String, default: "Unknown" },
    location: { type: String, default: "Unknown" },
    userAgent: { type: String, default: "" },
    referrer: { type: String, default: "" },
    origin: { type: String, default: "" },
    fullUrl: { type: String, default: "" },
    queryString: { type: String, default: "" },
    isExternal: { type: Boolean, default: false },
    method: { type: String, default: "GET" },
    path: { type: String, default: "" },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    message: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
    anomalyScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// TTL index — auto delete after 30 days
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);
auditLogSchema.index({ level: 1 });
auditLogSchema.index({ category: 1 });
auditLogSchema.index({ ip: 1 });
auditLogSchema.index({ networkIp: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ isExternal: 1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
