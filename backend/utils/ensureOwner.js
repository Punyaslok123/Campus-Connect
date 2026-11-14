/**
 * utils/ensureOwner.js
 * Called once from server.js after connectDB().
 *
 * On every boot it:
 *   1. Ensures a valid owner account exists (creates/repairs if needed)
 *   2. Seeds the default subscription plans if the plans collection is empty
 */

import bcrypt from 'bcryptjs';
import User   from '../models/User.model.js';
import Plan   from '../models/Plan.model.js';

const OWNER_EMAIL    = process.env.OWNER_EMAIL    || 'owner@campusconnect.dev';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Admin@123456';
const BCRYPT_ROUNDS  = 12;

const DEFAULT_PLANS = [
  { key: '1m', label: '1 Month',  durationMonths: 1,  priceINR: 499,   highlight: false, sortOrder: 0 },
  { key: '6m', label: '6 Months', durationMonths: 6,  priceINR: 2499,  highlight: false, sortOrder: 1 },
  { key: '1y', label: '1 Year',   durationMonths: 12, priceINR: 3999,  highlight: true,  sortOrder: 2 },
  { key: '5y', label: '5 Years',  durationMonths: 60, priceINR: 14999, highlight: false, sortOrder: 3 },
];

// ── Ensure Owner ──────────────────────────────────────────────────────────────

export async function ensureOwner() {
  const owner = await User.findOne({ role: 'owner' }).select('+passwordHash');

  if (owner) {
    const valid = await bcrypt.compare(OWNER_PASSWORD, owner.passwordHash);
    if (!valid) {
      console.warn('[Owner] Owner found but hash invalid — recreating...');
      await User.deleteMany({ role: 'owner' });
      await _createOwner();
    }
  } else {
    await _createOwner();
  }

  await ensurePlans();
}

async function _createOwner() {
  const hash = await bcrypt.hash(OWNER_PASSWORD, BCRYPT_ROUNDS);

  await User.collection.insertOne({
    firstName:    'Platform',
    lastName:     'Owner',
    email:        OWNER_EMAIL,
    passwordHash: hash,
    role:         'owner',
    collegeId:    null,
    departmentId: null,
    isVerified:   true,
    isActive:     true,
    refreshToken: null,
    lastLoginAt:  null,
    profileImage: null,
    phone:        null,
    bio:          null,
    createdAt:    new Date(),
    updatedAt:    new Date(),
  });

  const check = await User.findOne({ role: 'owner' }).select('+passwordHash');
  const ok    = check && (await bcrypt.compare(OWNER_PASSWORD, check.passwordHash));
  if (!ok) {
    throw new Error('[Owner] FATAL: owner created but hash verification failed.');
  }
}

// ── Seed Plans ────────────────────────────────────────────────────────────────

async function ensurePlans() {
  const count = await Plan.countDocuments();
  if (count > 0) {
    return;
  }

  const docs = DEFAULT_PLANS.map(p => ({
    ...p,
    pricePaise: p.priceINR * 100,
    isActive:   true,
  }));

  await Plan.insertMany(docs);
}
