// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://adrianwedd.com',
  integrations: [
    mdx(),
    sitemap(),
    preact(),
    tailwind(),
  ],
});
