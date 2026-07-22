import { defineMiddleware } from 'astro:middleware';

/**
 * Security headers.
 *
 * These used to live in `vercel.json`. On Cloudflare Workers the Worker itself
 * serves both the SSR responses and the static assets, so applying them here
 * covers every route.
 */
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' covers the language pre-paint script, the toggle, the audio
  // player and the JSON-LD block. Replace with hashes if those ever move out.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Images come from Sanity's CDN only; episode audio from the R2 bucket.
  "img-src 'self' data: https://cdn.sanity.io",
  'media-src https://*.r2.dev https://*.r2.cloudflarestorage.com https://*.sudanartarchive.com',
  // Sanity is queried server-side, so the browser never connects to it.
  "connect-src 'self'",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
});
