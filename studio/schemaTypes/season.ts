import {defineField, defineType} from 'sanity'

/**
 * A season groups episodes and can carry its own cover art.
 *
 * Previously the RSS feed guessed per-season artwork from a `seasonCoverUrl`
 * field that was never in the schema, falling back to a hard-coded
 * `/cover-season-N.jpg` path. Seasons are real documents now.
 */
export default defineType({
  name: 'season',
  title: 'Season',
  type: 'document',
  fields: [
    defineField({
      name: 'number',
      title: 'Season Number',
      type: 'number',
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'title',
      title: 'Season Title (EN)',
      description: 'Optional. Defaults to "Season {number}" when empty.',
      type: 'string',
    }),
    defineField({
      name: 'titleAr',
      title: 'Season Title (AR)',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description (EN)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'descriptionAr',
      title: 'Description (AR)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'coverImage',
      title: 'Season Cover Art',
      description: 'Leave empty to fall back to the main podcast cover art',
      type: 'image',
      options: {hotspot: true},
    }),
  ],
  orderings: [
    {
      title: 'Season number, newest first',
      name: 'numberDesc',
      by: [{field: 'number', direction: 'desc'}],
    },
  ],
  preview: {
    select: {number: 'number', title: 'title', media: 'coverImage'},
    prepare({number, title, media}) {
      return {
        title: title || `Season ${number}`,
        subtitle: title ? `Season ${number}` : undefined,
        media,
      }
    },
  },
})
