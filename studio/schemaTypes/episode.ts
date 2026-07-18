import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'episode',
  title: 'Episode',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'audio', title: 'Audio'},
    {name: 'meta', title: 'Metadata'},
  ],
  fields: [
    // ── Content ─────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Episode Title (EN)',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'titleAr',
      title: 'Episode Title (AR)',
      description: 'Falls back to the English title when empty',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description (EN)',
      type: 'text',
      rows: 6,
      group: 'content',
    }),
    defineField({
      name: 'descriptionAr',
      title: 'Description (AR)',
      description: 'Falls back to the English description when empty',
      type: 'text',
      rows: 6,
      group: 'content',
    }),
    defineField({
      name: 'coverImage',
      title: 'Episode Cover Image',
      description: 'Leave empty to use the season cover, then the main podcast cover',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
    }),

    // ── Audio (the one asset that lives outside Sanity) ─────────────────────
    defineField({
      name: 'audioUrl',
      title: 'Audio File URL',
      description: 'Public Cloudflare R2 URL of the MP3 file',
      type: 'url',
      group: 'audio',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'duration',
      title: 'Duration',
      description: 'Format: HH:MM:SS (e.g. 00:45:30)',
      type: 'string',
      group: 'audio',
      validation: (Rule) =>
        Rule.regex(/^\d{1,2}:\d{2}(:\d{2})?$/, {name: 'duration'}).warning(
          'Expected HH:MM:SS or MM:SS',
        ),
    }),
    defineField({
      name: 'fileSize',
      title: 'File Size (bytes)',
      description: 'Required by the RSS enclosure tag — podcast apps use it for the download bar',
      type: 'number',
      group: 'audio',
    }),

    // ── Metadata ────────────────────────────────────────────────────────────
    defineField({
      name: 'episodeNumber',
      title: 'Episode Number',
      type: 'number',
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'season',
      title: 'Season Number',
      description: 'Matched against the Season documents to pick up season cover art',
      type: 'number',
      group: 'meta',
      initialValue: 1,
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      group: 'meta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'explicit',
      title: 'Explicit Content',
      type: 'boolean',
      group: 'meta',
      initialValue: false,
    }),
  ],

  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
    {
      title: 'Season & episode number',
      name: 'seasonEpisode',
      by: [
        {field: 'season', direction: 'desc'},
        {field: 'episodeNumber', direction: 'desc'},
      ],
    },
  ],

  preview: {
    select: {
      title: 'title',
      season: 'season',
      episodeNumber: 'episodeNumber',
      media: 'coverImage',
    },
    prepare({title, season, episodeNumber, media}) {
      return {
        title,
        subtitle: `S${season ?? 1} · Episode ${episodeNumber}`,
        media,
      }
    },
  },
})
