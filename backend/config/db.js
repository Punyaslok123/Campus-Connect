/**
 * config/db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * MongoDB connection via Mongoose.
 * Single connection with event listeners for monitoring.
 * Called once from server.js before app.listen().
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';

const { MONGODB_URI, NODE_ENV } = process.env;

export const connectDB = async () => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      maxPoolSize:     10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Drop the old non-partial unique index on departments so Mongoose can
    // recreate it as a partial index (isDeleted: { $ne: true }).
    try {
      await conn.connection.collection('departments').dropIndex('collegeId_1_name_1');
    } catch (_) {
      // Index doesn't exist or was already replaced — safe to ignore
    }

    // Connection lifecycle events
    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
    });

  } catch (error) {
    console.error('[MongoDB] Initial connection failed:', error.message);
    process.exit(1);   // Fatal — can't run without DB
  }
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
};
