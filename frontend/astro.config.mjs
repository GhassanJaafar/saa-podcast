// @ts-check
import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://podcast.sudanartarchive.com',

  // Every route is server-rendered so Sanity edits appear without a rebuild.
  output: 'server',

  adapter: cloudflare({
    // Cloudflare Workers have no sharp; Sanity's CDN does the resizing for us.
    imageService: 'passthrough',
  }),

  // The site is read-only — no sessions. Declaring a driver here stops the
  // adapter injecting a `SESSION` KV binding that would need a real namespace.
  session: { driver: sessionDrivers.lruCache() },

  integrations: [sitemap()],

  vite: {
    ssr: { external: ['sharp'] },
  },
});
