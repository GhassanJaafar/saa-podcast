# SAA Podcast — Agent Instructions

Context and working conventions for Claude Code or any other LLM agent working in this
repository. Read this before making changes. Sister project: **SAA Forms**
(`forms.sudanartarchive.com`) — it is the more polished of the two and is the reference for
style, tone and structure.

---

## What this project is

The **Sudan Art Archive podcast** at **podcast.sudanartarchive.com** — a public, bilingual
(English / Arabic) site listing podcast episodes, with an audio player and an RSS feed that
Apple Podcasts and other directories subscribe to.

- Live site: https://podcast.sudanartarchive.com
- Main archive site (separate project): https://sudanartarchive.com
- Submissions portal (sister project): https://forms.sudanartarchive.com

---

## Repository layout

A monorepo, laid out to match SAA Forms so the two projects navigate identically:

```
saa-podcast/
├── AGENTS.md          ← you are here
├── frontend/          Astro site → Cloudflare Workers
└── studio/            Sanity Studio (schema + admin UI)
```

The two packages have **separate** `package.json` files and `node_modules`; there is no
workspace root and no shared dependency tree. Run npm commands from inside the package you
mean, or use `npm --prefix frontend run <script>`.

They are deployed independently: `frontend/` with `npm run deploy` (Wrangler), `studio/` with
`npm run deploy` (Sanity CLI). Neither deploy triggers the other.

---

## Architecture

```
Sanity (content + images)            Cloudflare R2 (audio only)
        │                                      │
        └──────────────┬───────────────────────┘
                       ▼
        Astro SSR — Cloudflare Workers
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   /  (episodes)  /episodes/[slug]  /podcast/feed.xml
```

**Sanity is the database.** Every piece of copy — site title, header, footer, social links,
SEO keywords, RSS channel metadata, cover art — lives in the `podcastSettings` singleton.
Nothing user-facing should be hard-coded in the Astro app.

**The MP3 is the one asset outside Sanity.** Episodes carry an `audioUrl` pointing at a public
Cloudflare R2 object. Cover art is a Sanity image, served through the Sanity CDN.

Every route is server-rendered (`output: 'server'`, `useCdn: false`), so publishing in Studio
is live on the next request — no rebuild, no redeploy.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Astro 6 (`output: 'server'`, SSR) |
| Adapter / host | `@astrojs/cloudflare` → **Cloudflare Workers** |
| Styling | Plain CSS — tokens in `src/styles/global.css`, component styles scoped in each `.astro` file |
| CMS / database | **Sanity** (project `joj4u8dz`, dataset `production`) |
| Audio hosting | **Cloudflare R2** (public bucket, URL pasted into the episode) |
| Source | GitHub `GhassanJaafar/saa-podcast` |

> ⚠️ This project was **migrated off Vercel**. Do not reintroduce `@astrojs/vercel`,
> `vercel.json`, or `.vercel/`. If you see references to them, they are leftovers to remove,
> not patterns to follow.

---

## Sanity schema

Studio lives in `studio/`. Deploy it with `npm run deploy` from that folder.

| Type | Purpose |
|---|---|
| `podcastSettings` | Singleton. All site-wide copy, SEO and RSS channel config. Grouped into Identity / Header / Footer / SEO / Feed tabs. |
| `season` | One per season. Optional title + cover art. Joined to episodes by `number`. |
| `episode` | One per episode. Bilingual title/description, R2 `audioUrl`, duration, byte size, cover art. |

Episodes store `season` as a **number**, matched against `season.number` — not a reference.
This was deliberate: existing episode documents already used a numeric field, and a reference
would have required a data migration.

Artwork falls back in a cascade everywhere: **episode → season → podcast default**.

---

## Sanity request budget — read before touching `src/lib/sanity.ts`

The plan allows **250,000 API requests a month**, and the site is server-rendered, so
every visitor could cost requests. Two things keep that in check:

