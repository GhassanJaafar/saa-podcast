import type { APIRoute } from 'astro';
import { sanityClient } from '../../lib/sanity';

const SITE_URL = 'https://podcast.sudanartarchive.com';
const PODCAST_TITLE = 'Sudan Art Archive Podcast';
const PODCAST_DESCRIPTION =
  'Conversations on Sudanese art, culture, and creativity. The Sudan Art Archive documents 50 years of artistic heritage across Sudan.';
const PODCAST_LANGUAGE = 'en';
const PODCAST_AUTHOR = 'Sudan Art Archive';
const PODCAST_EMAIL = 'info@sudanartarchive.com';
const PODCAST_CATEGORY = 'Arts';
const PODCAST_SUBCATEGORY = 'Visual Arts';
const PODCAST_IMAGE = `${SITE_URL}/podcast-cover.jpg`;

/**
 * Escape characters that are invalid inside XML text / attribute values.
 */
function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc2822(dateStr: string): string {
  return new Date(dateStr).toUTCString();
}

export const GET: APIRoute = async () => {
  let episodes: any[] = [];

  try {
    episodes = await sanityClient.fetch(`
      *[
        _type == "episode"
        && defined(slug.current)
        && defined(publishedAt)
        && defined(audioUrl)
      ]
      | order(episodeNumber desc) {
        title,
        episodeNumber,
        season,
        publishedAt,
        description,
        audioUrl,
        duration,
        fileSize,
        explicit,
        "slug": slug.current
      }
    `);
  } catch (err) {
    console.error('[RSS] Sanity fetch error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }

  const now = new Date().toUTCString();
  const latestPubDate =
    episodes.length > 0 ? toRfc2822(episodes[0].publishedAt) : now;

  const items = episodes
    .map((ep) => {
      const episodeUrl = `${SITE_URL}/episodes/${ep.slug}`;
      const explicit = ep.explicit ? 'true' : 'false';
      const length = ep.fileSize ? String(Math.round(ep.fileSize)) : '0';
      const desc = ep.description || ep.title;

      return `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <link>${escapeXml(episodeUrl)}</link>
      <guid isPermaLink="true">${escapeXml(episodeUrl)}</guid>
      <description>${escapeXml(desc)}</description>
      <pubDate>${toRfc2822(ep.publishedAt)}</pubDate>
      <enclosure url="${escapeXml(ep.audioUrl)}" type="audio/mpeg" length="${length}"/>
      <itunes:title>${escapeXml(ep.title)}</itunes:title>
      <itunes:summary>${escapeXml(desc)}</itunes:summary>
      <itunes:explicit>${explicit}</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>${ep.duration ? `\n      <itunes:duration>${escapeXml(ep.duration)}</itunes:duration>` : ''}${ep.episodeNumber != null ? `\n      <itunes:episode>${ep.episodeNumber}</itunes:episode>` : ''}${ep.season != null ? `\n      <itunes:season>${ep.season}</itunes:season>` : ''}
    </item>`;
    })
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(PODCAST_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(PODCAST_DESCRIPTION)}</description>
    <language>${PODCAST_LANGUAGE}</language>
    <copyright>© ${new Date().getFullYear()} Sudan Art Archive</copyright>
    <managingEditor>${PODCAST_EMAIL} (${PODCAST_AUTHOR})</managingEditor>
    <webMaster>${PODCAST_EMAIL} (${PODCAST_AUTHOR})</webMaster>
    <pubDate>${latestPubDate}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>Sudan Art Archive Podcast — Astro</generator>
    <atom:link href="${SITE_URL}/podcast/feed.xml" rel="self" type="application/rss+xml"/>

    <image>
      <url>${escapeXml(PODCAST_IMAGE)}</url>
      <title>${escapeXml(PODCAST_TITLE)}</title>
      <link>${SITE_URL}</link>
    </image>

    <itunes:author>${escapeXml(PODCAST_AUTHOR)}</itunes:author>
    <itunes:summary>${escapeXml(PODCAST_DESCRIPTION)}</itunes:summary>
    <itunes:owner>
      <itunes:name>${escapeXml(PODCAST_AUTHOR)}</itunes:name>
      <itunes:email>${PODCAST_EMAIL}</itunes:email>
    </itunes:owner>
    <itunes:image href="${escapeXml(PODCAST_IMAGE)}"/>
    <itunes:category text="${escapeXml(PODCAST_CATEGORY)}">
      <itunes:category text="${escapeXml(PODCAST_SUBCATEGORY)}"/>
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
