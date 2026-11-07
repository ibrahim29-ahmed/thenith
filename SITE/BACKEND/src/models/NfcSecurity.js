import mongoose from "mongoose";

const nfcSecuritySchema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PhysicalCard",
      required: true,
      unique: true,
      index: true,
    },
    nfcChipType: {
      type: String,
      default: "NTAG215",
      trim: true,
      index: true,
    },
    nfcProtectionStatus: {
      type: String,
      enum: ["pending_setup", "locked", "unlocked", "error", "unknown"],
      default: "pending_setup",
      index: true,
    },
    nfcCredentialEncrypted: {
      type: String,
      required: true,
    },
    nfcCredentialIv: {
      type: String,
      required: true,
    },
    nfcCredentialTag: {
      type: String,
      required: true,
    },
    nfcCredentialVersion: {
      type: Number,
      default: 1,
    },
    keyDerivationMethod: {
      type: String,
      enum: ["hkdf-sha256", "random-aes256", "master-derived"],
      default: "random-aes256",
    },
    hardwareUid: {
      type: String,
      default: null,
      trim: true,
    },
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
