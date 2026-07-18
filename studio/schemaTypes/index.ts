import {SchemaTypeDefinition} from 'sanity'
import episode from './episode'
import season from './season'
import podcastSettings from './podcastSettings'

export const schemaTypes: SchemaTypeDefinition[] = [episode, season, podcastSettings]
