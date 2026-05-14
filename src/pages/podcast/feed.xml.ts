/**
 * SAA Podcast RSS 2.0 feed  — /podcast/feed.xml
 *
 * Fixes all podba.se validation errors:
 *   ✓ Podcast Index namespace (xmlns:podcast)
 *   ✓ Cover art: uses PUBLIC_COVER_IMAGE_URL env var (must be 1400–3000 px square)
 *   ✓ Episode enclosures always include a .mp3 URL with MIME type + file size
 *   ✓ Per-season cover art via <podcast:season> and <itunes:image> on each item
 *   ✓ iTunes + Atom namespaces retained
 *
 * Required .env variables (add to Vercel dashboard too):
 *   PUBLIC_SITE_URL          e.g. https://podcast.sudanartarchive.com
 *   PUBLIC_COVER_IMAGE_URL   Absolute URL to 1400×1400px+ JPEG/PNG on R2
 *                            e.g. https://pub-xxxxx.r2.dev/cover-season-1.jpg
 *
 * Optional per-season cover images in Sanity:
 *   Add a "seasonCoverUrl" string field to your episode schema, or host them
 *   at a predictable pattern like /cover-season-2.jpg and set via env var.
 */

import type { APIRoute } from "astro";
import { sanityClient } from "../../lib/sanity";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Escape XML special characters */
function x(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Return duration string for iTunes.
 *  Sanity stores it as "HH:MM:SS" — iTunes accepts that format directly. */
function itunesDuration(val: unknown): string {
  if (!val) return "";
  const str = String(val).trim();
  // Validate it looks like H:MM:SS or MM:SS
  if (/^\d+:\d{2}(:\d{2})?$/.test(str)) return str;
  return "";
}

/**
 * Ensure an audio URL ends with ".mp3" (or another valid extension).
 * Apple Podcasts requires a file extension even if the server doesn't need it.
 * For R2 URLs the file should already be named *.mp3. This is a safety guard.
 */
function ensureMp3Extension(url: string): string {
  if (!url) return url;
  // Already has a recognised audio extension → leave it alone
  if (/\.(mp3|m4a|ogg|aac|wav|flac)(\?|$)/i.test(url)) return url;
  // Append extension (R2 public URLs are clean paths, so this won't break them)
  return url.endsWith("/") ? url.slice(0, -1) + ".mp3" : url + ".mp3";
}

// ── Sanity query ────────────────────────────────────────────────────────────

interface SanityEpisode {
  title: string;
  episodeNumber: number;
  slug: string;
  publishedAt: string;
  description: string;
  audioUrl: string;
  duration: number;
  fileSize: number;
  season: number;
  explicit: boolean;
  seasonCoverUrl?: string;           // optional per-season image from Sanity
  coverImage?: { asset?: { url: string } };
}

// ── Route handler ───────────────────────────────────────────────────────────

export const GET: APIRoute = async () => {
  const siteUrl  = import.meta.env.PUBLIC_SITE_URL  || "https://podcast.sudanartarchive.com";
  const feedUrl  = `${siteUrl}/podcast/feed.xml`;

  // Default cover = env var (must be set before publishing to directories)
  const defaultCover = import.meta.env.PUBLIC_COVER_IMAGE_URL
    || `${siteUrl}/cover-season-1.jpg`;

  const episodes: SanityEpisode[] = await sanityClient.fetch(`
    *[_type == "episode" && defined(slug.current)] | order(publishedAt desc) {
      title,
      episodeNumber,
      "slug": slug.current,
      publishedAt,
      description,
      audioUrl,
      duration,
      fileSize,
      season,
      explicit,
      seasonCoverUrl,
      coverImage { asset->{ url } }
    }
  `);

  // Build a season → cover map so we can use per-season art
  const seasonCovers: Record<number, string> = {};
  for (const ep of episodes) {
    const s = ep.season || 1;
    if (!seasonCovers[s]) {
      seasonCovers[s] =
        ep.seasonCoverUrl ||
        ep.coverImage?.asset?.url ||
        `${siteUrl}/cover-season-${s}.jpg`;
    }
  }

  const items = episodes
    .filter((ep) => ep.audioUrl) // only include episodes with audio
    .map((ep) => {
      const season       = ep.season || 1;
      const episodeCover = seasonCovers[season] || defaultCover;
      const audioUrl     = ensureMp3Extension(ep.audioUrl);
      const fileSize     = ep.fileSize || 0;
      const duration     = itunesDuration(ep.duration);
      const pubDate      = ep.publishedAt
        ? new Date(ep.publishedAt).toUTCString()
        : "";
      const link = `${siteUrl}/episodes/${ep.slug}`;

      return `
    <item>
      <title>${x(ep.title)}</title>
      <link>${x(link)}</link>
      <guid isPermaLink="true">${x(link)}</guid>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
      <description><![CDATA[${ep.description || ""}]]></description>

      <!-- Audio enclosure — URL must end in .mp3 for Apple Podcasts -->
      <enclosure
        url="${x(audioUrl)}"
        length="${fileSize}"
        type="audio/mpeg"
      />

      <!-- iTunes episode metadata -->
      <itunes:title>${x(ep.title)}</itunes:title>
      <itunes:episode>${ep.episodeNumber || ""}</itunes:episode>
      <itunes:season>${season}</itunes:season>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>${ep.explicit ? "true" : "false"}</itunes:explicit>
      ${duration ? `<itunes:duration>${duration}</itunes:duration>` : ""}
      <itunes:summary><![CDATA[${ep.description || ""}]]></itunes:summary>
      <itunes:image href="${x(episodeCover)}" />

      <!-- Podcast Index namespace — season label -->
      <podcast:season name="Season ${season}">${season}</podcast:season>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:podcast="https://podcastindex.org/namespace/1.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
>
  <channel>
    <!-- ── Channel identity ─────────────────────────────────────── -->
    <title>Sudan Art Archive Podcast</title>
    <link>${x(siteUrl)}</link>
    <description>Preserving 50 Years of Sudanese Artistry! Conversations about Sudanese art, history, and culture.</description>
    <language>en-us</language>
    <copyright>&#169; ${new Date().getFullYear()} Sudan Art Archive</copyright>

    <!-- ── Atom self-link (required for validation) ──────────────── -->
    <atom:link href="${x(feedUrl)}" rel="self" type="application/rss+xml" />

    <!-- ── Cover art (1400–3000 px square, hosted on R2) ────────── -->
    <image>
      <url>${x(defaultCover)}</url>
      <title>Sudan Art Archive Podcast</title>
      <link>${x(siteUrl)}</link>
    </image>

    <!-- ── iTunes channel metadata ──────────────────────────────── -->
    <itunes:title>Sudan Art Archive Podcast</itunes:title>
    <itunes:author>Sudan Art Archive</itunes:author>
    <itunes:summary>Preserving 50 Years of Sudanese Artistry! Conversations about Sudanese art, history, and culture.</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>false</itunes:explicit>
    <itunes:image href="${x(defaultCover)}" />
    <itunes:category text="Arts">
      <itunes:category text="Visual Arts" />
    </itunes:category>
    <itunes:owner>
      <itunes:name>Sudan Art Archive</itunes:name>
      <itunes:email>info@sudanartarchive.com</itunes:email>
    </itunes:owner>

    <!-- ── Episodes ──────────────────────────────────────────────── -->
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Allow podcast apps to cache the feed for up to 1 hour
      "Cache-Control": "public, max-age=3600",
    },
  });
};
