export type ReferralStatus = 'pending' | 'active' | 'cancelled';

export type Referral = {
  id: string;
  name: string;
  status: ReferralStatus;
  joinedAt: string;
};

export type Reward = {
  id: string;
  label: string;
  percent: number;
  expiresAt?: string;
};

export type MonthlyTier = {
  count: number;
  percent: number;
};

export type ReferralData = {
  code: string;                 // THENITH-XXXXX
  link: string;
  isSubscribed?: boolean;       // whether user currently has active paid pro subscription
  monthlyCount: number;         // إحالات هذا الشهر
  totalCount: number;           // إجمالي الإحالات الناجحة
  grandTarget: number;          // 14
  daysLeftInCycle: number;
  rewards: Reward[];
  referrals: Referral[];
};