1. **One query per render.** `SITE_QUERY` fetches settings, episodes and seasons together in
   a single GROQ request. Do not add a second `sanityClient.fetch` to a page — extend
   `SITE_QUERY` instead. The episode page deliberately finds its episode inside the already
   fetched list rather than querying by slug; a podcast has tens of episodes, so reusing the
   list trades a little bandwidth for a whole API request.
2. **An in-isolate cache** (`CACHE_TTL_MS`, 60s) in `getSiteData()`. Cloudflare keeps isolates
   warm, so a burst of traffic collapses into one upstream query. Concurrent cold misses are
   de-duped through `inFlight` so a cold start fires one query, not one per request.

Measured in the Workers runtime: first request ~1.0s, subsequent ~0.003s. Four consecutive
page views cost **one** Sanity request rather than sixteen.

The layout also needs `settings`, and calls `getSiteData()` itself — that is free, because it
shares the cached payload with the page. It used to be a second `getSettings()` call, which
alone doubled the bill.

**The trade is staleness.** A change published in Studio appears within `CACHE_TTL_MS` plus a
few seconds of Sanity CDN propagation (`useCdn: true`) — roughly a minute. Lower the TTL if
you want faster edits, and expect the request count to rise proportionally. If the site is
ever spiking against the quota, cache HTML at the edge with `Cache-Control: s-maxage` before
reaching for a shorter TTL.

`getSiteData()` must never throw. If Sanity is unreachable it serves the last good payload,
or bilingual defaults, rather than 500ing the site.

---

## Bilingual system

Copied wholesale from SAA Forms. A `.lang-ar` class on `<html>` drives everything — no i18n
routing, no round-trip, no reload.

- Both languages are always rendered into the markup; CSS shows one and hides the other.
- `src/components/T.astro` renders an EN/AR pair and **falls back to English** when the Arabic
  field is empty, so a half-translated Sanity document never renders a blank line.
- `src/i18n/ui.ts` holds interface chrome only ("Episodes", "All episodes", …). Editorial
  content is bilingual **in Sanity**, via the `*Ar` fields.
- An inline pre-paint script in `<head>` reads `localStorage.saa_lang` before first paint to
  avoid a flash of English.
- Meta tags (`<title>`, `og:`, `twitter:`) are single-language by nature — always English.

---

## Styling

Source of truth is **SAA Forms `STYLE_GUIDE.md`**. The short version:

- One accent colour (coral `#E85B52`). Never add a second brand colour.
- Serif everywhere (IBM Plex Serif); IBM Plex Sans Arabic when Arabic is active.
- **Square** corners on everything; buttons are the sole exception (25px pill).
- The 3-level contrast stack does the separating, not shadows:
  white page → cream card (`#FFF9ED`) → white inner elements.
- Hover and focus both go red. One transition speed: `0.18s ease`.

Containers are `56rem`, matching Forms.

**There is no CSS framework.** Tailwind was installed but never used — not one utility class in
the markup — so it was removed; it was shipping its preflight and property polyfills for
nothing. `global.css` holds tokens, the reset and truly global rules; everything else is a
scoped `<style>` block next to its markup. Note the `button, input, select, textarea { font:
inherit }` rule in the reset: form controls do not inherit typography on their own, and that
was previously coming from Tailwind's preflight.

Do not add utility classes or reintroduce a framework without a concrete reason — and if you
port a component from Forms, bring only the CSS it needs.

---

## Deploying

```bash
npm run build     # astro build
npm run deploy    # astro build && wrangler deploy
npm run preview   # astro build && wrangler dev  (local Workers runtime)
```

### ⚠️ Two wrangler configs — deploy with the generated one

This is the single easiest thing to get wrong in this repo.

- `wrangler.jsonc` (repo root) is the **input**. It is deliberately minimal — it carries the
  worker name, compat date and flags, nothing else. **Do not set `main` or `assets` here**;
  `main` would point at a file that does not exist until after the build, and the build fails
  trying to resolve it.
- `dist/server/wrangler.json` is the **output**, written by `@astrojs/cloudflare` during the
  build. It is the one with `main: entry.mjs` and `assets.directory: ../client`.

