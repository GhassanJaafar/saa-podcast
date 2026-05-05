// src/pages/podcast/feed.xml.ts
import { sanityClient } from "../../lib/sanity";  // your existing Sanity client

export const prerender = false; // Ensures this runs on each request (SSR)

export async function GET() {
  // Fetch all published episodes, ordered by date (or whatever order you prefer)
  const episodes = await sanityClient.fetch(`
    *[_type == "episode" && defined(audioFile)] | order(publishedAt desc) {
      title,
      slug,
      description,
      publishedAt,
      audioFile,
      duration,
      episodeNumber,
      "imageUrl": episodeImage.asset->url
    }
  `);

  const siteUrl = import.meta.env.SITE || "https://yourproject.vercel.app"; // fallback
  const feedUrl = `${siteUrl}/podcast/feed.xml`;

  // Build the RSS XML manually – keep it clean and well-indented is not required but helps debugging.
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Your Podcast Title</title>
    <link>${siteUrl}</link>
    <description>Your podcast description</description>
    <language>en</language>
    <itunes:author>Your Name</itunes:author>
    <itunes:summary>Your podcast summary</itunes:summary>
    <itunes:image href="${siteUrl}/podcast-cover.jpg" />
    <itunes:category text="Arts" />
    <itunes:explicit>no</itunes:explicit>
    <itunes:owner>
      <itunes:name>Your Name</itunes:name>
      <itunes:email>email@example.com</itunes:email>
    </itunes:owner>
    <image>
      <url>${siteUrl}/podcast-cover.jpg</url>
      <title>Your Podcast Title</title>
      <link>${siteUrl}</link>
    </image>`;

  // Append each episode
  episodes.forEach((episode: any) => {
    const pubDate = new Date(episode.publishedAt).toUTCString();
    const audioUrl = episode.audioFile; // Cloudflare R2 URL – we'll set this up in Step 6
    const enclosure = audioUrl ? `<enclosure url="${audioUrl}" length="0" type="audio/mpeg" />` : "";

    xml += `
    <item>
      <title>${escapeXml(episode.title)}</title>
      <link>${siteUrl}/episodes/${episode.slug?.current || episode.slug}</link>
      <guid isPermaLink="false">${siteUrl}/episodes/${episode.slug?.current || episode.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(episode.description || "")}</description>
      <itunes:summary>${escapeXml(episode.description || "")}</itunes:summary>
      <itunes:duration>${episode.duration || "0:00"}</itunes:duration>
      <itunes:episode>${episode.episodeNumber || ""}</itunes:episode>
      <itunes:image href="${episode.imageUrl || `${siteUrl}/podcast-cover.jpg`}" />
      ${enclosure}
      <content:encoded><![CDATA[${episode.description || ""}]]></content:encoded>
    </item>`;
  });

  xml += `
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}

// Helper to escape special characters in XML
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}