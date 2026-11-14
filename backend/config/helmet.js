/**
 * config/helmet.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Hardened Helmet.js configuration.
 *
 * Each directive is commented with:
 *   WHY  — the attack it prevents
 *   NOTE — any Campus Connect-specific adjustment
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { SAAS_DOMAIN = 'campusconnect.io', NODE_ENV } = process.env;
const isProd = NODE_ENV === 'production';

const helmetConfig = {
  // ── Content Security Policy ───────────────────────────────────────────────
  // WHY: Prevents XSS by whitelisting script/style/media sources.
  // NOTE: Cloudinary is whitelisted for images. Razorpay checkout script needs
  //       checkout.razorpay.com. Adjust 'unsafe-inline' once you migrate to
  //       nonce-based CSP in the frontend build.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://checkout.razorpay.com',    // Razorpay checkout widget
        ...(isProd ? [] : ["'unsafe-eval'"]), // Vite HMR in development only
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",                  // Required until CSS-in-JS is nonce-ready
        'https://fonts.googleapis.com',
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://res.cloudinary.com',       // Cloudinary media
        `https://*.${SAAS_DOMAIN}`,
      ],
      mediaSrc: [
        "'self'",
        'https://res.cloudinary.com',
      ],
      connectSrc: [
        "'self'",
        `https://api.${SAAS_DOMAIN}`,
        `wss://api.${SAAS_DOMAIN}`,         // Socket.io WebSocket
        'http://localhost:5000',            // dev API
        'ws://localhost:5000',              // dev Socket.io
        'https://lumberjack.razorpay.com',  // Razorpay analytics (needed by SDK)
      ],
      frameSrc: [
        'https://api.razorpay.com',         // Razorpay payment iframe
        'https://checkout.razorpay.com',
      ],
      objectSrc: ["'none'"],                // Disables Flash/plugin objects
      baseUri:   ["'self'"],                // Prevents <base> tag hijacking
      formAction: ["'self'"],               // Prevents form submission to external URLs
      upgradeInsecureRequests: isProd ? [] : null,  // Force HTTPS in prod
    },
    // Report CSP violations (optional — set up a CSP report endpoint)
    // reportOnly: !isProd,
  },

  // ── HTTP Strict Transport Security ───────────────────────────────────────
  // WHY: Forces browsers to use HTTPS for all requests to this domain.
  // NOTE: preload requires registration at hstspreload.org — skip until ready.
  hsts: isProd ? {
    maxAge:            31536000,   // 1 year
    includeSubDomains: true,
    preload:           false,
  } : false,

  // ── X-Frame-Options ───────────────────────────────────────────────────────
  // WHY: Prevents clickjacking via iframes.
  // NOTE: Razorpay checkout loads in an iframe on Razorpay's domain, not ours.
  frameguard: { action: 'sameorigin' },

  // ── X-Content-Type-Options ────────────────────────────────────────────────
  // WHY: Prevents MIME-type sniffing (browser executing a .jpg as JavaScript).
  noSniff: true,

  // ── Referrer Policy ───────────────────────────────────────────────────────
  // WHY: Controls how much URL info is sent in the Referer header.
  //      'strict-origin-when-cross-origin' sends origin only for cross-site.
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // ── Cross-Origin Resource Policy ─────────────────────────────────────────
  // WHY: Controls which origins can read responses (Spectre mitigation).
  // NOTE: 'cross-origin' needed so Cloudinary images load in <img> tags.
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // ── Cross-Origin Opener Policy ────────────────────────────────────────────
  // WHY: Isolates the browsing context to prevent cross-origin window access.
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  // same-origin-allow-popups: allows Razorpay checkout popup

  // ── Cross-Origin Embedder Policy ─────────────────────────────────────────
  // WHY: Required for SharedArrayBuffer (not used here — disable to avoid
  //      breaking Cloudinary image loads from cross-origin).
  crossOriginEmbedderPolicy: false,

  // ── X-DNS-Prefetch-Control ────────────────────────────────────────────────
  // WHY: Prevents browser DNS prefetch leaking browsing patterns.
  dnsPrefetchControl: { allow: false },

  // ── X-Download-Options ───────────────────────────────────────────────────
  // WHY: Prevents IE from executing downloads in site context (legacy, but free).
  ieNoOpen: true,

  // ── X-Permitted-Cross-Domain-Policies ────────────────────────────────────
  // WHY: Controls Adobe Flash/PDF cross-domain policies (legacy, but free).
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // ── X-Powered-By ─────────────────────────────────────────────────────────
  // WHY: Hides Express fingerprint from attackers.
  hidePoweredBy: true,
};

export default helmetConfig;
