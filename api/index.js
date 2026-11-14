/**
 * api/index.js
 * Vercel Serverless Function entry point for Campus Connect Express backend.
 */

import createApp from '../backend/app.js';
import { connectDB } from '../backend/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  if (!appInstance) {
    await connectDB();
    appInstance = createApp();
  }
  return appInstance(req, res);
}
