// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://adrianwedd.com',
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [
    mdx(),
    sitemap(),
    preact(),
    tailwind(),
  ],
});
