import mongoose from "mongoose";

const nfcSecuritySchema = new mongoose.Schema(
  {
    // Reference to the PhysicalCard
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PhysicalCard",
      required: true,
      unique: true,
      index: true,
    },

    // Chip Hardware Type
    nfcChipType: {
      type: String,
      default: "NTAG215",
      trim: true,
      index: true,
    },

    // Protection status of the physical chip
    // Strictly: 'locked' is ONLY set after a verified write-lock operation
    nfcProtectionStatus: {
      type: String,
      enum: ["pending_setup", "locked", "unlocked", "error", "unknown"],
      default: "pending_setup",
      index: true,
    },

    // AES-256-GCM Encrypted Credentials Payload (JSON string containing key/pwd + salt + auth tag)
    // NEVER stored as plain text, NEVER exposed directly to frontends
    nfcCredentialEncrypted: {
      type: String,
      required: true,
    },

    // IV for AES-GCM
    nfcCredentialIv: {
      type: String,
      required: true,
    },

    // Auth Tag for AES-GCM
    nfcCredentialTag: {
      type: String,
      required: true,
    },

    // Key Version (for key rotation support)
    nfcCredentialVersion: {
      type: Number,
      default: 1,
    },

    // Key derivation method used
    keyDerivationMethod: {
      type: String,
      enum: ["hkdf-sha256", "random-aes256", "master-derived"],
      default: "random-aes256",
    },

    // Physical chip UID if captured (e.g. 04:A2:3B:4C:5D:6E:7F)
    hardwareUid: {
      type: String,
      default: null,
      trim: true,
    },

    // Timestamps for lifecycle operations
    nfcProvisionedAt: {
      type: Date,
      default: null,
    },

    nfcLastVerifiedAt: {
      type: Date,
      default: null,
    },

    nfcLastOperationStatus: {
      type: String,
      enum: ["none", "pending", "success", "failed"],
      default: "none",
    },

    nfcLastOperationAt: {
      type: Date,
      default: null,
    },

    nfcLastOperationError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "nfc_securities",
  }
);

// Method to return safe public security metadata (strictly hides encrypted secrets)
nfcSecuritySchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    cardId: this.cardId,
    nfcChipType: this.nfcChipType,
    nfcProtectionStatus: this.nfcProtectionStatus,
    nfcCredentialVersion: this.nfcCredentialVersion,
    hardwareUid: this.hardwareUid,
    nfcProvisionedAt: this.nfcProvisionedAt,
    nfcLastVerifiedAt: this.nfcLastVerifiedAt,
    nfcLastOperationStatus: this.nfcLastOperationStatus,
    nfcLastOperationAt: this.nfcLastOperationAt,
    nfcLastOperationError: this.nfcLastOperationError,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const NfcSecurity = mongoose.models.NfcSecurity || mongoose.model("NfcSecurity", nfcSecuritySchema);

export default NfcSecurity;
