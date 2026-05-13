import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
  // useCdn: false → always fetch fresh data in SSR mode
  // Sanity's anonymous client can only read *published* documents by default,
  // so no extra token is needed for public content.
  useCdn: false,
  apiVersion: '2024-01-01',
  perspective: 'published',
});