import mongoose from "mongoose";

const nfcChipTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    memorySize: {
      type: String,
      default: "504 بايت",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, collection: "nfc_chip_types" }
);

const NfcChipType =
  mongoose.models.NfcChipType ||
  mongoose.model("NfcChipType", nfcChipTypeSchema);

export default NfcChipType;
