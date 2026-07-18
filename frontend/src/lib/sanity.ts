import { createClient } from '@sanity/client';
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';

/**
 * Sanity connection details.
 *
 * These are deliberately hard-coded rather than read from the environment.
 * They are not credentials: the project ID and dataset are already published
 * in every image URL the site emits (`cdn.sanity.io/images/joj4u8dz/production/…`),
 * and the client below is anonymous and read-only. Keeping them in code means
 * there is no build-time environment to configure and no way to deploy a build
 * that silently points at nothing.
 *
 * To point the site at a different Sanity project, change them here.
 */
const SANITY_PROJECT_ID = 'joj4u8dz';
const SANITY_DATASET = 'production';

export const sanityClient = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  // Read through Sanity's edge CDN: faster, and CDN reads are metered far more
  // generously than origin API reads. Combined with the in-isolate cache below,
  // a published change surfaces within about a minute.
  useCdn: true,
  apiVersion: '2024-01-01',
  // Anonymous client — reads published documents only, so no token is needed.
  perspective: 'published',
});

const builder = createImageUrlBuilder(sanityClient);

/** Build a Sanity CDN image URL. Returns null for missing images. */
export function imageUrl(
  source: SanityImageSource | null | undefined,
  width?: number,
  height?: number,
): string | null {
  if (!source) return null;
  let b = builder.image(source).auto('format').fit('crop');
  if (width) b = b.width(width);
  if (height) b = b.height(height);
  return b.url();
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface SocialLink {
  label: string;
  url: string;
}

export interface PodcastSettings {
  siteTitle: string;
  siteTitleAr?: string;
  shortTitle?: string;
  shortTitleAr?: string;
  description: string;
  descriptionAr?: string;

  headerEyebrow?: string;
  headerEyebrowAr?: string;
  headerWordmark?: string;
  headerWordmarkAr?: string;
  archiveUrl?: string;
  archiveLinkLabel?: string;

  parentOrgName?: string;
  parentOrgUrl?: string;
  socialLinks?: SocialLink[];

  keywords?: string;
  coverImage?: SanityImageSource;

  author?: string;
  ownerName?: string;
  ownerEmail?: string;
  copyright?: string;
  language?: string;
  itunesCategory?: string;
  itunesSubcategory?: string;
  explicit?: boolean;
}

export interface Episode {
  title: string;
  titleAr?: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  coverImage?: SanityImageSource;
  audioUrl?: string;
  duration?: string;
  fileSize?: number;
  episodeNumber?: number;
  season?: number;
  publishedAt?: string;
  explicit?: boolean;
}

export interface Season {
  number: number;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  coverImage?: SanityImageSource;
}

// ── Queries ─────────────────────────────────────────────────────────────────

const EPISODE_FIELDS = `
  title,
  titleAr,
  "slug": slug.current,
  description,
  descriptionAr,
  coverImage,
  audioUrl,
  duration,
  fileSize,
  episodeNumber,
  season,
  publishedAt,
  explicit
`;

const SEASON_FIELDS = `number, title, titleAr, description, descriptionAr, coverImage`;

/**
 * Everything the site needs, in ONE round trip.
 *
 * GROQ lets several queries share a single request, so a page render costs one
 * API call instead of four. That matters: the Sanity plan allows 250k requests
 * a month, and the previous shape (settings + episodes + seasons, with settings
 * fetched again by the layout) burned through it four times faster.
 */
const SITE_QUERY = `{
  "settings": *[_type == "podcastSettings"][0],
  "episodes": *[_type == "episode" && defined(slug.current)]
    | order(publishedAt desc) {${EPISODE_FIELDS}},
  "seasons": *[_type == "season"] | order(number desc) {${SEASON_FIELDS}}
}`;

export interface SiteData {
  settings: PodcastSettings;
  episodes: Episode[];
  seasons: Season[];
}

/**
 * In-isolate cache.
 *
 * Cloudflare keeps a Worker isolate warm between requests, so a burst of
 * traffic collapses into a single upstream query rather than one per visitor.
 * The trade is staleness: a change published in Studio appears within
 * CACHE_TTL_MS (plus a few seconds of Sanity CDN propagation). Lower it if you
 * want edits to show up faster, at the cost of more API requests.
 */
const CACHE_TTL_MS = 60_000;

let cache: { expires: number; data: SiteData } | null = null;
/** De-dupes concurrent misses so a cold burst fires one query, not N. */
let inFlight: Promise<SiteData> | null = null;

/**
 * Fetch (or reuse) the whole site payload.
 *
 * This must never throw: if the settings document has not been created in
 * Studio yet, or Sanity is unreachable, the site still renders with sensible
 * bilingual defaults rather than 500ing.
 */
export async function getSiteData(): Promise<SiteData> {
  if (cache && cache.expires > Date.now()) return cache.data;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    let raw: { settings: PodcastSettings | null; episodes: Episode[]; seasons: Season[] };
    try {
      raw = await sanityClient.fetch(SITE_QUERY);
    } catch (error) {
      console.error('[sanity] query failed, serving defaults', error);
      // Serve the last good payload if we have one, otherwise bare defaults.
      return cache?.data ?? { settings: mergeSettings(null), episodes: [], seasons: [] };
    }

    const data: SiteData = {
      settings: mergeSettings(raw?.settings ?? null),
      episodes: raw?.episodes ?? [],
      seasons: raw?.seasons ?? [],
    };
    cache = { expires: Date.now() + CACHE_TTL_MS, data };
    return data;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** Merge the Studio document over the built-in defaults. */
function mergeSettings(settings: PodcastSettings | null): PodcastSettings {
  const defaults: PodcastSettings = {
    siteTitle: 'Sudan Art Archive Podcast',
    siteTitleAr: 'بودكاست أرشيف السودان للفن التشكيلي',
    shortTitle: 'SAA Podcast',
    shortTitleAr: 'بودكاست الأرشيف',
    description:
      'Preserving 50 Years of Sudanese Artistry! Conversations about Sudanese art, history, and culture.',
    descriptionAr: 'حفظ ٥٠ عاماً من الفن السوداني — حوارات حول الفن والتاريخ والثقافة السودانية.',
    headerEyebrow: 'Sudan Art Archive',
    headerEyebrowAr: 'أرشيف السودان للفن التشكيلي',
    headerWordmark: 'Podcast',
    headerWordmarkAr: 'بودكاست',
    archiveUrl: 'https://sudanartarchive.com',
    archiveLinkLabel: 'sudanartarchive.com',
    parentOrgName: 'The Muse Multi Studios',
    parentOrgUrl: 'https://musesd.com',
    socialLinks: [
      { label: 'Facebook', url: 'https://www.facebook.com/sudanartarchive' },
      { label: 'Instagram', url: 'https://www.instagram.com/sudanartarchive/' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/company/sudan-art-archive' },
    ],
    author: 'Sudan Art Archive',
    ownerName: 'Sudan Art Archive',
    ownerEmail: 'info@sudanartarchive.com',
    copyright: 'Sudan Art Archive',
    language: 'en-us',
    itunesCategory: 'Arts',
    itunesSubcategory: 'Visual Arts',
    explicit: false,
  };

  if (!settings) return defaults;

  // Merge field by field: an empty string or empty array in Studio should fall
  // back to the default rather than blanking out the site.
  const merged = { ...defaults };
  for (const [key, value] of Object.entries(settings)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

/**
 * Look up one episode.
 *
 * Resolved from the cached payload rather than queried separately — a podcast
 * has tens of episodes, not thousands, so reusing the list costs a little
 * bandwidth and saves an API request on every episode page view.
 */
export async function getEpisode(slug: string): Promise<Episode | null> {
  const { episodes } = await getSiteData();
  return episodes.find((ep) => ep.slug === slug) ?? null;
}

/** Season number → season document, for cover-art and title lookups. */
export function seasonMap(seasons: Season[]): Record<number, Season> {
  return Object.fromEntries(seasons.map((s) => [s.number, s]));
}
