import { MonthlyTier } from './types';

export const MONTHLY_TIERS: readonly MonthlyTier[] = [
  { count: 1, percent: 10 },
  { count: 3, percent: 15 },
  { count: 5, percent: 20 },
  { count: 7, percent: 25 },
] as const;

export const GRAND_TARGET = 14;

/**
 * Derives current tier discount percent from monthly referral count.
 * Returns the highest tier where monthlyCount >= tier.count, or 0 if none.
 */
export function getCurrentTier(monthlyCount: number): number {
  if (!monthlyCount || monthlyCount < 0) return 0;
  let earnedPercent = 0;
  for (const tier of MONTHLY_TIERS) {
    if (monthlyCount >= tier.count) {
      earnedPercent = tier.percent;
    }
  }
  return earnedPercent;
}

/**
 * Calculates SVG stroke-dashoffset for ProgressRing given radius, current and target.
 */
export function calculateProgressOffset(current: number, target: number, radius = 50): {
  circumference: number;
  offset: number;
  percentage: number;
} {
  const circumference = 2 * Math.PI * radius;
  const safeTarget = target > 0 ? target : GRAND_TARGET;
  const clampedCurrent = Math.max(0, Math.min(current, safeTarget));
  const percentage = Math.round((clampedCurrent / safeTarget) * 100);
  const offset = circumference - (clampedCurrent / safeTarget) * circumference;
  return { circumference, offset, percentage };
}

