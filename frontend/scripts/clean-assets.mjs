/**
 * Post-build: keep macOS junk out of the deployed asset bundle.
 *
 * Anything sitting in public/ is copied verbatim into dist/client/ and uploaded
 * as a *publicly reachable* asset. Finder drops a .DS_Store into any folder you
 * open, so public/.DS_Store reappears on its own and had been deployed —
 * serving a 200 that leaks the directory's file listing.
 *
 * Deleting the file locally is not enough because it keeps coming back, so this
 * also appends the pattern to the .assetsignore that @astrojs/cloudflare
 * generates, which is what Wrangler consults when building the upload manifest.
 */
import { readdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CLIENT_DIR = 'dist/client';
const JUNK = ['.DS_Store', 'Thumbs.db', 'desktop.ini'];

let removed = 0;

/** Recursively delete known junk files from the built asset directory. */
function sweep(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sweep(path);
    else if (JUNK.includes(entry.name)) {
      rmSync(path);
      removed++;
    }
  }
}

if (!existsSync(CLIENT_DIR)) {
  console.error(`[clean-assets] ${CLIENT_DIR} not found — did the build run?`);
  process.exit(1);
}

sweep(CLIENT_DIR);

// Belt and braces: tell Wrangler to skip them even if one slips back in.
const ignorePath = join(CLIENT_DIR, '.assetsignore');
const existing = existsSync(ignorePath) ? readFileSync(ignorePath, 'utf-8').split('\n') : [];
const missing = JUNK.filter((pattern) => !existing.includes(pattern));

if (missing.length) {
  writeFileSync(ignorePath, [...existing.filter(Boolean), ...missing].join('\n') + '\n');
}

console.log(
  `[clean-assets] removed ${removed} junk file(s); .assetsignore covers ${JUNK.join(', ')}`,
);
