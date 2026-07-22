import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

/** Document types that exist exactly once and are edited in place. */
const SINGLETONS = ['podcastSettings']

export default defineConfig({
  name: 'default',
  title: 'SAA Podcast',

  projectId: 'joj4u8dz',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Podcast Settings')
              .id('podcastSettings')
              .child(S.document().schemaType('podcastSettings').documentId('podcastSettings')),
            S.divider(),
            S.documentTypeListItem('episode').title('Episodes'),
            S.documentTypeListItem('season').title('Seasons'),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    // Keep singletons out of the global "create new document" menu
    templates: (prev) => prev.filter((t) => !SINGLETONS.includes(t.schemaType)),
  },

  document: {
    // Singletons can't be duplicated, unpublished or deleted
    actions: (prev, {schemaType}) =>
      SINGLETONS.includes(schemaType)
        ? prev.filter(({action}) => !['duplicate', 'unpublish', 'delete'].includes(action!))
        : prev,
  },
})
