const assert = require('assert');

// 1. Test getCurrentTier
const MONTHLY_TIERS = [
  { count: 1, percent: 10 },
  { count: 3, percent: 15 },
  { count: 5, percent: 20 },
  { count: 7, percent: 25 },
];

function getCurrentTier(monthlyCount) {
  if (!monthlyCount || monthlyCount < 0) return 0;
  let earnedPercent = 0;
  for (const tier of MONTHLY_TIERS) {
    if (monthlyCount >= tier.count) {
      earnedPercent = tier.percent;
    }
  }
  return earnedPercent;
}

function calculateProgressOffset(current, target, radius = 50) {
  const circumference = 2 * Math.PI * radius;
  const safeTarget = target > 0 ? target : 14;
  const clampedCurrent = Math.max(0, Math.min(current, safeTarget));
  const percentage = Math.round((clampedCurrent / safeTarget) * 100);
  const offset = circumference - (clampedCurrent / safeTarget) * circumference;
  return { circumference, offset, percentage };
}

console.log('Testing getCurrentTier...');
assert.strictEqual(getCurrentTier(0), 0);
assert.strictEqual(getCurrentTier(1), 10);
assert.strictEqual(getCurrentTier(2), 10);
assert.strictEqual(getCurrentTier(3), 15);
assert.strictEqual(getCurrentTier(4), 15);
assert.strictEqual(getCurrentTier(5), 20);
assert.strictEqual(getCurrentTier(6), 20);
assert.strictEqual(getCurrentTier(7), 25);
assert.strictEqual(getCurrentTier(12), 25);
console.log('✓ getCurrentTier passed all test cases');

console.log('Testing calculateProgressOffset (ProgressRing)...');
const c = 2 * Math.PI * 50;
const ring0 = calculateProgressOffset(0, 14, 50);
assert.strictEqual(ring0.percentage, 0);
assert.ok(Math.abs(ring0.offset - c) < 0.001);

const ring7 = calculateProgressOffset(7, 14, 50);
assert.strictEqual(ring7.percentage, 50);
assert.ok(Math.abs(ring7.offset - c / 2) < 0.001);

const ring14 = calculateProgressOffset(14, 14, 50);
assert.strictEqual(ring14.percentage, 100);
assert.ok(Math.abs(ring14.offset - 0) < 0.001);

const ring20 = calculateProgressOffset(20, 14, 50);
assert.strictEqual(ring20.percentage, 100);
assert.strictEqual(ring20.offset, 0);
console.log('✓ calculateProgressOffset passed all test cases');

console.log('Testing CopyField simulation...');
let copiedState = false;
function simulateCopy(value) {
  if (!value) return false;
  copiedState = true;
  return true;
}
assert.strictEqual(simulateCopy('THENITH-A7K92'), true);
assert.strictEqual(copiedState, true);
console.log('✓ CopyField copy simulation passed');

console.log('\nAll referral unit tests passed successfully!');

