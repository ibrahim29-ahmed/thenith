import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCurrentTier, calculateProgressOffset, MONTHLY_TIERS } from '../constants';

describe('Referral Calculations & ProgressRing', () => {
  it('correctly calculates current tier discounts according to business rules', () => {
    // 0 referrals -> 0%
    assert.strictEqual(getCurrentTier(0), 0);
    assert.strictEqual(getCurrentTier(-1), 0);

    // 1 referral -> 10%
    assert.strictEqual(getCurrentTier(1), 10);
    assert.strictEqual(getCurrentTier(2), 10);

    // 3 referrals -> 15%
    assert.strictEqual(getCurrentTier(3), 15);
    assert.strictEqual(getCurrentTier(4), 15);

    // 5 referrals -> 20%
    assert.strictEqual(getCurrentTier(5), 20);
    assert.strictEqual(getCurrentTier(6), 20);

    // 7 or more referrals -> 25% (Maximum)
    assert.strictEqual(getCurrentTier(7), 25);
    assert.strictEqual(getCurrentTier(10), 25);
    assert.strictEqual(getCurrentTier(14), 25);
  });

  it('correctly calculates ProgressRing stroke circumference, offset and percentage', () => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;

    // 0 / 14 referrals (0%)
    const ring0 = calculateProgressOffset(0, 14, radius);
    assert.strictEqual(ring0.percentage, 0);
    assert.ok(Math.abs(ring0.offset - circumference) < 0.001);

    // 7 / 14 referrals (50%)
    const ringHalf = calculateProgressOffset(7, 14, radius);
    assert.strictEqual(ringHalf.percentage, 50);
    assert.ok(Math.abs(ringHalf.offset - (circumference / 2)) < 0.001);

    // 14 / 14 referrals (100% - Milestone Reached)
    const ringFull = calculateProgressOffset(14, 14, radius);
    assert.strictEqual(ringFull.percentage, 100);
    assert.ok(Math.abs(ringFull.offset - 0) < 0.001);

    // Over target (e.g. 20 / 14 referrals - clamped to 100%)
    const ringOver = calculateProgressOffset(20, 14, radius);
    assert.strictEqual(ringOver.percentage, 100);
    assert.strictEqual(ringOver.offset, 0);
  });

  it('verifies monthly tiers structure matches platform configuration', () => {
    assert.strictEqual(MONTHLY_TIERS.length, 4);
    assert.deepStrictEqual(MONTHLY_TIERS[0], { count: 1, percent: 10 });
    assert.deepStrictEqual(MONTHLY_TIERS[1], { count: 3, percent: 15 });
    assert.deepStrictEqual(MONTHLY_TIERS[2], { count: 5, percent: 20 });
    assert.deepStrictEqual(MONTHLY_TIERS[3], { count: 7, percent: 25 });
  });
});

