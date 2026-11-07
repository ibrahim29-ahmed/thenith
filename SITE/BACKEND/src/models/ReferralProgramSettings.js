import mongoose from "mongoose";

const referralProgramSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    inviteeDiscountEnabled: {
      type: Boolean,
      default: true,
    },
    inviteeDiscountPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    monthlyTiers: {
      type: [
        {
          count: { type: Number, required: true },
          discountPercent: { type: Number, required: true },
        },
      ],
      default: [
        { count: 1, discountPercent: 10 },
        { count: 3, discountPercent: 15 },
        { count: 5, discountPercent: 20 },
        { count: 7, discountPercent: 25 },
      ],
    },
    maxMonthlyDiscountPercent: {
      type: Number,
      default: 25,
      min: 0,
      max: 100,
    },
    milestoneReferralCount: {
      type: Number,
      default: 14,
      min: 1,
    },
    milestoneDiscountPercent: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    milestoneFreeNfcCards: {
      type: Number,
      default: 1,
      min: 1,
    },
    eligiblePlans: {
      type: [String],
      default: ["all"], // ["all"] or list of plan keys like ["pro", "business"]
    },
    eligibleBillingPeriods: {
      type: [String],
      default: ["monthly", "yearly"],
    },
    allowStacking: {
      type: Boolean,
      default: false,
    },
    rewardValidityDays: {
      type: Number,
      default: 60,
      min: 1,
    },
    maxEligibleReferralsPerUserPerMonth: {
      type: Number,
      default: 100,
    },
    campaignStartDate: {
      type: Date,
      default: null,
    },
    campaignEndDate: {
      type: Date,
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Ensure singleton pattern: findOne or create default
referralProgramSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const ReferralProgramSettings = mongoose.model(
  "ReferralProgramSettings",
  referralProgramSettingsSchema
);

export default ReferralProgramSettings;

