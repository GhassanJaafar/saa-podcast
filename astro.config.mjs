import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://project-4rzyk.vercel.app',
  output: 'server',
  adapter: vercel(),
});