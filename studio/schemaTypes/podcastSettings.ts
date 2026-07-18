import {defineField, defineType} from 'sanity'

/**
 * Singleton document holding every piece of site-wide copy and configuration.
 *
 * Nothing in the header, footer, SEO tags or RSS channel should be hard-coded in
 * the Astro app — it all reads from here. The only asset that lives outside
 * Sanity is the episode audio file itself (Cloudflare R2).
 */
export default defineType({
  name: 'podcastSettings',
  title: 'Podcast Settings',
  type: 'document',
  groups: [
    {name: 'identity', title: 'Identity', default: true},
    {name: 'header', title: 'Header'},
    {name: 'footer', title: 'Footer'},
    {name: 'seo', title: 'SEO & Sharing'},
    {name: 'feed', title: 'RSS / Apple Podcasts'},
  ],

  fields: [
    // ── Identity ────────────────────────────────────────────────────────────
    defineField({
      name: 'siteTitle',
      title: 'Site Title (EN)',
      type: 'string',
      group: 'identity',
      initialValue: 'Sudan Art Archive Podcast',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'siteTitleAr',
      title: 'Site Title (AR)',
      type: 'string',
      group: 'identity',
    }),
    defineField({
      name: 'shortTitle',
      title: 'Short Title (EN)',
      description: 'Used as the title suffix on inner pages, e.g. "Episode 3 | SAA Podcast"',
      type: 'string',
      group: 'identity',
      initialValue: 'SAA Podcast',
    }),
    defineField({
      name: 'shortTitleAr',
      title: 'Short Title (AR)',
      type: 'string',
      group: 'identity',
    }),
    defineField({
      name: 'description',
      title: 'Description (EN)',
      type: 'text',
      rows: 3,
      group: 'identity',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'descriptionAr',
      title: 'Description (AR)',
      type: 'text',
      rows: 3,
      group: 'identity',
    }),

    // ── Header ──────────────────────────────────────────────────────────────
    defineField({
      name: 'headerEyebrow',
      title: 'Header Eyebrow (EN)',
      description: 'Small uppercase line above the wordmark',
      type: 'string',
      group: 'header',
      initialValue: 'Sudan Art Archive',
    }),
    defineField({
      name: 'headerEyebrowAr',
      title: 'Header Eyebrow (AR)',
      type: 'string',
      group: 'header',
      initialValue: 'أرشيف السودان للفن التشكيلي',
    }),
    defineField({
      name: 'headerWordmark',
      title: 'Header Wordmark (EN)',
      type: 'string',
      group: 'header',
      initialValue: 'Podcast',
    }),
    defineField({
      name: 'headerWordmarkAr',
      title: 'Header Wordmark (AR)',
      type: 'string',
      group: 'header',
      initialValue: 'بودكاست',
    }),
    defineField({
      name: 'archiveUrl',
      title: 'Main Archive URL',
      type: 'url',
      group: 'header',
      initialValue: 'https://sudanartarchive.com',
    }),
    defineField({
      name: 'archiveLinkLabel',
      title: 'Archive Link Label',
      type: 'string',
      group: 'header',
      initialValue: 'sudanartarchive.com',
    }),

    // ── Footer ──────────────────────────────────────────────────────────────
    defineField({
      name: 'parentOrgName',
      title: 'Parent Organisation Name',
      type: 'string',
      group: 'footer',
      initialValue: 'The Muse Multi Studios',
    }),
    defineField({
      name: 'parentOrgUrl',
      title: 'Parent Organisation URL',
      type: 'url',
      group: 'footer',
      initialValue: 'https://musesd.com',
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      group: 'footer',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'URL',
              type: 'url',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {select: {title: 'label', subtitle: 'url'}},
        },
      ],
    }),

    // ── SEO ─────────────────────────────────────────────────────────────────
    defineField({
      name: 'keywords',
      title: 'SEO Keywords',
      description: 'Comma-separated',
      type: 'text',
      rows: 2,
      group: 'seo',
    }),
    defineField({
      name: 'coverImage',
      title: 'Podcast Cover Art',
      description:
        'Square, 1400×1400px minimum (Apple Podcasts requirement). Also used as the default social sharing image.',
      type: 'image',
      group: 'seo',
      options: {hotspot: true},
      validation: (Rule) => Rule.required(),
    }),

    // ── Feed ────────────────────────────────────────────────────────────────
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      group: 'feed',
      initialValue: 'Sudan Art Archive',
    }),
    defineField({
      name: 'ownerName',
      title: 'Owner Name',
      type: 'string',
      group: 'feed',
      initialValue: 'Sudan Art Archive',
    }),
    defineField({
      name: 'ownerEmail',
      title: 'Owner Email',
      description: 'Apple Podcasts uses this to verify ownership of the feed',
      type: 'string',
      group: 'feed',
      initialValue: 'info@sudanartarchive.com',
    }),
    defineField({
      name: 'copyright',
      title: 'Copyright Holder',
      description: 'The year is prepended automatically',
      type: 'string',
      group: 'feed',
      initialValue: 'Sudan Art Archive',
    }),
    defineField({
      name: 'language',
      title: 'Feed Language',
      type: 'string',
      group: 'feed',
      initialValue: 'en-us',
      options: {
        list: [
          {title: 'English (US)', value: 'en-us'},
          {title: 'English (UK)', value: 'en-gb'},
          {title: 'Arabic', value: 'ar'},
        ],
      },
    }),
    defineField({
      name: 'itunesCategory',
      title: 'Apple Podcasts Category',
      type: 'string',
      group: 'feed',
      initialValue: 'Arts',
    }),
    defineField({
      name: 'itunesSubcategory',
      title: 'Apple Podcasts Subcategory',
      type: 'string',
      group: 'feed',
      initialValue: 'Visual Arts',
    }),
    defineField({
      name: 'explicit',
      title: 'Explicit Content (whole show)',
      type: 'boolean',
      group: 'feed',
      initialValue: false,
    }),
  ],

  preview: {
    prepare: () => ({title: 'Podcast Settings'}),
  },
})