Every `wrangler` invocation must therefore pass `--config dist/server/wrangler.json`. The npm
scripts already do. Running a bare `wrangler deploy` picks up the root config, which declares
no assets directory — the Worker deploys but **every static file 404s** (favicon, logo,
`/_astro/*` CSS and JS), and routing misbehaves. The site looks broken in a way that does not
reproduce in `astro dev`, because `astro dev` serves `public/` itself and never touches
wrangler.

If a change looks fine in `npm run dev` but broken once deployed, reproduce it with
`npm run preview` — that runs the built output in the real `workerd` runtime.

Sessions are pinned to an in-memory driver in `astro.config.mjs`. That is not a stray setting:
without it the adapter auto-injects a `SESSION` KV binding that would need a real KV namespace
provisioned before `wrangler deploy` succeeds. The site is read-only and uses no sessions.

### Environment variables — there are none

The frontend reads **no environment variables at all**. There is no `.env` file, and nothing
needs to be configured in the Cloudflare dashboard for the site to build or run. Do not
reintroduce env vars for configuration that isn't secret.

The values that used to live there:

| Was | Now |
|---|---|
| `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET` | Constants at the top of `src/lib/sanity.ts` |
| `PUBLIC_SITE_URL` | `site` in `astro.config.mjs`, read via `Astro.site` |
| `PUBLIC_COVER_IMAGE_URL` | The `coverImage` field on `podcastSettings` in Sanity |

None of them were secrets. The Sanity project ID and dataset are published in every image URL
the site emits (`cdn.sanity.io/images/joj4u8dz/production/…`), the site URL is the public
domain, and the Sanity client is anonymous and read-only — **this project holds no
credentials.** If that ever changes (a Sanity write token, an API key), that value is a real
secret: it belongs in Wrangler secrets and must be read at runtime via
`Astro.locals.runtime.env`, never behind a `PUBLIC_` prefix, which Vite inlines into the
client bundle.

Removing them also removes a failure mode. Because `PUBLIC_*` vars are inlined at **build**
time, setting them as Cloudflare *runtime* secrets does nothing — a git-connected build would
bake in `undefined` and deploy a site with no Sanity connection and no episodes.

### Security headers

They used to live in `vercel.json`; they are now in `src/middleware.ts`, which covers both SSR
responses and static assets. If you add a new external origin (a font host, an image CDN), the
CSP there must be updated or the browser will block it.

---

## The RSS feed

`/podcast/feed.xml` is what Apple Podcasts actually reads. It is the highest-stakes route in
the project — a malformed feed silently de-lists the show. Things that are easy to get wrong:

- **Enclosure MIME type must match the file extension.** Declaring a `.wav` as `audio/mpeg`
  gets the feed rejected. `audioMimeType()` derives it from the URL.
- **`<itunes:owner><itunes:email>` must be non-empty** — Apple uses it to verify ownership.
- **Cover art must be square, ≥1400px, and must not 404.** The channel `<image>` block is
  omitted entirely rather than emitted with a broken URL.
- **`length` (byte size) should be accurate** — podcast apps use it for the download progress
  bar. It is the `fileSize` field on the episode.

After changing this route, validate at https://podba.se/validate.

---

## Known issues / things to pick up

- **The `podcastSettings` document does not exist in Sanity yet.** `getSettings()` merges
  against a full set of English + Arabic defaults, so the site renders correctly without it —
  but the cover art, which has no default, falls back to the newest episode's image. Create
  the document in Studio and fill in the cover art.
- Episode `duration` is entered by hand and is not validated against the actual audio file.
  The test episode currently claims `00:03:30` for a file that is 7:02 long.
- `public/favicon.svg` and `public/logo.svg` are byte-identical (same 140×111 brand mark).
  `favicon.ico` and `apple-touch-icon.png` are generated from that SVG; if the mark changes,
  regenerate them rather than renaming files. **`favicon.ico` used to be an SVG renamed to
  `.ico`**, which browsers silently refuse to render — it is a real ICO container now
  (16/32/48px PNG entries). SAA Forms may still have the same misnamed file.
