/**
 * config/cors.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamic CORS configuration.
 *
 * Strategy:
 *   STATIC allowlist  — always-allowed origins (dev localhost, main SaaS domain)
 *   DYNAMIC allowlist — college custom domains loaded from DB on first request,
 *                       then cached in memory and refreshed every 10 minutes.
 *
 * This allows colleges to use custom domains (e.g. portal.mit.edu) without
 * a server restart.
 *
 * Security note:
 *   Origins with no `origin` header (server-to-server, curl, Postman) are
 *   allowed in development only. In production they are blocked.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const {
  FRONTEND_URL = 'http://localhost:5173',
  NODE_ENV,
  SAAS_DOMAIN  = 'campusconnect.io',
  PORT         = 5000,
} = process.env;

const isDev = NODE_ENV === 'development';

// ── Static origins always allowed ─────────────────────────────────────────────
const STATIC_ORIGINS = new Set([
  FRONTEND_URL,
  `https://${SAAS_DOMAIN}`,
  `https://www.${SAAS_DOMAIN}`,
  `https://app.${SAAS_DOMAIN}`,
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',    // Vite dev
  'http://localhost:5174',    // Vite dev (fallback port when 5173 is taken)
  'http://localhost:4173',    // Vite preview
  'http://localhost:3000',    // Alt dev port
]);

// ── Dynamic domain cache ──────────────────────────────────────────────────────
let _dynamicOriginCache  = new Set();
let _lastCacheRefresh    = 0;
const CACHE_TTL_MS       = 10 * 60 * 1000;   // 10 minutes

/**
 * Refresh the college domain cache from MongoDB.
 * Runs at most once every CACHE_TTL_MS milliseconds.
 */
const refreshDynamicOrigins = async () => {
  const now = Date.now();
  if (now - _lastCacheRefresh < CACHE_TTL_MS) return;

  try {
    // Lazy import to avoid circular dep at module load time
    const { College } = await import('../models/index.js');

    const colleges = await College
      .find({ status: 'active' }, { domain: 1, _id: 0 })
      .lean();

    _dynamicOriginCache = new Set(
      colleges.flatMap(c => [
        // Support both subdomain pattern and custom domain
        `https://${c.domain}.${SAAS_DOMAIN}`,
        `https://${c.domain}`,               // custom domain
      ])
    );

    _lastCacheRefresh = now;
  } catch (err) {
    // Don't crash if DB is temporarily unavailable — use stale cache
    console.error('[CORS] Failed to refresh domain cache:', err.message);
  }
};

/**
 * Determine whether an origin is allowed.
 * Called for every request with an Origin header.
 *
 * @param {string|undefined} origin
 * @param {function}         callback  - CORS library callback(err, allowed)
 */
const originValidator = async (origin, callback) => {
  // No origin header: server-to-server or same-origin request
  if (!origin) {
    // Allow in development; block in production (no headless clients expected)
    return isDev
      ? callback(null, true)
      : callback(null, false);
  }

  // Check static allowlist first (O(1), no async needed)
  if (STATIC_ORIGINS.has(origin)) {
    return callback(null, true);
  }

  // Allow any localhost / 127.0.0.1 origin
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }

  // Allow any *.vercel.app deployment domain
  if (/^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(origin)) {
    return callback(null, true);
  }

  // Check dynamic college domain cache
  await refreshDynamicOrigins();

  if (_dynamicOriginCache.has(origin)) {
    return callback(null, true);
  }

  // Rejected origin — log in dev, silent 403 in prod
  if (isDev) {
    console.warn(`[CORS] Rejected origin: ${origin}`);
  }

  callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
};

// ── Exported cors options object ──────────────────────────────────────────────

/**
 * Pass this directly to cors() middleware in app.js:
 *   import corsOptions from './config/cors.js';
 *   app.use(cors(corsOptions));
 */
const corsOptions = {
  origin:         originValidator,
  credentials:    true,             // required for httpOnly refresh token cookie
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge:         86400,            // preflight cache: 24 hours
  optionsSuccessStatus: 200,        // 204 breaks some legacy browsers
};

export default corsOptions;

/**
 * Manually bust the CORS origin cache.
 * Call this after a college domain is updated in the DB.
 */
export const bustCorsCache = () => {
  _lastCacheRefresh = 0;
};
