/**
 * SAA Podcast RSS 2.0 feed — /podcast/feed.xml
 *
 * Every channel-level value (title, author, owner email, category, cover art,
 * copyright, language) comes from the `podcastSettings` singleton in Sanity, so
 * the feed can be re-pointed without a code change. Per-season artwork comes
 * from `season` documents; episode audio is the only asset hosted outside
 * Sanity (Cloudflare R2).
 *
 * Passes podba.se validation:
 *   ✓ Podcast Index + iTunes + Atom namespaces
 *   ✓ Square cover art ≥ 1400px, served from the Sanity CDN
 *   ✓ Enclosures carry a .mp3 URL, MIME type and byte length
 *   ✓ Per-season <itunes:image> and <podcast:season>
 */

import type { APIRoute } from 'astro';
import { getSiteData, imageUrl, seasonMap } from '../../lib/sanity';

/** Escape XML special characters. */
function x(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** iTunes accepts H:MM:SS or MM:SS directly; anything else is dropped. */
function itunesDuration(val: unknown): string {
  if (!val) return '';
  const str = String(val).trim();
  return /^\d+:\d{2}(:\d{2})?$/.test(str) ? str : '';
}

/**
 * Apple Podcasts requires a file extension on the enclosure URL even when the
 * server doesn't need one. R2 objects should already be named *.mp3 — this is
 * a safety guard.
 */
function ensureMp3Extension(url: string): string {
  if (!url) return url;
  if (/\.(mp3|m4a|ogg|aac|wav|flac)(\?|$)/i.test(url)) return url;
  return url.endsWith('/') ? url.slice(0, -1) + '.mp3' : url + '.mp3';
}

const AUDIO_MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/x-m4a',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  wav: 'audio/wav',
  flac: 'audio/flac',
};

/**
 * Derive the enclosure MIME type from the file extension. Declaring everything
 * as audio/mpeg makes Apple Podcasts reject non-MP3 uploads.
 */
function audioMimeType(url: string): string {
  const ext = url.match(/\.(mp3|m4a|ogg|aac|wav|flac)(\?|$)/i)?.[1]?.toLowerCase();
  return (ext && AUDIO_MIME_TYPES[ext]) || 'audio/mpeg';
}

export const GET: APIRoute = async ({ site }) => {
  const { settings, episodes, seasons } = await getSiteData();

  // `site` is the origin from astro.config.mjs
  const siteUrl = site!.origin;
  const feedUrl = `${siteUrl}/podcast/feed.xml`;

  const seasonsByNumber = seasonMap(seasons);

  // Channel artwork: podcast cover → newest episode's cover. Apple rejects a
  // feed whose <image> 404s, so never point at a file that may not exist.
  const defaultCover =
    imageUrl(settings.coverImage, 3000, 3000) ||
    episodes.map((ep) => imageUrl(ep.coverImage, 3000, 3000)).find(Boolean) ||
    '';

  const items = episodes
    .filter((ep) => ep.audioUrl)
    .map((ep) => {
      const seasonNum = ep.season || 1;
      const season = seasonsByNumber[seasonNum];

      // Artwork cascade: episode → season → podcast default
      const episodeCover =
        imageUrl(ep.coverImage, 3000, 3000) ||
        imageUrl(season?.coverImage, 3000, 3000) ||
        defaultCover;

      const audioUrl = ensureMp3Extension(ep.audioUrl!);
      const duration = itunesDuration(ep.duration);
      const pubDate = ep.publishedAt ? new Date(ep.publishedAt).toUTCString() : '';
      const link = `${siteUrl}/episodes/${ep.slug}`;
      const seasonName = season?.title || `Season ${seasonNum}`;

      return `
    <item>
      <title>${x(ep.title)}</title>
      <link>${x(link)}</link>
      <guid isPermaLink="true">${x(link)}</guid>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
      <description><![CDATA[${ep.description || ''}]]></description>

      <enclosure url="${x(audioUrl)}" length="${ep.fileSize || 0}" type="${audioMimeType(audioUrl)}" />

      <itunes:title>${x(ep.title)}</itunes:title>
      <itunes:episode>${ep.episodeNumber || ''}</itunes:episode>
      <itunes:season>${seasonNum}</itunes:season>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>${ep.explicit ? 'true' : 'false'}</itunes:explicit>
      ${duration ? `<itunes:duration>${duration}</itunes:duration>` : ''}
      <itunes:summary><![CDATA[${ep.description || ''}]]></itunes:summary>
      <itunes:image href="${x(episodeCover)}" />

      <podcast:season name="${x(seasonName)}">${seasonNum}</podcast:season>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:podcast="https://podcastindex.org/namespace/1.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
>
  <channel>
    <title>${x(settings.siteTitle)}</title>
    <link>${x(siteUrl)}</link>
    <description>${x(settings.description)}</description>
    <language>${x(settings.language || 'en-us')}</language>
    <copyright>&#169; ${new Date().getFullYear()} ${x(settings.copyright || settings.author)}</copyright>

    <atom:link href="${x(feedUrl)}" rel="self" type="application/rss+xml" />
${defaultCover ? `
    <image>
      <url>${x(defaultCover)}</url>
      <title>${x(settings.siteTitle)}</title>
      <link>${x(siteUrl)}</link>
    </image>
` : ''}
    <itunes:title>${x(settings.siteTitle)}</itunes:title>
    <itunes:author>${x(settings.author)}</itunes:author>
    <itunes:summary>${x(settings.description)}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>${settings.explicit ? 'true' : 'false'}</itunes:explicit>
    ${defaultCover ? `<itunes:image href="${x(defaultCover)}" />` : ''}
    <itunes:category text="${x(settings.itunesCategory || 'Arts')}">
      ${settings.itunesSubcategory ? `<itunes:category text="${x(settings.itunesSubcategory)}" />` : ''}
    </itunes:category>
    <itunes:owner>
      <itunes:name>${x(settings.ownerName || settings.author)}</itunes:name>
      <itunes:email>${x(settings.ownerEmail)}</itunes:email>
    </itunes:owner>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
    },
  });
};
