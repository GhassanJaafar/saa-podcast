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
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https://cdn.sanity.io *.r2.dev *.r2.cloudflarestorage.com https:",
  "media-src 'self' *.r2.dev *.r2.cloudflarestorage.com https:",
  "connect-src 'self' https://*.api.sanity.io https://*.apicdn.sanity.io",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-ancestors 'none'",
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
