import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import envConfig from '../config/env.js';
import User from '../models/User.js';

const { env } = envConfig;

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Update any 'مباشر' or 'مباشرة' or null to 'Direct'
  const resDirect = await User.updateMany(
    { referrer: { $in: ['مباشر', 'مباشرة', null, ''] } },
    { $set: { referrer: 'Direct' } }
  );
  console.log('Updated to Direct:', resDirect.modifiedCount);

  // 2. Update any 'إحالة (...)' to 'Referral (...)'
  const usersWithArabicRef = await User.find({ referrer: /^إحالة/ });
  let countRef = 0;
  for (const u of usersWithArabicRef) {
    u.referrer = u.referrer.replace('إحالة', 'Referral');
    await u.save();
    countRef++;
  }
  console.log('Updated Arabic referral prefixes:', countRef);

  // 3. Display current distribution
  const stats = await User.aggregate([
    { $group: { _id: '$referrer', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log('Current Referrer Distribution in DB:', stats);

  await mongoose.disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
