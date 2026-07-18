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
  // useCdn: false → always fetch fresh data in SSR mode, so an edit in Studio
  // shows up on the next request without a redeploy.
  useCdn: false,
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

/**
 * Site-wide settings singleton.
 *
 * Every page needs this, so it is the one query that must never throw — if the
 * document has not been created in Studio yet the site still renders with
 * sensible English defaults rather than 500ing.
 */
export async function getSettings(): Promise<PodcastSettings> {
  const settings = await sanityClient.fetch<PodcastSettings | null>(
    `*[_type == "podcastSettings"][0]`,
  );

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

export async function getEpisodes(): Promise<Episode[]> {
  return sanityClient.fetch(`
    *[_type == "episode" && defined(slug.current)]
      | order(publishedAt desc) {${EPISODE_FIELDS}}
  `);
}

export async function getEpisode(slug: string): Promise<Episode | null> {
  return sanityClient.fetch(
    `*[_type == "episode" && slug.current == $slug][0] {${EPISODE_FIELDS}}`,
    { slug },
  );
}

export async function getSeasons(): Promise<Season[]> {
  return sanityClient.fetch(`
    *[_type == "season"] | order(number desc) {
      number, title, titleAr, description, descriptionAr, coverImage
    }
  `);
}

/** Season number → season document, for cover-art and title lookups. */
export function seasonMap(seasons: Season[]): Record<number, Season> {
  return Object.fromEntries(seasons.map((s) => [s.number, s]));
}
